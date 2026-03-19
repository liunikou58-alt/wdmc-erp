import { useState, useEffect } from 'react'
import { api } from '../api'

const CATEGORIES = [
  { key: '', label: '全部' },
  { key: 'case_study', label: '📁 成功案例' },
  { key: 'failure', label: '⚠️ 失敗案例' },
  { key: 'sop', label: '📋 SOP' },
  { key: 'template', label: '📄 範本' },
  { key: 'general', label: '📚 一般' },
];

export default function Knowledge() {
  const [items, setItems] = useState([]);
  const [filter, setFilter] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState({ title: '', category: 'general', content: '', tags: '' });

  useEffect(() => {
    const url = filter ? `/knowledge?category=${filter}` : '/knowledge';
    api._request(url).then(setItems).catch(() => setItems([]));
  }, [filter]);

  const add = async () => {
    if (!form.title.trim()) return;
    await api.createKnowledge({ ...form, tags: form.tags ? form.tags.split(',').map(t => t.trim()) : [] });
    setShowAdd(false); setForm({ title: '', category: 'general', content: '', tags: '' });
    api._request('/knowledge').then(setItems);
  };

  const del = async (id) => {
    await api.deleteKnowledge(id);
    api._request('/knowledge').then(setItems);
    if (selected?.id === id) setSelected(null);
  };

  const set = f => e => setForm({ ...form, [f]: e.target.value });

  return (
    <>
      <div className="page-header">
        <div><h1 className="page-title">📚 知識庫</h1><p className="page-subtitle">案例庫、SOP、範本與經驗紀錄</p></div>
        <button className="btn btn-primary" onClick={() => setShowAdd(true)}>➕ 新增文件</button>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {CATEGORIES.map(c => (
          <button key={c.key} className={`btn btn-sm ${filter === c.key ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setFilter(c.key)}>{c.label}</button>
        ))}
      </div>

      {showAdd && (
        <div className="card" style={{ marginBottom: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 12 }}>
            <div className="form-group"><label className="form-label">標題 *</label><input className="form-input" value={form.title} onChange={set('title')} /></div>
            <div className="form-group"><label className="form-label">分類</label><select className="form-select" value={form.category} onChange={set('category')}>{CATEGORIES.filter(c => c.key).map(c => <option key={c.key} value={c.key}>{c.label}</option>)}</select></div>
            <div className="form-group"><label className="form-label">標籤（逗號分隔）</label><input className="form-input" value={form.tags} onChange={set('tags')} placeholder="燈光, LED, 演唱會" /></div>
          </div>
          <div className="form-group"><label className="form-label">內容</label><textarea className="form-textarea" value={form.content} onChange={set('content')} rows={5} /></div>
          <div style={{ display: 'flex', gap: 8 }}><button className="btn btn-primary" onClick={add}>建立</button><button className="btn btn-secondary" onClick={() => setShowAdd(false)}>取消</button></div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: selected ? '1fr 1.5fr' : '1fr', gap: 20 }}>
        <div>
          {items.length === 0 ? (
            <div className="empty-state"><div className="empty-state-icon">📚</div><div className="empty-state-title">尚無文件</div></div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {items.map(k => (
                <div key={k.id} className="card" style={{ padding: '12px 16px', cursor: 'pointer', borderColor: selected?.id === k.id ? 'var(--c-primary)' : 'var(--c-border)' }}
                  onClick={() => setSelected(k)}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>{k.title}</div>
                      <div style={{ fontSize: 11, color: 'var(--c-text-muted)', marginTop: 2 }}>
                        {CATEGORIES.find(c => c.key === k.category)?.label || k.category} · {k.creator_name} · {new Date(k.created_at).toLocaleDateString('zh-TW')}
                      </div>
                    </div>
                    <button className="btn btn-danger btn-sm" onClick={e => { e.stopPropagation(); del(k.id); }}>🗑️</button>
                  </div>
                  {k.tags?.length > 0 && (
                    <div style={{ display: 'flex', gap: 4, marginTop: 6 }}>
                      {k.tags.map(t => <span key={t} className="badge badge-primary" style={{ fontSize: 10 }}>{t}</span>)}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {selected && (
          <div className="card" style={{ position: 'sticky', top: 28 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
              <div>
                <h2 style={{ fontSize: 18, fontWeight: 700 }}>{selected.title}</h2>
                <div style={{ fontSize: 12, color: 'var(--c-text-muted)' }}>
                  {CATEGORIES.find(c => c.key === selected.category)?.label} · {selected.creator_name} · {new Date(selected.created_at).toLocaleDateString('zh-TW')}
                </div>
              </div>
              <button className="btn btn-secondary btn-sm" onClick={() => setSelected(null)}>✕ 關閉</button>
            </div>
            <div style={{ fontSize: 14, lineHeight: 1.8, whiteSpace: 'pre-wrap' }}>{selected.content || '（無內容）'}</div>
          </div>
        )}
      </div>
    </>
  );
}
