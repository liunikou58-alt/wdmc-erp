const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const { auth, logActivity } = require('../middleware/auth');

const router = express.Router();

// GET /api/projects
router.get('/', auth, (req, res) => {
  const projects = db.getAll('projects').sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  const enriched = projects.map(p => {
    const customer = p.customer_id ? db.getById('customers', p.customer_id) : null;
    const tasks = db.find('project_tasks', t => t.project_id === p.id);
    const doneTasks = tasks.filter(t => t.status === 'done');
    const pm = p.pm_id ? db.getById('users', p.pm_id) : null;
    return {
      ...p, customer_name: customer?.name || '', pm_name: pm?.display_name || '',
      task_count: tasks.length, done_count: doneTasks.length,
      progress: tasks.length ? Math.round((doneTasks.length / tasks.length) * 100) : 0
    };
  });
  res.json(enriched);
});

// GET /api/projects/:id
router.get('/:id', auth, (req, res) => {
  const p = db.getById('projects', req.params.id);
  if (!p) return res.status(404).json({ error: '專案不存在' });
  const customer = p.customer_id ? db.getById('customers', p.customer_id) : null;
  const tasks = db.find('project_tasks', t => t.project_id === p.id);
  const milestones = db.find('project_milestones', m => m.project_id === p.id);
  res.json({ ...p, customer_name: customer?.name || '', tasks, milestones });
});

// POST /api/projects
router.post('/', auth, (req, res) => {
  const { name, customer_id, case_id, event_date, deadline, budget, pm_id, description, event_type } = req.body;
  if (!name) return res.status(400).json({ error: '缺少專案名稱' });
  const project = db.insert('projects', {
    id: uuidv4(), name, customer_id: customer_id || null, case_id: case_id || null,
    event_date: event_date || '', deadline: deadline || '', budget: budget || 0,
    pm_id: pm_id || req.user.id, description: description || '',
    event_type: event_type || '', status: 'planning', created_by: req.user.id
  });
  logActivity(db, project.id, req.user.id, 'create_project', `建立專案 ${name}`);
  res.status(201).json(project);
});

// PUT /api/projects/:id
router.put('/:id', auth, (req, res) => {
  const updated = db.update('projects', req.params.id, req.body);
  if (!updated) return res.status(404).json({ error: '專案不存在' });
  res.json(updated);
});

// DELETE /api/projects/:id
router.delete('/:id', auth, (req, res) => {
  db.remove('projects', req.params.id);
  db.removeWhere('project_tasks', t => t.project_id === req.params.id);
  db.removeWhere('project_milestones', m => m.project_id === req.params.id);
  res.json({ success: true });
});

// === 專案任務 ===
router.get('/:id/tasks', auth, (req, res) => {
  const tasks = db.find('project_tasks', t => t.project_id === req.params.id)
    .map(t => {
      const assignee = t.assignee_id ? db.getById('users', t.assignee_id) : null;
      const dept = t.department_id ? db.getById('departments', t.department_id) : null;
      return { ...t, assignee_name: assignee?.display_name || '', department_name: dept?.name || '', department_icon: dept?.icon || '' };
    });
  res.json(tasks);
});

router.post('/:id/tasks', auth, (req, res) => {
  const { title, description, assignee_id, department_id, priority, due_date, parent_id } = req.body;
  const task = db.insert('project_tasks', {
    id: uuidv4(), project_id: req.params.id, title: title || '', description: description || '',
    assignee_id: assignee_id || null, department_id: department_id || null,
    priority: priority || 'medium', status: 'todo', due_date: due_date || '',
    parent_id: parent_id || null, sort: 99
  });
  logActivity(db, req.params.id, req.user.id, 'create_task', `建立任務 ${title}`);
  res.status(201).json(task);
});

router.put('/:id/tasks/:taskId', auth, (req, res) => {
  const updates = { ...req.body };
  if (updates.status === 'done') updates.completed_at = new Date().toISOString();
  const updated = db.update('project_tasks', req.params.taskId, updates);
  if (!updated) return res.status(404).json({ error: '任務不存在' });
  res.json(updated);
});

router.delete('/:id/tasks/:taskId', auth, (req, res) => {
  db.remove('project_tasks', req.params.taskId);
  res.json({ success: true });
});

// === 專案里程碑 ===
router.get('/:id/milestones', auth, (req, res) => {
  res.json(db.find('project_milestones', m => m.project_id === req.params.id).sort((a, b) => new Date(a.target_date) - new Date(b.target_date)));
});

router.post('/:id/milestones', auth, (req, res) => {
  const { title, target_date, description } = req.body;
  const ms = db.insert('project_milestones', {
    id: uuidv4(), project_id: req.params.id, title: title || '',
    target_date: target_date || '', description: description || '', is_completed: false
  });
  res.status(201).json(ms);
});

router.put('/:id/milestones/:msId', auth, (req, res) => {
  const updated = db.update('project_milestones', req.params.msId, req.body);
  res.json(updated);
});

module.exports = router;
