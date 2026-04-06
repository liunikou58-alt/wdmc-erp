/**
 * Ragic 電子簽核整合路由
 * 勞報單 → Ragic 電簽流程管理
 */
const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const { auth, requirePermission } = require('../middleware/auth');

const router = express.Router();

// --- 簽核紀錄 ---
// GET /api/esign — 所有待簽核/已簽核文件
router.get('/', auth, requirePermission('esign', 'view'),(req, res) => {
  const { status, type } = req.query;
  let records = db.getAll('esign_records').sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  if (status) records = records.filter(r => r.status === status);
  if (type) records = records.filter(r => r.doc_type === type);

  const enriched = records.map(r => {
    const creator = r.created_by ? db.getById('users', r.created_by) : null;
    const signer = r.signer_id ? db.getById('users', r.signer_id) : null;
    return { ...r, creator_name: creator?.display_name || '', signer_name: signer?.display_name || '' };
  });
  res.json(enriched);
});

// POST /api/esign — 發起簽核
router.post('/', auth, requirePermission('esign', 'create'),(req, res) => {
  const { doc_type, doc_id, doc_title, signer_id, signer_email, notes, ragic_form_id } = req.body;
  const record = db.insert('esign_records', {
    id: uuidv4(),
    doc_type: doc_type || 'labor_report',  // labor_report | contract | quotation | purchase_order
    doc_id: doc_id || null, doc_title: doc_title || '',
    signer_id: signer_id || null, signer_email: signer_email || '',
    notes: notes || '',
    ragic_form_id: ragic_form_id || null,
    status: 'pending', // pending | sent | viewed | signed | rejected | expired
    sign_url: '',      // Ragic 簽署 URL (mock)
    created_by: req.user.id,
  });

  // 模擬生成 Ragic 簽署連結
  const signUrl = `https://ap12.ragic.com/sims/wdmc/esign/${record.id}`;
  db.update('esign_records', record.id, { sign_url: signUrl, status: 'sent' });

  res.status(201).json({ ...record, sign_url: signUrl, status: 'sent' });
});

// PUT /api/esign/:id — 更新簽核狀態
router.put('/:id', auth, requirePermission('esign', 'edit'),(req, res) => {
  const updates = { ...req.body };
  if (updates.status === 'signed') updates.signed_at = new Date().toISOString();
  if (updates.status === 'rejected') updates.rejected_at = new Date().toISOString();
  const updated = db.update('esign_records', req.params.id, updates);
  if (!updated) return res.status(404).json({ error: '簽核紀錄不存在' });
  res.json(updated);
});

// GET /api/esign/stats
router.get('/stats', auth, requirePermission('esign', 'view'),(req, res) => {
  const records = db.getAll('esign_records');
  res.json({
    total: records.length,
    pending: records.filter(r => r.status === 'pending' || r.status === 'sent').length,
    viewed: records.filter(r => r.status === 'viewed').length,
    signed: records.filter(r => r.status === 'signed').length,
    rejected: records.filter(r => r.status === 'rejected').length,
  });
});

module.exports = router;
