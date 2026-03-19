/**
 * 活動項目主檔 + 預設活動分類 + 採購類別
 *
 * 對應 Ragic：🔸活動項目主檔 / 🔸活動項目主檔(硬體) / 📃預設活動分類 / 📦公司採購單類別
 */
const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const { auth } = require('../middleware/auth');

const router = express.Router();

/* ═══ 活動項目主檔 ═══ */

router.get('/', auth, (req, res) => {
  const { category, hardware, q } = req.query;
  let items = db.getAll('quotation_items');
  if (category) items = items.filter(i => i.category === category);
  if (hardware === 'true') items = items.filter(i => i.is_hardware);
  if (hardware === 'false') items = items.filter(i => !i.is_hardware);
  if (q) {
    const kw = q.toLowerCase();
    items = items.filter(i => (i.name || '').toLowerCase().includes(kw) || (i.item_code || '').toLowerCase().includes(kw));
  }
  res.json(items.sort((a, b) => (a.category || '').localeCompare(b.category) || (a.name || '').localeCompare(b.name, 'zh-TW')));
});

router.get('/:id', auth, (req, res) => {
  const item = db.getById('quotation_items', req.params.id);
  if (!item) return res.status(404).json({ error: '不存在' });
  res.json(item);
});

router.post('/', auth, (req, res) => {
  const { item_code, name, category, is_hardware, unit, unit_price, cost_price, vendor_id, description } = req.body;
  if (!name) return res.status(400).json({ error: '缺少項目名稱' });
  const item = db.insert('quotation_items', {
    id: uuidv4(), item_code: item_code || '', name,
    category: category || 'other', is_hardware: !!is_hardware,
    unit: unit || '式', unit_price: Number(unit_price) || 0,
    cost_price: Number(cost_price) || 0, vendor_id: vendor_id || null,
    description: description || '', is_active: true,
  });
  res.status(201).json(item);
});

router.put('/:id', auth, (req, res) => {
  const updated = db.update('quotation_items', req.params.id, req.body);
  if (!updated) return res.status(404).json({ error: '不存在' });
  res.json(updated);
});

router.delete('/:id', auth, (req, res) => {
  db.remove('quotation_items', req.params.id);
  res.json({ success: true });
});

/* ═══ 預設活動分類 ═══ */

router.get('/categories/event', auth, (req, res) => {
  res.json(db.getAll('event_categories').sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0)));
});

router.post('/categories/event', auth, (req, res) => {
  const { name, icon, sort_order } = req.body;
  const item = db.insert('event_categories', {
    id: uuidv4(), name, icon: icon || '🎪', sort_order: sort_order || 0, is_active: true,
  });
  res.status(201).json(item);
});

router.put('/categories/event/:id', auth, (req, res) => {
  res.json(db.update('event_categories', req.params.id, req.body));
});

router.delete('/categories/event/:id', auth, (req, res) => {
  db.remove('event_categories', req.params.id);
  res.json({ success: true });
});

/* ═══ 採購單類別 ═══ */

router.get('/categories/po', auth, (req, res) => {
  res.json(db.getAll('po_categories').sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0)));
});

router.post('/categories/po', auth, (req, res) => {
  const { name, is_hardware, sort_order } = req.body;
  const item = db.insert('po_categories', {
    id: uuidv4(), name, is_hardware: !!is_hardware, sort_order: sort_order || 0,
  });
  res.status(201).json(item);
});

router.delete('/categories/po/:id', auth, (req, res) => {
  db.remove('po_categories', req.params.id);
  res.json({ success: true });
});

module.exports = router;
