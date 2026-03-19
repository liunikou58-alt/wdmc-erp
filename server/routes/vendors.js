const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const { auth, logActivity } = require('../middleware/auth');

const router = express.Router();

// === 廠商管理 ===
router.get('/', auth, (req, res) => {
  const vendors = db.getAll('vendors').sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  const enriched = vendors.map(v => {
    const pos = db.find('purchase_orders', po => po.vendor_id === v.id);
    return { ...v, po_count: pos.length, total_amount: pos.reduce((s, po) => s + (po.total || 0), 0) };
  });
  res.json(enriched);
});

router.get('/:id', auth, (req, res) => {
  const v = db.getById('vendors', req.params.id);
  if (!v) return res.status(404).json({ error: '廠商不存在' });
  const pos = db.find('purchase_orders', po => po.vendor_id === v.id);
  res.json({ ...v, purchase_orders: pos });
});

router.post('/', auth, (req, res) => {
  const { name, contact_person, phone, email, address, category, bank_info, notes } = req.body;
  if (!name) return res.status(400).json({ error: '缺少廠商名稱' });
  const v = db.insert('vendors', {
    id: uuidv4(), name, contact_person: contact_person || '', phone: phone || '',
    email: email || '', address: address || '', category: category || '',
    bank_info: bank_info || '', notes: notes || '', rating: 0, status: 'active'
  });
  logActivity(db, null, req.user.id, 'create_vendor', `新增廠商 ${name}`);
  res.status(201).json(v);
});

router.put('/:id', auth, (req, res) => {
  const updated = db.update('vendors', req.params.id, req.body);
  res.json(updated);
});

router.delete('/:id', auth, (req, res) => {
  db.remove('vendors', req.params.id);
  res.json({ success: true });
});

// === 採購單 ===
router.get('/:vendorId/po', auth, (req, res) => {
  res.json(db.find('purchase_orders', po => po.vendor_id === req.params.vendorId));
});

router.post('/po', auth, (req, res) => {
  const { vendor_id, project_id, items, total, notes, delivery_date } = req.body;
  const poNum = `PO-${Date.now().toString(36).toUpperCase()}`;
  const po = db.insert('purchase_orders', {
    id: uuidv4(), po_number: poNum, vendor_id: vendor_id || null, project_id: project_id || null,
    items: items || [], total: total || 0, notes: notes || '',
    delivery_date: delivery_date || '', status: 'pending',
    created_by: req.user.id
  });
  logActivity(db, project_id, req.user.id, 'create_po', `建立採購單 ${poNum}`);
  res.status(201).json(po);
});

router.get('/po/all', auth, (req, res) => {
  const pos = db.getAll('purchase_orders').sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  const enriched = pos.map(po => {
    const vendor = po.vendor_id ? db.getById('vendors', po.vendor_id) : null;
    const project = po.project_id ? db.getById('projects', po.project_id) : null;
    return { ...po, vendor_name: vendor?.name || '', project_name: project?.name || '' };
  });
  res.json(enriched);
});

router.put('/po/:poId', auth, (req, res) => {
  const updated = db.update('purchase_orders', req.params.poId, req.body);
  res.json(updated);
});

module.exports = router;
