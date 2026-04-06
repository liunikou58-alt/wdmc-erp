/**
 * WDMC-ERP Auth Routes（升級版 RBAC）
 */
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const { auth, JWT_SECRET, logActivity, requirePermission, requireMinRole } = require('../middleware/auth');
const { ROLE_LABELS, ROLE_LEVELS, DEPARTMENT_MAP, hasRoleLevel } = require('../../shared/permissions');

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
  res.json({
    token, user: {
      id: user.id, username: user.username, display_name: user.display_name,
      role: user.role, role_label: ROLE_LABELS[user.role] || user.role,
      department_name: dept?.name || null, department_icon: dept?.icon || '',
      avatar_color: user.avatar_color,
    }
  });
});

// GET /api/auth/me
router.get('/me', auth, (req, res) => {
  const dept = req.user.department_id ? db.getById('departments', req.user.department_id) : null;
  res.json({
    ...req.user,
    role_label: ROLE_LABELS[req.user.role] || req.user.role,
    role_level: ROLE_LEVELS[req.user.role] || 0,
    department_icon: dept?.icon || '',
  });
});

// GET /api/auth/roles — 角色清單（管理用）
router.get('/roles', auth, (req, res) => {
  const roles = Object.entries(ROLE_LABELS).map(([id, label]) => ({
    id, label, level: ROLE_LEVELS[id],
  }));
  // 只回傳低於或等於自己的角色（不能建立比自己高的）
  const myLevel = ROLE_LEVELS[req.user.role] || 0;
  res.json(roles.filter(r => r.level <= myLevel));
});

// GET /api/auth/permissions — 當前使用者權限清單
router.get('/permissions', auth, (req, res) => {
  const { ERP_PERMISSIONS, hasPermission } = require('../../shared/permissions');
  const perms = {};
  for (const [mod, actions] of Object.entries(ERP_PERMISSIONS)) {
    perms[mod] = {};
    for (const action of Object.keys(actions)) {
      perms[mod][action] = hasPermission(req.user, mod, action, ERP_PERMISSIONS);
    }
  }
  res.json(perms);
});

// === 使用者管理（director+ 可查看, ceo 可建立/編輯）===
router.get('/users', auth, requireMinRole('director'), (req, res) => {
  const users = db.getAll('users').map(u => {
    const dept = u.department_id ? db.getById('departments', u.department_id) : null;
    return {
      ...u, password_hash: undefined,
      department_name: dept?.name || null, department_icon: dept?.icon || '',
      role_label: ROLE_LABELS[u.role] || u.role,
    };
  });
  res.json(users);
});

router.post('/users', auth, requireMinRole('ceo'), (req, res) => {
  const { username, password, display_name, role: userRole, department_id, email } = req.body;
  if (!username || !password) return res.status(400).json({ error: '缺少帳號或密碼' });
  if (db.findOne('users', u => u.username === username)) return res.status(409).json({ error: '帳號已存在' });

  // 不能建立比自己高的角色
  if (ROLE_LEVELS[userRole] > ROLE_LEVELS[req.user.role]) {
    return res.status(403).json({ error: '無法建立比自己更高權限的帳號' });
  }

  const colors = ['#6366f1', '#f59e0b', '#22c55e', '#ef4444', '#06b6d4', '#ec4899', '#8b5cf6', '#14b8a6'];
  const user = db.insert('users', {
    id: uuidv4(), username, password_hash: bcrypt.hashSync(password, 10),
    display_name: display_name || username, email: email || '',
    role: userRole || 'staff', department_id: department_id || null, is_active: true,
    avatar_color: colors[Math.floor(Math.random() * colors.length)]
  });
  logActivity(db, null, req.user.id, 'create_user', `建立帳號 ${username}（${ROLE_LABELS[userRole] || userRole}）`);
  res.status(201).json({ ...user, password_hash: undefined });
});

router.put('/users/:id', auth, requireMinRole('director'), (req, res) => {
  const target = db.getById('users', req.params.id);
  if (!target) return res.status(404).json({ error: '使用者不存在' });

  // 不能編輯比自己高或同等的（除非自己是 CEO）
  if (req.user.role !== 'ceo' && ROLE_LEVELS[target.role] >= ROLE_LEVELS[req.user.role]) {
    return res.status(403).json({ error: '無法編輯同級或更高權限的帳號' });
  }

  const updates = { ...req.body };
  if (updates.password) { updates.password_hash = bcrypt.hashSync(updates.password, 10); delete updates.password; }

  // 不能將角色提升到高於自己
  if (updates.role && ROLE_LEVELS[updates.role] > ROLE_LEVELS[req.user.role]) {
    return res.status(403).json({ error: '無法提升角色到高於自己的等級' });
  }

  const updated = db.update('users', req.params.id, updates);
  logActivity(db, null, req.user.id, 'update_user', `更新帳號 ${target.username}`);
  res.json({ ...updated, password_hash: undefined });
});

// DELETE /api/auth/users/:id — 停用帳號（非實際刪除）
router.delete('/users/:id', auth, requireMinRole('ceo'), (req, res) => {
  const target = db.getById('users', req.params.id);
  if (!target) return res.status(404).json({ error: '使用者不存在' });
  if (target.id === req.user.id) return res.status(400).json({ error: '無法停用自己的帳號' });
  db.update('users', req.params.id, { is_active: false });
  logActivity(db, null, req.user.id, 'disable_user', `停用帳號 ${target.username}`);
  res.json({ success: true });
});

// === 部門管理 ===
router.get('/departments', auth, (req, res) => {
  res.json(db.getAll('departments').sort((a, b) => (a.sort || 0) - (b.sort || 0)));
});

router.post('/departments', auth, requireMinRole('ceo'), (req, res) => {
  const { name, icon, key } = req.body;
  if (!name) return res.status(400).json({ error: '缺少部門名稱' });
  const dept = db.insert('departments', { id: uuidv4(), key: key || '', name, icon: icon || '🏢', sort: 99 });
  res.status(201).json(dept);
});

router.put('/departments/:id', auth, requireMinRole('ceo'), (req, res) => {
  const updated = db.update('departments', req.params.id, req.body);
  if (!updated) return res.status(404).json({ error: '部門不存在' });
  res.json(updated);
});

router.delete('/departments/:id', auth, requireMinRole('ceo'), (req, res) => {
  // 檢查是否還有使用者屬於此部門
  const usersInDept = db.getAll('users').filter(u => u.department_id === req.params.id);
  if (usersInDept.length > 0) return res.status(400).json({ error: `此部門還有 ${usersInDept.length} 個使用者，無法刪除` });
  db.remove('departments', req.params.id);
  res.json({ success: true });
});

// === 系統設定 ===
router.get('/settings', auth, (req, res) => {
  res.json(db.getAll('system_settings'));
});

router.put('/settings/:key', auth, requireMinRole('ceo'), (req, res) => {
  const setting = db.findOne('system_settings', s => s.key === req.params.key);
  if (setting) {
    const updated = db.update('system_settings', setting.id, { value: req.body.value });
    res.json(updated);
  } else {
    const created = db.insert('system_settings', { id: uuidv4(), key: req.params.key, value: req.body.value });
    res.json(created);
  }
});

// === 操作紀錄 ===
router.get('/activities', auth, requireMinRole('director'), (req, res) => {
  const logs = db.getAll('activity_logs')
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .slice(0, 200)
    .map(l => {
      const user = db.getById('users', l.user_id);
      return { ...l, display_name: user?.display_name || '系統' };
    });
  res.json(logs);
});

module.exports = router;
