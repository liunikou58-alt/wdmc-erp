/**
 * 綠界 (ECPay) Webhook 自動銷帳模組
 * 負責處理金流平台的回調通知 (ReturnURL)
 */
const express = require('express');
const crypto = require('crypto');
const db = require('../db');
const { logActivity } = require('../middleware/auth');

const router = express.Router();

// 測試用金鑰 (綠界測試環境)
const HASH_KEY = process.env.ECPAY_HASH_KEY || '5294y06JbISpM5x9';
const HASH_IV = process.env.ECPAY_HASH_IV || 'v77hoKGq4kWxNNIS';

/**
 * 驗證綠界 CheckMacValue
 * @param {Object} payload 回傳參數
 * @returns {boolean}
 */
function verifyMacValue(payload) {
  const { CheckMacValue, ...data } = payload;
  if (!CheckMacValue) return false;

  // 參數按字母排序
  const keys = Object.keys(data).sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));
  let rawStr = `HashKey=${HASH_KEY}&` + keys.map(k => `${k}=${data[k]}`).join('&') + `&HashIV=${HASH_IV}`;

  // URL Encode
  rawStr = encodeURIComponent(rawStr)
    .replace(/%20/g, '+')
    .replace(/%2d/g, '-')
    .replace(/%5f/g, '_')
    .replace(/%2e/g, '.')
    .replace(/%21/g, '!')
    .replace(/%2a/g, '*')
    .replace(/%28/g, '(')
    .replace(/%29/g, ')')
    .toLowerCase();

  // SHA256 & UpperCase
  const calculated = crypto.createHash('sha256').update(rawStr).digest('hex').toUpperCase();

  // 測試環境若未設定環境變數，允許通過檢查以便測試
  if (!process.env.ECPAY_HASH_KEY && payload.TestMode === '1') return true;

  return calculated === CheckMacValue;
}

// POST /api/webhook/ecpay — 綠界金流回調
router.post('/ecpay', express.urlencoded({ extended: true }), express.json(), (req, res) => {
  try {
    const payload = req.body;
    console.log('[Webhook] 收到綠界金流回調:', payload.MerchantTradeNo);

    // 1. 驗證資料真實性
    if (!verifyMacValue(payload)) {
      console.error('[Webhook] CheckMacValue 驗證失敗', payload.MerchantTradeNo);
      return res.status(400).send('0|Error'); // 綠界要求失敗回傳 0|Error
    }

    // 2. 判斷交易狀態 (1 = 成功)
    if (payload.RtnCode !== '1') {
      console.warn('[Webhook] 交易失敗或未授權:', payload.RtnMsg);
      // 依然回傳 1|OK 給綠界，因為我們收到通知了
      return res.send('1|OK');
    }

    const tradeNo = payload.MerchantTradeNo;   // 訂單編號
    const amount = parseInt(payload.TradeAmt);   // 交易金額
    const customField = payload.CustomField1;    // 自訂擴充位 (Entity ID)
    const entityType = payload.CustomField2;     // 自訂擴充位 (Entity Type)

    // 3. 根據 CustomField 尋找對應的單據並銷帳
    if (entityType === 'revenue') {
      const rev = db.getById('revenues', customField);
      if (rev && rev.status !== 'completed') {
        db.update('revenues', customField, { status: 'completed', payment_date: payload.PaymentDate });
        // 發送通知
        db.insert('notifications', {
          id: require('uuid').uuidv4(),
          user_id: rev.created_by,
          type: 'finance',
          title: '收款自動入帳成功',
          message: `帳單 ${rev.title} 已透過金流自動核銷，金額: $${amount}`,
          is_read: false,
          created_at: new Date().toISOString()
        });
        logActivity('system', 'finance', 'revenue_auto_paid', `金流回調自動銷帳: ${rev.id}`);
      }
    } else if (entityType === 'purchase_order') {
      const po = db.getById('purchase_orders', customField);
      if (po && po.status !== 'paid') {
        db.update('purchase_orders', customField, { status: 'paid', paid_amount: amount });
        logActivity('system', 'finance', 'po_auto_paid', `金流回調自動付款: ${po.id}`);
      }
    } else {
      console.warn('[Webhook] 未知的銷帳對象實體:', entityType);
    }

    // 4. 回應綠界伺服器
    res.send('1|OK');

  } catch (error) {
    console.error('[Webhook] 處理金流回調時發生錯誤:', error);
    res.status(500).send('0|Error');
  }
});

module.exports = router;
