/**
 * 保證金/押金管理
 * 
 * 對應 Ragic：🛵活動保證金/押金 (內部)
 */
const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const { auth, logActivity, requirePermission } = require('../middleware/auth');

const router = express.Router();

// GET /api/deposits
router.get('/', auth, requirePermission('deposits', 'view'),(req, res) => {
  const { project_id, status } = req.query;
  let items = db.getAll('deposits');
  if (project_id) items = items.filter(d => d.project_id === project_id);
  if (status) items = items.filter(d => d.return_status === status);

  const enriched = items.map(d => {
    const project = d.project_id ? db.getById('projects', d.project_id) : null;
    return { ...d, project_name: project?.name || '' };
  }).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  res.json(enriched);
});

router.get('/stats', auth, requirePermission('deposits', 'view'),(req, res) => {
  const all = db.getAll('deposits');
  res.json({
    total: all.length,
    pending: all.filter(d => d.return_status === 'pending').length,
    returned: all.filter(d => d.return_status === 'returned').length,
    total_deposit: all.reduce((s, d) => s + (Number(d.deposit_amount) || 0), 0),
    pending_amount: all.filter(d => d.return_status !== 'returned')
      .reduce((s, d) => s + (Number(d.deposit_amount) || 0) + (Number(d.bond_amount) || 0), 0),
  });
});

router.get('/:id', auth, requirePermission('deposits', 'view'),(req, res) => {
  const item = db.getById('deposits', req.params.id);
  if (!item) return res.status(404).json({ error: '不存在' });
  res.json(item);
});

router.post('/', auth, requirePermission('deposits', 'create'),(req, res) => {
  const { project_id, venue_name, deposit_amount, bond_amount, paid_date, return_date, notes } = req.body;
  const ym = `${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}`;
  const seq = db.getAll('deposits').filter(d => (d.deposit_no || '').includes(ym)).length + 1;

  const item = db.insert('deposits', {
    id: uuidv4(), deposit_no: `DP-${ym}-${String(seq).padStart(3, '0')}`,
    project_id: project_id || null, venue_name: venue_name || '',
    deposit_amount: Number(deposit_amount) || 0, bond_amount: Number(bond_amount) || 0,
    paid_date: paid_date || new Date().toISOString().slice(0, 10),
    return_date: return_date || '', actual_return_date: '',
    return_status: 'pending', notes: notes || '', created_by: req.user.id,
  });

  logActivity(db, project_id, req.user.id, 'create_deposit', `新增保證金 ${item.deposit_no}`);
  res.status(201).json(item);
});

router.put('/:id', auth, requirePermission('deposits', 'edit'),(req, res) => {
  const updated = db.update('deposits', req.params.id, req.body);
  if (!updated) return res.status(404).json({ error: '不存在' });
  res.json(updated);
});

router.put('/:id/return', auth, requirePermission('deposits', 'edit'),(req, res) => {
  const item = db.getById('deposits', req.params.id);
  if (!item) return res.status(404).json({ error: '不存在' });
  const updated = db.update('deposits', req.params.id, {
    return_status: 'returned', actual_return_date: new Date().toISOString().slice(0, 10),
  });
  logActivity(db, item.project_id, req.user.id, 'return_deposit', `退還保證金 ${item.deposit_no}`);
  res.json(updated);
});

router.delete('/:id', auth, requirePermission('deposits', 'delete'),(req, res) => {
  db.remove('deposits', req.params.id);
  res.json({ success: true });
});

module.exports = router;
