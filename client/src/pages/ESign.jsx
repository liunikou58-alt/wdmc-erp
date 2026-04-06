import { useState, useEffect } from 'react'
import { useLang } from '../LangContext'

const STATUS_MAP = {
  pending: { label: '待發送', icon: '📝', class: 'badge-info' },
  sent: { label: '已發送', icon: '📧', class: 'badge-warning' },
  viewed: { label: '已查看', icon: '👁️', class: 'badge-primary' },
  signed: { label: '已簽署', icon: '✅', class: 'badge-success' },
  rejected: { label: '已拒絕', icon: '❌', class: 'badge-danger' },
  expired: { label: '已過期', icon: '⏰', class: 'badge-danger' },
};
const DOC_TYPES = {
  labor_report: '📝 勞報單', contract: '📃 合約', quotation: '📋 報價單', purchase_order: '🧮 採購單',
};
const H = () => ({ Authorization: `Bearer ${localStorage.getItem('erp_token')}`, 'Content-Type': 'application/json' });

export default function ESign() {
  const { t } = useLang();
  const [records, setRecords] = useState([]);
  const [stats, setStats] = useState({});
  const [filter, setFilter] = useState('all');
  const [showSend, setShowSend] = useState(false);
  const [form, setForm] = useState({ doc_type: 'labor_report', doc_title: '', signer_email: '', notes: '' });

  const load = () => {
    fetch('/api/esign', { headers: H() }).then(r => r.ok ? r.json() : []).then(setRecords).catch(() => {});
    fetch('/api/esign/stats', { headers: H() }).then(r => r.ok ? r.json() : {}).then(setStats).catch(() => {});
  };
  useEffect(load, []);

  const send = async () => {
    if (!form.doc_title) return;
    await fetch('/api/esign', { method: 'POST', headers: H(), body: JSON.stringify(form) });
    load(); setShowSend(false); setForm({ doc_type: 'labor_report', doc_title: '', signer_email: '', notes: '' });
  };

  const updateStatus = async (id, status) => {
    await fetch(`/api/esign/${id}`, { method: 'PUT', headers: H(), body: JSON.stringify({ status }) });
    load();
  };

  const filtered = filter === 'all' ? records : records.filter(r => r.status === filter);

  return (<>
    <div className="page-header">
      <div><h1 className="page-title">{t('page.esign')}</h1><p className="page-subtitle">勞報單、合約、報價單電子簽署管理</p></div>
      <button className="btn btn-primary" onClick={() => setShowSend(true)}>📧 發起簽核</button>
    </div>

    {/* KPI */}
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12, marginBottom: 20 }}>
      <div className="stat-card"><div className="stat-icon">📋</div><div><div className="stat-value">{stats.total || 0}</div><div className="stat-label">總簽核</div></div></div>
      <div className="stat-card"><div className="stat-icon" style={{ background: 'var(--c-warning-light)' }}>⏳</div><div><div className="stat-value" style={{ color: 'var(--c-warning)' }}>{stats.pending || 0}</div><div className="stat-label">待簽署</div></div></div>
      <div className="stat-card"><div className="stat-icon" style={{ background: 'var(--c-info-light)' }}>👁️</div><div><div className="stat-value" style={{ color: 'var(--c-info)' }}>{stats.viewed || 0}</div><div className="stat-label">已查看</div></div></div>
      <div className="stat-card"><div className="stat-icon" style={{ background: 'var(--c-success-light)' }}>✅</div><div><div className="stat-value" style={{ color: 'var(--c-success)' }}>{stats.signed || 0}</div><div className="stat-label">已簽署</div></div></div>
      <div className="stat-card"><div className="stat-icon" style={{ background: 'var(--c-danger-light)' }}>❌</div><div><div className="stat-value" style={{ color: 'var(--c-danger)' }}>{stats.rejected || 0}</div><div className="stat-label">已拒絕</div></div></div>
    </div>

    {/* Filter */}
    <div className="sub-tabs" style={{ marginBottom: 16 }}>
      {[{ key: 'all', label: '全部' }, ...Object.entries(STATUS_MAP).map(([k, v]) => ({ key: k, label: `${v.icon} ${v.label}` }))].map(f => (
        <button key={f.key} className={`sub-tab ${filter === f.key ? 'active' : ''}`} onClick={() => setFilter(f.key)}>
          {f.label} ({f.key === 'all' ? records.length : records.filter(r => r.status === f.key).length})
        </button>
      ))}
    </div>

    {/* Table */}
    {filtered.length === 0 ? (
      <div className="empty-state"><div className="empty-state-icon">✍️</div><div className="empty-state-title">尚無簽核紀錄</div></div>
    ) : (
      <div className="table-wrap"><table>
        <thead><tr><th>文件類型</th><th>文件名稱</th><th>發起人</th><th>簽署人</th><th>狀態</th><th>Ragic 連結</th><th>操作</th></tr></thead>
        <tbody>{filtered.map(r => (
          <tr key={r.id}>
            <td><span className="badge">{DOC_TYPES[r.doc_type] || r.doc_type}</span></td>
            <td style={{ fontWeight: 600 }}>{r.doc_title}</td>
            <td style={{ fontSize: 12 }}>{r.creator_name || '—'}</td>
            <td style={{ fontSize: 12 }}>{r.signer_name || r.signer_email || '—'}</td>
            <td><span className={`badge ${STATUS_MAP[r.status]?.class || ''}`}>{STATUS_MAP[r.status]?.icon} {STATUS_MAP[r.status]?.label}</span></td>
            <td>{r.sign_url ? <a href={r.sign_url} target="_blank" rel="noreferrer" style={{ fontSize: 11, color: 'var(--c-primary)' }}>🔗 開啟</a> : '—'}</td>
            <td>
              <select className="form-input" style={{ padding: '3px 6px', fontSize: 11, width: 100 }} value={r.status} onChange={e => updateStatus(r.id, e.target.value)}>
                {Object.entries(STATUS_MAP).map(([k, v]) => <option key={k} value={k}>{v.icon} {v.label}</option>)}
              </select>
            </td>
          </tr>
        ))}</tbody>
      </table></div>
    )}

    {/* Send Modal */}
    {showSend && (
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.4)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="card" style={{ width: 480, padding: 24, animation: 'fadeUp 0.3s ease' }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 14 }}>📧 發起電子簽核</h3>
          <div className="form-group"><label className="form-label">文件類型</label>
            <select className="form-input" value={form.doc_type} onChange={e => setForm({ ...form, doc_type: e.target.value })}>
              {Object.entries(DOC_TYPES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <div className="form-group"><label className="form-label">文件名稱 *</label><input className="form-input" value={form.doc_title} onChange={e => setForm({ ...form, doc_title: e.target.value })} placeholder="例：202603 活動勞報單" /></div>
          <div className="form-group"><label className="form-label">簽署人 Email</label><input className="form-input" type="email" value={form.signer_email} onChange={e => setForm({ ...form, signer_email: e.target.value })} placeholder="example@company.com" /></div>
          <div className="form-group"><label className="form-label">備註</label><textarea className="form-input" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={2} /></div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 10 }}>
            <button className="btn btn-secondary" onClick={() => setShowSend(false)}>取消</button>
            <button className="btn btn-primary" onClick={send}>📧 發送簽核</button>
          </div>
        </div>
      </div>
    )}
  </>);
}
