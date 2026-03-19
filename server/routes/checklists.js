const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const { auth, logActivity } = require('../middleware/auth');

const router = express.Router();

// GET /api/checklists — 所有清單
router.get('/', auth, (req, res) => {
  const { project_id, type } = req.query;
  let lists = db.getAll('checklists');
  if (project_id) lists = lists.filter(c => c.project_id === project_id);
  if (type) lists = lists.filter(c => c.type === type);

  const enriched = lists.map(c => {
    const project = c.project_id ? db.getById('projects', c.project_id) : null;
    const items = db.find('checklist_items', i => i.checklist_id === c.id);
    const done = items.filter(i => i.checked).length;
    return { ...c, project_name: project?.name || '', item_count: items.length, done_count: done, progress: items.length ? Math.round((done / items.length) * 100) : 0 };
  }).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  res.json(enriched);
});

// GET /api/checklists/:id — 清單詳情 + 項目
router.get('/:id', auth, (req, res) => {
  const checklist = db.getById('checklists', req.params.id);
  if (!checklist) return res.status(404).json({ error: '清單不存在' });
  const items = db.find('checklist_items', i => i.checklist_id === checklist.id).sort((a, b) => a.order - b.order);
  const enrichedItems = items.map(i => {
    const user = i.checked_by ? db.getById('users', i.checked_by) : null;
    return { ...i, checked_by_name: user?.display_name || '' };
  });
  res.json({ ...checklist, items: enrichedItems });
});

// POST /api/checklists — 新增清單
router.post('/', auth, (req, res) => {
  const { title, project_id, type, items } = req.body;
  if (!title) return res.status(400).json({ error: '缺少清單名稱' });
  const checklist = db.insert('checklists', {
    id: uuidv4(), title, project_id: project_id || null,
    type: type || 'execution', status: 'pending', created_by: req.user.id
  });
  // 批次新增項目
  if (items && items.length > 0) {
    items.forEach((item, i) => {
      db.insert('checklist_items', {
        id: uuidv4(), checklist_id: checklist.id, title: item.title || item,
        category: item.category || '', order: i, checked: false,
        checked_by: null, checked_at: null, notes: ''
      });
    });
  }
  logActivity(db, project_id, req.user.id, 'create_checklist', `建立清單「${title}」`);
  res.status(201).json(checklist);
});

// POST /api/checklists/:id/items — 新增單一項目
router.post('/:id/items', auth, (req, res) => {
  const { title, category } = req.body;
  const existing = db.find('checklist_items', i => i.checklist_id === req.params.id);
  const item = db.insert('checklist_items', {
    id: uuidv4(), checklist_id: req.params.id, title: title || '',
    category: category || '', order: existing.length, checked: false,
    checked_by: null, checked_at: null, notes: ''
  });
  res.status(201).json(item);
});

// PUT /api/checklists/items/:itemId/toggle — 打勾/取消
router.put('/items/:itemId/toggle', auth, (req, res) => {
  const item = db.getById('checklist_items', req.params.itemId);
  if (!item) return res.status(404).json({ error: '項目不存在' });
  const updated = db.update('checklist_items', req.params.itemId, {
    checked: !item.checked,
    checked_by: !item.checked ? req.user.id : null,
    checked_at: !item.checked ? new Date().toISOString() : null
  });
  res.json(updated);
});

// PUT /api/checklists/items/:itemId — 更新項目
router.put('/items/:itemId', auth, (req, res) => {
  const updated = db.update('checklist_items', req.params.itemId, req.body);
  res.json(updated);
});

// DELETE /api/checklists/:id
router.delete('/:id', auth, (req, res) => {
  db.removeWhere('checklist_items', i => i.checklist_id === req.params.id);
  db.remove('checklists', req.params.id);
  res.json({ success: true });
});

// === 預設範本 ===
router.get('/templates/list', auth, (req, res) => {
  res.json([
    { id: 'load_in', name: '🚛 進場清單', items: ['場地確認','電力測試','設備卸貨','音響架設','燈光架設','LED 安裝','視訊連接','舞台搭建','走線整理','音響測試','燈光對焦','視訊測試','彩排'] },
    { id: 'load_out', name: '📦 退場清單', items: ['設備拆除','線材收整','設備裝箱','清潔場地','垃圾清理','設備裝車','場地歸還確認','損壞清點','運輸出發'] },
    { id: 'show_day', name: '🎤 活動當日', items: ['場地開門','設備開機','音響 Sound Check','燈光 Cue 確認','視訊播放測試','來賓報到準備','彩排 Run Through','正式開始','中場檢查','活動結束','設備關機','場地鎖定'] },
    { id: 'safety', name: '🦺 安全檢查', items: ['消防設備確認','逃生路線標示','電力負載檢查','結構安全確認','急救箱準備','安全人員就位','天氣狀況確認'] },
  ]);
});

module.exports = router;
