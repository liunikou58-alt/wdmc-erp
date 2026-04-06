const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const { auth, logActivity, requirePermission } = require('../middleware/auth');

const router = express.Router();

// GET /api/knowledge — 知識庫列表
router.get('/', auth, requirePermission('knowledge', 'view'),(req, res) => {
  const { category } = req.query;
  let items = db.getAll('knowledge_base').sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  if (category) items = items.filter(k => k.category === category);
  const enriched = items.map(k => {
    const creator = db.getById('users', k.created_by);
    return { ...k, creator_name: creator?.display_name || '' };
  });
  res.json(enriched);
});

// GET /api/knowledge/:id
router.get('/:id', auth, requirePermission('knowledge', 'view'),(req, res) => {
  const k = db.getById('knowledge_base', req.params.id);
  if (!k) return res.status(404).json({ error: '文件不存在' });
  res.json(k);
});

// POST /api/knowledge
router.post('/', auth, requirePermission('knowledge', 'create'),(req, res) => {
  const { title, content, category, tags, project_id } = req.body;
  if (!title) return res.status(400).json({ error: '缺少標題' });
  const k = db.insert('knowledge_base', {
    id: uuidv4(), title, content: content || '', category: category || 'general',
    tags: tags || [], project_id: project_id || null, created_by: req.user.id
  });
  logActivity(db, project_id, req.user.id, 'create_knowledge', `新增知識文件 ${title}`);
  res.status(201).json(k);
});

// PUT /api/knowledge/:id
router.put('/:id', auth, requirePermission('knowledge', 'edit'),(req, res) => {
  const updated = db.update('knowledge_base', req.params.id, req.body);
  res.json(updated);
});

// DELETE /api/knowledge/:id
router.delete('/:id', auth, requirePermission('knowledge', 'delete'),(req, res) => {
  db.remove('knowledge_base', req.params.id);
  res.json({ success: true });
});

module.exports = router;
