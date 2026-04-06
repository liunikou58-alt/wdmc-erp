import { useState, useEffect } from 'react'
import { useLang } from '../LangContext'
import { api } from '../api'

const TYPES = { execution: '🎯 現場執行', load_in: '🚛 進場', load_out: '📦 退場', safety: '🦺 安全', other: '📋 其他' };

export default function Checklists() {
  const { t } = useLang();
  const [lists, setLists] = useState([]);
  const [projects, setProjects] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [selected, setSelected] = useState(null);
  const [detail, setDetail] = useState(null);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ title: '', project_id: '', type: 'execution', template: '' });
  const [newItem, setNewItem] = useState('');

  const load = () => api.getChecklists().then(setLists);

  useEffect(() => {
    load();
    api.getProjects().then(setProjects).catch(() => {});
    api.getChecklistTemplates().then(setTemplates).catch(() => {});
  }, []);

  const loadDetail = async (id) => {
    setSelected(id);
    const d = await api.getChecklist(id);
    setDetail(d);
  };

  const add = async () => {
    if (!form.title.trim()) return;
    const tpl = templates.find(t => t.id === form.template);
    await api.createChecklist({ ...form, items: tpl ? tpl.items.map(title => ({ title })) : [] });
    load(); setShowAdd(false); setForm({ title: '', project_id: '', type: 'execution', template: '' });
  };

  const toggle = async (itemId) => {
    await api.toggleChecklistItem(itemId);
    loadDetail(selected);
    load();
  };

  const addItem = async () => {
    if (!newItem.trim() || !selected) return;
    await api.addChecklistItem(selected, { title: newItem });
    setNewItem('');
    loadDetail(selected);
    load();
  };

  const del = async (id) => {
    await api.deleteChecklist(id);
    if (selected === id) { setSelected(null); setDetail(null); }
    load();
  };

  const set = f => e => setForm({ ...form, [f]: e.target.value });

  return (
    <>
      <div className="page-header">
        <div><h1 className="page-title">{t('page.checklists')}</h1><p className="page-subtitle">進退場 SOP、安全檢查、打勾確認</p></div>
        <button className="btn btn-primary" onClick={() => setShowAdd(true)}>{t('checklists.add')}</button>
      </div>

      {showAdd && (
        <div className="card" style={{ marginBottom: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: 12 }}>
            <div className="form-group"><label className="form-label">{t('checklists.listName')}</label><input className="form-input" value={form.title} onChange={set('title')} /></div>
            <div className="form-group"><label className="form-label">專案</label><select className="form-select" value={form.project_id} onChange={set('project_id')}><option value="">-</option>{projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
            <div className="form-group"><label className="form-label">類型</label><select className="form-select" value={form.type} onChange={set('type')}>{Object.entries(TYPES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></div>
            <div className="form-group"><label className="form-label">範本</label><select className="form-select" value={form.template} onChange={set('template')}><option value="">空白</option>{templates.map(t => <option key={t.id} value={t.id}>{t.name} ({t.items.length}項)</option>)}</select></div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}><button className="btn btn-primary" onClick={add}>{t('common.create2')}</button><button className="btn btn-secondary" onClick={() => setShowAdd(false)}>{t('common.cancel')}</button></div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: detail ? '1fr 1.5fr' : '1fr', gap: 20 }}>
        {/* 清單列表 */}
        <div>
          {lists.length === 0 ? (
            <div className="empty-state"><div className="empty-state-icon">✅</div><div className="empty-state-title">尚無清單</div></div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {lists.map(c => (
                <div key={c.id} className="card" style={{ padding: '12px 16px', cursor: 'pointer', borderColor: selected === c.id ? 'var(--c-primary)' : 'var(--c-border)' }}
                  onClick={() => loadDetail(c.id)}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>{TYPES[c.type] || '📋'} {c.title}</div>
                      <div style={{ fontSize: 11, color: 'var(--c-text-muted)' }}>{c.project_name || '無專案'} · {c.done_count}/{c.item_count} 完成</div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 50, height: 6, background: 'var(--c-border)', borderRadius: 3 }}>
                        <div style={{ height: '100%', width: `${c.progress}%`, background: c.progress === 100 ? 'var(--c-success)' : 'var(--c-primary)', borderRadius: 3 }} />
                      </div>
                      <span style={{ fontSize: 11, fontWeight: 700, color: c.progress === 100 ? 'var(--c-success)' : 'var(--c-primary)' }}>{c.progress}%</span>
                      <button className="btn btn-danger btn-sm" onClick={e => { e.stopPropagation(); del(c.id); }} style={{ padding: '2px 6px' }}>🗑️</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 詳情 — 打勾清單 */}
        {detail && (
          <div className="card" style={{ position: 'sticky', top: 28 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
              <div>
                <h2 style={{ fontSize: 18, fontWeight: 700 }}>{detail.title}</h2>
                <div style={{ fontSize: 12, color: 'var(--c-text-muted)' }}>
                  {detail.items?.length || 0} 個項目 · {detail.items?.filter(i => i.checked).length || 0} 已完成
                </div>
              </div>
              <button className="btn btn-secondary btn-sm" onClick={() => { setSelected(null); setDetail(null); }}>✕</button>
            </div>

            {/* 進度條 */}
            <div style={{ height: 8, background: 'var(--c-border)', borderRadius: 4, marginBottom: 16, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${detail.items?.length ? Math.round((detail.items.filter(i => i.checked).length / detail.items.length) * 100) : 0}%`, background: 'var(--c-success)', borderRadius: 4, transition: 'width 0.3s' }} />
            </div>

            {/* 項目列表 */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 16 }}>
              {(detail.items || []).map(item => (
                <div key={item.id} onClick={() => toggle(item.id)}
                  style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', border: '1px solid var(--c-border)', borderRadius: 8, cursor: 'pointer', background: item.checked ? 'var(--c-success-light)' : 'white', transition: 'all 0.15s' }}>
                  <span style={{ fontSize: 18 }}>{item.checked ? '☑️' : '⬜'}</span>
                  <div style={{ flex: 1 }}>
                    <span style={{ fontSize: 13, fontWeight: 500, textDecoration: item.checked ? 'line-through' : 'none', color: item.checked ? 'var(--c-text-muted)' : 'inherit' }}>{item.title}</span>
                    {item.checked && item.checked_by_name && (
                      <span style={{ fontSize: 10, color: 'var(--c-success)', marginLeft: 8 }}>✓ {item.checked_by_name} · {new Date(item.checked_at).toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' })}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* 新增項目 */}
            <div style={{ display: 'flex', gap: 8 }}>
              <input className="form-input" value={newItem} onChange={e => setNewItem(e.target.value)} placeholder="新增項目..." onKeyDown={e => e.key === 'Enter' && addItem()} style={{ flex: 1 }} />
              <button className="btn btn-primary btn-sm" onClick={addItem}>➕</button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
