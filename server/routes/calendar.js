const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const { auth, logActivity } = require('../middleware/auth');

const router = express.Router();

// GET /api/calendar — 取得行事曆事件
router.get('/', auth, (req, res) => {
  const { start, end } = req.query;
  let events = [];

  // 1. 專案活動日
  db.getAll('projects').forEach(p => {
    if (p.event_date) events.push({ id: `proj-${p.id}`, type: 'project', title: `📁 ${p.name}`, date: p.event_date, end_date: p.event_date, color: '#4f46e5', project_id: p.id, status: p.status });
    if (p.deadline) events.push({ id: `dead-${p.id}`, type: 'deadline', title: `⏰ ${p.name} 截止`, date: p.deadline, end_date: p.deadline, color: '#dc2626', project_id: p.id });
  });

  // 2. 任務截止日
  db.getAll('project_tasks').forEach(t => {
    if (t.due_date && t.status !== 'done') {
      const proj = db.getById('projects', t.project_id);
      events.push({ id: `task-${t.id}`, type: 'task', title: `📋 ${t.title}`, date: t.due_date, end_date: t.due_date, color: '#d97706', project_id: t.project_id, project_name: proj?.name || '' });
    }
  });

  // 3. 排班事件
  db.getAll('schedules').forEach(s => {
    const user = db.getById('users', s.user_id);
    const proj = s.project_id ? db.getById('projects', s.project_id) : null;
    events.push({ id: `sched-${s.id}`, type: 'schedule', title: `👷 ${user?.display_name || '?'} → ${proj?.name || s.title || ''}`, date: s.start_date, end_date: s.end_date || s.start_date, color: '#7c3aed', user_id: s.user_id, project_id: s.project_id });
  });

  // 4. 自訂事件
  db.getAll('calendar_events').forEach(e => {
    events.push({ ...e, type: 'custom' });
  });

  // 篩選日期範圍
  if (start && end) events = events.filter(e => e.date >= start && e.date <= end);
  res.json(events.sort((a, b) => a.date.localeCompare(b.date)));
});

// POST /api/calendar — 新增自訂事件
router.post('/', auth, (req, res) => {
  const { title, date, end_date, color, description } = req.body;
  if (!title || !date) return res.status(400).json({ error: '缺少必要資訊' });
  const event = db.insert('calendar_events', {
    id: uuidv4(), title, date, end_date: end_date || date,
    color: color || '#6366f1', description: description || '', created_by: req.user.id
  });
  res.status(201).json(event);
});

router.delete('/:id', auth, (req, res) => {
  db.remove('calendar_events', req.params.id);
  res.json({ success: true });
});

module.exports = router;
