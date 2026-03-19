import { useState, useEffect, useMemo } from 'react';
import { api } from '../api';

export default function RagicView() {
  const [folders, setFolders] = useState([]);
  const [schemas, setSchemas] = useState([]);
  const [selectedFolder, setSelectedFolder] = useState(null);
  const [selectedSchema, setSelectedSchema] = useState(null);
  const [records, setRecords] = useState([]);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.formBuilderGetFolders(), api.formBuilderGetSchemas()])
      .then(([f, s]) => {
        const sorted = (f || []).sort((a, b) => (a.order || 0) - (b.order || 0));
        setFolders(sorted);
        setSchemas(s || []);
        if (sorted.length) setSelectedFolder(sorted[0].id);
        setLoading(false);
      });
  }, []);

  // 依資料夾過濾表單
  const filteredSchemas = useMemo(() => {
    return schemas.filter(s => s.folder_id === selectedFolder);
  }, [schemas, selectedFolder]);

  // 選擇表單時載入紀錄
  useEffect(() => {
    if (!selectedSchema) { setRecords([]); return; }
    api.formBuilderGetRecords(selectedSchema.id).then(r => setRecords(r || []));
  }, [selectedSchema]);

  // 搜尋過濾紀錄
  const filteredRecords = useMemo(() => {
    if (!search.trim()) return records;
    const q = search.toLowerCase();
    return records.filter(r => {
      const d = r.data || {};
      return Object.values(d).some(v => String(v).toLowerCase().includes(q));
    });
  }, [records, search]);

  // 取得要顯示的欄位 (最多8欄，跳過超長欄位)
  const visibleFields = useMemo(() => {
    if (!selectedSchema?.fields) return [];
    return selectedSchema.fields
      .filter(f => !['signature', 'image', 'file', 'divider', 'header'].includes(f.type))
      .slice(0, 8);
  }, [selectedSchema]);

  const formatVal = (val, type) => {
    if (val === null || val === undefined || val === '') return '—';
    if (type === 'currency') return `$${Number(val).toLocaleString()}`;
    if (type === 'checkbox') return val === 'Yes' || val === true ? '✅' : '❌';
    const s = String(val);
    return s.length > 40 ? s.slice(0, 40) + '...' : s;
  };

  if (loading) return <div style={{display:'flex',justifyContent:'center',alignItems:'center',height:'100%'}}><div className="loader"/></div>;

  return (
    <div style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>
      {/* 左側：資料夾 + 表單列表 */}
      <div style={S.sidebar}>
        <div style={S.sidebarHeader}>
          <span style={{fontSize:18}}>🏢</span>
          <span style={{fontWeight:700,fontSize:14}}>瓦當麥可 ERP</span>
        </div>

        {folders.map(f => (
          <div key={f.id}>
            <div
              style={{...S.folderItem, background: selectedFolder === f.id ? 'rgba(99,102,241,0.15)' : 'transparent', color: selectedFolder === f.id ? '#818cf8' : '#94a3b8'}}
              onClick={() => { setSelectedFolder(f.id); setSelectedSchema(null); setSelectedRecord(null); }}
            >
              <span>{f.icon || '📁'}</span>
              <span style={{fontSize:12,fontWeight:selectedFolder===f.id?600:400}}>{f.name}</span>
            </div>

            {/* 展開的表單列表 */}
            {selectedFolder === f.id && (
              <div style={{paddingLeft:12}}>
                {filteredSchemas.map(s => (
                  <div
                    key={s.id}
                    style={{...S.sheetItem,
                      background: selectedSchema?.id === s.id ? 'rgba(99,102,241,0.1)' : 'transparent',
                      color: selectedSchema?.id === s.id ? '#a5b4fc' : '#64748b',
                      borderLeft: selectedSchema?.id === s.id ? '2px solid #818cf8' : '2px solid transparent',
                    }}
                    onClick={() => { setSelectedSchema(s); setSelectedRecord(null); setSearch(''); }}
                  >
                    <span style={{fontSize:12}}>{s.icon || '📄'}</span>
                    <span style={{fontSize:11}}>{s.name}</span>
                  </div>
                ))}
                {filteredSchemas.length === 0 && (
                  <div style={{padding:'8px 12px',fontSize:11,color:'#475569'}}>此資料夾無表單</div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* 右側：表格 + 詳情 */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {!selectedSchema ? (
          <div style={S.emptyState}>
            <div style={{fontSize:48,marginBottom:16}}>📋</div>
            <h2 style={{color:'#e2e8f0',margin:0}}>瓦當麥可 ERP 系統</h2>
            <p style={{color:'#64748b',fontSize:14}}>從左側選擇資料夾和表單開始瀏覽</p>
            <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:12,marginTop:24,maxWidth:500}}>
              {folders.slice(0,6).map(f => {
                const count = schemas.filter(s => s.folder_id === f.id).length;
                return (
                  <div key={f.id} style={S.welcomeCard} onClick={() => { setSelectedFolder(f.id); }}>
                    <div style={{fontSize:24}}>{f.icon}</div>
                    <div style={{fontSize:12,fontWeight:600,color:'#e2e8f0'}}>{f.name}</div>
                    <div style={{fontSize:11,color:'#64748b'}}>{count} 張表單</div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <>
            {/* 頂部工具列 */}
            <div style={S.toolbar}>
              <div style={{display:'flex',alignItems:'center',gap:8}}>
                <span style={{fontSize:20}}>{selectedSchema.icon}</span>
                <h3 style={{margin:0,color:'#e2e8f0',fontSize:16}}>{selectedSchema.name}</h3>
                <span style={S.badge}>{filteredRecords.length} 筆</span>
              </div>
              <div style={{display:'flex',gap:8,alignItems:'center'}}>
                <input
                  placeholder="🔍 搜尋..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  style={S.searchInput}
                />
                {selectedSchema.description && (
                  <span style={{fontSize:11,color:'#64748b',maxWidth:200,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
                    {selectedSchema.description}
                  </span>
                )}
              </div>
            </div>

            {/* 表格 */}
            <div style={{ flex: 1, overflow: 'auto' }}>
              <table style={S.table}>
                <thead>
                  <tr>
                    <th style={S.th}>#</th>
                    {visibleFields.map(f => (
                      <th key={f.key} style={{...S.th, minWidth: f.type === 'currency' ? 100 : 120}}>
                        {f.label || f.key}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredRecords.length === 0 ? (
                    <tr><td colSpan={visibleFields.length + 1} style={{textAlign:'center',padding:40,color:'#475569'}}>無紀錄</td></tr>
                  ) : filteredRecords.map((r, i) => (
                    <tr
                      key={r.id}
                      style={{
                        background: selectedRecord?.id === r.id ? 'rgba(99,102,241,0.08)' : i % 2 === 0 ? 'rgba(0,0,0,0.15)' : 'transparent',
                        cursor: 'pointer',
                      }}
                      onClick={() => setSelectedRecord(selectedRecord?.id === r.id ? null : r)}
                    >
                      <td style={S.td}>{i + 1}</td>
                      {visibleFields.map(f => (
                        <td key={f.key} style={{...S.td, color: f.type === 'currency' ? '#34d399' : '#cbd5e1'}}>
                          {formatVal(r.data?.[f.key] ?? r.data?.[f.label], f.type)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* 底部詳情面板 */}
            {selectedRecord && (
              <div style={S.detailPanel}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}>
                  <h4 style={{margin:0,color:'#e2e8f0'}}>📋 紀錄詳情 {selectedRecord.record_no && `(${selectedRecord.record_no})`}</h4>
                  <button onClick={() => setSelectedRecord(null)} style={S.closeBtn}>✕</button>
                </div>
                <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(250px,1fr))',gap:8,maxHeight:300,overflow:'auto'}}>
                  {Object.entries(selectedRecord.data || {}).map(([key, val]) => {
                    if (!val && val !== 0) return null;
                    const str = String(val);
                    if (str.includes('(簽名資料)') || str.startsWith('data:image')) return null;
                    return (
                      <div key={key} style={S.detailField}>
                        <div style={{fontSize:10,color:'#64748b',marginBottom:2}}>{key}</div>
                        <div style={{fontSize:12,color:'#e2e8f0',wordBreak:'break-all'}}>{str.length > 100 ? str.slice(0,100)+'...' : str}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

const S = {
  sidebar: { width: 240, minWidth: 240, background: '#0f172a', borderRight: '1px solid rgba(255,255,255,0.06)', overflowY: 'auto', display: 'flex', flexDirection: 'column' },
  sidebarHeader: { padding: '16px 14px', display: 'flex', alignItems: 'center', gap: 8, borderBottom: '1px solid rgba(255,255,255,0.06)' },
  folderItem: { display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px', cursor: 'pointer', transition: 'all .15s' },
  sheetItem: { display: 'flex', alignItems: 'center', gap: 6, padding: '5px 12px', cursor: 'pointer', transition: 'all .15s' },
  toolbar: { padding: '10px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(0,0,0,0.2)', flexWrap: 'wrap', gap: 8 },
  badge: { background: 'rgba(99,102,241,0.2)', color: '#818cf8', fontSize: 11, padding: '2px 8px', borderRadius: 10, fontWeight: 600 },
  searchInput: { background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6, padding: '6px 10px', color: '#e2e8f0', fontSize: 12, width: 180, outline: 'none' },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: 12 },
  th: { textAlign: 'left', padding: '8px 10px', color: '#94a3b8', fontWeight: 600, fontSize: 11, borderBottom: '1px solid rgba(255,255,255,0.08)', position: 'sticky', top: 0, background: '#1e293b', whiteSpace: 'nowrap' },
  td: { padding: '7px 10px', borderBottom: '1px solid rgba(255,255,255,0.04)', fontSize: 12, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 200 },
  detailPanel: { borderTop: '1px solid rgba(99,102,241,0.3)', background: 'rgba(15,23,42,0.95)', padding: 16 },
  detailField: { background: 'rgba(255,255,255,0.03)', borderRadius: 6, padding: '6px 10px', border: '1px solid rgba(255,255,255,0.06)' },
  closeBtn: { background: 'rgba(255,255,255,0.1)', border: 'none', color: '#94a3b8', borderRadius: 4, padding: '2px 8px', cursor: 'pointer', fontSize: 14 },
  emptyState: { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' },
  welcomeCard: { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 8, padding: 16, textAlign: 'center', cursor: 'pointer', transition: 'all .2s' },
};
