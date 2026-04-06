import { useState, useEffect } from 'react'
import { useLang } from '../LangContext'
import { useAuth } from '../AuthContext'
import { api } from '../api'

/* ──────────── 專案啟動與分工確認表 (Project Kick-off) ──────────── */
export default function ProjectKickoff() {
  const { t } = useLang();
  const { user } = useAuth();
  const [projects, setProjects] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [users, setUsers] = useState([]);
  const [selectedProject, setSelectedProject] = useState('');
  const [form, setForm] = useState({
    projectName: '', projectStatus: '建立中', customerName: '', projectCode: '',
    projectManager: '', supervisor: '',
    startDate: '', endDate: '', location: '',
    totalBudget: 0, execBudgetLimit: 0,
  });
  const [team, setTeam] = useState([
    { role: '企劃', color: '#3B82F6', focus: '企劃書撰稿、活動規劃', person: '', note: '' },
    { role: '設計', color: '#F97316', focus: '主視覺設計及延伸', person: '', note: '' },
    { role: '執行', color: '#22C55E', focus: '預算控管、客戶對接、廠商聯絡', person: '', note: '' },
    { role: '硬體', color: '#8B5CF6', focus: '硬體設備與執行', person: '', note: '' },
    { role: '燈電', color: '#EC4899', focus: '燈光音響電力', person: '', note: '' },
  ]);

  useEffect(() => {
    api.getProjects().then(setProjects).catch(() => {});
    api.getCustomers().then(setCustomers).catch(() => {});
    api.getUsers?.().then(setUsers).catch(() => {});
  }, []);

  const handleProjectSelect = (projId) => {
    setSelectedProject(projId);
    const proj = projects.find(p => String(p.id) === String(projId));
    if (proj) {
      const cust = customers.find(c => String(c.id) === String(proj.customer_id));
      setForm(prev => ({
        ...prev,
        projectName: proj.name,
        customerName: cust?.name || '',
        projectCode: `PROJ-${new Date().toISOString().slice(0, 7).replace('-', '')}-${String(proj.id).padStart(4, '0')}`,
        startDate: proj.event_date || '',
        endDate: proj.event_date || '',
      }));
    }
  };

  const updateTeam = (idx, field, value) => {
    const next = [...team];
    next[idx] = { ...next[idx], [field]: value };
    setTeam(next);
  };

  return (<>
    <div style={{ marginBottom: 20 }}>
      <h1 style={{ fontSize: 22, fontWeight: 800 }}>{t('kickoff.title')}</h1>
      <p style={{ fontSize: 13, color: 'var(--c-text-muted)', marginTop: 4 }}>Project Kick-off — 專案名稱可連結到專案，客戶名稱等資訊自動填寫</p>
    </div>

    {/* Project Selection */}
    <div className="card" style={{ marginBottom: 16 }}>
      <select value={selectedProject} onChange={e => handleProjectSelect(e.target.value)}
        style={{ padding: '8px 12px', border: '1px solid var(--c-border)', borderRadius: 8, background: 'var(--c-bg)', color: 'var(--c-text)', fontSize: 13, minWidth: 300 }}>
        <option value="">-- 選擇要啟動的專案 --</option>
        {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
      </select>
    </div>

    {/* Section A: Project Info */}
    <div className="card" style={{ marginBottom: 20 }}>
      <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16, paddingBottom: 8, borderBottom: '2px solid var(--c-primary)' }}>
        A. {t('kickoff.projectInfo')}
      </h3>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        {[
          { label: '專案名稱', key: 'projectName', linked: true },
          { label: '專案狀態', key: 'projectStatus', type: 'select', options: ['建立中', '規劃中', '已啟動', '執行中'] },
          { label: '客戶名稱', key: 'customerName', auto: true },
          { label: '專案編號', key: 'projectCode', auto: true },
          { label: '專案主管', key: 'projectManager' },
          { label: '主管', key: 'supervisor' },
          { label: '活動開始日期', key: 'startDate', type: 'date' },
          { label: '活動結束日期', key: 'endDate', type: 'date' },
          { label: '活動地點', key: 'location', full: true },
        ].map((f, i) => (
          <div key={i} style={f.full ? { gridColumn: '1 / -1' } : {}}>
            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--c-text-muted)', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
              {f.label}
              {f.auto && <span style={{ fontSize: 10, color: 'var(--c-primary)', background: 'var(--c-primary-bg)', padding: '1px 6px', borderRadius: 4 }}>自動</span>}
              {f.linked && <span style={{ fontSize: 10, color: 'var(--c-info)', background: 'color-mix(in srgb, var(--c-info) 10%, transparent)', padding: '1px 6px', borderRadius: 4 }}>可連結</span>}
            </label>
            {f.type === 'select' ? (
              <select value={form[f.key]} onChange={e => setForm({ ...form, [f.key]: e.target.value })}
                style={{ width: '100%', padding: '8px 10px', border: '1px solid var(--c-border)', borderRadius: 8, background: 'var(--c-bg)', color: 'var(--c-text)', fontSize: 13 }}>
                {f.options.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            ) : (
              <input type={f.type || 'text'} value={form[f.key]} onChange={e => setForm({ ...form, [f.key]: e.target.value })}
                readOnly={f.auto}
                style={{ width: '100%', padding: '8px 10px', border: '1px solid var(--c-border)', borderRadius: 8, background: f.auto ? 'var(--c-primary-bg)' : 'var(--c-bg)', color: 'var(--c-text)', fontSize: 13 }} />
            )}
          </div>
        ))}
        <div>
          <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--c-text-muted)', marginBottom: 4, display: 'block' }}>{t('kickoff.projectBudget')}</label>
          <input type="number" value={form.totalBudget} onChange={e => setForm({ ...form, totalBudget: parseInt(e.target.value) || 0 })}
            style={{ width: '100%', padding: '8px 10px', border: '1px solid var(--c-border)', borderRadius: 8, background: 'var(--c-bg)', color: 'var(--c-text)', fontSize: 13 }} />
        </div>
        <div>
          <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--c-text-muted)', marginBottom: 4, display: 'block' }}>
            {t('kickoff.execBudgetLimit')}
            <span style={{ fontSize: 10, color: 'var(--c-text-muted)', marginLeft: 4 }}>利潤保留後可動用金額</span>
          </label>
          <input type="number" value={form.execBudgetLimit} onChange={e => setForm({ ...form, execBudgetLimit: parseInt(e.target.value) || 0 })}
            style={{ width: '100%', padding: '8px 10px', border: '1px solid var(--c-border)', borderRadius: 8, background: 'var(--c-bg)', color: 'var(--c-text)', fontSize: 13 }} />
        </div>
      </div>
    </div>

    {/* Section B: Team & Weighting */}
    <div className="card">
      <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16, paddingBottom: 8, borderBottom: '2px solid var(--c-accent)' }}>
        B. {t('kickoff.teamWeighting')}
      </h3>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: '2px solid var(--c-border)' }}>
              <th style={{ padding: '10px 8px', textAlign: 'left', fontWeight: 600, fontSize: 12, color: 'var(--c-text-muted)' }}>職能組別</th>
              <th style={{ padding: '10px 8px', textAlign: 'left', fontWeight: 600, fontSize: 12, color: 'var(--c-text-muted)' }}>{t('kickoff.jobFocus')}</th>
              <th style={{ padding: '10px 8px', textAlign: 'left', fontWeight: 600, fontSize: 12, color: 'var(--c-text-muted)' }}>{t('kickoff.leadPerson')}</th>
              <th style={{ padding: '10px 8px', textAlign: 'left', fontWeight: 600, fontSize: 12, color: 'var(--c-text-muted)' }}>備註說明</th>
            </tr>
          </thead>
          <tbody>
            {team.map((t, i) => (
              <tr key={i} style={{ borderBottom: '1px solid var(--c-border)' }}>
                <td style={{ padding: '10px 8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div style={{ width: 14, height: 14, borderRadius: 4, background: t.color }} />
                    <span style={{ fontWeight: 600 }}>{t.role}</span>
                  </div>
                </td>
                <td style={{ padding: '10px 8px' }}>
                  <input value={t.focus} onChange={e => updateTeam(i, 'focus', e.target.value)}
                    style={{ width: '100%', padding: '6px 8px', border: '1px solid var(--c-border)', borderRadius: 6, background: 'var(--c-bg)', color: 'var(--c-text)', fontSize: 12 }} />
                </td>
                <td style={{ padding: '10px 8px' }}>
                  <select value={t.person} onChange={e => updateTeam(i, 'person', e.target.value)}
                    style={{ padding: '6px 8px', border: '1px solid var(--c-border)', borderRadius: 6, background: 'var(--c-bg)', color: 'var(--c-text)', fontSize: 12 }}>
                    <option value="">選擇</option>
                    {users.map(u => <option key={u.id} value={u.display_name}>{u.display_name}</option>)}
                  </select>
                </td>
                <td style={{ padding: '10px 8px' }}>
                  <input value={t.note} onChange={e => updateTeam(i, 'note', e.target.value)}
                    style={{ width: '100%', padding: '6px 8px', border: '1px solid var(--c-border)', borderRadius: 6, background: 'var(--c-bg)', color: 'var(--c-text)', fontSize: 12 }} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div style={{ marginTop: 16, display: 'flex', gap: 8 }}>
        <button className="btn" style={{ background: 'var(--c-primary)', color: 'white', border: 'none' }}>{t('common.save')}</button>
        <button className="btn btn-ghost">{t('common.cancel')}</button>
      </div>
    </div>
  </>);
}
