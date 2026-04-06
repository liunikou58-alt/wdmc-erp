/**
 * 公開專案進度分享路由 (免登入)
 * 透過 token 驗證的公開 URL，供客戶查看專案進度
 */
const express = require('express');
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');
const db = require('../db');
const { auth, requirePermission } = require('../middleware/auth');

const router = express.Router();

// --- 建立/管理分享連結（需登入）---
// POST /api/public-share/create
router.post('/create', auth, requirePermission('public_share', 'create'),(req, res) => {
  const { project_id, expires_days } = req.body;
  if (!project_id) return res.status(400).json({ error: '缺少專案 ID' });
  const project = db.getById('projects', project_id);
  if (!project) return res.status(404).json({ error: '專案不存在' });

  const token = crypto.randomBytes(24).toString('hex');
  const expiresAt = expires_days
    ? new Date(Date.now() + expires_days * 86400000).toISOString()
    : new Date(Date.now() + 90 * 86400000).toISOString(); // default 90 days

  const share = db.insert('public_shares', {
    id: uuidv4(), project_id, token,
    expires_at: expiresAt, is_active: true,
    created_by: req.user.id, view_count: 0,
  });
  res.status(201).json({ ...share, url: `/api/public-share/view/${token}` });
});

// GET /api/public-share/list
router.get('/list', auth, requirePermission('public_share', 'view'),(req, res) => {
  const shares = db.getAll('public_shares').map(s => {
    const project = db.getById('projects', s.project_id);
    return { ...s, project_name: project?.name || '—' };
  });
  res.json(shares);
});

// DELETE /api/public-share/:id
router.delete('/:id', auth, requirePermission('public_share', 'delete'),(req, res) => {
  db.remove('public_shares', req.params.id);
  res.json({ success: true });
});

// --- 公開頁面（免登入）---
// GET /api/public-share/view/:token
router.get('/view/:token', (req, res) => {
  const share = db.findOne('public_shares', s => s.token === req.params.token);
  if (!share || !share.is_active) return res.status(404).json({ error: '分享連結不存在或已停用' });
  if (new Date(share.expires_at) < new Date()) return res.status(410).json({ error: '分享連結已過期' });

  const project = db.getById('projects', share.project_id);
  if (!project) return res.status(404).json({ error: '專案不存在' });

  // 更新瀏覽次數
  db.update('public_shares', share.id, { view_count: (share.view_count || 0) + 1 });

  // 取得公開資訊
  const customer = project.customer_id ? db.getById('customers', project.customer_id) : null;
  const tasks = db.find('project_tasks', t => t.project_id === project.id);
  const milestones = db.find('project_milestones', m => m.project_id === project.id)
    .sort((a, b) => new Date(a.target_date) - new Date(b.target_date));
  const doneTasks = tasks.filter(t => t.status === 'done').length;
  const progress = tasks.length > 0 ? Math.round(doneTasks / tasks.length * 100) : 0;

  // 生成帶品牌的 HTML 頁面
  res.send(`<!DOCTYPE html><html lang="zh-TW"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${project.name} — 專案進度</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Microsoft JhengHei', 'Noto Sans TC', sans-serif; background: linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #312e81 100%); min-height: 100vh; color: #e2e8f0; }
  .container { max-width: 800px; margin: 0 auto; padding: 40px 20px; }
  .header { text-align: center; margin-bottom: 40px; }
  .header h1 { font-size: 28px; color: #fff; margin-bottom: 6px; }
  .header .company { color: #818cf8; font-size: 14px; letter-spacing: 2px; }
  .header .updated { color: #64748b; font-size: 12px; margin-top: 8px; }
  .card { background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 16px; padding: 24px; margin-bottom: 20px; backdrop-filter: blur(10px); }
  .stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-bottom: 24px; }
  .stat { text-align: center; padding: 16px; background: rgba(99,102,241,0.1); border-radius: 12px; border: 1px solid rgba(99,102,241,0.2); }
  .stat .num { font-size: 28px; font-weight: 800; color: #818cf8; }
  .stat .lbl { font-size: 12px; color: #94a3b8; margin-top: 4px; }
  .progress-ring { width: 120px; height: 120px; margin: 0 auto 16px; position: relative; }
  .progress-ring svg { transform: rotate(-90deg); }
  .progress-ring .pct { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; font-size: 32px; font-weight: 800; color: #818cf8; }
  .milestone { display: flex; gap: 16px; padding: 12px 0; border-bottom: 1px solid rgba(255,255,255,0.06); }
  .milestone:last-child { border-bottom: none; }
  .milestone .dot { width: 12px; height: 12px; border-radius: 50%; margin-top: 4px; flex-shrink: 0; }
  .milestone .dot.done { background: #22c55e; }
  .milestone .dot.pending { background: #f59e0b; }
  .milestone .title { font-weight: 600; font-size: 14px; }
  .milestone .date { font-size: 12px; color: #64748b; }
  .task-bar { height: 6px; background: rgba(255,255,255,0.1); border-radius: 3px; overflow: hidden; margin-bottom: 4px; }
  .task-bar .fill { height: 100%; border-radius: 3px; transition: width 1s ease; }
  .section-title { font-size: 16px; font-weight: 700; margin-bottom: 14px; display: flex; align-items: center; gap: 8px; }
  .footer { text-align: center; margin-top: 30px; color: #475569; font-size: 11px; }
</style></head><body>
<div class="container">
  <div class="header">
    <div class="company">瓦當麥可創意整合</div>
    <h1>📁 ${project.name}</h1>
    <div class="updated">最後更新：${new Date().toLocaleDateString('zh-TW')}</div>
  </div>

  <div class="stats">
    <div class="stat"><div class="num">${progress}%</div><div class="lbl">整體進度</div></div>
    <div class="stat"><div class="num">${doneTasks}/${tasks.length}</div><div class="lbl">任務完成</div></div>
    <div class="stat"><div class="num">${milestones.filter(m => m.is_completed).length}/${milestones.length}</div><div class="lbl">里程碑</div></div>
  </div>

  <div class="card">
    <div class="section-title">📋 專案資訊</div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;font-size:13px">
      <div><span style="color:#64748b">客戶：</span>${customer?.name || '—'}</div>
      <div><span style="color:#64748b">狀態：</span>${project.status || '—'}</div>
      <div><span style="color:#64748b">活動日期：</span>${project.event_date || '—'}</div>
      <div><span style="color:#64748b">截止日期：</span>${project.deadline || '—'}</div>
    </div>
  </div>

  <div class="card">
    <div class="section-title">🏆 里程碑</div>
    ${milestones.length === 0 ? '<div style="color:#64748b;text-align:center;padding:20px">尚無里程碑</div>' :
      milestones.map(m => `<div class="milestone"><div class="dot ${m.is_completed ? 'done' : 'pending'}"></div><div><div class="title">${m.title}</div><div class="date">${m.target_date || '—'} ${m.is_completed ? '✅ 已完成' : '⏳ 進行中'}</div></div></div>`).join('')}
  </div>

  <div class="card">
    <div class="section-title">📊 任務進度</div>
    ${['todo', 'in_progress', 'done'].map(s => {
      const count = tasks.filter(t => t.status === s).length;
      const pct = tasks.length > 0 ? (count / tasks.length * 100) : 0;
      const label = s === 'done' ? '✅ 已完成' : s === 'in_progress' ? '🔄 進行中' : '⬜ 待辦';
      const color = s === 'done' ? '#22c55e' : s === 'in_progress' ? '#f59e0b' : '#64748b';
      return `<div style="margin-bottom:10px"><div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:3px"><span>${label}</span><span>${count} 項 (${Math.round(pct)}%)</span></div><div class="task-bar"><div class="fill" style="width:${pct}%;background:${color}"></div></div></div>`;
    }).join('')}
  </div>

  <div class="footer">此頁面由 WDMC管理中心 系統生成 · 瓦當麥可創意整合 · ${new Date().getFullYear()}</div>
</div></body></html>`);
});

module.exports = router;
