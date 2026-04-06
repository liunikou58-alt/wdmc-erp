import { useState, useEffect } from 'react'
import { useLang } from '../LangContext'
import { useAuth } from '../AuthContext'
import { api } from '../api'

const WEEKDAYS = ['日','一','二','三','四','五','六'];

export default function DailyReport() {
  const { t } = useLang();
  const { user } = useAuth();
  const [reports, setReports] = useState([]);
  const [date, setDate] = useState(new Date().toISOString().slice(0,10));
  const [form, setForm] = useState({ content: '', tasks_completed: '', tasks_planned: '', issues: '' });
  const [editing, setEditing] = useState(false);
  const [stats, setStats] = useState({ total: 0, missing: 0 });
  const [viewMode, setViewMode] = useState('my'); // 'my' | 'team'
  const [month, setMonth] = useState(new Date().toISOString().slice(0,7));

  const load = async () => {
    try {
      const data = await api.get(`/daily-reports?month=${month}&mode=${viewMode}`);
      setReports(data.reports || []);
      setStats(data.stats || { total: 0, missing: 0 });
    } catch { setReports([]); }
  };

  useEffect(() => { load(); }, [month, viewMode]);

  const todayReport = reports.find(r => r.date === date && r.user_id === user.id);

  const save = async () => {
    const payload = { ...form, date };
    if (todayReport) {
      await api.get(`/daily-reports/${todayReport.id}`); // verify exists
      await api._request(`/daily-reports/${todayReport.id}`, { method: 'PUT', body: JSON.stringify(payload), headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('erp_token')}` } });
    } else {
      await api._request('/daily-reports', { method: 'POST', body: JSON.stringify(payload), headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('erp_token')}` } });
    }
    setEditing(false);
    load();
  };

  const openEdit = () => {
    if (todayReport) {
      setForm({
        content: todayReport.content || '',
        tasks_completed: todayReport.tasks_completed || '',
        tasks_planned: todayReport.tasks_planned || '',
        issues: todayReport.issues || '',
      });
    } else {
      setForm({ content: '', tasks_completed: '', tasks_planned: '', issues: '' });
    }
    setEditing(true);
  };

  const dayOfWeek = new Date(date).getDay();
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

  return (<>
    <div className="page-header">
      <div><h1 className="page-title">{t('page.dailyReport')}</h1><p className="page-subtitle">上班日必須填寫 · 休假/六日免填 · 未填自動提醒</p></div>
      <div style={{ display: 'flex', gap: 8 }}>
        <button className={`btn ${viewMode === 'my' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setViewMode('my')}>📝 我的會報</button>
        <button className={`btn ${viewMode === 'team' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setViewMode('team')}>👥 團隊總覽</button>
      </div>
    </div>

    {/* KPI */}
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 20 }}>
      <div className="stat-card"><div className="stat-icon">📝</div><div><div className="stat-value">{stats.total}</div><div className="stat-label">本月已填報</div></div></div>
      <div className="stat-card"><div className="stat-icon" style={{ background: 'var(--c-danger-light)' }}>⚠️</div><div><div className="stat-value" style={{ color: 'var(--c-danger)' }}>{stats.missing}</div><div className="stat-label">本月缺填</div></div></div>
      <div className="stat-card"><div className="stat-icon" style={{ background: 'var(--c-success-light)' }}>✅</div><div><div className="stat-value" style={{ color: 'var(--c-success)' }}>{todayReport ? '已填' : '未填'}</div><div className="stat-label">今日狀態</div></div></div>
      <div className="stat-card"><div className="stat-icon" style={{ background: 'var(--c-info-light)' }}>📅</div><div><div className="stat-value" style={{ color: 'var(--c-info)' }}>{date}</div><div className="stat-label">選擇日期</div></div></div>
    </div>

    {/* 日期選擇 + 填報 */}
    <div className="card" style={{ marginBottom: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <input type="month" className="form-input" value={month} onChange={e => setMonth(e.target.value)} style={{ width: 160 }} />
          <input type="date" className="form-input" value={date} onChange={e => setDate(e.target.value)} style={{ width: 160 }} />
          {isWeekend && <span className="badge badge-warning">🏖️ 週末免填</span>}
        </div>
        {!isWeekend && !editing && (
          <button className="btn btn-primary" onClick={openEdit}>
            {todayReport ? '✏️ 編輯會報' : '📝 填寫今日會報'}
          </button>
        )}
      </div>

      {editing && (
        <div style={{ border: '2px dashed var(--c-primary)', borderRadius: 12, padding: 16, background: 'var(--c-bg-elevated)' }}>
          <h4 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>📝 {date} 工作會報</h4>
          <div className="form-group">
            <label className="form-label" style={{ color: 'var(--c-danger)', fontWeight: 700 }}>🔴 昨天我完成了哪些項目？ *</label>
            <textarea className="form-input" rows={4} value={form.tasks_completed} onChange={e => setForm({...form, tasks_completed: e.target.value})}
              placeholder="日當作業：..." />
          </div>
          <div className="form-group">
            <label className="form-label" style={{ color: 'var(--c-danger)', fontWeight: 700 }}>🔴 今天我打算做哪些項目？ *</label>
            <textarea className="form-input" rows={4} value={form.content} onChange={e => setForm({...form, content: e.target.value})}
              placeholder="日當作業：..." />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="form-group">
              <label className="form-label" style={{ color: 'var(--c-danger)', fontWeight: 700 }}>🔴 目前在執行上,遇到哪些困難？</label>
              <textarea className="form-input" rows={3} value={form.issues} onChange={e => setForm({...form, issues: e.target.value})}
                placeholder="無 或填寫困難..." />
            </div>
            <div className="form-group">
              <label className="form-label" style={{ color: 'var(--c-danger)', fontWeight: 700 }}>🔴 待辦事項？(未來該做但還沒做的事情)</label>
              <textarea className="form-input" rows={3} value={form.tasks_planned} onChange={e => setForm({...form, tasks_planned: e.target.value})}
                placeholder="待辦事項..." />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button className="btn btn-secondary" onClick={() => setEditing(false)}>取消</button>
            <button className="btn btn-primary" onClick={save} disabled={!form.content.trim()}>💾 儲存</button>
          </div>
        </div>
      )}
    </div>

    {/* 團隊未填寫統計 */}
    {viewMode === 'team' && stats.teamStats && stats.teamStats.length > 0 && (
      <div className="card" style={{ marginBottom: 20, borderColor: 'var(--c-danger)', borderWidth: 2, borderStyle: 'solid' }}>
        <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16, color: 'var(--c-danger)' }}>⚠️ 團隊未填寫警示 ({month})</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 12 }}>
          {stats.teamStats.map(s => (
            <div key={s.user_id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 12, background: 'var(--c-danger-light)', borderRadius: 8 }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 14 }}>{s.user_name}</div>
                <div style={{ fontSize: 11, color: 'var(--c-text-muted)', marginTop: 4 }}>
                  缺填日期: <span style={{ fontFamily: 'monospace' }}>{s.missedDays.map(d => d.slice(5)).join(', ')}</span>
                </div>
              </div>
              <div style={{ background: 'var(--c-danger)', color: '#fff', fontWeight: 800, padding: '4px 10px', borderRadius: 20, fontSize: 13 }}>
                缺 {s.missingCount} 份
              </div>
            </div>
          ))}
        </div>
      </div>
    )}

    {/* 報告列表 */}
    <div className="card">
      <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>📋 {month} 工作會報紀錄</h3>
      {reports.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 30, color: 'var(--c-text-muted)', fontSize: 13 }}>本月尚無填報紀錄</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {reports.sort((a,b) => b.date.localeCompare(a.date)).map(r => (
            <div key={r.id} style={{ padding: '12px 16px', border: '1px solid var(--c-border)', borderRadius: 10, 
              borderLeft: `4px solid ${r.date === date ? 'var(--c-primary)' : 'var(--c-border)'}`,
              background: r.date === date ? 'var(--c-primary-light)' : 'transparent' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontWeight: 800, fontSize: 13, color: 'var(--c-primary)' }}>{r.date}</span>
                  <span style={{ fontSize: 11, color: 'var(--c-text-muted)' }}>({WEEKDAYS[new Date(r.date).getDay()]})</span>
                  {viewMode === 'team' && (
                    <span className="badge badge-info" style={{ fontSize: 10 }}>撰寫人：{r.user_name || '?'}</span>
                  )}
                </div>
              </div>
              
              <div style={{ fontSize: 13, display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
                <div>
                  <div style={{ color: 'var(--c-danger)', fontWeight: 700, fontSize: 12 }}>🔴 昨天我完成了哪些項目？</div>
                  <div style={{ whiteSpace: 'pre-wrap', paddingLeft: 18 }}>{r.tasks_completed || '無'}</div>
                </div>
                <div>
                  <div style={{ color: 'var(--c-danger)', fontWeight: 700, fontSize: 12 }}>🔴 今天我打算做哪些項目？</div>
                  <div style={{ whiteSpace: 'pre-wrap', paddingLeft: 18 }}>{r.content || '無'}</div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <div style={{ color: 'var(--c-danger)', fontWeight: 700, fontSize: 12 }}>🔴 目前在執行上,遇到哪些困難？</div>
                    <div style={{ whiteSpace: 'pre-wrap', paddingLeft: 18 }}>{r.issues || '無'}</div>
                  </div>
                  <div>
                    <div style={{ color: 'var(--c-danger)', fontWeight: 700, fontSize: 12 }}>🔴 待辦事項？(未來該做但還沒做的事情)</div>
                    <div style={{ whiteSpace: 'pre-wrap', paddingLeft: 18 }}>{r.tasks_planned || '無'}</div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  </>);
}
