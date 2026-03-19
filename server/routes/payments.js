/**
 * 零用金 / 請付款單 / 支出證明
 *
 * 對應 Ragic：活動請付款單、公司請付款單、零用金(現金)、支出證明單
 */
const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const { auth, logActivity } = require('../middleware/auth');

const router = express.Router();

/* ── 自動編號 ── */
function generatePaymentNo(prefix = 'PR') {
  const now = new Date();
  const ym = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
  const all = db.getAll('payment_requests');
  const count = all.filter(p => (p.request_no || '').includes(ym)).length + 1;
  return `${prefix}-${ym}-${String(count).padStart(3, '0')}`;
}

function generateProofNo() {
  const now = new Date();
  const ym = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
  const all = db.getAll('expense_proofs');
  const count = all.filter(p => (p.proof_no || '').includes(ym)).length + 1;
  return `EP-${ym}-${String(count).padStart(3, '0')}`;
}

/* ── 請付款單 CRUD ── */

// GET /api/payments — 列表
router.get('/', auth, (req, res) => {
  const { type, status, project_id } = req.query;
  let items = db.getAll('payment_requests');
  if (type) items = items.filter(p => p.type === type);
  if (status) items = items.filter(p => p.status === status);
  if (project_id) items = items.filter(p => p.project_id === project_id);

  const enriched = items.map(p => {
    const project = p.project_id ? db.getById('projects', p.project_id) : null;
    const vendor = p.payee_vendor_id ? db.getById('vendors', p.payee_vendor_id) : null;
    const requester = db.getById('users', p.requested_by);
    return {
      ...p,
      project_name: project?.name || '',
      vendor_name: vendor?.name || '',
      requested_by_name: requester?.display_name || '',
    };
  }).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  res.json(enriched);
});

// GET /api/payments/stats
router.get('/stats', auth, (req, res) => {
  const all = db.getAll('payment_requests');
  res.json({
    total: all.length,
    pending: all.filter(p => p.status === 'submitted').length,
    approved: all.filter(p => p.status === 'approved').length,
    paid: all.filter(p => p.status === 'paid').length,
    total_amount: all.reduce((s, p) => s + (Number(p.amount) || 0), 0),
    pending_amount: all.filter(p => p.status !== 'paid' && p.status !== 'rejected')
      .reduce((s, p) => s + (Number(p.amount) || 0), 0),
  });
});

// GET /api/payments/:id
router.get('/:id', auth, (req, res) => {
  const item = db.getById('payment_requests', req.params.id);
  if (!item) return res.status(404).json({ error: '付款單不存在' });
  res.json(item);
});

// POST /api/payments
router.post('/', auth, (req, res) => {
  const { type, project_id, payee_vendor_id, payee_name, amount, reason,
    invoice_number, payment_method, receipt_attachment, department_id } = req.body;
  if (!reason && !payee_name) return res.status(400).json({ error: '缺少付款事由或對象' });

  const item = db.insert('payment_requests', {
    id: uuidv4(),
    request_no: generatePaymentNo(),
    type: type || 'event_payment', // event_payment | company_payment | petty_cash
    project_id: project_id || null,
    payee_vendor_id: payee_vendor_id || null,
    payee_name: payee_name || '',
    amount: Number(amount) || 0,
    reason: reason || '',
    invoice_number: invoice_number || '',
    payment_method: payment_method || 'transfer', // transfer | cash | check
    receipt_attachment: receipt_attachment || '',
    department_id: department_id || null,
    requested_by: req.user.id,
    status: 'submitted', // draft | submitted | approved | paid | rejected
    approved_by: null,
    paid_at: null,
  });

  logActivity(db, project_id, req.user.id, 'create_payment',
    `提交付款申請 ${item.request_no} $${amount}`);

  // 通知主管
  const managers = db.find('users', u => u.role === 'manager' || u.role === 'admin');
  managers.forEach(m => {
    db.insert('notifications', {
      id: uuidv4(), user_id: m.id, title: '💰 新付款申請',
      message: `${req.user.display_name} 提交了 $${Number(amount).toLocaleString()} 付款申請`,
      type: 'payment', link: '/finance/payments', read: false,
    });
  });

  res.status(201).json(item);
});

// PUT /api/payments/:id
router.put('/:id', auth, (req, res) => {
  const item = db.getById('payment_requests', req.params.id);
  if (!item) return res.status(404).json({ error: '不存在' });
  if (item.status === 'paid') return res.status(403).json({ error: '已付款，無法修改' });
  res.json(db.update('payment_requests', req.params.id, req.body));
});

// PUT /api/payments/:id/approve — 核准
router.put('/:id/approve', auth, (req, res) => {
  const item = db.getById('payment_requests', req.params.id);
  if (!item) return res.status(404).json({ error: '不存在' });
  const updated = db.update('payment_requests', req.params.id, {
    status: 'approved',
    approved_by: req.user.id,
  });
  db.insert('notifications', {
    id: uuidv4(), user_id: item.requested_by, title: '✅ 付款申請已核准',
    message: `付款申請 ${item.request_no} 已被核准`, type: 'payment',
    link: '/finance/payments', read: false,
  });
  logActivity(db, item.project_id, req.user.id, 'approve_payment',
    `核准付款 ${item.request_no}`);
  res.json(updated);
});

// PUT /api/payments/:id/reject — 退回
router.put('/:id/reject', auth, (req, res) => {
  const item = db.getById('payment_requests', req.params.id);
  if (!item) return res.status(404).json({ error: '不存在' });
  const { comment } = req.body || {};
  const updated = db.update('payment_requests', req.params.id, {
    status: 'rejected',
    reject_reason: comment || '',
  });
  db.insert('notifications', {
    id: uuidv4(), user_id: item.requested_by, title: '❌ 付款申請被退回',
    message: `付款申請 ${item.request_no} 被退回：${comment || '未說明'}`,
    type: 'payment', link: '/finance/payments', read: false,
  });
  res.json(updated);
});

// PUT /api/payments/:id/pay — 標記已付款
router.put('/:id/pay', auth, (req, res) => {
  const item = db.getById('payment_requests', req.params.id);
  if (!item) return res.status(404).json({ error: '不存在' });
  const updated = db.update('payment_requests', req.params.id, {
    status: 'paid',
    paid_at: new Date().toISOString(),
  });

  // 自動記為支出
  if (item.project_id) {
    db.insert('expenses', {
      id: uuidv4(),
      project_id: item.project_id,
      vendor_id: item.payee_vendor_id,
      description: `${item.request_no} - ${item.reason}`,
      amount: item.amount,
      category: item.type === 'petty_cash' ? '零用金' : '活動費用',
      date: new Date().toISOString().slice(0, 10),
      status: 'paid',
    });
  }

  res.json(updated);
});

// DELETE /api/payments/:id
router.delete('/:id', auth, (req, res) => {
  const item = db.getById('payment_requests', req.params.id);
  if (!item) return res.status(404).json({ error: '不存在' });
  if (item.status === 'paid') return res.status(403).json({ error: '已付款，無法刪除' });
  db.remove('payment_requests', req.params.id);
  res.json({ success: true });
});

/* ── 支出證明單 ── */

// GET /api/payments/expense-proofs — 列表
router.get('/expense-proofs/list', auth, (req, res) => {
  const items = db.getAll('expense_proofs')
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  const enriched = items.map(p => {
    const reporter = db.getById('users', p.reporter);
    const project = p.project_id ? db.getById('projects', p.project_id) : null;
    return { ...p, reporter_name: reporter?.display_name || '', project_name: project?.name || '' };
  });
  res.json(enriched);
});

// POST /api/payments/expense-proofs — 新增
router.post('/expense-proofs', auth, (req, res) => {
  const { expense_date, amount, purpose, attachment, project_id } = req.body;
  const item = db.insert('expense_proofs', {
    id: uuidv4(),
    proof_no: generateProofNo(),
    expense_date: expense_date || new Date().toISOString().slice(0, 10),
    amount: Number(amount) || 0,
    purpose: purpose || '',
    attachment: attachment || '',
    reporter: req.user.id,
    project_id: project_id || null,
    reimbursement_status: 'pending', // pending | approved | reimbursed | rejected
  });
  res.status(201).json(item);
});

// PUT /api/payments/expense-proofs/:id/verify — 核銷
router.put('/expense-proofs/:id/verify', auth, (req, res) => {
  const updated = db.update('expense_proofs', req.params.id, {
    reimbursement_status: 'reimbursed',
  });
  if (!updated) return res.status(404).json({ error: '不存在' });
  res.json(updated);
});

module.exports = router;
