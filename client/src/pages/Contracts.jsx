import { useState, useEffect } from 'react'
import { api } from '../api'

const STATUS_MAP = {
  draft: { label: '草稿', class: 'badge-info' },
  pending: { label: '待簽', class: 'badge-warning' },
  active: { label: '生效中', class: 'badge-success' },
  expired: { label: '已到期', class: 'badge-danger' },
  terminated: { label: '已終止', class: 'badge-danger' },
};

export default function Contracts() {
  const [contracts, setContracts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [projects, setProjects] = useState([]);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ title: '', customer_id: '', project_id: '', amount: '', start_date: '', end_date: '', terms: '' });

  useEffect(() => {
    api.getContracts().then(setContracts);
    api.getCustomers().then(setCustomers).catch(() => {});
    api.getProjects().then(setProjects).catch(() => {});
  }, []);

  const add = async () => {
    if (!form.title.trim()) return;
    await api.createContract({ ...form, amount: Number(form.amount) || 0 });
    api.getContracts().then(setContracts);
    setShowAdd(false); setForm({ title: '', customer_id: '', project_id: '', amount: '', start_date: '', end_date: '', terms: '' });
  };

  const updateStatus = async (id, status) => {
    await api.updateContract(id, { status });
    api.getContracts().then(setContracts);
  };

  const set = f => e => setForm({ ...form, [f]: e.target.value });

  const totalActive = contracts.filter(c => c.status === 'active').reduce((s, c) => s + (c.amount || 0), 0);

  return (
    <>
      <div className="page-header">
        <div><h1 className="page-title">📃 合約管理</h1><p className="page-subtitle">管理客戶合約、追蹤執行狀態</p></div>
        <button className="btn btn-primary" onClick={() => setShowAdd(true)}>➕ 新增合約</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 24 }}>
        <div className="stat-card"><div className="stat-icon" style={{ background: 'var(--c-primary-light)' }}>📃</div><div><div className="stat-value">{contracts.length}</div><div className="stat-label">總合約數</div></div></div>
        <div className="stat-card"><div className="stat-icon" style={{ background: 'var(--c-success-light)' }}>✅</div><div><div className="stat-value">{contracts.filter(c => c.status === 'active').length}</div><div className="stat-label">生效中</div></div></div>
        <div className="stat-card"><div className="stat-icon" style={{ background: 'var(--c-warning-light)' }}>⏳</div><div><div className="stat-value">{contracts.filter(c => c.status === 'pending').length}</div><div className="stat-label">待簽署</div></div></div>
        <div className="stat-card"><div className="stat-icon" style={{ background: 'var(--c-info-light)' }}>💰</div><div><div className="stat-value">${totalActive.toLocaleString()}</div><div className="stat-label">生效合約總額</div></div></div>
      </div>

      {showAdd && (
        <div className="card" style={{ marginBottom: 16 }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 12 }}>新增合約</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
            <div className="form-group"><label className="form-label">合約名稱 *</label><input className="form-input" value={form.title} onChange={set('title')} /></div>
            <div className="form-group"><label className="form-label">客戶</label><select className="form-select" value={form.customer_id} onChange={set('customer_id')}><option value="">-</option>{customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
            <div className="form-group"><label className="form-label">關聯專案</label><select className="form-select" value={form.project_id} onChange={set('project_id')}><option value="">-</option>{projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
            <div className="form-group"><label className="form-label">合約金額</label><input className="form-input" type="number" value={form.amount} onChange={set('amount')} /></div>
            <div className="form-group"><label className="form-label">開始日期</label><input className="form-input" type="date" value={form.start_date} onChange={set('start_date')} /></div>
            <div className="form-group"><label className="form-label">結束日期</label><input className="form-input" type="date" value={form.end_date} onChange={set('end_date')} /></div>
          </div>
          <div className="form-group"><label className="form-label">合約條款</label><textarea className="form-textarea" value={form.terms} onChange={set('terms')} rows={3} /></div>
          <div style={{ display: 'flex', gap: 8 }}><button className="btn btn-primary" onClick={add}>建立</button><button className="btn btn-secondary" onClick={() => setShowAdd(false)}>取消</button></div>
        </div>
      )}

      {contracts.length === 0 ? (
        <div className="empty-state"><div className="empty-state-icon">📃</div><div className="empty-state-title">尚無合約</div></div>
      ) : (
        <div className="table-wrap"><table>
          <thead><tr><th>合約編號</th><th>合約名稱</th><th>客戶</th><th>專案</th><th>金額</th><th>期間</th><th>狀態</th><th>操作</th></tr></thead>
          <tbody>{contracts.map(c => (
            <tr key={c.id}>
              <td style={{ fontFamily: 'monospace', fontSize: 11, color: 'var(--c-text-muted)' }}>{c.contract_number}</td>
              <td style={{ fontWeight: 600 }}>{c.title}</td>
              <td style={{ fontSize: 12 }}>{c.customer_name || '-'}</td>
              <td style={{ fontSize: 12 }}>{c.project_name || '-'}</td>
              <td style={{ fontWeight: 600, color: 'var(--c-primary)' }}>${(c.amount || 0).toLocaleString()}</td>
              <td style={{ fontSize: 11, color: 'var(--c-text-muted)' }}>{c.start_date || '?'} ~ {c.end_date || '?'}</td>
              <td><span className={`badge ${STATUS_MAP[c.status]?.class || ''}`}>{STATUS_MAP[c.status]?.label || c.status}</span></td>
              <td>
                <select className="form-select" style={{ padding: '3px 6px', fontSize: 11, width: 90 }} value={c.status} onChange={e => updateStatus(c.id, e.target.value)}>
                  {Object.entries(STATUS_MAP).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                </select>
              </td>
            </tr>
          ))}</tbody>
        </table></div>
      )}
    </>
  );
}
