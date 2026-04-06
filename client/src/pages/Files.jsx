import { useState, useEffect } from 'react'
import { useLang } from '../LangContext'
import { api } from '../api'

const CATS = [
  { key: '', label: '全部' },
  { key: 'proposal', label: '📝 提案' },
  { key: 'contract', label: '📃 合約' },
  { key: 'project', label: '📁 專案' },
  { key: 'survey', label: '📷 場勘' },
  { key: 'general', label: '📂 一般' },
];

const EXT_ICONS = { pdf: '📕', doc: '📘', docx: '📘', xls: '📗', xlsx: '📗', ppt: '📙', pptx: '📙', jpg: '🖼️', jpeg: '🖼️', png: '🖼️', gif: '🖼️', webp: '🖼️', mp4: '🎬', zip: '📦' };

export default function Files() {
  const { t } = useLang();
  const [files, setFiles] = useState([]);
  const [filter, setFilter] = useState('');
  const [uploading, setUploading] = useState(false);

  const [versionsModal, setVersionsModal] = useState(null);
  const [versionList, setVersionList] = useState([]);

  useEffect(() => {
    const params = filter ? `?category=${filter}` : '';
    api.getFiles(filter).then(setFiles).catch(() => setFiles([]));
  }, [filter]);

  const upload = async (e, parent_file_id = null) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const base64 = reader.result.split(',')[1];
        await api.uploadFile({ filename: file.name, data: base64, category: filter || 'general', parent_file_id });
        api.getFiles(filter).then(setFiles);
        if (versionsModal) loadVersions(versionsModal);
        setUploading(false);
      };
      reader.readAsDataURL(file);
    } catch { setUploading(false); }
  };

  const loadVersions = async (fileId) => {
    try {
      const res = await api.get(`/files/${fileId}/versions`);
      setVersionList(res);
      setVersionsModal(fileId);
    } catch (e) {}
  };

  const del = async (id) => {
    if (!window.confirm('確定要刪除此檔案嗎？')) return;
    await api.deleteFile(id);
    api.getFiles(filter).then(setFiles);
    if (versionsModal === id) setVersionsModal(null);
  };

  const fmtSize = (bytes) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <>
      <div className="page-header">
        <div><h1 className="page-title">{t('page.files')}</h1><p className="page-subtitle">檔案中心與版本管理</p></div>
        <label className="btn btn-primary" style={{ cursor: 'pointer' }}>
          {uploading ? '上傳中...' : '📤 上傳檔案'}
          <input type="file" hidden onChange={e => upload(e)} accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.jpg,.jpeg,.png,.gif,.webp,.mp4,.zip" />
        </label>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {CATS.map(c => (
          <button key={c.key} className={`btn btn-sm ${filter === c.key ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setFilter(c.key)}>{c.label}</button>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 20 }}>
        <div className="stat-card"><div className="stat-icon" style={{ background: 'var(--c-primary-light)' }}>📂</div><div><div className="stat-value">{files.length}</div><div className="stat-label">總檔案數</div></div></div>
        <div className="stat-card"><div className="stat-icon" style={{ background: 'var(--c-success-light)' }}>💾</div><div><div className="stat-value">{fmtSize(files.reduce((s, f) => s + (f.size || 0), 0))}</div><div className="stat-label">總容量</div></div></div>
        <div className="stat-card"><div className="stat-icon" style={{ background: 'var(--c-info-light)' }}>🖼️</div><div><div className="stat-value">{files.filter(f => f.mime_type?.startsWith('image/')).length}</div><div className="stat-label">圖片</div></div></div>
      </div>

      {files.length === 0 ? (
        <div className="empty-state"><div className="empty-state-icon">📂</div><div className="empty-state-title">{t('files.empty')}</div></div>
      ) : (
        <div className="table-wrap"><table>
          <thead><tr><th>檔案</th><th>分類</th><th>大小</th><th>{t('files.uploader')}</th><th>日期</th><th>操作</th></tr></thead>
          <tbody>{files.map(f => (
            <tr key={f.id} style={{ opacity: f.has_newer_version ? 0.6 : 1, background: f.has_newer_version ? 'var(--c-bg-elevated)' : 'transparent' }}>
              <td>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 20 }}>{EXT_ICONS[f.ext?.replace('.', '')] || '📄'}</span>
                  <div>
                    <a href={f.path} target="_blank" rel="noreferrer" style={{ fontWeight: 600, fontSize: 13, color: 'var(--c-primary)' }}>{f.original_name}</a>
                    <div style={{ fontSize: 10, color: 'var(--c-text-muted)', fontFamily: 'monospace' }}>
                      {f.ext}
                      {f.has_newer_version && <span className="badge badge-warning" style={{ marginLeft: 6, fontSize: 9 }}>舊版本</span>}
                    </div>
                  </div>
                </div>
              </td>
              <td style={{ fontSize: 12 }}>{CATS.find(c => c.key === f.category)?.label || f.category}</td>
              <td style={{ fontSize: 12, fontFamily: 'monospace' }}>{fmtSize(f.size)}</td>
              <td style={{ fontSize: 12 }}>{f.uploader_name}</td>
              <td style={{ fontSize: 11, color: 'var(--c-text-muted)' }}>{new Date(f.created_at).toLocaleDateString('zh-TW')}</td>
              <td style={{ display: 'flex', gap: 6 }}>
                <button className="btn btn-sm" onClick={() => loadVersions(f.id)}>🕒 版本歷史</button>
                <button className="btn btn-danger btn-sm" onClick={() => del(f.id)}>🗑️</button>
              </td>
            </tr>
          ))}</tbody>
        </table></div>
      )}

      {versionsModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="card" style={{ width: 600, maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: 20, borderBottom: '1px solid var(--c-border)' }}>
              <h3 style={{ margin: 0, fontSize: 16 }}>🕒 檔案版本歷史</h3>
              <button className="btn btn-sm" onClick={() => setVersionsModal(null)}>關閉</button>
            </div>
            <div style={{ padding: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
                <label className="btn btn-primary btn-sm" style={{ cursor: 'pointer' }}>
                  {uploading ? '上傳中...' : '+ 上傳新版本'}
                  <input type="file" hidden onChange={e => upload(e, versionsModal)} accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.jpg,.jpeg,.png,.gif,.webp,.mp4,.zip" />
                </label>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {versionList.map((v, idx) => (
                  <div key={v.id} style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: 14, border: '1px solid var(--c-border)', borderRadius: 8,
                    background: idx === 0 ? 'var(--c-success-light)' : 'var(--c-bg)'
                  }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                        <span style={{ fontWeight: 700, fontSize: 13, color: idx === 0 ? 'var(--c-success)' : 'var(--c-text)' }}>
                          {v.original_name}
                        </span>
                        {idx === 0 && <span className="badge badge-success">最新版</span>}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--c-text-muted)' }}>
                        上傳者: {v.uploader_name} · 大小: {fmtSize(v.size)} · 日期: {new Date(v.created_at).toLocaleString('zh-TW')}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <a href={v.path} target="_blank" rel="noreferrer" className="btn btn-sm btn-secondary">⬇️ 下載</a>
                      <button className="btn btn-sm btn-danger" onClick={() => del(v.id)}>🗑️</button>
                    </div>
                  </div>
                ))}
                {versionList.length === 0 && <div style={{ textAlign: 'center', padding: 20, color: 'var(--c-text-muted)' }}>無版本紀錄</div>}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
