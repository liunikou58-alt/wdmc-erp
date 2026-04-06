import { useState, useEffect } from 'react'
import { useLang } from '../LangContext'
import { useAuth } from '../AuthContext'
import { api } from '../api'

const LEAVE_TYPES = [
  { key: 'annual', label: '特休', icon: '🏖️' },
  { key: 'personal', label: '事假', icon: '📋' },
  { key: 'sick', label: '病假', icon: '🏥' },
  { key: 'official', label: '公假', icon: '🏛️' },
  { key: 'compensatory', label: '補休', icon: '🔄' },
];

export default function Attendance() {
  const { t } = useLang();
  const { user } = useAuth();
  const [tab, setTab] = useState('calendar');
  const [month, setMonth] = useState(new Date().toISOString().slice(0,7));
  const [records, setRecords] = useState([]);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ type: 'annual', start_date: '', end_date: '', reason: '' });

  const load = async () => {
    try {
      const data = await api.get(`/attendance?month=${month}`);
      setRecords(data || []);
    } catch { setRecords([]); }
  };

  useEffect(() => { load(); }, [month]);

  const submit = async () => {
    if (!form.start_date) return;
    await api._request('/attendance', { method: 'POST', body: JSON.stringify(form), headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('erp_token')}` } });
    setShowAdd(false);
    setForm({ type: 'annual', start_date: '', end_date: '', reason: '' });
    load();
  };

  const myRecords = records.filter(r => r.user_id === user.id);
  const leaveDays = myRecords.reduce((s, r) => s + (r.days || 1), 0);

  return (<>
    <div className="page-header">
      <div><h1 className="page-title">{t('page.attendance')}</h1><p className="page-subtitle">員工出勤管理 · 休假申請 · 特休追蹤</p></div>
      <button className="btn btn-primary" onClick={() => setShowAdd(true)}>🏖️ 申請休假</button>
    </div>

    {/* KPI */}
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 20 }}>
      <div className="stat-card"><div className="stat-icon">📅</div><div><div className="stat-value">{myRecords.length}</div><div className="stat-label">本月休假筆數</div></div></div>
      <div className="stat-card"><div className="stat-icon" style={{ background: 'var(--c-info-light)' }}>🏖️</div><div><div className="stat-value" style={{ color: 'var(--c-info)' }}>{leaveDays}</div><div className="stat-label">本月休假天數</div></div></div>
      <div className="stat-card"><div className="stat-icon" style={{ background: 'var(--c-success-light)' }}>✅</div><div><div className="stat-value" style={{ color: 'var(--c-success)' }}>{myRecords.filter(r => r.status === 'approved').length}</div><div className="stat-label">已核准</div></div></div>
      <div className="stat-card"><div className="stat-icon" style={{ background: 'var(--c-warning-light)' }}>⏳</div><div><div className="stat-value" style={{ color: 'var(--c-warning)' }}>{myRecords.filter(r => r.status === 'pending').length}</div><div className="stat-label">待審核</div></div></div>
    </div>

    {/* 休假申請 */}
    {showAdd && (
      <div className="card" style={{ marginBottom: 16 }}>
        <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>🏖️ 申請休假</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
          <div className="form-group">
            <label className="form-label">假別 *</label>
            <select className="form-input" value={form.type} onChange={e => setForm({...form, type: e.target.value})}>
              {LEAVE_TYPES.map(lt => <option key={lt.key} value={lt.key}>{lt.icon} {lt.label}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">開始日期 *</label>
            <input type="date" className="form-input" value={form.start_date} onChange={e => setForm({...form, start_date: e.target.value})} />
          </div>
          <div className="form-group">
            <label className="form-label">結束日期</label>
            <input type="date" className="form-input" value={form.end_date} onChange={e => setForm({...form, end_date: e.target.value})} />
          </div>
          <div className="form-group">
            <label className="form-label">事由</label>
            <input className="form-input" value={form.reason} onChange={e => setForm({...form, reason: e.target.value})} placeholder="請假事由..." />
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
          <button className="btn btn-primary" onClick={submit}>送出申請</button>
          <button className="btn btn-secondary" onClick={() => setShowAdd(false)}>取消</button>
        </div>
      </div>
    )}

    {/* 月份選擇 */}
    <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 16 }}>
      <input type="month" className="form-input" value={month} onChange={e => setMonth(e.target.value)} style={{ width: 180 }} />
      <div style={{ display: 'flex', gap: 6 }}>
        {[['calendar','📅 月曆'],['list','📋 列表']].map(([k,l]) => (
          <button key={k} className={`btn btn-sm ${tab === k ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setTab(k)}>{l}</button>
        ))}
      </div>
    </div>

    {/* 列表模式 */}
    {tab === 'list' && (
      <div className="card">
        <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>📋 {month} 休假紀錄</h3>
        {records.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 30, color: 'var(--c-text-muted)', fontSize: 13 }}>本月無休假紀錄</div>
        ) : (
          <div className="table-wrap"><table>
            <thead><tr><th>員工</th><th>假別</th><th>開始</th><th>結束</th><th>天數</th><th>事由</th><th>狀態</th></tr></thead>
            <tbody>{records.sort((a,b) => a.start_date.localeCompare(b.start_date)).map(r => {
              const lt = LEAVE_TYPES.find(l => l.key === r.type) || { icon: '📋', label: r.type };
              return (
                <tr key={r.id}>
                  <td style={{ fontWeight: 600 }}>{r.user_name || user.display_name}</td>
                  <td><span className="badge badge-info">{lt.icon} {lt.label}</span></td>
                  <td style={{ fontSize: 12 }}>{r.start_date}</td>
                  <td style={{ fontSize: 12 }}>{r.end_date || r.start_date}</td>
                  <td style={{ fontWeight: 700 }}>{r.days || 1}</td>
                  <td style={{ fontSize: 12, color: 'var(--c-text-muted)' }}>{r.reason || '—'}</td>
                  <td>
                    <span className={`badge ${r.status === 'approved' ? 'badge-success' : r.status === 'rejected' ? 'badge-danger' : 'badge-warning'}`}>
                      {r.status === 'approved' ? '✅ 已核准' : r.status === 'rejected' ? '❌ 拒絕' : '⏳ 待審'}
                    </span>
                  </td>
                </tr>
              );
            })}</tbody>
          </table></div>
        )}
      </div>
    )}

    {/* 月曆模式 */}
    {tab === 'calendar' && (
      <div className="card">
        <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>📅 {month} 出勤月曆</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 1, marginBottom: 4 }}>
          {['日','一','二','三','四','五','六'].map(w => (
            <div key={w} style={{ textAlign: 'center', fontSize: 12, fontWeight: 700, color: 'var(--c-text-muted)', padding: '6px 0' }}>{w}</div>
          ))}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 1 }}>
          {(() => {
            const [y, m] = month.split('-').map(Number);
            const firstDay = new Date(y, m-1, 1).getDay();
            const daysInMonth = new Date(y, m, 0).getDate();
            const cells = [];
            for (let i = 0; i < firstDay; i++) cells.push(null);
            for (let d = 1; d <= daysInMonth; d++) cells.push(d);
            return cells.map((d, i) => {
              const dateStr = d ? `${month}-${String(d).padStart(2,'0')}` : '';
              const dayRecords = d ? records.filter(r => r.start_date <= dateStr && (r.end_date || r.start_date) >= dateStr) : [];
              const today = new Date().toISOString().slice(0,10);
              return (
                <div key={i} style={{ minHeight: 60, padding: '4px 6px', border: '1px solid var(--c-border)', borderRadius: 4, 
                  background: !d ? 'var(--c-bg)' : dateStr === today ? 'var(--c-primary-light)' : 'white' }}>
                  {d && <>
                    <div style={{ fontSize: 12, fontWeight: dateStr === today ? 800 : 500, color: dateStr === today ? 'var(--c-primary)' : 'inherit' }}>{d}</div>
                    {dayRecords.map(r => (
                      <div key={r.id} style={{ fontSize: 9, padding: '1px 4px', background: r.type === 'annual' ? '#10b981' : r.type === 'sick' ? '#ef4444' : '#6366f1', color: 'white', borderRadius: 3, marginTop: 1, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                        {(LEAVE_TYPES.find(l => l.key === r.type)?.icon || '') + ' ' + (r.user_name || '')}
                      </div>
                    ))}
                  </>}
                </div>
              );
            });
          })()}
        </div>
      </div>
    )}
  </>);
}
