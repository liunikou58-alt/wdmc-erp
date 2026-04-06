/**
 * 全系統跨模組搜尋 API (FR-CP04)
 * 
 * 支援搜尋：專案、客戶、報價單、合約、活動、檔案、知識庫
 */
const express = require('express');
const db = require('../db');
const { auth } = require('../middleware/auth');

const router = express.Router();

// GET /api/search?q=keyword
router.get('/', auth, (req, res) => {
  const q = (req.query.q || '').toLowerCase().trim();
  if (!q || q.length < 2) return res.json({ results: [], total: 0 });

  const limit = parseInt(req.query.limit) || 20;
  const results = [];

  // 搜尋客戶
  db.getAll('customers').forEach(c => {
    const text = [c.name, c.contact_person, c.phone, c.email, c.tax_id, c.address].join(' ').toLowerCase();
    if (text.includes(q)) results.push({ type: 'customer', id: c.id, title: c.name, subtitle: `${c.company_type === 'government' ? '🏛️ 政府' : '💼 商業'} · ${c.contact_person || ''}`, url: `/customers/${c.id}`, date: c.created_at });
  });

  // 搜尋專案
  db.getAll('projects').forEach(p => {
    const text = [p.name, p.event_type, p.description, p.notes].join(' ').toLowerCase();
    if (text.includes(q)) {
      const cust = p.customer_id ? db.getById('customers', p.customer_id) : null;
      results.push({ type: 'project', id: p.id, title: p.name, subtitle: `📁 ${p.status || 'planning'} · ${cust?.name || ''}`, url: `/projects/${p.id}`, date: p.created_at });
    }
  });

  // 搜尋報價單
  db.getAll('proposals').forEach(p => {
    const text = [p.title, p.event_type, p.contact_name, p.notes, p.event_location].join(' ').toLowerCase();
    if (text.includes(q)) {
      const cust = p.customer_id ? db.getById('customers', p.customer_id) : null;
      results.push({ type: 'proposal', id: p.id, title: p.title, subtitle: `📝 ${p.status || 'draft'} · ${cust?.name || ''} · $${(p.total_with_tax || 0).toLocaleString()}`, url: '/proposals', date: p.created_at });
    }
  });

  // 搜尋合約
  db.getAll('contracts').forEach(c => {
    const text = [c.title, c.name, c.contract_number, c.contract_no, c.notes].join(' ').toLowerCase();
    if (text.includes(q)) {
      const cust = c.customer_id ? db.getById('customers', c.customer_id) : null;
      results.push({ type: 'contract', id: c.id, title: c.title || c.name, subtitle: `📃 ${c.status || 'draft'} · ${cust?.name || ''}`, url: '/contracts', date: c.created_at });
    }
  });

  // 搜尋活動
  db.getAll('events').forEach(e => {
    const text = [e.name, e.event_no, e.venue, e.description, e.notes].join(' ').toLowerCase();
    if (text.includes(q)) {
      results.push({ type: 'event', id: e.id, title: e.name, subtitle: `🎪 ${e.event_date || ''} · $${(e.quote_amount || 0).toLocaleString()}`, url: '/events', date: e.event_date || e.created_at });
    }
  });

  // 搜尋檔案
  db.getAll('files').forEach(f => {
    const text = [f.original_name, f.description, f.category].join(' ').toLowerCase();
    if (text.includes(q)) results.push({ type: 'file', id: f.id, title: f.original_name, subtitle: `📂 ${f.category || 'general'} · ${(f.size / 1024).toFixed(0)}KB`, url: '/files', date: f.created_at });
  });

  // 搜尋知識庫
  db.getAll('knowledge').forEach(k => {
    const text = [k.title, k.content, k.category].join(' ').toLowerCase();
    if (text.includes(q)) results.push({ type: 'knowledge', id: k.id, title: k.title, subtitle: `📚 ${k.category || ''}`, url: '/knowledge', date: k.created_at });
  });

  // 搜尋廠商
  db.getAll('vendors').forEach(v => {
    const text = [v.name, v.contact, v.phone, v.email, v.category].join(' ').toLowerCase();
    if (text.includes(q)) results.push({ type: 'vendor', id: v.id, title: v.name, subtitle: `📦 ${v.category || ''} · ${v.contact || ''}`, url: '/vendors', date: v.created_at });
  });

  // 搜尋員工
  db.getAll('users').forEach(u => {
    const text = [u.display_name, u.username, u.email, u.department_name].join(' ').toLowerCase();
    if (text.includes(q)) results.push({ type: 'user', id: u.id, title: u.display_name, subtitle: `👤 ${u.department_name || ''} · ${u.role || ''}`, url: '/admin', date: u.created_at });
  });

  // 排序：最近的在前
  results.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));

  res.json({ results: results.slice(0, limit), total: results.length, query: q });
});

module.exports = router;
