const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const { auth, logActivity, requirePermission } = require('../middleware/auth');

const router = express.Router();

// GET /api/customers — 支援分類篩選 + 搜尋 + 等級篩選
router.get('/', auth, requirePermission('customers', 'view'),(req, res) => {
  const { company_type, q, customer_level } = req.query;
  let customers = db.getAll('customers').sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  // 分類篩選（政府/商業/同業）
  if (company_type) customers = customers.filter(c => c.company_type === company_type);
  // 等級篩選
  if (customer_level) customers = customers.filter(c => c.customer_level === customer_level);
  // 關鍵字搜尋
  if (q) {
    const kw = q.toLowerCase();
    customers = customers.filter(c =>
      (c.name || '').toLowerCase().includes(kw) ||
      (c.contact_person || '').toLowerCase().includes(kw) ||
      (c.phone || '').includes(kw) ||
      (c.email || '').toLowerCase().includes(kw) ||
      (c.tax_id || '').includes(kw)
    );
  }

  // 附加統計
  const enriched = customers.map(c => {
    const cases = db.find('customer_cases', cs => cs.customer_id === c.id);
    const projects = db.find('projects', p => p.customer_id === c.id);
    const contracts = db.find('contracts', ct => ct.customer_id === c.id);
    const proposals = db.find('proposals', pr => pr.customer_id === c.id);
    return {
      ...c,
      case_count: cases.length,
      project_count: projects.length,
      contract_count: contracts.length,
      proposal_count: proposals.length,
    };
  });
  res.json(enriched);
});

// GET /api/customers/stats — 客戶統計
router.get('/stats', auth, requirePermission('customers', 'view'),(req, res) => {
  const all = db.getAll('customers');
  res.json({
    total: all.length,
    government: all.filter(c => c.company_type === 'government').length,
    corporate: all.filter(c => c.company_type === 'corporate').length,
    peer: all.filter(c => c.company_type === 'peer').length,
    vvip: all.filter(c => c.customer_level === 'VVIP').length,
    vip: all.filter(c => c.customer_level === 'VIP').length,
    normal: all.filter(c => !c.customer_level || c.customer_level === '一般').length,
  });
});

// GET /api/customers/:id — 客戶詳情 (含所有關聯文件)
router.get('/:id', auth, requirePermission('customers', 'view'),(req, res) => {
  const c = db.getById('customers', req.params.id);
  if (!c) return res.status(404).json({ error: '客戶不存在' });
  const cases = db.find('customer_cases', cs => cs.customer_id === c.id);
  const projects = db.find('projects', p => p.customer_id === c.id);
  const contracts = db.find('contracts', ct => ct.customer_id === c.id);
  const proposals = db.find('proposals', pr => pr.customer_id === c.id);
  const events = db.find('events', ev => ev.customer_id === c.id);
  res.json({ ...c, cases, projects, contracts, proposals, events });
});

// GET /api/customers/:id/yearly-stats — 客戶年度統計
router.get('/:id/yearly-stats', auth, requirePermission('customers', 'view'), (req, res) => {
  const c = db.getById('customers', req.params.id);
  if (!c) return res.status(404).json({ error: '客戶不存在' });

  const year = parseInt(req.query.year) || new Date().getFullYear();

  const yearStart = `${year}-01-01`;
  const yearEnd = `${year}-12-31`;
  const inYear = (dateStr) => dateStr && dateStr >= yearStart && dateStr <= yearEnd;

  // 抓取所有該客戶的關聯資料
  const allCases = db.find('customer_cases', cs => cs.customer_id === c.id);
  const allProposals = db.find('proposals', p => p.customer_id === c.id);
  const allContracts = db.find('contracts', ct => ct.customer_id === c.id);
  const allProjects = db.find('projects', p => p.customer_id === c.id);
  const allEvents = db.find('events', e => e.customer_id === c.id);

  // 依年度篩選
  const cases = allCases.filter(cs => inYear(cs.created_at?.slice(0,10) || cs.event_date));
  const proposals = allProposals.filter(p => inYear(p.created_at?.slice(0,10) || p.event_date));
  const contracts = allContracts.filter(ct => inYear(ct.created_at?.slice(0,10) || ct.start_date));
  const projects = allProjects.filter(p => inYear(p.created_at?.slice(0,10) || p.deadline));
  const events = allEvents.filter(e => inYear((e.event_date || e.created_at || '').slice(0,10)));

  // 年度統計摘要
  const totalRevenue = contracts.reduce((s, ct) => s + (Number(ct.amount) || Number(ct.total_amount) || 0), 0);
  const totalQuoteAmt = proposals.reduce((s, p) => s + (p.total_with_tax || p.total_amount || 0), 0);
  const wonCount = proposals.filter(p => p.status === 'won' || p.status === 'converted').length;
  const lostCount = proposals.filter(p => p.status === 'lost' || p.status === 'rejected').length;
  const winRate = (wonCount + lostCount) > 0 ? Math.round(wonCount / (wonCount + lostCount) * 100) : 0;

  // 月度拆解
  const monthly = [];
  for (let m = 1; m <= 12; m++) {
    const ms = String(m).padStart(2, '0');
    const mStart = `${year}-${ms}-01`;
    const mEnd = `${year}-${ms}-31`;
    const inMonth = (d) => d && d >= mStart && d <= mEnd;

    const mCases = cases.filter(cs => inMonth(cs.created_at?.slice(0,10) || cs.event_date));
    const mProposals = proposals.filter(p => inMonth(p.created_at?.slice(0,10) || p.event_date));
    const mContracts = contracts.filter(ct => inMonth(ct.created_at?.slice(0,10) || ct.start_date));
    const mEvents = events.filter(e => inMonth((e.event_date || e.created_at || '').slice(0,10)));
    const mRevenue = mContracts.reduce((s, ct) => s + (Number(ct.amount) || Number(ct.total_amount) || 0), 0);

    if (mCases.length || mProposals.length || mContracts.length || mEvents.length) {
      monthly.push({
        month: m,
        cases: mCases,
        proposals: mProposals,
        contracts: mContracts,
        events: mEvents,
        revenue: mRevenue,
      });
    }
  }

  // 偵測所有有資料的年份
  const allDates = [
    ...allCases.map(cs => cs.created_at || cs.event_date),
    ...allProposals.map(p => p.created_at || p.event_date),
    ...allContracts.map(ct => ct.created_at || ct.start_date),
    ...allProjects.map(p => p.created_at || p.deadline),
    ...allEvents.map(e => e.event_date || e.created_at),
  ].filter(Boolean).map(d => parseInt(d.slice(0, 4)));
  const available_years = [...new Set(allDates)].sort((a, b) => b - a);
  // 確保當前年度在列表中
  if (!available_years.includes(year)) available_years.unshift(year);
  if (!available_years.includes(new Date().getFullYear())) available_years.unshift(new Date().getFullYear());
  available_years.sort((a, b) => b - a);

  res.json({
    year,
    summary: {
      total_cases: cases.length,
      total_proposals: proposals.length,
      total_contracts: contracts.length,
      total_projects: projects.length,
      total_events: events.length,
      total_revenue: totalRevenue,
      total_quote_amount: totalQuoteAmt,
      won_count: wonCount,
      lost_count: lostCount,
      win_rate: winRate,
    },
    monthly_breakdown: monthly,
    available_years: [...new Set(available_years)],
    // 完整資料供前端使用
    cases,
    proposals,
    contracts,
    projects,
    events,
  });
});

// POST /api/customers
router.post('/', auth, requirePermission('customers', 'create'),(req, res) => {
  const { name, contact_person, phone, email, address, category, notes, tax_id,
          company_type, customer_level, website, fax, industry } = req.body;
  if (!name) return res.status(400).json({ error: '缺少客戶名稱' });
  // 統一編號防重複
  if (tax_id && tax_id.trim()) {
    const existing = db.find('customers', c => c.tax_id === tax_id.trim());
    if (existing.length > 0) {
      return res.status(400).json({ error: `統一編號 ${tax_id} 已存在，客戶「${existing[0].name}」已使用此統編` });
    }
  }
  const customer = db.insert('customers', {
    id: uuidv4(), name, contact_person: contact_person || '', phone: phone || '',
    email: email || '', address: address || '', category: category || 'corporate',
    tax_id: tax_id || '', company_type: company_type || 'corporate',
    customer_level: customer_level || '一般',
    website: website || '', fax: fax || '', industry: industry || '',
    notes: notes || '', status: 'active', created_by: req.user.id
  });
  logActivity(db, null, req.user.id, 'create_customer', `新增客戶 ${name}`);
  res.status(201).json(customer);
});

// PUT /api/customers/:id
router.put('/:id', auth, requirePermission('customers', 'edit'),(req, res) => {
  const updated = db.update('customers', req.params.id, req.body);
  if (!updated) return res.status(404).json({ error: '客戶不存在' });
  res.json(updated);
});

// DELETE /api/customers/:id
router.delete('/:id', auth, requirePermission('customers', 'delete'),(req, res) => {
  db.remove('customers', req.params.id);
  res.json({ success: true });
});

// === 客戶案件 ===
// GET /api/customers/:customerId/cases
router.get('/:customerId/cases', auth, requirePermission('customers', 'view'),(req, res) => {
  const cases = db.find('customer_cases', c => c.customer_id === req.params.customerId)
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  res.json(cases);
});

// POST /api/customers/:customerId/cases
router.post('/:customerId/cases', auth, requirePermission('customers', 'create'),(req, res) => {
  const { title, description, event_date, budget, requirements } = req.body;
  const cs = db.insert('customer_cases', {
    id: uuidv4(), customer_id: req.params.customerId,
    title: title || '', description: description || '',
    event_date: event_date || '', budget: budget || 0,
    requirements: requirements || '', status: 'inquiry',
    created_by: req.user.id
  });
  logActivity(db, null, req.user.id, 'create_case', `新增案件 ${title}`);
  res.status(201).json(cs);
});

// PUT /api/customers/:customerId/cases/:caseId
router.put('/:customerId/cases/:caseId', auth, requirePermission('customers', 'edit'),(req, res) => {
  const updated = db.update('customer_cases', req.params.caseId, req.body);
  if (!updated) return res.status(404).json({ error: '案件不存在' });
  res.json(updated);
});

module.exports = router;
