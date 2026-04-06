import { useState, useEffect, useMemo } from 'react'
import { useLang } from '../LangContext'
import { api } from '../api'

const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六'];
const TYPE_LABELS = { project: '📁 專案', deadline: '⏰ 截止', task: '📋 任務', schedule: '👷 排班', custom: '📌 自訂', event: '🎪 活動', setup: '🏗️ 進撤場', company: '🏢 公司事務' };
const CAL_TABS = [
  { key: 'all', label: '📅 全部', color: 'var(--c-primary)' },
  { key: 'event', label: '🎪 活動日', color: '#f59e0b' },
  { key: 'setup', label: '🏗️ 進撤場', color: '#8b5cf6' },
  { key: 'company', label: '🏢 公司事務', color: '#06b6d4' },
  { key: 'schedule', label: '👷 排班', color: '#10b981' },
  { key: 'custom', label: '📌 自訂', color: '#6366f1' },
];

export default function Calendar() {
  const { t } = useLang();
  const [events, setEvents] = useState([]);
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth());
  const [selected, setSelected] = useState(null);
  const [showAdd, setShowAdd] = useState(false);
  const [calType, setCalType] = useState('all');
  const [form, setForm] = useState({ title: '', date: '', color: 'var(--c-primary)', type: 'custom' });

  useEffect(() => {
    const start = `${year}-${String(month + 1).padStart(2, '0')}-01`;
    const end = `${year}-${String(month + 1).padStart(2, '0')}-31`;
    api.getCalendar(start, end).then(setEvents).catch(() => setEvents([]));
  }, [year, month]);

  const filteredEvents = calType === 'all' ? events : events.filter(e => e.type === calType);

  const days = useMemo(() => {
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const cells = [];
    for (let i = 0; i < firstDay; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(d);
    return cells;
  }, [year, month]);

  const getDateStr = (d) => `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  const dayEvents = (d) => filteredEvents.filter(e => e.date === getDateStr(d));
  const today = new Date().toISOString().slice(0, 10);

  const prev = () => { if (month === 0) { setMonth(11); setYear(year - 1); } else setMonth(month - 1); };
  const next = () => { if (month === 11) { setMonth(0); setYear(year + 1); } else setMonth(month + 1); };

  const addEvent = async () => {
    if (!form.title || !form.date) return;
    await api.addCalendarEvent(form);
    setShowAdd(false); setForm({ title: '', date: '', color: 'var(--c-primary)', type: 'custom' });
    const start = `${year}-${String(month + 1).padStart(2, '0')}-01`;
    const end = `${year}-${String(month + 1).padStart(2, '0')}-31`;
    api.getCalendar(start, end).then(setEvents);
  };

  // Stats
  const typeStats = {};
  events.forEach(e => { typeStats[e.type] = (typeStats[e.type] || 0) + 1; });

  return (
    <>
      <div className="page-header">
        <div><h1 className="page-title">{t('page.calendar')}</h1><p className="page-subtitle">活動日 · 進撤場 · 公司事務 · 排班 — 多維度行事曆</p></div>
        <button className="btn btn-primary" onClick={() => setShowAdd(true)}>➕ 新增事件</button>
      </div>

      {/* KPI */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 10, marginBottom: 16 }}>
        {CAL_TABS.map(ct => (
          <div key={ct.key} className="stat-card" style={{ cursor: 'pointer', border: calType === ct.key ? `2px solid ${ct.color}` : '', padding: 10 }}
            onClick={() => setCalType(ct.key)}>
            <div style={{ fontSize: 20, marginBottom: 2 }}>{ct.label.split(' ')[0]}</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: ct.color }}>{ct.key === 'all' ? events.length : (typeStats[ct.key] || 0)}</div>
            <div style={{ fontSize: 10, color: 'var(--c-text-muted)' }}>{ct.label.split(' ').slice(1).join(' ')}</div>
          </div>
        ))}
      </div>

      {showAdd && (
        <div className="card" style={{ marginBottom: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 80px', gap: 12 }}>
            <div className="form-group"><label className="form-label">事件名稱</label><input className="form-input" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} /></div>
            <div className="form-group"><label className="form-label">日期</label><input className="form-input" type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} /></div>
            <div className="form-group"><label className="form-label">類型</label>
              <select className="form-input" value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>
                {CAL_TABS.filter(t => t.key !== 'all').map(t => <option key={t.key} value={t.key}>{t.label}</option>)}
              </select>
            </div>
            <div className="form-group"><label className="form-label">顏色</label><input type="color" value={form.color} onChange={e => setForm({ ...form, color: e.target.value })} style={{ width: '100%', height: 35, border: 'none', cursor: 'pointer' }} /></div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}><button className="btn btn-primary" onClick={addEvent}>建立</button><button className="btn btn-secondary" onClick={() => setShowAdd(false)}>取消</button></div>
        </div>
      )}

      {/* 月曆導覽 */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <button className="btn btn-secondary btn-sm" onClick={prev}>◀ 上月</button>
          <h2 style={{ fontSize: 18, fontWeight: 800 }}>{year} 年 {month + 1} 月</h2>
          <button className="btn btn-secondary btn-sm" onClick={next}>下月 ▶</button>
        </div>

        {/* 類型篩選 Tabs */}
        <div className="sub-tabs" style={{ marginBottom: 12 }}>
          {CAL_TABS.map(ct => (
            <button key={ct.key} className={`sub-tab ${calType === ct.key ? 'active' : ''}`}
              onClick={() => setCalType(ct.key)}
              style={calType === ct.key ? { borderBottom: `3px solid ${ct.color}` } : {}}>
              {ct.label}
            </button>
          ))}
        </div>

        {/* 星期標題 */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 1, marginBottom: 4 }}>
          {WEEKDAYS.map(w => <div key={w} style={{ textAlign: 'center', fontSize: 12, fontWeight: 700, color: 'var(--c-text-muted)', padding: '6px 0' }}>{w}</div>)}
        </div>

        {/* 日期格 */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 1 }}>
          {days.map((d, i) => (
            <div key={i} onClick={() => d && setSelected(d === selected ? null : d)}
              style={{ minHeight: 80, padding: '4px 6px', border: '1px solid var(--c-border)', borderRadius: 4, background: !d ? 'var(--c-bg)' : getDateStr(d) === today ? 'var(--c-primary-light)' : selected === d ? 'var(--c-bg-elevated)' : 'white', cursor: d ? 'pointer' : 'default', transition: 'background 0.15s' }}>
              {d && <>
                <div style={{ fontSize: 12, fontWeight: getDateStr(d) === today ? 800 : 500, color: getDateStr(d) === today ? 'var(--c-primary)' : 'inherit', marginBottom: 2 }}>{d}</div>
                {dayEvents(d).slice(0, 3).map(e => (
                  <div key={e.id} style={{ fontSize: 10, padding: '1px 4px', background: e.color || 'var(--c-primary)', color: 'white', borderRadius: 3, marginBottom: 1, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{e.title}</div>
                ))}
                {dayEvents(d).length > 3 && <div style={{ fontSize: 9, color: 'var(--c-text-muted)' }}>+{dayEvents(d).length - 3} 更多</div>}
              </>}
            </div>
          ))}
        </div>
      </div>

      {/* 當日詳情 */}
      {selected && (
        <div className="card">
          <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 12 }}>📋 {month + 1}/{selected} 事件</h3>
          {dayEvents(selected).length === 0 ? <p style={{ color: 'var(--c-text-muted)', fontSize: 13 }}>無事件</p> : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {dayEvents(selected).map(e => (
                <div key={e.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', border: '1px solid var(--c-border)', borderRadius: 8, borderLeft: `4px solid ${e.color || 'var(--c-primary)'}` }}>
                  <span style={{ fontSize: 12 }}>{TYPE_LABELS[e.type] || e.type}</span>
                  <span style={{ fontWeight: 600, fontSize: 13 }}>
                    {e.time && <span style={{ marginRight: 6, color: 'var(--c-primary)', fontFamily: 'monospace' }}>{e.time}</span>}
                    {e.title}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </>
  );
}
