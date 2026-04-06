import { useState, useEffect } from 'react'
import { useLang } from '../LangContext'
import { useParams, NavLink } from 'react-router-dom'
import { api } from '../api'

const REV_STATUS = { pending: { l: '待收', c: 'badge-warning' }, received: { l: '已收', c: 'badge-success' } };
const EXP_STATUS = { pending: { l: '待付', c: 'badge-warning' }, paid: { l: '已付', c: 'badge-success' }, approved: { l: '核准', c: 'badge-info' } };
const PAY_METHODS = ['匯款', '現金', '支票', '信用卡'];
const EXP_CATS = ['一般', '場地', '設備', '人事', '交通', '餐飲', '設計', '印刷', '保險', '稅金', '印花稅', '勞報', '押金', '其他'];

export default function Finance() {
  const { t } = useLang();
  const { tab: routeTab } = useParams();
  const tab = routeTab || 'overview';
  const [summary, setSummary] = useState({});
  const [revenues, setRevenues] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [projects, setProjects] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [showAddR, setShowAddR] = useState(false);
  const [showAddE, setShowAddE] = useState(false);
  const [rForm, setRForm] = useState({ project_id: '', customer_id: '', amount: '', description: '', payment_date: '', payment_method: '匯款', voucher_no: '', voucher_date: '', expected_date: '' });
  const [eForm, setEForm] = useState({ project_id: '', vendor_id: '', amount: '', category: '一般', description: '', payment_date: '', payment_method: '匯款', voucher_no: '', voucher_date: '', expected_date: '' });

  const load = () => { api.getFinanceSummary().then(setSummary); api.getRevenues().then(setRevenues); api.getExpenses().then(setExpenses); };
  useEffect(() => {
    load();
    api.getProjects().then(setProjects).catch(() => {});
    api.getCustomers().then(setCustomers).catch(() => {});
    api.getVendors().then(setVendors).catch(() => {});
  }, []);

  const addRevenue = async () => { await api.createRevenue({ ...rForm, amount: Number(rForm.amount) || 0 }); setShowAddR(false); setRForm({ project_id: '', customer_id: '', amount: '', description: '', payment_date: '', payment_method: '匯款', voucher_no: '', voucher_date: '', expected_date: '' }); load(); };
  const addExpense = async () => { await api.createExpense({ ...eForm, amount: Number(eForm.amount) || 0 }); setShowAddE(false); setEForm({ project_id: '', vendor_id: '', amount: '', category: '一般', description: '', payment_date: '', payment_method: '匯款', voucher_no: '', voucher_date: '', expected_date: '' }); load(); };

  const allEntries = [
    ...revenues.map(r => ({ ...r, _type: 'revenue' })),
    ...expenses.map(e => ({ ...e, _type: 'expense' }))
  ].sort((a, b) => new Date(b.payment_date || b.created_at) - new Date(a.payment_date || a.created_at));

  return (<>
    <div className="page-header">
      <div><h1 className="page-title">{t('page.finance')}</h1><p className="page-subtitle">收支明細、收入、支出與利潤管理</p></div>
    </div>

    {/* KPI */}
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 14, marginBottom: 24 }}>
      <div className="stat-card"><div className="stat-icon" style={{ background: 'var(--c-success-light)' }}>💵</div><div><div className="stat-value" style={{ color: 'var(--c-success)' }}>${(summary.totalRevenue || 0).toLocaleString()}</div><div className="stat-label">{t('finance.totalRevenue')}</div></div></div>
      <div className="stat-card"><div className="stat-icon" style={{ background: 'var(--c-danger-light)' }}>💸</div><div><div className="stat-value" style={{ color: 'var(--c-danger)' }}>${(summary.totalExpense || 0).toLocaleString()}</div><div className="stat-label">{t('finance.totalExpense')}</div></div></div>
      <div className="stat-card"><div className="stat-icon">📊</div><div><div className="stat-value" style={{ color: (summary.profit || 0) >= 0 ? 'var(--c-success)' : 'var(--c-danger)' }}>${(summary.profit || 0).toLocaleString()}</div><div className="stat-label">淨利潤</div></div></div>
      <div className="stat-card"><div className="stat-icon" style={{ background: 'var(--c-warning-light)' }}>⏳</div><div><div className="stat-value">${(summary.pendingRevenue || 0).toLocaleString()}</div><div className="stat-label">待收款</div></div></div>
      <div className="stat-card"><div className="stat-icon" style={{ background: 'var(--c-info-light)' }}>📋</div><div><div className="stat-value">${(summary.pendingExpense || 0).toLocaleString()}</div><div className="stat-label">待付款</div></div></div>
    </div>

    {/* Route-based tabs */}
    <div className="sub-tabs">
      <NavLink to="/finance" end className={({ isActive }) => `sub-tab ${isActive ? 'active' : ''}`}>📊 收支明細</NavLink>
      <NavLink to="/finance/revenues" className={({ isActive }) => `sub-tab ${isActive ? 'active' : ''}`}>💵 收入</NavLink>
      <NavLink to="/finance/expenses" className={({ isActive }) => `sub-tab ${isActive ? 'active' : ''}`}>💸 支出</NavLink>
    </div>

    {tab === 'revenues' && (<>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
        <button className="btn btn-primary" onClick={() => setShowAddR(true)}>{t('finance.addRevenue')}</button>
      </div>
      {showAddR && (
        <div className="card" style={{ marginBottom: 16, padding: 16 }}>
          <h4 style={{ fontSize: 14, fontWeight: 700, marginBottom: 10 }}>💵 新增收入記錄</h4>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
            <div className="form-group"><label className="form-label">專案</label><select className="form-select" value={rForm.project_id} onChange={e => setRForm({...rForm,project_id:e.target.value})}><option value="">-</option>{projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
            <div className="form-group"><label className="form-label">客戶</label><select className="form-select" value={rForm.customer_id} onChange={e => setRForm({...rForm,customer_id:e.target.value})}><option value="">-</option>{customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
            <div className="form-group"><label className="form-label">金額 *</label><input className="form-input" type="number" value={rForm.amount} onChange={e => setRForm({...rForm,amount:e.target.value})} /></div>
            <div className="form-group"><label className="form-label">收款日</label><input className="form-input" type="date" value={rForm.payment_date} onChange={e => setRForm({...rForm,payment_date:e.target.value})} /></div>
            <div className="form-group"><label className="form-label">收付方式</label><select className="form-select" value={rForm.payment_method} onChange={e => setRForm({...rForm,payment_method:e.target.value})}>{PAY_METHODS.map(m => <option key={m}>{m}</option>)}</select></div>
            <div className="form-group"><label className="form-label">憑證號碼</label><input className="form-input" value={rForm.voucher_no} onChange={e => setRForm({...rForm,voucher_no:e.target.value})} /></div>
            <div className="form-group"><label className="form-label">憑證日期</label><input className="form-input" type="date" value={rForm.voucher_date} onChange={e => setRForm({...rForm,voucher_date:e.target.value})} /></div>
            <div className="form-group"><label className="form-label">預計收款日</label><input className="form-input" type="date" value={rForm.expected_date} onChange={e => setRForm({...rForm,expected_date:e.target.value})} /></div>
          </div>
          <div className="form-group"><label className="form-label">說明 *</label><input className="form-input" value={rForm.description} onChange={e => setRForm({...rForm,description:e.target.value})} /></div>
          <div style={{ display: 'flex', gap: 8 }}><button className="btn btn-primary" onClick={addRevenue}>{t('common.create2')}</button><button className="btn btn-secondary" onClick={() => setShowAddR(false)}>{t('common.cancel')}</button></div>
        </div>
      )}
      <div className="table-wrap"><table>
        <thead><tr><th>{t('finance.date')}</th><th>{t('vendor.project')}</th><th>客戶</th><th>說明</th><th>收付方式</th><th>憑證號</th><th>{t('vendor.amount')}</th><th>狀態</th></tr></thead>
        <tbody>{revenues.map(r => (
          <tr key={r.id}>
            <td style={{ fontSize: 12 }}>{r.payment_date || '-'}</td>
            <td>{r.project_name || '-'}</td><td>{r.customer_name || '-'}</td>
            <td style={{ fontSize: 12 }}>{r.description || '-'}</td>
            <td style={{ fontSize: 11 }}>{r.payment_method || '-'}</td>
            <td style={{ fontSize: 10, fontFamily: 'monospace' }}>{r.voucher_no || '-'}</td>
            <td style={{ fontWeight: 700, color: 'var(--c-success)' }}>+${(r.amount||0).toLocaleString()}</td>
            <td><span className={`badge ${REV_STATUS[r.status]?.c || ''}`}>{REV_STATUS[r.status]?.l || r.status}</span></td>
          </tr>
        ))}</tbody>
      </table></div>
    </>)}

    {tab === 'expenses' && (<>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
        <button className="btn btn-primary" onClick={() => setShowAddE(true)}>{t('finance.addExpense')}</button>
      </div>
      {showAddE && (
        <div className="card" style={{ marginBottom: 16, padding: 16 }}>
          <h4 style={{ fontSize: 14, fontWeight: 700, marginBottom: 10 }}>💸 新增支出記錄</h4>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
            <div className="form-group"><label className="form-label">專案</label><select className="form-select" value={eForm.project_id} onChange={e => setEForm({...eForm,project_id:e.target.value})}><option value="">-</option>{projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
            <div className="form-group"><label className="form-label">廠商</label><select className="form-select" value={eForm.vendor_id} onChange={e => setEForm({...eForm,vendor_id:e.target.value})}><option value="">-</option>{vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}</select></div>
            <div className="form-group"><label className="form-label">金額 *</label><input className="form-input" type="number" value={eForm.amount} onChange={e => setEForm({...eForm,amount:e.target.value})} /></div>
            <div className="form-group"><label className="form-label">付款日</label><input className="form-input" type="date" value={eForm.payment_date} onChange={e => setEForm({...eForm,payment_date:e.target.value})} /></div>
            <div className="form-group"><label className="form-label">分類</label><select className="form-select" value={eForm.category} onChange={e => setEForm({...eForm,category:e.target.value})}>{EXP_CATS.map(c => <option key={c}>{c}</option>)}</select></div>
            <div className="form-group"><label className="form-label">收付方式</label><select className="form-select" value={eForm.payment_method} onChange={e => setEForm({...eForm,payment_method:e.target.value})}>{PAY_METHODS.map(m => <option key={m}>{m}</option>)}</select></div>
            <div className="form-group"><label className="form-label">憑證號碼</label><input className="form-input" value={eForm.voucher_no} onChange={e => setEForm({...eForm,voucher_no:e.target.value})} /></div>
            <div className="form-group"><label className="form-label">預計付款日</label><input className="form-input" type="date" value={eForm.expected_date} onChange={e => setEForm({...eForm,expected_date:e.target.value})} /></div>
          </div>
          <div className="form-group"><label className="form-label">說明 *</label><input className="form-input" value={eForm.description} onChange={e => setEForm({...eForm,description:e.target.value})} /></div>
          <div style={{ display: 'flex', gap: 8 }}><button className="btn btn-primary" onClick={addExpense}>建立</button><button className="btn btn-secondary" onClick={() => setShowAddE(false)}>取消</button></div>
        </div>
      )}
      <div className="table-wrap"><table>
        <thead><tr><th>日期</th><th>專案</th><th>廠商</th><th>說明</th><th>分類</th><th>收付方式</th><th>金額</th><th>狀態</th></tr></thead>
        <tbody>{expenses.map(e => (
          <tr key={e.id}>
            <td style={{ fontSize: 12 }}>{e.payment_date || '-'}</td>
            <td>{e.project_name || '-'}</td><td>{e.vendor_name || '-'}</td>
            <td style={{ fontSize: 12 }}>{e.description || '-'}</td>
            <td><span className="capsule" style={{ fontSize: 10 }}>{e.category || '-'}</span></td>
            <td style={{ fontSize: 11 }}>{e.payment_method || '-'}</td>
            <td style={{ fontWeight: 700, color: 'var(--c-danger)' }}>-${(e.amount||0).toLocaleString()}</td>
            <td><span className={`badge ${EXP_STATUS[e.status]?.c || ''}`}>{EXP_STATUS[e.status]?.l || e.status}</span></td>
          </tr>
        ))}</tbody>
      </table></div>
    </>)}

    {(!routeTab || tab === 'overview') && (
      <div className="card">
        <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>📒 收支明細（日記帳視圖）</h2>
        {allEntries.length === 0 ? (
          <p style={{ color: 'var(--c-text-muted)', textAlign: 'center', padding: 20 }}>尚無交易紀錄</p>
        ) : (
          <div className="table-wrap"><table style={{ fontSize: 12 }}>
            <thead><tr><th>日期</th><th>類型</th><th>說明</th><th>專案/對象</th><th>收付方式</th><th>憑證號</th><th style={{ textAlign: 'right' }}>金額</th></tr></thead>
            <tbody>{allEntries.slice(0, 30).map(t => (
              <tr key={t.id}>
                <td style={{ fontSize: 11 }}>{t.payment_date || (t.created_at || '').slice(0, 10)}</td>
                <td>{t._type === 'revenue'
                  ? <span className="badge badge-success" style={{ fontSize: 10 }}>📈收入</span>
                  : <span className="badge badge-danger" style={{ fontSize: 10 }}>📉支出</span>
                }</td>
                <td style={{ fontWeight: 600 }}>{t.description || '-'}</td>
                <td style={{ fontSize: 11, color: 'var(--c-text-muted)' }}>{t.project_name || t.customer_name || t.vendor_name || '-'}</td>
                <td style={{ fontSize: 11 }}>{t.payment_method || '-'}</td>
                <td style={{ fontSize: 10, fontFamily: 'monospace' }}>{t.voucher_no || '-'}</td>
                <td style={{ textAlign: 'right', fontWeight: 700, color: t._type === 'revenue' ? 'var(--c-success)' : 'var(--c-danger)' }}>
                  {t._type === 'revenue' ? '+' : '-'}${(t.amount || 0).toLocaleString()}
                </td>
              </tr>
            ))}</tbody>
          </table></div>
        )}
      </div>
    )}
  </>);
}
