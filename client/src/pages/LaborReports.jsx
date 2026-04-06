import { useState, useEffect } from 'react'
import { useLang } from '../LangContext'
import { api } from '../api'

const STATUS = { false: { l: '進行中', c: 'badge-info' }, true: { l: '已結案', c: 'badge-success' } };

export default function LaborReports() {
  const { t } = useLang();
  const [tab, setTab] = useState('reports');
  const [reports, setReports] = useState([]);
  const [workers, setWorkers] = useState([]);
  const [stats, setStats] = useState({});
  const [selected, setSelected] = useState(null);
  const [detail, setDetail] = useState(null);
  const [showAdd, setShowAdd] = useState(false);
  const [showAddW, setShowAddW] = useState(false);
  const [projects, setProjects] = useState([]);
  const [searchQ, setSearchQ] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [form, setForm] = useState({ event_name: '', event_date: '', project_id: '', permission_group: 'X-企劃', type: 'case' });
  const [wForm, setWForm] = useState({ name: '', id_number: '', birthday: '', address: '', phone: '', bank_account: '', bank_name: '' });
  const [addWorkerToReport, setAddWorkerToReport] = useState(null);
  const [workerAmount, setWorkerAmount] = useState('');

  const load = () => {
    api.getLaborReports().then(setReports).catch(() => {});
    api.getLaborStats().then(setStats).catch(() => {});
    api.getWorkersList().then(setWorkers).catch(() => {});
    api.getProjects().then(setProjects).catch(() => {});
  };

  useEffect(load, []);

  const openDetail = async (id) => {
    const d = await api.getLaborReport(id);
    setDetail(d);
    setSelected(id);
  };

  const createReport = async () => {
    await api.createLaborReport(form);
    setShowAdd(false);
    setForm({ event_name: '', event_date: '', project_id: '', permission_group: 'X-企劃', type: 'case' });
    load();
  };

  const createWorker = async () => {
    await api.createWorker(wForm);
    setShowAddW(false);
    setWForm({ name: '', id_number: '', birthday: '', address: '', phone: '', bank_account: '', bank_name: '' });
    load();
  };

  const searchWorker = async (q) => {
    setSearchQ(q);
    if (q.length >= 1) {
      const r = await api.searchWorkers(q);
      setSearchResults(r);
    } else setSearchResults([]);
  };

  const addWorkerToLR = async (worker) => {
    await api.addWorkerToReport(addWorkerToReport, {
      worker_id: worker.id, name: worker.name, gross_amount: Number(workerAmount) || 0,
    });
    setAddWorkerToReport(null);
    setWorkerAmount('');
    setSearchQ('');
    setSearchResults([]);
    openDetail(addWorkerToReport);
    load();
  };

  const closeReport = async (id) => {
    await api.closeLaborReport(id);
    load();
    if (selected === id) openDetail(id);
  };

  const GROUPS = ['X-企劃', 'X-音響', 'X-燈光', 'X-視訊', 'X-管理', 'X-財務'];

  return (<>
    <div className="page-header"><div><h1 className="page-title">{t('page.labor')}</h1><p className="page-subtitle">勞務報酬單填報 · 工作人員主檔</p></div></div>

    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 24 }}>
      <div className="stat-card"><div className="stat-icon" style={{ background: 'var(--c-primary-light)' }}>📝</div><div><div className="stat-value">{stats.total_reports || 0}</div><div className="stat-label">總勞報單數</div></div></div>
      <div className="stat-card"><div className="stat-icon" style={{ background: 'var(--c-warning-light)' }}>⏳</div><div><div className="stat-value">{stats.open || 0}</div><div className="stat-label">進行中</div></div></div>
      <div className="stat-card"><div className="stat-icon" style={{ background: 'var(--c-success-light)' }}>💵</div><div><div className="stat-value" style={{ color: 'var(--c-success)' }}>${(stats.total_amount || 0).toLocaleString()}</div><div className="stat-label">總金額</div></div></div>
      <div className="stat-card"><div className="stat-icon" style={{ background: 'var(--c-info-light)' }}>👤</div><div><div className="stat-value">{stats.total_workers || 0}</div><div className="stat-label">工作人員筆數</div></div></div>
    </div>

    <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
      {[['reports','📝 勞報單'],['workers','👤 工作人員主檔']].map(([k,l]) => (
        <button key={k} className={`btn ${tab===k?'btn-primary':'btn-secondary'}`} onClick={()=>setTab(k)}>{l}</button>
      ))}
    </div>

    {/* ═══ 勞報單列表 ═══ */}
    {tab === 'reports' && (<>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginBottom: 12 }}>
        <button className="btn btn-primary" onClick={() => setShowAdd(true)}>{t('labor.add')}</button>
      </div>

      {showAdd && (
        <div className="card" style={{ marginBottom: 16 }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>📝 新增勞報單</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
            <div className="form-group"><label className="form-label">活動名稱 *</label><input className="form-input" value={form.event_name} onChange={e => setForm({...form,event_name:e.target.value})} placeholder="如：2603_阿杜料理_春酒活動" /></div>
            <div className="form-group"><label className="form-label">活動日期</label><input className="form-input" type="date" value={form.event_date} onChange={e => setForm({...form,event_date:e.target.value})} /></div>
            <div className="form-group"><label className="form-label">關聯專案</label><select className="form-select" value={form.project_id} onChange={e => setForm({...form,project_id:e.target.value})}><option value="">- 選擇 -</option>{projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
            <div className="form-group"><label className="form-label">權限群組</label><select className="form-select" value={form.permission_group} onChange={e => setForm({...form,permission_group:e.target.value})}>{GROUPS.map(g => <option key={g} value={g}>{g}</option>)}</select></div>
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}><button className="btn btn-primary" onClick={createReport}>建立</button><button className="btn btn-secondary" onClick={() => setShowAdd(false)}>取消</button></div>
        </div>
      )}

      <div className="table-wrap"><table>
        <thead><tr><th>編號</th><th>活動名稱</th><th>日期</th><th>人數</th><th>總金額</th><th>群組</th><th>狀態</th><th>操作</th></tr></thead>
        <tbody>{reports.map(r => (
          <tr key={r.id} style={{ cursor: 'pointer', background: selected === r.id ? 'var(--c-primary-light)' : '' }} onClick={() => openDetail(r.id)}>
            <td style={{ fontSize: 12, fontFamily: 'monospace' }}>{r.report_no}</td>
            <td style={{ fontWeight: 600 }}>{r.event_name}</td>
            <td style={{ fontSize: 12 }}>{r.event_date || '-'}</td>
            <td>{r.headcount || 0}</td>
            <td style={{ fontWeight: 700, color: 'var(--c-success)' }}>${(r.total_amount || 0).toLocaleString()}</td>
            <td><span className="badge badge-info">{r.permission_group || '-'}</span></td>
            <td><span className={`badge ${STATUS[r.is_closed]?.c}`}>{STATUS[r.is_closed]?.l}</span></td>
            <td>
              {!r.is_closed && <button className="btn btn-secondary" style={{ fontSize: 11, padding: '2px 8px' }} onClick={e => { e.stopPropagation(); closeReport(r.id); }}>結案</button>}
              <button className="btn btn-secondary" style={{ fontSize: 11, padding: '2px 8px', marginLeft: 4 }} onClick={e => { e.stopPropagation(); window.open(`/api/labor-reports/${r.id}/pdf`, '_blank'); }}>🖨️</button>
            </td>
          </tr>
        ))}</tbody>
      </table></div>

      {/* 勞報單詳情 */}
      {detail && (
        <div className="card" style={{ marginTop: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div>
              <h3 style={{ fontSize: 16, fontWeight: 700 }}>{detail.event_name}</h3>
              <p style={{ fontSize: 12, color: 'var(--c-text-muted)' }}>{detail.report_no} · {detail.event_date || ''} · {detail.created_by_name || ''}</p>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              {!detail.is_closed && <button className="btn btn-primary" style={{ fontSize: 12 }} onClick={() => { setAddWorkerToReport(detail.id); }}>➕ 新增人員</button>}
              <button className="btn btn-secondary" style={{ fontSize: 12 }} onClick={() => { setDetail(null); setSelected(null); }}>✕ 關閉</button>
            </div>
          </div>

          {/* 新增人員 */}
          {addWorkerToReport === detail.id && (
            <div style={{ background: 'var(--c-bg-elevated)', padding: 14, borderRadius: 10, marginBottom: 14, border: '1px dashed var(--c-primary)' }}>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>🔍 搜尋工作人員（連結載入）</div>
              <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                <input className="form-input" placeholder="輸入姓名/身分證/電話..." value={searchQ} onChange={e => searchWorker(e.target.value)} style={{ flex: 1 }} />
                <input className="form-input" type="number" placeholder="金額" value={workerAmount} onChange={e => setWorkerAmount(e.target.value)} style={{ width: 120 }} />
                <button className="btn btn-secondary" onClick={() => setAddWorkerToReport(null)}>取消</button>
              </div>
              {searchResults.length > 0 && (
                <div style={{ maxHeight: 200, overflow: 'auto', border: '1px solid var(--c-border)', borderRadius: 8 }}>
                  {searchResults.map(w => (
                    <div key={w.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', borderBottom: '1px solid var(--c-border)', cursor: 'pointer' }}
                      onClick={() => addWorkerToLR(w)}>
                      <div><strong>{w.name}</strong> <span style={{ fontSize: 11, color: 'var(--c-text-muted)' }}>{w.id_number} · {w.phone}</span></div>
                      <span style={{ fontSize: 11 }}>點擊選取 →</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="table-wrap"><table>
            <thead><tr><th>#</th><th>姓名</th><th>身分證</th><th>電話</th><th>稅前</th><th>所得稅</th><th>健保</th><th>實領</th><th>收款日</th></tr></thead>
            <tbody>{(detail.workers || []).map((w, i) => (
              <tr key={w.id}>
                <td>{i + 1}</td>
                <td style={{ fontWeight: 600 }}>{w.name}</td>
                <td style={{ fontSize: 11, fontFamily: 'monospace' }}>{w.id_number || '-'}</td>
                <td style={{ fontSize: 12 }}>{w.phone || '-'}</td>
                <td>${(w.gross_amount || 0).toLocaleString()}</td>
                <td style={{ color: w.tax_withheld > 0 ? 'var(--c-danger)' : '' }}>{w.tax_withheld > 0 ? `-$${w.tax_withheld.toLocaleString()}` : '-'}</td>
                <td style={{ color: w.nhi_withheld > 0 ? 'var(--c-danger)' : '' }}>{w.nhi_withheld > 0 ? `-$${w.nhi_withheld.toLocaleString()}` : '-'}</td>
                <td style={{ fontWeight: 700, color: 'var(--c-success)' }}>${(w.net_amount || 0).toLocaleString()}</td>
                <td style={{ fontSize: 12 }}>{w.cash_received_date || '-'}</td>
              </tr>
            ))}</tbody>
            <tfoot><tr style={{ fontWeight: 700, background: 'var(--c-bg-elevated)' }}>
              <td colSpan={4} style={{ textAlign: 'right' }}>合計 ({detail.headcount || 0} 人)</td>
              <td>${(detail.workers || []).reduce((s, w) => s + (w.gross_amount || 0), 0).toLocaleString()}</td>
              <td></td><td></td>
              <td style={{ color: 'var(--c-success)' }}>${(detail.total_amount || 0).toLocaleString()}</td>
              <td></td>
            </tr></tfoot>
          </table></div>
        </div>
      )}
    </>)}

    {/* ═══ 工作人員主檔 ═══ */}
    {tab === 'workers' && (<>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
        <button className="btn btn-primary" onClick={() => setShowAddW(true)}>➕ 新增工作人員</button>
      </div>

      {showAddW && (
        <div className="card" style={{ marginBottom: 16 }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>👤 新增工作人員</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
            <div className="form-group"><label className="form-label">姓名 *</label><input className="form-input" value={wForm.name} onChange={e => setWForm({...wForm,name:e.target.value})} /></div>
            <div className="form-group"><label className="form-label">身分證字號</label><input className="form-input" value={wForm.id_number} onChange={e => setWForm({...wForm,id_number:e.target.value})} /></div>
            <div className="form-group"><label className="form-label">出生年月日</label><input className="form-input" type="date" value={wForm.birthday} onChange={e => setWForm({...wForm,birthday:e.target.value})} /></div>
            <div className="form-group"><label className="form-label">聯絡電話</label><input className="form-input" value={wForm.phone} onChange={e => setWForm({...wForm,phone:e.target.value})} /></div>
          </div>
          <div className="form-group"><label className="form-label">戶籍地址</label><input className="form-input" value={wForm.address} onChange={e => setWForm({...wForm,address:e.target.value})} /></div>
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}><button className="btn btn-primary" onClick={createWorker}>建立</button><button className="btn btn-secondary" onClick={() => setShowAddW(false)}>取消</button></div>
        </div>
      )}

      <div className="table-wrap"><table>
        <thead><tr><th>姓名</th><th>身分證</th><th>生日</th><th>電話</th><th>地址</th><th>簽名</th></tr></thead>
        <tbody>{workers.map(w => (
          <tr key={w.id}>
            <td style={{ fontWeight: 600 }}>{w.name}</td>
            <td style={{ fontSize: 11, fontFamily: 'monospace' }}>{w.id_number || '-'}</td>
            <td style={{ fontSize: 12 }}>{w.birthday || '-'}</td>
            <td style={{ fontSize: 12 }}>{w.phone || '-'}</td>
            <td style={{ fontSize: 12, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis' }}>{w.address || '-'}</td>
            <td>{w.signature ? <span className="badge badge-success">✅</span> : <span className="badge badge-warning">❌</span>}</td>
          </tr>
        ))}</tbody>
      </table></div>
    </>)}
  </>);
}
