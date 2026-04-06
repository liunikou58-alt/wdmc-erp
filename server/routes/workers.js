/**
 * 工作人員主檔 (勞報單)
 * 
 * 對應 Ragic：工作人員主檔(勞報單) - forms13/9
 * 功能：CRUD + 搜尋 (autocomplete for 連結載入)
 */
const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const { auth, logActivity, requirePermission } = require('../middleware/auth');

const router = express.Router();

// GET /api/workers — 工作人員列表
router.get('/', auth, requirePermission('workers', 'view'),(req, res) => {
  const workers = db.getAll('workers')
    .sort((a, b) => (a.name || '').localeCompare(b.name, 'zh-TW'));
  res.json(workers);
});

// GET /api/workers/search?q=xxx — 搜尋（autocomplete / 連結載入用）
router.get('/search', auth, requirePermission('workers', 'view'),(req, res) => {
  const { q } = req.query;
  if (!q || q.length < 1) return res.json([]);
  const keyword = q.toLowerCase();
  const results = db.getAll('workers').filter(w =>
    (w.name || '').toLowerCase().includes(keyword) ||
    (w.id_number || '').toLowerCase().includes(keyword) ||
    (w.phone || '').includes(keyword)
  ).slice(0, 20);
  res.json(results);
});

// GET /api/workers/:id
router.get('/:id', auth, requirePermission('workers', 'view'),(req, res) => {
  const worker = db.getById('workers', req.params.id);
  if (!worker) return res.status(404).json({ error: '工作人員不存在' });
  res.json(worker);
});

// POST /api/workers — 新增工作人員
router.post('/', auth, requirePermission('workers', 'create'),(req, res) => {
  const { name, id_number, birthday, address, phone, bank_account, bank_name,
    id_photo_front, id_photo_back, signature } = req.body;
  if (!name) return res.status(400).json({ error: '缺少姓名' });

  // 檢查身分證是否重複
  if (id_number) {
    const existing = db.find('workers', w => w.id_number === id_number);
    if (existing.length > 0) {
      return res.status(409).json({ error: '此身分證字號已存在', existing: existing[0] });
    }
  }

  const worker = db.insert('workers', {
    id: uuidv4(),
    name,
    id_number: id_number || '',
    birthday: birthday || '',
    address: address || '',
    phone: phone || '',
    bank_account: bank_account || '',
    bank_name: bank_name || '',
    id_photo_front: id_photo_front || '',
    id_photo_back: id_photo_back || '',
    signature: signature || '', // Base64 PNG 電子簽名
  });

  logActivity(db, null, req.user.id, 'create_worker', `新增工作人員「${name}」`);
  res.status(201).json(worker);
});

// PUT /api/workers/:id — 更新工作人員
router.put('/:id', auth, requirePermission('workers', 'edit'),(req, res) => {
  const updated = db.update('workers', req.params.id, req.body);
  if (!updated) return res.status(404).json({ error: '工作人員不存在' });
  res.json(updated);
});

// DELETE /api/workers/:id
router.delete('/:id', auth, requirePermission('workers', 'delete'),(req, res) => {
  // 檢查是否在勞報單中被引用
  const refs = db.find('labor_report_workers', lrw => lrw.worker_id === req.params.id);
  if (refs.length > 0) {
    return res.status(409).json({
      error: `此工作人員已被 ${refs.length} 筆勞報單引用，無法刪除`,
      references: refs.length
    });
  }
  db.remove('workers', req.params.id);
  res.json({ success: true });
});

module.exports = router;
