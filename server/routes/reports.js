/**
 * PDF / 報表匯出路由
 * 
 * 生成 HTML 報表，前端用 window.print() 或瀏覽器列印到 PDF
 * 不依賴 puppeteer / pdfkit，零外部依賴
 * 
 * 支援：報價單、合約、採購單、財務月報、專案摘要
 */
const express = require('express');
const db = require('../db');
const { auth } = require('../middleware/auth');

const router = express.Router();

const CSS = `
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Microsoft JhengHei', 'Noto Sans TC', sans-serif; padding: 40px; color: #1e293b; font-size: 13px; }
  .header { text-align: center; margin-bottom: 30px; border-bottom: 3px solid #4f46e5; padding-bottom: 20px; }
  .header h1 { font-size: 22px; color: #4f46e5; }
  .header .company { font-size: 14px; color: #64748b; margin-top: 4px; }
  .header .doc-no { font-size: 12px; color: #94a3b8; margin-top: 6px; }
  .meta { display: flex; justify-content: space-between; margin-bottom: 24px; }
  .meta-block { font-size: 12px; line-height: 1.8; }
  .meta-block .label { color: #64748b; }
  .meta-block .value { font-weight: 700; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
  th { background: #f1f5f9; padding: 8px 12px; text-align: left; font-size: 12px; border: 1px solid #e2e8f0; }
  td { padding: 8px 12px; border: 1px solid #e2e8f0; font-size: 12px; }
  .total-row td { font-weight: 700; background: #f8fafc; }
  .section-title { font-size: 15px; font-weight: 700; color: #4f46e5; margin: 24px 0 10px; border-left: 4px solid #4f46e5; padding-left: 10px; }
  .footer { margin-top: 40px; text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 16px; }
  .sign-area { display: flex; justify-content: space-around; margin-top: 50px; }
  .sign-box { text-align: center; width: 160px; }
  .sign-line { border-top: 1px solid #94a3b8; margin-top: 50px; padding-top: 6px; font-size: 12px; color: #64748b; }
  .stat-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 20px; }
  .stat-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; text-align: center; }
  .stat-box .num { font-size: 22px; font-weight: 800; color: #4f46e5; }
  .stat-box .lbl { font-size: 11px; color: #64748b; }
  @media print { body { padding: 20px; } .no-print { display: none; } }
`;

// 報價單
router.get('/quotation/:id', auth, (req, res) => {
  const proposal = db.getById('proposals', req.params.id);
  if (!proposal) return res.status(404).json({ error: '提案不存在' });
  const customer = proposal.customer_id ? db.getById('customers', proposal.customer_id) : null;
  const quotations = db.find('quotations', q => q.proposal_id === proposal.id);
  const latest = quotations.sort((a, b) => b.version - a.version)[0];

  const items = latest?.items || [{ description: proposal.title, quantity: 1, unit_price: proposal.budget || 0 }];
  const total = items.reduce((s, i) => s + (i.quantity || 1) * (i.unit_price || 0), 0);

  res.send(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>報價單 - ${proposal.title}</title><style>${CSS}</style></head><body>
    <div class="header"><h1>報 價 單</h1><div class="company">瓦當麥可創意整合股份有限公司</div><div class="doc-no">${proposal.proposal_number || ''} | ${new Date().toLocaleDateString('zh-TW')}</div></div>
    <div class="meta">
      <div class="meta-block"><div><span class="label">客戶名稱：</span><span class="value">${customer?.name || '-'}</span></div><div><span class="label">聯絡人：</span><span class="value">${customer?.contact_name || '-'}</span></div><div><span class="label">活動類型：</span><span class="value">${proposal.event_type || '-'}</span></div></div>
      <div class="meta-block"><div><span class="label">提案名稱：</span><span class="value">${proposal.title}</span></div><div><span class="label">報價版本：</span><span class="value">v${latest?.version || 1}</span></div><div><span class="label">有效期限：</span><span class="value">報價後 30 日</span></div></div>
    </div>
    <table><thead><tr><th>#</th><th>項目說明</th><th>數量</th><th>單價</th><th>小計</th></tr></thead>
    <tbody>${items.map((it, i) => `<tr><td>${i + 1}</td><td>${it.description || ''}</td><td>${it.quantity || 1}</td><td>$${(it.unit_price || 0).toLocaleString()}</td><td>$${((it.quantity || 1) * (it.unit_price || 0)).toLocaleString()}</td></tr>`).join('')}
    <tr class="total-row"><td colspan="4" style="text-align:right">合計</td><td>$${total.toLocaleString()}</td></tr>
    <tr class="total-row"><td colspan="4" style="text-align:right">含稅合計 (5%)</td><td>$${Math.round(total * 1.05).toLocaleString()}</td></tr></tbody></table>
    <div class="sign-area"><div class="sign-box"><div class="sign-line">客戶簽章</div></div><div class="sign-box"><div class="sign-line">承辦人</div></div><div class="sign-box"><div class="sign-line">主管核准</div></div></div>
    <div class="footer">瓦當麥可創意整合股份有限公司 · 此報價單由 WDMC ERP 系統生成</div>
    <script>window.print()</script></body></html>`);
});

// 合約
router.get('/contract/:id', auth, (req, res) => {
  const contract = db.getById('contracts', req.params.id);
  if (!contract) return res.status(404).json({ error: '合約不存在' });
  const customer = contract.customer_id ? db.getById('customers', contract.customer_id) : null;

  res.send(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>合約 - ${contract.title}</title><style>${CSS}</style></head><body>
    <div class="header"><h1>合 約 書</h1><div class="company">瓦當麥可創意整合股份有限公司</div><div class="doc-no">${contract.contract_number || ''}</div></div>
    <div class="meta">
      <div class="meta-block"><div><span class="label">合約名稱：</span><span class="value">${contract.title}</span></div><div><span class="label">客戶：</span><span class="value">${customer?.name || '-'}</span></div></div>
      <div class="meta-block"><div><span class="label">合約金額：</span><span class="value">$${(contract.amount || 0).toLocaleString()}</span></div><div><span class="label">期間：</span><span class="value">${contract.start_date || ''} ~ ${contract.end_date || ''}</span></div><div><span class="label">狀態：</span><span class="value">${contract.status || ''}</span></div></div>
    </div>
    <div class="section-title">合約條款</div><div style="min-height:200px;padding:10px;border:1px solid #e2e8f0;border-radius:6px;margin-bottom:20px;white-space:pre-wrap">${contract.terms || '（依雙方約定之條款）'}</div>
    <div class="sign-area"><div class="sign-box"><div class="sign-line">甲方（客戶）</div></div><div class="sign-box"><div class="sign-line">乙方（瓦當麥可）</div></div></div>
    <div class="footer">此合約由 WDMC ERP 系統生成 · ${new Date().toLocaleDateString('zh-TW')}</div>
    <script>window.print()</script></body></html>`);
});

// 採購單
router.get('/purchase-order/:id', auth, (req, res) => {
  const po = db.getById('purchase_orders', req.params.id);
  if (!po) return res.status(404).json({ error: '採購單不存在' });
  const vendor = po.vendor_id ? db.getById('vendors', po.vendor_id) : null;
  const project = po.project_id ? db.getById('projects', po.project_id) : null;

  res.send(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>採購單 - ${po.po_number}</title><style>${CSS}</style></head><body>
    <div class="header"><h1>採 購 單</h1><div class="company">瓦當麥可創意整合股份有限公司</div><div class="doc-no">${po.po_number || ''}</div></div>
    <div class="meta">
      <div class="meta-block"><div><span class="label">供應商：</span><span class="value">${vendor?.name || '-'}</span></div><div><span class="label">聯絡人：</span><span class="value">${vendor?.contact_name || '-'}</span></div></div>
      <div class="meta-block"><div><span class="label">關聯專案：</span><span class="value">${project?.name || '-'}</span></div><div><span class="label">採購金額：</span><span class="value">$${(po.total || 0).toLocaleString()}</span></div><div><span class="label">狀態：</span><span class="value">${po.status || ''}</span></div></div>
    </div>
    <table><thead><tr><th>品項</th><th>數量</th><th>單價</th><th>小計</th></tr></thead>
    <tbody>${(po.items || [{ description: po.description || '採購項目', quantity: 1, unit_price: po.total || 0 }]).map(it => `<tr><td>${it.description || ''}</td><td>${it.quantity || 1}</td><td>$${(it.unit_price || 0).toLocaleString()}</td><td>$${((it.quantity || 1) * (it.unit_price || 0)).toLocaleString()}</td></tr>`).join('')}
    <tr class="total-row"><td colspan="3" style="text-align:right">合計</td><td>$${(po.total || 0).toLocaleString()}</td></tr></tbody></table>
    <div class="sign-area"><div class="sign-box"><div class="sign-line">採購人</div></div><div class="sign-box"><div class="sign-line">主管核准</div></div></div>
    <div class="footer">此採購單由 WDMC ERP 系統生成 · ${new Date().toLocaleDateString('zh-TW')}</div>
    <script>window.print()</script></body></html>`);
});

// 財務月報
router.get('/finance-report', auth, (req, res) => {
  const { month } = req.query; // 2026-03
  const prefix = month || new Date().toISOString().slice(0, 7);
  const revenues = db.find('revenues', r => (r.date || r.created_at || '').startsWith(prefix));
  const expenses = db.find('expenses', e => (e.date || e.created_at || '').startsWith(prefix));
  const totalRev = revenues.reduce((s, r) => s + (r.amount || 0), 0);
  const totalExp = expenses.reduce((s, e) => s + (e.amount || 0), 0);
  const profit = totalRev - totalExp;

  res.send(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>財務月報 - ${prefix}</title><style>${CSS}</style></head><body>
    <div class="header"><h1>財 務 月 報</h1><div class="company">瓦當麥可創意整合股份有限公司</div><div class="doc-no">${prefix} 月度報告</div></div>
    <div class="stat-grid">
      <div class="stat-box"><div class="num">$${totalRev.toLocaleString()}</div><div class="lbl">總收入</div></div>
      <div class="stat-box"><div class="num" style="color:#dc2626">$${totalExp.toLocaleString()}</div><div class="lbl">總支出</div></div>
      <div class="stat-box"><div class="num" style="color:${profit >= 0 ? '#16a34a' : '#dc2626'}">$${profit.toLocaleString()}</div><div class="lbl">淨利</div></div>
      <div class="stat-box"><div class="num">${totalRev > 0 ? Math.round(profit / totalRev * 100) : 0}%</div><div class="lbl">利潤率</div></div>
    </div>
    <div class="section-title">收入明細 (${revenues.length} 筆)</div>
    <table><thead><tr><th>日期</th><th>說明</th><th>專案</th><th>金額</th></tr></thead>
    <tbody>${revenues.map(r => { const p = r.project_id ? db.getById('projects', r.project_id) : null; return `<tr><td>${r.date || r.created_at?.slice(0, 10) || ''}</td><td>${r.description || ''}</td><td>${p?.name || '-'}</td><td>$${(r.amount || 0).toLocaleString()}</td></tr>`; }).join('')}
    <tr class="total-row"><td colspan="3" style="text-align:right">小計</td><td>$${totalRev.toLocaleString()}</td></tr></tbody></table>
    <div class="section-title">支出明細 (${expenses.length} 筆)</div>
    <table><thead><tr><th>日期</th><th>說明</th><th>分類</th><th>金額</th></tr></thead>
    <tbody>${expenses.map(e => `<tr><td>${e.date || e.created_at?.slice(0, 10) || ''}</td><td>${e.description || ''}</td><td>${e.category || '-'}</td><td>$${(e.amount || 0).toLocaleString()}</td></tr>`).join('')}
    <tr class="total-row"><td colspan="3" style="text-align:right">小計</td><td>$${totalExp.toLocaleString()}</td></tr></tbody></table>
    <div class="footer">此報表由 WDMC ERP 系統自動生成 · 列印時間 ${new Date().toLocaleString('zh-TW')}</div>
    <script>window.print()</script></body></html>`);
});

// 專案摘要報告
router.get('/project/:id', auth, (req, res) => {
  const project = db.getById('projects', req.params.id);
  if (!project) return res.status(404).json({ error: '專案不存在' });
  const tasks = db.find('project_tasks', t => t.project_id === project.id);
  const customer = project.customer_id ? db.getById('customers', project.customer_id) : null;
  const revenues = db.find('revenues', r => r.project_id === project.id);
  const expenses = db.find('expenses', e => e.project_id === project.id);
  const totalRev = revenues.reduce((s, r) => s + (r.amount || 0), 0);
  const totalExp = expenses.reduce((s, e) => s + (e.amount || 0), 0);
  const doneTasks = tasks.filter(t => t.status === 'done').length;

  res.send(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>專案報告 - ${project.name}</title><style>${CSS}</style></head><body>
    <div class="header"><h1>專 案 摘 要 報 告</h1><div class="company">瓦當麥可創意整合股份有限公司</div></div>
    <div class="meta">
      <div class="meta-block"><div><span class="label">專案名稱：</span><span class="value">${project.name}</span></div><div><span class="label">客戶：</span><span class="value">${customer?.name || '-'}</span></div><div><span class="label">活動類型：</span><span class="value">${project.event_type || '-'}</span></div></div>
      <div class="meta-block"><div><span class="label">狀態：</span><span class="value">${project.status || '-'}</span></div><div><span class="label">預算：</span><span class="value">$${(project.budget || 0).toLocaleString()}</span></div><div><span class="label">活動日期：</span><span class="value">${project.event_date || '-'}</span></div></div>
    </div>
    <div class="stat-grid">
      <div class="stat-box"><div class="num">${tasks.length}</div><div class="lbl">總任務</div></div>
      <div class="stat-box"><div class="num">${doneTasks}</div><div class="lbl">已完成</div></div>
      <div class="stat-box"><div class="num">${tasks.length ? Math.round(doneTasks / tasks.length * 100) : 0}%</div><div class="lbl">進度</div></div>
      <div class="stat-box"><div class="num" style="color:${totalRev - totalExp >= 0 ? '#16a34a' : '#dc2626'}">$${(totalRev - totalExp).toLocaleString()}</div><div class="lbl">損益</div></div>
    </div>
    <div class="section-title">任務清單</div>
    <table><thead><tr><th>任務</th><th>負責人</th><th>狀態</th><th>截止日</th></tr></thead>
    <tbody>${tasks.map(t => `<tr><td>${t.title}</td><td>${t.assignee || '-'}</td><td>${t.status === 'done' ? '✅ 完成' : t.status === 'in_progress' ? '🔄 進行中' : '⬜ 待辦'}</td><td>${t.due_date || '-'}</td></tr>`).join('')}</tbody></table>
    <div class="footer">此報告由 WDMC ERP 系統生成 · ${new Date().toLocaleDateString('zh-TW')}</div>
    <script>window.print()</script></body></html>`);
});

module.exports = router;
