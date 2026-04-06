const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const { auth, logActivity } = require('../middleware/auth');

const router = express.Router();

// GET /api/vehicle-bookings
router.get('/', auth, (req, res) => {
  const { start, end } = req.query;
  let bookings = db.getAll('vehicle_bookings');

  if (start && end) {
    bookings = bookings.filter(b => b.date >= start && b.date <= end);
  }

  // Enrich with user name
  const users = db.getAll('users');
  bookings = bookings.map(b => ({
    ...b,
    booked_by_name: (users.find(u => u.id === b.booked_by) || {}).display_name || '?',
  }));

  res.json(bookings);
});

// POST /api/vehicle-bookings
router.post('/', auth, (req, res) => {
  const { vehicle_id, date, time_slot, event_name, destination } = req.body;
  if (!vehicle_id || !date || !time_slot || !event_name) {
    return res.status(400).json({ error: '車輛、日期、時段、活動名稱為必填' });
  }

  // Check conflict
  const conflict = db.find('vehicle_bookings', b =>
    b.vehicle_id === vehicle_id && b.date === date && b.time_slot === time_slot
  );
  if (conflict.length > 0) {
    return res.status(400).json({ error: `${vehicle_id} 在 ${date} ${time_slot === 'morning' ? '上午' : '下午'} 已被預約` });
  }

  const booking = db.insert('vehicle_bookings', {
    id: uuidv4(), vehicle_id, date, time_slot,
    event_name, destination: destination || '',
    booked_by: req.user.id,
    status: 'booked',
  });
  logActivity(db, null, req.user.id, 'book_vehicle', `預約公司車 ${vehicle_id} ${date}`);
  res.status(201).json(booking);
});

// DELETE /api/vehicle-bookings/:id
router.delete('/:id', auth, (req, res) => {
  db.remove('vehicle_bookings', req.params.id);
  res.json({ success: true });
});

module.exports = router;
