const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const { auth, logActivity } = require('../middleware/auth');

const router = express.Router();

// GET /api/attendance
router.get('/', auth, (req, res) => {
  const { month } = req.query;
  let records = db.getAll('attendance');

  if (month) {
    records = records.filter(r => r.start_date && r.start_date.startsWith(month));
  }

  // Enrich with user name
  const users = db.getAll('users');
  records = records.map(r => {
    const startD = new Date(r.start_date);
    const endD = new Date(r.end_date || r.start_date);
    const days = Math.max(1, Math.round((endD - startD) / (1000 * 60 * 60 * 24)) + 1);
    return {
      ...r,
      days,
      user_name: (users.find(u => u.id === r.user_id) || {}).display_name || '?',
    };
  });

  res.json(records);
});

// POST /api/attendance
router.post('/', auth, (req, res) => {
  const { type, start_date, end_date, reason } = req.body;
  if (!start_date) return res.status(400).json({ error: '開始日期必填' });

  const record = db.insert('attendance', {
    id: uuidv4(),
    user_id: req.user.id,
    type: type || 'annual',
    start_date,
    end_date: end_date || start_date,
    reason: reason || '',
    status: 'pending',
  });
  logActivity(db, null, req.user.id, 'request_leave', `申請${type === 'annual' ? '特休' : type === 'sick' ? '病假' : '休假'} ${start_date}`);
  res.status(201).json(record);
});

// PUT /api/attendance/:id/approve
router.put('/:id/approve', auth, (req, res) => {
  const updated = db.update('attendance', req.params.id, { status: 'approved', approved_by: req.user.id });
  if (!updated) return res.status(404).json({ error: '紀錄不存在' });
  res.json(updated);
});

// PUT /api/attendance/:id/reject
router.put('/:id/reject', auth, (req, res) => {
  const updated = db.update('attendance', req.params.id, { status: 'rejected', rejected_by: req.user.id });
  if (!updated) return res.status(404).json({ error: '紀錄不存在' });
  res.json(updated);
});

// DELETE /api/attendance/:id
router.delete('/:id', auth, (req, res) => {
  db.remove('attendance', req.params.id);
  res.json({ success: true });
});

module.exports = router;
