import { useState, useEffect } from 'react'
import { api } from '../api'

const CATS = ['音響設備', '燈光設備', '視訊設備', 'LED 設備', '舞台結構', '電力設備', '其他'];

export default function Assets() {
  const [assets, setAssets] = useState([]);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: '', category: '', serial_number: '', location: '', quantity: 1 });

  useEffect(() => { api.getAssets().then(setAssets).catch(() => {}); }, []);

  const add = async () => {
    if (!form.name.trim()) return;
    await api.createAsset({ ...form, quantity: Number(form.quantity) || 1 });
    api.getAssets().then(setAssets);
    setShowAdd(false); setForm({ name: '', category: '', serial_number: '', location: '', quantity: 1 });
  };

  const set = f => e => setForm({ ...form, [f]: e.target.value });
  const available = assets.filter(a => a.is_available).length;
  const borrowed = assets.filter(a => !a.is_available).length;

  return (
    <>
      <div className="page-header">
        <div><h1 className="page-title">📦 資產設備管理</h1><p className="page-subtitle">設備總覽、借用與歸還管理</p></div>
        <button className="btn btn-primary" onClick={() => setShowAdd(true)}>➕ 新增設備</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 24 }}>
        <div className="stat-card"><div className="stat-icon" style={{ background: 'var(--c-primary-light)' }}>📦</div><div><div className="stat-value">{assets.length}</div><div className="stat-label">總設備數</div></div></div>
        <div className="stat-card"><div className="stat-icon" style={{ background: 'var(--c-success-light)' }}>✅</div><div><div className="stat-value">{available}</div><div className="stat-label">可用</div></div></div>
        <div className="stat-card"><div className="stat-icon" style={{ background: 'var(--c-warning-light)' }}>🔄</div><div><div className="stat-value">{borrowed}</div><div className="stat-label">借出中</div></div></div>
      </div>

      {showAdd && (
        <div className="card" style={{ marginBottom: 16 }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 12 }}>新增設備</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12 }}>
            <div className="form-group"><label className="form-label">設備名稱 *</label><input className="form-input" value={form.name} onChange={set('name')} /></div>
            <div className="form-group"><label className="form-label">類別</label><select className="form-select" value={form.category} onChange={set('category')}><option value="">-</option>{CATS.map(c => <option key={c} value={c}>{c}</option>)}</select></div>
            <div className="form-group"><label className="form-label">序號</label><input className="form-input" value={form.serial_number} onChange={set('serial_number')} /></div>
            <div className="form-group"><label className="form-label">存放位置</label><input className="form-input" value={form.location} onChange={set('location')} /></div>
            <div className="form-group"><label className="form-label">數量</label><input className="form-input" type="number" value={form.quantity} onChange={set('quantity')} /></div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}><button className="btn btn-primary" onClick={add}>建立</button><button className="btn btn-secondary" onClick={() => setShowAdd(false)}>取消</button></div>
        </div>
      )}

      {assets.length === 0 ? (
        <div className="empty-state"><div className="empty-state-icon">📦</div><div className="empty-state-title">尚無設備</div></div>
      ) : (
        <div className="table-wrap"><table>
          <thead><tr><th>設備名稱</th><th>類別</th><th>序號</th><th>位置</th><th>數量</th><th>狀態</th></tr></thead>
          <tbody>{assets.map(a => (
            <tr key={a.id}>
              <td style={{ fontWeight: 600 }}>{a.name}</td>
              <td style={{ fontSize: 12 }}>{a.category || '-'}</td>
              <td style={{ fontSize: 11, fontFamily: 'monospace', color: 'var(--c-text-muted)' }}>{a.serial_number || '-'}</td>
              <td style={{ fontSize: 12 }}>{a.location || '-'}</td>
              <td>{a.quantity}</td>
              <td>{a.is_available ? <span className="badge badge-success">可用</span> : <span className="badge badge-warning">借出中</span>}</td>
            </tr>
          ))}</tbody>
        </table></div>
      )}
    </>
  );
}
