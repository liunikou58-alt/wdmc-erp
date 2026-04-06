/**
 * 報表匯出 API
 * 
 * CSV/JSON 格式匯出（前端可轉 Excel/PDF）
 * 1. 薪資清冊匯出
 * 2. 活動損益報表
 * 3. 報價單明細
 * 4. 勞報單明細
 * 5. 月結對帳
 */
const express = require('express');
const db = require('../db');
const { auth, requirePermission } = require('../middleware/auth');
const router = express.Router();

// GET /api/export/payroll — 薪資清冊
router.get('/payroll', auth, requirePermission('reports', 'view'),(req, res) => {
  const { event_name, date_from, date_to } = req.query;
  let workers = db.getAll('labor_report_workers');
  if (event_name) workers = workers.filter(w => (w.event_name || '').includes(event_name));
  if (date_from) workers = workers.filter(w => w.work_date >= date_from);
  if (date_to) workers = workers.filter(w => w.work_date <= date_to);

  const csv = [
    ['勞報單編號','活動名稱','工作日期','姓名','身分證字號','出生年月日','戶籍地址','聯絡電話','實領金額','銀行','帳號','已入清冊'].join(','),
    ...workers.map(w => [
      w.report_no || '', w.event_name || '', w.work_date || '',
      w.name || '', w.id_number || '', w.birthday || '',
      `"${(w.address || '').replace(/"/g, '""')}"`,
      w.phone || '', w.amount || 0, w.bank_name || '', w.bank_account || '',
      w.in_payroll ? 'Yes' : 'No'
    ].join(','))
  ].join('\n');

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename=payroll_${Date.now()}.csv`);
  res.send('\ufeff' + csv); // BOM for Excel
});

// GET /api/export/profit-loss — 活動損益報表
router.get('/profit-loss', auth, requirePermission('reports', 'view'),(req, res) => {
  const items = db.getAll('profit_loss');
  const csv = [
    ['編號','活動名稱','類型','負責人','客戶','活動日期','報價金額','結案金額','訂金','訂金狀態','尾款','尾款狀態','發票號碼','發票狀態','是否結案'].join(','),
    ...items.map(pl => [
      pl.pl_no, `"${pl.event_name}"`, pl.event_type, pl.manager, `"${pl.customer_name || ''}"`,
      pl.event_start_date, pl.quote_amount || 0, pl.settlement_amount || 0,
      pl.deposit_amount || 0, pl.deposit_status || '', pl.final_payment_amount || 0,
      pl.final_payment_status || '', pl.invoice_no || '', pl.invoice_status || '',
      pl.is_closed ? 'Yes' : 'No'
    ].join(','))
  ].join('\n');

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename=profit_loss_${Date.now()}.csv`);
  res.send('\ufeff' + csv);
});

// GET /api/export/profit-loss/:id/details — 單一活動損益明細
router.get('/profit-loss/:id/details', auth, requirePermission('reports', 'view'),(req, res) => {
  const pl = db.getById('profit_loss', req.params.id);
  const details = db.find('profit_loss_details', d => d.profit_loss_id === req.params.id);
  const csv = [
    [`活動損益明細 — ${pl?.event_name || ''}`],
    ['類別','項目名稱','數量','報價單價','報價小計','成本單價','成本小計','利潤','廠商'].join(','),
    ...details.map(d => [
      d.category, `"${d.item_name}"`, d.qty, d.unit_quote, d.quote_total,
      d.unit_cost, d.cost_total, (d.quote_total || 0) - (d.cost_total || 0),
      `"${d.vendor_name || ''}"`
    ].join(','))
  ].join('\n');

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename=pl_detail_${pl?.pl_no || ''}_${Date.now()}.csv`);
  res.send('\ufeff' + csv);
});

// GET /api/export/proposal/:id — 報價單明細
router.get('/proposal/:id', auth, requirePermission('reports', 'view'),(req, res) => {
  const p = db.getById('proposals', req.params.id);
  const items = db.find('proposal_items', i => i.proposal_id === req.params.id);
  const csv = [
    [`報價單 — ${p?.title || p?.name || ''}`],
    ['類別','項目','數量','單位','單價','金額','備註'].join(','),
    ...items.map(i => [
      i.category, `"${i.item}"`, i.qty, i.unit, i.unit_price, i.amount, `"${i.note || ''}"`
    ].join(','))
  ].join('\n');

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename=quote_${Date.now()}.csv`);
  res.send('\ufeff' + csv);
});

// GET /api/export/labor — 勞報單匯出
router.get('/labor', auth, requirePermission('reports', 'view'),(req, res) => {
  const reports = db.getAll('labor_reports');
  const workers = db.getAll('labor_report_workers');
  const csv = [
    ['勞報編號','活動名稱','活動日期','總人數','總金額','姓名','身分證','金額','工作日期'].join(','),
    ...workers.map(w => {
      const lr = reports.find(r => r.id === w.labor_report_id);
      return [
        lr?.report_no || '', `"${lr?.event_name || w.event_name || ''}"`, lr?.event_date || '',
        lr?.worker_count || '', lr?.total_amount || '',
        w.name, w.id_number || '', w.amount || 0, w.work_date || ''
      ].join(',');
    })
  ].join('\n');

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename=labor_export_${Date.now()}.csv`);
  res.send('\ufeff' + csv);
});

// GET /api/export/vendor-settlement — 月結廠商對帳
router.get('/vendor-settlement', auth, requirePermission('reports', 'view'),(req, res) => {
  const pos = db.getAll('purchase_orders');
  const vendors = db.getAll('vendors');
  const csv = [
    ['廠商名稱','採購單號','項目','金額','狀態','日期'].join(','),
    ...pos.map(po => {
      const v = vendors.find(v => v.id === po.vendor_id);
      return [
        `"${v?.name || po.vendor_name || ''}"`, po.po_no || '',
        `"${po.description || ''}"`, po.amount || 0, po.status || '', po.date || ''
      ].join(',');
    })
  ].join('\n');

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename=vendor_settlement_${Date.now()}.csv`);
  res.send('\ufeff' + csv);
});

module.exports = router;
