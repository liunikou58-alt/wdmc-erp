import { useState, useEffect } from 'react'
import { api } from '../../api'

const FIELD_ICONS = {
  text: '📝', textarea: '📄', number: '🔢', currency: '💰', date: '📅',
  select: '📋', multisel: '☑️', checkbox: '✅', file: '📎', image: '🖼️',
  signature: '✍️', formula: '🧮', link: '🔗', auto_num: '#️⃣', user: '👤',
  email: '📧', phone: '📞', rating: '⭐', divider: '➖', header: '📌',
};

export default function FormRenderer({ schema, record, onSave, onCancel, readOnly }) {
  const [data, setData] = useState(record?.data || {});
  const [stData, setStData] = useState(record?.subtable_data || {});
  const [linkResults, setLinkResults] = useState({});
  const [loading, setLoading] = useState(false);

  // 初始化預設值
  useEffect(() => {
    if (!record) {
      const defaults = {};
      (schema?.fields || []).forEach(f => {
        if (f.default_value) defaults[f.key] = f.default_value;
        if (f.type === 'checkbox') defaults[f.key] = defaults[f.key] || false;
      });
      setData(prev => ({ ...defaults, ...prev }));
    }
  }, [schema]);

  const setField = (key, value) => {
    const nd = { ...data, [key]: value };
    setData(nd);
    recalcFormulas(nd, stData);
  };

  const recalcFormulas = async (d, st) => {
    if (!schema?.id) return;
    try {
      const computed = await api.formBuilderCalculate({ schema_id: schema.id, data: d, subtable_data: st });
      if (Object.keys(computed).length) setData(prev => ({ ...prev, ...computed }));
    } catch {}
  };

  // 連結載入搜尋
  const searchLink = async (fieldKey, q) => {
    if (q.length < 1) { setLinkResults(prev => ({ ...prev, [fieldKey]: [] })); return; }
    try {
      const results = await api.formBuilderLinkLoad(schema.id, fieldKey, q);
      setLinkResults(prev => ({ ...prev, [fieldKey]: results }));
    } catch {}
  };

  const selectLink = (fieldKey, result) => {
    const nd = { ...data, [fieldKey]: result.display };
    Object.entries(result.load_data || {}).forEach(([k, v]) => { nd[k] = v; });
    setData(nd);
    setLinkResults(prev => ({ ...prev, [fieldKey]: [] }));
  };

  // 子表格操作
  const addStRow = (stKey) => {
    const st = schema.subtables?.find(s => s.key === stKey);
    const row = {};
    (st?.fields || []).forEach(f => { row[f.key] = f.default_value || ''; });
    const nst = { ...stData, [stKey]: [...(stData[stKey] || []), row] };
    setStData(nst);
  };

  const updateStRow = (stKey, rowIdx, fieldKey, value) => {
    const nst = { ...stData };
    nst[stKey] = [...(nst[stKey] || [])];
    nst[stKey][rowIdx] = { ...nst[stKey][rowIdx], [fieldKey]: value };
    setStData(nst);
    recalcFormulas(data, nst);
  };

  const removeStRow = (stKey, rowIdx) => {
    const nst = { ...stData, [stKey]: (stData[stKey] || []).filter((_, i) => i !== rowIdx) };
    setStData(nst);
    recalcFormulas(data, nst);
  };

  const save = async () => {
    setLoading(true);
    try {
      await onSave({ data, subtable_data: stData });
    } finally { setLoading(false); }
  };

  const cols = schema?.layout?.columns || 2;

  const renderField = (f) => {
    const val = data[f.key] ?? '';
    const disabled = readOnly || f.type === 'formula' || f.type === 'auto_num';

    switch (f.type) {
      case 'divider':
        return <div style={{ gridColumn: '1 / -1', borderTop: '2px solid var(--c-border)', margin: '8px 0' }} />;
      case 'header':
        return <div style={{ gridColumn: '1 / -1', fontSize: 16, fontWeight: 700, color: 'var(--c-text)', padding: '8px 0 4px' }}>{f.label}</div>;
      case 'textarea':
        return (<div className="form-group" style={{ gridColumn: '1 / -1' }}>
          <label className="form-label">{f.label}{f.required && <span style={{ color: 'var(--c-danger)' }}> *</span>}</label>
          <textarea className="form-input" rows={3} value={val} onChange={e => setField(f.key, e.target.value)} disabled={disabled} style={{ resize: 'vertical' }} />
        </div>);
      case 'select':
        return (<div className="form-group"><label className="form-label">{f.label}{f.required && <span style={{ color: 'var(--c-danger)' }}> *</span>}</label>
          <select className="form-select" value={val} onChange={e => setField(f.key, e.target.value)} disabled={disabled}>
            <option value="">- 選擇 -</option>
            {(f.options || []).map(o => <option key={o} value={o}>{o}</option>)}
          </select></div>);
      case 'multisel':
        return (<div className="form-group"><label className="form-label">{f.label}</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            {(f.options || []).map(o => {
              const sel = (Array.isArray(val) ? val : []).includes(o);
              return <span key={o} style={{ padding: '3px 10px', borderRadius: 6, fontSize: 12, cursor: disabled ? 'default' : 'pointer', border: '1px solid var(--c-border)', background: sel ? 'var(--c-primary)' : 'var(--c-bg)', color: sel ? '#fff' : 'var(--c-text)' }}
                onClick={() => { if (disabled) return; const arr = Array.isArray(val) ? val : []; setField(f.key, sel ? arr.filter(v => v !== o) : [...arr, o]); }}>{o}</span>;
            })}
          </div></div>);
      case 'checkbox':
        return (<div className="form-group"><label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: disabled ? 'default' : 'pointer', fontSize: 13 }}>
          <input type="checkbox" checked={!!val} onChange={e => setField(f.key, e.target.checked)} disabled={disabled} /> {f.label}
        </label></div>);
      case 'formula':
      case 'auto_num':
        return (<div className="form-group"><label className="form-label">{FIELD_ICONS[f.type]} {f.label}</label>
          <div style={{ padding: '8px 12px', background: 'var(--c-bg-elevated)', borderRadius: 8, fontWeight: 700, fontFamily: f.type === 'formula' ? 'monospace' : 'inherit', color: 'var(--c-primary)' }}>
            {f.type === 'currency' || f.type === 'formula' ? `$${Number(val || 0).toLocaleString()}` : val || '-'}
          </div></div>);
      case 'link':
        return (<div className="form-group" style={{ position: 'relative' }}>
          <label className="form-label">🔗 {f.label}</label>
          <input className="form-input" value={val} onChange={e => { setField(f.key, e.target.value); searchLink(f.key, e.target.value); }} disabled={disabled} placeholder="輸入搜尋..." />
          {(linkResults[f.key] || []).length > 0 && (
            <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 10, background: 'var(--c-bg)', border: '1px solid var(--c-border)', borderRadius: 8, maxHeight: 200, overflow: 'auto', boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}>
              {linkResults[f.key].map(r => (
                <div key={r.id} style={{ padding: '8px 12px', cursor: 'pointer', borderBottom: '1px solid var(--c-border)', fontSize: 13 }}
                  onClick={() => selectLink(f.key, r)}
                  onMouseOver={e => e.currentTarget.style.background = 'var(--c-primary-light)'}
                  onMouseOut={e => e.currentTarget.style.background = 'transparent'}>
                  <strong>{r.display}</strong>
                  {Object.entries(r.load_data || {}).length > 0 && <span style={{ fontSize: 11, color: 'var(--c-text-muted)', marginLeft: 8 }}>
                    {Object.values(r.load_data).filter(Boolean).join(' · ')}
                  </span>}
                </div>
              ))}
            </div>
          )}
        </div>);
      case 'rating':
        return (<div className="form-group"><label className="form-label">{f.label}</label>
          <div style={{ display: 'flex', gap: 4 }}>
            {[1,2,3,4,5].map(n => <span key={n} style={{ cursor: disabled ? 'default' : 'pointer', fontSize: 20 }} onClick={() => !disabled && setField(f.key, n)}>{n <= (val || 0) ? '⭐' : '☆'}</span>)}
          </div></div>);
      case 'currency':
        return (<div className="form-group"><label className="form-label">{f.label}{f.required && <span style={{ color: 'var(--c-danger)' }}> *</span>}</label>
          <div style={{ position: 'relative' }}>
            <span style={{ position: 'absolute', left: 10, top: 8, color: 'var(--c-text-muted)' }}>$</span>
            <input className="form-input" type="number" style={{ paddingLeft: 24 }} value={val} onChange={e => setField(f.key, Number(e.target.value))} disabled={disabled} />
          </div></div>);
      default:
        return (<div className="form-group"><label className="form-label">{f.label}{f.required && <span style={{ color: 'var(--c-danger)' }}> *</span>}</label>
          <input className="form-input" type={f.type === 'number' ? 'number' : f.type === 'date' ? 'date' : f.type === 'email' ? 'email' : 'text'}
            value={val} onChange={e => setField(f.key, f.type === 'number' ? Number(e.target.value) : e.target.value)} disabled={disabled} />
        </div>);
    }
  };

  return (<>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
      <h2 style={{ fontSize: 18, fontWeight: 700 }}>{schema?.icon} {schema?.name} {record ? `— ${record.record_no || ''}` : '— 新增'}</h2>
      <div style={{ display: 'flex', gap: 8 }}>
        {!readOnly && <button className="btn btn-primary" onClick={save} disabled={loading}>{loading ? '⏳...' : '💾 儲存'}</button>}
        {record && <button className="btn btn-secondary" onClick={() => window.open(`/api/form-builder/print/${schema.id}/${record.id}`, '_blank')}>🖨️ 列印</button>}
        <button className="btn btn-secondary" onClick={onCancel}>← 返回</button>
      </div>
    </div>

    <div className="card" style={{ padding: 20 }}>
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: 12 }}>
        {(schema?.fields || []).map(f => (
          <div key={f.key} style={{ gridColumn: ['divider', 'header', 'textarea'].includes(f.type) ? '1 / -1' : `span ${Math.min(f.width || 1, cols)}` }}>
            {renderField(f)}
          </div>
        ))}
      </div>

      {/* 子表格 */}
      {(schema?.subtables || []).map(st => (
        <div key={st.key} style={{ marginTop: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <h3 style={{ fontSize: 14, fontWeight: 700 }}>📊 {st.label}</h3>
            {!readOnly && <button className="btn btn-secondary" style={{ fontSize: 12 }} onClick={() => addStRow(st.key)}>+ 新增行</button>}
          </div>
          <div className="table-wrap"><table>
            <thead><tr><th>#</th>{(st.fields || []).map(f => <th key={f.key}>{f.label}</th>)}{!readOnly && <th>操作</th>}</tr></thead>
            <tbody>
              {(stData[st.key] || []).map((row, ri) => (
                <tr key={ri}>
                  <td style={{ fontSize: 11 }}>{ri + 1}</td>
                  {(st.fields || []).map(f => (
                    <td key={f.key}>
                      {f.type === 'formula' ? <span style={{ fontFamily: 'monospace', color: 'var(--c-primary)' }}>{row[f.key] ?? '-'}</span> :
                        <input className="form-input" type={f.type === 'number' || f.type === 'currency' ? 'number' : 'text'} style={{ fontSize: 12, padding: '4px 8px' }}
                          value={row[f.key] ?? ''} onChange={e => updateStRow(st.key, ri, f.key, f.type === 'number' || f.type === 'currency' ? Number(e.target.value) : e.target.value)} disabled={readOnly} />}
                    </td>
                  ))}
                  {!readOnly && <td><button style={{ cursor: 'pointer', border: 'none', background: 'transparent', color: 'var(--c-danger)' }} onClick={() => removeStRow(st.key, ri)}>🗑️</button></td>}
                </tr>
              ))}
              {(stData[st.key] || []).length === 0 && <tr><td colSpan={99} style={{ textAlign: 'center', color: 'var(--c-text-muted)', padding: 16 }}>尚無資料</td></tr>}
            </tbody>
          </table></div>
        </div>
      ))}
    </div>
  </>);
}
