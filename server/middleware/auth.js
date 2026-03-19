const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'wdmc-erp-secret-2026';

function auth(req, res, next) {
  const h = req.headers.authorization;
  if (!h || !h.startsWith('Bearer ')) return res.status(401).json({ error: '未登入' });
  try { req.user = jwt.verify(h.split(' ')[1], JWT_SECRET); next(); }
  catch { return res.status(401).json({ error: 'Token 過期或無效' }); }
}

function role(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) return res.status(403).json({ error: '權限不足' });
    next();
  };
}

function logActivity(db, projectId, userId, action, detail) {
  const { v4: uuidv4 } = require('uuid');
  db.insert('activity_logs', { id: uuidv4(), project_id: projectId || null, user_id: userId, action, detail });
}

module.exports = { auth, role, JWT_SECRET, logActivity };
