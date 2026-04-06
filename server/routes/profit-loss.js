/**
 * 活動損益表 API
 * 
 * 核心功能：
 * 1. 活動損益 CRUD（含會計/執行雙視圖）
 * 2. 執行明細子表（類別/報價/成本/利潤）
 * 3. 訂金/尾款/發票追蹤
 * 4. 跨表自動連結（報價→損益、勞報→損益、採購→損益）
 * 5. KPI 統計（毛利率、結案率、獎金）
 */
const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const { auth, requirePermission } = require('../middleware/auth');
const router = express.Router();

/* ═══ 活動損益表 CRUD ═══ */

// GET /api/profit-loss — 列表
router.get('/', auth, requirePermission('profit_loss', 'view'),(req, res) => {
  const { status, type, search, view } = req.query;
  let items = db.getAll('profit_loss');
  if (status && status !== 'all') items = items.filter(i => i.is_closed === (status === 'closed'));
  if (type && type !== 'all') items = items.filter(i => i.event_type === type);
  if (search) {
    const q = search.toLowerCase();
    items = items.filter(i => (i.event_name || '').toLowerCase().includes(q) || (i.manager || '').toLowerCase().includes(q));
  }

  // 動態計算每筆的明細彙總
  const enriched = items.map(pl => {
    const details = db.find('profit_loss_details', d => d.profit_loss_id === pl.id);
    const laborCost = db.find('labor_reports', lr => lr.project_id === pl.project_id)
      .reduce((s, lr) => s + (lr.total_amount || 0), 0);
    const purchaseCost = db.find('purchase_orders', po => po.event_name === pl.event_name || po.project_id === pl.project_id)
      .reduce((s, po) => s + (po.amount || 0), 0);

    const totalQuote = details.reduce((s, d) => s + (d.quote_total || 0), 0) + (pl.quote_amount || 0);
    const totalCost = details.reduce((s, d) => s + (d.cost_total || 0), 0) + laborCost + purchaseCost + (pl.petty_cash || 0);
    const profit = (pl.settlement_amount || totalQuote) - totalCost;
    const margin = (pl.settlement_amount || totalQuote) > 0 ? (profit / (pl.settlement_amount || totalQuote) * 100) : 0;

    return {
      ...pl,
      detail_count: details.length,
      labor_cost: laborCost,
      purchase_cost: purchaseCost,
      total_quote: totalQuote,
      total_cost: totalCost,
      profit,
      margin: Math.round(margin * 100) / 100,
    };
  });

  res.json(enriched.sort((a, b) => new Date(b.event_start_date || b.created_at) - new Date(a.event_start_date || a.created_at)));
});

// GET /api/profit-loss/stats — KPI 統計
router.get('/stats', auth, requirePermission('profit_loss', 'view'),(req, res) => {
  const items = db.getAll('profit_loss');
  const details = db.getAll('profit_loss_details');
  const totalQuote = items.reduce((s, i) => s + (i.quote_amount || 0), 0);
  const totalSettlement = items.reduce((s, i) => s + (i.settlement_amount || 0), 0);
  const totalCost = details.reduce((s, d) => s + (d.cost_total || 0), 0);
  const closed = items.filter(i => i.is_closed);
  const active = items.filter(i => !i.is_closed);

  res.json({
    total_events: items.length,
    active_events: active.length,
    closed_events: closed.length,
    total_quote: totalQuote,
    total_settlement: totalSettlement,
    total_cost: totalCost,
    total_profit: totalSettlement - totalCost,
    avg_margin: totalSettlement > 0 ? Math.round((totalSettlement - totalCost) / totalSettlement * 10000) / 100 : 0,
    total_deposit: items.reduce((s, i) => s + (i.deposit_amount || 0), 0),
    total_final_payment: items.reduce((s, i) => s + (i.final_payment_amount || 0), 0),
  });
});

// GET /api/profit-loss/:id — 單筆含明細
router.get('/:id', auth, requirePermission('profit_loss', 'view'),(req, res) => {
  const pl = db.getById('profit_loss', req.params.id);
  if (!pl) return res.status(404).json({ error: '找不到此損益表' });
  const details = db.find('profit_loss_details', d => d.profit_loss_id === pl.id);
  const subDetails = db.find('profit_loss_sub_details', d => d.profit_loss_id === pl.id);
  res.json({ ...pl, details, sub_details: subDetails });
});

// POST /api/profit-loss — 新增
router.post('/', auth, requirePermission('profit_loss', 'create'),(req, res) => {
  const id = uuidv4();
  const pl = db.insert('profit_loss', {
    id,
    pl_no: `PJM-${String(db.getAll('profit_loss').length + 1).padStart(6, '0')}`,
    ...req.body,
    is_closed: false,
    created_by: req.user.id,
  });
  res.status(201).json(pl);
});

// PUT /api/profit-loss/:id — 更新
router.put('/:id', auth, requirePermission('profit_loss', 'edit'),(req, res) => {
  const updated = db.update('profit_loss', req.params.id, req.body);
  if (!updated) return res.status(404).json({ error: '找不到此損益表' });
  res.json(updated);
});

// DELETE /api/profit-loss/:id
router.delete('/:id', auth, requirePermission('profit_loss', 'delete'),(req, res) => {
  // 刪除子表
  db.removeWhere('profit_loss_details', d => d.profit_loss_id === req.params.id);
  db.removeWhere('profit_loss_sub_details', d => d.profit_loss_id === req.params.id);
  db.remove('profit_loss', req.params.id);
  res.json({ success: true });
});

/* ═══ 執行明細 CRUD ═══ */

router.get('/:id/details', auth, requirePermission('profit_loss', 'view'),(req, res) => {
  res.json(db.find('profit_loss_details', d => d.profit_loss_id === req.params.id));
});

router.post('/:id/details', auth, requirePermission('profit_loss', 'create'),(req, res) => {
  const detail = db.insert('profit_loss_details', {
    id: uuidv4(),
    profit_loss_id: req.params.id,
    ...req.body,
  });
  res.status(201).json(detail);
});

router.put('/details/:detailId', auth, requirePermission('profit_loss', 'edit'),(req, res) => {
  res.json(db.update('profit_loss_details', req.params.detailId, req.body));
});

router.delete('/details/:detailId', auth, requirePermission('profit_loss', 'delete'),(req, res) => {
  db.remove('profit_loss_details', req.params.detailId);
  res.json({ success: true });
});

/* ═══ 跨表連結引擎 ═══ */

// POST /api/profit-loss/link/from-proposal/:proposalId
// 從報價單自動建立損益表
router.post('/link/from-proposal/:proposalId', auth, requirePermission('profit_loss', 'create'),(req, res) => {
  const proposal = db.getById('proposals', req.params.proposalId);
  if (!proposal) return res.status(404).json({ error: '報價單不存在' });

  const plId = uuidv4();
  const pl = db.insert('profit_loss', {
    id: plId,
    pl_no: `PJM-${String(db.getAll('profit_loss').length + 1).padStart(6, '0')}`,
    event_name: proposal.name || proposal.title,
    event_type: proposal.event_type || '活動',
    event_start_date: proposal.event_date,
    quote_amount: proposal.total_amount || proposal.amount || 0,
    manager: proposal.pm || proposal.created_by_name || '',
    proposal_id: proposal.id,
    project_id: proposal.project_id,
    customer_name: proposal.customer_name || '',
    is_closed: false,
    created_by: req.user.id,
  });

  // 帶入報價明細
  const qItems = db.find('quotation_items', qi => qi.proposal_id === proposal.id);
  qItems.forEach(qi => {
    db.insert('profit_loss_details', {
      id: uuidv4(),
      profit_loss_id: plId,
      category: qi.category || '其他',
      item_name: qi.item || qi.name,
      qty: qi.qty || 1,
      unit_quote: qi.unit_price || 0,
      quote_total: qi.amount || 0,
      unit_cost: 0,
      cost_total: 0,
    });
  });

  res.status(201).json(pl);
});

// POST /api/profit-loss/:id/link/labor — 匯入勞報成本
router.post('/:id/link/labor', auth, requirePermission('profit_loss', 'create'),(req, res) => {
  const pl = db.getById('profit_loss', req.params.id);
  if (!pl) return res.status(404).json({ error: '損益表不存在' });

  const laborReports = db.find('labor_reports', lr => lr.project_id === pl.project_id || lr.event_name === pl.event_name);
  const totalLabor = laborReports.reduce((s, lr) => s + (lr.total_amount || 0), 0);
  const workerCount = laborReports.reduce((s, lr) => s + (lr.worker_count || 0), 0);

  db.update('profit_loss', pl.id, {
    labor_cost: totalLabor,
    labor_count: workerCount,
    labor_imported: true,
  });

  res.json({ imported: laborReports.length, total_cost: totalLabor, worker_count: workerCount });
});

// POST /api/profit-loss/:id/link/purchase — 匯入採購成本
router.post('/:id/link/purchase', auth, requirePermission('profit_loss', 'create'),(req, res) => {
  const pl = db.getById('profit_loss', req.params.id);
  if (!pl) return res.status(404).json({ error: '損益表不存在' });

  const pos = db.find('purchase_orders', po => po.event_name === pl.event_name || po.project_id === pl.project_id);
  const totalPO = pos.reduce((s, po) => s + (po.amount || 0), 0);

  db.update('profit_loss', pl.id, {
    purchase_cost: totalPO,
    purchase_imported: true,
  });

  res.json({ imported: pos.length, total_cost: totalPO });
});

module.exports = router;
