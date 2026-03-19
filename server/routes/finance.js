const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const { auth, logActivity } = require('../middleware/auth');

const router = express.Router();

// 收入列表
router.get('/revenues', auth, (req, res) => {
  const items = db.getAll('revenues').sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  const enriched = items.map(r => {
    const project = r.project_id ? db.getById('projects', r.project_id) : null;
    const customer = r.customer_id ? db.getById('customers', r.customer_id) : null;
    return { ...r, project_name: project?.name || '', customer_name: customer?.name || '' };
  });
  res.json(enriched);
});

router.post('/revenues', auth, (req, res) => {
  const { project_id, customer_id, amount, description, payment_date, status } = req.body;
  const r = db.insert('revenues', {
    id: uuidv4(), project_id: project_id || null, customer_id: customer_id || null,
    amount: amount || 0, description: description || '', payment_date: payment_date || '',
    status: status || 'pending', created_by: req.user.id
  });
  logActivity(db, project_id, req.user.id, 'create_revenue', `新增收入 $${amount}`);
  res.status(201).json(r);
});

// 支出列表
router.get('/expenses', auth, (req, res) => {
  const items = db.getAll('expenses').sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  const enriched = items.map(e => {
    const project = e.project_id ? db.getById('projects', e.project_id) : null;
    const vendor = e.vendor_id ? db.getById('vendors', e.vendor_id) : null;
    return { ...e, project_name: project?.name || '', vendor_name: vendor?.name || '' };
  });
  res.json(enriched);
});

router.post('/expenses', auth, (req, res) => {
  const { project_id, vendor_id, amount, category, description, payment_date, status } = req.body;
  const e = db.insert('expenses', {
    id: uuidv4(), project_id: project_id || null, vendor_id: vendor_id || null,
    amount: amount || 0, category: category || '', description: description || '',
    payment_date: payment_date || '', status: status || 'pending', created_by: req.user.id
  });
  logActivity(db, project_id, req.user.id, 'create_expense', `新增支出 $${amount}`);
  res.status(201).json(e);
});

// 發票管理
router.get('/invoices', auth, (req, res) => {
  res.json(db.getAll('invoices').sort((a, b) => new Date(b.created_at) - new Date(a.created_at)));
});

router.post('/invoices', auth, (req, res) => {
  const { project_id, customer_id, amount, invoice_number, issue_date, due_date, type } = req.body;
  const inv = db.insert('invoices', {
    id: uuidv4(), project_id: project_id || null, customer_id: customer_id || null,
    amount: amount || 0, invoice_number: invoice_number || '', issue_date: issue_date || '',
    due_date: due_date || '', type: type || 'sales', status: 'issued', created_by: req.user.id
  });
  res.status(201).json(inv);
});

// 財務總覽
router.get('/summary', auth, (req, res) => {
  const revenues = db.getAll('revenues');
  const expenses = db.getAll('expenses');
  const totalRevenue = revenues.reduce((s, r) => s + (r.amount || 0), 0);
  const totalExpense = expenses.reduce((s, e) => s + (e.amount || 0), 0);
  const pendingRevenue = revenues.filter(r => r.status === 'pending').reduce((s, r) => s + (r.amount || 0), 0);
  const pendingExpense = expenses.filter(e => e.status === 'pending').reduce((s, e) => s + (e.amount || 0), 0);
  res.json({ totalRevenue, totalExpense, profit: totalRevenue - totalExpense, pendingRevenue, pendingExpense });
});

module.exports = router;
