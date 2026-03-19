const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const { JWT_SECRET, auth, role, logActivity } = require('../middleware/auth');

const router = express.Router();

// POST /api/auth/login
router.post('/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: '請輸入帳號密碼' });
  const user = db.findOne('users', u => u.username === username && u.is_active);
  if (!user) return res.status(401).json({ error: '帳號不存在或已停用' });
  if (!bcrypt.compareSync(password, user.password_hash)) return res.status(401).json({ error: '密碼錯誤' });

  const dept = user.department_id ? db.getById('departments', user.department_id) : null;
  const token = jwt.sign({
    id: user.id, username: user.username, role: user.role,
    display_name: user.display_name, department_id: user.department_id,
    department_name: dept?.name || null, avatar_color: user.avatar_color || '#6366f1'
  }, JWT_SECRET, { expiresIn: '7d' });

  logActivity(db, null, user.id, 'login', `${user.display_name} 登入系統`);
  res.json({ token, user: { id: user.id, username: user.username, display_name: user.display_name, role: user.role, department_name: dept?.name || null, avatar_color: user.avatar_color } });
});

// GET /api/auth/me
router.get('/me', auth, (req, res) => res.json(req.user));

// === 使用者管理 ===
router.get('/users', auth, (req, res) => {
  const users = db.getAll('users').map(u => {
    const dept = u.department_id ? db.getById('departments', u.department_id) : null;
    return { ...u, password_hash: undefined, department_name: dept?.name || null, department_icon: dept?.icon || '' };
  });
  res.json(users);
});

router.post('/users', auth, role('admin'), (req, res) => {
  const { username, password, display_name, role: userRole, department_id, email } = req.body;
  if (!username || !password) return res.status(400).json({ error: '缺少帳號或密碼' });
  if (db.findOne('users', u => u.username === username)) return res.status(409).json({ error: '帳號已存在' });
  const colors = ['#6366f1', '#f59e0b', '#22c55e', '#ef4444', '#06b6d4', '#ec4899', '#8b5cf6', '#14b8a6'];
  const user = db.insert('users', {
    id: uuidv4(), username, password_hash: bcrypt.hashSync(password, 10),
    display_name: display_name || username, email: email || '',
    role: userRole || 'staff', department_id: department_id || null, is_active: true,
    avatar_color: colors[Math.floor(Math.random() * colors.length)]
  });
  logActivity(db, null, req.user.id, 'create_user', `建立帳號 ${username}`);
  res.status(201).json({ ...user, password_hash: undefined });
});

router.put('/users/:id', auth, role('admin'), (req, res) => {
  const updates = { ...req.body };
  if (updates.password) { updates.password_hash = bcrypt.hashSync(updates.password, 10); delete updates.password; }
  const updated = db.update('users', req.params.id, updates);
  if (!updated) return res.status(404).json({ error: '使用者不存在' });
  res.json({ ...updated, password_hash: undefined });
});

// === 部門管理 ===
router.get('/departments', auth, (req, res) => {
  res.json(db.getAll('departments').sort((a, b) => (a.sort || 0) - (b.sort || 0)));
});

router.post('/departments', auth, role('admin'), (req, res) => {
  const { name, icon } = req.body;
  if (!name) return res.status(400).json({ error: '缺少部門名稱' });
  const dept = db.insert('departments', { id: uuidv4(), name, icon: icon || '🏢', sort: 99 });
  res.status(201).json(dept);
});

router.put('/departments/:id', auth, role('admin'), (req, res) => {
  const updated = db.update('departments', req.params.id, req.body);
  if (!updated) return res.status(404).json({ error: '部門不存在' });
  res.json(updated);
});

router.delete('/departments/:id', auth, role('admin'), (req, res) => {
  db.remove('departments', req.params.id);
  res.json({ success: true });
});

// === 系統設定 ===
router.get('/settings', auth, (req, res) => {
  res.json(db.getAll('system_settings'));
});

router.put('/settings/:key', auth, role('admin'), (req, res) => {
  const setting = db.findOne('system_settings', s => s.key === req.params.key);
  if (setting) {
    const updated = db.update('system_settings', setting.id, { value: req.body.value });
    res.json(updated);
  } else {
    const created = db.insert('system_settings', { id: require('uuid').v4(), key: req.params.key, value: req.body.value });
    res.json(created);
  }
});

// === 操作紀錄 ===
router.get('/activities', auth, role('admin'), (req, res) => {
  const logs = db.getAll('activity_logs')
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .slice(0, 100)
    .map(l => {
      const user = db.getById('users', l.user_id);
      return { ...l, display_name: user?.display_name || '系統' };
    });
  res.json(logs);
});

module.exports = router;
