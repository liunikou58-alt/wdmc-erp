/**
 * ProposalFlow AI ↔ WDMC ERP API 橋接
 * ProposalFlow AI 在 port 3001, WDMC ERP 在 port 3002
 */
const express = require('express');
const db = require('../db');
const { auth, logActivity } = require('../middleware/auth');

const router = express.Router();
const PF_BASE = process.env.PROPOSALFLOW_URL || 'http://localhost:3001';

// 從 ProposalFlow 拉取專案列表
router.get('/proposalflow/projects', auth, async (req, res) => {
  try {
    const r = await fetch(`${PF_BASE}/api/projects`);
    if (!r.ok) throw new Error('ProposalFlow 無回應');
    res.json(await r.json());
  } catch (e) {
    res.status(503).json({ error: `無法連接 ProposalFlow: ${e.message}`, offline: true });
  }
});

// 從 ProposalFlow 匯入專案到 ERP
router.post('/proposalflow/import/:pfProjectId', auth, async (req, res) => {
  try {
    const r = await fetch(`${PF_BASE}/api/projects/${req.params.pfProjectId}`);
    if (!r.ok) throw new Error('專案不存在');
    const pfProject = await r.json();

    // 檢查是否已匯入
    const existing = db.findOne('projects', p => p.pf_project_id === pfProject.id);
    if (existing) return res.status(409).json({ error: '此專案已匯入', project: existing });

    const { v4: uuidv4 } = require('uuid');
    const project = db.insert('projects', {
      id: uuidv4(), name: pfProject.name || pfProject.project_name,
      description: pfProject.description || '', event_type: pfProject.event_type || '',
      event_date: pfProject.event_date || '', budget: pfProject.budget || 0,
      status: 'planning', pm_id: req.user.id, created_by: req.user.id,
      pf_project_id: pfProject.id, source: 'proposalflow'
    });

    logActivity(db, project.id, req.user.id, 'import_from_pf', `從 ProposalFlow 匯入專案「${project.name}」`);
    res.status(201).json(project);
  } catch (e) {
    res.status(503).json({ error: e.message });
  }
});

// 提供 ERP 專案資料給 ProposalFlow 查詢
router.get('/erp/projects', auth, (req, res) => {
  const projects = db.getAll('projects').map(p => {
    const customer = p.customer_id ? db.getById('customers', p.customer_id) : null;
    return { id: p.id, name: p.name, customer_name: customer?.name || '', status: p.status, budget: p.budget };
  });
  res.json(projects);
});

// 連線狀態檢查
router.get('/status', auth, async (req, res) => {
  let pfStatus = 'offline';
  try {
    const r = await fetch(`${PF_BASE}/api/health`, { signal: AbortSignal.timeout(3000) });
    if (r.ok) pfStatus = 'online';
  } catch { }
  res.json({
    erp: 'online', proposalflow: pfStatus,
    erp_url: `http://localhost:${process.env.PORT || 3002}`,
    proposalflow_url: PF_BASE
  });
});

module.exports = router;
