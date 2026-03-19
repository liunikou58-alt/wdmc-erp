/**
 * 活動採購單系統
 * 對應 Ragic：活動採購單(內部) 1,531筆/126欄 + 活動採購單(外部)
 * 功能：CRUD + 明細子表 + 拋轉請付款 + 連結損益 + 保證金
 */
const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const { auth, logActivity } = require('../middleware/auth');

const router = express.Router();

function genPO() {
  const d = new Date();
  const ds = `${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}`;
  const all = db.getAll('purchase_orders');
  const seq = all.filter(p => (p.po_no||'').includes(ds)).length + 1;
  return `PO-${ds}-${String(seq).padStart(3,'0')}`;
}

// === CRUD ===
router.get('/', auth, (req, res) => {
  const list = db.getAll('purchase_orders').sort((a,b) => (b.created_at||'').localeCompare(a.created_at||''));
  res.json(list);
});

router.get('/stats', auth, (req, res) => {
  const all = db.getAll('purchase_orders');
  res.json({
    total: all.length,
    ordering: all.filter(p => p.status === '訂購中').length,
    confirmed: all.filter(p => p.status === '已確認').length,
    closed: all.filter(p => p.status === '已結案').length,
    total_amount: all.reduce((s, p) => s + (p.total || 0), 0),
  });
});

router.post('/', auth, (req, res) => {
  const subtotal = Number(req.body.subtotal || 0);
  const taxRate = Number(req.body.tax_rate || 0);
  const po = db.insert('purchase_orders', {
    id: uuidv4(), po_no: genPO(),
    ...req.body,
    subtotal, tax_rate: taxRate,
    tax_amount: Math.round(subtotal * taxRate),
    total: Math.round(subtotal * (1 + taxRate)),
    status: req.body.status || '訂購中',
    payment_created: false,
  });
  res.status(201).json(po);
});

router.put('/:id', auth, (req, res) => {
  const po = db.update('purchase_orders', req.params.id, req.body);
  if (!po) return res.status(404).json({ error: '找不到' });
  res.json(po);
});

router.delete('/:id', auth, (req, res) => {
  db.remove('purchase_orders', req.params.id);
  res.json({ ok: true });
});

// === 明細 ===
router.get('/:id/items', auth, (req, res) => {
  res.json(db.find('purchase_order_items', i => i.po_id === req.params.id));
});

router.post('/:id/items', auth, (req, res) => {
  const item = db.insert('purchase_order_items', {
    id: uuidv4(), po_id: req.params.id,
    ...req.body,
    amount: (Number(req.body.qty || 1)) * (Number(req.body.unit_price || 0)),
  });
  // recalc
  const items = db.find('purchase_order_items', i => i.po_id === req.params.id);
  const subtotal = items.reduce((s, i) => s + (i.amount || 0), 0);
  const po = db.getById('purchase_orders', req.params.id);
  if (po) db.update('purchase_orders', req.params.id, {
    subtotal, tax_amount: Math.round(subtotal * (po.tax_rate || 0)),
    total: Math.round(subtotal * (1 + (po.tax_rate || 0))),
  });
  res.status(201).json(item);
});

router.delete('/:poId/items/:itemId', auth, (req, res) => {
  db.remove('purchase_order_items', req.params.itemId);
  res.json({ ok: true });
});

// === 拋轉請付款 ===
router.post('/:id/to-payment', auth, (req, res) => {
  const po = db.getById('purchase_orders', req.params.id);
  if (!po) return res.status(404).json({ error: '找不到' });
  const payment = db.insert('payments', {
    id: uuidv4(), type: 'event_payment',
    request_no: `PAY-${Date.now()}`,
    event_name: po.event_name, vendor_name: po.vendor_name,
    reason: `採購單 ${po.po_no} 拋轉`,
    amount: po.subtotal, tax_amount: po.tax_amount, total_with_tax: po.total,
    payment_method: po.payment_method || '匯款(瓦當麥可）',
    status: 'submitted', po_id: po.id, po_no: po.po_no,
  });
  db.update('purchase_orders', po.id, { payment_created: true, payment_id: payment.id });
  logActivity(db, null, req.user.id, 'po_to_payment', `${po.po_no} → 請付款`);
  res.json({ payment, message: '已拋轉請付款' });
});

// === 連結損益 ===
router.post('/:id/to-pl', auth, (req, res) => {
  const po = db.getById('purchase_orders', req.params.id);
  if (!po) return res.status(404).json({ error: '找不到' });
  const pls = db.getAll('profit_loss');
  const pl = pls.find(p => p.event_name === po.event_name);
  if (pl) {
    db.update('profit_loss', pl.id, {
      total_cost: (pl.total_cost || 0) + (po.total || 0),
      purchase_cost: (pl.purchase_cost || 0) + (po.total || 0),
      purchase_imported: true,
      profit: (pl.total_quote || 0) - ((pl.total_cost || 0) + (po.total || 0)),
    });
  }
  res.json({ ok: true });
});

// === 保證金 ===
router.get('/deposits', auth, (req, res) => {
  res.json(db.getAll('po_deposits').sort((a,b) => (b.created_at||'').localeCompare(a.created_at||'')));
});

router.post('/deposits', auth, (req, res) => {
  const dep = db.insert('po_deposits', { id: uuidv4(), ...req.body });
  res.status(201).json(dep);
});

module.exports = router;
