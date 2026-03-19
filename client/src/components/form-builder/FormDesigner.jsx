import { useState, useRef } from 'react'

const FIELD_TYPES = {
  text:      { label: '單行文字',  icon: '📝' },
  textarea:  { label: '多行文字',  icon: '📄' },
  number:    { label: '數字',     icon: '🔢' },
  currency:  { label: '金額',     icon: '💰' },
  date:      { label: '日期',     icon: '📅' },
  select:    { label: '下拉選項',  icon: '📋' },
  multisel:  { label: '多選',     icon: '☑️' },
  checkbox:  { label: '勾選',     icon: '✅' },
  file:      { label: '檔案上傳',  icon: '📎' },
  image:     { label: '圖片',     icon: '🖼️' },
  signature: { label: '手寫簽名',  icon: '✍️' },
  formula:   { label: '公式計算',  icon: '🧮' },
  link:      { label: '連結載入',  icon: '🔗' },
  auto_num:  { label: '自動編號',  icon: '#️⃣' },
  user:      { label: '系統用戶',  icon: '👤' },
  email:     { label: 'Email',   icon: '📧' },
  phone:     { label: '電話',     icon: '📞' },
  rating:    { label: '評分',     icon: '⭐' },
  divider:   { label: '分隔線',   icon: '➖' },
  header:    { label: '段落標題',  icon: '📌' },
};

export default function FormDesigner({ schema, onSave, onCancel, allSchemas }) {
  const [name, setName] = useState(schema?.name || '新表單');
  const [icon, setIcon] = useState(schema?.icon || '📋');
  const [fields, setFields] = useState(schema?.fields || []);
  const [subtables, setSubtables] = useState(schema?.subtables || []);
  const [autoNumber, setAutoNumber] = useState(schema?.auto_number || null);
  const [layout, setLayout] = useState(schema?.layout || { columns: 2 });
  const [editingField, setEditingField] = useState(null);
  const [editingSt, setEditingSt] = useState(null);
  const dragIdx = useRef(null);

  const addField = (type) => {
    const key = `f_${Date.now()}`;
    const newField = {
      key, type, label: FIELD_TYPES[type]?.label || type,
      required: false, width: 1, default_value: '',
      ...(type === 'select' || type === 'multisel' || type === 'radio' ? { options: ['選項1', '選項2'] } : {}),
      ...(type === 'formula' ? { formula: '' } : {}),
      ...(type === 'link' ? { link_schema_id: '', link_display_field: '', link_load_fields: [] } : {}),
    };
    setFields([...fields, newField]);
    setEditingField(fields.length);
  };

  const updateField = (idx, updates) => {
    const nf = [...fields];
    nf[idx] = { ...nf[idx], ...updates };
    setFields(nf);
  };

  const removeField = (idx) => {
    setFields(fields.filter((_, i) => i !== idx));
    setEditingField(null);
  };

  const moveField = (from, to) => {
    const nf = [...fields];
    const [moved] = nf.splice(from, 1);
    nf.splice(to, 0, moved);
    setFields(nf);
  };

  const addSubtable = () => {
    setSubtables([...subtables, {
      key: `st_${Date.now()}`, label: '明細表格', fields: [
        { key: 'item', type: 'text', label: '項目' },
        { key: 'amount', type: 'number', label: '金額' },
      ],
    }]);
  };

  const save = () => {
    onSave({
      name, icon, fields, subtables, layout,
      auto_number: autoNumber,
    });
  };

  const S = {
    wrap: { display: 'flex', gap: 16, height: 'calc(100vh - 200px)' },
    palette: { width: 220, flexShrink: 0, overflow: 'auto', background: 'var(--c-bg-elevated)', borderRadius: 12, padding: 14, border: '1px solid var(--c-border)' },
    canvas: { flex: 1, overflow: 'auto', background: 'var(--c-bg-elevated)', borderRadius: 12, padding: 20, border: '1px solid var(--c-border)' },
    props: { width: 280, flexShrink: 0, overflow: 'auto', background: 'var(--c-bg-elevated)', borderRadius: 12, padding: 14, border: '1px solid var(--c-border)' },
    fieldBtn: { display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', border: '1px solid var(--c-border)', borderRadius: 8, background: 'var(--c-bg)', cursor: 'pointer', fontSize: 13, marginBottom: 4, width: '100%', transition: 'background 0.15s' },
    canvasField: (active) => ({ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', border: `2px solid ${active ? 'var(--c-primary)' : 'var(--c-border)'}`, borderRadius: 10, background: active ? 'var(--c-primary-light)' : 'var(--c-bg)', cursor: 'grab', marginBottom: 6, transition: 'all 0.15s' }),
    label: { fontSize: 11, color: 'var(--c-text-muted)', marginBottom: 4, display: 'block' },
    input: { width: '100%', padding: '6px 10px', borderRadius: 6, border: '1px solid var(--c-border)', background: 'var(--c-bg)', color: 'var(--c-text)', fontSize: 13, marginBottom: 8, outline: 'none' },
  };

  return (<>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <input style={{ fontSize: 20, border: 'none', background: 'transparent', color: 'var(--c-text)', fontWeight: 700, width: 40, textAlign: 'center' }} value={icon} onChange={e => setIcon(e.target.value)} />
        <input style={{ fontSize: 20, border: 'none', background: 'transparent', color: 'var(--c-text)', fontWeight: 700, width: 300 }} value={name} onChange={e => setName(e.target.value)} />
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <label style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 6, color: 'var(--c-text-muted)' }}>
          <input type="checkbox" checked={!!autoNumber} onChange={e => setAutoNumber(e.target.checked ? { pattern: 'NO-{YYYYMM}-{NNN}' } : null)} /> 自動編號
        </label>
        {autoNumber && <input style={{ ...S.input, width: 200, marginBottom: 0 }} value={autoNumber.pattern} onChange={e => setAutoNumber({ pattern: e.target.value })} placeholder="QT-{YYYYMM}-{NNN}" />}
        <button className="btn btn-primary" onClick={save}>💾 儲存表單</button>
        <button className="btn btn-secondary" onClick={onCancel}>取消</button>
      </div>
    </div>

    <div style={S.wrap}>
      {/* 左：欄位面板 */}
      <div style={S.palette}>
        <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 10, color: 'var(--c-text-muted)' }}>📦 欄位類型</div>
        {Object.entries(FIELD_TYPES).map(([type, info]) => (
          <button key={type} style={S.fieldBtn} onClick={() => addField(type)}
            onMouseOver={e => e.currentTarget.style.background = 'var(--c-primary-light)'}
            onMouseOut={e => e.currentTarget.style.background = 'var(--c-bg)'}>
            <span>{info.icon}</span> <span>{info.label}</span>
          </button>
        ))}
        <div style={{ borderTop: '1px solid var(--c-border)', marginTop: 10, paddingTop: 10 }}>
          <button style={{ ...S.fieldBtn, border: '1px dashed var(--c-primary)', color: 'var(--c-primary)' }} onClick={addSubtable}>📊 新增子表格</button>
        </div>
      </div>

      {/* 中：設計畫布 */}
      <div style={S.canvas}>
        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--c-text-muted)', marginBottom: 12 }}>
          排版列數：<select value={layout.columns} onChange={e => setLayout({ ...layout, columns: Number(e.target.value) })} style={{ fontSize: 12, padding: '2px 8px', borderRadius: 4 }}>
            <option value={1}>1 列</option><option value={2}>2 列</option><option value={3}>3 列</option><option value={4}>4 列</option>
          </select>
        </div>

        {fields.length === 0 && <div style={{ textAlign: 'center', padding: 60, color: 'var(--c-text-muted)', fontSize: 14 }}>👈 從左側點選欄位類型<br />在此建構你的表單</div>}

        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${layout.columns}, 1fr)`, gap: 6 }}>
          {fields.map((f, i) => (
            <div key={f.key}
              style={{ ...S.canvasField(editingField === i), gridColumn: f.type === 'divider' || f.type === 'header' || f.type === 'textarea' ? `1 / -1` : `span ${Math.min(f.width || 1, layout.columns)}` }}
              draggable onDragStart={() => { dragIdx.current = i; }}
              onDragOver={e => e.preventDefault()}
              onDrop={() => { if (dragIdx.current !== null && dragIdx.current !== i) moveField(dragIdx.current, i); dragIdx.current = null; }}
              onClick={() => setEditingField(i)}>
              {f.type === 'divider' ? <div style={{ borderTop: '2px solid var(--c-border)', width: '100%', margin: '4px 0' }}></div> :
               f.type === 'header' ? <div style={{ fontSize: 15, fontWeight: 700 }}>{f.label}</div> : <>
                <span style={{ fontSize: 16 }}>{FIELD_TYPES[f.type]?.icon || '📝'}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12, fontWeight: 600 }}>{f.label}{f.required && <span style={{ color: 'var(--c-danger)' }}> *</span>}</div>
                  <div style={{ fontSize: 10, color: 'var(--c-text-muted)' }}>{FIELD_TYPES[f.type]?.label} {f.formula ? `= ${f.formula}` : ''}</div>
                </div>
                <span style={{ cursor: 'pointer', fontSize: 11, opacity: 0.5 }} onClick={e => { e.stopPropagation(); removeField(i); }}>✕</span>
              </>}
            </div>
          ))}
        </div>

        {/* 子表格 */}
        {subtables.map((st, si) => (
          <div key={st.key} style={{ marginTop: 16, border: '2px dashed var(--c-primary)', borderRadius: 10, padding: 14, background: editingSt === si ? 'var(--c-primary-light)' : '' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }} onClick={() => setEditingSt(si)}>
              <span style={{ fontSize: 13, fontWeight: 700 }}>📊 {st.label}</span>
              <div style={{ display: 'flex', gap: 4 }}>
                <button style={{ fontSize: 11, padding: '2px 6px', cursor: 'pointer', border: '1px solid var(--c-border)', borderRadius: 4, background: 'var(--c-bg)' }}
                  onClick={e => { e.stopPropagation(); const ns = [...subtables]; ns[si].fields.push({ key: `sf_${Date.now()}`, type: 'text', label: '新欄位' }); setSubtables(ns); }}>+ 欄位</button>
                <button style={{ fontSize: 11, padding: '2px 6px', cursor: 'pointer', border: '1px solid var(--c-danger)', borderRadius: 4, background: 'transparent', color: 'var(--c-danger)' }}
                  onClick={() => setSubtables(subtables.filter((_, i) => i !== si))}>刪除</button>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {st.fields.map((f, fi) => (
                <div key={f.key} style={{ padding: '4px 10px', border: '1px solid var(--c-border)', borderRadius: 6, fontSize: 12, background: 'var(--c-bg)' }}>
                  {FIELD_TYPES[f.type]?.icon} {f.label}
                  <span style={{ cursor: 'pointer', marginLeft: 6, opacity: 0.5 }} onClick={() => { const ns = [...subtables]; ns[si].fields = ns[si].fields.filter((_, i) => i !== fi); setSubtables(ns); }}>✕</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* 右：欄位屬性 */}
      <div style={S.props}>
        <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 10, color: 'var(--c-text-muted)' }}>⚙️ 欄位屬性</div>
        {editingField !== null && fields[editingField] ? (() => {
          const f = fields[editingField];
          return (<>
            <label style={S.label}>欄位標籤</label>
            <input style={S.input} value={f.label} onChange={e => updateField(editingField, { label: e.target.value })} />

            <label style={S.label}>欄位代碼 (key)</label>
            <input style={S.input} value={f.key} onChange={e => updateField(editingField, { key: e.target.value })} />

            <label style={S.label}>類型</label>
            <select style={S.input} value={f.type} onChange={e => updateField(editingField, { type: e.target.value })}>
              {Object.entries(FIELD_TYPES).map(([k, v]) => <option key={k} value={k}>{v.icon} {v.label}</option>)}
            </select>

            <label style={S.label}>寬度 (columns)</label>
            <select style={S.input} value={f.width || 1} onChange={e => updateField(editingField, { width: Number(e.target.value) })}>
              {[1,2,3,4].map(n => <option key={n} value={n}>{n}</option>)}
            </select>

            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, marginBottom: 8, cursor: 'pointer' }}>
              <input type="checkbox" checked={f.required || false} onChange={e => updateField(editingField, { required: e.target.checked })} /> 必填
            </label>

            <label style={S.label}>預設值</label>
            <input style={S.input} value={f.default_value || ''} onChange={e => updateField(editingField, { default_value: e.target.value })} />

            {/* 選項 */}
            {(f.type === 'select' || f.type === 'multisel' || f.type === 'radio') && (<>
              <label style={S.label}>選項（每行一個）</label>
              <textarea style={{ ...S.input, height: 80 }} value={(f.options || []).join('\n')} onChange={e => updateField(editingField, { options: e.target.value.split('\n') })} />
            </>)}

            {/* 公式 */}
            {f.type === 'formula' && (<>
              <label style={S.label}>公式</label>
              <textarea style={{ ...S.input, height: 60, fontFamily: 'monospace' }} value={f.formula || ''} onChange={e => updateField(editingField, { formula: e.target.value })} placeholder="SUM(subtable.amount)" />
              <div style={{ fontSize: 10, color: 'var(--c-text-muted)' }}>可用: SUM, AVG, COUNT, MAX, MIN, IF, ROUND, CONCAT, TODAY</div>
            </>)}

            {/* 連結載入 */}
            {f.type === 'link' && (<>
              <label style={S.label}>連結的表單</label>
              <select style={S.input} value={f.link_schema_id || ''} onChange={e => updateField(editingField, { link_schema_id: e.target.value })}>
                <option value="">- 選擇表單 -</option>
                {(allSchemas || []).map(s => <option key={s.id} value={s.id}>{s.icon} {s.name}</option>)}
              </select>
              <label style={S.label}>顯示欄位 (key)</label>
              <input style={S.input} value={f.link_display_field || ''} onChange={e => updateField(editingField, { link_display_field: e.target.value })} placeholder="name" />
              <label style={S.label}>載入欄位 (JSON)</label>
              <textarea style={{ ...S.input, height: 50, fontFamily: 'monospace', fontSize: 11 }}
                value={JSON.stringify(f.link_load_fields || [], null, 1)}
                onChange={e => { try { updateField(editingField, { link_load_fields: JSON.parse(e.target.value) }); } catch {} }}
                placeholder='[{"source_key":"phone","target_key":"contact_phone"}]' />
            </>)}

            <button className="btn btn-secondary" style={{ width: '100%', marginTop: 8, fontSize: 12 }} onClick={() => removeField(editingField)}>🗑️ 刪除此欄位</button>
          </>);
        })() : <p style={{ color: 'var(--c-text-muted)', fontSize: 12, textAlign: 'center', padding: 20 }}>點選畫布上的欄位<br />即可編輯屬性</p>}
      </div>
    </div>
  </>);
}
