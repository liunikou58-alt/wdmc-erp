import { useState, useEffect } from 'react'
import { useLang } from '../LangContext'
import { api } from '../api'

export default function Bridge() {
  const { t } = useLang();
  const [status, setStatus] = useState(null);
  const [pfProjects, setPfProjects] = useState([]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    api.getBridgeStatus().then(setStatus).catch(() => setStatus({ erp: 'online', proposalflow: 'offline' }));
  }, []);

  const fetchPF = async () => {
    setLoading(true);
    try {
      const data = await api.getBridgePFProjects();
      setPfProjects(data);
    } catch { setPfProjects([]); setMsg('⚠️ 無法連接 ProposalFlow AI'); }
    finally { setLoading(false); }
  };

  const importProject = async (pfId) => {
    try {
      await api.importFromPF(pfId);
      setMsg('✅ 匯入成功！');
      fetchPF();
    } catch (e) {
      setMsg(`⚠️ ${e.message}`);
    }
  };

  return (
    <>
      <div className="page-header"><div><h1 className="page-title">{t('page.bridge')}</h1><p className="page-subtitle">ProposalFlow AI ↔ WDMC ERP 資料互通</p></div></div>

      {/* 連線狀態 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16, marginBottom: 24 }}>
        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '20px 24px' }}>
          <div style={{ width: 12, height: 12, borderRadius: '50%', background: 'var(--c-success)', boxShadow: '0 0 8px var(--c-success)' }} />
          <div>
            <div style={{ fontWeight: 700, fontSize: 15 }}>🏢 WDMC ERP</div>
            <div style={{ fontSize: 12, color: 'var(--c-text-muted)' }}>localhost:3002 · <span style={{ color: 'var(--c-success)' }}>在線</span></div>
          </div>
        </div>
        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '20px 24px' }}>
          <div style={{ width: 12, height: 12, borderRadius: '50%', background: status?.proposalflow === 'online' ? 'var(--c-success)' : 'var(--c-danger)', boxShadow: status?.proposalflow === 'online' ? '0 0 8px var(--c-success)' : '0 0 8px var(--c-danger)' }} />
          <div>
            <div style={{ fontWeight: 700, fontSize: 15 }}>🤖 ProposalFlow AI</div>
            <div style={{ fontSize: 12, color: 'var(--c-text-muted)' }}>localhost:3001 · <span style={{ color: status?.proposalflow === 'online' ? 'var(--c-success)' : 'var(--c-danger)' }}>{status?.proposalflow === 'online' ? '在線' : '離線'}</span></div>
          </div>
        </div>
      </div>

      {msg && <div className="card" style={{ marginBottom: 16, padding: '10px 16px', fontSize: 13 }}>{msg}</div>}

      {/* ProposalFlow 匯入 */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700 }}>📥 從 ProposalFlow 匯入專案</h2>
          <button className="btn btn-primary" onClick={fetchPF} disabled={loading}>{loading ? '讀取中...' : '🔄 載入專案列表'}</button>
        </div>

        {pfProjects.length === 0 ? (
          <p style={{ color: 'var(--c-text-muted)', fontSize: 13, textAlign: 'center', padding: 20 }}>
            {status?.proposalflow === 'online' ? '點擊「載入專案列表」從 ProposalFlow 取得專案' : '⚠️ ProposalFlow AI 未連線，請先啟動 ProposalFlow (port 3001)'}
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {pfProjects.map(p => (
              <div key={p.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', border: '1px solid var(--c-border)', borderRadius: 8 }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 13 }}>{p.name || p.project_name}</div>
                  <div style={{ fontSize: 11, color: 'var(--c-text-muted)' }}>{p.event_type || ''} · {p.status || ''}</div>
                </div>
                <button className="btn btn-primary btn-sm" onClick={() => importProject(p.id)}>📥 匯入 ERP</button>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
