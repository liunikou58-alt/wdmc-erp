const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const { auth, logActivity } = require('../middleware/auth');

const router = express.Router();

// === 合約管理 ===
router.get('/', auth, (req, res) => {
  const contracts = db.getAll('contracts').sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  const enriched = contracts.map(c => {
    const customer = c.customer_id ? db.getById('customers', c.customer_id) : null;
    const project = c.project_id ? db.getById('projects', c.project_id) : null;
    return { ...c, customer_name: customer?.name || '', project_name: project?.name || '' };
  });
  res.json(enriched);
});

router.get('/:id', auth, (req, res) => {
  const c = db.getById('contracts', req.params.id);
  if (!c) return res.status(404).json({ error: '合約不存在' });
  res.json(c);
});

router.post('/', auth, (req, res) => {
  const { title, customer_id, project_id, proposal_id, amount, start_date, end_date, terms, status } = req.body;
  if (!title) return res.status(400).json({ error: '缺少合約名稱' });
  const contractNum = `CT-${new Date().getFullYear()}-${String(db.getAll('contracts').length + 1).padStart(4, '0')}`;
  const contract = db.insert('contracts', {
    id: uuidv4(), contract_number: contractNum, title,
    customer_id: customer_id || null, project_id: project_id || null, proposal_id: proposal_id || null,
    amount: amount || 0, start_date: start_date || '', end_date: end_date || '',
    terms: terms || '', status: status || 'draft', version: 1, created_by: req.user.id
  });
  logActivity(db, project_id, req.user.id, 'create_contract', `建立合約 ${contractNum} - ${title}`);
  res.status(201).json(contract);
});

router.put('/:id', auth, (req, res) => {
  const updated = db.update('contracts', req.params.id, req.body);
  if (!updated) return res.status(404).json({ error: '合約不存在' });
  res.json(updated);
});

router.delete('/:id', auth, (req, res) => {
  db.remove('contracts', req.params.id);
  res.json({ success: true });
});

module.exports = router;
