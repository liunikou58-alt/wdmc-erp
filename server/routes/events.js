const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const { auth, logActivity, requirePermission } = require('../middleware/auth');

const router = express.Router();

// === 活動管理 (含母子活動 + 款項保證金) ===

// GET /api/events — 列表 + 篩選
router.get('/', auth, requirePermission('events', 'view'),(req, res) => {
  const { status, year, parent_id, customer_id } = req.query;
  let events = db.getAll('events').sort((a, b) => new Date(b.event_date) - new Date(a.event_date));

  if (status) events = events.filter(e => e.status === status);
  if (year) events = events.filter(e => (e.event_date || '').startsWith(year));
  if (parent_id) events = events.filter(e => e.parent_event_id === parent_id);
  if (customer_id) events = events.filter(e => e.customer_id === customer_id);
  // 如果沒有指定 parent_id，預設只顯示頂層活動
  if (!parent_id && !customer_id) events = events.filter(e => !e.parent_event_id);

  const enriched = events.map(e => {
    const customer = e.customer_id ? db.getById('customers', e.customer_id) : null;
    const pm = e.pm_id ? db.getById('users', e.pm_id) : null;
    const margin = e.quote_amount > 0
      ? Math.round((e.quote_amount - (e.cost_amount || 0)) / e.quote_amount * 10000) / 100
      : 0;
    // 子活動數量
    const subEvents = db.find('events', se => se.parent_event_id === e.id);
    // 款項數量
    const payments = db.find('event_payments', p => p.event_id === e.id);
    return {
      ...e,
      customer_name: customer?.name || '',
      pm_name: pm?.display_name || '',
      margin,
      sub_event_count: subEvents.length,
      payment_count: payments.length,
    };
  });
  res.json(enriched);
});

// GET /api/events/stats
router.get('/stats', auth, requirePermission('events', 'view'),(req, res) => {
  const events = db.getAll('events');
  const active = events.filter(e => e.status === 'active');
  const closed = events.filter(e => e.status === 'closed');
  const totalRevenue = events.reduce((s, e) => s + (e.settlement_amount || e.quote_amount || 0), 0);
  const totalCost = events.reduce((s, e) => s + (e.cost_amount || 0), 0);
  const avgMargin = totalRevenue > 0 ? Math.round((totalRevenue - totalCost) / totalRevenue * 10000) / 100 : 0;

  res.json({
    total: events.length,
    active: active.length,
    closed: closed.length,
    pending_invoice: events.filter(e => e.invoice_status === '未開').length,
    total_revenue: totalRevenue,
    total_cost: totalCost,
    avg_margin: avgMargin,
  });
});

// GET /api/events/:id — 單一活動詳情（含子活動、關聯數據、款項）
router.get('/:id', auth, requirePermission('events', 'view'),(req, res) => {
  const e = db.getById('events', req.params.id);
  if (!e) return res.status(404).json({ error: '活動不存在' });

  // 關聯數據
  const proposals = e.proposal_id ? [db.getById('proposals', e.proposal_id)].filter(Boolean) : [];
  const pos = db.find('purchase_orders', po => po.event_name === e.name || po.proposal_id === e.proposal_id);
  const labors = db.find('labor_reports', lr => lr.event_name === e.name);

  // 子活動
  const subEvents = db.find('events', se => se.parent_event_id === e.id)
    .sort((a, b) => new Date(a.event_date) - new Date(b.event_date));

  // 款項
  const payments = db.find('event_payments', p => p.event_id === e.id)
    .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));

  // 保證金
  const deposits = db.find('deposits', d => d.project_id === e.project_id || d.event_id === e.id);

  // 母活動
  const parentEvent = e.parent_event_id ? db.getById('events', e.parent_event_id) : null;

  // 損益表
  const profitLoss = db.find('profit_loss', pl => pl.event_name === e.name);

  res.json({
    ...e,
    related_proposals: proposals,
    related_pos: pos,
    related_labors: labors,
    sub_events: subEvents,
    payments,
    deposits,
    parent_event: parentEvent,
    profit_loss: profitLoss,
  });
});

// POST /api/events
router.post('/', auth, requirePermission('events', 'create'),(req, res) => {
  const { name, event_date, event_end_date, event_type, customer_id, pm_id, proposal_id, project_id,
    quote_amount, settlement_amount, cost_amount, invoice_status, company, notes,
    parent_event_id, event_address, budget_amount, setup_time, teardown_time } = req.body;
  if (!name) return res.status(400).json({ error: '缺少活動名稱' });

  const now = new Date();
  const seq = db.getAll('events').length + 1;

  // 如果選擇了報價單，自動帶入數據
  let autoData = {};
  if (proposal_id) {
    const proposal = db.getById('proposals', proposal_id);
    if (proposal) {
      autoData = {
        quote_amount: proposal.total_with_tax || proposal.total_amount || Number(quote_amount) || 0,
        customer_id: proposal.customer_id || customer_id || null,
      };
    }
  }

  const event = db.insert('events', {
    id: uuidv4(),
    event_no: `EVT-${now.getFullYear()}-${String(seq).padStart(3, '0')}`,
    name,
    event_date: event_date || '',
    event_end_date: event_end_date || '',
    event_type: event_type || '活動',
    customer_id: autoData.customer_id || customer_id || null,
    pm_id: pm_id || req.user.id,
    proposal_id: proposal_id || null,
    project_id: project_id || null,
    parent_event_id: parent_event_id || null,
    company: company || '瓦當麥可',
    event_address: event_address || '',
    quote_amount: autoData.quote_amount || Number(quote_amount) || 0,
    settlement_amount: Number(settlement_amount) || 0,
    cost_amount: Number(cost_amount) || 0,
    budget_amount: Number(budget_amount) || 0,
    setup_time: setup_time || '',
    teardown_time: teardown_time || '',
    invoice_status: invoice_status || '未開',
    invoice_no: '',
    status: 'active',
    is_closed: false,
    notes: notes || '',
    created_by: req.user.id,
    created_at: now.toISOString(),
  });
  logActivity(db, project_id, req.user.id, 'create_event', `新增活動 ${name}`);
  res.status(201).json(event);
});

// PUT /api/events/:id
router.put('/:id', auth, requirePermission('events', 'edit'),(req, res) => {
  const updated = db.update('events', req.params.id, req.body);
  if (!updated) return res.status(404).json({ error: '活動不存在' });
  res.json(updated);
});

// PUT /api/events/:id/close — 結案
router.put('/:id/close', auth, requirePermission('events', 'edit'),(req, res) => {
  const e = db.getById('events', req.params.id);
  if (!e) return res.status(404).json({ error: '活動不存在' });
  const updated = db.update('events', req.params.id, {
    status: 'closed', is_closed: true, closed_at: new Date().toISOString(),
    ...req.body,
  });
  logActivity(db, e.project_id, req.user.id, 'close_event', `結案活動 ${e.name}`);
  res.json(updated);
});

// DELETE /api/events/:id
router.delete('/:id', auth, requirePermission('events', 'delete'),(req, res) => {
  // 同時刪除子活動和款項
  const subs = db.find('events', se => se.parent_event_id === req.params.id);
  subs.forEach(s => db.remove('events', s.id));
  const pays = db.find('event_payments', p => p.event_id === req.params.id);
  pays.forEach(p => db.remove('event_payments', p.id));
  db.remove('events', req.params.id);
  res.json({ success: true });
});

// ═══ 活動款項（訂金/尾款/保證金） ═══

// GET /api/events/:id/payments
router.get('/:id/payments', auth, requirePermission('events', 'view'),(req, res) => {
  const payments = db.find('event_payments', p => p.event_id === req.params.id)
    .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
  res.json(payments);
});

// POST /api/events/:id/payments
router.post('/:id/payments', auth, requirePermission('events', 'create'),(req, res) => {
  const { payment_type, amount, expected_date, actual_date, invoice_status,
    invoice_no, deposit_type, notes, sort_order } = req.body;
  const payment = db.insert('event_payments', {
    id: uuidv4(),
    event_id: req.params.id,
    payment_type: payment_type || 'deposit', // deposit=訂金, final=尾款, guarantee=保證金
    amount: Number(amount) || 0,
    expected_date: expected_date || '',
    actual_date: actual_date || '',
    invoice_status: invoice_status || '未開',
    invoice_no: invoice_no || '',
    deposit_type: deposit_type || '', // 押金/押標金/履約保證金
    notes: notes || '',
    sort_order: sort_order || 0,
    status: 'pending',
    created_by: req.user.id,
  });
  res.status(201).json(payment);
});

// PUT /api/events/:id/payments/:payId
router.put('/:id/payments/:payId', auth, requirePermission('events', 'edit'),(req, res) => {
  const updated = db.update('event_payments', req.params.payId, req.body);
  if (!updated) return res.status(404).json({ error: '款項不存在' });
  res.json(updated);
});

// DELETE /api/events/:id/payments/:payId
router.delete('/:id/payments/:payId', auth, requirePermission('events', 'delete'),(req, res) => {
  db.remove('event_payments', req.params.payId);
  res.json({ success: true });
});

// ========== Rundown 時間軸 ==========
router.get('/:id/rundown', auth, requirePermission('events', 'view'),(req, res) => {
  const items = db.find('event_rundown', r => r.event_id === req.params.id)
    .sort((a, b) => (a.start_time || '').localeCompare(b.start_time || ''));
  res.json(items);
});

router.post('/:id/rundown', auth, requirePermission('events', 'create'),(req, res) => {
  const { start_time, end_time, description, responsible, department, notes } = req.body;
  const item = db.insert('event_rundown', {
    id: uuidv4(), event_id: req.params.id,
    start_time: start_time || '', end_time: end_time || '',
    description: description || '', responsible: responsible || '',
    department: department || '', notes: notes || '',
    created_by: req.user.id,
  });
  res.status(201).json(item);
});

router.put('/:id/rundown/:itemId', auth, requirePermission('events', 'edit'),(req, res) => {
  const updated = db.update('event_rundown', req.params.itemId, req.body);
  if (!updated) return res.status(404).json({ error: '找不到' });
  res.json(updated);
});

router.delete('/:id/rundown/:itemId', auth, requirePermission('events', 'delete'),(req, res) => {
  db.remove('event_rundown', req.params.itemId);
  res.json({ success: true });
});

// ========== 出演人員名單 ==========
router.get('/:id/performers', auth, requirePermission('events', 'view'),(req, res) => {
  const items = db.find('event_performers', p => p.event_id === req.params.id)
    .sort((a, b) => (a.role_type || '').localeCompare(b.role_type || ''));
  res.json(items);
});

router.post('/:id/performers', auth, requirePermission('events', 'create'),(req, res) => {
  const { role_type, name, contact, fee, confirm_status, notes } = req.body;
  const item = db.insert('event_performers', {
    id: uuidv4(), event_id: req.params.id,
    role_type: role_type || '其他', // 主持人/表演者/嘉賓/其他
    name: name || '', contact: contact || '',
    fee: Number(fee) || 0, confirm_status: confirm_status || '已邀請',
    notes: notes || '', created_by: req.user.id,
  });
  res.status(201).json(item);
});

router.put('/:id/performers/:itemId', auth, requirePermission('events', 'edit'),(req, res) => {
  const updated = db.update('event_performers', req.params.itemId, req.body);
  if (!updated) return res.status(404).json({ error: '找不到' });
  res.json(updated);
});

router.delete('/:id/performers/:itemId', auth, requirePermission('events', 'delete'),(req, res) => {
  db.remove('event_performers', req.params.itemId);
  res.json({ success: true });
});

module.exports = router;

