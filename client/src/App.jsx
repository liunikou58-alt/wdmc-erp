import { useState, useEffect } from 'react'
import { Routes, Route, NavLink, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from './AuthContext'
import { api } from './api'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Customers from './pages/Customers'
import Projects from './pages/Projects'
import ProjectDetail from './pages/ProjectDetail'
import Proposals from './pages/Proposals'
import Contracts from './pages/Contracts'
import Vendors from './pages/Vendors'
import Finance from './pages/Finance'
import BIDashboard from './pages/BIDashboard'
import Knowledge from './pages/Knowledge'
import Assets from './pages/Assets'
import Calendar from './pages/Calendar'
import Scheduling from './pages/Scheduling'
import Checklists from './pages/Checklists'
import Files from './pages/Files'
import Approvals from './pages/Approvals'
import Bridge from './pages/Bridge'
import Admin from './pages/Admin'
import LaborReports from './pages/LaborReports'
import Payments from './pages/Payments'
import Inventory from './pages/Inventory'
import Resources from './pages/Resources'
import FormBuilder from './pages/FormBuilder'
import QAGuide from './pages/QAGuide'
import ProfitLoss from './pages/ProfitLoss'
import PurchaseOrders from './pages/PurchaseOrders'
import NotificationBell from './components/NotificationBell'

const NAV = [
  { section: '總覽', items: [
    { path: '/', icon: '📊', label: 'Dashboard', end: true },
    { path: '/calendar', icon: '📅', label: '行事曆' },
    { path: '/guide', icon: '❓', label: '使用說明 Q&A' },
  ]},
  { section: '業務管理', items: [
    { path: '/customers', icon: '🤝', label: '客戶管理' },
    { path: '/proposals', icon: '📝', label: '提案管理' },
    { path: '/contracts', icon: '📃', label: '合約管理' },
    { path: '/projects', icon: '📁', label: '專案管理' },
  ]},
  { section: '現場執行', items: [
    { path: '/scheduling', icon: '👷', label: '人力調度' },
    { path: '/checklists', icon: '✅', label: '執行清單' },
    { path: '/labor', icon: '📝', label: '勞報單' },
  ]},
  { section: '供應鏈', items: [
    { path: '/vendors', icon: '📦', label: '廠商與採購' },
    { path: '/purchase-orders', icon: '🧮', label: '活動採購單' },
    { path: '/assets', icon: '🔧', label: '資產設備' },
    { path: '/inventory', icon: '🗳️', label: '物品管理' },
    { path: '/resources', icon: '🎤', label: '資源名單' },
  ]},
  { section: '財務', items: [
    { path: '/profit-loss', icon: '📈', label: '活動損益表' },
    { path: '/finance', icon: '💰', label: '財務管理' },
    { path: '/payments', icon: '💵', label: '請付款/零用金' },
    { path: '/approvals', icon: '📋', label: '審批中心' },
  ]},
  { section: '分析與知識', items: [
    { path: '/bi', icon: '📈', label: '營運分析 BI' },
    { path: '/knowledge', icon: '📚', label: '知識庫' },
    { path: '/files', icon: '📂', label: '檔案管理' },
  ]},
  { section: '系統', items: [
    { path: '/forms', icon: '📋', label: '表單建構器' },
    { path: '/bridge', icon: '🔗', label: '系統橋接' },
  ] },
];

export default function App() {
  const { user, loading, logout, isAdmin } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [ragicFolders, setRagicFolders] = useState([]);
  const [ragicSchemas, setRagicSchemas] = useState([]);
  const [expandedFolders, setExpandedFolders] = useState({});

  // 載入 Ragic 資料夾和表單
  useEffect(() => {
    if (!user) return;
    Promise.all([api.formBuilderGetFolders(), api.formBuilderGetSchemas()])
      .then(([f, s]) => {
        setRagicFolders((f || []).sort((a, b) => (a.order || 0) - (b.order || 0)));
        setRagicSchemas(s || []);
      }).catch(() => {});
  }, [user]);

  const toggleFolder = (id) => {
    setExpandedFolders(prev => ({ ...prev, [id]: !prev[id] }));
  };

  if (loading) return <div className="loader-wrap"><div className="loader" /></div>;
  if (!user) return <Login />;

  return (
    <div className="app-layout">
      <button className="mobile-toggle" onClick={() => setSidebarOpen(!sidebarOpen)}>☰</button>
      {sidebarOpen && <div style={{ position: 'fixed', inset: 0, zIndex: 99, background: 'rgba(0,0,0,0.3)' }} onClick={() => setSidebarOpen(false)} />}
      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div className="sidebar-logo"><span>🏢</span> WDMC ERP</div>
            <NotificationBell userId={user.id} />
          </div>
          <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 4 }}>企業營運管理系統</p>
        </div>
        <nav className="sidebar-nav">
          {/* 原始固定導航 */}
          {NAV.map(sec => (
            <div key={sec.section} className="nav-section">
              <div className="nav-section-title">{sec.section}</div>
              {sec.items.map(item => (
                <NavLink key={item.path} to={item.path} end={item.end}
                  className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                  <span className="icon">{item.icon}</span> {item.label}
                </NavLink>
              ))}
              {sec.section === '系統' && isAdmin && (
                <NavLink to="/admin" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                  <span className="icon">⚙️</span> 系統管理
                </NavLink>
              )}
            </div>
          ))}

          {/* ═══ Ragic ERP 資料夾動態展開 ═══ */}
          {ragicFolders.length > 0 && (
            <div className="nav-section" style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 8 }}>
              <div className="nav-section-title" style={{ color: '#818cf8' }}>📂 Ragic 表單</div>
              {ragicFolders.map(folder => {
                const sheets = ragicSchemas.filter(s => s.folder_id === folder.id);
                if (sheets.length === 0) return null;
                const isExpanded = expandedFolders[folder.id];
                return (
                  <div key={folder.id}>
                    <div
                      className="nav-link"
                      style={{ cursor: 'pointer', userSelect: 'none' }}
                      onClick={() => toggleFolder(folder.id)}
                    >
                      <span className="icon">{isExpanded ? '📂' : '📁'}</span>
                      <span style={{ flex: 1 }}>{folder.name}</span>
                      <span style={{ fontSize: 10, opacity: 0.5 }}>{sheets.length}</span>
                    </div>
                    {isExpanded && sheets.map(schema => (
                      <NavLink
                        key={schema.id}
                        to={`/forms?schema=${schema.id}`}
                        className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                        style={{ paddingLeft: 36, fontSize: 12 }}
                      >
                        <span className="icon" style={{ fontSize: 12 }}>{schema.icon || '📄'}</span>
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {schema.name}
                        </span>
                      </NavLink>
                    ))}
                  </div>
                );
              })}
            </div>
          )}
        </nav>

        <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', padding: '14px 16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
            <div className="avatar" style={{ background: user.avatar_color || '#6366f1', fontSize: 13 }}>
              {user.display_name?.[0] || '?'}
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600 }}>{user.display_name}</div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)' }}>{user.department_name || user.role}</div>
            </div>
          </div>
          <button onClick={logout} className="btn btn-secondary" style={{ width: '100%', justifyContent: 'center', fontSize: 12, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.6)' }}>
            🚪 登出
          </button>
        </div>
      </aside>

      <main className="main-content">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/calendar" element={<Calendar />} />
          <Route path="/customers" element={<Customers />} />
          <Route path="/customers/:id" element={<Customers />} />
          <Route path="/proposals" element={<Proposals />} />
          <Route path="/contracts" element={<Contracts />} />
          <Route path="/projects" element={<Projects />} />
          <Route path="/projects/new" element={<Projects />} />
          <Route path="/projects/:id" element={<ProjectDetail />} />
          <Route path="/scheduling" element={<Scheduling />} />
          <Route path="/checklists" element={<Checklists />} />
          <Route path="/vendors" element={<Vendors />} />
          <Route path="/assets" element={<Assets />} />
          <Route path="/finance" element={<Finance />} />
          <Route path="/approvals" element={<Approvals />} />
          <Route path="/bi" element={<BIDashboard />} />
          <Route path="/knowledge" element={<Knowledge />} />
          <Route path="/files" element={<Files />} />
          <Route path="/bridge" element={<Bridge />} />
          <Route path="/labor" element={<LaborReports />} />
          <Route path="/payments" element={<Payments />} />
          <Route path="/inventory" element={<Inventory />} />
          <Route path="/resources" element={<Resources />} />
          <Route path="/forms" element={<FormBuilder />} />
          <Route path="/guide" element={<QAGuide />} />
          <Route path="/profit-loss" element={<ProfitLoss />} />
          <Route path="/purchase-orders" element={<PurchaseOrders />} />
          {isAdmin && <Route path="/admin" element={<Admin />} />}
        </Routes>
      </main>
    </div>
  );
}
