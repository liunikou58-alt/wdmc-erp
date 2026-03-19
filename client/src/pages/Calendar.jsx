import { useState, useEffect, useMemo } from 'react'
import { api } from '../api'

const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六'];
const TYPE_LABELS = { project: '📁 專案', deadline: '⏰ 截止', task: '📋 任務', schedule: '👷 排班', custom: '📌 自訂' };

export default function Calendar() {
  const [events, setEvents] = useState([]);
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth());
  const [selected, setSelected] = useState(null);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ title: '', date: '', color: '#6366f1' });

  useEffect(() => {
    const start = `${year}-${String(month + 1).padStart(2, '0')}-01`;
    const end = `${year}-${String(month + 1).padStart(2, '0')}-31`;
    api.getCalendar(start, end).then(setEvents).catch(() => setEvents([]));
  }, [year, month]);

  const days = useMemo(() => {
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const cells = [];
    for (let i = 0; i < firstDay; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(d);
    return cells;
  }, [year, month]);

  const getDateStr = (d) => `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  const dayEvents = (d) => events.filter(e => e.date === getDateStr(d));
  const today = new Date().toISOString().slice(0, 10);

  const prev = () => { if (month === 0) { setMonth(11); setYear(year - 1); } else setMonth(month - 1); };
  const next = () => { if (month === 11) { setMonth(0); setYear(year + 1); } else setMonth(month + 1); };

  const addEvent = async () => {
    if (!form.title || !form.date) return;
    await api.addCalendarEvent(form);
    setShowAdd(false); setForm({ title: '', date: '', color: '#6366f1' });
    const start = `${year}-${String(month + 1).padStart(2, '0')}-01`;
    const end = `${year}-${String(month + 1).padStart(2, '0')}-31`;
    api.getCalendar(start, end).then(setEvents);
  };

  return (
    <>
      <div className="page-header">
        <div><h1 className="page-title">📅 行事曆</h1><p className="page-subtitle">全公司活動、排班與截止日總覽</p></div>
        <button className="btn btn-primary" onClick={() => setShowAdd(true)}>➕ 新增事件</button>
      </div>

      {showAdd && (
        <div className="card" style={{ marginBottom: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 80px', gap: 12 }}>
            <div className="form-group"><label className="form-label">事件名稱</label><input className="form-input" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} /></div>
            <div className="form-group"><label className="form-label">日期</label><input className="form-input" type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} /></div>
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

        {/* 星期標題 */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 1, marginBottom: 4 }}>
          {WEEKDAYS.map(w => <div key={w} style={{ textAlign: 'center', fontSize: 12, fontWeight: 700, color: 'var(--c-text-muted)', padding: '6px 0' }}>{w}</div>)}
        </div>

        {/* 日期格 */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 1 }}>
          {days.map((d, i) => (
            <div key={i} onClick={() => d && setSelected(d === selected ? null : d)}
              style={{ minHeight: 80, padding: '4px 6px', border: '1px solid var(--c-border)', borderRadius: 4, background: !d ? 'var(--c-bg)' : getDateStr(d) === today ? 'var(--c-primary-light)' : selected === d ? '#f1f5f9' : 'white', cursor: d ? 'pointer' : 'default', transition: 'background 0.15s' }}>
              {d && <>
                <div style={{ fontSize: 12, fontWeight: getDateStr(d) === today ? 800 : 500, color: getDateStr(d) === today ? 'var(--c-primary)' : 'inherit', marginBottom: 2 }}>{d}</div>
                {dayEvents(d).slice(0, 3).map(e => (
                  <div key={e.id} style={{ fontSize: 10, padding: '1px 4px', background: e.color || '#6366f1', color: 'white', borderRadius: 3, marginBottom: 1, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{e.title}</div>
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
                <div key={e.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', border: '1px solid var(--c-border)', borderRadius: 8, borderLeft: `4px solid ${e.color || '#6366f1'}` }}>
                  <span style={{ fontSize: 12 }}>{TYPE_LABELS[e.type] || e.type}</span>
                  <span style={{ fontWeight: 600, fontSize: 13 }}>{e.title}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </>
  );
}
