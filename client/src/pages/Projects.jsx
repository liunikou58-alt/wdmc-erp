import { useState, useEffect } from 'react'
import { useLang } from '../LangContext'
import { Link } from 'react-router-dom'
import { api } from '../api'

const getKANBAN_COLS = (t) => [
  { key: 'planning', label: t('proj.col.planning'), color: 'var(--c-info)' },
  { key: 'proposing', label: t('proj.col.proposing'), color: 'var(--c-warning)' },
  { key: 'in_progress', label: t('proj.col.inProgress'), color: 'var(--c-primary)' },
  { key: 'closing', label: t('proj.col.closing'), color: 'var(--c-success)' },
  { key: 'completed', label: t('proj.col.completed'), color: '#6b7280' },
];
const getSTATUS_MAP = (t) => ({
  planning: { label: t('proj.status.planning'), class: 'badge-info', icon: '📐' },
  proposing: { label: t('proj.status.proposing'), class: 'badge-warning', icon: '🗳️' },
  in_progress: { label: t('proj.status.inProgress'), class: 'badge-primary', icon: '🔄' },
  closing: { label: t('proj.status.closing'), class: 'badge-success', icon: '📋' },
  completed: { label: t('proj.status.completed'), class: 'badge-success', icon: '✅' },
  cancelled: { label: t('proj.status.cancelled'), class: 'badge-danger', icon: '❌' },
});
const PROJECT_TYPES = ['一般專案', '政府標案', '同業合作'];

function ProgressRing({ pct, size = 40, stroke = 3 }) {
  const r = (size - stroke) / 2, c = 2 * Math.PI * r;
  return (
    <div className="progress-ring" style={{ width: size, height: size }}>
      <svg width={size} height={size}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="var(--c-border)" strokeWidth={stroke} />
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={pct >= 100 ? 'var(--c-success)' : 'var(--c-primary)'} strokeWidth={stroke}
          strokeDasharray={c} strokeDashoffset={c - (pct / 100) * c} strokeLinecap="round"
          transform={`rotate(-90 ${size/2} ${size/2})`} style={{ transition: 'stroke-dashoffset 0.6s ease' }} />
      </svg>
      <span className="progress-ring-text" style={{ fontSize: 10 }}>{pct}%</span>
    </div>
  );
}

export default function Projects() {
  const { t } = useLang();
  const KANBAN_COLS = getKANBAN_COLS(t);
  const STATUS_MAP = getSTATUS_MAP(t);
  const [projects, setProjects] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [filter, setFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [viewMode, setViewMode] = useState('kanban');
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: '', customer_id: '', event_date: '', deadline: '', budget: '', event_type: '', project_type: '一般專案' });
  const [dragItem, setDragItem] = useState(null);

  const load = () => {
    api.getProjects().then(setProjects);
    api.getCustomers().then(setCustomers).catch(() => {});
  };
  useEffect(() => { load(); }, []);

  const filtered = projects.filter(p => {
    if (filter !== 'all' && p.status !== filter) return false;
    if (typeFilter !== 'all' && p.project_type !== typeFilter) return false;
    return true;
  });

  const add = async () => {
    if (!form.name.trim()) return;
    await api.createProject({ ...form, budget: Number(form.budget) || 0 });
    load();
    setShowAdd(false); setForm({ name: '', customer_id: '', event_date: '', deadline: '', budget: '', event_type: '', project_type: '一般專案' });
  };

  const moveProject = async (projectId, newStatus) => {
    await api.updateProject(projectId, { status: newStatus });
    load();
  };

  const set = f => e => setForm({ ...form, [f]: e.target.value });

  return (<>
    <div className="page-header">
      <div><h1 className="page-title">{t('page.projects')}</h1><p className="page-subtitle">{t('proj.subtitle')}</p></div>
      <div style={{ display: 'flex', gap: 8 }}>
        <div style={{ display: 'flex', background: 'var(--c-bg-elevated)', borderRadius: 8, overflow: 'hidden' }}>
          <button className={`btn btn-sm ${viewMode === 'kanban' ? 'btn-primary' : ''}`} onClick={() => setViewMode('kanban')} style={{ borderRadius: 0 }}>{t('proj.kanban')}</button>
          <button className={`btn btn-sm ${viewMode === 'list' ? 'btn-primary' : ''}`} onClick={() => setViewMode('list')} style={{ borderRadius: 0 }}>{t('proj.list')}</button>
        </div>
        <button className="btn btn-primary" onClick={() => setShowAdd(true)}>{t('proj.addProject')}</button>
      </div>
    </div>

    {/* Type Filter + Status Filter */}
    <div style={{ display: 'flex', gap: 16, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
      <div className="sub-tabs">
        {[{ key: 'all', label: t('common.allTypes') }, ...PROJECT_TYPES.map(t => ({ key: t, label: t }))].map(f => (
          <button key={f.key} className={`sub-tab ${typeFilter === f.key ? 'active' : ''}`} onClick={() => setTypeFilter(f.key)} style={{ fontSize: 12 }}>
            {f.label} ({f.key === 'all' ? projects.length : projects.filter(p => p.project_type === f.key).length})
          </button>
        ))}
      </div>
      {viewMode === 'list' && (
        <div className="sub-tabs">
          {[{ key: 'all', label: t('common.all'), count: projects.length }, ...Object.entries(STATUS_MAP).map(([k, v]) => ({ key: k, label: `${v.icon} ${v.label}`, count: projects.filter(p => p.status === k).length }))].map(f => (
            <button key={f.key} className={`sub-tab ${filter === f.key ? 'active' : ''}`} onClick={() => setFilter(f.key)} style={{ fontSize: 11 }}>{f.label} ({f.count})</button>
          ))}
        </div>
      )}
    </div>

    {/* Kanban View */}
    {viewMode === 'kanban' && (
      <div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 12 }}>
        {KANBAN_COLS.map(col => {
          const colProjects = projects.filter(p => {
            if (typeFilter !== 'all' && p.project_type !== typeFilter) return false;
            return p.status === col.key;
          });
          return (
            <div key={col.key} style={{ flex: '0 0 260px', minHeight: 300 }}
              onDragOver={e => { e.preventDefault(); e.currentTarget.style.background = 'var(--c-bg-elevated)'; }}
              onDragLeave={e => { e.currentTarget.style.background = ''; }}
              onDrop={e => { e.currentTarget.style.background = ''; if (dragItem) moveProject(dragItem, col.key); setDragItem(null); }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, padding: '8px 12px', background: `color-mix(in srgb, ${col.color} 12%, transparent)`, borderRadius: 10, borderLeft: `4px solid ${col.color}` }}>
                <span style={{ fontWeight: 700, fontSize: 13, color: col.color }}>{col.label}</span>
                <span style={{ background: col.color, color: '#fff', borderRadius: 10, padding: '1px 8px', fontSize: 11, fontWeight: 700 }}>{colProjects.length}</span>
              </div>
              <div style={{ display: 'grid', gap: 8 }}>
                {colProjects.map(p => (
                  <Link key={p.id} to={`/projects/${p.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                    <div className="card" style={{ padding: 14, cursor: 'grab', transition: 'transform .1s, box-shadow .1s' }}
                      draggable onDragStart={() => setDragItem(p.id)}
                      onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(0,0,0,.1)'; }}
                      onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = ''; }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                        <div style={{ fontWeight: 700, fontSize: 13, flex: 1, minWidth: 0 }}>{p.name}</div>
                        <ProgressRing pct={p.progress || 0} size={32} stroke={2.5} />
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--c-text-muted)', marginBottom: 6 }}>{p.customer_name || t('proj.noCustomer')}</div>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', fontSize: 10 }}>
                        {p.project_type && <span className="badge" style={{ fontSize: 9 }}>{p.project_type === '政府標案' ? '🏛️' : '💼'} {p.project_type}</span>}
                        <span style={{ color: 'var(--c-text-muted)' }}>📋 {p.task_count || 0}</span>
                        {p.deadline && <span style={{ color: 'var(--c-text-muted)' }}>📅 {p.deadline}</span>}
                      </div>
                    </div>
                  </Link>
                ))}
                {colProjects.length === 0 && (
                  <div style={{ padding: 20, textAlign: 'center', color: 'var(--c-text-muted)', fontSize: 12, border: '2px dashed var(--c-border)', borderRadius: 10, opacity: 0.5 }}>
                    拖曳專案到此
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    )}

    {/* List View */}
    {viewMode === 'list' && (
      <>
        {filtered.length === 0 ? (
          <div className="empty-state"><div className="empty-state-icon">📁</div><div className="empty-state-title">{t('proj.noProjects')}</div></div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
            {filtered.map(p => (
              <Link key={p.id} to={`/projects/${p.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                <div className="card" style={{ cursor: 'pointer', padding: 18 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: 15 }}>{p.name}</div>
                      <div style={{ fontSize: 12, color: 'var(--c-text-muted)' }}>{p.customer_name || t('proj.noCustomerLinked')} · {p.event_type || t('proj.uncategorized')}</div>
                    </div>
                    <ProgressRing pct={p.progress || 0} />
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, fontSize: 12 }}>
                    <span className={`badge ${STATUS_MAP[p.status]?.class || ''}`}>{STATUS_MAP[p.status]?.icon} {STATUS_MAP[p.status]?.label || p.status}</span>
                    {p.project_type && <span className="badge">{p.project_type === '政府標案' ? '🏛️' : '💼'} {p.project_type}</span>}
                    <span style={{ color: 'var(--c-text-muted)' }}>👤 {p.pm_name || t('proj.unassigned')}</span>
                    <span style={{ color: 'var(--c-text-muted)' }}>📋 {p.task_count} {t('proj.tasks')}</span>
                    {p.deadline && <span style={{ color: 'var(--c-text-muted)' }}>📅 {p.deadline}</span>}
                    {p.budget > 0 && <span style={{ color: 'var(--c-text-muted)' }}>💰 ${p.budget.toLocaleString()}</span>}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </>
    )}

    {/* Add Modal */}
    {showAdd && (
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.4)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="card" style={{ width: 560, padding: 24, animation: 'fadeUp 0.3s ease' }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 14 }}>{t('proj.addProject')}</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 12 }}>
            <div className="form-group"><label className="form-label">{t('proj.projectName')}</label><input className="form-input" value={form.name} onChange={set('name')} /></div>
            <div className="form-group"><label className="form-label">{t('proj.projectType')}</label>
              <select className="form-input" value={form.project_type} onChange={set('project_type')}>
                {PROJECT_TYPES.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div className="form-group"><label className="form-label">{t('proj.customer')}</label><select className="form-input" value={form.customer_id} onChange={set('customer_id')}><option value="">未關聯</option>{customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
            <div className="form-group"><label className="form-label">{t('proj.eventType')}</label><input className="form-input" value={form.event_type} onChange={set('event_type')} placeholder={t('proj.eventTypePlaceholder')} /></div>
            <div className="form-group"><label className="form-label">{t('proj.eventDate')}</label><input className="form-input" type="date" value={form.event_date} onChange={set('event_date')} /></div>
            <div className="form-group"><label className="form-label">{t('proj.deadline')}</label><input className="form-input" type="date" value={form.deadline} onChange={set('deadline')} /></div>
            <div className="form-group"><label className="form-label">{t('proj.budget')}</label><input className="form-input" type="number" value={form.budget} onChange={set('budget')} /></div>
          </div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 14 }}>
            <button className="btn btn-secondary" onClick={() => setShowAdd(false)}>{t('common.cancel')}</button>
            <button className="btn btn-primary" onClick={add}>{t('common.create')}</button>
          </div>
        </div>
      </div>
    )}
  </>);
}
