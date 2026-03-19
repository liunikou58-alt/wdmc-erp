/**
 * 物品管理系統（強化版）
 * 
 * 對應 Ragic：物品出入庫單 + 明細、盤點單、進貨單、物品主檔
 * 擴展現有 assets 模組
 */
const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const { auth, logActivity } = require('../middleware/auth');

const router = express.Router();

/* ── 自動編號 ── */
function genNo(prefix) {
  const ym = `${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}`;
  const col = prefix === 'IO' ? 'inventory_movements' : prefix === 'IC' ? 'inventory_counts' : 'goods_receipts';
  const all = db.getAll(col);
  const seq = all.filter(r => (r[Object.keys(r).find(k => k.endsWith('_no'))] || '').includes(ym)).length + 1;
  return `${prefix}-${ym}-${String(seq).padStart(3, '0')}`;
}

/* ═══ 物品出入庫 ═══ */

// GET /api/inventory/movements
router.get('/movements', auth, (req, res) => {
  const { type, project_id, status } = req.query;
  let items = db.getAll('inventory_movements');
  if (type) items = items.filter(i => i.type === type);
  if (project_id) items = items.filter(i => i.project_id === project_id);
  if (status) items = items.filter(i => i.status === status);

  const enriched = items.map(m => {
    const details = db.find('inventory_movement_details', d => d.movement_id === m.id);
    const project = m.project_id ? db.getById('projects', m.project_id) : null;
    const user = db.getById('users', m.handled_by);
    return { ...m, details, item_count: details.length, project_name: project?.name || '', handled_by_name: user?.display_name || '' };
  }).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  res.json(enriched);
});

// GET /api/inventory/movements/:id
router.get('/movements/:id', auth, (req, res) => {
  const m = db.getById('inventory_movements', req.params.id);
  if (!m) return res.status(404).json({ error: '不存在' });
  const details = db.find('inventory_movement_details', d => d.movement_id === m.id);
  res.json({ ...m, details });
});

// POST /api/inventory/checkout — 出庫
router.post('/checkout', auth, (req, res) => {
  const { project_id, return_date, notes, items } = req.body;
  if (!items || !items.length) return res.status(400).json({ error: '缺少物品清單' });

  const movement = db.insert('inventory_movements', {
    id: uuidv4(), movement_no: genNo('IO'), type: 'out',
    project_id: project_id || null, handled_by: req.user.id,
    movement_date: new Date().toISOString().slice(0, 10),
    return_date: return_date || '', notes: notes || '', status: 'completed',
  });

  items.forEach(item => {
    db.insert('inventory_movement_details', {
      id: uuidv4(), movement_id: movement.id,
      item_id: item.item_id, quantity: item.quantity || 1,
      serial_number: item.serial_number || '', condition: 'normal', notes: item.notes || '',
    });
    // 更新 assets 可用數量
    const asset = db.getById('assets', item.item_id);
    if (asset) db.update('assets', item.item_id, { available_qty: Math.max(0, (asset.available_qty || asset.quantity || 1) - (item.quantity || 1)), status: 'in_use' });
  });

  logActivity(db, project_id, req.user.id, 'inventory_checkout', `出庫 ${movement.movement_no}`);
  res.status(201).json(movement);
});

// POST /api/inventory/checkin — 入庫
router.post('/checkin', auth, (req, res) => {
  const { project_id, notes, items } = req.body;
  if (!items || !items.length) return res.status(400).json({ error: '缺少物品清單' });

  const movement = db.insert('inventory_movements', {
    id: uuidv4(), movement_no: genNo('IO'), type: 'in',
    project_id: project_id || null, handled_by: req.user.id,
    movement_date: new Date().toISOString().slice(0, 10),
    return_date: '', notes: notes || '', status: 'completed',
  });

  items.forEach(item => {
    db.insert('inventory_movement_details', {
      id: uuidv4(), movement_id: movement.id,
      item_id: item.item_id, quantity: item.quantity || 1,
      serial_number: item.serial_number || '', condition: item.condition || 'normal', notes: item.notes || '',
    });
    const asset = db.getById('assets', item.item_id);
    if (asset) {
      const newQty = (asset.available_qty || 0) + (item.quantity || 1);
      db.update('assets', item.item_id, { available_qty: newQty, status: newQty > 0 ? 'available' : asset.status });
    }
  });

  logActivity(db, project_id, req.user.id, 'inventory_checkin', `入庫 ${movement.movement_no}`);
  res.status(201).json(movement);
});

/* ═══ 盤點 ═══ */

// GET /api/inventory/counts
router.get('/counts', auth, (req, res) => {
  const items = db.getAll('inventory_counts')
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  const enriched = items.map(c => {
    const details = db.find('inventory_count_details', d => d.count_id === c.id);
    const user = db.getById('users', c.counted_by);
    return { ...c, details, item_count: details.length, counted_by_name: user?.display_name || '' };
  });
  res.json(enriched);
});

// POST /api/inventory/counts — 新增盤點
router.post('/counts', auth, (req, res) => {
  const { warehouse, items: countItems } = req.body;
  const count = db.insert('inventory_counts', {
    id: uuidv4(), count_no: genNo('IC'),
    count_date: new Date().toISOString().slice(0, 10),
    counted_by: req.user.id, warehouse: warehouse || '',
    status: 'in_progress', discrepancy_notes: '',
  });

  if (countItems && countItems.length) {
    countItems.forEach(ci => {
      const asset = db.getById('assets', ci.item_id);
      db.insert('inventory_count_details', {
        id: uuidv4(), count_id: count.id, item_id: ci.item_id,
        system_qty: asset?.quantity || 0, actual_qty: ci.actual_qty || 0,
        difference: (ci.actual_qty || 0) - (asset?.quantity || 0), notes: ci.notes || '',
      });
    });
  }

  res.status(201).json(count);
});

// PUT /api/inventory/counts/:id/complete — 完成盤點
router.put('/counts/:id/complete', auth, (req, res) => {
  const count = db.getById('inventory_counts', req.params.id);
  if (!count) return res.status(404).json({ error: '不存在' });

  // 自動調整庫存
  const details = db.find('inventory_count_details', d => d.count_id === count.id);
  details.forEach(d => {
    if (d.difference !== 0) {
      const asset = db.getById('assets', d.item_id);
      if (asset) db.update('assets', d.item_id, { quantity: d.actual_qty, available_qty: d.actual_qty });
    }
  });

  const updated = db.update('inventory_counts', req.params.id, {
    status: 'completed', discrepancy_notes: req.body.notes || '',
  });
  res.json(updated);
});

/* ═══ 進貨 ═══ */

// GET /api/inventory/receipts
router.get('/receipts', auth, (req, res) => {
  const items = db.getAll('goods_receipts')
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  const enriched = items.map(r => {
    const details = db.find('goods_receipt_details', d => d.receipt_id === r.id);
    const vendor = r.vendor_id ? db.getById('vendors', r.vendor_id) : null;
    return { ...r, details, vendor_name: vendor?.name || '' };
  });
  res.json(enriched);
});

// POST /api/inventory/receipts — 進貨
router.post('/receipts', auth, (req, res) => {
  const { vendor_id, items: receiptItems, notes } = req.body;

  const receipt = db.insert('goods_receipts', {
    id: uuidv4(), receipt_no: genNo('GR'),
    vendor_id: vendor_id || null,
    receipt_date: new Date().toISOString().slice(0, 10),
    total_amount: 0, inspection_status: 'pending',
    inspector: req.user.id, notes: notes || '',
  });

  let total = 0;
  if (receiptItems && receiptItems.length) {
    receiptItems.forEach(ri => {
      const amount = (ri.quantity || 1) * (ri.unit_price || 0);
      total += amount;
      db.insert('goods_receipt_details', {
        id: uuidv4(), receipt_id: receipt.id,
        item_id: ri.item_id || null, quantity: ri.quantity || 1,
        unit_price: ri.unit_price || 0, amount,
      });
      // 增加庫存
      if (ri.item_id) {
        const asset = db.getById('assets', ri.item_id);
        if (asset) db.update('assets', ri.item_id, {
          quantity: (asset.quantity || 0) + (ri.quantity || 1),
          available_qty: (asset.available_qty || 0) + (ri.quantity || 1),
        });
      }
    });
  }

  db.update('goods_receipts', receipt.id, { total_amount: total, inspection_status: 'passed' });
  logActivity(db, null, req.user.id, 'goods_receipt', `進貨 ${receipt.receipt_no} $${total}`);
  res.status(201).json(db.getById('goods_receipts', receipt.id));
});

module.exports = router;
