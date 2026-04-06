import { useState, useEffect } from 'react'
import { useLang } from '../LangContext'
import { api } from '../api'

const getSTATUS_MAP = (t) => ({
  draft: { label: '草稿', class: 'badge-info', icon: '📝' },
  pending: { label: '待簽', class: 'badge-warning', icon: '⏳' },
  active: { label: '生效中', class: 'badge-success', icon: '✅' },
  expired: { label: t('contracts.expired'), class: 'badge-danger', icon: '📅' },
  terminated: { label: '已終止', class: 'badge-danger', icon: '❌' },
});
const PAY_STATUS = {
  unpaid: { label: '待付款', class: 'badge-danger', icon: '🔴' },
  prepaid: { label: '已預付', class: 'badge-warning', icon: '🟡' },
  closed: { label: '已結案', class: 'badge-success', icon: '🟢' },
};
const FMT = n => `$${Number(n || 0).toLocaleString()}`;

export default function Contracts() {
  const { t } = useLang();
  const STATUS_MAP = getSTATUS_MAP(t);
  const [contracts, setContracts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [projects, setProjects] = useState([]);
  const [stats, setStats] = useState({});
  const [showAdd, setShowAdd] = useState(false);
  const [filter, setFilter] = useState('all');
  const [form, setForm] = useState({
    title: '', customer_id: '', project_id: '', amount: '', start_date: '', end_date: '',
    terms: '', deposit_amount: '', final_payment_amount: '', payment_status: 'unpaid',
  });

  const load = () => {
    api.getContracts().then(setContracts);
    api.getContractStats().then(setStats).catch(() => {});
  };
  useEffect(() => {
    load();
    api.getCustomers().then(setCustomers).catch(() => {});
    api.getProjects().then(setProjects).catch(() => {});
  }, []);

  const add = async () => {
    if (!form.title.trim()) return;
    await api.createContract({ ...form, amount: Number(form.amount) || 0, deposit_amount: Number(form.deposit_amount) || 0, final_payment_amount: Number(form.final_payment_amount) || 0 });
    load();
    setShowAdd(false); setForm({ title: '', customer_id: '', project_id: '', amount: '', start_date: '', end_date: '', terms: '', deposit_amount: '', final_payment_amount: '', payment_status: 'unpaid' });
  };

  const updateStatus = async (id, status) => { await api.updateContract(id, { status }); load(); };
  const updatePayStatus = async (id, payment_status) => { await api.updateContract(id, { payment_status }); load(); };
  const set = f => e => setForm({ ...form, [f]: e.target.value });

  const filtered = filter === 'all' ? contracts : contracts.filter(c => c.status === filter);

  return (<>
    <div className="page-header">
      <div><h1 className="page-title">{t('page.contracts')}</h1><p className="page-subtitle">管理客戶合約、追蹤付款與執行狀態</p></div>
      <button className="btn btn-primary" onClick={() => setShowAdd(true)}>{t('contracts.add')}</button>
    </div>

    {/* KPI */}
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12, marginBottom: 20 }}>
      <div className="stat-card"><div className="stat-icon" style={{ background: 'var(--c-primary-light)' }}>📃</div><div><div className="stat-value">{stats.total || contracts.length}</div><div className="stat-label">總合約</div></div></div>
      <div className="stat-card"><div className="stat-icon" style={{ background: 'var(--c-success-light)' }}>✅</div><div><div className="stat-value" style={{ color: 'var(--c-success)' }}>{stats.active || contracts.filter(c => c.status === 'active').length}</div><div className="stat-label">生效中</div></div></div>
      <div className="stat-card"><div className="stat-icon" style={{ background: 'var(--c-warning-light)' }}>⏳</div><div><div className="stat-value" style={{ color: 'var(--c-warning)' }}>{stats.pending || contracts.filter(c => c.status === 'pending').length}</div><div className="stat-label">{t('contracts.pending')}</div></div></div>
      <div className="stat-card"><div className="stat-icon" style={{ background: 'var(--c-danger-light)' }}>🔴</div><div><div className="stat-value" style={{ color: 'var(--c-danger)' }}>{contracts.filter(c => c.payment_status === 'unpaid').length}</div><div className="stat-label">待付款</div></div></div>
      <div className="stat-card"><div className="stat-icon" style={{ background: 'var(--c-info-light)' }}>💰</div><div><div className="stat-value" style={{ color: 'var(--c-info)' }}>{FMT(stats.total_amount || contracts.reduce((s, c) => s + (Number(c.amount) || 0), 0))}</div><div className="stat-label">{t('contracts.totalAmount')}</div></div></div>
    </div>

    {/* Filter */}
    <div className="sub-tabs" style={{ marginBottom: 16 }}>
      {[
        { key: 'all', label: t('common.all'), count: contracts.length },
        ...Object.entries(STATUS_MAP).map(([k, v]) => ({ key: k, label: `${v.icon} ${v.label}`, count: contracts.filter(c => c.status === k).length }))
      ].map(f => (
        <button key={f.key} className={`sub-tab ${filter === f.key ? 'active' : ''}`} onClick={() => setFilter(f.key)}>{f.label} ({f.count})</button>
      ))}
    </div>

    {/* Add Modal */}
    {showAdd && (
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.4)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="card" style={{ width: 620, maxHeight: '85vh', overflow: 'auto', padding: 24, animation: 'fadeUp 0.3s ease' }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 14 }}>{t('contracts.add')}</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
            <div className="form-group" style={{ gridColumn: '1/-1' }}><label className="form-label">{t('contracts.name')}</label><input className="form-input" value={form.title} onChange={set('title')} /></div>
            <div className="form-group"><label className="form-label">客戶</label><select className="form-input" value={form.customer_id} onChange={set('customer_id')}><option value="">—</option>{customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
            <div className="form-group"><label className="form-label">關聯專案</label><select className="form-input" value={form.project_id} onChange={set('project_id')}><option value="">—</option>{projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
            <div className="form-group"><label className="form-label">{t('contracts.amount')}</label><input className="form-input" type="number" value={form.amount} onChange={set('amount')} /></div>
            <div className="form-group"><label className="form-label">訂金金額</label><input className="form-input" type="number" value={form.deposit_amount} onChange={set('deposit_amount')} /></div>
            <div className="form-group"><label className="form-label">尾款金額</label><input className="form-input" type="number" value={form.final_payment_amount} onChange={set('final_payment_amount')} /></div>
            <div className="form-group"><label className="form-label">付款狀態</label>
              <select className="form-input" value={form.payment_status} onChange={set('payment_status')}>
                {Object.entries(PAY_STATUS).map(([k, v]) => <option key={k} value={k}>{v.icon} {v.label}</option>)}
              </select>
            </div>
            <div className="form-group"><label className="form-label">開始日期</label><input className="form-input" type="date" value={form.start_date} onChange={set('start_date')} /></div>
            <div className="form-group"><label className="form-label">結束日期</label><input className="form-input" type="date" value={form.end_date} onChange={set('end_date')} /></div>
          </div>
          <div className="form-group" style={{ marginTop: 8 }}><label className="form-label">合約條款</label><textarea className="form-input" value={form.terms} onChange={set('terms')} rows={3} /></div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 14 }}>
            <button className="btn btn-secondary" onClick={() => setShowAdd(false)}>{t('common.cancel')}</button>
            <button className="btn btn-primary" onClick={add}>建立</button>
          </div>
        </div>
      </div>
    )}

    {/* Table */}
    {filtered.length === 0 ? (
      <div className="empty-state"><div className="empty-state-icon">📃</div><div className="empty-state-title">{t('contracts.empty')}</div></div>
    ) : (
      <div className="table-wrap"><table>
        <thead><tr><th>合約編號</th><th>{t('contracts.name')}</th><th>{t('proj.customer')}</th><th>金額</th><th>訂金/尾款</th><th>期間</th><th>狀態</th><th>款項</th><th>操作</th></tr></thead>
        <tbody>{filtered.map(c => {
          const ps = PAY_STATUS[c.payment_status] || PAY_STATUS.unpaid;
          return (
            <tr key={c.id}>
              <td style={{ fontFamily: 'monospace', fontSize: 11, color: 'var(--c-text-muted)' }}>{c.contract_number}</td>
              <td style={{ fontWeight: 600 }}>{c.title}</td>
              <td style={{ fontSize: 12 }}>{c.customer_name || '—'}</td>
              <td style={{ fontWeight: 700, color: 'var(--c-primary)' }}>{FMT(c.amount)}</td>
              <td style={{ fontSize: 11 }}>
                {c.deposit_amount > 0 && <div>訂金: {FMT(c.deposit_amount)}</div>}
                {c.final_payment_amount > 0 && <div>尾款: {FMT(c.final_payment_amount)}</div>}
                {!c.deposit_amount && !c.final_payment_amount && '—'}
              </td>
              <td style={{ fontSize: 11, color: 'var(--c-text-muted)' }}>{c.start_date || '?'} ~ {c.end_date || '?'}</td>
              <td>
                <select className="form-input" style={{ padding: '3px 6px', fontSize: 11, width: 100 }} value={c.status} onChange={e => updateStatus(c.id, e.target.value)}>
                  {Object.entries(STATUS_MAP).map(([k, v]) => <option key={k} value={k}>{v.icon} {v.label}</option>)}
                </select>
              </td>
              <td>
                <select className="form-input" style={{ padding: '3px 6px', fontSize: 11, width: 100 }} value={c.payment_status || 'unpaid'} onChange={e => updatePayStatus(c.id, e.target.value)}>
                  {Object.entries(PAY_STATUS).map(([k, v]) => <option key={k} value={k}>{v.icon} {v.label}</option>)}
                </select>
              </td>
              <td>
                <button className="btn btn-sm btn-danger" onClick={async () => { if (confirm('確定刪除？')) { await api.deleteContract(c.id); load(); } }} style={{ fontSize: 10 }}>🗑️</button>
              </td>
            </tr>
          );
        })}</tbody>
      </table></div>
    )}
  </>);
}
