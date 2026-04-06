import { useState, useEffect } from 'react'
import { useLang } from '../LangContext'
import { useSearchParams } from 'react-router-dom'
import { api } from '../api'
import FormDesigner from '../components/form-builder/FormDesigner'
import FormRenderer from '../components/form-builder/FormRenderer'

export default function FormBuilder() {
  const { t } = useLang();
  const [searchParams] = useSearchParams();
  const [view, setView] = useState('list'); // list | design | records | fill
  const [schemas, setSchemas] = useState([]);
  const [folders, setFolders] = useState([]);
  const [selectedSchema, setSelectedSchema] = useState(null);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [records, setRecords] = useState([]);
  const [activeFolder, setActiveFolder] = useState(null);
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [folderName, setFolderName] = useState('');
  const [initDone, setInitDone] = useState(false);

  const load = () => {
    api.formBuilderGetSchemas(activeFolder).then(setSchemas).catch(() => {});
    api.formBuilderGetFolders().then(setFolders).catch(() => {});
  };

  useEffect(load, [activeFolder]);

  // 從 URL ?schema=ID 自動開啟紀錄列表
  useEffect(() => {
    const schemaId = searchParams.get('schema');
    if (schemaId && !initDone) {
      api.formBuilderGetSchema(schemaId).then(async (schema) => {
        if (schema) {
          setSelectedSchema(schema);
          const recs = await api.formBuilderGetRecords(schema.id);
          setRecords(recs || []);
          setView('records');
          // 切到對應資料夾
          if (schema.folder_id) setActiveFolder(schema.folder_id);
        }
        setInitDone(true);
      }).catch(() => setInitDone(true));
    }
  }, [searchParams]);

  const createSchema = () => {
    setSelectedSchema(null);
    setView('design');
  };

  const editSchema = (schema) => {
    setSelectedSchema(schema);
    setView('design');
  };

  const openRecords = async (schema) => {
    setSelectedSchema(schema);
    const recs = await api.formBuilderGetRecords(schema.id);
    setRecords(recs);
    setView('records');
  };

  const saveSchema = async (data) => {
    if (selectedSchema?.id) {
      await api.formBuilderUpdateSchema(selectedSchema.id, data);
    } else {
      await api.formBuilderCreateSchema({ ...data, folder_id: activeFolder });
    }
    setView('list');
    load();
  };

  const deleteSchema = async (id) => {
    if (!confirm('確定刪除此表單？')) return;
    await api.formBuilderDeleteSchema(id);
    load();
  };

  const duplicateSchema = async (id) => {
    await api.formBuilderDuplicateSchema(id);
    load();
  };

  const openNewRecord = () => {
    setSelectedRecord(null);
    setView('fill');
  };

  const openRecord = async (id) => {
    const rec = await api.formBuilderGetRecord(selectedSchema.id, id);
    setSelectedRecord(rec);
    setView('fill');
  };

  const saveRecord = async ({ data, subtable_data }) => {
    if (selectedRecord?.id) {
      await api.formBuilderUpdateRecord(selectedSchema.id, selectedRecord.id, { data, subtable_data });
    } else {
      await api.formBuilderCreateRecord(selectedSchema.id, { data, subtable_data });
    }
    const recs = await api.formBuilderGetRecords(selectedSchema.id);
    setRecords(recs);
    setView('records');
  };

  const deleteRecord = async (id) => {
    if (!confirm('確定刪除此紀錄？')) return;
    await api.formBuilderDeleteRecord(selectedSchema.id, id);
    const recs = await api.formBuilderGetRecords(selectedSchema.id);
    setRecords(recs);
  };

  const createFolder = async () => {
    await api.formBuilderCreateFolder({ name: folderName || '新資料夾' });
    setShowNewFolder(false); setFolderName('');
    load();
  };

  /* ═══ List View ═══ */
  if (view === 'list') return (<>
    <div className="page-header"><div><h1 className="page-title">{t('page.formBuilder')}</h1><p className="page-subtitle">表單建構器 · 像 Ragic 一樣拖拉設計表單</p></div></div>

    <div style={{ display: 'flex', gap: 16 }}>
      {/* 左：資料夾 */}
      <div style={{ width: 200, flexShrink: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8, color: 'var(--c-text-muted)' }}>📁 資料夾</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <div style={{ padding: '8px 12px', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: !activeFolder ? 700 : 400, background: !activeFolder ? 'var(--c-primary-light)' : '' }}
            onClick={() => setActiveFolder(null)}>📋 全部表單 <span className="badge badge-info" style={{ marginLeft: 4 }}>{schemas.length}</span></div>
          {folders.map(f => (
            <div key={f.id} style={{ padding: '8px 12px', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: activeFolder === f.id ? 700 : 400, background: activeFolder === f.id ? 'var(--c-primary-light)' : '' }}
              onClick={() => setActiveFolder(f.id)}>{f.icon} {f.name}</div>
          ))}
        </div>
        {showNewFolder ? (
          <div style={{ marginTop: 8, display: 'flex', gap: 4 }}>
            <input className="form-input" style={{ fontSize: 12 }} value={folderName} onChange={e => setFolderName(e.target.value)} placeholder="資料夾名稱" />
            <button className="btn btn-primary" style={{ fontSize: 11, padding: '2px 8px' }} onClick={createFolder}>✓</button>
          </div>
        ) : (
          <button style={{ fontSize: 12, padding: '6px 12px', marginTop: 8, cursor: 'pointer', border: '1px dashed var(--c-border)', borderRadius: 8, background: 'transparent', color: 'var(--c-text-muted)', width: '100%' }}
            onClick={() => setShowNewFolder(true)}>+ 新資料夾</button>
        )}
      </div>

      {/* 右：表單卡片 */}
      <div style={{ flex: 1 }}>
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 14 }}>
          <button className="btn btn-primary" onClick={createSchema}>✨ 新建表單</button>
        </div>
        {schemas.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 60, color: 'var(--c-text-muted)' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>📋</div>
            <p>{t('formBuilder.empty')}</p><p style={{ fontSize: 12 }}>點擊「✨ 新建表單」開始設計</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
            {schemas.map(s => (
              <div key={s.id} className="card" style={{ padding: 16, cursor: 'pointer', transition: 'transform 0.15s, box-shadow 0.15s' }}
                onClick={() => openRecords(s)}
                onMouseOver={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.12)'; }}
                onMouseOut={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = ''; }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ fontSize: 28 }}>{s.icon || '📋'}</div>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <button style={{ border: 'none', background: 'transparent', cursor: 'pointer', fontSize: 14 }} onClick={e => { e.stopPropagation(); editSchema(s); }} title="編輯設計">✏️</button>
                    <button style={{ border: 'none', background: 'transparent', cursor: 'pointer', fontSize: 14 }} onClick={e => { e.stopPropagation(); duplicateSchema(s.id); }} title="複製">📄</button>
                    <button style={{ border: 'none', background: 'transparent', cursor: 'pointer', fontSize: 14 }} onClick={e => { e.stopPropagation(); deleteSchema(s.id); }} title="刪除">🗑️</button>
                  </div>
                </div>
                <div style={{ fontSize: 15, fontWeight: 700, marginTop: 8 }}>{s.name}</div>
                <div style={{ fontSize: 12, color: 'var(--c-text-muted)', marginTop: 4 }}>{s.description || '無描述'}</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10, fontSize: 11, color: 'var(--c-text-muted)' }}>
                  <span>{(s.fields || []).length} 欄位</span>
                  <span className="badge badge-info">{s.record_count || 0} 筆</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  </>);

  /* ═══ Design View ═══ */
  if (view === 'design') return (
    <FormDesigner schema={selectedSchema} onSave={saveSchema} onCancel={() => setView('list')} allSchemas={schemas} />
  );

  /* ═══ Records View ═══ */
  if (view === 'records') return (<>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
      <div>
        <h2 style={{ fontSize: 18, fontWeight: 700 }}>{selectedSchema?.icon} {selectedSchema?.name}</h2>
        <p style={{ fontSize: 12, color: 'var(--c-text-muted)' }}>{records.length} 筆紀錄</p>
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <button className="btn btn-primary" onClick={openNewRecord}>➕ 新增紀錄</button>
        <button className="btn btn-secondary" onClick={() => editSchema(selectedSchema)}>✏️ 編輯表單</button>
        <button className="btn btn-secondary" onClick={() => setView('list')}>← 返回</button>
      </div>
    </div>

    <div className="table-wrap"><table>
      <thead><tr>
        <th style={{ width: 50 }}>#</th>
        {selectedSchema?.auto_number && <th>編號</th>}
        {(selectedSchema?.fields || []).filter(f => !['divider','header','signature','file','image'].includes(f.type)).slice(0, 8).map(f =>
          <th key={f.key}>{f.label}</th>
        )}
        <th>建立時間</th><th>操作</th>
      </tr></thead>
      <tbody>
        {records.map((r, i) => (
          <tr key={r.id} style={{ cursor: 'pointer' }} onClick={() => openRecord(r.id)}>
            <td>{i + 1}</td>
            {selectedSchema?.auto_number && <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{r.record_no}</td>}
            {(selectedSchema?.fields || []).filter(f => !['divider','header','signature','file','image'].includes(f.type)).slice(0, 8).map(f => {
              const val = (r.data || {})[f.key];
              return <td key={f.key} style={{ fontSize: 12 }}>
                {f.type === 'currency' ? `$${Number(val || 0).toLocaleString()}` :
                 f.type === 'checkbox' ? (val ? '✅' : '❌') :
                 f.type === 'rating' ? '⭐'.repeat(val || 0) :
                 Array.isArray(val) ? val.join(', ') :
                 String(val ?? '-').slice(0, 30)}
              </td>;
            })}
            <td style={{ fontSize: 11, color: 'var(--c-text-muted)' }}>{new Date(r.created_at).toLocaleDateString('zh-TW')}</td>
            <td>
              <button className="btn btn-secondary" style={{ fontSize: 11, padding: '2px 8px' }} onClick={e => { e.stopPropagation(); deleteRecord(r.id); }}>🗑️</button>
            </td>
          </tr>
        ))}
        {records.length === 0 && <tr><td colSpan={99} style={{ textAlign: 'center', padding: 30, color: 'var(--c-text-muted)' }}>尚無紀錄，點擊「➕ 新增」開始填寫</td></tr>}
      </tbody>
    </table></div>
  </>);

  /* ═══ Fill View ═══ */
  if (view === 'fill') return (
    <FormRenderer schema={selectedSchema} record={selectedRecord} onSave={saveRecord} onCancel={() => openRecords(selectedSchema)} />
  );
}
