/**
 * 勞報單系統
 *
 * 對應 Ragic：案件勞報單 (forms13/7) + 瓦當麥可勞報單 (forms13/6)
 * 功能：
 *   - 勞報單 CRUD + 子表格（工作人員明細）
 *   - 自動編號 YYYYMM-NNN
 *   - 公式欄位（總計=SUM, 人數=COUNT）
 *   - 稅務計算（扣繳所得稅 + 二代健保）
 *   - 結案/重開 + PDF 報表
 *   - 活動損益表連結 (project_id)
 */
const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const { auth, logActivity, requirePermission } = require('../middleware/auth');

const router = express.Router();

/* ── 工具函式 ── */

// 自動編號 YYYYMM-NNN (對應 Ragic 的 202603-003)
function generateReportNumber() {
  const now = new Date();
  const prefix = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
  const all = db.getAll('labor_reports');
  const thisMonth = all.filter(r => (r.report_no || '').startsWith(prefix));
  const seq = thisMonth.length + 1;
  return `${prefix}-${String(seq).padStart(3, '0')}`;
}

// 稅務計算（台灣 2024 年標準）
function calculateTax(grossAmount) {
  const amount = Number(grossAmount) || 0;
  let tax = 0, nhi = 0;
  // 單次給付 >= 86,001 → 扣繳 10% 所得稅
  if (amount >= 86001) tax = Math.round(amount * 0.1);
  // 單次給付 >= 28,602 → 扣繳 2.11% 二代健保
  if (amount >= 28602) nhi = Math.round(amount * 0.0211);
  return { gross: amount, tax, nhi, net: amount - tax - nhi };
}

// 重算勞報單的公式欄位
function recalcReport(reportId) {
  const workers = db.find('labor_report_workers', w => w.report_id === reportId);
  const total = workers.reduce((s, w) => s + (Number(w.net_amount) || 0), 0);
  return db.update('labor_reports', reportId, {
    total_amount: total,
    headcount: workers.length,
  });
}

/* ── 勞報單 CRUD ── */

// GET /api/labor-reports — 勞報單列表
router.get('/', auth, requirePermission('labor_reports', 'view'),(req, res) => {
  const { type, is_closed, project_id } = req.query;
  let reports = db.getAll('labor_reports');

  if (type) reports = reports.filter(r => r.type === type);
  if (is_closed === 'true') reports = reports.filter(r => r.is_closed);
  if (is_closed === 'false') reports = reports.filter(r => !r.is_closed);
  if (project_id) reports = reports.filter(r => r.project_id === project_id);

  const enriched = reports.map(r => {
    const project = r.project_id ? db.getById('projects', r.project_id) : null;
    const creator = db.getById('users', r.created_by);
    return {
      ...r,
      project_name: project?.name || '',
      created_by_name: creator?.display_name || '',
    };
  }).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  res.json(enriched);
});

// GET /api/labor-reports/stats — 統計
router.get('/stats', auth, requirePermission('labor_reports', 'view'),(req, res) => {
  const all = db.getAll('labor_reports');
  const workers = db.getAll('labor_report_workers');
  const totalAmount = all.reduce((s, r) => s + (Number(r.total_amount) || 0), 0);
  res.json({
    total_reports: all.length,
    open: all.filter(r => !r.is_closed).length,
    closed: all.filter(r => r.is_closed).length,
    total_amount: totalAmount,
    total_workers: workers.length,
  });
});

// GET /api/labor-reports/:id — 詳情（含工作人員子表格）
router.get('/:id', auth, requirePermission('labor_reports', 'view'),(req, res) => {
  const report = db.getById('labor_reports', req.params.id);
  if (!report) return res.status(404).json({ error: '勞報單不存在' });

  const workers = db.find('labor_report_workers', w => w.report_id === report.id)
    .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));

  const project = report.project_id ? db.getById('projects', report.project_id) : null;
  const creator = db.getById('users', report.created_by);

  res.json({
    ...report,
    workers,
    project_name: project?.name || '',
    created_by_name: creator?.display_name || '',
  });
});

// POST /api/labor-reports — 新增勞報單
router.post('/', auth, requirePermission('labor_reports', 'create'),(req, res) => {
  const { type, event_name, event_date, event_case_name, project_id,
    permission_group, workers: workersList } = req.body;

  if (!event_name) return res.status(400).json({ error: '缺少活動名稱' });

  const report = db.insert('labor_reports', {
    id: uuidv4(),
    report_no: generateReportNumber(),
    type: type || 'case', // company | case
    event_name,
    event_date: event_date || '',
    event_case_name: event_case_name || event_name,
    event_name_date: `${event_name}${event_date || ''}`, // 公式欄位：唯一識別
    project_id: project_id || null,
    permission_group: permission_group || '',
    total_amount: 0,
    headcount: 0,
    is_closed: false,
    close_date: '',
    created_by: req.user.id,
  });

  // 批次新增工作人員
  if (workersList && workersList.length > 0) {
    workersList.forEach((w, i) => {
      const taxInfo = calculateTax(w.gross_amount || w.net_amount || 0);
      db.insert('labor_report_workers', {
        id: uuidv4(),
        report_id: report.id,
        worker_id: w.worker_id || null, // 連結載入
        name: w.name || '',
        id_number: w.id_number || '',
        birthday: w.birthday || '',
        address: w.address || '',
        phone: w.phone || '',
        gross_amount: taxInfo.gross,
        tax_withheld: taxInfo.tax,
        nhi_withheld: taxInfo.nhi,
        net_amount: taxInfo.net,
        cash_received_date: w.cash_received_date || '',
        id_photo_front: w.id_photo_front || '',
        id_photo_back: w.id_photo_back || '',
        sort_order: i,
      });
    });
    recalcReport(report.id);
  }

  logActivity(db, project_id, req.user.id, 'create_labor_report',
    `新增勞報單 ${report.report_no}「${event_name}」`);

  // 通知會計
  const accountants = db.find('users', u => u.role === 'admin' || u.department_id === 'finance');
  accountants.forEach(a => {
    db.insert('notifications', {
      id: uuidv4(), user_id: a.id, title: '📝 新勞報單',
      message: `${req.user.display_name} 建立了勞報單「${event_name}」`,
      type: 'labor_report', link: '/labor', read: false,
    });
  });

  res.status(201).json(db.getById('labor_reports', report.id));
});

// PUT /api/labor-reports/:id — 更新勞報單（主表）
router.put('/:id', auth, requirePermission('labor_reports', 'edit'),(req, res) => {
  const report = db.getById('labor_reports', req.params.id);
  if (!report) return res.status(404).json({ error: '勞報單不存在' });
  if (report.is_closed) return res.status(403).json({ error: '勞報單已結案，無法編輯' });

  const { event_name, event_date, event_case_name, project_id, permission_group } = req.body;
  const updates = {};
  if (event_name !== undefined) {
    updates.event_name = event_name;
    updates.event_name_date = `${event_name}${event_date || report.event_date || ''}`;
  }
  if (event_date !== undefined) {
    updates.event_date = event_date;
    updates.event_name_date = `${event_name || report.event_name}${event_date}`;
  }
  if (event_case_name !== undefined) updates.event_case_name = event_case_name;
  if (project_id !== undefined) updates.project_id = project_id;
  if (permission_group !== undefined) updates.permission_group = permission_group;

  const updated = db.update('labor_reports', req.params.id, updates);
  res.json(updated);
});

// DELETE /api/labor-reports/:id
router.delete('/:id', auth, requirePermission('labor_reports', 'delete'),(req, res) => {
  const report = db.getById('labor_reports', req.params.id);
  if (!report) return res.status(404).json({ error: '勞報單不存在' });
  if (report.is_closed) return res.status(403).json({ error: '勞報單已結案，無法刪除' });

  // 刪除所有工作人員明細
  db.removeWhere('labor_report_workers', w => w.report_id === req.params.id);
  db.remove('labor_reports', req.params.id);
  logActivity(db, report.project_id, req.user.id, 'delete_labor_report',
    `刪除勞報單 ${report.report_no}`);
  res.json({ success: true });
});

/* ── 工作人員子表格 CRUD ── */

// GET /api/labor-reports/:id/workers
router.get('/:id/workers', auth, requirePermission('labor_reports', 'view'),(req, res) => {
  const workers = db.find('labor_report_workers', w => w.report_id === req.params.id)
    .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
  res.json(workers);
});

// POST /api/labor-reports/:id/workers — 新增一位工作人員
router.post('/:id/workers', auth, requirePermission('labor_reports', 'create'),(req, res) => {
  const report = db.getById('labor_reports', req.params.id);
  if (!report) return res.status(404).json({ error: '勞報單不存在' });
  if (report.is_closed) return res.status(403).json({ error: '勞報單已結案' });

  const { worker_id, name, id_number, birthday, address, phone,
    gross_amount, cash_received_date, id_photo_front, id_photo_back } = req.body;

  // 如果有 worker_id，從工作人員主檔連結載入
  let workerData = { name, id_number, birthday, address, phone, id_photo_front, id_photo_back };
  if (worker_id) {
    const master = db.getById('workers', worker_id);
    if (master) {
      workerData = {
        name: master.name,
        id_number: master.id_number,
        birthday: master.birthday,
        address: master.address,
        phone: master.phone,
        id_photo_front: master.id_photo_front,
        id_photo_back: master.id_photo_back,
      };
    }
  }

  const existing = db.find('labor_report_workers', w => w.report_id === req.params.id);
  const taxInfo = calculateTax(gross_amount || 0);

  const entry = db.insert('labor_report_workers', {
    id: uuidv4(),
    report_id: req.params.id,
    worker_id: worker_id || null,
    ...workerData,
    gross_amount: taxInfo.gross,
    tax_withheld: taxInfo.tax,
    nhi_withheld: taxInfo.nhi,
    net_amount: taxInfo.net,
    cash_received_date: cash_received_date || '',
    sort_order: existing.length,
  });

  recalcReport(req.params.id);
  res.status(201).json(entry);
});

// PUT /api/labor-reports/workers/:workerId — 更新工作人員明細
router.put('/workers/:workerId', auth, requirePermission('labor_reports', 'edit'),(req, res) => {
  const entry = db.getById('labor_report_workers', req.params.workerId);
  if (!entry) return res.status(404).json({ error: '不存在' });

  const updates = { ...req.body };
  // 如果修改了金額，重算稅務
  if (updates.gross_amount !== undefined) {
    const taxInfo = calculateTax(updates.gross_amount);
    updates.gross_amount = taxInfo.gross;
    updates.tax_withheld = taxInfo.tax;
    updates.nhi_withheld = taxInfo.nhi;
    updates.net_amount = taxInfo.net;
  }

  const updated = db.update('labor_report_workers', req.params.workerId, updates);
  recalcReport(entry.report_id);
  res.json(updated);
});

// DELETE /api/labor-reports/workers/:workerId — 刪除工作人員明細
router.delete('/workers/:workerId', auth, requirePermission('labor_reports', 'delete'),(req, res) => {
  const entry = db.getById('labor_report_workers', req.params.workerId);
  if (!entry) return res.status(404).json({ error: '不存在' });
  db.remove('labor_report_workers', req.params.workerId);
  recalcReport(entry.report_id);
  res.json({ success: true });
});

/* ── 特殊操作 ── */

// PUT /api/labor-reports/:id/close — 結案
router.put('/:id/close', auth, requirePermission('labor_reports', 'edit'),(req, res) => {
  const report = db.getById('labor_reports', req.params.id);
  if (!report) return res.status(404).json({ error: '勞報單不存在' });
  const updated = db.update('labor_reports', req.params.id, {
    is_closed: true,
    close_date: new Date().toISOString().slice(0, 10),
  });
  logActivity(db, report.project_id, req.user.id, 'close_labor_report',
    `結案勞報單 ${report.report_no}`);
  res.json(updated);
});

// PUT /api/labor-reports/:id/reopen — 重開
router.put('/:id/reopen', auth, requirePermission('labor_reports', 'edit'),(req, res) => {
  const report = db.getById('labor_reports', req.params.id);
  if (!report) return res.status(404).json({ error: '勞報單不存在' });
  const updated = db.update('labor_reports', req.params.id, {
    is_closed: false,
    close_date: '',
  });
  res.json(updated);
});

// GET /api/labor-reports/:id/tax-calc — 稅額計算預覽
router.get('/:id/tax-calc', auth, requirePermission('labor_reports', 'view'),(req, res) => {
  const workers = db.find('labor_report_workers', w => w.report_id === req.params.id);
  const details = workers.map(w => ({
    name: w.name,
    ...calculateTax(w.gross_amount),
  }));
  const summary = {
    total_gross: details.reduce((s, d) => s + d.gross, 0),
    total_tax: details.reduce((s, d) => s + d.tax, 0),
    total_nhi: details.reduce((s, d) => s + d.nhi, 0),
    total_net: details.reduce((s, d) => s + d.net, 0),
  };
  res.json({ workers: details, summary });
});

/* ── PDF 報表 ── */

const CSS = `
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family:'Microsoft JhengHei','Noto Sans TC',sans-serif; padding:40px; color:#1e293b; font-size:13px; }
  .header { text-align:center; margin-bottom:30px; border-bottom:3px solid #4f46e5; padding-bottom:20px; }
  .header h1 { font-size:22px; color:#4f46e5; }
  .header .company { font-size:14px; color:#64748b; margin-top:4px; }
  .header .doc-no { font-size:12px; color:#94a3b8; margin-top:6px; }
  .meta { display:flex; justify-content:space-between; margin-bottom:24px; }
  .meta-block { font-size:12px; line-height:1.8; }
  .meta-block .label { color:#64748b; }
  .meta-block .value { font-weight:700; }
  table { width:100%; border-collapse:collapse; margin-bottom:20px; }
  th { background:#f1f5f9; padding:8px 12px; text-align:left; font-size:12px; border:1px solid #e2e8f0; }
  td { padding:8px 12px; border:1px solid #e2e8f0; font-size:12px; }
  .total-row td { font-weight:700; background:#f8fafc; }
  .footer { margin-top:40px; text-align:center; font-size:11px; color:#94a3b8; border-top:1px solid #e2e8f0; padding-top:16px; }
  .sign-area { display:flex; justify-content:space-around; margin-top:50px; }
  .sign-box { text-align:center; width:160px; }
  .sign-line { border-top:1px solid #94a3b8; margin-top:50px; padding-top:6px; font-size:12px; color:#64748b; }
  @media print { body { padding:20px; } }
`;

router.get('/:id/pdf', auth, requirePermission('labor_reports', 'view'),(req, res) => {
  const report = db.getById('labor_reports', req.params.id);
  if (!report) return res.status(404).json({ error: '勞報單不存在' });
  const workers = db.find('labor_report_workers', w => w.report_id === report.id)
    .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
  const project = report.project_id ? db.getById('projects', report.project_id) : null;

  res.send(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>勞報單 - ${report.report_no}</title><style>${CSS}</style></head><body>
    <div class="header"><h1>勞 務 報 酬 單</h1><div class="company">瓦當麥可創意整合股份有限公司</div><div class="doc-no">${report.report_no} | ${report.event_date || ''}</div></div>
    <div class="meta">
      <div class="meta-block"><div><span class="label">活動名稱：</span><span class="value">${report.event_name}</span></div><div><span class="label">活動日期：</span><span class="value">${report.event_date || '-'}</span></div><div><span class="label">關聯專案：</span><span class="value">${project?.name || '-'}</span></div></div>
      <div class="meta-block"><div><span class="label">總計：</span><span class="value">$${(report.total_amount || 0).toLocaleString()}</span></div><div><span class="label">人數：</span><span class="value">${report.headcount || 0}</span></div><div><span class="label">狀態：</span><span class="value">${report.is_closed ? '已結案' : '進行中'}</span></div></div>
    </div>
    <table><thead><tr><th>#</th><th>姓名</th><th>身分證字號</th><th>聯絡電話</th><th>稅前金額</th><th>所得稅</th><th>健保</th><th>實領金額</th><th>收到日期</th></tr></thead>
    <tbody>${workers.map((w, i) => `<tr><td>${i + 1}</td><td>${w.name}</td><td>${w.id_number || '-'}</td><td>${w.phone || '-'}</td><td>$${(w.gross_amount || 0).toLocaleString()}</td><td>$${(w.tax_withheld || 0).toLocaleString()}</td><td>$${(w.nhi_withheld || 0).toLocaleString()}</td><td>$${(w.net_amount || 0).toLocaleString()}</td><td>${w.cash_received_date || '-'}</td></tr>`).join('')}
    <tr class="total-row"><td colspan="4" style="text-align:right">合計</td><td>$${workers.reduce((s, w) => s + (w.gross_amount || 0), 0).toLocaleString()}</td><td>$${workers.reduce((s, w) => s + (w.tax_withheld || 0), 0).toLocaleString()}</td><td>$${workers.reduce((s, w) => s + (w.nhi_withheld || 0), 0).toLocaleString()}</td><td>$${workers.reduce((s, w) => s + (w.net_amount || 0), 0).toLocaleString()}</td><td></td></tr></tbody></table>
    <div class="sign-area"><div class="sign-box"><div class="sign-line">製表人</div></div><div class="sign-box"><div class="sign-line">主管核准</div></div><div class="sign-box"><div class="sign-line">會計</div></div></div>
    <div class="footer">此勞報單由 WDMC管理中心 系統生成 · ${new Date().toLocaleDateString('zh-TW')}</div>
    <script>window.print()</script></body></html>`);
});

module.exports = router;
