import { useState, useEffect } from 'react'
import { useLang } from '../LangContext'
import { useParams, NavLink, useNavigate } from 'react-router-dom'
import { api } from '../api'

const CATS = [
  { key: 'all', icon: '📦', label: '全部設備', color: 'var(--c-primary)' },
  { key: 'audio', icon: '🔊', label: '音響設備', filter: '音響設備', color: '#8b5cf6' },
  { key: 'lighting', icon: '💡', label: '燈光設備', filter: '燈光設備', color: 'var(--c-warning)' },
  { key: 'video', icon: '📺', label: '視訊設備', filter: '視訊設備', color: '#06b6d4' },
  { key: 'led', icon: '🎆', label: 'LED 設備', filter: 'LED 設備', color: '#ec4899' },
  { key: 'stage', icon: '🏗️', label: '舞台結構', filter: '舞台結構', color: 'var(--c-success)' },
  { key: 'power', icon: '⚡', label: '電力設備', filter: '電力設備', color: 'var(--c-danger)' },
  { key: 'other', icon: '📦', label: '其他設備', filter: '其他', color: '#64748b' },
];

export default function Assets() {
  const { t } = useLang();
  const { category } = useParams();
  const navigate = useNavigate();
  const [assets, setAssets] = useState([]);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: '', category: '', serial_number: '', location: '', quantity: 1 });

  useEffect(() => { api.getAssets().then(setAssets).catch(() => {}); }, []);

  const add = async () => {
    if (!form.name.trim()) return;
    await api.createAsset({ ...form, quantity: Number(form.quantity) || 1 });
    api.getAssets().then(setAssets);
    setShowAdd(false);
    setForm({ name: '', category: '', serial_number: '', location: '', quantity: 1 });
  };

  const set = f => e => setForm({ ...form, [f]: e.target.value });
  const activeCat = CATS.find(c => c.key === (category || 'all')) || CATS[0];
  const filtered = !category || category === 'all' ? assets : assets.filter(a => a.category === activeCat.filter);
  const available = filtered.filter(a => a.is_available !== false).length;
  const borrowed = filtered.length - available;

  // If no category param, show overview with category cards
  if (!category) {
    return (<>
      <div className="page-header">
        <div>
          <h1 className="page-title">{t('page.assets')}</h1>
          <p className="page-subtitle">依分類管理所有活動設備 — 音響·燈光·視訊·LED·舞台·電力</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowAdd(true)}>{t('assets.add')}</button>
      </div>

      {/* KPI Summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 24 }}>
        <div className="stat-card"><div className="stat-icon">📦</div><div><div className="stat-value">{assets.length}</div><div className="stat-label">總設備數</div></div></div>
        <div className="stat-card"><div className="stat-icon" style={{ background: 'var(--c-success-light)' }}>✅</div><div><div className="stat-value" style={{ color: 'var(--c-success)' }}>{assets.filter(a => a.is_available !== false).length}</div><div className="stat-label">{t('assets.available')}</div></div></div>
        <div className="stat-card"><div className="stat-icon" style={{ background: 'var(--c-warning-light)' }}>🔄</div><div><div className="stat-value" style={{ color: 'var(--c-warning)' }}>{assets.filter(a => a.is_available === false).length}</div><div className="stat-label">借出中</div></div></div>
      </div>

      {/* Category Cards */}
      <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 12 }}>📂 設備分類</h3>
      <div className="category-grid">
        {CATS.filter(c => c.key !== 'all').map(cat => {
          const count = assets.filter(a => a.category === cat.filter).length;
          const avail = assets.filter(a => a.category === cat.filter && a.is_available !== false).length;
          return (
            <div key={cat.key} className="category-card" onClick={() => navigate(`/assets/${cat.key}`)}
              style={{ animation: 'fadeUp 0.4s ease both' }}>
              <div className="category-card-icon">{cat.icon}</div>
              <div className="category-card-title">{cat.label}</div>
              <div className="category-card-count" style={{ color: cat.color }}>{count}</div>
              <div className="category-card-label">{avail} 可用 · {count - avail} 借出</div>
            </div>
          );
        })}
      </div>

      {/* Full asset table */}
      <div className="card" style={{ marginTop: 20 }}>
        <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 12 }}>📋 全部設備清單</h3>
        {assets.length === 0 ? (
          <div className="empty-state"><div className="empty-state-icon">📦</div><div className="empty-state-title">{t('assets.empty')}</div></div>
        ) : (
          <div className="table-wrap"><table>
            <thead><tr><th>設備名稱</th><th>類別</th><th>序號</th><th>位置</th><th>{t('assets.quantity')}</th><th>狀態</th></tr></thead>
            <tbody>{assets.map(a => (
              <tr key={a.id}>
                <td style={{ fontWeight: 600 }}>{a.name}</td>
                <td><span className="capsule" style={{ fontSize: 10 }}>{a.category || '-'}</span></td>
                <td style={{ fontSize: 11, fontFamily: 'monospace', color: 'var(--c-text-muted)' }}>{a.serial_number || '-'}</td>
                <td style={{ fontSize: 12 }}>{a.location || '-'}</td>
                <td>{a.quantity}</td>
                <td>{a.is_available !== false ? <span className="badge badge-success">{t('assets.available')}</span> : <span className="badge badge-warning">借出中</span>}</td>
              </tr>
            ))}</tbody>
          </table></div>
        )}
      </div>

      {showAdd && <AddModal form={form} setForm={setForm} set={set} add={add} close={() => setShowAdd(false)} />}
    </>);
  }

  // Category sub-page
  return (<>
    <div className="page-header">
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <NavLink to="/assets" style={{ color: 'var(--c-text-muted)', textDecoration: 'none', fontSize: 12 }}>{t('page.assets')}</NavLink>
          <span style={{ color: 'var(--c-text-muted)', fontSize: 10 }}>▸</span>
          <span style={{ fontSize: 12, fontWeight: 600 }}>{activeCat.icon} {activeCat.label}</span>
        </div>
        <h1 className="page-title" style={{ color: activeCat.color }}>{activeCat.icon} {activeCat.label}</h1>
        <p className="page-subtitle">{filtered.length} 項設備 · {available} 可用 · {borrowed} 借出中</p>
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <NavLink to="/assets" className="btn btn-secondary">← 返回總覽</NavLink>
        <button className="btn btn-primary" onClick={() => { setForm({ ...form, category: activeCat.filter }); setShowAdd(true); }}>➕ 新增</button>
      </div>
    </div>

    {/* Quick stats */}
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 20 }}>
      <div className="stat-card"><div className="stat-icon" style={{ background: `color-mix(in srgb, ${activeCat.color} 15%, transparent)` }}>{activeCat.icon}</div><div><div className="stat-value" style={{ color: activeCat.color }}>{filtered.length}</div><div className="stat-label">{t('assets.totalAssets')}</div></div></div>
      <div className="stat-card"><div className="stat-icon" style={{ background: 'var(--c-success-light)' }}>✅</div><div><div className="stat-value" style={{ color: 'var(--c-success)' }}>{available}</div><div className="stat-label">可用</div></div></div>
      <div className="stat-card"><div className="stat-icon" style={{ background: 'var(--c-warning-light)' }}>🔄</div><div><div className="stat-value" style={{ color: 'var(--c-warning)' }}>{borrowed}</div><div className="stat-label">借出中</div></div></div>
    </div>

    {/* Filtered list */}
    {filtered.length === 0 ? (
      <div className="empty-state"><div className="empty-state-icon">{activeCat.icon}</div><div className="empty-state-title">此分類尚無設備</div><p style={{ color: 'var(--c-text-muted)' }}>點擊「新增」加入第一筆設備</p></div>
    ) : (
      <div className="card-grid">
        {filtered.map(a => (
          <div key={a.id} className="card" style={{ padding: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 14 }}>{a.name}</div>
                <div style={{ fontSize: 11, color: 'var(--c-text-muted)', fontFamily: 'monospace' }}>{a.serial_number || '無序號'}</div>
              </div>
              {a.is_available !== false
                ? <span className="badge badge-success">✅ 可用</span>
                : <span className="badge badge-warning">🔄 借出中</span>}
            </div>
            <div style={{ display: 'flex', gap: 16, fontSize: 12, color: 'var(--c-text-secondary)' }}>
              <span>📍 {a.location || '-'}</span>
              <span>📦 數量 {a.quantity}</span>
            </div>
          </div>
        ))}
      </div>
    )}

    {showAdd && <AddModal form={form} setForm={setForm} set={set} add={add} close={() => setShowAdd(false)} />}
  </>);
}

function AddModal({ form, setForm, set, add, close }) {
  const CATS_LIST = ['音響設備','燈光設備','視訊設備','LED 設備','舞台結構','電力設備','其他'];
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.4)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="card" style={{ width: 480, padding: 24, animation: 'fadeUp 0.3s ease' }}>
        <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>{t('assets.add')}</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div className="form-group" style={{ gridColumn: '1/-1' }}><label className="form-label">{t('assets.name')}</label><input className="form-input" value={form.name} onChange={set('name')} /></div>
          <div className="form-group"><label className="form-label">類別</label><select className="form-select" value={form.category} onChange={set('category')}><option value="">選擇分類</option>{CATS_LIST.map(c => <option key={c} value={c}>{c}</option>)}</select></div>
          <div className="form-group"><label className="form-label">序號</label><input className="form-input" value={form.serial_number} onChange={set('serial_number')} /></div>
          <div className="form-group"><label className="form-label">存放位置</label><input className="form-input" value={form.location} onChange={set('location')} /></div>
          <div className="form-group"><label className="form-label">{t('assets.quantity')}</label><input className="form-input" type="number" value={form.quantity} onChange={set('quantity')} /></div>
        </div>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 16 }}>
          <button className="btn btn-secondary" onClick={close}>取消</button>
          <button className="btn btn-primary" onClick={add}>建立</button>
        </div>
      </div>
    </div>
  );
}
