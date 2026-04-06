const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const { auth, logActivity, requirePermission } = require('../middleware/auth');

const router = express.Router();

// === 收支日記帳 ===

// GET /api/journal — 列表 + 篩選
router.get('/', auth, requirePermission('journal', 'view'),(req, res) => {
  const { month, type, project_id } = req.query;
  let entries = db.getAll('journal_entries').sort((a, b) => new Date(b.date) - new Date(a.date));

  if (month) entries = entries.filter(e => (e.date || '').startsWith(month));
  if (type) entries = entries.filter(e => e.transaction_type === type);
  if (project_id) entries = entries.filter(e => e.project_id === project_id);

  const enriched = entries.map(e => {
    const project = e.project_id ? db.getById('projects', e.project_id) : null;
    const customer = e.customer_id ? db.getById('customers', e.customer_id) : null;
    return { ...e, project_name: project?.name || '', customer_name: customer?.name || '' };
  });
  res.json(enriched);
});

// GET /api/journal/stats — 統計摘要
router.get('/stats', auth, requirePermission('journal', 'view'),(req, res) => {
  const { month } = req.query;
  let entries = db.getAll('journal_entries');
  if (month) entries = entries.filter(e => (e.date || '').startsWith(month));

  const income = entries.filter(e => e.transaction_type === 'income').reduce((s, e) => s + (e.amount || 0), 0);
  const expense = entries.filter(e => e.transaction_type === 'expense').reduce((s, e) => s + (e.amount || 0), 0);
  const pending = entries.filter(e => !e.is_settled).reduce((s, e) => s + (e.amount || 0), 0);

  res.json({
    total: entries.length,
    income, expense,
    net: income - expense,
    pending,
    income_count: entries.filter(e => e.transaction_type === 'income').length,
    expense_count: entries.filter(e => e.transaction_type === 'expense').length,
  });
});

// GET /api/journal/:id
router.get('/:id', auth, requirePermission('journal', 'view'),(req, res) => {
  const e = db.getById('journal_entries', req.params.id);
  if (!e) return res.status(404).json({ error: '記錄不存在' });
  res.json(e);
});

// POST /api/journal
router.post('/', auth, requirePermission('journal', 'create'),(req, res) => {
  const { transaction_type, payment_type, date, voucher_date, voucher_no,
    description, amount, project_id, customer_id, category, expected_date, notes } = req.body;
  if (!description || !amount) return res.status(400).json({ error: '缺少必要欄位' });

  const now = new Date();
  const seq = db.getAll('journal_entries').length + 1;
  const entry = db.insert('journal_entries', {
    id: uuidv4(),
    entry_no: `JN-${now.getFullYear()}${String(now.getMonth()+1).padStart(2,'0')}-${String(seq).padStart(3,'0')}`,
    transaction_type: transaction_type || 'expense',
    payment_type: payment_type || 'transfer',
    date: date || now.toISOString().slice(0, 10),
    voucher_date: voucher_date || '',
    voucher_no: voucher_no || '',
    description,
    amount: Number(amount) || 0,
    project_id: project_id || null,
    customer_id: customer_id || null,
    category: category || '一般',
    expected_date: expected_date || '',
    notes: notes || '',
    is_settled: false,
    created_by: req.user.id,
    created_at: now.toISOString(),
  });
  logActivity(db, project_id, req.user.id, 'create_journal', `新增收支記錄 ${entry.entry_no}`);
  res.status(201).json(entry);
});

// PUT /api/journal/:id
router.put('/:id', auth, requirePermission('journal', 'edit'),(req, res) => {
  const updated = db.update('journal_entries', req.params.id, req.body);
  if (!updated) return res.status(404).json({ error: '記錄不存在' });
  res.json(updated);
});

// DELETE /api/journal/:id
router.delete('/:id', auth, requirePermission('journal', 'delete'),(req, res) => {
  db.remove('journal_entries', req.params.id);
  res.json({ success: true });
});

module.exports = router;
