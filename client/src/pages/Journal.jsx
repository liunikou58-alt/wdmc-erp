import { useState, useEffect, useCallback } from 'react'
import { useLang } from '../LangContext'
import { api } from '../api'

const FMT = n => n != null ? `$${Number(n).toLocaleString()}` : '$0';
const TX_TYPES = [
  { value: 'income', label: '收入', icon: '📈', color: 'var(--c-success)' },
  { value: 'expense', label: '支出', icon: '📉', color: 'var(--c-danger)' },
];
const PAY_TYPES = ['匯款', '現金', '支票', '信用卡', '其他'];
const CATEGORIES = ['一般', '場地', '設備', '人事', '交通', '餐飲', '設計', '印刷', '保險', '稅金', '其他'];

export default function Journal() {
  const { t } = useLang();
  const [entries, setEntries] = useState([]);
  const [stats, setStats] = useState({});
  const [customers, setCustomers] = useState([]);
  const [projects, setProjects] = useState([]);
  const [showAdd, setShowAdd] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({ transaction_type: 'expense', payment_type: '匯款', category: '一般', amount: '' });
  const [filter, setFilter] = useState({ month: new Date().toISOString().slice(0, 7), type: '' });

  const load = useCallback(async () => {
    const params = {};
    if (filter.month) params.month = filter.month;
    if (filter.type) params.type = filter.type;
    const [e, s] = await Promise.all([
      api.getJournal(params),
      api.getJournalStats(params),
    ]);
    setEntries(e || []);
    setStats(s || {});
  }, [filter]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    api.getCustomers().then(setCustomers).catch(() => {});
    api.getProjects().then(setProjects).catch(() => {});
  }, []);

  const save = async () => {
    if (!form.description || !form.amount) return alert('請填寫說明和金額');
    if (editId) {
      await api.updateJournal(editId, { ...form, amount: Number(form.amount) });
    } else {
      await api.createJournal({ ...form, amount: Number(form.amount) });
    }
    setShowAdd(false); setEditId(null);
    setForm({ transaction_type: 'expense', payment_type: '匯款', category: '一般', amount: '' });
    load();
  };

  const del = async (id) => {
    if (!confirm('確定刪除這筆記錄？')) return;
    await api.deleteJournal(id);
    load();
  };

  const settle = async (id, val) => {
    await api.updateJournal(id, { is_settled: val });
    load();
  };

  const edit = (e) => {
    setForm({ ...e, amount: e.amount || '' });
    setEditId(e.id);
    setShowAdd(true);
  };

  const set = f => e => setForm({ ...form, [f]: e.target.value });

  return (<>
    <div className="page-header">
      <div><h1 className="page-title">📒 收支日記帳</h1><p className="page-subtitle">記錄每日收支明細，追蹤現金流</p></div>
      <button className="btn btn-primary" onClick={() => { setShowAdd(true); setEditId(null); setForm({ transaction_type: 'expense', payment_type: '匯款', category: '一般', amount: '', date: new Date().toISOString().slice(0,10) }); }}>➕ 新增記錄</button>
    </div>

    {/* KPI */}
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 20 }}>
      {[
        { label: '月收入', value: FMT(stats.income), icon: '📈', color: 'var(--c-success)' },
        { label: '月支出', value: FMT(stats.expense), icon: '📉', color: 'var(--c-danger)' },
        { label: '淨額', value: FMT(stats.net), icon: '💰', color: stats.net >= 0 ? 'var(--c-success)' : 'var(--c-danger)' },
        { label: '待收/付', value: FMT(stats.pending), icon: '⏳', color: 'var(--c-warning)' },
      ].map((k, i) => (
        <div key={i} className="stat-card"><div className="stat-label">{k.icon} {k.label}</div><div className="stat-value" style={{ color: k.color }}>{k.value}</div></div>
      ))}
    </div>

    {/* 篩選 */}
    <div style={{ display: 'flex', gap: 10, marginBottom: 16, alignItems: 'center' }}>
      <input type="month" className="form-input" style={{ width: 160, fontSize: 12 }} value={filter.month} onChange={e => setFilter(f => ({ ...f, month: e.target.value }))} />
      <select className="form-input" style={{ width: 100, fontSize: 12 }} value={filter.type} onChange={e => setFilter(f => ({ ...f, type: e.target.value }))}>
        <option value="">全部類型</option>
        <option value="income">收入</option>
        <option value="expense">支出</option>
      </select>
      <span style={{ fontSize: 12, color: 'var(--c-text-muted)' }}>共 {entries.length} 筆</span>
    </div>

    {/* 新增/編輯表單 */}
    {showAdd && (
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.4)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="card" style={{ width: 520, maxHeight: '80vh', overflow: 'auto', padding: 24 }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 14 }}>{editId ? '✏️ 編輯記錄' : '📒 新增收支記錄'}</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div className="form-group"><label className="form-label">交易類型 *</label>
              <select className="form-input" value={form.transaction_type} onChange={set('transaction_type')}>
                {TX_TYPES.map(t => <option key={t.value} value={t.value}>{t.icon} {t.label}</option>)}
              </select>
            </div>
            <div className="form-group"><label className="form-label">收付方式</label>
              <select className="form-input" value={form.payment_type} onChange={set('payment_type')}>
                {PAY_TYPES.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div className="form-group"><label className="form-label">日期 *</label>
              <input type="date" className="form-input" value={form.date || ''} onChange={set('date')} />
            </div>
            <div className="form-group"><label className="form-label">金額 *</label>
              <input type="number" className="form-input" value={form.amount} onChange={set('amount')} placeholder="0" />
            </div>
            <div className="form-group" style={{ gridColumn: '1 / -1' }}><label className="form-label">說明 *</label>
              <input className="form-input" value={form.description || ''} onChange={set('description')} placeholder="收支說明" />
            </div>
            <div className="form-group"><label className="form-label">分類</label>
              <select className="form-input" value={form.category || '一般'} onChange={set('category')}>
                {CATEGORIES.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div className="form-group"><label className="form-label">憑證號碼</label>
              <input className="form-input" value={form.voucher_no || ''} onChange={set('voucher_no')} />
            </div>
            <div className="form-group"><label className="form-label">關聯專案</label>
              <select className="form-input" value={form.project_id || ''} onChange={set('project_id')}>
                <option value="">-- 無 --</option>
                {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div className="form-group"><label className="form-label">關聯客戶</label>
              <select className="form-input" value={form.customer_id || ''} onChange={set('customer_id')}>
                <option value="">-- 無 --</option>
                {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className="form-group"><label className="form-label">預計收/付日</label>
              <input type="date" className="form-input" value={form.expected_date || ''} onChange={set('expected_date')} />
            </div>
            <div className="form-group"><label className="form-label">憑證日期</label>
              <input type="date" className="form-input" value={form.voucher_date || ''} onChange={set('voucher_date')} />
            </div>
          </div>
          <div className="form-group" style={{ marginTop: 8 }}><label className="form-label">備註</label>
            <textarea className="form-input" value={form.notes || ''} onChange={set('notes')} rows={2} style={{ width: '100%' }} />
          </div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 14 }}>
            <button className="btn" onClick={() => { setShowAdd(false); setEditId(null); }}>取消</button>
            <button className="btn btn-primary" onClick={save}>{editId ? '更新' : '建立'}</button>
          </div>
        </div>
      </div>
    )}

    {/* 列表 */}
    {entries.length === 0 ? (
      <div className="empty-state"><div className="empty-state-icon">📒</div><div className="empty-state-title">尚無收支記錄</div><p>點擊「新增記錄」開始記帳</p></div>
    ) : (
      <div className="card" style={{ overflow: 'auto' }}>
        <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
          <thead><tr style={{ background: 'var(--c-bg-elevated)', textAlign: 'left' }}>
            <th style={TH}>編號</th><th style={TH}>日期</th><th style={TH}>類型</th><th style={TH}>說明</th>
            <th style={TH}>分類</th><th style={{ ...TH, textAlign: 'right' }}>金額</th><th style={TH}>收付方式</th>
            <th style={TH}>專案</th><th style={TH}>已結清</th><th style={TH}>操作</th>
          </tr></thead>
          <tbody>{entries.map(e => {
            const isIncome = e.transaction_type === 'income';
            return (
              <tr key={e.id} style={{ borderBottom: '1px solid var(--c-border)' }}>
                <td style={{ ...TD, fontFamily: 'monospace', fontSize: 10, color: 'var(--c-primary)' }}>{e.entry_no}</td>
                <td style={{ ...TD, fontSize: 11 }}>{(e.date || '').slice(0, 10)}</td>
                <td style={TD}><span style={{ padding: '2px 8px', borderRadius: 6, fontSize: 10, fontWeight: 600, background: isIncome ? 'var(--c-success-light)' : 'var(--c-danger-light)', color: isIncome ? 'var(--c-success)' : 'var(--c-danger)' }}>{isIncome ? '📈收入' : '📉支出'}</span></td>
                <td style={{ ...TD, fontWeight: 600 }}>{e.description}</td>
                <td style={{ ...TD, fontSize: 11 }}>{e.category || '一般'}</td>
                <td style={{ ...TD, textAlign: 'right', fontWeight: 700, color: isIncome ? 'var(--c-success)' : 'var(--c-danger)' }}>{isIncome ? '+' : '-'}{FMT(e.amount)}</td>
                <td style={{ ...TD, fontSize: 11 }}>{e.payment_type}</td>
                <td style={{ ...TD, fontSize: 11, color: 'var(--c-text-muted)' }}>{e.project_name || '-'}</td>
                <td style={TD}>
                  <input type="checkbox" checked={!!e.is_settled} onChange={() => settle(e.id, !e.is_settled)} />
                </td>
                <td style={TD}>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <button className="btn btn-sm" onClick={() => edit(e)} style={{ fontSize: 10 }}>✏️</button>
                    <button className="btn btn-sm btn-danger" onClick={() => del(e.id)} style={{ fontSize: 10 }}>🗑️</button>
                  </div>
                </td>
              </tr>
            );
          })}</tbody>
        </table>
      </div>
    )}
  </>);
}

const TH = { padding: '8px 6px', fontSize: 10, fontWeight: 600, color: 'var(--c-text-muted)', borderBottom: '2px solid var(--c-border)' };
const TD = { padding: '6px' };
