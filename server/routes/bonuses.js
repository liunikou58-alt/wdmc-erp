/**
 * 獎金制度路由 v3.0
 * 
 * 依據《公司專案利潤共享與獎金分配辦法》正式版實作
 * 
 * P0 核心邏輯：
 * 1. 含稅→未稅轉換（÷ 1.05）
 * 2. 標案（M系列）/ 商業案（C系列）雙軌級距
 * 3. 三類提撥：執行獎金、獎金池、介紹獎金
 * 4. 執行獎金 7:3 分配（主執行/次執行）
 * 5. 獎金池權重計分制（分母保底 MAX(6, 實際總分)）
 * 
 * P1 進階功能：
 * 6. SOP 六階段流程管控（draft → kickoff → executing → review → approved → paid）
 * 7. 10 點積分配分制（核心職能 + 任務矩陣）
 * 8. 結案會議主管核定
 */
const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const { auth, requirePermission } = require('../middleware/auth');

const router = express.Router();

// ═══════════════════════════════════════
// 預設級距表（程式內建，也可從 DB 覆蓋）
// ═══════════════════════════════════════
const DEFAULT_TIERS = {
  // 標案類 M 系列（毛利率門檻 20%）
  bidding: [
    { code: 'M0', min_margin: 0,    max_margin: 0.1999, execution_rate: 0,    pool_rate: 0,    referral_rate: 0 },
    { code: 'M1', min_margin: 0.20,  max_margin: 0.2499, execution_rate: 0.01, pool_rate: 0.02, referral_rate: 0.01 },
    { code: 'M2', min_margin: 0.25,  max_margin: 0.2999, execution_rate: 0.02, pool_rate: 0.03, referral_rate: 0.01 },
    { code: 'M3', min_margin: 0.30,  max_margin: 0.3499, execution_rate: 0.04, pool_rate: 0.04, referral_rate: 0.01 },
    { code: 'M4', min_margin: 0.35,  max_margin: 0.3999, execution_rate: 0.05, pool_rate: 0.05, referral_rate: 0.01 },
    { code: 'M5', min_margin: 0.40,  max_margin: 0.50,   execution_rate: 0.06, pool_rate: 0.06, referral_rate: 0.01 },
    { code: 'M6', min_margin: 0.50,  max_margin: 1.00,   execution_rate: 0.06, pool_rate: 0.06, referral_rate: 0.01 },
  ],
  // 商業案類 C 系列（毛利率門檻 25%）
  commercial: [
    { code: 'C0', min_margin: 0,    max_margin: 0.2499, execution_rate: 0,    pool_rate: 0,    referral_rate: 0 },
    { code: 'C1', min_margin: 0.25,  max_margin: 0.2999, execution_rate: 0.01, pool_rate: 0.02, referral_rate: 0.01 },
    { code: 'C2', min_margin: 0.30,  max_margin: 0.3499, execution_rate: 0.02, pool_rate: 0.03, referral_rate: 0.01 },
    { code: 'C3', min_margin: 0.35,  max_margin: 0.3999, execution_rate: 0.04, pool_rate: 0.04, referral_rate: 0.01 },
    { code: 'C4', min_margin: 0.40,  max_margin: 0.4499, execution_rate: 0.05, pool_rate: 0.05, referral_rate: 0.01 },
    { code: 'C5', min_margin: 0.45,  max_margin: 0.60,   execution_rate: 0.06, pool_rate: 0.06, referral_rate: 0.01 },
    { code: 'C6', min_margin: 0.60,  max_margin: 1.00,   execution_rate: 0.06, pool_rate: 0.06, referral_rate: 0.01 },
  ],
};

// 執行獎金分配比例
const EXECUTION_SPLIT = { primary: 0.7, secondary: 0.3 };

// 稅率（5% 營業稅）
const TAX_RATE = 1.05;

// ═══════════════════════════════════════
// SOP 狀態機定義
// ═══════════════════════════════════════
const SOP_STATES = ['draft', 'kickoff', 'executing', 'review', 'approved', 'paid'];
const SOP_LABELS = {
  draft: '草稿', kickoff: '啟動會議', executing: '執行中',
  review: '結案審查', approved: '已核准', paid: '已發放',
};
const SOP_TRANSITIONS = {
  draft: ['kickoff'],
  kickoff: ['executing'],
  executing: ['review'],
  review: ['approved'],
  approved: ['paid'],
  paid: [],
};
// 需要主管權限的狀態轉換
const SUPERVISOR_TRANSITIONS = ['approved', 'paid'];

// ═══════════════════════════════════════
// 10 點積分制 — 預設配分模板
// ═══════════════════════════════════════
const POINT_TEMPLATE = {
  core: [
    { key: 'budget_control', label: '經費掌控', icon: '📊', min: 0, max: 10, description: '預算規劃、費用控管、結算核對' },
    { key: 'communication', label: '溝通統籌', icon: '📞', min: 0, max: 10, description: '客戶聯繫、團隊協調、進度追蹤' },
    { key: 'planning', label: '企劃深化', icon: '📝', min: 0, max: 10, description: '企劃撰寫、創意發想、流程規劃' },
    { key: 'copywriting', label: '文案產出', icon: '✍️', min: 0, max: 10, description: '文案撰寫、簡報製作、文件整理' },
  ],
  matrix: [
    { key: 'design', label: '設計', icon: '🎨', min: 0, max: 7, description: '主視覺設計、平面/數位素材' },
    { key: 'hardware', label: '硬體', icon: '🔧', min: 0, max: 7, description: '設備架設、場地佈置、技術支援' },
    { key: 'staging', label: '控場', icon: '🎤', min: 0, max: 7, description: '活動現場控場、流程執行' },
    { key: 'other', label: '其他', icon: '📌', min: 0, max: 7, description: '專案特殊需求' },
  ],
  total_points: 10,
};

// ═══════════════════════════════════════
// 工具函式
// ═══════════════════════════════════════

/**
 * 根據毛利率匹配級距
 */
function matchTier(margin, category) {
  // 優先從 DB 讀取自訂級距
  const dbTiers = db.find('bonus_tiers', t => t.category === category);
  const tiers = dbTiers.length > 0
    ? dbTiers.sort((a, b) => a.min_margin - b.min_margin)
    : (DEFAULT_TIERS[category] || DEFAULT_TIERS.bidding);

  // 從高往低匹配
  for (let i = tiers.length - 1; i >= 0; i--) {
    if (margin >= tiers[i].min_margin) return tiers[i];
  }
  return tiers[0]; // M0/C0 無獎金
}

/**
 * 計算獎金
 * @param {number} grossAmount 含稅金額
 * @param {number} totalCost 總成本
 * @param {string} category 'bidding' | 'commercial'
 */
function calculateBonus(grossAmount, totalCost, category = 'bidding') {
  // Step 1: 含稅→未稅
  const netRevenue = Math.round(grossAmount / TAX_RATE);

  // Step 2: 利潤
  const profit = netRevenue - totalCost;
  if (profit <= 0) {
    return {
      net_revenue: netRevenue, total_cost: totalCost, profit: 0,
      margin: 0, margin_pct: '0.00%',
      tier: category === 'bidding' ? { code: 'M0' } : { code: 'C0' },
      execution_bonus: 0, pool_bonus: 0, referral_bonus: 0, total_bonus: 0,
      execution_primary: 0, execution_secondary: 0,
    };
  }

  // Step 3: 毛利率
  const margin = profit / netRevenue;

  // Step 4: 匹配級距
  const tier = matchTier(margin, category);

  // Step 5: 計算三類提撥（以利潤為基數）
  const executionBonus = Math.round(profit * (tier.execution_rate || 0));
  const poolBonus = Math.round(profit * (tier.pool_rate || 0));
  const referralBonus = Math.round(profit * (tier.referral_rate || 0));

  // Step 6: 執行獎金 7:3 分配
  const executionPrimary = Math.round(executionBonus * EXECUTION_SPLIT.primary);
  const executionSecondary = executionBonus - executionPrimary; // 避免四捨五入誤差

  return {
    net_revenue: netRevenue,
    total_cost: totalCost,
    profit,
    margin: Math.round(margin * 10000) / 10000,
    margin_pct: (margin * 100).toFixed(2) + '%',
    tier: {
      code: tier.code,
      execution_rate: tier.execution_rate,
      pool_rate: tier.pool_rate,
      referral_rate: tier.referral_rate,
    },
    execution_bonus: executionBonus,
    execution_primary: executionPrimary,
    execution_secondary: executionSecondary,
    pool_bonus: poolBonus,
    referral_bonus: referralBonus,
    total_bonus: executionBonus + poolBonus + referralBonus,
  };
}

/**
 * 獎金池分配（權重計分制）
 * 分母 = MAX(6, 實際總積分)
 */
function distributePool(poolAmount, roles) {
  if (!roles || roles.length === 0 || poolAmount <= 0) return { allocations: [], company_clawback: poolAmount };

  const totalPoints = roles.reduce((s, r) => s + (r.points || 0), 0);
  const denominator = Math.max(6, totalPoints);

  const allocations = roles.map(r => ({
    role: r.role,
    user_id: r.user_id,
    user_name: r.user_name || '',
    base_points: r.base_points || 1,
    bonus_points: r.bonus_points || 0,
    points: r.points || 0,
    share: Math.round(poolAmount * (r.points || 0) / denominator),
  }));

  const distributed = allocations.reduce((s, a) => s + a.share, 0);
  const companyClawback = poolAmount - distributed;

  return { allocations, denominator, total_points: totalPoints, distributed, company_clawback: companyClawback };
}

// ═══════════════════════════════════════
// API 路由
// ═══════════════════════════════════════

// --- 級距表 ---
// GET /api/bonuses/tiers
router.get('/tiers', auth, requirePermission('bonuses', 'view'), (req, res) => {
  const dbTiers = db.getAll('bonus_tiers');
  if (dbTiers.length > 0) {
    return res.json({
      bidding: dbTiers.filter(t => t.category === 'bidding').sort((a, b) => a.min_margin - b.min_margin),
      commercial: dbTiers.filter(t => t.category === 'commercial').sort((a, b) => a.min_margin - b.min_margin),
    });
  }
  res.json(DEFAULT_TIERS);
});

// POST /api/bonuses/tiers/seed — 初始化級距表到 DB
router.post('/tiers/seed', auth, requirePermission('bonuses', 'create'), (req, res) => {
  // 清除舊的
  db.removeWhere('bonus_tiers', () => true);

  const seeded = [];
  for (const [category, tiers] of Object.entries(DEFAULT_TIERS)) {
    for (const tier of tiers) {
      const record = db.insert('bonus_tiers', {
        id: uuidv4(),
        category,
        ...tier,
      });
      seeded.push(record);
    }
  }
  res.status(201).json({ count: seeded.length, tiers: seeded });
});

// PUT /api/bonuses/tiers/:id — 修改單筆級距
router.put('/tiers/:id', auth, requirePermission('bonuses', 'edit'), (req, res) => {
  const updated = db.update('bonus_tiers', req.params.id, req.body);
  if (!updated) return res.status(404).json({ error: '級距不存在' });
  res.json(updated);
});

// --- 獎金計算 ---
// POST /api/bonuses/calculate
router.post('/calculate', auth, requirePermission('bonuses', 'view'), (req, res) => {
  const { gross_amount, total_cost, category, event_id } = req.body;

  // 如果傳入 event_id，從活動自動帶入金額
  let grossAmt = Number(gross_amount) || 0;
  let costAmt = Number(total_cost) || 0;
  let eventName = '';
  let cat = category || 'bidding';

  if (event_id) {
    const event = db.getById('events', event_id);
    if (!event) return res.status(404).json({ error: '活動不存在' });
    grossAmt = grossAmt || Number(event.quote_amount) || 0;
    costAmt = costAmt || Number(event.cost_amount) || 0;
    eventName = event.name || '';
    cat = event.project_category || event.event_type_category || cat;
  }

  if (grossAmt <= 0) return res.status(400).json({ error: '請提供含稅金額' });

  const result = calculateBonus(grossAmt, costAmt, cat);

  res.json({
    event_id: event_id || null,
    event_name: eventName,
    category: cat,
    gross_amount: grossAmt,
    ...result,
  });
});

// POST /api/bonuses/calculate/pool — 計算獎金池分配
router.post('/calculate/pool', auth, requirePermission('bonuses', 'view'), (req, res) => {
  const { pool_amount, roles } = req.body;
  if (!pool_amount || pool_amount <= 0) return res.status(400).json({ error: '請提供獎金池金額' });
  const result = distributePool(Number(pool_amount), roles || []);
  res.json(result);
});

// --- SOP 狀態定義 ---
// GET /api/bonuses/sop/states
router.get('/sop/states', auth, requirePermission('bonuses', 'view'), (req, res) => {
  res.json({
    states: SOP_STATES,
    labels: SOP_LABELS,
    transitions: SOP_TRANSITIONS,
  });
});

// GET /api/bonuses/sop/board — 看板式查詢（按狀態分組）
router.get('/sop/board', auth, requirePermission('bonuses', 'view'), (req, res) => {
  const allBonuses = db.getAll('bonuses').sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  const board = {};
  for (const state of SOP_STATES) {
    board[state] = allBonuses
      .filter(b => (b.status || 'draft') === state)
      .map(b => {
        const event = b.event_id ? db.getById('events', b.event_id) : null;
        const user = b.user_id ? db.getById('users', b.user_id) : null;
        const daysSince = Math.floor((Date.now() - new Date(b.created_at).getTime()) / 86400000);
        // 查詢配分表
        const pointAlloc = db.findOne('bonus_point_allocations', pa => pa.bonus_id === b.id);
        // 查詢審查表
        const review = db.findOne('bonus_reviews', rv => rv.bonus_id === b.id);
        return {
          ...b,
          event_name: event?.name || '',
          user_name: user?.display_name || '',
          days_since: daysSince,
          has_point_allocation: !!pointAlloc,
          has_review: !!review,
          point_allocation_id: pointAlloc?.id || null,
          review_id: review?.id || null,
        };
      });
  }
  res.json({ board, labels: SOP_LABELS });
});

// PUT /api/bonuses/:id/transition — 狀態轉換
router.put('/:id/transition', auth, requirePermission('bonuses', 'edit'), (req, res) => {
  const bonus = db.getById('bonuses', req.params.id);
  if (!bonus) return res.status(404).json({ error: '獎金紀錄不存在' });

  const { target_status } = req.body;
  const currentStatus = bonus.status || 'draft';

  // 驗證轉換合法性
  const allowed = SOP_TRANSITIONS[currentStatus] || [];
  if (!allowed.includes(target_status)) {
    return res.status(400).json({
      error: `無法從「${SOP_LABELS[currentStatus]}」轉換到「${SOP_LABELS[target_status] || target_status}」`,
      current: currentStatus,
      allowed,
    });
  }

  // 特殊驗證：kickoff 需要先有配分表
  if (target_status === 'kickoff') {
    // 自動建立配分表（如果還沒有）
    const existing = db.findOne('bonus_point_allocations', pa => pa.bonus_id === bonus.id);
    if (!existing) {
      // 建立預設配分表
      const coreItems = POINT_TEMPLATE.core.map(c => ({ ...c, points: 0, assignee: '', assignee_name: '' }));
      const matrixItems = POINT_TEMPLATE.matrix.map(m => ({ ...m, points: 0, assignee: '', assignee_name: '' }));
      db.insert('bonus_point_allocations', {
        id: uuidv4(),
        bonus_id: bonus.id,
        event_id: bonus.event_id || null,
        core_items: JSON.stringify(coreItems),
        matrix_items: JSON.stringify(matrixItems),
        total_points: POINT_TEMPLATE.total_points,
        core_subtotal: 0,
        matrix_subtotal: 0,
        allocated_total: 0,
        is_locked: false,
        kickoff_date: new Date().toISOString().slice(0, 10),
        created_by: req.user.id,
        created_at: new Date().toISOString(),
      });
    }
  }

  // 特殊驗證：executing 時鎖定配分表
  if (target_status === 'executing') {
    const pa = db.findOne('bonus_point_allocations', pa => pa.bonus_id === bonus.id);
    if (pa) {
      const coreItems = JSON.parse(pa.core_items || '[]');
      const coreTotal = coreItems.reduce((s, c) => s + (c.points || 0), 0);
      if (coreTotal <= 0) {
        return res.status(400).json({ error: '請先在啟動會議中完成核心職能配分（至少 1 點）' });
      }
      db.update('bonus_point_allocations', pa.id, { is_locked: true });
    }
  }

  // 特殊驗證：approved 需要有結案審查表
  if (target_status === 'approved') {
    const review = db.findOne('bonus_reviews', rv => rv.bonus_id === bonus.id);
    if (!review) {
      return res.status(400).json({ error: '請先完成結案審查' });
    }
    if (!review.is_approved) {
      return res.status(400).json({ error: '結案審查尚未完成核定' });
    }
  }

  // 執行轉換
  const updates = {
    status: target_status,
    [`${target_status}_at`]: new Date().toISOString(),
    [`${target_status}_by`]: req.user.id,
  };
  if (target_status === 'approved') updates.approved_at = new Date().toISOString();
  if (target_status === 'paid') updates.paid_at = new Date().toISOString();

  const updated = db.update('bonuses', req.params.id, updates);
  res.json(updated);
});

// ═══════════════════════════════════════
// 10 點積分配分制
// ═══════════════════════════════════════

// GET /api/bonuses/point-template — 取得配分模板
router.get('/point-template', auth, requirePermission('bonuses', 'view'), (req, res) => {
  res.json(POINT_TEMPLATE);
});

// GET /api/bonuses/point-allocation/:bonusId — 取得配分表
router.get('/point-allocation/:bonusId', auth, requirePermission('bonuses', 'view'), (req, res) => {
  const pa = db.findOne('bonus_point_allocations', p => p.bonus_id === req.params.bonusId);
  if (!pa) return res.status(404).json({ error: '尚無配分表' });
  res.json({
    ...pa,
    core_items: JSON.parse(pa.core_items || '[]'),
    matrix_items: JSON.parse(pa.matrix_items || '[]'),
  });
});

// POST /api/bonuses/point-allocation — 建立配分表
router.post('/point-allocation', auth, requirePermission('bonuses', 'create'), (req, res) => {
  const { bonus_id, core_items, matrix_items } = req.body;
  if (!bonus_id) return res.status(400).json({ error: '缺少 bonus_id' });

  const bonus = db.getById('bonuses', bonus_id);
  if (!bonus) return res.status(404).json({ error: '獎金紀錄不存在' });

  // 檢查是否已存在
  const existing = db.findOne('bonus_point_allocations', p => p.bonus_id === bonus_id);
  if (existing) return res.status(409).json({ error: '配分表已存在', existing_id: existing.id });

  const coreArr = core_items || POINT_TEMPLATE.core.map(c => ({ ...c, points: 0, assignee: '', assignee_name: '' }));
  const matrixArr = matrix_items || POINT_TEMPLATE.matrix.map(m => ({ ...m, points: 0, assignee: '', assignee_name: '' }));
  const coreSub = coreArr.reduce((s, c) => s + (c.points || 0), 0);
  const matrixSub = matrixArr.reduce((s, m) => s + (m.points || 0), 0);

  const pa = db.insert('bonus_point_allocations', {
    id: uuidv4(),
    bonus_id,
    event_id: bonus.event_id || null,
    core_items: JSON.stringify(coreArr),
    matrix_items: JSON.stringify(matrixArr),
    total_points: POINT_TEMPLATE.total_points,
    core_subtotal: coreSub,
    matrix_subtotal: matrixSub,
    allocated_total: coreSub + matrixSub,
    is_locked: false,
    kickoff_date: new Date().toISOString().slice(0, 10),
    created_by: req.user.id,
    created_at: new Date().toISOString(),
  });

  res.status(201).json({
    ...pa,
    core_items: coreArr,
    matrix_items: matrixArr,
  });
});

// PUT /api/bonuses/point-allocation/:id — 更新配分表
router.put('/point-allocation/:id', auth, requirePermission('bonuses', 'edit'), (req, res) => {
  const pa = db.getById('bonus_point_allocations', req.params.id);
  if (!pa) return res.status(404).json({ error: '配分表不存在' });

  // 如果已鎖定，只有在 review 階段才能由主管修改
  if (pa.is_locked) {
    const bonus = db.getById('bonuses', pa.bonus_id);
    if (bonus && bonus.status !== 'review') {
      return res.status(403).json({ error: '配分表已鎖定，僅在結案審查階段可由主管調整' });
    }
  }

  const { core_items, matrix_items } = req.body;
  const updates = {};

  if (core_items) {
    updates.core_items = JSON.stringify(core_items);
    updates.core_subtotal = core_items.reduce((s, c) => s + (c.points || 0), 0);
  }
  if (matrix_items) {
    updates.matrix_items = JSON.stringify(matrix_items);
    updates.matrix_subtotal = matrix_items.reduce((s, m) => s + (m.points || 0), 0);
  }

  const coreSub = updates.core_subtotal ?? pa.core_subtotal;
  const matrixSub = updates.matrix_subtotal ?? pa.matrix_subtotal;
  updates.allocated_total = coreSub + matrixSub;
  updates.updated_at = new Date().toISOString();

  const updated = db.update('bonus_point_allocations', req.params.id, updates);
  res.json({
    ...updated,
    core_items: JSON.parse(updated.core_items || '[]'),
    matrix_items: JSON.parse(updated.matrix_items || '[]'),
  });
});

// ═══════════════════════════════════════
// 結案會議審查
// ═══════════════════════════════════════

// GET /api/bonuses/review/:bonusId — 取得審查表
router.get('/review/:bonusId', auth, requirePermission('bonuses', 'view'), (req, res) => {
  const review = db.findOne('bonus_reviews', r => r.bonus_id === req.params.bonusId);
  if (!review) return res.status(404).json({ error: '尚無結案審查' });
  res.json({
    ...review,
    final_core_items: JSON.parse(review.final_core_items || '[]'),
    final_matrix_items: JSON.parse(review.final_matrix_items || '[]'),
    initial_core_items: JSON.parse(review.initial_core_items || '[]'),
    initial_matrix_items: JSON.parse(review.initial_matrix_items || '[]'),
  });
});

// POST /api/bonuses/:id/review — 建立結案審查
router.post('/:id/review', auth, requirePermission('bonuses', 'create'), (req, res) => {
  const bonus = db.getById('bonuses', req.params.id);
  if (!bonus) return res.status(404).json({ error: '獎金紀錄不存在' });
  if (bonus.status !== 'review') {
    return res.status(400).json({ error: '僅在「結案審查」階段可建立審查表' });
  }

  const existing = db.findOne('bonus_reviews', r => r.bonus_id === bonus.id);
  if (existing) return res.status(409).json({ error: '審查表已存在', existing_id: existing.id });

  // 從配分表帶入初始值
  const pa = db.findOne('bonus_point_allocations', p => p.bonus_id === bonus.id);
  const coreItems = pa ? JSON.parse(pa.core_items || '[]') : [];
  const matrixItems = pa ? JSON.parse(pa.matrix_items || '[]') : [];

  const { supervisor_notes, performance_rating } = req.body;

  const review = db.insert('bonus_reviews', {
    id: uuidv4(),
    bonus_id: bonus.id,
    event_id: bonus.event_id || null,
    // 保存啟動時的初始配分（唯讀比對用）
    initial_core_items: JSON.stringify(coreItems),
    initial_matrix_items: JSON.stringify(matrixItems),
    initial_total: pa ? pa.allocated_total : 0,
    // 可調整的最終配分（主管修改用）
    final_core_items: JSON.stringify(coreItems),
    final_matrix_items: JSON.stringify(matrixItems),
    final_total: pa ? pa.allocated_total : 0,
    // 審查資訊
    supervisor_notes: supervisor_notes || '',
    performance_rating: Number(performance_rating) || 0,
    is_approved: false,
    approved_by: null,
    approved_at: null,
    review_date: new Date().toISOString().slice(0, 10),
    created_by: req.user.id,
    created_at: new Date().toISOString(),
  });

  res.status(201).json({
    ...review,
    initial_core_items: coreItems,
    initial_matrix_items: matrixItems,
    final_core_items: coreItems,
    final_matrix_items: matrixItems,
  });
});

// PUT /api/bonuses/:id/review — 更新結案審查（主管調整配分）
router.put('/:id/review', auth, requirePermission('bonuses', 'edit'), (req, res) => {
  const review = db.findOne('bonus_reviews', r => r.bonus_id === req.params.id);
  if (!review) return res.status(404).json({ error: '審查表不存在' });
  if (review.is_approved) return res.status(400).json({ error: '審查已核定，無法修改' });

  const { final_core_items, final_matrix_items, supervisor_notes, performance_rating } = req.body;
  const updates = { updated_at: new Date().toISOString() };

  if (final_core_items) {
    updates.final_core_items = JSON.stringify(final_core_items);
  }
  if (final_matrix_items) {
    updates.final_matrix_items = JSON.stringify(final_matrix_items);
  }
  if (supervisor_notes !== undefined) updates.supervisor_notes = supervisor_notes;
  if (performance_rating !== undefined) updates.performance_rating = Number(performance_rating);

  // 計算 final_total
  const fc = final_core_items || JSON.parse(review.final_core_items || '[]');
  const fm = final_matrix_items || JSON.parse(review.final_matrix_items || '[]');
  updates.final_total = fc.reduce((s, c) => s + (c.points || 0), 0) + fm.reduce((s, m) => s + (m.points || 0), 0);

  const updated = db.update('bonus_reviews', review.id, updates);
  res.json({
    ...updated,
    final_core_items: JSON.parse(updated.final_core_items || '[]'),
    final_matrix_items: JSON.parse(updated.final_matrix_items || '[]'),
    initial_core_items: JSON.parse(updated.initial_core_items || '[]'),
    initial_matrix_items: JSON.parse(updated.initial_matrix_items || '[]'),
  });
});

// POST /api/bonuses/:id/review/approve — 主管核定
router.post('/:id/review/approve', auth, requirePermission('bonuses', 'edit'), (req, res) => {
  const review = db.findOne('bonus_reviews', r => r.bonus_id === req.params.id);
  if (!review) return res.status(404).json({ error: '審查表不存在' });

  db.update('bonus_reviews', review.id, {
    is_approved: true,
    approved_by: req.user.id,
    approved_at: new Date().toISOString(),
  });

  // 同步更新配分表（用最終核定值覆蓋）
  const pa = db.findOne('bonus_point_allocations', p => p.bonus_id === req.params.id);
  if (pa) {
    db.update('bonus_point_allocations', pa.id, {
      core_items: review.final_core_items,
      matrix_items: review.final_matrix_items,
      core_subtotal: JSON.parse(review.final_core_items || '[]').reduce((s, c) => s + (c.points || 0), 0),
      matrix_subtotal: JSON.parse(review.final_matrix_items || '[]').reduce((s, m) => s + (m.points || 0), 0),
      allocated_total: review.final_total,
    });
  }

  res.json({ success: true, message: '結案審查已核定' });
});

// ═══════════════════════════════════════
// 獎金紀錄 CRUD
// ═══════════════════════════════════════

// GET /api/bonuses
router.get('/', auth, requirePermission('bonuses', 'view'), (req, res) => {
  const { event_id, status, type } = req.query;
  let bonuses = db.getAll('bonuses').sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  if (event_id) bonuses = bonuses.filter(b => b.event_id === event_id);
  if (status) bonuses = bonuses.filter(b => b.status === status);
  if (type) bonuses = bonuses.filter(b => b.bonus_type === type);

  const enriched = bonuses.map(b => {
    const event = b.event_id ? db.getById('events', b.event_id) : null;
    const user = b.user_id ? db.getById('users', b.user_id) : null;
    return { ...b, event_name: event?.name || '', user_name: user?.display_name || '' };
  });
  res.json(enriched);
});

// POST /api/bonuses — 建立獎金發放紀錄
router.post('/', auth, requirePermission('bonuses', 'create'), (req, res) => {
  const {
    event_id, user_id, amount, bonus_type, tier_code,
    execution_primary, execution_secondary,
    pool_bonus, referral_bonus, notes,
    gross_amount, net_revenue, total_cost, profit, margin, category,
  } = req.body;

  const bonus = db.insert('bonuses', {
    id: uuidv4(),
    event_id: event_id || null,
    user_id: user_id || null,
    amount: Number(amount) || 0,
    bonus_type: bonus_type || 'total',  // execution | pool | referral | total
    tier_code: tier_code || '',
    category: category || 'bidding',
    // 計算明細
    gross_amount: Number(gross_amount) || 0,
    net_revenue: Number(net_revenue) || 0,
    total_cost: Number(total_cost) || 0,
    profit: Number(profit) || 0,
    margin: Number(margin) || 0,
    // 三類提撥
    execution_bonus: Number(req.body.execution_bonus) || 0,
    execution_primary: Number(execution_primary) || 0,
    execution_secondary: Number(execution_secondary) || 0,
    pool_bonus: Number(pool_bonus) || 0,
    referral_bonus: Number(referral_bonus) || 0,
    // SOP 狀態（預設 draft）
    notes: notes || '',
    status: 'draft',
    created_by: req.user.id,
    created_at: new Date().toISOString(),
  });
  res.status(201).json(bonus);
});

// PUT /api/bonuses/:id — 更新獎金紀錄
router.put('/:id', auth, requirePermission('bonuses', 'edit'), (req, res) => {
  const updates = { ...req.body };
  if (updates.status === 'paid') updates.paid_at = new Date().toISOString();
  if (updates.status === 'approved') updates.approved_at = new Date().toISOString();
  const updated = db.update('bonuses', req.params.id, updates);
  if (!updated) return res.status(404).json({ error: '獎金紀錄不存在' });
  res.json(updated);
});

// DELETE /api/bonuses/:id
router.delete('/:id', auth, requirePermission('bonuses', 'delete'), (req, res) => {
  // 同步刪除配分表和審查表
  db.removeWhere('bonus_point_allocations', pa => pa.bonus_id === req.params.id);
  db.removeWhere('bonus_reviews', rv => rv.bonus_id === req.params.id);
  db.remove('bonuses', req.params.id);
  res.json({ success: true });
});

// GET /api/bonuses/stats — 統計
router.get('/stats', auth, requirePermission('bonuses', 'view'), (req, res) => {
  const bonuses = db.getAll('bonuses');
  const pending = bonuses.filter(b => b.status === 'pending' || b.status === 'draft');
  const approved = bonuses.filter(b => b.status === 'approved');
  const paid = bonuses.filter(b => b.status === 'paid');

  // 按 SOP 狀態統計
  const byStatus = {};
  for (const state of SOP_STATES) {
    const items = bonuses.filter(b => (b.status || 'draft') === state);
    byStatus[state] = { count: items.length, amount: items.reduce((s, b) => s + (b.amount || 0), 0) };
  }

  // 按類型統計
  const byType = {};
  for (const b of bonuses) {
    const t = b.bonus_type || 'total';
    if (!byType[t]) byType[t] = { count: 0, amount: 0 };
    byType[t].count++;
    byType[t].amount += (b.amount || 0);
  }

  res.json({
    total: bonuses.length,
    pending_count: pending.length,
    pending_amount: pending.reduce((s, b) => s + (b.amount || 0), 0),
    approved_count: approved.length,
    approved_amount: approved.reduce((s, b) => s + (b.amount || 0), 0),
    paid_count: paid.length,
    paid_amount: paid.reduce((s, b) => s + (b.amount || 0), 0),
    total_amount: bonuses.reduce((s, b) => s + (b.amount || 0), 0),
    by_type: byType,
    by_status: byStatus,
  });
});

// --- 相容舊版規則 API ---
router.get('/rules', auth, requirePermission('bonuses', 'view'), (req, res) => {
  res.json(db.getAll('bonus_rules').sort((a, b) => a.sort - b.sort));
});

router.post('/rules', auth, requirePermission('bonuses', 'create'), (req, res) => {
  const { name, description, type, rate, min_margin, max_amount, applies_to } = req.body;
  const rule = db.insert('bonus_rules', {
    id: uuidv4(), name: name || '', description: description || '',
    type: type || 'margin_based', rate: Number(rate) || 0,
    min_margin: Number(min_margin) || 0, max_amount: Number(max_amount) || 0,
    applies_to: applies_to || 'pm', is_active: true, sort: 99,
  });
  res.status(201).json(rule);
});

router.put('/rules/:id', auth, requirePermission('bonuses', 'edit'), (req, res) => {
  const updated = db.update('bonus_rules', req.params.id, req.body);
  if (!updated) return res.status(404).json({ error: '規則不存在' });
  res.json(updated);
});

router.delete('/rules/:id', auth, requirePermission('bonuses', 'delete'), (req, res) => {
  db.remove('bonus_rules', req.params.id);
  res.json({ success: true });
});

// 舊版計算（相容）
router.post('/calculate/:eventId', auth, requirePermission('bonuses', 'view'), (req, res) => {
  const event = db.getById('events', req.params.eventId);
  if (!event) return res.status(404).json({ error: '活動不存在' });

  const grossAmount = Number(event.quote_amount) || 0;
  const totalCost = Number(event.cost_amount) || 0;
  const category = event.project_category || 'bidding';

  const result = calculateBonus(grossAmount, totalCost, category);
  res.json({
    event_id: event.id,
    event_name: event.name,
    category,
    gross_amount: grossAmount,
    ...result,
    // 相容舊版欄位
    revenue: result.net_revenue,
    cost: totalCost,
    margin: Math.round(result.margin * 100),
    totalBonus: result.total_bonus,
    allocations: [
      { rule_name: '執行獎金', type: 'execution', calculated_amount: result.execution_bonus, applies_to: 'executor', rate: result.tier.execution_rate },
      { rule_name: '獎金池', type: 'pool', calculated_amount: result.pool_bonus, applies_to: 'team', rate: result.tier.pool_rate },
      { rule_name: '介紹獎金', type: 'referral', calculated_amount: result.referral_bonus, applies_to: 'referrer', rate: result.tier.referral_rate },
    ].filter(a => a.calculated_amount > 0),
  });
});

module.exports = router;
