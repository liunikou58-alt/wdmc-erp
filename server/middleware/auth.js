/**
 * WDMC-ERP — Auth 中介層（升級版）
 * 使用共用 RBAC 模組
 */
const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'wdmc-erp-secret-2026';

const { createRBAC } = require('../../../shared/rbac-middleware');
const { hasRoleLevel } = require('../../../shared/permissions');

function auth(req, res, next) {
  const h = req.headers.authorization;
  if (!h || !h.startsWith('Bearer ')) return res.status(401).json({ error: '未登入' });
  try { req.user = jwt.verify(h.split(' ')[1], JWT_SECRET); next(); }
  catch { return res.status(401).json({ error: 'Token 過期或無效' }); }
}

// 舊版角色檢查（向後相容）
function role(...roles) {
  return (req, res, next) => {
    if (!req.user) return res.status(403).json({ error: '權限不足' });
    // 向後相容：admin 角色請求可由 ceo/director 滿足
    if (roles.includes('admin') && hasRoleLevel(req.user.role, 'director')) return next();
    if (!roles.includes(req.user.role)) return res.status(403).json({ error: '權限不足' });
    next();
  };
}

function logActivity(db, projectId, userId, action, detail) {
  const { v4: uuidv4 } = require('uuid');
  db.insert('activity_logs', { id: uuidv4(), project_id: projectId || null, user_id: userId, action, detail });
}

// 新版 RBAC
const { requirePermission, requireMinRole } = createRBAC('erp');

module.exports = { auth, role, JWT_SECRET, logActivity, requirePermission, requireMinRole };
