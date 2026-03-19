const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const { auth, logActivity } = require('../middleware/auth');

const router = express.Router();

// GET /api/customers
router.get('/', auth, (req, res) => {
  const customers = db.getAll('customers').sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  // 附加統計
  const enriched = customers.map(c => {
    const cases = db.find('customer_cases', cs => cs.customer_id === c.id);
    const projects = db.find('projects', p => p.customer_id === c.id);
    return { ...c, case_count: cases.length, project_count: projects.length };
  });
  res.json(enriched);
});

// GET /api/customers/:id
router.get('/:id', auth, (req, res) => {
  const c = db.getById('customers', req.params.id);
  if (!c) return res.status(404).json({ error: '客戶不存在' });
  const cases = db.find('customer_cases', cs => cs.customer_id === c.id);
  const projects = db.find('projects', p => p.customer_id === c.id);
  res.json({ ...c, cases, projects });
});

// POST /api/customers
router.post('/', auth, (req, res) => {
  const { name, contact_person, phone, email, address, category, notes } = req.body;
  if (!name) return res.status(400).json({ error: '缺少客戶名稱' });
  const customer = db.insert('customers', {
    id: uuidv4(), name, contact_person: contact_person || '', phone: phone || '',
    email: email || '', address: address || '', category: category || 'corporate',
    notes: notes || '', status: 'active', created_by: req.user.id
  });
  logActivity(db, null, req.user.id, 'create_customer', `新增客戶 ${name}`);
  res.status(201).json(customer);
});

// PUT /api/customers/:id
router.put('/:id', auth, (req, res) => {
  const updated = db.update('customers', req.params.id, req.body);
  if (!updated) return res.status(404).json({ error: '客戶不存在' });
  res.json(updated);
});

// DELETE /api/customers/:id
router.delete('/:id', auth, (req, res) => {
  db.remove('customers', req.params.id);
  res.json({ success: true });
});

// === 客戶案件 ===
// GET /api/customers/:customerId/cases
router.get('/:customerId/cases', auth, (req, res) => {
  const cases = db.find('customer_cases', c => c.customer_id === req.params.customerId)
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  res.json(cases);
});

// POST /api/customers/:customerId/cases
router.post('/:customerId/cases', auth, (req, res) => {
  const { title, description, event_date, budget, requirements } = req.body;
  const cs = db.insert('customer_cases', {
    id: uuidv4(), customer_id: req.params.customerId,
    title: title || '', description: description || '',
    event_date: event_date || '', budget: budget || 0,
    requirements: requirements || '', status: 'inquiry',
    created_by: req.user.id
  });
  logActivity(db, null, req.user.id, 'create_case', `新增案件 ${title}`);
  res.status(201).json(cs);
});

// PUT /api/customers/:customerId/cases/:caseId
router.put('/:customerId/cases/:caseId', auth, (req, res) => {
  const updated = db.update('customer_cases', req.params.caseId, req.body);
  if (!updated) return res.status(404).json({ error: '案件不存在' });
  res.json(updated);
});

module.exports = router;
