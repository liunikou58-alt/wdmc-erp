import { useState, useEffect } from 'react'
import { useLang } from '../LangContext'
import { useAuth } from '../AuthContext'
import { api } from '../api'
import { NavLink } from 'react-router-dom'

const HOUR = new Date().getHours();

function ProgressRing({ pct, size = 44, stroke = 4 }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <div className="progress-ring" style={{ width: size, height: size }}>
      <svg width={size} height={size}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="var(--c-border)" strokeWidth={stroke} />
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="var(--c-primary)" strokeWidth={stroke}
          strokeDasharray={c} strokeDashoffset={c - (pct / 100) * c}
          strokeLinecap="round" transform={`rotate(-90 ${size/2} ${size/2})`}
          style={{ transition: 'stroke-dashoffset 0.6s ease' }} />
      </svg>
      <span className="progress-ring-text">{pct}%</span>
    </div>
  );
}

/* Mini bar chart for monthly stats */
function MiniBarChart({ data, height = 120 }) {
  const max = Math.max(...data.map(d => d.tender + d.commercial), 1);
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height, padding: '0 4px' }}>
      {data.map((d, i) => (
        <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
          <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 1 }}>
            <div style={{
              height: Math.max(2, (d.tender / max) * (height - 24)),
              background: 'var(--c-primary)',
              borderRadius: '4px 4px 0 0',
              transition: 'height 0.5s ease',
              minWidth: 12,
            }} />
            <div style={{
              height: Math.max(2, (d.commercial / max) * (height - 24)),
              background: 'var(--c-accent)',
              borderRadius: '0 0 4px 4px',
              transition: 'height 0.5s ease',
              minWidth: 12,
            }} />
          </div>
          <span style={{ fontSize: 9, color: 'var(--c-text-muted)', whiteSpace: 'nowrap' }}>{d.label}</span>
        </div>
      ))}
    </div>
  );
}

/* Donut chart for case distribution */
function DonutChart({ tender, commercial, size = 100 }) {
  const total = tender + commercial || 1;
  const tPct = (tender / total) * 100;
  const r = 36, c = 2 * Math.PI * r;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
      <svg width={size} height={size} viewBox="0 0 100 100">
        <circle cx="50" cy="50" r={r} fill="none" stroke="var(--c-border)" strokeWidth="12" />
        <circle cx="50" cy="50" r={r} fill="none" stroke="var(--c-primary)" strokeWidth="12"
          strokeDasharray={c} strokeDashoffset={c - (tPct / 100) * c}
          strokeLinecap="round" transform="rotate(-90 50 50)"
          style={{ transition: 'stroke-dashoffset 0.6s ease' }} />
        <circle cx="50" cy="50" r={r} fill="none" stroke="var(--c-accent)" strokeWidth="12"
          strokeDasharray={c} strokeDashoffset={c - ((100 - tPct) / 100) * c}
          strokeLinecap="round" transform={`rotate(${-90 + (tPct / 100) * 360} 50 50)`}
          style={{ transition: 'all 0.6s ease' }} />
        <text x="50" y="50" textAnchor="middle" dominantBaseline="central"
          style={{ fontSize: 14, fontWeight: 700, fill: 'var(--c-text)' }}>{total}</text>
      </svg>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ width: 10, height: 10, borderRadius: 3, background: 'var(--c-primary)' }} />
          <span style={{ fontSize: 12 }}>標案 {tender} 件</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ width: 10, height: 10, borderRadius: 3, background: 'var(--c-accent)' }} />
          <span style={{ fontSize: 12 }}>商業案 {commercial} 件</span>
        </div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { t } = useLang();
  const { user, isAdmin } = useAuth();
  const [stats, setStats] = useState({});
  const [projects, setProjects] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [approvals, setApprovals] = useState({});
  const [schedules, setSchedules] = useState([]);
  const [recentFiles, setRecentFiles] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [showAnnForm, setShowAnnForm] = useState(false);
  const [annTitle, setAnnTitle] = useState('');
  const [annContent, setAnnContent] = useState('');

  useEffect(() => {
    Promise.all([
      api.getBIOverview().then(setStats).catch(() => {}),
      api.getProjects().then(setProjects).catch(() => setProjects([])),
      api.getCustomers().then(setCustomers).catch(() => setCustomers([])),
      api.getApprovalStats().then(setApprovals).catch(() => {}),
      api.getSchedules().then(setSchedules).catch(() => setSchedules([])),
      api.getFiles().then(f => setRecentFiles((f || []).slice(0, 5))).catch(() => {}),
    ]);
    // Load announcements from localStorage
    try {
      const saved = JSON.parse(localStorage.getItem('wdmc_announcements') || '[]');
      setAnnouncements(saved);
    } catch {}
  }, []);

  const activeProjects = projects.filter(p => p.status === 'in_progress' || p.status === '進行中');
  const today = new Date().toISOString().slice(0, 10);
  const todaySchedules = schedules.filter(s => s.start_date <= today && (s.end_date || s.start_date) >= today);

  // Case distribution: count tender vs commercial
  const tenderCount = projects.filter(p => p.project_type === '政府標案' || p.project_type === 'government').length;
  const commercialCount = projects.filter(p => p.project_type === '一般專案' || p.project_type === 'general' || p.project_type === '商業案').length;
  const internationalCount = projects.filter(p => p.project_type === '國案合作' || p.project_type === 'international').length;

  // Monthly stats (last 6 months)
  const months = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const monthProjects = projects.filter(p => (p.created_at || '').startsWith(key));
    months.push({
      label: `${d.getMonth() + 1}月`,
      tender: monthProjects.filter(p => p.project_type === '政府標案' || p.project_type === 'government').length,
      commercial: monthProjects.filter(p => p.project_type !== '政府標案' && p.project_type !== 'government').length,
    });
  }

  const handlePublishAnn = () => {
    if (!annTitle.trim()) return;
    const newAnn = {
      id: Date.now(),
      title: annTitle,
      content: annContent,
      author: user.display_name,
      date: new Date().toLocaleDateString('zh-TW'),
    };
    const updated = [newAnn, ...announcements];
    setAnnouncements(updated);
    localStorage.setItem('wdmc_announcements', JSON.stringify(updated));
    setAnnTitle(''); setAnnContent(''); setShowAnnForm(false);
  };

  const kpis = [
    { label: t('dash.totalProjects'), value: stats?.projects?.total || projects.length, color: 'var(--c-primary)' },
    { label: t('dash.inProgress'), value: activeProjects.length, color: 'var(--c-success)' },
    { label: t('dash.customerCount'), value: stats?.customers?.total || customers.length, color: 'var(--c-info)' },
    { label: t('dash.totalRevenue'), value: `${((stats?.finance?.totalRevenue || 0) / 10000).toFixed(0)}${t('dash.unit.wan')}`, color: 'var(--c-warning)' },
    { label: t('dash.profitMargin'), value: `${stats?.finance?.profitMargin || 0}%`, color: 'var(--c-accent)' },
    { label: t('dash.pendingApprovals'), value: approvals.pending || 0, color: 'var(--c-danger)' },
  ];

  return (<>
    {/* Greeting */}
    <div style={{ marginBottom: 24, animation: 'fadeUp 0.4s ease' }}>
      <h1 style={{ fontSize: 24, fontWeight: 800 }}>{HOUR < 12 ? t('dash.greet.morning') : HOUR < 18 ? t('dash.greet.afternoon') : t('dash.greet.evening')}，{user.display_name}！</h1>
      <p style={{ fontSize: 13, color: 'var(--c-text-muted)', marginTop: 4 }}>
        {new Date().toLocaleDateString('zh-TW', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' })}
        {activeProjects.length > 0 && ` · ${activeProjects.length} ${t('dash.activeCount')}`}
      </p>
    </div>

    {/* KPI Cards */}
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 14, marginBottom: 24 }}>
      {kpis.map((k, i) => (
        <div key={i} className="stat-card" style={{ animation: `fadeUp 0.4s ease ${i * 0.05}s both` }}>
          <div className="stat-icon" style={{ background: `color-mix(in srgb, ${k.color} 15%, transparent)` }}>
            <div style={{ width: 18, height: 18, borderRadius: 4, background: k.color, opacity: 0.7 }} />
          </div>
          <div>
            <div className="stat-value" style={{ color: k.color }}>{k.value}</div>
            <div className="stat-label">{k.label}</div>
          </div>
        </div>
      ))}
    </div>

    {/* Row 2: Monthly Stats + Case Distribution + Pending Approvals */}
    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 16, marginBottom: 20 }}>
      {/* Monthly Revenue (tender vs commercial) */}
      <div className="card" style={{ animation: 'fadeUp 0.5s ease 0.05s both' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <h3 style={{ fontSize: 14, fontWeight: 700 }}>{t('dash.monthlyStats')}</h3>
          <div style={{ display: 'flex', gap: 10 }}>
            <span style={{ fontSize: 10, display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ width: 8, height: 8, borderRadius: 2, background: 'var(--c-primary)', display: 'inline-block' }} />
              {t('dash.tenderLabel')}
            </span>
            <span style={{ fontSize: 10, display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ width: 8, height: 8, borderRadius: 2, background: 'var(--c-accent)', display: 'inline-block' }} />
              {t('dash.commercialLabel')}
            </span>
          </div>
        </div>
        <MiniBarChart data={months} height={100} />
      </div>

      {/* Case Distribution Donut */}
      <div className="card" style={{ animation: 'fadeUp 0.5s ease 0.1s both' }}>
        <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>{t('dash.caseDistribution')}</h3>
        <DonutChart tender={tenderCount} commercial={commercialCount + internationalCount} />
      </div>

      {/* Pending Approvals Quick Link */}
      <div className="card" style={{ animation: 'fadeUp 0.5s ease 0.15s both', display: 'flex', flexDirection: 'column' }}>
        <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>{t('dash.pendingApprovalLink')}</h3>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', gap: 12 }}>
          <div style={{
            fontSize: 36, fontWeight: 800, color: approvals.pending > 0 ? 'var(--c-danger)' : 'var(--c-success)',
            transition: 'color 0.3s',
          }}>
            {approvals.pending || 0}
          </div>
          <span style={{ fontSize: 12, color: 'var(--c-text-muted)' }}>待審批項目</span>
        </div>
        <NavLink to="/approvals" className="btn btn-sm" style={{
          width: '100%', justifyContent: 'center', marginTop: 8,
          background: 'var(--c-primary)', color: 'white', border: 'none',
        }}>{t('dash.goToApprovals')}</NavLink>
      </div>
    </div>

    {/* Row 3: Active Projects + Today Schedule */}
    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 20, marginBottom: 20 }}>
      {/* Active Projects */}
      <div className="card" style={{ animation: 'fadeUp 0.5s ease 0.2s both' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3 style={{ fontSize: 15, fontWeight: 700 }}>{t('dash.activeProjects')}</h3>
          <NavLink to="/projects" className="btn btn-sm btn-ghost">{t('dash.viewAll')}</NavLink>
        </div>
        {activeProjects.length === 0 ? (
          <p style={{ color: 'var(--c-text-muted)', fontSize: 13, textAlign: 'center', padding: 20 }}>{t('dash.noActiveProjects')}</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {activeProjects.slice(0, 6).map(p => (
              <NavLink key={p.id} to={`/projects/${p.id}`} style={{
                display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px',
                border: '1px solid var(--c-border)', borderRadius: 12, textDecoration: 'none', color: 'inherit',
                transition: 'all 0.2s',
              }}>
                <ProgressRing pct={p.progress || 0} size={40} stroke={3} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 13 }}>{p.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--c-text-muted)' }}>{p.event_type || '-'} · {p.event_date || '-'}</div>
                </div>
                <span className="capsule">{p.progress || 0}%</span>
              </NavLink>
            ))}
          </div>
        )}
      </div>

      {/* Today's Schedule */}
      <div className="card" style={{ animation: 'fadeUp 0.5s ease 0.25s both' }}>
        <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 12 }}>{t('dash.todaySchedule')} ({todaySchedules.length})</h3>
        {todaySchedules.length === 0 ? (
          <p style={{ color: 'var(--c-text-muted)', fontSize: 13, textAlign: 'center', padding: 20 }}>{t('dash.noSchedule')}</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {todaySchedules.map(s => (
              <div key={s.id} style={{
                display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px',
                border: '1px solid var(--c-border)', borderRadius: 10,
                borderLeft: '4px solid var(--c-primary)',
              }}>
                <div className="avatar" style={{ background: s.user_avatar_color || 'var(--c-primary)', width: 28, height: 28, fontSize: 11 }}>
                  {(s.user_name || '?')[0]}
                </div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 13 }}>{s.user_name}</div>
                  <div style={{ fontSize: 11, color: 'var(--c-text-muted)' }}>{s.project_name || s.title || '-'}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>

    {/* Row 4: Announcements + Recent Customers + Recent Files */}
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 20 }}>
      {/* Announcements */}
      <div className="card" style={{ animation: 'fadeUp 0.5s ease 0.3s both' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <h3 style={{ fontSize: 15, fontWeight: 700 }}>{t('dash.announcements')}</h3>
          {isAdmin && (
            <button className="btn btn-sm" onClick={() => setShowAnnForm(!showAnnForm)} style={{
              background: 'var(--c-primary)', color: 'white', border: 'none', fontSize: 11,
            }}>+ {t('dash.publishAnnouncement')}</button>
          )}
        </div>
        {showAnnForm && (
          <div style={{ marginBottom: 12, padding: 12, border: '1px solid var(--c-border)', borderRadius: 10, background: 'var(--c-bg-card)' }}>
            <input value={annTitle} onChange={e => setAnnTitle(e.target.value)} placeholder={t('dash.announcementTitle')}
              style={{ width: '100%', padding: '8px 10px', border: '1px solid var(--c-border)', borderRadius: 8, marginBottom: 8, background: 'var(--c-bg)', color: 'var(--c-text)', fontSize: 13 }} />
            <textarea value={annContent} onChange={e => setAnnContent(e.target.value)} placeholder={t('dash.announcementContent')} rows={3}
              style={{ width: '100%', padding: '8px 10px', border: '1px solid var(--c-border)', borderRadius: 8, marginBottom: 8, background: 'var(--c-bg)', color: 'var(--c-text)', fontSize: 13, resize: 'vertical' }} />
            <button onClick={handlePublishAnn} className="btn btn-sm" style={{ background: 'var(--c-success)', color: 'white', border: 'none' }}>{t('dash.publish')}</button>
          </div>
        )}
        {announcements.length === 0 ? (
          <p style={{ color: 'var(--c-text-muted)', fontSize: 13, textAlign: 'center', padding: 20 }}>{t('dash.noAnnouncements')}</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {announcements.slice(0, 5).map(a => (
              <div key={a.id} style={{ padding: '10px 12px', border: '1px solid var(--c-border)', borderRadius: 10, borderLeft: '4px solid var(--c-warning)' }}>
                <div style={{ fontWeight: 600, fontSize: 13 }}>{a.title}</div>
                {a.content && <div style={{ fontSize: 12, color: 'var(--c-text-muted)', marginTop: 4 }}>{a.content}</div>}
                <div style={{ fontSize: 10, color: 'var(--c-text-muted)', marginTop: 4 }}>{a.author} · {a.date}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Customers */}
      <div className="card" style={{ animation: 'fadeUp 0.5s ease 0.35s both' }}>
        <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 12 }}>{t('dash.recentCustomers')}</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {customers.slice(0, 6).map(c => (
            <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', border: '1px solid var(--c-border)', borderRadius: 10 }}>
              <div className="avatar" style={{ background: 'var(--c-primary)', width: 30, height: 30, fontSize: 12 }}>{(c.name || '?')[0]}</div>
              <div><div style={{ fontWeight: 600, fontSize: 12 }}>{c.name}</div><div style={{ fontSize: 10, color: 'var(--c-text-muted)' }}>{c.contact_name || ''}</div></div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Files */}
      <div className="card" style={{ animation: 'fadeUp 0.5s ease 0.4s both' }}>
        <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 12 }}>{t('dash.recentFiles')}</h3>
        {recentFiles.length === 0 ? (
          <p style={{ color: 'var(--c-text-muted)', fontSize: 13, textAlign: 'center', padding: 20 }}>{t('dash.noFiles')}</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {recentFiles.map(f => (
              <div key={f.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 10px', border: '1px solid var(--c-border)', borderRadius: 8, fontSize: 12 }}>
                <div style={{ fontWeight: 500 }}>{f.original_name}</div>
                <div style={{ color: 'var(--c-text-muted)', fontSize: 10 }}>{f.uploader_name}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  </>);
}
