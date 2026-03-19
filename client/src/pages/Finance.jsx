import { useState, useEffect } from 'react'
import { api } from '../api'

const REV_STATUS = { pending: { l: '待收', c: 'badge-warning' }, received: { l: '已收', c: 'badge-success' } };
const EXP_STATUS = { pending: { l: '待付', c: 'badge-warning' }, paid: { l: '已付', c: 'badge-success' }, approved: { l: '核准', c: 'badge-info' } };

export default function Finance() {
  const [tab, setTab] = useState('overview');
  const [summary, setSummary] = useState({});
  const [revenues, setRevenues] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [projects, setProjects] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [showAddR, setShowAddR] = useState(false);
  const [showAddE, setShowAddE] = useState(false);
  const [rForm, setRForm] = useState({ project_id: '', customer_id: '', amount: '', description: '', payment_date: '' });
  const [eForm, setEForm] = useState({ project_id: '', vendor_id: '', amount: '', category: '', description: '', payment_date: '' });

  const load = () => {
    api.getFinanceSummary().then(setSummary);
    api.getRevenues().then(setRevenues);
    api.getExpenses().then(setExpenses);
  };

  useEffect(() => {
    load();
    api.getProjects().then(setProjects).catch(() => {});
    api.getCustomers().then(setCustomers).catch(() => {});
    api.getVendors().then(setVendors).catch(() => {});
  }, []);

  const addRevenue = async () => {
    await api.createRevenue({ ...rForm, amount: Number(rForm.amount) || 0 });
    setShowAddR(false); setRForm({ project_id: '', customer_id: '', amount: '', description: '', payment_date: '' });
    load();
  };

  const addExpense = async () => {
    await api.createExpense({ ...eForm, amount: Number(eForm.amount) || 0 });
    setShowAddE(false); setEForm({ project_id: '', vendor_id: '', amount: '', category: '', description: '', payment_date: '' });
    load();
  };

  return (
    <>
      <div className="page-header"><div><h1 className="page-title">💰 財務管理</h1><p className="page-subtitle">收入、支出與利潤管理</p></div></div>

      {/* 財務總覽卡片 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 14, marginBottom: 24 }}>
        <div className="stat-card"><div className="stat-icon" style={{ background: 'var(--c-success-light)' }}>💵</div><div><div className="stat-value" style={{ color: 'var(--c-success)' }}>${(summary.totalRevenue || 0).toLocaleString()}</div><div className="stat-label">總收入</div></div></div>
        <div className="stat-card"><div className="stat-icon" style={{ background: 'var(--c-danger-light)' }}>💸</div><div><div className="stat-value" style={{ color: 'var(--c-danger)' }}>${(summary.totalExpense || 0).toLocaleString()}</div><div className="stat-label">總支出</div></div></div>
        <div className="stat-card"><div className="stat-icon" style={{ background: 'var(--c-primary-light)' }}>📊</div><div><div className="stat-value" style={{ color: (summary.profit || 0) >= 0 ? 'var(--c-success)' : 'var(--c-danger)' }}>${(summary.profit || 0).toLocaleString()}</div><div className="stat-label">淨利潤</div></div></div>
        <div className="stat-card"><div className="stat-icon" style={{ background: 'var(--c-warning-light)' }}>⏳</div><div><div className="stat-value">${(summary.pendingRevenue || 0).toLocaleString()}</div><div className="stat-label">待收款</div></div></div>
        <div className="stat-card"><div className="stat-icon" style={{ background: 'var(--c-info-light)' }}>📋</div><div><div className="stat-value">${(summary.pendingExpense || 0).toLocaleString()}</div><div className="stat-label">待付款</div></div></div>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {[['overview','📊 總覽'],['revenues','💵 收入'],['expenses','💸 支出']].map(([k,l]) => (
          <button key={k} className={`btn ${tab === k ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setTab(k)}>{l}</button>
        ))}
      </div>

      {tab === 'revenues' && (<>
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
          <button className="btn btn-primary" onClick={() => setShowAddR(true)}>➕ 新增收入</button>
        </div>
        {showAddR && (
          <div className="card" style={{ marginBottom: 16 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
              <div className="form-group"><label className="form-label">專案</label><select className="form-select" value={rForm.project_id} onChange={e => setRForm({...rForm,project_id:e.target.value})}><option value="">-</option>{projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
              <div className="form-group"><label className="form-label">客戶</label><select className="form-select" value={rForm.customer_id} onChange={e => setRForm({...rForm,customer_id:e.target.value})}><option value="">-</option>{customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
              <div className="form-group"><label className="form-label">金額</label><input className="form-input" type="number" value={rForm.amount} onChange={e => setRForm({...rForm,amount:e.target.value})} /></div>
              <div className="form-group"><label className="form-label">日期</label><input className="form-input" type="date" value={rForm.payment_date} onChange={e => setRForm({...rForm,payment_date:e.target.value})} /></div>
            </div>
            <div className="form-group"><label className="form-label">說明</label><input className="form-input" value={rForm.description} onChange={e => setRForm({...rForm,description:e.target.value})} /></div>
            <div style={{ display: 'flex', gap: 8 }}><button className="btn btn-primary" onClick={addRevenue}>建立</button><button className="btn btn-secondary" onClick={() => setShowAddR(false)}>取消</button></div>
          </div>
        )}
        <div className="table-wrap"><table>
          <thead><tr><th>日期</th><th>專案</th><th>客戶</th><th>說明</th><th>金額</th><th>狀態</th></tr></thead>
          <tbody>{revenues.map(r => (
            <tr key={r.id}>
              <td style={{ fontSize: 12 }}>{r.payment_date || '-'}</td>
              <td>{r.project_name || '-'}</td><td>{r.customer_name || '-'}</td>
              <td style={{ fontSize: 12 }}>{r.description || '-'}</td>
              <td style={{ fontWeight: 700, color: 'var(--c-success)' }}>+${(r.amount||0).toLocaleString()}</td>
              <td><span className={`badge ${REV_STATUS[r.status]?.c || ''}`}>{REV_STATUS[r.status]?.l || r.status}</span></td>
            </tr>
          ))}</tbody>
        </table></div>
      </>)}

      {tab === 'expenses' && (<>
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
          <button className="btn btn-primary" onClick={() => setShowAddE(true)}>➕ 新增支出</button>
        </div>
        {showAddE && (
          <div className="card" style={{ marginBottom: 16 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
              <div className="form-group"><label className="form-label">專案</label><select className="form-select" value={eForm.project_id} onChange={e => setEForm({...eForm,project_id:e.target.value})}><option value="">-</option>{projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
              <div className="form-group"><label className="form-label">廠商</label><select className="form-select" value={eForm.vendor_id} onChange={e => setEForm({...eForm,vendor_id:e.target.value})}><option value="">-</option>{vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}</select></div>
              <div className="form-group"><label className="form-label">金額</label><input className="form-input" type="number" value={eForm.amount} onChange={e => setEForm({...eForm,amount:e.target.value})} /></div>
              <div className="form-group"><label className="form-label">日期</label><input className="form-input" type="date" value={eForm.payment_date} onChange={e => setEForm({...eForm,payment_date:e.target.value})} /></div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}><button className="btn btn-primary" onClick={addExpense}>建立</button><button className="btn btn-secondary" onClick={() => setShowAddE(false)}>取消</button></div>
          </div>
        )}
        <div className="table-wrap"><table>
          <thead><tr><th>日期</th><th>專案</th><th>廠商</th><th>說明</th><th>金額</th><th>狀態</th></tr></thead>
          <tbody>{expenses.map(e => (
            <tr key={e.id}>
              <td style={{ fontSize: 12 }}>{e.payment_date || '-'}</td>
              <td>{e.project_name || '-'}</td><td>{e.vendor_name || '-'}</td>
              <td style={{ fontSize: 12 }}>{e.description || '-'}</td>
              <td style={{ fontWeight: 700, color: 'var(--c-danger)' }}>-${(e.amount||0).toLocaleString()}</td>
              <td><span className={`badge ${EXP_STATUS[e.status]?.c || ''}`}>{EXP_STATUS[e.status]?.l || e.status}</span></td>
            </tr>
          ))}</tbody>
        </table></div>
      </>)}

      {tab === 'overview' && (
        <div className="card">
          <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>📊 最近交易紀錄</h2>
          {revenues.length === 0 && expenses.length === 0 ? (
            <p style={{ color: 'var(--c-text-muted)', textAlign: 'center', padding: 20 }}>尚無交易紀錄</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {[...revenues.map(r => ({ ...r, _type: 'revenue' })), ...expenses.map(e => ({ ...e, _type: 'expense' }))]
                .sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 20)
                .map(t => (
                  <div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', border: '1px solid var(--c-border)', borderRadius: 8 }}>
                    <div>
                      <span style={{ fontSize: 13 }}>{t._type === 'revenue' ? '💵' : '💸'} {t.description || (t._type === 'revenue' ? '收入' : '支出')}</span>
                      <span style={{ fontSize: 11, color: 'var(--c-text-muted)', marginLeft: 8 }}>{t.project_name || t.customer_name || t.vendor_name || ''}</span>
                    </div>
                    <span style={{ fontWeight: 700, color: t._type === 'revenue' ? 'var(--c-success)' : 'var(--c-danger)' }}>
                      {t._type === 'revenue' ? '+' : '-'}${(t.amount || 0).toLocaleString()}
                    </span>
                  </div>
                ))
              }
            </div>
          )}
        </div>
      )}
    </>
  );
}
