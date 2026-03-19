/**
 * 資源名單
 *
 * 對應 Ragic：🎹表演資源 / 🎸藝人資源 / 🎤各項資源廠商 / 🍽️市集攤販
 * 統一用一張表 + type 區分
 */
const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const { auth } = require('../middleware/auth');

const router = express.Router();

// GET /api/resources?type=performer|artist|vendor|market
router.get('/', auth, (req, res) => {
  const { type, q } = req.query;
  let items = db.getAll('resources');
  if (type) items = items.filter(r => r.type === type);
  if (q) {
    const kw = q.toLowerCase();
    items = items.filter(r =>
      (r.name || '').toLowerCase().includes(kw) ||
      (r.contact_person || '').toLowerCase().includes(kw) ||
      (r.resource_type || '').toLowerCase().includes(kw)
    );
  }
  res.json(items.sort((a, b) => (a.name || '').localeCompare(b.name, 'zh-TW')));
});

router.get('/:id', auth, (req, res) => {
  const item = db.getById('resources', req.params.id);
  if (!item) return res.status(404).json({ error: '不存在' });
  res.json(item);
});

router.post('/', auth, (req, res) => {
  const { type, name, resource_type, contact_person, phone, email,
    agency, fee, fee_range, demo_url, past_events, food_type,
    business_license, health_cert, booth_fee, revenue_sharing,
    base_price, cooperation_count, rating, notes } = req.body;

  if (!name) return res.status(400).json({ error: '缺少名稱' });

  const item = db.insert('resources', {
    id: uuidv4(),
    type: type || 'performer', // performer | artist | vendor | market
    name, resource_type: resource_type || '',
    contact_person: contact_person || '', phone: phone || '', email: email || '',
    // 藝人
    agency: agency || '', fee: Number(fee) || 0, fee_range: fee_range || '',
    demo_url: demo_url || '', past_events: past_events || '',
    // 攤販
    food_type: food_type || '', business_license: business_license || '',
    health_cert: health_cert || '', booth_fee: Number(booth_fee) || 0,
    revenue_sharing: Number(revenue_sharing) || 0,
    // 資源廠商
    base_price: base_price || '', cooperation_count: Number(cooperation_count) || 0,
    rating: Number(rating) || 0, notes: notes || '',
  });

  res.status(201).json(item);
});

router.put('/:id', auth, (req, res) => {
  const updated = db.update('resources', req.params.id, req.body);
  if (!updated) return res.status(404).json({ error: '不存在' });
  res.json(updated);
});

router.delete('/:id', auth, (req, res) => {
  db.remove('resources', req.params.id);
  res.json({ success: true });
});

// GET /api/resources/stats
router.get('/stats/summary', auth, (req, res) => {
  const all = db.getAll('resources');
  res.json({
    total: all.length,
    performers: all.filter(r => r.type === 'performer').length,
    artists: all.filter(r => r.type === 'artist').length,
    vendors: all.filter(r => r.type === 'vendor').length,
    market: all.filter(r => r.type === 'market').length,
  });
});

module.exports = router;
