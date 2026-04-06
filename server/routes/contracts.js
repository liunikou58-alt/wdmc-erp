const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const { auth, logActivity, requirePermission } = require('../middleware/auth');

const router = express.Router();

// 中文狀態 → 英文狀態碼映射
const STATUS_CN_TO_EN = {
  '執行中': 'active', '已簽約': 'pending', '已完成': 'expired',
  '報價中': 'draft', '草稿': 'draft', '已終止': 'terminated',
};

// GET /api/contracts/stats — 合約統計
router.get('/stats', auth, requirePermission('contracts', 'view'),(req, res) => {
  const all = db.getAll('contracts');
  const mapped = all.map(c => ({ ...c, status: STATUS_CN_TO_EN[c.status] || c.status || 'draft' }));
  res.json({
    total: all.length,
    active: mapped.filter(c => c.status === 'active').length,
    pending: mapped.filter(c => c.status === 'pending').length,
    expired: mapped.filter(c => c.status === 'expired').length,
    draft: mapped.filter(c => c.status === 'draft').length,
    total_amount: all.reduce((s, c) => s + (Number(c.amount) || Number(c.total_amount) || 0), 0),
  });
});

// GET /api/contracts — 列表 + 篩選
router.get('/', auth, requirePermission('contracts', 'view'),(req, res) => {
  const { customer_id, status, q } = req.query;
  let contracts = db.getAll('contracts').sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  if (customer_id) contracts = contracts.filter(c => c.customer_id === customer_id);
  if (status) contracts = contracts.filter(c => (STATUS_CN_TO_EN[c.status] || c.status) === status);
  if (q) {
    const kw = q.toLowerCase();
    contracts = contracts.filter(c =>
      (c.title || c.name || '').toLowerCase().includes(kw) ||
      (c.contract_number || c.contract_no || '').toLowerCase().includes(kw)
    );
  }

  const enriched = contracts.map(c => {
    const customer = c.customer_id ? db.getById('customers', c.customer_id) : null;
    const project = c.project_id ? db.getById('projects', c.project_id) : null;
    const mappedStatus = STATUS_CN_TO_EN[c.status] || c.status || 'draft';
    return {
      ...c,
      title: c.title || c.name || '',
      contract_number: c.contract_number || c.contract_no || '',
      amount: c.amount != null ? c.amount : (c.total_amount || 0),
      status: mappedStatus,
      customer_name: customer?.name || c.client_name || '',
      project_name: project?.name || '',
    };
  });
  res.json(enriched);
});

router.get('/:id', auth, requirePermission('contracts', 'view'),(req, res) => {
  const c = db.getById('contracts', req.params.id);
  if (!c) return res.status(404).json({ error: '合約不存在' });
  res.json(c);
});

router.post('/', auth, requirePermission('contracts', 'create'),(req, res) => {
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

router.put('/:id', auth, requirePermission('contracts', 'edit'),(req, res) => {
  const updated = db.update('contracts', req.params.id, req.body);
  if (!updated) return res.status(404).json({ error: '合約不存在' });
  res.json(updated);
});

router.delete('/:id', auth, requirePermission('contracts', 'delete'),(req, res) => {
  db.remove('contracts', req.params.id);
  res.json({ success: true });
});

module.exports = router;
