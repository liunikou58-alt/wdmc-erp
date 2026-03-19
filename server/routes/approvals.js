/**
 * 審批流程引擎
 * 
 * 流程：提交者 → 部門主管 → 總經理 → 核准/退回
 * 支援：採購單、報價單、支出報銷、合約簽核
 * 
 * 狀態鏈：
 *   draft → submitted → manager_review → gm_review → approved / rejected
 */
const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const { auth, logActivity } = require('../middleware/auth');

const router = express.Router();

const STATUS_FLOW = {
  draft: 'submitted',
  submitted: 'manager_review',
  manager_review: 'gm_review',
  gm_review: 'approved'
};

const STATUS_LABELS = {
  draft: '草稿', submitted: '已提交', manager_review: '主管審核中',
  gm_review: '總經理審核中', approved: '已核准', rejected: '已退回'
};

// GET /api/approvals — 審批列表
router.get('/', auth, (req, res) => {
  const { status, my_pending } = req.query;
  let approvals = db.getAll('approvals');

  if (status) approvals = approvals.filter(a => a.status === status);

  // 我的待審（根據角色判斷：manager 看 manager_review，admin 看 gm_review）
  if (my_pending === 'true') {
    const userRole = req.user.role;
    approvals = approvals.filter(a => {
      if (userRole === 'admin' && a.status === 'gm_review') return true;
      if (userRole === 'manager' && a.status === 'manager_review') return true;
      return false;
    });
  }

  const enriched = approvals.map(a => {
    const submitter = db.getById('users', a.submitted_by);
    const project = a.project_id ? db.getById('projects', a.project_id) : null;
    return { ...a, submitter_name: submitter?.display_name || '', project_name: project?.name || '', status_label: STATUS_LABELS[a.status] || a.status };
  }).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  res.json(enriched);
});

// GET /api/approvals/stats — 統計
router.get('/stats', auth, (req, res) => {
  const all = db.getAll('approvals');
  res.json({
    total: all.length,
    pending: all.filter(a => ['submitted', 'manager_review', 'gm_review'].includes(a.status)).length,
    approved: all.filter(a => a.status === 'approved').length,
    rejected: all.filter(a => a.status === 'rejected').length,
    my_submitted: all.filter(a => a.submitted_by === req.user.id).length,
  });
});

// POST /api/approvals — 提交審批
router.post('/', auth, (req, res) => {
  const { type, title, description, amount, project_id, entity_type, entity_id, attachments } = req.body;
  if (!title || !type) return res.status(400).json({ error: '缺少審批類型或標題' });

  const approval = db.insert('approvals', {
    id: uuidv4(),
    approval_number: `AP-${new Date().getFullYear()}-${String(db.getAll('approvals').length + 1).padStart(4, '0')}`,
    type, // purchase_order, quotation, expense, contract
    title, description: description || '', amount: amount || 0,
    project_id: project_id || null, entity_type: entity_type || null, entity_id: entity_id || null,
    attachments: attachments || [],
    status: 'submitted', submitted_by: req.user.id,
    history: [{ action: 'submit', user_id: req.user.id, timestamp: new Date().toISOString(), comment: '提交審批' }]
  });

  logActivity(db, project_id, req.user.id, 'submit_approval', `提交審批 ${approval.approval_number} - ${title}`);

  // 發送通知給主管們
  const managers = db.find('users', u => u.role === 'manager' || u.role === 'admin');
  managers.forEach(m => {
    db.insert('notifications', {
      id: uuidv4(), user_id: m.id, title: '📋 新審批待處理',
      message: `${req.user.display_name} 提交了「${title}」審批`, type: 'approval',
      link: `/approvals`, read: false
    });
  });

  res.status(201).json(approval);
});

// PUT /api/approvals/:id/approve — 核准
router.put('/:id/approve', auth, (req, res) => {
  const approval = db.getById('approvals', req.params.id);
  if (!approval) return res.status(404).json({ error: '審批不存在' });

  const { comment } = req.body || {};
  const nextStatus = STATUS_FLOW[approval.status];
  if (!nextStatus) return res.status(400).json({ error: '無法推進此審批' });

  // 權限檢查
  if (approval.status === 'manager_review' && req.user.role !== 'manager' && req.user.role !== 'admin') {
    return res.status(403).json({ error: '需要主管權限' });
  }
  if (approval.status === 'gm_review' && req.user.role !== 'admin') {
    return res.status(403).json({ error: '需要管理員權限' });
  }

  const history = [...(approval.history || []), {
    action: 'approve', user_id: req.user.id, user_name: req.user.display_name,
    from_status: approval.status, to_status: nextStatus,
    comment: comment || '核准', timestamp: new Date().toISOString()
  }];

  const updated = db.update('approvals', req.params.id, { status: nextStatus, history });

  // 通知提交者
  db.insert('notifications', {
    id: uuidv4(), user_id: approval.submitted_by, title: nextStatus === 'approved' ? '✅ 審批已通過' : '📋 審批進展',
    message: `「${approval.title}」${STATUS_LABELS[nextStatus]}`, type: 'approval', link: '/approvals', read: false
  });

  logActivity(db, approval.project_id, req.user.id, 'approve', `核准審批 ${approval.approval_number} → ${STATUS_LABELS[nextStatus]}`);
  res.json(updated);
});

// PUT /api/approvals/:id/reject — 退回
router.put('/:id/reject', auth, (req, res) => {
  const approval = db.getById('approvals', req.params.id);
  if (!approval) return res.status(404).json({ error: '審批不存在' });

  const { comment } = req.body || {};
  const history = [...(approval.history || []), {
    action: 'reject', user_id: req.user.id, user_name: req.user.display_name,
    from_status: approval.status, to_status: 'rejected',
    comment: comment || '退回', timestamp: new Date().toISOString()
  }];

  const updated = db.update('approvals', req.params.id, { status: 'rejected', history });

  db.insert('notifications', {
    id: uuidv4(), user_id: approval.submitted_by, title: '❌ 審批被退回',
    message: `「${approval.title}」已被退回：${comment || '無原因'}`, type: 'approval', link: '/approvals', read: false
  });

  logActivity(db, approval.project_id, req.user.id, 'reject', `退回審批 ${approval.approval_number}`);
  res.json(updated);
});

module.exports = router;
