import { useState } from 'react';

const SECTIONS = [
  {
    title: '🏢 系統總覽',
    items: [
      { q: 'WDMC ERP 是什麼？', a: '瓦當麥可活動管理 ERP 系統，專為活動公司設計，涵蓋客戶管理、報價、專案執行、人力調度、財務、採購等全流程。整合了原 Ragic 系統的所有表單結構，並升級為更現代化的操作界面。' },
      { q: '系統有哪些主要模組？', a: '📊 Dashboard 儀表板\n🤝 客戶管理（CRM）\n📝 提案/報價管理\n📃 合約管理\n📁 專案管理（含任務/里程碑）\n👷 人力調度\n✅ 執行清單\n📝 勞報單\n📦 廠商與採購\n🔧 資產設備\n🗳️ 物品管理\n🎤 資源名單\n💰 財務管理（營收/支出/發票）\n💵 請付款/零用金\n📋 審批中心\n📈 營運分析 BI\n📚 知識庫\n📂 檔案管理\n📋 Ragic 自訂表單（62張）' },
    ]
  },
  {
    title: '📋 典型工作流程',
    items: [
      { q: '活動專案從頭到尾的流程？', a: '1️⃣ 客戶來電/來信 → 客戶管理建檔\n2️⃣ 初步討論 → 提案管理建立提案\n3️⃣ 報價確認 → 報價單製作（含項目明細）\n4️⃣ 客戶同意 → 合約管理建立合約\n5️⃣ 成立專案 → 專案管理（任務分配/里程碑）\n6️⃣ 發包採購 → 廠商採購單\n7️⃣ 排人力 → 人力調度排班\n8️⃣ 進場執行 → 執行清單打勾\n9️⃣ 現場工作人員 → 勞報單\n🔟 結案 → 財務管理（發票/營收/支出）→ Dashboard 更新' },
      { q: '請付款流程怎麼走？', a: '1. 專案經理填「請付款單」\n2. 進入「審批中心」等待主管核准\n3. 核准後 → 會計確認付款\n4. 付款完成 → 記入財務支出' },
      { q: '勞報單怎麼填？', a: '1. 進入「勞報單」模組\n2. 選擇活動/專案名稱\n3. 新增 → 填寫工作人員資料（姓名、身分證、銀行帳號）\n4. 填寫工作日期、時數、費用\n5. 附上工作照片\n6. 提交審核' },
    ]
  },
  {
    title: '🤝 客戶管理 (CRM)',
    items: [
      { q: '客戶管理在哪裡？', a: '左側選單 → 業務管理 → 🤝 客戶管理\n可以查看所有客戶資料、聯絡人、歷史合作案件。' },
      { q: '怎麼新增客戶？', a: '進入客戶管理 → 點擊「+ 新增客戶」→ 填寫公司名稱、聯絡人、電話、Email、地址等資料 → 儲存。' },
    ]
  },
  {
    title: '📁 專案管理',
    items: [
      { q: '專案管理包含什麼？', a: '每個專案有：\n• 基本資料（名稱、客戶、預算、日期）\n• 任務清單（可分配、追蹤進度）\n• 里程碑（合約簽訂 → 設計 → 搭建 → 執行 → 結案）\n• 相關文件\n• 專案進度百分比' },
      { q: '怎麼追蹤專案進度？', a: 'Dashboard 首頁會直接顯示「進行中專案」的進度條。\n進入專案管理可看到每個任務的完成狀態。\n里程碑會標記已完成/進行中/待完成。' },
    ]
  },
  {
    title: '💰 財務管理',
    items: [
      { q: '財務管理包含什麼？', a: '• 營收管理：每筆專案的入賬記錄\n• 支出管理：每筆採購/費用的出賬記錄\n• 發票管理：開立與追蹤發票\n• Dashboard 即時顯示總營收、利潤率、待收款' },
      { q: '怎麼知道公司目前的財務狀況？', a: 'Dashboard 首頁 → 總營收、利潤率 KPI\n營運分析 BI → 更詳細的財務圖表\n財務管理 → 每筆明細' },
    ]
  },
  {
    title: '📦 供應鏈管理',
    items: [
      { q: '廠商管理在哪？', a: '左側 → 供應鏈 → 📦 廠商與採購\n管理所有合作廠商的聯絡資料、銀行帳號、服務項目。\n可以建立採購單並追蹤狀態。' },
      { q: '資產設備怎麼管理？', a: '左側 → 供應鏈 → 🔧 資產設備\n記錄所有公司硬體設備（音響、燈光、舞台、車輛等），追蹤設備位置和狀態（可用/使用中/維修中）。' },
    ]
  },
  {
    title: '📂 Ragic 表單',
    items: [
      { q: 'Ragic 表單是什麼？', a: '原有 Ragic ERP 系統的 62 張表單已完整遷移到本系統。\n在側邊欄底部「📂 Ragic 表單」區塊可以展開查看所有資料夾和表單。\n包含：報價管理(12張)、客戶廠商(4張)、物品管理(5張)、採購管理(7張)、勞報單(4張)、活動損益(6張) 等。' },
      { q: '怎麼查看 Ragic 表單資料？', a: '方法一：側邊欄底部 → 展開資料夾 → 點擊表單名稱\n方法二：進入「表單建構器」→ 選擇資料夾 → 點擊表單卡片\n每張表單都有 10 筆範例資料可供參考。' },
      { q: '可以新增/修改 Ragic 表單嗎？', a: '可以！進入「表單建構器」後：\n• 點擊表單卡片 → 查看/新增紀錄\n• 點擊 ✏️ → 編輯表單欄位設計\n• 點擊「✨ 新建表單」→ 從零開始設計新表單\n欄位類型支援：文字、數字、金額、日期、下拉選項、多選、檔案上傳、簽名、公式計算等。' },
    ]
  },
  {
    title: '⚙️ 系統操作',
    items: [
      { q: '忘記密碼怎麼辦？', a: '請聯繫系統管理員重設密碼。\n管理員路徑：左側 → 系統 → ⚙️ 系統管理 → 用戶管理' },
      { q: '如何切換不同角色？', a: '系統支援多種角色：\n• admin（系統管理員）\n• manager（經理）\n• pm（專案經理）\n• staff（一般員工）\n• accounting（會計）\n不同角色會看到不同的功能權限。' },
      { q: '資料安全嗎？', a: '所有 API 請求都經過 JWT Token 驗證。\n敏感操作需要管理員權限。\n資料儲存在本地伺服器，不經過第三方。' },
    ]
  },
];

export default function QAGuide() {
  const [openSection, setOpenSection] = useState(0);
  const [openItems, setOpenItems] = useState({});
  const [search, setSearch] = useState('');

  const toggle = (sIdx, iIdx) => {
    const key = `${sIdx}-${iIdx}`;
    setOpenItems(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const filtered = search.trim()
    ? SECTIONS.map(s => ({
        ...s,
        items: s.items.filter(i =>
          i.q.toLowerCase().includes(search.toLowerCase()) ||
          i.a.toLowerCase().includes(search.toLowerCase())
        ),
      })).filter(s => s.items.length > 0)
    : SECTIONS;

  return (<>
    <div className="page-header">
      <div>
        <h1 className="page-title">❓ 使用說明 & Q&A</h1>
        <p className="page-subtitle">WDMC ERP 系統操作流程與常見問題</p>
      </div>
    </div>

    <div style={{ maxWidth: 900, margin: '0 auto' }}>
      {/* 搜尋 */}
      <input
        placeholder="🔍 搜尋問題..."
        value={search}
        onChange={e => setSearch(e.target.value)}
        className="form-input"
        style={{ width: '100%', marginBottom: 20, fontSize: 14 }}
      />

      {/* 流程圖 */}
      {!search && (
        <div className="card" style={{ marginBottom: 20, padding: 20 }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 12 }}>📋 活動專案完整流程</h3>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
            {[
              { icon: '🤝', text: '客戶接洽' },
              { icon: '→' },
              { icon: '📝', text: '提案報價' },
              { icon: '→' },
              { icon: '📃', text: '合約簽訂' },
              { icon: '→' },
              { icon: '📁', text: '成立專案' },
              { icon: '→' },
              { icon: '🛒', text: '廠商採購' },
              { icon: '→' },
              { icon: '👷', text: '人力調度' },
              { icon: '→' },
              { icon: '✅', text: '現場執行' },
              { icon: '→' },
              { icon: '📝', text: '勞報單' },
              { icon: '→' },
              { icon: '💰', text: '財務結案' },
            ].map((step, i) =>
              step.text ? (
                <div key={i} style={S.step}>
                  <span style={{ fontSize: 20 }}>{step.icon}</span>
                  <span style={{ fontSize: 11, fontWeight: 600 }}>{step.text}</span>
                </div>
              ) : (
                <span key={i} style={{ color: 'var(--c-primary)', fontWeight: 700 }}>→</span>
              )
            )}
          </div>
        </div>
      )}

      {/* Q&A 手風琴 */}
      {filtered.map((sec, sIdx) => (
        <div key={sIdx} className="card" style={{ marginBottom: 12, padding: 0, overflow: 'hidden' }}>
          <div
            style={S.sectionHeader}
            onClick={() => setOpenSection(openSection === sIdx ? -1 : sIdx)}
          >
            <span style={{ fontWeight: 700, fontSize: 15 }}>{sec.title}</span>
            <span style={{ opacity: 0.5 }}>{openSection === sIdx ? '▼' : '▶'}</span>
          </div>
          {(openSection === sIdx || search) && sec.items.map((item, iIdx) => {
            const key = `${sIdx}-${iIdx}`;
            const isOpen = openItems[key];
            return (
              <div key={iIdx} style={{ borderTop: '1px solid var(--c-border)' }}>
                <div style={S.question} onClick={() => toggle(sIdx, iIdx)}>
                  <span style={{ color: 'var(--c-primary)', fontWeight: 700, marginRight: 8 }}>Q</span>
                  <span style={{ flex: 1, fontSize: 13, fontWeight: 500 }}>{item.q}</span>
                  <span style={{ opacity: 0.4, fontSize: 12 }}>{isOpen ? '−' : '+'}</span>
                </div>
                {isOpen && (
                  <div style={S.answer}>
                    <span style={{ color: '#10b981', fontWeight: 700, marginRight: 8 }}>A</span>
                    <div style={{ flex: 1, fontSize: 13, lineHeight: 1.8, whiteSpace: 'pre-line' }}>{item.a}</div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ))}

      {/* 底部聯繫 */}
      <div className="card" style={{ textAlign: 'center', padding: 24 }}>
        <p style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>💬 還有其他問題？</p>
        <p style={{ fontSize: 12, color: 'var(--c-text-muted)' }}>
          聯繫系統管理員：admin@wdmc.com.tw | 04-2225-XXXX
        </p>
      </div>
    </div>
  </>);
}

const S = {
  step: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, padding: '8px 12px', background: 'var(--c-primary-light)', borderRadius: 8, minWidth: 70 },
  sectionHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 16px', cursor: 'pointer' },
  question: { display: 'flex', alignItems: 'center', padding: '12px 16px', cursor: 'pointer', background: 'transparent', transition: 'background 0.15s' },
  answer: { display: 'flex', padding: '0 16px 14px 16px', color: 'var(--c-text-muted)' },
};
