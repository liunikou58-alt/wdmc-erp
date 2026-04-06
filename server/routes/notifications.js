const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const { auth, requirePermission } = require('../middleware/auth');

const router = express.Router();

// GET /api/notifications
router.get('/', auth, requirePermission('notifications', 'view'),(req, res) => {
  const notifs = db.find('notifications', n => n.user_id === req.user.id || n.user_id === 'all')
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 50);
  res.json(notifs);
});

// GET /api/notifications/unread-count
router.get('/unread-count', auth, requirePermission('notifications', 'view'),(req, res) => {
  const count = db.find('notifications', n => (n.user_id === req.user.id || n.user_id === 'all') && !n.read).length;
  res.json({ count });
});

// PUT /api/notifications/:id/read
router.put('/:id/read', auth, requirePermission('notifications', 'edit'),(req, res) => {
  db.update('notifications', req.params.id, { read: true });
  res.json({ success: true });
});

// PUT /api/notifications/read-all
router.put('/batch/read-all', auth, requirePermission('notifications', 'edit'),(req, res) => {
  const unread = db.find('notifications', n => (n.user_id === req.user.id || n.user_id === 'all') && !n.read);
  unread.forEach(n => db.update('notifications', n.id, { read: true }));
  res.json({ success: true, count: unread.length });
});

// 系統內部：發送通知
router.sendNotification = function(userId, title, message, type = 'info', link = '') {
  db.insert('notifications', { id: uuidv4(), user_id: userId, title, message, type, link, read: false });
};

module.exports = router;
