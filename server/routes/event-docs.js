/**
 * 活動文件 + 專案模擬器
 *
 * 對應 Ragic：活動流程 / 活動硬體需求單 / Kick-off / Review / 專案模擬器
 * 掛在 projects 路由下作為子路由
 */
const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const { auth, logActivity, requirePermission } = require('../middleware/auth');

const router = express.Router();

/* ═══ 活動流程表 ═══ */

// GET /api/event-docs/:projectId/flow
router.get('/:projectId/flow', auth, requirePermission('event_docs', 'view'),(req, res) => {
  const items = db.find('event_flows', f => f.project_id === req.params.projectId)
    .sort((a, b) => (a.sequence || 0) - (b.sequence || 0));
  res.json(items);
});

router.post('/:projectId/flow', auth, requirePermission('event_docs', 'create'),(req, res) => {
  const { time_slot, content, responsible_person, responsible_dept,
    equipment_needed, lighting_cue, audio_cue, notes } = req.body;
  const existing = db.find('event_flows', f => f.project_id === req.params.projectId);
  const item = db.insert('event_flows', {
    id: uuidv4(), project_id: req.params.projectId,
    time_slot: time_slot || '', sequence: existing.length + 1,
    content: content || '', responsible_person: responsible_person || '',
    responsible_dept: responsible_dept || null,
    equipment_needed: equipment_needed || '', lighting_cue: lighting_cue || '',
    audio_cue: audio_cue || '', notes: notes || '',
  });
  res.status(201).json(item);
});

router.put('/:projectId/flow/:id', auth, requirePermission('event_docs', 'edit'),(req, res) => {
  res.json(db.update('event_flows', req.params.id, req.body));
});

router.delete('/:projectId/flow/:id', auth, requirePermission('event_docs', 'delete'),(req, res) => {
  db.remove('event_flows', req.params.id);
  res.json({ success: true });
});

/* ═══ 活動硬體需求單 ═══ */

router.get('/:projectId/hardware', auth, requirePermission('event_docs', 'view'),(req, res) => {
  const items = db.find('hardware_requirements', h => h.project_id === req.params.projectId);
  const enriched = items.map(h => {
    const asset = h.item_id ? db.getById('assets', h.item_id) : null;
    const user = h.responsible_person ? db.getById('users', h.responsible_person) : null;
    return { ...h, item_name: asset?.name || '', responsible_name: user?.display_name || '' };
  });
  res.json(enriched);
});

router.post('/:projectId/hardware', auth, requirePermission('event_docs', 'create'),(req, res) => {
  const { item_id, quantity, pickup_date, return_date, responsible_person, notes } = req.body;
  const item = db.insert('hardware_requirements', {
    id: uuidv4(), project_id: req.params.projectId,
    item_id: item_id || null, quantity: Number(quantity) || 1,
    pickup_date: pickup_date || '', return_date: return_date || '',
    responsible_person: responsible_person || null,
    status: 'requested', notes: notes || '',
  });
  res.status(201).json(item);
});

router.put('/:projectId/hardware/:id', auth, requirePermission('event_docs', 'edit'),(req, res) => {
  res.json(db.update('hardware_requirements', req.params.id, req.body));
});

router.delete('/:projectId/hardware/:id', auth, requirePermission('event_docs', 'delete'),(req, res) => {
  db.remove('hardware_requirements', req.params.id);
  res.json({ success: true });
});

/* ═══ Kick-off 啟動表 ═══ */

router.get('/:projectId/kickoff', auth, requirePermission('event_docs', 'view'),(req, res) => {
  const item = db.findOne('kickoff_forms', k => k.project_id === req.params.projectId);
  res.json(item || null);
});

router.post('/:projectId/kickoff', auth, requirePermission('event_docs', 'create'),(req, res) => {
  const existing = db.findOne('kickoff_forms', k => k.project_id === req.params.projectId);
  if (existing) return res.status(409).json({ error: '啟動表已存在', existing });

  const { client_requirements, timeline, department_assignments, meeting_date, attendees, notes } = req.body;
  const item = db.insert('kickoff_forms', {
    id: uuidv4(), project_id: req.params.projectId,
    pm_id: req.user.id, client_requirements: client_requirements || '',
    timeline: timeline || '[]', department_assignments: department_assignments || '{}',
    meeting_date: meeting_date || new Date().toISOString().slice(0, 10),
    attendees: attendees || '', notes: notes || '',
  });
  logActivity(db, req.params.projectId, req.user.id, 'create_kickoff', '建立專案啟動表');
  res.status(201).json(item);
});

router.put('/:projectId/kickoff/:id', auth, requirePermission('event_docs', 'edit'),(req, res) => {
  res.json(db.update('kickoff_forms', req.params.id, req.body));
});

/* ═══ Review 結案表 ═══ */

router.get('/:projectId/review', auth, requirePermission('event_docs', 'view'),(req, res) => {
  const item = db.findOne('review_forms', r => r.project_id === req.params.projectId);
  res.json(item || null);
});

router.post('/:projectId/review', auth, requirePermission('event_docs', 'create'),(req, res) => {
  const existing = db.findOne('review_forms', r => r.project_id === req.params.projectId);
  if (existing) return res.status(409).json({ error: '結案表已存在', existing });

  const { actual_expense, budget_variance, client_satisfaction,
    issues_encountered, improvements, department_scores } = req.body;
  const item = db.insert('review_forms', {
    id: uuidv4(), project_id: req.params.projectId,
    actual_expense: Number(actual_expense) || 0,
    budget_variance: Number(budget_variance) || 0,
    client_satisfaction: Number(client_satisfaction) || 0,
    issues_encountered: issues_encountered || '',
    improvements: improvements || '', department_scores: department_scores || '{}',
    reviewer_id: req.user.id, review_date: new Date().toISOString().slice(0, 10),
  });
  logActivity(db, req.params.projectId, req.user.id, 'create_review', '建立專案結案檢討表');
  res.status(201).json(item);
});

router.put('/:projectId/review/:id', auth, requirePermission('event_docs', 'edit'),(req, res) => {
  res.json(db.update('review_forms', req.params.id, req.body));
});

/* ═══ 專案模擬器 ═══ */

router.get('/simulator/list', auth, requirePermission('event_docs', 'view'),(req, res) => {
  const items = db.getAll('project_simulations')
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  const enriched = items.map(s => {
    const user = db.getById('users', s.created_by);
    return { ...s, created_by_name: user?.display_name || '' };
  });
  res.json(enriched);
});

router.get('/simulator/:id', auth, requirePermission('event_docs', 'view'),(req, res) => {
  const sim = db.getById('project_simulations', req.params.id);
  if (!sim) return res.status(404).json({ error: '不存在' });
  const details = db.find('project_simulation_details', d => d.simulator_id === sim.id)
    .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
  res.json({ ...sim, details });
});

router.post('/simulator', auth, requirePermission('event_docs', 'create'),(req, res) => {
  const { name, event_type, template_id, items: simItems } = req.body;
  const sim = db.insert('project_simulations', {
    id: uuidv4(), name: name || '未命名模擬',
    event_type: event_type || '', template_id: template_id || null,
    total_cost: 0, total_quote: 0, profit_margin: 0,
    created_by: req.user.id,
  });

  let totalCost = 0, totalQuote = 0;
  if (simItems && simItems.length) {
    simItems.forEach((item, i) => {
      const cost = (item.quantity || 1) * (item.cost || 0);
      const quote = (item.quantity || 1) * (item.quote || 0);
      totalCost += cost;
      totalQuote += quote;
      db.insert('project_simulation_details', {
        id: uuidv4(), simulator_id: sim.id,
        item_id: item.item_id || null, item_name: item.item_name || '',
        quantity: item.quantity || 1, cost: item.cost || 0,
        quote: item.quote || 0, sort_order: i,
      });
    });
  }

  const margin = totalQuote > 0 ? Math.round((totalQuote - totalCost) / totalQuote * 100) : 0;
  db.update('project_simulations', sim.id, { total_cost: totalCost, total_quote: totalQuote, profit_margin: margin });
  res.status(201).json(db.getById('project_simulations', sim.id));
});

router.delete('/simulator/:id', auth, requirePermission('event_docs', 'delete'),(req, res) => {
  db.removeWhere('project_simulation_details', d => d.simulator_id === req.params.id);
  db.remove('project_simulations', req.params.id);
  res.json({ success: true });
});

/* ═══ 專案模版 ═══ */

router.get('/templates/list', auth, requirePermission('event_docs', 'view'),(req, res) => {
  res.json(db.getAll('project_templates'));
});

router.post('/templates', auth, requirePermission('event_docs', 'create'),(req, res) => {
  const { name, event_type, items } = req.body;
  const template = db.insert('project_templates', {
    id: uuidv4(), name: name || '', event_type: event_type || '',
    items: JSON.stringify(items || []), created_by: req.user.id,
  });
  res.status(201).json(template);
});

router.delete('/templates/:id', auth, requirePermission('event_docs', 'delete'),(req, res) => {
  db.remove('project_templates', req.params.id);
  res.json({ success: true });
});

module.exports = router;
