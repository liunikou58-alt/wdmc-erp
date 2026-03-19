const express = require('express');
const db = require('../db');
const { auth } = require('../middleware/auth');

const router = express.Router();

// GET /api/bi/overview — 營運總覽
router.get('/overview', auth, (req, res) => {
  const projects = db.getAll('projects');
  const customers = db.getAll('customers');
  const revenues = db.getAll('revenues');
  const expenses = db.getAll('expenses');
  const proposals = db.getAll('proposals');
  const pos = db.getAll('purchase_orders');

  const totalRevenue = revenues.reduce((s, r) => s + (r.amount || 0), 0);
  const totalExpense = expenses.reduce((s, e) => s + (e.amount || 0), 0);

  res.json({
    projects: { total: projects.length, active: projects.filter(p => p.status === 'in_progress').length, completed: projects.filter(p => p.status === 'completed').length },
    customers: { total: customers.length },
    proposals: { total: proposals.length, converted: proposals.filter(p => p.status === 'converted').length, conversionRate: proposals.length ? Math.round((proposals.filter(p => p.status === 'converted').length / proposals.length) * 100) : 0 },
    finance: { totalRevenue, totalExpense, profit: totalRevenue - totalExpense, profitMargin: totalRevenue ? Math.round(((totalRevenue - totalExpense) / totalRevenue) * 100) : 0 },
    procurement: { totalPOs: pos.length, pendingPOs: pos.filter(po => po.status === 'pending').length, totalPOAmount: pos.reduce((s, po) => s + (po.total || 0), 0) }
  });
});

// GET /api/bi/project-analysis — 專案分析
router.get('/project-analysis', auth, (req, res) => {
  const projects = db.getAll('projects');
  const byStatus = {};
  projects.forEach(p => { byStatus[p.status] = (byStatus[p.status] || 0) + 1; });

  const byType = {};
  projects.forEach(p => { const t = p.event_type || '未分類'; byType[t] = (byType[t] || 0) + 1; });

  const projectDetails = projects.map(p => {
    const tasks = db.find('project_tasks', t => t.project_id === p.id);
    const done = tasks.filter(t => t.status === 'done').length;
    const revenues = db.find('revenues', r => r.project_id === p.id).reduce((s, r) => s + (r.amount || 0), 0);
    const expenses = db.find('expenses', e => e.project_id === p.id).reduce((s, e) => s + (e.amount || 0), 0);
    return { id: p.id, name: p.name, status: p.status, event_type: p.event_type, budget: p.budget || 0, revenue: revenues, expense: expenses, profit: revenues - expenses, progress: tasks.length ? Math.round((done / tasks.length) * 100) : 0 };
  });

  res.json({ byStatus, byType, projects: projectDetails });
});

// GET /api/bi/customer-analysis — 客戶分析
router.get('/customer-analysis', auth, (req, res) => {
  const customers = db.getAll('customers');
  const customerDetails = customers.map(c => {
    const projects = db.find('projects', p => p.customer_id === c.id);
    const revenues = db.find('revenues', r => r.customer_id === c.id).reduce((s, r) => s + (r.amount || 0), 0);
    return { id: c.id, name: c.name, project_count: projects.length, total_revenue: revenues, category: c.category || '', created_at: c.created_at };
  }).sort((a, b) => b.total_revenue - a.total_revenue);
  res.json(customerDetails);
});

// GET /api/bi/revenue-analysis — 收入分析（按月）
router.get('/revenue-analysis', auth, (req, res) => {
  const revenues = db.getAll('revenues');
  const expenses = db.getAll('expenses');
  const monthly = {};

  revenues.forEach(r => {
    const m = (r.payment_date || r.created_at || '').substring(0, 7) || 'unknown';
    if (!monthly[m]) monthly[m] = { month: m, revenue: 0, expense: 0 };
    monthly[m].revenue += r.amount || 0;
  });
  expenses.forEach(e => {
    const m = (e.payment_date || e.created_at || '').substring(0, 7) || 'unknown';
    if (!monthly[m]) monthly[m] = { month: m, revenue: 0, expense: 0 };
    monthly[m].expense += e.amount || 0;
  });

  const sorted = Object.values(monthly).sort((a, b) => a.month.localeCompare(b.month)).map(m => ({ ...m, profit: m.revenue - m.expense }));
  res.json(sorted);
});

// GET /api/bi/department-analysis — 部門績效
router.get('/department-analysis', auth, (req, res) => {
  const departments = db.getAll('departments');
  const tasks = db.getAll('project_tasks');

  const deptPerf = departments.map(d => {
    const deptTasks = tasks.filter(t => t.department_id === d.id);
    const done = deptTasks.filter(t => t.status === 'done').length;
    return { id: d.id, name: d.name, icon: d.icon, total_tasks: deptTasks.length, done_tasks: done, completion_rate: deptTasks.length ? Math.round((done / deptTasks.length) * 100) : 0 };
  }).filter(d => d.total_tasks > 0).sort((a, b) => b.completion_rate - a.completion_rate);

  res.json(deptPerf);
});

module.exports = router;
