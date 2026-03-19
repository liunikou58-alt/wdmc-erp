/**
 * 全面 Demo 資料一次灌入 — 直接寫 db.json
 * 解決之前 db adapter 與獨立 JSON 檔的不一致問題
 */
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

const DB_PATH = 'd:/AG-NICO/ADG2.0/erptw/wdmc-erp/data/db.json';
const uid = () => uuidv4();
const now = () => new Date().toISOString();
const date = (d) => `2025-${d}`;

// 讀取
const db = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
const userIds = db.users.map(u => u.id);
const projIds = db.projects.map(p => p.id);
const custIds = db.customers.map(c => c.id);

function seed(col, items) {
  if (!db[col]) db[col] = [];
  items.forEach(i => { i.id = i.id || uid(); i.created_at = i.created_at || now(); db[col].push(i); });
  console.log(`  ✅ ${col}: +${items.length} (total: ${db[col].length})`);
}

console.log('🚀 全面 Demo 資料灌入...\n');

// ─── 營收 ───
if (!db.revenues?.length) seed('revenues', [
  { description: '台中音樂節-第一期', amount: 840000, project_id: projIds[0], customer_id: custIds[0], date: date('03-15'), status: 'received' },
  { description: '台中音樂節-第二期', amount: 840000, project_id: projIds[0], customer_id: custIds[0], date: date('06-15'), status: 'pending' },
  { description: '寶成家庭日-全款', amount: 1500000, project_id: projIds[1], customer_id: custIds[1], date: date('05-20'), status: 'received' },
  { description: '中科五一-第一期', amount: 400000, project_id: projIds[2], customer_id: custIds[2], date: date('04-01'), status: 'received' },
  { description: '中科五一-尾款', amount: 400000, project_id: projIds[2], customer_id: custIds[2], date: date('05-10'), status: 'pending' },
  { description: '苗栗文化節-訂金', amount: 1050000, project_id: projIds[3], customer_id: custIds[3], date: date('06-15'), status: 'received' },
  { description: '彰化環保-尾款', amount: 225000, project_id: projIds[4], customer_id: custIds[4], date: date('03-05'), status: 'received' },
  { description: '全國電子50週年', amount: 2000000, project_id: projIds[6], customer_id: custIds[5], date: date('06-01'), status: 'received' },
  { description: '南投花卉-全款', amount: 900000, project_id: projIds[7], customer_id: custIds[6], date: date('03-10'), status: 'received' },
  { description: 'cosway晚會-全款', amount: 550000, project_id: projIds[9], customer_id: custIds[7], date: date('02-05'), status: 'received' },
]);

// ─── 支出 ───
if (!db.expenses?.length) seed('expenses', [
  { description: '台中音樂節-舞台費', amount: 350000, project_id: projIds[0], category: '舞台搭建', date: date('03-20') },
  { description: '台中音樂節-音響', amount: 180000, project_id: projIds[0], category: '設備租賃', date: date('03-22') },
  { description: '寶成家庭日-場地佈置', amount: 280000, project_id: projIds[1], category: '場地佈置', date: date('05-25') },
  { description: '中科五一-餐飲', amount: 85000, project_id: projIds[2], category: '餐飲', date: date('04-22') },
  { description: '苗栗文化節-印刷', amount: 65000, project_id: projIds[3], category: '印刷輸出', date: date('06-20') },
  { description: '全國電子-攝影團隊', amount: 120000, project_id: projIds[6], category: '攝影', date: date('06-03') },
  { description: '南投花卉-花卉佈置', amount: 150000, project_id: projIds[7], category: '場地佈置', date: date('03-15') },
  { description: '辦公室租金-3月', amount: 45000, category: '辦公費用', date: date('03-01') },
  { description: '員工薪資-3月', amount: 380000, category: '人事費用', date: date('03-05') },
  { description: '車輛油費-3月', amount: 12000, category: '交通費', date: date('03-28') },
]);

// ─── 發票 ───
if (!db.invoices?.length) seed('invoices', [
  { invoice_no: 'INV-2025-001', customer_name: '台中市文化局', amount: 840000, tax: 42000, total: 882000, status: 'paid', date: date('03-15') },
  { invoice_no: 'INV-2025-002', customer_name: '寶成工業', amount: 1500000, tax: 75000, total: 1575000, status: 'paid', date: date('05-20') },
  { invoice_no: 'INV-2025-003', customer_name: '中科管理局', amount: 400000, tax: 20000, total: 420000, status: 'paid', date: date('04-01') },
  { invoice_no: 'INV-2025-004', customer_name: '中科管理局', amount: 400000, tax: 20000, total: 420000, status: 'pending', date: date('05-10') },
  { invoice_no: 'INV-2025-005', customer_name: '苗栗縣政府', amount: 1050000, tax: 52500, total: 1102500, status: 'paid', date: date('06-15') },
  { invoice_no: 'INV-2025-006', customer_name: '彰化縣環保局', amount: 225000, tax: 11250, total: 236250, status: 'paid', date: date('03-05') },
  { invoice_no: 'INV-2025-007', customer_name: '全國電子', amount: 2000000, tax: 100000, total: 2100000, status: 'paid', date: date('06-01') },
  { invoice_no: 'INV-2025-008', customer_name: '南投縣政府', amount: 900000, tax: 45000, total: 945000, status: 'paid', date: date('03-10') },
  { invoice_no: 'INV-2025-009', customer_name: '科士威', amount: 550000, tax: 27500, total: 577500, status: 'paid', date: date('02-05') },
  { invoice_no: 'INV-2025-010', customer_name: '台灣戴姆勒', amount: 1200000, tax: 60000, total: 1260000, status: 'draft', date: date('07-20') },
]);

// ─── 資產設備 ───
if (!db.assets?.length) seed('assets', [
  { name: 'YAMAHA QL5 混音器', category: '音響設備', serial: 'QL5-2023-001', status: 'available', location: '公司倉庫', value: 280000 },
  { name: 'JBL VTX A12 喇叭組 (8對)', category: '音響設備', serial: 'VTX-2022-008', status: 'available', location: '公司倉庫', value: 960000 },
  { name: 'MA Lighting grandMA3', category: '燈光設備', serial: 'MA3-2024-001', status: 'in_use', location: '台中音樂節現場', value: 350000 },
  { name: 'TOYOTA HIACE 廂型車', category: '車輛', serial: 'ADY-3698', status: 'available', location: '公司停車場', value: 850000 },
  { name: 'Canon EOS R5 攝影機', category: '攝影設備', serial: 'R5-2023-002', status: 'available', location: '辦公室', value: 98000 },
  { name: '3M x 3M 帳篷 (20頂)', category: '搭建器材', serial: 'TENT-3x3-20', status: 'available', location: '公司倉庫', value: 120000 },
  { name: 'LED P3.9 室外屏 (50㎡)', category: '視覺設備', serial: 'LED-P39-2023', status: 'in_use', location: '南投花卉現場', value: 1500000 },
  { name: 'Shure ULXD 無線麥克風 (10支)', category: '音響設備', serial: 'ULXD-SET-10', status: 'available', location: '公司倉庫', value: 180000 },
  { name: '發電機 100KVA', category: '電力設備', serial: 'GEN-100K-001', status: 'available', location: '公司倉庫', value: 250000 },
  { name: 'MacBook Pro 16吋 (3台)', category: '辦公設備', serial: 'MBP-2024-003', status: 'available', location: '辦公室', value: 210000 },
]);

// ─── 行事曆 ───
if (!db.calendar_events?.length) seed('calendar_events', [
  { title: '台中音樂節進場日', start: '2025-09-10T08:00', end: '2025-09-10T18:00', type: 'event', color: '#6366f1' },
  { title: '台中音樂節 Day1', start: '2025-09-13T16:00', end: '2025-09-13T22:00', type: 'event', color: '#6366f1' },
  { title: '台中音樂節 Day2', start: '2025-09-14T16:00', end: '2025-09-14T22:00', type: 'event', color: '#6366f1' },
  { title: '寶成家庭日', start: '2025-06-07T08:00', end: '2025-06-07T18:00', type: 'event', color: '#f59e0b' },
  { title: '中科五一勞動節活動', start: '2025-04-25T08:00', end: '2025-04-25T13:00', type: 'event', color: '#10b981' },
  { title: '全國電子50週年', start: '2025-06-05T12:00', end: '2025-06-05T16:00', type: 'event', color: '#ef4444' },
  { title: '苗栗客家文化節(開幕)', start: '2025-07-05T09:00', end: '2025-07-05T12:00', type: 'event', color: '#8b5cf6' },
  { title: '公司月會', start: '2025-04-07T14:00', end: '2025-04-07T15:30', type: 'meeting', color: '#64748b' },
  { title: 'FUSO提案會議', start: '2025-07-15T10:00', end: '2025-07-15T12:00', type: 'meeting', color: '#64748b' },
  { title: '南投花卉嘉年華', start: '2025-03-22T09:00', end: '2025-03-23T17:00', type: 'event', color: '#ec4899' },
]);

// ─── 排班 ───
if (!db.schedules?.length) seed('schedules', [
  { user_name: '路巧妙', user_id: userIds[1], project_name: '台中音樂節', role: '專案經理', start_date: '2025-09-10', end_date: '2025-09-15', location: '台中市民廣場', user_avatar_color: '#6366f1' },
  { user_name: '沈玫言', user_id: userIds[2], project_name: '寶成家庭日', role: '專案經理', start_date: '2025-06-05', end_date: '2025-06-08', location: '彰化寶成廠區', user_avatar_color: '#ec4899' },
  { user_name: 'Emma', user_id: userIds[3], project_name: '中科五一', role: '主持人', start_date: '2025-04-25', end_date: '2025-04-25', location: '葳格國際會議中心', user_avatar_color: '#f59e0b' },
  { user_name: '阿德', user_id: userIds[4], project_name: '台中音樂節', role: '舞台監督', start_date: '2025-09-10', end_date: '2025-09-15', location: '台中市民廣場', user_avatar_color: '#10b981' },
  { user_name: '小方', user_id: userIds[5], project_name: '中科五一', role: '場控', start_date: '2025-04-24', end_date: '2025-04-25', location: '葳格國際會議中心', user_avatar_color: '#8b5cf6' },
  { user_name: 'Amber', user_id: userIds[6], project_name: '苗栗客家文化節', role: '主持人', start_date: '2025-07-05', end_date: '2025-07-05', location: '苗栗文化園區', user_avatar_color: '#ef4444' },
  { user_name: '路巧妙', user_id: userIds[1], project_name: '南投花卉', role: '現場總監', start_date: '2025-03-21', end_date: '2025-03-23', location: '南投文化中心', user_avatar_color: '#6366f1' },
  { user_name: 'Emma', user_id: userIds[3], project_name: '全國電子50週年', role: '主持人', start_date: '2025-06-05', end_date: '2025-06-05', location: '全國電子竹北門市', user_avatar_color: '#f59e0b' },
  { user_name: '阿德', user_id: userIds[4], project_name: '寶成家庭日', role: '場控', start_date: '2025-06-06', end_date: '2025-06-08', location: '彰化寶成廠區', user_avatar_color: '#10b981' },
  { user_name: '小方', user_id: userIds[5], project_name: 'cosway晚會', role: '場控', start_date: '2025-02-10', end_date: '2025-02-10', location: '台中金典酒店', user_avatar_color: '#8b5cf6' },
]);

// ─── 專案任務 ───
if (!db.project_tasks?.length) {
  const tasks = [];
  [['場勘',5],['提案簡報',15],['報價確認',10],['合約簽訂',5],['供應商發包',20],['舞台設計',30],['節目規劃',25],['人力調度',15],['進場搭建',40],['彩排',10],['正式執行',50],['撤場',20],['結案報告',10]].forEach(([name,h],i) => {
    tasks.push({ project_id: projIds[0], name, status: i<6?'completed':i<10?'in_progress':'pending', priority: i<3?'high':'medium', assigned_to: userIds[i%userIds.length], estimated_hours: h, order: i });
  });
  seed('project_tasks', tasks);
}

// ─── 專案里程碑 ───
if (!db.project_milestones?.length) seed('project_milestones', [
  { project_id: projIds[0], name: '合約簽訂', date: date('03-01'), status: 'completed' },
  { project_id: projIds[0], name: '設計完稿', date: date('06-30'), status: 'in_progress' },
  { project_id: projIds[0], name: '進場搭建', date: date('09-10'), status: 'pending' },
  { project_id: projIds[0], name: '正式演出', date: date('09-13'), status: 'pending' },
  { project_id: projIds[0], name: '結案', date: date('09-30'), status: 'pending' },
  { project_id: projIds[1], name: '提案通過', date: date('04-15'), status: 'completed' },
  { project_id: projIds[1], name: '活動執行', date: date('06-07'), status: 'pending' },
  { project_id: projIds[2], name: '合約簽訂', date: date('03-20'), status: 'completed' },
  { project_id: projIds[2], name: '活動執行', date: date('04-25'), status: 'in_progress' },
  { project_id: projIds[2], name: '結案', date: date('05-10'), status: 'pending' },
]);

// ─── 執行清單 ───
if (!db.checklists?.length) seed('checklists', [
  { title: '台中音樂節-進場清單', project_name: '台中音樂節', status: 'active', total_items: 12, completed_items: 5 },
  { title: '寶成家庭日-準備清單', project_name: '寶成家庭日', status: 'active', total_items: 8, completed_items: 3 },
  { title: '中科五一-物品清單', project_name: '中科五一', status: 'active', total_items: 15, completed_items: 10 },
  { title: '苗栗文化節-進場清單', project_name: '苗栗客家文化節', status: 'draft', total_items: 10, completed_items: 0 },
  { title: '全國電子-現場確認表', project_name: '全國電子50週年', status: 'active', total_items: 6, completed_items: 2 },
]);

// ─── 審批 ───
if (!db.approvals?.length) seed('approvals', [
  { title: '中科五一活動-舞台搭建費', type: '請付款', amount: 180000, requester: '路巧妙', status: 'pending', priority: 'high' },
  { title: 'FUSO發表會-攝影費', type: '請付款', amount: 35000, requester: '沈玫言', status: 'pending', priority: 'medium' },
  { title: '中科五一-飲用水採購', type: '採購單', amount: 8000, requester: '小方', status: 'pending', priority: 'low' },
  { title: '苗栗文化節-交通費', type: '請付款', amount: 15000, requester: '路巧妙', status: 'pending', priority: 'medium' },
  { title: '音樂節-LED螢幕租賃', type: '採購單', amount: 120000, requester: '阿德', status: 'approved', priority: 'high' },
  { title: '寶成家庭日-印刷費', type: '請付款', amount: 32000, requester: '沈玫言', status: 'approved', priority: 'medium' },
  { title: '辦公用品採購', type: '公司採購', amount: 5600, requester: '行政', status: 'pending', priority: 'low' },
  { title: '南投花卉-贈品製作', type: '請付款', amount: 22000, requester: '路巧妙', status: 'approved', priority: 'medium' },
  { title: '全國電子-視覺設計費', type: '請付款', amount: 45000, requester: '沈玫言', status: 'rejected', priority: 'medium' },
  { title: '台中音樂節-餐飲費', type: '活動零用金', amount: 28000, requester: 'Emma', status: 'pending', priority: 'medium' },
]);

// ─── 知識庫 ───
if (!db.knowledge_base?.length) seed('knowledge_base', [
  { title: '活動現場 SOP 手冊', category: 'SOP', content: '一、進場流程\n1. 確認場地平面圖\n2. 卸貨區規劃\n3. 舞台搭建順序\n4. 音響/燈光架設\n5. 電力配置確認\n\n二、執行流程\n1. 彩排時間表\n2. 主持人 cue 表\n3. 緊急應變計畫', author: 'WD Michael', tags: ['SOP','現場','流程'] },
  { title: '報價單製作規範', category: '規範', content: '1. 報價單需包含：項目名稱、數量、單價、小計\n2. 稅額另計（5%）\n3. 付款條件：簽約50%、完工驗收50%\n4. 報價有效期：30天', author: '路巧妙', tags: ['報價','規範'] },
  { title: '廠商評鑑標準', category: '規範', content: '評分項目：\n1. 品質（30%）\n2. 價格（25%）\n3. 交期（20%）\n4. 服務態度（15%）\n5. 售後服務（10%）', author: '沈玫言', tags: ['廠商','評鑑'] },
  { title: '公司車輛使用規定', category: '行政', content: '1. 需提前一天登記\n2. 出車前檢查油量\n3. 歸還時清潔車內\n4. 高速公路過路費報公司零用金', author: '行政', tags: ['車輛','行政'] },
  { title: '勞報單填寫說明', category: 'SOP', content: '1. 填寫工作人員真實姓名\n2. 身分證字號需正確\n3. 銀行帳號需為本人\n4. 單日上限 $5,000\n5. 需附工作照片', author: '會計', tags: ['勞報','SOP'] },
]);

// ─── 客戶案件 ───
if (!db.customer_cases?.length) seed('customer_cases', [
  { customer_id: custIds[0], title: '2025年度音樂節統籌', status: 'active', value: 2800000, contact: '林處長' },
  { customer_id: custIds[1], title: '寶成家庭日整體規劃', status: 'active', value: 1500000, contact: '陳經理' },
  { customer_id: custIds[2], title: '中科五一勞動節活動', status: 'won', value: 800000, contact: '王組長' },
  { customer_id: custIds[3], title: '苗栗客家文化節', status: 'active', value: 3500000, contact: '張科長' },
  { customer_id: custIds[4], title: '環保宣導系列活動', status: 'closed', value: 450000, contact: '李專員' },
  { customer_id: custIds[0], title: '2025跨年晚會提案', status: 'proposal', value: 5000000, contact: '林處長' },
]);

// ─── 硬體需求 ───
if (!db.hardware_requirements?.length) seed('hardware_requirements', [
  { event_name: '台中音樂節', item: 'LED螢幕 P3.9 (50㎡)', qty: 1, status: '已確認', vendor: '力晶音響' },
  { event_name: '台中音樂節', item: 'JBL VTX A12 喇叭組', qty: 2, status: '已確認', vendor: '自有' },
  { event_name: '台中音樂節', item: '舞台 12m x 8m', qty: 1, status: '已確認', vendor: '宏碩舞台' },
  { event_name: '寶成家庭日', item: '帳篷 3x3', qty: 15, status: '待確認', vendor: '宏碩舞台' },
  { event_name: '寶成家庭日', item: '充氣城堡', qty: 2, status: '待確認', vendor: '統欣' },
  { event_name: '中科五一', item: '投影機 10000流明', qty: 1, status: '已確認', vendor: '力晶音響' },
]);

// ─── 活動分類 ───
if (!db.event_categories?.length) seed('event_categories', [
  { name: '政府標案', code: 'GOV', color: '#6366f1' },
  { name: '企業活動', code: 'CORP', color: '#f59e0b' },
  { name: '音樂節/演唱會', code: 'MUSIC', color: '#ec4899' },
  { name: '展覽/發表會', code: 'EXPO', color: '#10b981' },
  { name: '家庭日/員工活動', code: 'FAMILY', color: '#8b5cf6' },
  { name: '記者會', code: 'PRESS', color: '#64748b' },
]);

// ─── 採購分類 ───
if (!db.po_categories?.length) seed('po_categories', [
  { name: '舞台搭建', code: 'STAGE' },
  { name: '音響設備', code: 'AUDIO' },
  { name: '燈光設備', code: 'LIGHT' },
  { name: '視覺/印刷', code: 'VISUAL' },
  { name: '餐飲', code: 'FOOD' },
  { name: '交通運輸', code: 'TRANSPORT' },
  { name: '辦公用品', code: 'OFFICE' },
]);

console.log('\n💾 寫入 db.json...');
fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), 'utf8');
const size = Math.round(fs.statSync(DB_PATH).size / 1024);
console.log(`✅ 完成！db.json: ${size}KB`);

// 統計
console.log('\n📊 全模組統計:');
Object.keys(db).forEach(k => {
  if (Array.isArray(db[k])) {
    const n = db[k].length;
    console.log(`  ${n > 0 ? '✅' : '⬜'} ${k}: ${n}`);
  }
});
