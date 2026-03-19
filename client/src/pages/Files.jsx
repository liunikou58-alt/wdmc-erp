import { useState, useEffect } from 'react'
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
  const [files, setFiles] = useState([]);
  const [filter, setFilter] = useState('');
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    const params = filter ? `?category=${filter}` : '';
    api.getFiles(filter).then(setFiles).catch(() => setFiles([]));
  }, [filter]);

  const upload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const base64 = reader.result.split(',')[1];
        await api.uploadFile({ filename: file.name, data: base64, category: filter || 'general' });
        api.getFiles(filter).then(setFiles);
        setUploading(false);
      };
      reader.readAsDataURL(file);
    } catch { setUploading(false); }
  };

  const del = async (id) => {
    await api.deleteFile(id);
    api.getFiles(filter).then(setFiles);
  };

  const fmtSize = (bytes) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <>
      <div className="page-header">
        <div><h1 className="page-title">📂 檔案管理</h1><p className="page-subtitle">提案附件、合約掃描、場勘照片</p></div>
        <label className="btn btn-primary" style={{ cursor: 'pointer' }}>
          {uploading ? '上傳中...' : '📤 上傳檔案'}
          <input type="file" hidden onChange={upload} accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.jpg,.jpeg,.png,.gif,.webp,.mp4,.zip" />
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
        <div className="empty-state"><div className="empty-state-icon">📂</div><div className="empty-state-title">尚無檔案</div></div>
      ) : (
        <div className="table-wrap"><table>
          <thead><tr><th>檔案</th><th>分類</th><th>大小</th><th>上傳者</th><th>日期</th><th>操作</th></tr></thead>
          <tbody>{files.map(f => (
            <tr key={f.id}>
              <td>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 20 }}>{EXT_ICONS[f.ext?.replace('.', '')] || '📄'}</span>
                  <div>
                    <a href={f.path} target="_blank" rel="noreferrer" style={{ fontWeight: 600, fontSize: 13, color: 'var(--c-primary)' }}>{f.original_name}</a>
                    <div style={{ fontSize: 10, color: 'var(--c-text-muted)', fontFamily: 'monospace' }}>{f.ext}</div>
                  </div>
                </div>
              </td>
              <td style={{ fontSize: 12 }}>{CATS.find(c => c.key === f.category)?.label || f.category}</td>
              <td style={{ fontSize: 12, fontFamily: 'monospace' }}>{fmtSize(f.size)}</td>
              <td style={{ fontSize: 12 }}>{f.uploader_name}</td>
              <td style={{ fontSize: 11, color: 'var(--c-text-muted)' }}>{new Date(f.created_at).toLocaleDateString('zh-TW')}</td>
              <td><button className="btn btn-danger btn-sm" onClick={() => del(f.id)}>🗑️</button></td>
            </tr>
          ))}</tbody>
        </table></div>
      )}
    </>
  );
}
