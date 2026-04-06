const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const { auth, logActivity } = require('../middleware/auth');

const router = express.Router();

// GET /api/daily-reports
router.get('/', auth, (req, res) => {
  const { month, mode } = req.query;
  let reports = db.getAll('daily_reports');

  if (month) {
    reports = reports.filter(r => r.date && r.date.startsWith(month));
  }

  if (mode !== 'team') {
    reports = reports.filter(r => r.user_id === req.user.id);
  }

  // Enrich with user name
  const users = db.getAll('users');
  reports = reports.map(r => ({
    ...r,
    user_name: (users.find(u => u.id === r.user_id) || {}).display_name || '?',
  }));

  // Stats: count work days in month that are missing reports
  let missing = 0;
  let total = reports.filter(r => r.user_id === req.user.id).length;
  let teamStats = [];

  if (month) {
    const [y, m] = month.split('-').map(Number);
    const now = new Date();
    const daysInMonth = new Date(y, m, 0).getDate();
    const maxDay = (y === now.getFullYear() && m === now.getMonth() + 1) ? now.getDate() : daysInMonth;
    // 台灣國定假日（MM-DD 格式）
    const TW_HOLIDAYS = ['01-01','01-02','02-28','04-04','04-05','05-01','10-10'];
    
    const calculateMissingForUser = (userId) => {
      let mCount = 0;
      let missedDays = [];
      const leaves = db.find('attendance', a => a.user_id === userId && a.status === 'approved');
      for (let d = 1; d <= maxDay; d++) {
        const date = `${month}-${String(d).padStart(2, '0')}`;
        const dow = new Date(y, m - 1, d).getDay();
        if (dow === 0 || dow === 6) continue; // skip weekends
        if (TW_HOLIDAYS.includes(date.slice(5))) continue; // skip holidays
        // skip approved leave days
        if (leaves.some(l => l.start_date <= date && (l.end_date || l.start_date) >= date)) continue;
        const hasReport = db.find('daily_reports', r => r.date === date && r.user_id === userId).length > 0;
        if (!hasReport) {
          mCount++;
          missedDays.push(date);
        }
      }
      return { mCount, missedDays };
    };

    // Current user missing
    const myStats = calculateMissingForUser(req.user.id);
    missing = myStats.mCount;

    // Team missing
    if (mode === 'team') {
      users.forEach(u => {
        const span = calculateMissingForUser(u.id);
        if (span.mCount > 0) {
          teamStats.push({
            user_id: u.id,
            user_name: u.display_name,
            missingCount: span.mCount,
            missedDays: span.missedDays
          });
        }
      });
      // Sort by most missing
      teamStats.sort((a,b) => b.missingCount - a.missingCount);
    }
  }

  res.json({ reports, stats: { total, missing, teamStats } });
});

// GET /api/daily-reports/:id
router.get('/:id', auth, (req, res) => {
  const r = db.getById('daily_reports', req.params.id);
  if (!r) return res.status(404).json({ error: '會報不存在' });
  res.json(r);
});

// POST /api/daily-reports
router.post('/', auth, (req, res) => {
  const { date, content, tasks_completed, tasks_planned, issues } = req.body;
  if (!date || !content) return res.status(400).json({ error: '日期與內容必填' });

  // Check if already exists for this user+date
  const existing = db.find('daily_reports', r => r.user_id === req.user.id && r.date === date);
  if (existing.length > 0) {
    return res.status(400).json({ error: '該日期已有填報，請使用編輯' });
  }

  const report = db.insert('daily_reports', {
    id: uuidv4(), user_id: req.user.id, date,
    content: content || '', tasks_completed: tasks_completed || '',
    tasks_planned: tasks_planned || '', issues: issues || '',
  });
  logActivity(db, null, req.user.id, 'create_daily_report', `填寫 ${date} 工作會報`);
  res.status(201).json(report);
});

// PUT /api/daily-reports/:id
router.put('/:id', auth, (req, res) => {
  const updated = db.update('daily_reports', req.params.id, req.body);
  if (!updated) return res.status(404).json({ error: '會報不存在' });
  res.json(updated);
});

module.exports = router;
