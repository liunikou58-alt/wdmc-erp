const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const { auth } = require('../middleware/auth');

const router = express.Router();

// GET /api/assets
router.get('/', auth, (req, res) => {
  const assets = db.getAll('assets').sort((a, b) => a.name?.localeCompare(b.name));
  const enriched = assets.map(a => {
    const borrows = db.find('asset_borrows', b => b.asset_id === a.id && b.status === 'borrowed');
    return { ...a, is_available: borrows.length === 0, current_borrows: borrows.length };
  });
  res.json(enriched);
});

// POST /api/assets
router.post('/', auth, (req, res) => {
  const { name, category, serial_number, location, notes, quantity } = req.body;
  if (!name) return res.status(400).json({ error: '缺少設備名稱' });
  res.status(201).json(db.insert('assets', {
    id: uuidv4(), name, category: category || '', serial_number: serial_number || '',
    location: location || '', notes: notes || '', quantity: quantity || 1, status: 'available'
  }));
});

// PUT /api/assets/:id
router.put('/:id', auth, (req, res) => { res.json(db.update('assets', req.params.id, req.body)); });

// DELETE /api/assets/:id
router.delete('/:id', auth, (req, res) => { db.remove('assets', req.params.id); res.json({ success: true }); });

// === 借用管理 ===
router.get('/:assetId/borrows', auth, (req, res) => {
  const borrows = db.find('asset_borrows', b => b.asset_id === req.params.assetId);
  const enriched = borrows.map(b => {
    const user = db.getById('users', b.borrower_id);
    const project = b.project_id ? db.getById('projects', b.project_id) : null;
    return { ...b, borrower_name: user?.display_name || '', project_name: project?.name || '' };
  });
  res.json(enriched);
});

router.post('/:assetId/borrows', auth, (req, res) => {
  const { project_id, expected_return_date, notes } = req.body;
  res.status(201).json(db.insert('asset_borrows', {
    id: uuidv4(), asset_id: req.params.assetId, borrower_id: req.user.id,
    project_id: project_id || null, expected_return_date: expected_return_date || '',
    notes: notes || '', status: 'borrowed'
  }));
});

router.put('/borrows/:borrowId/return', auth, (req, res) => {
  res.json(db.update('asset_borrows', req.params.borrowId, { status: 'returned', returned_at: new Date().toISOString() }));
});

module.exports = router;
