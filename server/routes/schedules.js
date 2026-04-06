const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const { auth, logActivity, requirePermission } = require('../middleware/auth');

const router = express.Router();

// GET /api/schedules — 排班總覽
router.get('/', auth, requirePermission('schedules', 'view'),(req, res) => {
  const { start_date, end_date, user_id, department_id } = req.query;
  let schedules = db.getAll('schedules');

  if (start_date) schedules = schedules.filter(s => s.start_date >= start_date);
  if (end_date) schedules = schedules.filter(s => s.start_date <= end_date);
  if (user_id) schedules = schedules.filter(s => s.user_id === user_id);
  if (department_id) schedules = schedules.filter(s => s.department_id === department_id);

  const enriched = schedules.map(s => {
    const user = db.getById('users', s.user_id);
    const project = s.project_id ? db.getById('projects', s.project_id) : null;
    const dept = s.department_id ? db.getById('departments', s.department_id) : null;
    return { ...s, user_name: user?.display_name || '', user_avatar_color: user?.avatar_color || '#6366f1', project_name: project?.name || '', department_name: dept?.name || '', department_icon: dept?.icon || '' };
  }).sort((a, b) => a.start_date.localeCompare(b.start_date));

  res.json(enriched);
});

// GET /api/schedules/conflicts — 衝突檢查
router.get('/conflicts', auth, requirePermission('schedules', 'view'),(req, res) => {
  const schedules = db.getAll('schedules');
  const conflicts = [];
  for (let i = 0; i < schedules.length; i++) {
    for (let j = i + 1; j < schedules.length; j++) {
      const a = schedules[i], b = schedules[j];
      if (a.user_id === b.user_id && a.start_date <= (b.end_date || b.start_date) && (a.end_date || a.start_date) >= b.start_date) {
        const user = db.getById('users', a.user_id);
        conflicts.push({ user_name: user?.display_name || '', schedule_a: a, schedule_b: b });
      }
    }
  }
  res.json(conflicts);
});

// GET /api/schedules/availability — 人員可用性
router.get('/availability', auth, requirePermission('schedules', 'view'),(req, res) => {
  const { date } = req.query;
  if (!date) return res.status(400).json({ error: '缺少日期' });
  const users = db.getAll('users').filter(u => u.is_active);
  const result = users.map(u => {
    const daySchedules = db.find('schedules', s => s.user_id === u.id && s.start_date <= date && (s.end_date || s.start_date) >= date);
    const dept = u.department_id ? db.getById('departments', u.department_id) : null;
    return { id: u.id, display_name: u.display_name, department_name: dept?.name || '', department_icon: dept?.icon || '', avatar_color: u.avatar_color || '#6366f1', is_available: daySchedules.length === 0, schedules: daySchedules.map(s => { const p = s.project_id ? db.getById('projects', s.project_id) : null; return { ...s, project_name: p?.name || '' }; }) };
  });
  res.json(result);
});

// POST /api/schedules
router.post('/', auth, requirePermission('schedules', 'create'),(req, res) => {
  const { user_id, project_id, department_id, title, start_date, end_date, shift, location, notes } = req.body;
  if (!user_id || !start_date) return res.status(400).json({ error: '缺少人員或日期' });

  // 衝突檢查
  const existing = db.find('schedules', s => s.user_id === user_id && s.start_date <= (end_date || start_date) && (s.end_date || s.start_date) >= start_date);
  if (existing.length > 0) {
    const proj = existing[0].project_id ? db.getById('projects', existing[0].project_id) : null;
    return res.status(409).json({ error: `此人員在 ${start_date} 已有排班：${proj?.name || existing[0].title || ''}`, conflict: existing[0] });
  }

  const schedule = db.insert('schedules', {
    id: uuidv4(), user_id, project_id: project_id || null, department_id: department_id || null,
    title: title || '', start_date, end_date: end_date || start_date,
    shift: shift || 'full', location: location || '', notes: notes || '',
    status: 'confirmed', created_by: req.user.id
  });
  const user = db.getById('users', user_id);
  logActivity(db, project_id, req.user.id, 'create_schedule', `排班 ${user?.display_name || ''} → ${start_date}`);
  res.status(201).json(schedule);
});

// PUT /api/schedules/:id
router.put('/:id', auth, requirePermission('schedules', 'edit'),(req, res) => {
  const updated = db.update('schedules', req.params.id, req.body);
  res.json(updated);
});

// DELETE /api/schedules/:id
router.delete('/:id', auth, requirePermission('schedules', 'delete'),(req, res) => {
  db.remove('schedules', req.params.id);
  res.json({ success: true });
});

module.exports = router;
