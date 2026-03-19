import { useState, useEffect } from 'react'
import { api } from '../api'

const TYPE_LABELS = { purchase_order: '📦 採購單', quotation: '📝 報價單', expense: '💳 支出報銷', contract: '📃 合約簽核' };
const STATUS_MAP = {
  draft: { label: '草稿', class: 'badge-info' },
  submitted: { label: '已提交', class: 'badge-primary' },
  manager_review: { label: '主管審核中', class: 'badge-warning' },
  gm_review: { label: '總經理審核中', class: 'badge-warning' },
  approved: { label: '已核准', class: 'badge-success' },
  rejected: { label: '已退回', class: 'badge-danger' },
};

export default function Approvals() {
  const [approvals, setApprovals] = useState([]);
  const [stats, setStats] = useState({});
  const [tab, setTab] = useState('all');
  const [showAdd, setShowAdd] = useState(false);
  const [showHistory, setShowHistory] = useState(null);
  const [form, setForm] = useState({ type: 'expense', title: '', description: '', amount: '' });

  const load = () => {
    const params = tab === 'pending' ? '?my_pending=true' : tab !== 'all' ? `?status=${tab}` : '';
    api.getApprovals(params).then(setApprovals);
    api.getApprovalStats().then(setStats);
  };

  useEffect(load, [tab]);

  const submit = async () => {
    if (!form.title.trim()) return;
    await api.createApproval({ ...form, amount: Number(form.amount) || 0 });
    setShowAdd(false); setForm({ type: 'expense', title: '', description: '', amount: '' });
    load();
  };

  const approve = async (id) => { await api.approveApproval(id, {}); load(); };
  const reject = async (id) => {
    const comment = prompt('退回原因：');
    if (comment === null) return;
    await api.rejectApproval(id, { comment }); load();
  };

  const set = f => e => setForm({ ...form, [f]: e.target.value });

  return (
    <>
      <div className="page-header">
        <div><h1 className="page-title">📋 審批中心</h1><p className="page-subtitle">採購單 / 報價單 / 支出報銷 / 合約簽核</p></div>
        <button className="btn btn-primary" onClick={() => setShowAdd(true)}>➕ 新增審批</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 20 }}>
        <div className="stat-card"><div className="stat-icon" style={{ background: 'var(--c-primary-light)' }}>📋</div><div><div className="stat-value">{stats.total || 0}</div><div className="stat-label">總審批</div></div></div>
        <div className="stat-card"><div className="stat-icon" style={{ background: 'var(--c-warning-light)' }}>⏳</div><div><div className="stat-value">{stats.pending || 0}</div><div className="stat-label">待審核</div></div></div>
        <div className="stat-card"><div className="stat-icon" style={{ background: 'var(--c-success-light)' }}>✅</div><div><div className="stat-value">{stats.approved || 0}</div><div className="stat-label">已核准</div></div></div>
        <div className="stat-card"><div className="stat-icon" style={{ background: 'var(--c-danger-light)' }}>❌</div><div><div className="stat-value">{stats.rejected || 0}</div><div className="stat-label">已退回</div></div></div>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {[{ key: 'all', label: '全部' }, { key: 'pending', label: '⏳ 我的待審' }, { key: 'submitted', label: '已提交' }, { key: 'approved', label: '✅ 已核准' }, { key: 'rejected', label: '❌ 已退回' }].map(t => (
          <button key={t.key} className={`btn btn-sm ${tab === t.key ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setTab(t.key)}>{t.label}</button>
        ))}
      </div>

      {showAdd && (
        <div className="card" style={{ marginBottom: 16 }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 12 }}>提交審批</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
            <div className="form-group"><label className="form-label">類型</label><select className="form-select" value={form.type} onChange={set('type')}>{Object.entries(TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></div>
            <div className="form-group"><label className="form-label">標題 *</label><input className="form-input" value={form.title} onChange={set('title')} /></div>
            <div className="form-group"><label className="form-label">金額</label><input className="form-input" type="number" value={form.amount} onChange={set('amount')} /></div>
          </div>
          <div className="form-group"><label className="form-label">說明</label><textarea className="form-textarea" value={form.description} onChange={set('description')} rows={2} /></div>
          <div style={{ display: 'flex', gap: 8 }}><button className="btn btn-primary" onClick={submit}>提交審批</button><button className="btn btn-secondary" onClick={() => setShowAdd(false)}>取消</button></div>
        </div>
      )}

      {approvals.length === 0 ? (
        <div className="empty-state"><div className="empty-state-icon">📋</div><div className="empty-state-title">{tab === 'pending' ? '無待審項目' : '尚無審批'}</div></div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {approvals.map(a => (
            <div key={a.id} className="card" style={{ padding: '14px 18px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                    <span style={{ fontSize: 12, color: 'var(--c-text-muted)', fontFamily: 'monospace' }}>{a.approval_number}</span>
                    <span style={{ fontSize: 12 }}>{TYPE_LABELS[a.type] || a.type}</span>
                    <span className={`badge ${STATUS_MAP[a.status]?.class || ''}`}>{STATUS_MAP[a.status]?.label || a.status}</span>
                  </div>
                  <div style={{ fontWeight: 700, fontSize: 15 }}>{a.title}</div>
                  <div style={{ fontSize: 12, color: 'var(--c-text-muted)', marginTop: 2 }}>
                    提交人：{a.submitter_name} · {new Date(a.created_at).toLocaleDateString('zh-TW')}
                    {a.amount > 0 && <span style={{ marginLeft: 12, fontWeight: 600, color: 'var(--c-primary)' }}>${a.amount.toLocaleString()}</span>}
                    {a.project_name && <span style={{ marginLeft: 12 }}>📁 {a.project_name}</span>}
                  </div>
                  {a.description && <div style={{ fontSize: 12, color: 'var(--c-text-secondary)', marginTop: 4 }}>{a.description}</div>}
                </div>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  <button className="btn btn-secondary btn-sm" onClick={() => setShowHistory(showHistory === a.id ? null : a.id)}>📜 紀錄</button>
                  {['submitted', 'manager_review', 'gm_review'].includes(a.status) && (
                    <>
                      <button className="btn btn-primary btn-sm" onClick={() => approve(a.id)}>✅ 核准</button>
                      <button className="btn btn-danger btn-sm" onClick={() => reject(a.id)}>❌ 退回</button>
                    </>
                  )}
                </div>
              </div>

              {showHistory === a.id && a.history?.length > 0 && (
                <div style={{ marginTop: 12, borderTop: '1px solid var(--c-border)', paddingTop: 10 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 6 }}>📜 審批紀錄</div>
                  {a.history.map((h, i) => (
                    <div key={i} style={{ display: 'flex', gap: 8, fontSize: 11, padding: '4px 0', borderBottom: '1px solid var(--c-bg)' }}>
                      <span style={{ color: 'var(--c-text-muted)', width: 120 }}>{new Date(h.timestamp).toLocaleString('zh-TW')}</span>
                      <span style={{ fontWeight: 600 }}>{h.user_name || h.user_id}</span>
                      <span style={{ color: h.action === 'reject' ? 'var(--c-danger)' : 'var(--c-success)' }}>
                        {h.action === 'submit' ? '提交' : h.action === 'approve' ? '核准' : '退回'}
                      </span>
                      {h.comment && <span style={{ color: 'var(--c-text-muted)' }}>「{h.comment}」</span>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </>
  );
}
