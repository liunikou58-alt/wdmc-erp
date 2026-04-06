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
const { auth, logActivity, requirePermission } = require('../middleware/auth');
const s3Service = require('../services/s3');

const router = express.Router();

const UPLOAD_DIR = path.join(__dirname, '..', '..', 'data', 'uploads');
const MAX_SIZE = 20 * 1024 * 1024; // 20MB
const ALLOWED_EXT = ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.jpg', '.jpeg', '.png', '.gif', '.webp', '.mp4', '.zip'];

// GET /api/files — 檔案列表
router.get('/', auth, requirePermission('files', 'view'),(req, res) => {
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

// POST /api/files/upload — 上傳檔案（base64 方式，支援 S3）
router.post('/upload', auth, requirePermission('files', 'create'),express.json({ limit: '25mb' }), async (req, res) => {
  const { filename, data, category, project_id, entity_type, entity_id, description, parent_file_id } = req.body;
  if (!filename || !data) return res.status(400).json({ error: '缺少檔案資料' });

  const ext = path.extname(filename).toLowerCase();
  if (!ALLOWED_EXT.includes(ext)) return res.status(400).json({ error: `不支援的檔案類型: ${ext}` });

  // base64 decode
  const buffer = Buffer.from(data, 'base64');
  if (buffer.length > MAX_SIZE) return res.status(400).json({ error: '檔案過大（上限 20MB）' });

  const cat = category || 'general';
  
  try {
    // 透過 S3 服務上傳 (若未設定則自動 Fallback 到 Local Storage)
    const fileUrl = await s3Service.uploadFile(buffer, filename, cat);
    const savedName = fileUrl.split('/').pop() || filename;

    const file = db.insert('files', {
      id: uuidv4(), original_name: filename, saved_name: savedName,
      path: fileUrl, size: buffer.length, ext,
      category: cat, mime_type: getMime(ext), parent_file_id: parent_file_id || null,
      project_id: project_id || null, entity_type: entity_type || null, entity_id: entity_id || null,
      description: description || '', uploaded_by: req.user.id
    });

    // 如果有 parent_file_id，表示上傳新版本，把舊版本標示為 is_old_version
    if (parent_file_id) {
      db.update('files', parent_file_id, { has_newer_version: true });
    }

    logActivity(db, project_id, req.user.id, 'upload_file', `上傳檔案 ${filename}`);
    res.status(201).json(file);
  } catch (error) {
    console.error('上傳檔案失敗:', error);
    res.status(500).json({ error: '檔案上傳過程發生錯誤' });
  }
});

// GET /api/files/:id/versions — 取得檔案的所有版本歷史
router.get('/:id/versions', auth, requirePermission('files', 'view'),(req, res) => {
  const file = db.getById('files', req.params.id);
  if (!file) return res.status(404).json({ error: '檔案不存在' });
  
  // 找出所有同系譜的檔案 (parent_file_id 鏈)
  const allFiles = db.getAll('files');
  let currentFile = file;
  const versions = [];
  
  // 往上找根節點
  let traceCount = 0;
  while (currentFile.parent_file_id && traceCount < 50) {
    const parent = allFiles.find(f => f.id === currentFile.parent_file_id);
    if (!parent) break;
    currentFile = parent;
    traceCount++;
  }
  
  // 往下找所有子節點
  const findChildren = (node) => {
    const enriched = { ...node, uploader_name: db.getById('users', node.uploaded_by)?.display_name || '' };
    versions.push(enriched);
    const children = allFiles.filter(f => f.parent_file_id === node.id);
    children.forEach(c => findChildren(c));
  };
  findChildren(currentFile);
  
  // 按時間排序（最新在上）
  versions.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  
  res.json(versions);
});

// DELETE /api/files/:id
router.delete('/:id', auth, requirePermission('files', 'delete'),(req, res) => {
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
