// Quick test of the bonus calculation engine
const path = require('path');
process.env.DB_TYPE = 'json';

// Mock the calculateBonus logic inline to test without full server
const TAX_RATE = 1.05;
const EXECUTION_SPLIT = { primary: 0.7, secondary: 0.3 };

const DEFAULT_TIERS = {
  bidding: [
    { code: 'M0', min_margin: 0,    max_margin: 0.1999, execution_rate: 0,    pool_rate: 0,    referral_rate: 0 },
    { code: 'M1', min_margin: 0.20,  max_margin: 0.2499, execution_rate: 0.01, pool_rate: 0.02, referral_rate: 0.01 },
    { code: 'M2', min_margin: 0.25,  max_margin: 0.2999, execution_rate: 0.02, pool_rate: 0.03, referral_rate: 0.01 },
    { code: 'M3', min_margin: 0.30,  max_margin: 0.3499, execution_rate: 0.04, pool_rate: 0.04, referral_rate: 0.01 },
    { code: 'M4', min_margin: 0.35,  max_margin: 0.3999, execution_rate: 0.05, pool_rate: 0.05, referral_rate: 0.01 },
    { code: 'M5', min_margin: 0.40,  max_margin: 0.50,   execution_rate: 0.06, pool_rate: 0.06, referral_rate: 0.01 },
    { code: 'M6', min_margin: 0.50,  max_margin: 1.00,   execution_rate: 0.06, pool_rate: 0.06, referral_rate: 0.01 },
  ],
};

function matchTier(margin, category) {
  const tiers = DEFAULT_TIERS[category] || DEFAULT_TIERS.bidding;
  for (let i = tiers.length - 1; i >= 0; i--) {
    if (margin >= tiers[i].min_margin) return tiers[i];
  }
  return tiers[0];
}

function calculateBonus(grossAmount, totalCost, category = 'bidding') {
  const netRevenue = Math.round(grossAmount / TAX_RATE);
  const profit = netRevenue - totalCost;
  if (profit <= 0) return { error: 'No profit' };

  const margin = profit / netRevenue;
  const tier = matchTier(margin, category);

  const executionBonus = Math.round(profit * (tier.execution_rate || 0));
  const poolBonus = Math.round(profit * (tier.pool_rate || 0));
  const referralBonus = Math.round(profit * (tier.referral_rate || 0));
  const executionPrimary = Math.round(executionBonus * EXECUTION_SPLIT.primary);
  const executionSecondary = executionBonus - executionPrimary;

  return {
    net_revenue: netRevenue, total_cost: totalCost, profit, margin: (margin * 100).toFixed(2) + '%',
    tier: tier.code,
    execution_bonus: executionBonus, execution_primary: executionPrimary, execution_secondary: executionSecondary,
    pool_bonus: poolBonus, referral_bonus: referralBonus,
    total_bonus: executionBonus + poolBonus + referralBonus,
  };
}

// === 客戶確認範例：標案 100萬 ===
console.log('=== 客戶確認範例：標案 100萬含稅 ===');
const result = calculateBonus(1000000, 700000, 'bidding');
console.log(JSON.stringify(result, null, 2));

// 驗證
console.log('\n=== 驗證 ===');
console.log('未稅金額:', result.net_revenue, '(預期: 952381)');
console.log('利潤:', result.profit, '(預期: ~252381)');
console.log('毛利率:', result.margin, '(預期: ~26.5%)');
console.log('級距:', result.tier, '(預期: M2)');
console.log('執行獎金:', result.execution_bonus, '(預期: ~5048)');
console.log('  主執行 70%:', result.execution_primary, '(預期: ~3534)');
console.log('  次執行 30%:', result.execution_secondary, '(預期: ~1514)');
console.log('獎金池:', result.pool_bonus, '(預期: ~7571)');
console.log('介紹獎金:', result.referral_bonus, '(預期: ~2524)');
console.log('總計:', result.total_bonus, '(預期: ~15143)');

const allMatch = result.tier === 'M2' && result.net_revenue === 952381 && result.execution_bonus === 5048;
console.log('\n✅ 測試結果:', allMatch ? 'PASS' : 'FAIL');
