import { useState, useEffect, useMemo } from 'react'
import { useLang } from '../LangContext'
import { useAuth } from '../AuthContext'
import { api } from '../api'

const VEHICLES = [
  { id: 'RDY-2173', type: 'car', label: '🚗 RDY-2173' },
  { id: 'RDY-2175', type: 'car', label: '🚗 RDY-2175' },
  { id: 'RDY-8320', type: 'suv', label: '🚙 RDY-8320' },
];
const SLOTS = [
  { key: 'morning', label: '上午', icon: '🌅' },
  { key: 'afternoon', label: '下午', icon: '🌇' },
];
const WEEKDAYS = ['日','一','二','三','四','五','六'];

export default function VehicleBooking() {
  const { t } = useLang();
  const { user } = useAuth();
  const [bookings, setBookings] = useState([]);
  const [weekStart, setWeekStart] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - d.getDay() + 1); // Monday
    return d.toISOString().slice(0,10);
  });
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ vehicle_id: VEHICLES[0].id, date: '', time_slot: 'morning', event_name: '', destination: '' });

  const weekDates = useMemo(() => {
    const dates = [];
    const start = new Date(weekStart);
    for (let i = 0; i < 7; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      dates.push(d.toISOString().slice(0,10));
    }
    return dates;
  }, [weekStart]);

  const load = async () => {
    try {
      const data = await api.get(`/vehicle-bookings?start=${weekDates[0]}&end=${weekDates[6]}`);
      setBookings(data || []);
    } catch { setBookings([]); }
  };

  useEffect(() => { load(); }, [weekStart]);

  const prevWeek = () => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() - 7);
    setWeekStart(d.toISOString().slice(0,10));
  };
  const nextWeek = () => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + 7);
    setWeekStart(d.toISOString().slice(0,10));
  };

  const book = async () => {
    if (!form.event_name || !form.date) return;
    await api._request('/vehicle-bookings', { method: 'POST', body: JSON.stringify(form), headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('erp_token')}` } });
    setShowAdd(false);
    setForm({ vehicle_id: VEHICLES[0].id, date: '', time_slot: 'morning', event_name: '', destination: '' });
    load();
  };

  const getBooking = (vid, date, slot) => bookings.find(b => b.vehicle_id === vid && b.date === date && b.time_slot === slot);
  const today = new Date().toISOString().slice(0,10);

  return (<>
    <div className="page-header">
      <div><h1 className="page-title">{t('page.vehicles')}</h1><p className="page-subtitle">請打上租借人/活動名稱 · 車輛使用完畢請清理垃圾 · 記得開啟神盾照相機</p></div>
      <button className="btn btn-primary" onClick={() => setShowAdd(true)}>🚗 預約用車</button>
    </div>

    {/* 新增預約 */}
    {showAdd && (
      <div className="card" style={{ marginBottom: 16 }}>
        <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>🚗 預約公司車</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10 }}>
          <div className="form-group">
            <label className="form-label">車輛 *</label>
            <select className="form-input" value={form.vehicle_id} onChange={e => setForm({...form, vehicle_id: e.target.value})}>
              {VEHICLES.map(v => <option key={v.id} value={v.id}>{v.label}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">日期 *</label>
            <input type="date" className="form-input" value={form.date} onChange={e => setForm({...form, date: e.target.value})} />
          </div>
          <div className="form-group">
            <label className="form-label">時段 *</label>
            <select className="form-input" value={form.time_slot} onChange={e => setForm({...form, time_slot: e.target.value})}>
              {SLOTS.map(s => <option key={s.key} value={s.key}>{s.icon} {s.label}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">租借人/活動 *</label>
            <input className="form-input" value={form.event_name} onChange={e => setForm({...form, event_name: e.target.value})} placeholder="如：筱筑/孔廟" />
          </div>
          <div className="form-group">
            <label className="form-label">目的地</label>
            <input className="form-input" value={form.destination} onChange={e => setForm({...form, destination: e.target.value})} placeholder="目的地" />
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
          <button className="btn btn-primary" onClick={book}>預約</button>
          <button className="btn btn-secondary" onClick={() => setShowAdd(false)}>取消</button>
        </div>
      </div>
    )}

    {/* 週曆導覽 */}
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <button className="btn btn-secondary btn-sm" onClick={prevWeek}>◀ 上週</button>
        <h2 style={{ fontSize: 16, fontWeight: 800 }}>
          {weekDates[0]} ~ {weekDates[6]}
        </h2>
        <button className="btn btn-secondary btn-sm" onClick={nextWeek}>下週 ▶</button>
      </div>

      {/* 表格 */}
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th style={{ width: 80 }}>日期</th>
              <th style={{ width: 40 }}>星期</th>
              {VEHICLES.map(v => (
                SLOTS.map(s => (
                  <th key={`${v.id}-${s.key}`} style={{ textAlign: 'center', fontSize: 11 }}>
                    <div>{v.label}</div>
                    <div style={{ color: 'var(--c-text-muted)', fontSize: 10 }}>{s.label}</div>
                  </th>
                ))
              ))}
            </tr>
          </thead>
          <tbody>
            {weekDates.map(date => {
              const dow = new Date(date).getDay();
              const isToday = date === today;
              const isWkEnd = dow === 0 || dow === 6;
              return (
                <tr key={date} style={{ background: isToday ? 'var(--c-primary-light)' : isWkEnd ? 'var(--c-bg)' : '' }}>
                  <td style={{ fontWeight: isToday ? 800 : 500, fontSize: 12, color: isToday ? 'var(--c-primary)' : '' }}>{date.slice(5)}</td>
                  <td style={{ textAlign: 'center', fontSize: 12 }}>{WEEKDAYS[dow]}</td>
                  {VEHICLES.map(v => (
                    SLOTS.map(s => {
                      const b = getBooking(v.id, date, s.key);
                      return (
                        <td key={`${v.id}-${s.key}`} style={{ textAlign: 'center', fontSize: 11, padding: '4px 6px' }}>
                          {b ? (
                            <div style={{ background: 'var(--c-primary)', color: 'white', borderRadius: 6, padding: '3px 6px', fontSize: 10, fontWeight: 600 }}>
                              {b.event_name}
                            </div>
                          ) : null}
                        </td>
                      );
                    })
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  </>);
}
