import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api'

const STATUS_MAP = {
  planning: { label: '規劃中', class: 'badge-info', icon: '📐' },
  in_progress: { label: '執行中', class: 'badge-primary', icon: '🔄' },
  completed: { label: '已結案', class: 'badge-success', icon: '✅' },
  cancelled: { label: '已取消', class: 'badge-danger', icon: '❌' },
};

export default function Projects() {
  const [projects, setProjects] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [users, setUsers] = useState([]);
  const [filter, setFilter] = useState('all');
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: '', customer_id: '', event_date: '', deadline: '', budget: '', event_type: '' });

  useEffect(() => {
    api.getProjects().then(setProjects);
    api.getCustomers().then(setCustomers).catch(() => {});
    api.getUsers().then(setUsers).catch(() => {});
  }, []);

  const filtered = filter === 'all' ? projects : projects.filter(p => p.status === filter);

  const add = async () => {
    if (!form.name.trim()) return;
    await api.createProject({ ...form, budget: Number(form.budget) || 0 });
    api.getProjects().then(setProjects);
    setShowAdd(false); setForm({ name: '', customer_id: '', event_date: '', deadline: '', budget: '', event_type: '' });
  };

  const set = f => e => setForm({ ...form, [f]: e.target.value });

  return (
    <>
      <div className="page-header">
        <div><h1 className="page-title">📁 專案管理</h1><p className="page-subtitle">管理所有專案、追蹤進度與任務</p></div>
        <button className="btn btn-primary" onClick={() => setShowAdd(true)}>➕ 新建專案</button>
      </div>

      {/* 狀態篩選 */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {[{ key: 'all', label: '全部', count: projects.length }, ...Object.entries(STATUS_MAP).map(([k, v]) => ({ key: k, label: v.label, count: projects.filter(p => p.status === k).length }))].map(f => (
          <button key={f.key} className={`btn btn-sm ${filter === f.key ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setFilter(f.key)}>{f.label} ({f.count})</button>
        ))}
      </div>

      {showAdd && (
        <div className="card" style={{ marginBottom: 20 }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 12 }}>新建專案</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 12 }}>
            <div className="form-group"><label className="form-label">專案名稱 *</label><input className="form-input" value={form.name} onChange={set('name')} /></div>
            <div className="form-group"><label className="form-label">客戶</label>
              <select className="form-select" value={form.customer_id} onChange={set('customer_id')}>
                <option value="">未關聯</option>{customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select></div>
            <div className="form-group"><label className="form-label">活動類型</label><input className="form-input" value={form.event_type} onChange={set('event_type')} placeholder="記者會/晚宴/演唱會..." /></div>
            <div className="form-group"><label className="form-label">活動日期</label><input className="form-input" type="date" value={form.event_date} onChange={set('event_date')} /></div>
            <div className="form-group"><label className="form-label">截止日</label><input className="form-input" type="date" value={form.deadline} onChange={set('deadline')} /></div>
            <div className="form-group"><label className="form-label">預算</label><input className="form-input" type="number" value={form.budget} onChange={set('budget')} /></div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}><button className="btn btn-primary" onClick={add}>✅ 建立</button><button className="btn btn-secondary" onClick={() => setShowAdd(false)}>取消</button></div>
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="empty-state"><div className="empty-state-icon">📁</div><div className="empty-state-title">尚無專案</div></div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
          {filtered.map(p => (
            <Link key={p.id} to={`/projects/${p.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
              <div className="card" style={{ cursor: 'pointer' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 15 }}>{p.name}</div>
                    <div style={{ fontSize: 12, color: 'var(--c-text-muted)' }}>{p.customer_name || '未關聯客戶'} · {p.event_type || '未分類'}</div>
                  </div>
                  <span className={`badge ${STATUS_MAP[p.status]?.class || ''}`}>{STATUS_MAP[p.status]?.icon} {STATUS_MAP[p.status]?.label || p.status}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                  <div style={{ flex: 1, height: 6, background: 'var(--c-border)', borderRadius: 3 }}>
                    <div style={{ height: '100%', width: `${p.progress}%`, background: p.progress === 100 ? 'var(--c-success)' : 'var(--c-primary)', borderRadius: 3, transition: 'width 0.3s' }} />
                  </div>
                  <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--c-primary)' }}>{p.progress}%</span>
                </div>
                <div style={{ display: 'flex', gap: 16, fontSize: 12, color: 'var(--c-text-muted)' }}>
                  <span>👤 {p.pm_name || '未指派'}</span>
                  <span>📋 {p.task_count} 任務 ({p.done_count} 完成)</span>
                  {p.deadline && <span>📅 {p.deadline}</span>}
                  {p.budget > 0 && <span>💰 ${p.budget.toLocaleString()}</span>}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
