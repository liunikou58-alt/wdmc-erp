/**
 * 全模組 Demo 資料種子 — 每個模組 10 筆
 * 執行: node server/seed-all-demo.js
 */
const { v4: uuidv4 } = require('uuid');
const db = require('./db');
const uid = () => uuidv4();

// ─── 清除舊 demo ───
console.log('🧹 清除舊資料...');
['contracts','vendors','payments','event_flows','purchase_orders',
 'project_tasks','project_milestones','project_documents'].forEach(col => {
  try { const all = db.getAll(col); all.forEach(r => db.remove(col, r.id)); } catch {}
});
// form_records 已經在外部直接清除了，不需要在這裡慢慢刪
console.log('  ✅ 清除完成');

// ─── 合約 ───
console.log('\n📃 合約管理 (10 筆)');
const contractData = [
  { name: '113年台中市文化局音樂節', client: '台中市文化局', amount: 2800000, status: '執行中', start: '2025-03-01', end: '2025-09-30' },
  { name: '寶成集團2025家庭日', client: '寶成工業', amount: 1500000, status: '已簽約', start: '2025-06-01', end: '2025-06-15' },
  { name: '中科園區五一勞動節活動', client: '中科管理局', amount: 800000, status: '執行中', start: '2025-04-20', end: '2025-05-05' },
  { name: '苗栗客家文化節', client: '苗栗縣政府', amount: 3500000, status: '已簽約', start: '2025-07-01', end: '2025-08-31' },
  { name: '彰化縣環保宣導活動', client: '彰化縣環保局', amount: 450000, status: '已完成', start: '2025-01-15', end: '2025-02-28' },
  { name: 'FUSO商用車發表會', client: '台灣戴姆勒', amount: 1200000, status: '報價中', start: '2025-08-01', end: '2025-08-10' },
  { name: '全國電子50週年慶', client: '全國電子', amount: 2000000, status: '已簽約', start: '2025-06-05', end: '2025-06-08' },
  { name: '南投縣花卉嘉年華', client: '南投縣政府', amount: 900000, status: '執行中', start: '2025-03-15', end: '2025-04-15' },
  { name: '台中港區藝文活動', client: '台中港管理局', amount: 650000, status: '報價中', start: '2025-09-01', end: '2025-09-15' },
  { name: 'cosway年度經銷商晚會', client: '科士威', amount: 550000, status: '已完成', start: '2025-02-10', end: '2025-02-12' },
];
contractData.forEach((c, i) => {
  db.insert('contracts', { id: uid(), contract_no: `CT-2025-${String(i+1).padStart(3,'0')}`, name: c.name, client_name: c.client, total_amount: c.amount, status: c.status, start_date: c.start, end_date: c.end, created_by: 'demo', created_at: new Date().toISOString() });
  console.log(`  ✅ ${c.name}`);
});

// ─── 專案 ───
console.log('\n📁 專案管理 (10 筆)');
// 先清現有
try { db.getAll('projects').forEach(p => db.remove('projects', p.id)); } catch {}
const projectData = [
  { name: '113年台中市音樂節專案', status: '進行中', pm: '路巧妙', budget: 2800000 },
  { name: '寶成集團家庭日專案', status: '規劃中', pm: '沈玫言', budget: 1500000 },
  { name: '中科五一勞動節表揚', status: '進行中', pm: '路巧妙', budget: 800000 },
  { name: '苗栗客家文化節統籌', status: '規劃中', pm: '沈玫言', budget: 3500000 },
  { name: '彰化環保宣導結案', status: '已完成', pm: '路巧妙', budget: 450000 },
  { name: 'FUSO發表會提案', status: '提案中', pm: 'WD Michael', budget: 1200000 },
  { name: '全國電子50週年規劃', status: '規劃中', pm: '沈玫言', budget: 2000000 },
  { name: '南投花卉嘉年華執行', status: '進行中', pm: '路巧妙', budget: 900000 },
  { name: '台中港區藝文提案', status: '提案中', pm: 'WD Michael', budget: 650000 },
  { name: 'cosway晚會結案', status: '已完成', pm: '沈玫言', budget: 550000 },
];
projectData.forEach((p, i) => {
  db.insert('projects', { id: uid(), project_no: `PJ-2025-${String(i+1).padStart(3,'0')}`, name: p.name, status: p.status, project_manager: p.pm, budget: p.budget, progress: p.status === '已完成' ? 100 : p.status === '進行中' ? 60 : 20, created_by: 'demo', created_at: new Date().toISOString() });
  console.log(`  ✅ ${p.name}`);
});

// ─── 廠商 ───
console.log('\n📦 廠商管理 (10 筆)');
const vendorData = [
  { name: '樂頻粒子有限公司', short: '樂頻粒子', contact: '詹育穎', phone: '0989323511', service: '系統開發', bank: '永豐銀行', account: '03801800263107' },
  { name: '炎洲流通股份有限公司', short: '炎洲', contact: '林尚賢', phone: '0977000535', service: '飲用水/雨衣', bank: '第一銀行', account: '145-10-067520' },
  { name: '統欣生物科技', short: '統欣', contact: '王小姐', phone: '0912345678', service: '贈品製作', bank: '合作金庫', account: '1234567890' },
  { name: '宏碩舞台', short: '宏碩', contact: '陳經理', phone: '0923456789', service: '舞台搭建', bank: '台灣銀行', account: '0987654321' },
  { name: '力晶音響', short: '力晶', contact: '李先生', phone: '0934567890', service: '音響租賃', bank: '中國信託', account: '5678901234' },
  { name: '彩虹印刷', short: '彩虹', contact: '張經理', phone: '0945678901', service: '印刷輸出', bank: '華南銀行', account: '3456789012' },
  { name: '大千攝影', short: '大千', contact: '劉攝影師', phone: '0956789012', service: '攝影/錄影', bank: '玉山銀行', account: '9012345678' },
  { name: '花漾設計', short: '花漾', contact: '林設計師', phone: '0967890123', service: '視覺設計', bank: '台北富邦', account: '4567890123' },
  { name: '美味便當', short: '美味', contact: '王老闆', phone: '0978901234', service: '餐飲供應', bank: '彰化銀行', account: '7890123456' },
  { name: '快達物流', short: '快達', contact: '吳經理', phone: '0989012345', service: '物流運輸', bank: '國泰世華', account: '2345678901' },
];
vendorData.forEach((v, i) => {
  db.insert('vendors', { id: uid(), vendor_no: `V${String(i+1).padStart(5,'0')}`, name: v.name, short_name: v.short, contact: v.contact, phone: v.phone, service: v.service, bank_name: v.bank, bank_account: v.account, payment_method: '匯款', payment_terms: '月結30', status: 'active', created_by: 'demo', created_at: new Date().toISOString() });
  console.log(`  ✅ ${v.name}`);
});

// ─── 請付款單 ───
console.log('\n💵 請付款/零用金 (10 筆)');
const paymentData = [
  { title: '中科五一活動-舞台搭建', vendor: '宏碩舞台', amount: 180000, type: '活動請付款', status: '待審核' },
  { title: '中科五一活動-音響租賃', vendor: '力晶音響', amount: 85000, type: '活動請付款', status: '已核准' },
  { title: '寶成家庭日-印刷輸出', vendor: '彩虹印刷', amount: 32000, type: '活動請付款', status: '已付款' },
  { title: '辦公用品採購', vendor: '文具王', amount: 5600, type: '公司請付款', status: '待審核' },
  { title: '台中音樂節-餐飲費', vendor: '美味便當', amount: 28000, type: '活動零用金', status: '已核准' },
  { title: '苗栗文化節-交通費', vendor: '快達物流', amount: 15000, type: '活動請付款', status: '待審核' },
  { title: '全國電子-視覺設計', vendor: '花漾設計', amount: 45000, type: '活動請付款', status: '已付款' },
  { title: '公司水電費-3月', vendor: '台電', amount: 12000, type: '公司請付款', status: '已付款' },
  { title: 'FUSO發表會-攝影', vendor: '大千攝影', amount: 35000, type: '活動請付款', status: '待審核' },
  { title: '南投花卉-贈品製作', vendor: '統欣生物', amount: 22000, type: '活動請付款', status: '已核准' },
];
paymentData.forEach((p, i) => {
  db.insert('payments', { id: uid(), payment_no: `PAY-2025-${String(i+1).padStart(3,'0')}`, title: p.title, vendor_name: p.vendor, amount: p.amount, payment_type: p.type, status: p.status, created_by: 'demo', created_at: new Date().toISOString() });
  console.log(`  ✅ ${p.title}`);
});

// ─── 活動流程 ───
console.log('\n📋 活動流程 (10 筆)');
const flowData = [
  { name: '中科五一勞動節', venue: '葳格國際會議中心', date: '2025-04-25', start: '09:00', end: '12:00', mc: 'Emma' },
  { name: '寶成家庭日', venue: '彰化寶成廠區', date: '2025-06-07', start: '10:00', end: '17:00', mc: 'Amber' },
  { name: '台中音樂節-開幕', venue: '台中市民廣場', date: '2025-09-13', start: '18:00', end: '22:00', mc: 'Emma' },
  { name: '苗栗客家文化節-開幕式', venue: '苗栗文化園區', date: '2025-07-05', start: '09:30', end: '12:00', mc: 'Amber' },
  { name: '全國電子50週年典禮', venue: '全國電子竹北門市', date: '2025-06-05', start: '13:00', end: '15:00', mc: 'Kitty' },
  { name: '南投花卉-市集活動', venue: '南投縣文化中心', date: '2025-03-22', start: '10:00', end: '16:00', mc: 'Emma' },
  { name: 'FUSO新車發表', venue: '台中裕隆城', date: '2025-08-05', start: '14:00', end: '17:00', mc: 'Amber' },
  { name: 'cosway經銷商晚宴', venue: '台中金典酒店', date: '2025-02-10', start: '18:00', end: '21:00', mc: 'Emma' },
  { name: '彰化環保宣導', venue: '彰化縣政府前廣場', date: '2025-02-20', start: '09:00', end: '12:00', mc: 'Kitty' },
  { name: '台中港區藝文展', venue: '梧棲藝文中心', date: '2025-09-06', start: '10:00', end: '17:00', mc: 'Amber' },
];
flowData.forEach((f, i) => {
  db.insert('event_flows', { id: uid(), name: f.name, venue: f.venue, event_date: f.date, start_time: f.start, end_time: f.end, mc_name: f.mc, status: 'confirmed', created_by: 'demo', created_at: new Date().toISOString() });
  console.log(`  ✅ ${f.name}`);
});

// ─── 採購單 ───
console.log('\n🛒 採購單 (10 筆)');
const poData = [
  { title: '中科活動-帳篷租賃', vendor: '宏碩舞台', amount: 25000, event: '中科五一' },
  { title: '中科活動-飲用水', vendor: '炎洲', amount: 8000, event: '中科五一' },
  { title: '寶成家庭日-遊戲道具', vendor: '統欣', amount: 15000, event: '寶成家庭日' },
  { title: '音樂節-LED螢幕', vendor: '力晶音響', amount: 120000, event: '台中音樂節' },
  { title: '音樂節-舞台特效', vendor: '宏碩舞台', amount: 80000, event: '台中音樂節' },
  { title: '全國電子-背板輸出', vendor: '彩虹印刷', amount: 18000, event: '全國電子50週年' },
  { title: '苗栗文化節-攤位搭建', vendor: '宏碩舞台', amount: 45000, event: '苗栗客家文化節' },
  { title: '南投花卉-花卉佈置', vendor: '花漾設計', amount: 35000, event: '南投花卉嘉年華' },
  { title: 'FUSO-展示架製作', vendor: '彩虹印刷', amount: 28000, event: 'FUSO發表會' },
  { title: 'cosway-紅毯地毯', vendor: '快達物流', amount: 12000, event: 'cosway晚會' },
];
poData.forEach((p, i) => {
  db.insert('purchase_orders', { id: uid(), po_no: `PO-2025-${String(i+1).padStart(3,'0')}`, title: p.title, vendor_name: p.vendor, amount: p.amount, event_name: p.event, status: i < 5 ? '已核准' : '待核准', created_by: 'demo', created_at: new Date().toISOString() });
  console.log(`  ✅ ${p.title}`);
});

console.log('\n════════════════════════════════════════');
console.log('🎉 Demo 資料種完！');

// 統計
const stats = ['users','customers','proposals','contracts','projects','vendors',
  'labor_reports','payments','inventory_items','resources','deposits',
  'event_flows','purchase_orders','form_schemas','form_records','form_folders'];
console.log('\n📊 各模組數量：');
stats.forEach(c => {
  try { console.log(`  ${c}: ${db.getAll(c).length}`); } catch { console.log(`  ${c}: N/A`); }
});
