const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const { auth, logActivity, requirePermission } = require('../middleware/auth');

const router = express.Router();

// === 提案管理 ===
router.get('/', auth, requirePermission('proposals', 'view'),(req, res) => {
  const proposals = db.getAll('proposals').sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  const enriched = proposals.map(p => {
    const customer = p.customer_id ? db.getById('customers', p.customer_id) : null;
    const creator = db.getById('users', p.created_by);
    // 計算報價總計（從 quotations items SUM）
    const latestQuot = db.find('quotations', q => q.proposal_id === p.id).sort((a, b) => b.version - a.version)[0];
    const total_quote = latestQuot?.total || p.total_quote || 0;
    const tax_included = Math.round(total_quote * 1.05);
    return {
      ...p,
      customer_name: customer?.name || '',
      creator_name: creator?.display_name || '',
      total_quote,
      tax_included_quote: tax_included,
    };
  });
  res.json(enriched);
});

router.get('/:id', auth, requirePermission('proposals', 'view'),(req, res) => {
  const p = db.getById('proposals', req.params.id);
  if (!p) return res.status(404).json({ error: '提案不存在' });
  const quotations = db.find('quotations', q => q.proposal_id === p.id);
  const customer = p.customer_id ? db.getById('customers', p.customer_id) : null;
  const latestQuot = quotations.sort((a, b) => b.version - a.version)[0];
  const total_quote = latestQuot?.total || p.total_quote || 0;
  res.json({ ...p, quotations, customer_name: customer?.name || '', total_quote, tax_included_quote: Math.round(total_quote * 1.05) });
});

router.post('/', auth, requirePermission('proposals', 'create'),(req, res) => {
  const { title, customer_id, case_id, description, event_type, event_date,
    event_end_date, event_address, planner_id,
    department, case_status, case_type, total_quote } = req.body;
  if (!title) return res.status(400).json({ error: '缺少提案名稱' });
  const p = db.insert('proposals', {
    id: uuidv4(), title, customer_id: customer_id || null, case_id: case_id || null,
    description: description || '', event_type: event_type || '', event_date: event_date || '',
    event_end_date: event_end_date || '', event_address: event_address || '',
    planner_id: planner_id || req.user.id,
    department: department || '瓦當麥可',
    case_status: case_status || '提案中',
    case_type: case_type || '商案',
    total_quote: total_quote || 0,
    status: 'draft', version: 1, created_by: req.user.id
  });
  logActivity(db, null, req.user.id, 'create_proposal', `建立提案 ${title}`);
  res.status(201).json(p);
});

router.put('/:id', auth, requirePermission('proposals', 'edit'),(req, res) => {
  const updated = db.update('proposals', req.params.id, req.body);
  if (!updated) return res.status(404).json({ error: '提案不存在' });
  res.json(updated);
});

router.delete('/:id', auth, requirePermission('proposals', 'delete'),(req, res) => {
  db.remove('proposals', req.params.id);
  db.removeWhere('quotations', q => q.proposal_id === req.params.id);
  res.json({ success: true });
});

// 提案轉專案
router.post('/:id/convert', auth, requirePermission('proposals', 'create'),(req, res) => {
  const p = db.getById('proposals', req.params.id);
  if (!p) return res.status(404).json({ error: '提案不存在' });
  const project = db.insert('projects', {
    id: uuidv4(), name: p.title, customer_id: p.customer_id, case_id: p.case_id,
    event_date: p.event_date, event_end_date: p.event_end_date || '', event_address: p.event_address || '',
    description: p.description, event_type: p.event_type,
    status: 'planning', pm_id: p.planner_id || req.user.id, budget: 0, created_by: req.user.id
  });
  db.update('proposals', p.id, { status: 'converted', project_id: project.id });
  logActivity(db, project.id, req.user.id, 'convert_proposal', `提案「${p.title}」轉為專案`);
  res.json(project);
});

// === 報價單管理 ===
router.get('/:proposalId/quotations', auth, requirePermission('proposals', 'view'),(req, res) => {
  res.json(db.find('quotations', q => q.proposal_id === req.params.proposalId));
});

router.post('/:proposalId/quotations', auth, requirePermission('proposals', 'create'),(req, res) => {
  const { items, total, notes, valid_until } = req.body;
  const existing = db.find('quotations', q => q.proposal_id === req.params.proposalId);
  const q = db.insert('quotations', {
    id: uuidv4(), proposal_id: req.params.proposalId,
    version: existing.length + 1, items: items || [], total: total || 0,
    notes: notes || '', valid_until: valid_until || '', status: 'draft',
    created_by: req.user.id
  });
  res.status(201).json(q);
});

router.put('/:proposalId/quotations/:qId', auth, requirePermission('proposals', 'edit'),(req, res) => {
  const updated = db.update('quotations', req.params.qId, req.body);
  res.json(updated);
});

/* ═══ 報價子表 V2 (proposal_items) ═══ */

router.get('/:id/items', auth, requirePermission('proposals', 'view'),(req, res) => {
  const items = db.find('proposal_items', i => i.proposal_id === req.params.id)
    .sort((a, b) => (a.order || 0) - (b.order || 0));
  res.json(items);
});

router.post('/:id/items', auth, requirePermission('proposals', 'create'),(req, res) => {
  const item = db.insert('proposal_items', {
    id: require('uuid').v4(),
    proposal_id: req.params.id,
    ...req.body,
    order: db.find('proposal_items', i => i.proposal_id === req.params.id).length,
  });
  // 更新 proposal 總額
  const total = db.find('proposal_items', i => i.proposal_id === req.params.id)
    .reduce((s, i) => s + (i.amount || 0), 0);
  db.update('proposals', req.params.id, { total_amount: total, amount: total });
  res.status(201).json(item);
});

router.put('/:id/items/:itemId', auth, requirePermission('proposals', 'edit'),(req, res) => {
  const updated = db.update('proposal_items', req.params.itemId, req.body);
  // 更新 proposal 總額
  const total = db.find('proposal_items', i => i.proposal_id === req.params.id)
    .reduce((s, i) => s + (i.amount || 0), 0);
  db.update('proposals', req.params.id, { total_amount: total, amount: total });
  res.json(updated);
});

router.delete('/:id/items/:itemId', auth, requirePermission('proposals', 'delete'),(req, res) => {
  db.remove('proposal_items', req.params.itemId);
  const total = db.find('proposal_items', i => i.proposal_id === req.params.id)
    .reduce((s, i) => s + (i.amount || 0), 0);
  db.update('proposals', req.params.id, { total_amount: total, amount: total });
  res.json({ success: true });
});
// === 得標自動流程：報價→採購單+損益+專案 ===
router.post('/:id/to-all', auth, requirePermission('proposals', 'create'),(req, res) => {
  const p = db.getById('proposals', req.params.id);
  if (!p) return res.status(404).json({ error: '找不到' });
  const results = {};

  // 1. 建立採購單
  const d = new Date();
  const ds = `${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}`;
  const poSeq = (db.getAll('purchase_orders').filter(x => (x.po_no||'').includes(ds)).length + 1);
  const po = db.insert('purchase_orders', {
    id: uuidv4(), po_no: `PO-${ds}-${String(poSeq).padStart(3,'0')}`,
    event_name: p.title, event_date: p.event_date,
    vendor_name: '', purchaser: p.creator_name || 'system',
    subtotal: p.total_amount || 0, tax_rate: 0.05,
    tax_amount: Math.round((p.total_amount || 0) * 0.05),
    total: Math.round((p.total_amount || 0) * 1.05),
    status: '訂購中', payment_method: '匯款(瓦當麥可）',
    proposal_id: p.id,
  });
  results.po = po.po_no;

  // 2. 複製報價明細到採購明細
  const pitems = db.find('proposal_items', i => i.proposal_id === p.id);
  pitems.forEach(pi => {
    db.insert('purchase_order_items', {
      id: uuidv4(), po_id: po.id,
      item: pi.item, qty: pi.qty, unit: pi.unit,
      unit_price: pi.cost_price || pi.unit_price, // 用成本價
      amount: (pi.qty || 1) * (pi.cost_price || pi.unit_price || 0),
    });
  });

  // 3. 建立損益表
  const pl = db.insert('profit_loss', {
    id: uuidv4(), pl_no: `PL-${ds}-${String(db.getAll('profit_loss').length + 1).padStart(3,'0')}`,
    event_name: p.title, event_type: p.case_type || '活動',
    manager: p.creator_name || '', customer_name: p.customer_name || '',
    event_start_date: p.event_date,
    total_quote: p.total_amount || 0, quote_amount: p.total_amount || 0,
    total_cost: 0, profit: p.total_amount || 0, margin: 100,
    is_closed: false, progress_status: '企劃中',
    proposal_id: p.id,
  });
  results.pl = pl.pl_no;

  // 4. 更新提案狀態
  db.update('proposals', p.id, { case_status: '得標', workflow_triggered: true });

  // 4.5 自動在行事曆建立活動日（簡報需求：得標後自動填寫）
  if (p.event_date) {
    const customer = p.customer_id ? db.getById('customers', p.customer_id) : null;
    db.insert('calendar_events', {
      id: uuidv4(),
      title: `🎪 ${p.title}`,
      date: p.event_date,
      end_date: p.event_end_date || p.event_date,
      type: 'event',
      color: '#f59e0b',
      description: `客戶：${customer?.name || '未指定'}\n地點：${p.event_address || '未指定'}`,
      proposal_id: p.id,
      auto_generated: true,
    });
    results.calendar = `已自動建立活動日 ${p.event_date}`;
    // 如有進撤場日（活動日前後各 1 天），也自動建立
    const setupDate = new Date(p.event_date);
    setupDate.setDate(setupDate.getDate() - 1);
    db.insert('calendar_events', {
      id: uuidv4(),
      title: `🏗️ 進場｜${p.title}`,
      date: setupDate.toISOString().slice(0, 10),
      type: 'setup',
      color: '#8b5cf6',
      proposal_id: p.id,
      auto_generated: true,
    });
    const teardownDate = new Date(p.event_end_date || p.event_date);
    teardownDate.setDate(teardownDate.getDate() + 1);
    db.insert('calendar_events', {
      id: uuidv4(),
      title: `🏗️ 撤場｜${p.title}`,
      date: teardownDate.toISOString().slice(0, 10),
      type: 'setup',
      color: '#8b5cf6',
      proposal_id: p.id,
      auto_generated: true,
    });
  }

  results.message = `已自動建立：採購單 ${po.po_no} + 損益表 ${pl.pl_no}${results.calendar ? ' + 行事曆事件' : ''}`;

  logActivity(db, null, req.user.id, 'workflow_trigger', results.message);
  res.json(results);
});

module.exports = router;
