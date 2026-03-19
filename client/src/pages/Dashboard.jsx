import { useState, useEffect } from 'react'
import { api } from '../api'

export default function Dashboard() {
  const [stats, setStats] = useState({});
  const [projects, setProjects] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [approvals, setApprovals] = useState({});
  const [schedules, setSchedules] = useState([]);
  const [recentFiles, setRecentFiles] = useState([]);

  useEffect(() => {
    Promise.all([
      api.getBIOverview().then(setStats).catch(() => {}),
      api.getProjects().then(setProjects).catch(() => setProjects([])),
      api.getCustomers().then(setCustomers).catch(() => setCustomers([])),
      api.getApprovalStats().then(setApprovals).catch(() => {}),
      api.getSchedules().then(setSchedules).catch(() => setSchedules([])),
      api.getFiles().then(f => setRecentFiles((f || []).slice(0, 5))).catch(() => {}),
    ]);
  }, []);

  const activeProjects = projects.filter(p => p.status === 'in_progress' || p.status === '進行中');
  const today = new Date().toISOString().slice(0, 10);
  const todaySchedules = schedules.filter(s => s.start_date <= today && (s.end_date || s.start_date) >= today);

  return (
    <>
      <div className="page-header">
        <div><h1 className="page-title">📊 營運儀表板</h1><p className="page-subtitle">WDMC 企業營運即時概覽</p></div>
        <div style={{ fontSize: 12, color: 'var(--c-text-muted)' }}>{new Date().toLocaleDateString('zh-TW', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' })}</div>
      </div>

      {/* 核心 KPI */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 14, marginBottom: 24 }}>
        <div className="stat-card"><div className="stat-icon" style={{ background: 'var(--c-primary-light)' }}>📁</div><div><div className="stat-value">{stats?.projects?.total || projects.length}</div><div className="stat-label">總專案</div></div></div>
        <div className="stat-card"><div className="stat-icon" style={{ background: 'var(--c-success-light)' }}>🔄</div><div><div className="stat-value">{activeProjects.length}</div><div className="stat-label">進行中</div></div></div>
        <div className="stat-card"><div className="stat-icon" style={{ background: 'var(--c-info-light)' }}>🤝</div><div><div className="stat-value">{stats?.customers?.total || customers.length}</div><div className="stat-label">客戶數</div></div></div>
        <div className="stat-card"><div className="stat-icon" style={{ background: '#fef3c7' }}>💰</div><div><div className="stat-value">${((stats?.finance?.totalRevenue || 0) / 10000).toFixed(0)}萬</div><div className="stat-label">總營收</div></div></div>
        <div className="stat-card"><div className="stat-icon" style={{ background: '#ede9fe' }}>📈</div><div><div className="stat-value">{stats?.finance?.profitMargin || 0}%</div><div className="stat-label">利潤率</div></div></div>
        <div className="stat-card"><div className="stat-icon" style={{ background: 'var(--c-warning-light)' }}>⏳</div><div><div className="stat-value">{approvals.pending || 0}</div><div className="stat-label">待審批</div></div></div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 20, marginBottom: 20 }}>
        {/* 進行中專案 */}
        <div className="card">
          <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 12 }}>🔄 進行中專案</h3>
          {activeProjects.length === 0 ? <p style={{ color: 'var(--c-text-muted)', fontSize: 13, textAlign: 'center', padding: 20 }}>目前無進行中專案</p> : (
            <div className="table-wrap"><table>
              <thead><tr><th>專案</th><th>類型</th><th>進度</th><th>活動日</th></tr></thead>
              <tbody>{activeProjects.slice(0, 8).map(p => (
                <tr key={p.id}>
                  <td><a href={`/projects/${p.id}`} style={{ fontWeight: 600, color: 'var(--c-primary)', fontSize: 13 }}>{p.name}</a></td>
                  <td style={{ fontSize: 12 }}>{p.event_type || '-'}</td>
                  <td style={{ width: 120 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <div style={{ flex: 1, height: 6, background: 'var(--c-border)', borderRadius: 3 }}>
                        <div style={{ height: '100%', width: `${p.progress || 0}%`, background: (p.progress || 0) >= 80 ? 'var(--c-success)' : 'var(--c-primary)', borderRadius: 3 }} />
                      </div>
                      <span style={{ fontSize: 11, fontWeight: 700, minWidth: 28 }}>{p.progress || 0}%</span>
                    </div>
                  </td>
                  <td style={{ fontSize: 11, fontFamily: 'monospace' }}>{p.event_date || '-'}</td>
                </tr>
              ))}</tbody>
            </table></div>
          )}
        </div>

        {/* 今日排班 */}
        <div className="card">
          <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 12 }}>👷 今日排班 ({todaySchedules.length})</h3>
          {todaySchedules.length === 0 ? <p style={{ color: 'var(--c-text-muted)', fontSize: 13, textAlign: 'center', padding: 20 }}>今日無排班</p> : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {todaySchedules.map(s => (
                <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', border: '1px solid var(--c-border)', borderRadius: 8, borderLeft: '4px solid #7c3aed' }}>
                  <div className="avatar" style={{ background: s.user_avatar_color || '#7c3aed', width: 28, height: 28, fontSize: 11 }}>{(s.user_name || '?')[0]}</div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>{s.user_name}</div>
                    <div style={{ fontSize: 11, color: 'var(--c-text-muted)' }}>{s.project_name || s.title || '-'} · {s.location || ''}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        {/* 最新客戶 */}
        <div className="card">
          <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 12 }}>🤝 近期客戶</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
            {customers.slice(0, 6).map(c => (
              <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', border: '1px solid var(--c-border)', borderRadius: 8 }}>
                <div className="avatar" style={{ background: '#6366f1', width: 30, height: 30, fontSize: 12 }}>{(c.name || '?')[0]}</div>
                <div><div style={{ fontWeight: 600, fontSize: 12 }}>{c.name}</div><div style={{ fontSize: 10, color: 'var(--c-text-muted)' }}>{c.contact_name || ''}</div></div>
              </div>
            ))}
          </div>
        </div>

        {/* 最新檔案 */}
        <div className="card">
          <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 12 }}>📂 最新上傳</h3>
          {recentFiles.length === 0 ? <p style={{ color: 'var(--c-text-muted)', fontSize: 13, textAlign: 'center', padding: 20 }}>尚無檔案</p> : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {recentFiles.map(f => (
                <div key={f.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 10px', border: '1px solid var(--c-border)', borderRadius: 6, fontSize: 12 }}>
                  <div style={{ fontWeight: 500 }}>📄 {f.original_name}</div>
                  <div style={{ color: 'var(--c-text-muted)', fontSize: 10 }}>{f.uploader_name}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
