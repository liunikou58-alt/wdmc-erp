/**
 * 通用檔案上傳路由
 * 
 * 支援：提案附件、合約掃描、場勘照片、專案文件
 * 儲存位置：data/uploads/{category}/
 */
const express = require('express');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');
const db = require('../db');
const { auth, logActivity } = require('../middleware/auth');

const router = express.Router();

const UPLOAD_DIR = path.join(__dirname, '..', '..', 'data', 'uploads');
const MAX_SIZE = 20 * 1024 * 1024; // 20MB
const ALLOWED_EXT = ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.jpg', '.jpeg', '.png', '.gif', '.webp', '.mp4', '.zip'];

// GET /api/files — 檔案列表
router.get('/', auth, (req, res) => {
  const { project_id, category, entity_type, entity_id } = req.query;
  let files = db.getAll('files');
  if (project_id) files = files.filter(f => f.project_id === project_id);
  if (category) files = files.filter(f => f.category === category);
  if (entity_type) files = files.filter(f => f.entity_type === entity_type);
  if (entity_id) files = files.filter(f => f.entity_id === entity_id);

  const enriched = files.map(f => {
    const uploader = db.getById('users', f.uploaded_by);
    return { ...f, uploader_name: uploader?.display_name || '' };
  }).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  res.json(enriched);
});

// POST /api/files/upload — 上傳檔案（base64 方式，避免 multer 依賴）
router.post('/upload', auth, express.json({ limit: '25mb' }), (req, res) => {
  const { filename, data, category, project_id, entity_type, entity_id, description } = req.body;
  if (!filename || !data) return res.status(400).json({ error: '缺少檔案資料' });

  const ext = path.extname(filename).toLowerCase();
  if (!ALLOWED_EXT.includes(ext)) return res.status(400).json({ error: `不支援的檔案類型: ${ext}` });

  // base64 decode
  const buffer = Buffer.from(data, 'base64');
  if (buffer.length > MAX_SIZE) return res.status(400).json({ error: '檔案過大（上限 20MB）' });

  // 儲存
  const cat = category || 'general';
  const dir = path.join(UPLOAD_DIR, cat);
  fs.mkdirSync(dir, { recursive: true });
  const savedName = `${Date.now()}-${uuidv4().slice(0, 8)}${ext}`;
  fs.writeFileSync(path.join(dir, savedName), buffer);

  const file = db.insert('files', {
    id: uuidv4(), original_name: filename, saved_name: savedName,
    path: `/uploads/${cat}/${savedName}`, size: buffer.length, ext,
    category: cat, mime_type: getMime(ext),
    project_id: project_id || null, entity_type: entity_type || null, entity_id: entity_id || null,
    description: description || '', uploaded_by: req.user.id
  });

  logActivity(db, project_id, req.user.id, 'upload_file', `上傳檔案 ${filename}`);
  res.status(201).json(file);
});

// DELETE /api/files/:id
router.delete('/:id', auth, (req, res) => {
  const file = db.getById('files', req.params.id);
  if (!file) return res.status(404).json({ error: '檔案不存在' });
  // 刪除實體檔案
  const filePath = path.join(UPLOAD_DIR, '..', file.path);
  try { fs.unlinkSync(filePath); } catch {}
  db.remove('files', req.params.id);
  res.json({ success: true });
});

function getMime(ext) {
  const map = { '.pdf': 'application/pdf', '.doc': 'application/msword', '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', '.xls': 'application/vnd.ms-excel', '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', '.ppt': 'application/vnd.ms-powerpoint', '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.gif': 'image/gif', '.webp': 'image/webp', '.mp4': 'video/mp4', '.zip': 'application/zip' };
  return map[ext] || 'application/octet-stream';
}

module.exports = router;
