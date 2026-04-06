import { useState, useEffect } from 'react'
import { useLang } from '../LangContext'
import { api } from '../api'

const SHIFTS = { full: '全天', morning: '上午', afternoon: '下午', evening: '晚上', overnight: '過夜' };

export default function Scheduling() {
  const { t } = useLang();
  const [schedules, setSchedules] = useState([]);
  const [users, setUsers] = useState([]);
  const [projects, setProjects] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [conflicts, setConflicts] = useState([]);
  const [availability, setAvailability] = useState([]);
  const [checkDate, setCheckDate] = useState(new Date().toISOString().slice(0, 10));
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ user_id: '', project_id: '', start_date: '', end_date: '', shift: 'full', location: '' });

  const load = () => {
    api.getSchedules().then(setSchedules);
    api.getScheduleConflicts().then(setConflicts).catch(() => {});
  };

  useEffect(() => {
    load();
    api.getUsers().then(setUsers);
    api.getProjects().then(setProjects).catch(() => {});
    api.getDepartments().then(setDepartments).catch(() => {});
  }, []);

  useEffect(() => {
    if (checkDate) api.getAvailability(checkDate).then(setAvailability).catch(() => {});
  }, [checkDate]);

  const add = async () => {
    if (!form.user_id || !form.start_date) return;
    try {
      await api.createSchedule(form);
      load();
      setShowAdd(false); setForm({ user_id: '', project_id: '', start_date: '', end_date: '', shift: 'full', location: '' });
    } catch (e) { alert(e.message); }
  };

  const del = async (id) => { await api.deleteSchedule(id); load(); };
  const set = f => e => setForm({ ...form, [f]: e.target.value });

  const availableStaff = availability.filter(a => a.is_available);
  const busyStaff = availability.filter(a => !a.is_available);

  return (
    <>
      <div className="page-header">
        <div><h1 className="page-title">{t('page.scheduling')}</h1><p className="page-subtitle">排班管理、衝突檢查、人員可用性</p></div>
        <button className="btn btn-primary" onClick={() => setShowAdd(true)}>{t('scheduling.add')}</button>
      </div>

      {/* 衝突警告 */}
      {conflicts.length > 0 && (
        <div style={{ background: 'var(--c-danger-light)', border: '1px solid #fca5a5', borderRadius: 10, padding: '12px 16px', marginBottom: 16 }}>
          <div style={{ fontWeight: 700, color: 'var(--c-danger)', fontSize: 13, marginBottom: 4 }}>⚠️ 發現 {conflicts.length} 個排班衝突</div>
          {conflicts.slice(0, 3).map((c, i) => (
            <div key={i} style={{ fontSize: 12, color: 'var(--c-danger)' }}>• {c.user_name}：{c.schedule_a.start_date} 與 {c.schedule_b.start_date} 衝突</div>
          ))}
        </div>
      )}

      {showAdd && (
        <div className="card" style={{ marginBottom: 16 }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 12 }}>{t('scheduling.addTitle')}</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
            <div className="form-group"><label className="form-label">人員 *</label><select className="form-select" value={form.user_id} onChange={set('user_id')}><option value="">選擇</option>{users.map(u => <option key={u.id} value={u.id}>{u.display_name} ({u.department_name || ''})</option>)}</select></div>
            <div className="form-group"><label className="form-label">專案</label><select className="form-select" value={form.project_id} onChange={set('project_id')}><option value="">-</option>{projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
            <div className="form-group"><label className="form-label">班次</label><select className="form-select" value={form.shift} onChange={set('shift')}>{Object.entries(SHIFTS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></div>
            <div className="form-group"><label className="form-label">開始日期 *</label><input className="form-input" type="date" value={form.start_date} onChange={set('start_date')} /></div>
            <div className="form-group"><label className="form-label">結束日期</label><input className="form-input" type="date" value={form.end_date} onChange={set('end_date')} /></div>
            <div className="form-group"><label className="form-label">地點</label><input className="form-input" value={form.location} onChange={set('location')} /></div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}><button className="btn btn-primary" onClick={add}>{t('common.create2')}</button><button className="btn btn-secondary" onClick={() => setShowAdd(false)}>{t('common.cancel')}</button></div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 24 }}>
        {/* 人員可用性 */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <h3 style={{ fontSize: 15, fontWeight: 700 }}>📊 人員可用性</h3>
            <input className="form-input" type="date" value={checkDate} onChange={e => setCheckDate(e.target.value)} style={{ width: 160 }} />
          </div>
          <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
            <span className="badge badge-success">✅ 可用 {availableStaff.length}</span>
            <span className="badge badge-warning">🔄 已排 {busyStaff.length}</span>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {availability.map(a => (
              <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: 20, border: '1px solid var(--c-border)', background: a.is_available ? 'var(--c-success-light)' : 'var(--c-warning-light)', fontSize: 12 }}>
                <div className="avatar" style={{ background: a.avatar_color, width: 22, height: 22, fontSize: 10 }}>{a.display_name[0]}</div>
                {a.display_name}
              </div>
            ))}
          </div>
        </div>

        {/* 統計 */}
        <div className="card">
          <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 12 }}>📋 排班統計</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
            <div className="stat-card"><div className="stat-icon" style={{ background: 'var(--c-primary-light)' }}>📅</div><div><div className="stat-value">{schedules.length}</div><div className="stat-label">總排班數</div></div></div>
            <div className="stat-card"><div className="stat-icon" style={{ background: 'var(--c-danger-light)' }}>⚠️</div><div><div className="stat-value">{conflicts.length}</div><div className="stat-label">衝突</div></div></div>
          </div>
        </div>
      </div>

      {/* 排班列表 */}
      <div className="card">
        <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 12 }}>📅 排班列表</h3>
        {schedules.length === 0 ? <p style={{ color: 'var(--c-text-muted)', textAlign: 'center', padding: 20 }}>{t('scheduling.empty')}</p> : (
          <div className="table-wrap"><table>
            <thead><tr><th>{t('scheduling.staff')}</th><th>部門</th><th>{t('vendor.project')}</th><th>{t('finance.date')}</th><th>班次</th><th>地點</th><th>操作</th></tr></thead>
            <tbody>{schedules.map(s => (
              <tr key={s.id}>
                <td><div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><div className="avatar" style={{ background: s.user_avatar_color, width: 24, height: 24, fontSize: 10 }}>{s.user_name[0]}</div><span style={{ fontWeight: 600 }}>{s.user_name}</span></div></td>
                <td style={{ fontSize: 12 }}>{s.department_icon} {s.department_name}</td>
                <td style={{ fontSize: 12 }}>{s.project_name || '-'}</td>
                <td style={{ fontSize: 12, fontFamily: 'monospace' }}>{s.start_date}{s.end_date && s.end_date !== s.start_date ? ` ~ ${s.end_date}` : ''}</td>
                <td><span className="badge badge-primary">{SHIFTS[s.shift] || s.shift}</span></td>
                <td style={{ fontSize: 12 }}>{s.location || '-'}</td>
                <td><button className="btn btn-danger btn-sm" onClick={() => del(s.id)}>🗑️</button></td>
              </tr>
            ))}</tbody>
          </table></div>
        )}
      </div>
    </>
  );
}
