import { useState, useEffect } from 'react'
import { useLang } from '../LangContext'
import { api } from '../api'

const TYPES = { performer: '🎹 表演', artist: '🎸 藝人', vendor: '🎤 資源廠商', market: '🍽️ 攤販' };

export default function Resources() {
  const { t } = useLang();
  const [type, setType] = useState('');
  const [items, setItems] = useState([]);
  const [stats, setStats] = useState({});
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ type: 'performer', name: '', contact_person: '', phone: '', email: '', fee_range: '', notes: '' });

  const load = () => {
    api.getResources(type).then(setItems).catch(() => {});
    api.getResourceStats().then(setStats).catch(() => {});
  };

  useEffect(load, [type]);

  const create = async () => {
    await api.createResource(form);
    setShowAdd(false); setForm({ type: 'performer', name: '', contact_person: '', phone: '', email: '', fee_range: '', notes: '' });
    load();
  };

  return (<>
    <div className="page-header"><div><h1 className="page-title">{t('page.resources')}</h1><p className="page-subtitle">表演者 · 藝人 · 資源廠商 · 攤販</p></div></div>

    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 14, marginBottom: 24 }}>
      <div className="stat-card"><div className="stat-icon" style={{ background: 'var(--c-primary-light)' }}>📋</div><div><div className="stat-value">{stats.total || 0}</div><div className="stat-label">總數</div></div></div>
      {Object.entries(TYPES).map(([k, v]) => (
        <div key={k} className="stat-card" style={{ cursor: 'pointer', border: type === k ? '2px solid var(--c-primary)' : '' }} onClick={() => setType(type === k ? '' : k)}>
          <div className="stat-icon" style={{ background: 'var(--c-info-light)' }}>{v.slice(0, 2)}</div>
          <div><div className="stat-value">{stats[k + 's'] || stats[k] || 0}</div><div className="stat-label">{v.slice(2)}</div></div>
        </div>
      ))}
    </div>

    <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
      <button className="btn btn-primary" onClick={() => setShowAdd(true)}>{t('resources.add')}</button>
    </div>

    {showAdd && (
      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
          <div className="form-group"><label className="form-label">類型</label><select className="form-select" value={form.type} onChange={e => setForm({...form,type:e.target.value})}>{Object.entries(TYPES).map(([k,v]) => <option key={k} value={k}>{v}</option>)}</select></div>
          <div className="form-group"><label className="form-label">名稱 *</label><input className="form-input" value={form.name} onChange={e => setForm({...form,name:e.target.value})} /></div>
          <div className="form-group"><label className="form-label">聯絡人</label><input className="form-input" value={form.contact_person} onChange={e => setForm({...form,contact_person:e.target.value})} /></div>
          <div className="form-group"><label className="form-label">電話</label><input className="form-input" value={form.phone} onChange={e => setForm({...form,phone:e.target.value})} /></div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
          <div className="form-group"><label className="form-label">Email</label><input className="form-input" value={form.email} onChange={e => setForm({...form,email:e.target.value})} /></div>
          <div className="form-group"><label className="form-label">費用範圍</label><input className="form-input" value={form.fee_range} onChange={e => setForm({...form,fee_range:e.target.value})} placeholder="如 30000-80000" /></div>
          <div className="form-group"><label className="form-label">備註</label><input className="form-input" value={form.notes} onChange={e => setForm({...form,notes:e.target.value})} /></div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}><button className="btn btn-primary" onClick={create}>{t('common.create2')}</button><button className="btn btn-secondary" onClick={() => setShowAdd(false)}>{t('common.cancel')}</button></div>
      </div>
    )}

    <div className="table-wrap"><table>
      <thead><tr><th>類型</th><th>名稱</th><th>聯絡人</th><th>{t('cust.phone')}</th><th>費用</th><th>評分</th><th>{t('payments.notes')}</th></tr></thead>
      <tbody>{items.map(r => (
        <tr key={r.id}>
          <td><span className="badge badge-info">{TYPES[r.type] || r.type}</span></td>
          <td style={{ fontWeight: 600 }}>{r.name}</td>
          <td>{r.contact_person || r.agency || '-'}</td>
          <td style={{ fontSize: 12 }}>{r.phone || '-'}</td>
          <td style={{ fontSize: 12 }}>{r.fee_range || (r.fee ? `$${r.fee.toLocaleString()}` : r.base_price || '-')}</td>
          <td>{r.rating ? '⭐'.repeat(Math.min(r.rating, 5)) : '-'}</td>
          <td style={{ fontSize: 12, maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.notes || '-'}</td>
        </tr>
      ))}</tbody>
    </table></div>
  </>);
}
