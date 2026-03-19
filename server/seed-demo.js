/**
 * Demo 資料種子 — 給客戶展示用
 * 執行: node server/seed-demo.js
 */
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const db = require('./db');

// === Helpers ===
const uid = () => uuidv4();
const date = (offset = 0) => {
  const d = new Date(); d.setDate(d.getDate() + offset);
  return d.toISOString().slice(0, 10);
};
const pick = arr => arr[Math.floor(Math.random() * arr.length)];

// === 確保有 admin ===
const users = db.getAll('users');
let admin = users.find(u => u.username === 'admin');
if (!admin) {
  admin = db.insert('users', { id: uid(), username: 'admin', password_hash: bcrypt.hashSync('admin123', 10), display_name: '系統管理員', email: 'admin@wdmc.com', role: 'admin', is_active: true, avatar_color: '#6366f1' });
}

// 新增 demo 用戶
const demoUsers = [
  { username: 'jessica', display_name: '陳佳琪', role: 'manager', email: 'jessica@wdmc.com', avatar_color: '#ec4899' },
  { username: 'david', display_name: '王大衛', role: 'planner', email: 'david@wdmc.com', avatar_color: '#8b5cf6' },
  { username: 'amber', display_name: '林琥珀', role: 'staff', email: 'amber@wdmc.com', avatar_color: '#f59e0b' },
  { username: 'kevin', display_name: '張凱文', role: 'staff', email: 'kevin@wdmc.com', avatar_color: '#10b981' },
];
const userIds = [admin.id];
demoUsers.forEach(u => {
  let existing = db.findOne('users', x => x.username === u.username);
  if (!existing) {
    existing = db.insert('users', { id: uid(), ...u, password_hash: bcrypt.hashSync('demo123', 10), is_active: true });
  }
  userIds.push(existing.id);
});

// === 客戶 ===
const customerData = [
  { name: '巨元實業股份有限公司', contact: '李明宏', phone: '02-2345-6789', email: 'lee@juyuan.com', address: '台北市信義區松仁路100號' },
  { name: '和順利汽車股份有限公司', contact: '張瑋倫', phone: '04-2345-6789', email: 'chang@hsl.com', address: '台中市西屯區台灣大道四段500號' },
  { name: '國立中興高級中學', contact: '王淑芬', phone: '049-233-1234', email: 'wang@chhs.edu.tw', address: '南投縣草屯鎮中正路568號' },
  { name: '台中市室內設計裝修商業同業公會', contact: '陳建志', phone: '04-2222-3333', email: 'chen@tcid.org.tw', address: '台中市西區民生路380號' },
  { name: '慶昇醫療社團法人慶昇醫院', contact: '林志成', phone: '04-2233-4455', email: 'lin@cshosp.com', address: '台中市南區復興路三段362號' },
  { name: '華泰電子（股）公司職工福利委員會', contact: '鄭雅文', phone: '03-578-1234', email: 'cheng@htc.com', address: '新竹市科學園區工業東二路1號' },
  { name: '臺中市工商發展投資策進會', contact: '黃昭明', phone: '04-2228-9111', email: 'huang@invest-tc.gov.tw', address: '台中市西屯區台灣大道三段99號' },
  { name: '德儀股份有限公司', contact: '蔡宗翰', phone: '03-567-8901', email: 'tsai@deyi.com', address: '新竹科學園區研新三路1號' },
  { name: '伊甸基金會', contact: '周雅玲', phone: '02-2230-6685', email: 'chou@eden.org.tw', address: '台北市萬華區艋舺大道184號' },
  { name: '自我音樂國際有限公司', contact: '吳宗霖', phone: '02-2771-1234', email: 'wu@selfmusic.com', address: '台北市大安區敦化南路一段236號' },
  { name: '社團法人台灣在宅醫療學會', contact: '許心怡', phone: '02-2391-5568', email: 'hsu@homemed.org.tw', address: '台北市中正區紹興南街36號' },
  { name: '雲林縣政府衛生局', contact: '楊秀珠', phone: '05-533-9191', email: 'yang@ylhb.gov.tw', address: '雲林縣斗六市府文路34號' },
];
const customerIds = [];
customerData.forEach(c => {
  let existing = db.findOne('customers', x => x.name === c.name);
  if (!existing) {
    existing = db.insert('customers', { id: uid(), ...c, status: 'active', created_by: admin.id });
  }
  customerIds.push(existing.id);
});

// === 提案/報價單 (對標 Ragic v2.5) ===
const proposalData = [
  { title: '巨元實業 春酒活動', customer_idx: 0, department: '瓦當麥可', event_date: '2026/04/25', total_quote: 105000, case_status: '提案中', case_type: '商案' },
  { title: '奧迪展間行銷活動', customer_idx: 1, department: '瓦當麥可', event_date: '2026/03/29', total_quote: 129150, case_status: '提案中', case_type: '商案' },
  { title: '115年度杏壇芬芳獎委託專業設計暨拍攝撰稿', customer_idx: 2, department: '瓦當麥可', event_date: '2026/04/15', total_quote: 1227600, case_status: '得標', case_type: '標案' },
  { title: '露營營火晚會', customer_idx: 3, department: '瓦當麥可', event_date: '2025/11/21', total_quote: 630000, case_status: '提案中', case_type: '商案' },
  { title: '慶昇醫院十週年剪綵儀式', customer_idx: 4, department: '瓦當麥可', event_date: '2026/06/23', total_quote: 183330, case_status: '提案中', case_type: '商案' },
  { title: '2026桃花紅迎接大甲媽硬體搭建', customer_idx: 4, department: '瓦當硬體', event_date: '2026/04/18', total_quote: 78000, case_status: '得標', case_type: '商案' },
  { title: '華泰55週年活動(義大世界)5500人3日活動', customer_idx: 5, department: '瓦當麥可', event_date: '2026/05/10', total_quote: 1149329, case_status: '等待回覆', case_type: '商案' },
  { title: '南投國道服務區 市集開幕記者會', customer_idx: 6, department: '瓦當麥可', event_date: '2026/05/23', total_quote: 99750, case_status: '得標', case_type: '標案' },
  { title: '德儀股份有限公司 餐會', customer_idx: 7, department: '瓦當硬體', event_date: '2026/05/15', total_quote: 112350, case_status: '得標', case_type: '標案' },
  { title: '2026伊甸愛孩童幸福節_追加品項', customer_idx: 8, department: '瓦當麥可', event_date: '2026/05/16', total_quote: 290157, case_status: '得標', case_type: '標案' },
  { title: '2026良序春(0312)', customer_idx: 9, department: '瓦當麥可', event_date: '2026/03/16', total_quote: 210977, case_status: '得標', case_type: '標案' },
  { title: '在宅醫療學會兩天一夜營隊', customer_idx: 10, department: '瓦當麥可', event_date: '2026/03/21', total_quote: 214725, case_status: '提案中', case_type: '商案' },
  { title: '115年雲林縣健康生活挑戰賽', customer_idx: 11, department: '瓦當麥可', event_date: '2026/03/18', total_quote: 1470000, case_status: '得標', case_type: '標案' },
];
proposalData.forEach(p => {
  if (db.findOne('proposals', x => x.title === p.title)) return;
  db.insert('proposals', {
    id: uid(), title: p.title, customer_id: customerIds[p.customer_idx],
    department: p.department, event_date: p.event_date,
    total_quote: p.total_quote,
    case_status: p.case_status, case_type: p.case_type,
    status: p.case_status === '得標' ? 'approved' : 'draft',
    version: 1, event_type: '', description: '', created_by: pick(userIds),
  });
});
console.log(`[Seed] 提案: ${proposalData.length} 筆`);

// === 工作人員 ===
const workerData = [
  { name: '陳大明', id_number: 'A123456789', phone: '0912-345-678', bank_account: '012-345678-901', daily_rate: 2000, specialty: '音響' },
  { name: '林小華', id_number: 'B234567890', phone: '0923-456-789', bank_account: '023-456789-012', daily_rate: 1800, specialty: '燈光' },
  { name: '王志偉', id_number: 'C345678901', phone: '0934-567-890', bank_account: '034-567890-123', daily_rate: 2200, specialty: '視訊' },
  { name: '張美玲', id_number: 'D456789012', phone: '0945-678-901', bank_account: '045-678901-234', daily_rate: 1500, specialty: '現場執行' },
  { name: '劉建國', id_number: 'E567890123', phone: '0956-789-012', bank_account: '056-789012-345', daily_rate: 2500, specialty: '音響' },
  { name: '黃淑芬', id_number: 'F678901234', phone: '0967-890-123', bank_account: '067-890123-456', daily_rate: 1600, specialty: '行政' },
  { name: '吳宗翰', id_number: 'G789012345', phone: '0978-901-234', bank_account: '078-901234-567', daily_rate: 2000, specialty: '燈光' },
  { name: '趙雅婷', id_number: 'H890123456', phone: '0989-012-345', bank_account: '089-012345-678', daily_rate: 1800, specialty: '現場執行' },
];
const workerIds = [];
workerData.forEach(w => {
  let existing = db.findOne('workers', x => x.name === w.name);
  if (!existing) {
    existing = db.insert('workers', { id: uid(), ...w, status: 'active' });
  }
  workerIds.push(existing.id);
});
console.log(`[Seed] 工作人員: ${workerData.length} 筆`);

// === 勞報單 ===
const lrData = [
  { title: '巨元實業春酒 - 音響組', event_date: '2026/04/25', workers: [0, 4], days: 1 },
  { title: '奧迪展間 - 全組', event_date: '2026/03/29', workers: [0, 1, 2, 3], days: 2 },
  { title: '杏壇芬芳獎 - 拍攝組', event_date: '2026/04/15', workers: [2, 5], days: 3 },
  { title: '露營營火晚會 - 燈光組', event_date: '2025/11/21', workers: [1, 6], days: 1 },
  { title: '華泰55週年 - 全員出動', event_date: '2026/05/10', workers: [0, 1, 2, 3, 4, 6, 7], days: 3 },
];
lrData.forEach(lr => {
  if (db.findOne('labor_reports', x => x.title === lr.title)) return;
  const report = db.insert('labor_reports', {
    id: uid(), title: lr.title, event_date: lr.event_date, status: pick(['open', 'closed']),
    tax_type: '免稅', notes: '', created_by: pick(userIds),
  });
  lr.workers.forEach(wi => {
    const w = workerData[wi];
    db.insert('labor_report_workers', {
      id: uid(), report_id: report.id, worker_id: workerIds[wi],
      worker_name: w.name, daily_rate: w.daily_rate, days: lr.days,
      total: w.daily_rate * lr.days,
    });
  });
});
console.log(`[Seed] 勞報單: ${lrData.length} 筆`);

// === 請付款 ===
const paymentData = [
  { title: '場地租金 - 巨元春酒', amount: 35000, type: '請付款', status: 'approved', payee: '福華大飯店' },
  { title: '花藝佈置', amount: 12000, type: '請付款', status: 'pending', payee: '花漾設計工作室' },
  { title: '便當 x 50人份', amount: 7500, type: '零用金', status: 'paid', payee: '合味便當' },
  { title: '音響器材運費', amount: 8500, type: '請付款', status: 'approved', payee: '全安物流' },
  { title: '停車費+過路費', amount: 1250, type: '零用金', status: 'paid', payee: '' },
  { title: 'LED螢幕租賃', amount: 45000, type: '請付款', status: 'pending', payee: '光電科技有限公司' },
  { title: '攝影師出班費', amount: 15000, type: '請付款', status: 'approved', payee: '張攝影師' },
  { title: '文具用品採購', amount: 2300, type: '零用金', status: 'paid', payee: '金石堂' },
];
paymentData.forEach(p => {
  if (db.findOne('payment_requests', x => x.title === p.title)) return;
  db.insert('payment_requests', {
    id: uid(), title: p.title, amount: p.amount, type: p.type,
    status: p.status, payee: p.payee, description: '',
    approved_by: p.status !== 'pending' ? admin.id : null,
    created_by: pick(userIds),
  });
});
console.log(`[Seed] 請付款: ${paymentData.length} 筆`);

// === 物品管理 ===
const inventoryItems = [
  { name: 'Shure SM58 麥克風', category: '音響', stock: 20 },
  { name: 'QSC K12.2 喇叭', category: '音響', stock: 8 },
  { name: 'Allen & Heath SQ-5 混音器', category: '音響', stock: 2 },
  { name: 'Martin MAC Aura XB 搖頭燈', category: '燈光', stock: 16 },
  { name: 'ETC Source Four 750W', category: '燈光', stock: 24 },
  { name: 'MA Lighting grandMA3 燈控台', category: '燈光', stock: 1 },
  { name: 'Panasonic PT-RZ990 投影機', category: '視訊', stock: 4 },
  { name: 'Blackmagic ATEM Mini Pro 切換台', category: '視訊', stock: 3 },
  { name: 'Truss 鋁合金桁架 3m', category: '結構', stock: 40 },
  { name: 'Chain Motor 1T 電動吊車', category: '結構', stock: 8 },
  { name: 'LED P3.9 室內屏 50x50cm', category: '視訊', stock: 60 },
  { name: 'Sennheiser EW-DX 無線麥克風', category: '音響', stock: 12 },
];
inventoryItems.forEach(item => {
  if (db.findOne('inventory_items', x => x.name === item.name)) {
    // 如果已經有就更新 stock
    const existing = db.findOne('inventory_items', x => x.name === item.name);
    db.update('inventory_items', existing.id, { stock: item.stock });
    return;
  }
  db.insert('inventory_items', { id: uid(), ...item, unit: '個', min_stock: 2 });
});

// 出入庫紀錄
const movements = [
  { item: 'Shure SM58 麥克風', qty: 4, type: 'checkout', project: '巨元春酒', date: date(-5) },
  { item: 'QSC K12.2 喇叭', qty: 2, type: 'checkout', project: '巨元春酒', date: date(-5) },
  { item: 'Martin MAC Aura XB 搖頭燈', qty: 8, type: 'checkout', project: '奧迪展間', date: date(-3) },
  { item: 'Shure SM58 麥克風', qty: 4, type: 'checkin', project: '巨元春酒', date: date(-1) },
  { item: 'Panasonic PT-RZ990 投影機', qty: 2, type: 'checkout', project: '華泰55週年', date: date(0) },
  { item: 'LED P3.9 室內屏 50x50cm', qty: 20, type: 'checkout', project: '華泰55週年', date: date(0) },
];
movements.forEach(m => {
  if (db.find('inventory_movements', x => x.item_name === m.item && x.project_name === m.project && x.type === m.type).length) return;
  db.insert('inventory_movements', {
    id: uid(), item_name: m.item, quantity: m.qty, type: m.type,
    project_name: m.project, date: m.date, notes: '',
    created_by: pick(userIds),
  });
});
console.log(`[Seed] 物品: ${inventoryItems.length} 項, 異動: ${movements.length} 筆`);

// === 資源名單 ===
const resourceData = [
  { name: '陳達人', type: 'performer', specialty: '主持人', phone: '0911-111-111', rate: '15000/場', rating: 5 },
  { name: '林樂團', type: 'performer', specialty: '樂團表演', phone: '0922-222-222', rate: '30000/場', rating: 4 },
  { name: 'DJ KURO', type: 'performer', specialty: 'DJ', phone: '0933-333-333', rate: '20000/場', rating: 5 },
  { name: '魔術師阿倫', type: 'performer', specialty: '魔術表演', phone: '0944-444-444', rate: '12000/場', rating: 4 },
  { name: '小丑氣球師', type: 'performer', specialty: '氣球造型', phone: '0955-555-555', rate: '8000/場', rating: 3 },
  { name: '光電科技有限公司', type: 'vendor', specialty: 'LED螢幕供應', phone: '04-2233-4455', rate: '依案報價', rating: 5 },
  { name: '花漾設計工作室', type: 'vendor', specialty: '花藝佈置', phone: '04-2288-9900', rate: '依案報價', rating: 4 },
  { name: '全安物流', type: 'vendor', specialty: '器材運輸', phone: '04-2255-6677', rate: '$3500起', rating: 5 },
  { name: '王攝影師', type: 'artist', specialty: '活動攝影', phone: '0966-666-666', rate: '12000/天', rating: 5 },
  { name: '張導演', type: 'artist', specialty: '影片拍攝', phone: '0977-777-777', rate: '20000/天', rating: 4 },
  { name: '幸福莊園攤位', type: 'market', specialty: '手作甜點', phone: '0988-888-888', rate: '依攤位', rating: 4 },
  { name: '小農直送攤位', type: 'market', specialty: '有機蔬果', phone: '0999-999-999', rate: '依攤位', rating: 3 },
];
resourceData.forEach(r => {
  if (db.findOne('resources', x => x.name === r.name)) return;
  db.insert('resources', { id: uid(), ...r, status: 'active', notes: '', created_by: pick(userIds) });
});
console.log(`[Seed] 資源: ${resourceData.length} 筆`);

// === 保證金 ===
const depositData = [
  { venue: '福華大飯店 國際廳', amount: 50000, project: '巨元春酒', status: 'held', deposit_date: date(-10) },
  { venue: '台中國際展覽館 A區', amount: 80000, project: '奧迪展間', status: 'held', deposit_date: date(-7) },
  { venue: '義大皇家酒店', amount: 100000, project: '華泰55週年', status: 'held', deposit_date: date(-3) },
  { venue: '南投社區活動中心', amount: 15000, project: '杏壇芬芳獎', status: 'returned', deposit_date: date(-30) },
];
depositData.forEach(d => {
  if (db.findOne('deposits', x => x.venue === d.venue)) return;
  db.insert('deposits', { id: uid(), ...d, notes: '', return_date: d.status === 'returned' ? date(-5) : '', created_by: pick(userIds) });
});
console.log(`[Seed] 保證金: ${depositData.length} 筆`);

// === 表單建構器 Demo ===

// 1. 建一個「活動報價明細」表單模版
if (!db.findOne('form_schemas', x => x.name === '活動報價明細表')) {
  const schema1 = db.insert('form_schemas', {
    id: uid(), name: '活動報價明細表', icon: '💰', description: '活動報價的明細項目表單',
    fields: [
      { key: 'client', type: 'text', label: '客戶名稱', required: true, width: 1 },
      { key: 'event_name', type: 'text', label: '活動名稱', required: true, width: 1 },
      { key: 'event_date', type: 'date', label: '活動日期', width: 1 },
      { key: 'venue', type: 'text', label: '場地', width: 1 },
      { key: 'status', type: 'select', label: '狀態', options: ['報價中', '已確認', '已結案', '取消'], width: 1 },
      { key: 'divider1', type: 'divider', label: '' },
      { key: 'total', type: 'formula', label: '報價總計', formula: 'SUM(items.amount)' },
      { key: 'tax', type: 'formula', label: '含稅金額(5%)', formula: 'ROUND(SUM(items.amount)*1.05,0)' },
    ],
    layout: { columns: 2 },
    subtables: [{
      key: 'items', label: '報價明細', fields: [
        { key: 'category', type: 'select', label: '類別', options: ['音響', '燈光', '視訊', '結構', '人力', '運輸', '其他'] },
        { key: 'item', type: 'text', label: '項目名稱' },
        { key: 'unit', type: 'text', label: '單位' },
        { key: 'qty', type: 'number', label: '數量' },
        { key: 'price', type: 'currency', label: '單價' },
        { key: 'amount', type: 'formula', label: '小計', formula: 'qty*price' },
      ],
    }],
    auto_number: { pattern: 'QT-{YYYYMM}-{NNN}' },
    created_by: admin.id, is_active: true, version: 1,
  });

  // 填入 demo 資料
  const demoItems1 = [
    { category: '音響', item: 'Line Array 主喇叭系統', unit: '套', qty: 1, price: 45000, amount: 45000 },
    { category: '音響', item: 'Monitor 監聽喇叭', unit: '對', qty: 2, price: 5000, amount: 10000 },
    { category: '燈光', item: 'LED 搖頭燈', unit: '支', qty: 8, price: 3000, amount: 24000 },
    { category: '燈光', item: 'PAR 燈', unit: '支', qty: 12, price: 800, amount: 9600 },
    { category: '視訊', item: 'LED P3.9 螢幕 3x2m', unit: '面', qty: 1, price: 35000, amount: 35000 },
    { category: '結構', item: 'Truss 桁架搭建', unit: '式', qty: 1, price: 28000, amount: 28000 },
    { category: '人力', item: '技術人員', unit: '人/天', qty: 6, price: 3000, amount: 18000 },
    { category: '運輸', item: '器材運輸', unit: '趟', qty: 2, price: 5000, amount: 10000 },
  ];
  db.insert('form_records', {
    id: uid(), schema_id: schema1.id, record_no: 'QT-202603-001',
    data: { client: '巨元實業', event_name: '春酒活動', event_date: '2026-04-25', venue: '福華大飯店', status: '已確認', total: 179600, tax: 188580 },
    subtable_data: { items: demoItems1 },
    created_by: admin.id, status: 'active', is_locked: false,
  });

  const demoItems2 = [
    { category: '音響', item: 'Bose 擴聲系統', unit: '套', qty: 1, price: 25000, amount: 25000 },
    { category: '燈光', item: '舞台燈光基本包', unit: '式', qty: 1, price: 18000, amount: 18000 },
    { category: '視訊', item: '投影機+布幕', unit: '組', qty: 2, price: 8000, amount: 16000 },
    { category: '人力', item: '技術人員', unit: '人/天', qty: 4, price: 3000, amount: 12000 },
  ];
  db.insert('form_records', {
    id: uid(), schema_id: schema1.id, record_no: 'QT-202603-002',
    data: { client: '德儀股份有限公司', event_name: '年度餐會', event_date: '2026-05-15', venue: '台中日月千禧酒店', status: '報價中', total: 71000, tax: 74550 },
    subtable_data: { items: demoItems2 },
    created_by: pick(userIds), status: 'active', is_locked: false,
  });
  console.log('[Seed] 表單建構器: 活動報價明細表 + 2筆demo資料');
}

// 2. 建一個「場地勘查表」表單
if (!db.findOne('form_schemas', x => x.name === '場地勘查表')) {
  const schema2 = db.insert('form_schemas', {
    id: uid(), name: '場地勘查表', icon: '🏟️', description: '活動場地現場勘查紀錄',
    fields: [
      { key: 'venue_name', type: 'text', label: '場地名稱', required: true, width: 1 },
      { key: 'address', type: 'text', label: '地址', width: 1 },
      { key: 'survey_date', type: 'date', label: '勘查日期', width: 1 },
      { key: 'surveyor', type: 'user', label: '勘查人員', width: 1 },
      { key: 'header1', type: 'header', label: '場地資訊' },
      { key: 'area', type: 'number', label: '面積(坪)', width: 1 },
      { key: 'height', type: 'number', label: '天花板高度(m)', width: 1 },
      { key: 'power', type: 'select', label: '電力供應', options: ['充足(200A以上)', '一般(100-200A)', '不足(需外接)', '需確認'], width: 1 },
      { key: 'parking', type: 'select', label: '卸貨區', options: ['方便(車可直達)', '一般(需搬運50m內)', '困難(需搬運50m以上)'], width: 1 },
      { key: 'header2', type: 'header', label: '注意事項' },
      { key: 'noise_limit', type: 'checkbox', label: '有噪音管制', width: 1 },
      { key: 'fire_check', type: 'checkbox', label: '需消防申報', width: 1 },
      { key: 'notes', type: 'textarea', label: '備註' },
      { key: 'rating_overall', type: 'rating', label: '場地評分' },
    ],
    layout: { columns: 2 },
    subtables: [],
    auto_number: { pattern: 'SV-{YYYYMM}-{NNN}' },
    created_by: admin.id, is_active: true, version: 1,
  });

  db.insert('form_records', {
    id: uid(), schema_id: schema2.id, record_no: 'SV-202603-001',
    data: { venue_name: '福華大飯店 國際廳', address: '台北市大安區仁愛路三段160號', survey_date: '2026-03-10', area: 150, height: 5.5, power: '充足(200A以上)', parking: '方便(車可直達)', noise_limit: false, fire_check: true, notes: '電梯可直達B1卸貨區，場地寬敞適合大型活動', rating_overall: 5 },
    subtable_data: {}, created_by: admin.id, status: 'active', is_locked: false,
  });
  db.insert('form_records', {
    id: uid(), schema_id: schema2.id, record_no: 'SV-202603-002',
    data: { venue_name: '台中國際展覽館 A區', address: '台中市烏日區中山路三段1號', survey_date: '2026-03-12', area: 500, height: 12, power: '充足(200A以上)', parking: '方便(車可直達)', noise_limit: false, fire_check: true, notes: '大型展場，需注意迴音問題。吊點充足可掛truss', rating_overall: 4 },
    subtable_data: {}, created_by: pick(userIds), status: 'active', is_locked: false,
  });
  console.log('[Seed] 表單建構器: 場地勘查表 + 2筆demo資料');
}

// 3. 建一個「活動項目」主檔
const qiData = [
  { name: '企業春酒尾牙', category: '宴會活動', unit: '場' },
  { name: '記者會', category: '公關活動', unit: '場' },
  { name: '品牌發表會', category: '公關活動', unit: '場' },
  { name: '路跑活動', category: '運動賽事', unit: '場' },
  { name: '音樂祭', category: '藝文活動', unit: '天' },
  { name: '市集活動', category: '行銷活動', unit: '天' },
  { name: '展覽', category: '展覽活動', unit: '天' },
  { name: '政府標案', category: '標案', unit: '案' },
];
qiData.forEach(q => {
  if (db.findOne('quotation_items', x => x.name === q.name)) return;
  db.insert('quotation_items', { id: uid(), ...q, price: 0, is_active: true });
});
console.log(`[Seed] 活動項目: ${qiData.length} 筆`);

console.log('\n✅ Demo 資料種子完成！');
console.log('   帳號: admin / admin123');
console.log('   帳號: jessica / demo123');
console.log('   帳號: david / demo123');
