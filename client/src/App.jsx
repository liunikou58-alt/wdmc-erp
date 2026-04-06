import { useState, useEffect, useRef } from 'react'
import { Routes, Route, NavLink, useLocation } from 'react-router-dom'
import { useAuth } from './AuthContext'
import { useTheme } from './ThemeContext'
import { useLang } from './LangContext'
import Login from './pages/Login'
import GlobalSearch from './GlobalSearch'
import ErrorBoundary from './components/ErrorBoundary'
import Dashboard from './pages/Dashboard'
import Customers from './pages/Customers'
import CustomerDetail from './pages/CustomerDetail'
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
import Events from './pages/Events'
import Bonuses from './pages/Bonuses'
import ESign from './pages/ESign'
import WinLossReport from './pages/WinLossReport'
import DailyReport from './pages/DailyReport'
import VehicleBooking from './pages/VehicleBooking'
import Attendance from './pages/Attendance'
import Journal from './pages/Journal'
import NotificationBell from './components/NotificationBell'
import LiffLogin from './pages/LiffLogin'
import BudgetTable from './pages/BudgetTable'
import ProjectKickoff from './pages/ProjectKickoff'
import ProjectReview from './pages/ProjectReview'

function useNav() {
  const { t } = useLang();
  return [
    { section: t('nav.corePlatform'), sectionKey: 'core', items: [
      { path: '/', label: t('nav.dashboard'), end: true },
      { path: '/calendar', label: t('nav.calendar') },
      { path: '/daily-report', label: t('nav.dailyReport') },
      { path: '/vehicles', label: t('nav.vehicles') },
      { path: '/guide', label: t('nav.guide') },
    ]},
    { section: t('nav.projectSystem'), sectionKey: 'projects', items: [
      { path: '/projects', label: t('nav.projectList') },
      { path: '/budget', label: t('nav.budgetTable') },
      { path: '/kickoff', label: t('nav.projectKickoff') },
      { path: '/project-review', label: t('nav.projectReview') },
      { path: '/win-loss', label: t('nav.winLoss') },
      { path: '/bonuses', label: t('nav.bonuses') },
    ]},
    { section: t('nav.crmSystem'), sectionKey: 'crm', items: [
      { path: '/customers', label: t('nav.customers') },
    ]},
    { section: t('nav.proposalSystem'), sectionKey: 'proposal', items: [
      { path: '/proposals', label: t('nav.proposals') },
      { path: '/contracts', label: t('nav.contracts') },
      { path: '/esign', label: t('nav.esign') },
    ]},
    { section: t('nav.eventSystem'), sectionKey: 'events', items: [
      { path: '/events', label: t('nav.events') },
      { path: '/scheduling', label: t('nav.scheduling') },
      { path: '/checklists', label: t('nav.checklists') },
      { path: '/labor', label: t('nav.labor') },
    ]},
    { section: t('nav.procurementSystem'), sectionKey: 'procurement', items: [
      { path: '/vendors', label: t('nav.vendors') },
      { path: '/purchase-orders', label: t('nav.purchaseOrders') },
    ]},
    { section: t('nav.assetSystem'), sectionKey: 'assets', items: [
      { label: t('nav.equipCenter'), children: [
        { path: '/assets', label: t('nav.equipOverview') },
        { path: '/assets/audio', label: t('nav.equipAudio') },
        { path: '/assets/lighting', label: t('nav.equipLighting') },
        { path: '/assets/video', label: t('nav.equipVideo') },
        { path: '/assets/led', label: t('nav.equipLed') },
        { path: '/assets/stage', label: t('nav.equipStage') },
        { path: '/assets/power', label: t('nav.equipPower') },
      ]},
      { path: '/inventory', label: t('nav.inventory') },
      { path: '/resources', label: t('nav.resources') },
    ]},
    { section: t('nav.financeSystem'), sectionKey: 'finance', items: [
      { path: '/profit-loss', label: t('nav.profitLoss') },
      { label: t('nav.incomeExpense'), children: [
        { path: '/finance', label: t('nav.financeOverview') },
        { path: '/finance/revenues', label: t('nav.revenues') },
        { path: '/finance/expenses', label: t('nav.expenses') },
      ]},
      { path: '/payments', label: t('nav.payments') },
      { path: '/journal', label: t('nav.journal') },
      { path: '/approvals', label: t('nav.approvals') },
    ]},
    { section: t('nav.biSystem'), sectionKey: 'bi', items: [
      { path: '/bi', label: t('nav.bi') },
      { path: '/knowledge', label: t('nav.knowledge') },
      { path: '/files', label: t('nav.files') },
    ]},
    { section: t('nav.hrSystem'), sectionKey: 'hr', items: [
      { path: '/attendance', label: t('nav.attendance') },
    ]},
    { section: t('nav.system'), sectionKey: 'system', items: [
      { path: '/forms', label: t('nav.formBuilder') },
      { path: '/bridge', label: t('nav.bridge') },
    ] },
  ];
}

function LangSwitcher() {
  const { lang, setLang } = useLang();
  return (
    <button onClick={() => setLang(lang === 'zh-TW' ? 'en' : 'zh-TW')}
      style={{
        background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: 8,
        padding: '6px 10px', cursor: 'pointer', fontSize: 12, color: 'white',
        fontWeight: 600, fontFamily: 'inherit',
      }}
      title={lang === 'zh-TW' ? 'Switch to English' : '切換為中文'}>
      🌐 {lang === 'zh-TW' ? 'EN' : '中'}
    </button>
  );
}

function ThemeSwitcher() {
  const { themeId, setThemeId, themes } = useTheme();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);
  const { t: tLang } = useLang();
  const grouped = {};
  const groupMap = { '♀ 女性': tLang('theme.female'), '♂ 男性': tLang('theme.male'), '⚪ 中性': tLang('theme.neutral') };
  themes.forEach(th => {
    const key = groupMap[th.group] || th.group;
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(th);
  });
  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button onClick={() => setOpen(!open)} style={{
        background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: 8,
        padding: '6px 10px', cursor: 'pointer', fontSize: 14, color: 'white',
      }}>🎨</button>
      {open && (
        <div style={{
          position: 'absolute', bottom: 'calc(100% + 8px)', left: 0, zIndex: 300,
          background: 'var(--c-bg-card-solid)', border: '1px solid var(--c-border)',
          borderRadius: 14, padding: 14, minWidth: 220, boxShadow: 'var(--shadow-lg)',
          animation: 'slideDown 0.2s ease', color: 'var(--c-text)',
        }}>
          <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 10 }}>{tLang('theme.title')}</div>
          {Object.entries(grouped).map(([group, items]) => (
            <div key={group} style={{ marginBottom: 8 }}>
              <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--c-text-muted)', marginBottom: 4, letterSpacing: 0.5 }}>{group}</div>
              {items.map(t => (
                <button key={t.id} onClick={() => { setThemeId(t.id); setOpen(false); }} style={{
                  display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '6px 10px',
                  borderRadius: 8, border: 'none', cursor: 'pointer', marginBottom: 2, fontSize: 12,
                  background: themeId === t.id ? 'var(--c-primary-bg)' : 'transparent',
                  fontWeight: themeId === t.id ? 700 : 500, fontFamily: 'inherit', textAlign: 'left',
                  color: themeId === t.id ? 'var(--c-primary)' : 'var(--c-text)',
                }}>{t.name.split(' ')[0]} {t.name.split(' ').slice(1).join(' ')}
                  {themeId === t.id && <span style={{ marginLeft: 'auto' }}>✓</span>}
                </button>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function NavItem({ item }) {
  const location = useLocation();
  const [open, setOpen] = useState(false);

  // Auto-open if a child is active
  useEffect(() => {
    if (item.children?.some(c => location.pathname === c.path || location.pathname.startsWith(c.path + '/'))) {
      setOpen(true);
    }
  }, [location.pathname, item.children]);

  if (item.children) {
    return (
      <div className="nav-parent">
        <button className={`nav-parent-toggle ${open ? 'open' : ''}`} onClick={() => setOpen(!open)}>
          <span>{item.label}</span><span className="arrow">▶</span>
        </button>
        <div className={`nav-sub ${open ? 'open' : ''}`}>
          {item.children.map(child => (
            <NavLink key={child.path} to={child.path} end
              className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              {child.label}
            </NavLink>
          ))}
        </div>
      </div>
    );
  }

  return (
    <NavLink to={item.path} end={item.end}
      className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
      <span>{item.label}</span>
    </NavLink>
  );
}

export default function App() {
  const { user, loading, logout, isAdmin, canAccess, roleName } = useAuth();
  const { t } = useLang();
  const NAV = useNav();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (loading) return <div className="loader-wrap"><div className="loader" /></div>;
  if (window.location.pathname === '/liff/login') return <LiffLogin />;
  if (!user) return <Login />;

  const filteredNAV = NAV.map(sec => {
    const visibleItems = sec.items.filter(item => {
      if (item.children) {
        return item.children.some(c => canAccess(c.path));
      }
      return canAccess(item.path);
    }).map(item => {
      if (item.children) {
        return { ...item, children: item.children.filter(c => canAccess(c.path)) };
      }
      return item;
    });
    return { ...sec, items: visibleItems };
  }).filter(sec => sec.items.length > 0 || (sec.sectionKey === 'system' && isAdmin));

  return (
    <div className="app-layout">
      <button className="mobile-toggle" onClick={() => setSidebarOpen(!sidebarOpen)}>☰</button>
      {sidebarOpen && <div style={{ position: 'fixed', inset: 0, zIndex: 99, background: 'rgba(0,0,0,0.3)' }} onClick={() => setSidebarOpen(false)} />}

      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <div className="sidebar-logo">
            <span className="sidebar-header-text" style={{ fontSize: 18, fontWeight: 700, letterSpacing: 1 }}>{t('app.name')}</span>
          </div>
        </div>

        <GlobalSearch />

        <nav className="sidebar-nav">
          {filteredNAV.map(sec => (
            <div key={sec.section} className="nav-section">
              <div className="nav-section-title">{sec.section}</div>
              {sec.items.map((item, i) => (
                <NavItem key={item.path || i} item={item} />
              ))}
              {sec.sectionKey === 'system' && isAdmin && (
                <NavLink to="/admin" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                  <span>{t('nav.admin')}</span>
                </NavLink>
              )}
            </div>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
            <div className="avatar" style={{ background: user.avatar_color || 'var(--c-primary)', fontSize: 13 }}>
              {user.display_name?.[0] || '?'}
            </div>
            <div className="sidebar-footer-info">
              <div style={{ fontSize: 13, fontWeight: 600, color: 'white' }}>{user.display_name}</div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>{roleName || user.department_name || user.role}</div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <LangSwitcher />
            <ThemeSwitcher />
            <NotificationBell userId={user.id} />
            <button onClick={logout} className="btn btn-sm" style={{
              flex: 1, justifyContent: 'center', fontSize: 11,
              background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.6)',
            }}>{t('nav.logout')}</button>
          </div>
        </div>
      </aside>

      <main className="main-content">
        <ErrorBoundary key={location.pathname}>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/calendar" element={<Calendar />} />
          <Route path="/customers" element={<Customers />} />
          <Route path="/customers/:id" element={<CustomerDetail />} />
          <Route path="/proposals" element={<Proposals />} />
          <Route path="/contracts" element={<Contracts />} />
          <Route path="/events" element={<Events />} />
          <Route path="/projects" element={<Projects />} />
          <Route path="/projects/new" element={<Projects />} />
          <Route path="/projects/:id" element={<ProjectDetail />} />
          <Route path="/bonuses" element={<Bonuses />} />
          <Route path="/esign" element={<ESign />} />
          <Route path="/win-loss" element={<WinLossReport />} />
          <Route path="/scheduling" element={<Scheduling />} />
          <Route path="/checklists" element={<Checklists />} />
          <Route path="/vendors" element={<Vendors />} />
          <Route path="/assets" element={<Assets />} />
          <Route path="/assets/:category" element={<Assets />} />
          <Route path="/finance" element={<Finance />} />
          <Route path="/finance/:tab" element={<Finance />} />
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
          <Route path="/daily-report" element={<DailyReport />} />
          <Route path="/vehicles" element={<VehicleBooking />} />
          <Route path="/attendance" element={<Attendance />} />
          <Route path="/journal" element={<Journal />} />
          <Route path="/budget" element={<BudgetTable />} />
          <Route path="/kickoff" element={<ProjectKickoff />} />
          <Route path="/project-review" element={<ProjectReview />} />
          {isAdmin && <Route path="/admin" element={<Admin />} />}
        </Routes>
        </ErrorBoundary>
      </main>
    </div>
  );
}
