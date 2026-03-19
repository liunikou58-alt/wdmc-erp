import { useState, useEffect } from 'react'
import { api } from '../api'

const PO_STATUS = {
  pending: { label: '待確認', class: 'badge-warning' },
  confirmed: { label: '已確認', class: 'badge-primary' },
  delivered: { label: '已交貨', class: 'badge-info' },
  completed: { label: '已驗收', class: 'badge-success' },
  cancelled: { label: '已取消', class: 'badge-danger' },
};

export default function Vendors() {
  const [tab, setTab] = useState('vendors');
  const [vendors, setVendors] = useState([]);
  const [pos, setPOs] = useState([]);
  const [projects, setProjects] = useState([]);
  const [showAdd, setShowAdd] = useState(false);
  const [showPO, setShowPO] = useState(false);
  const [vendorForm, setVendorForm] = useState({ name: '', contact_person: '', phone: '', email: '', category: '' });
  const [poForm, setPOForm] = useState({ vendor_id: '', project_id: '', total: '', notes: '', delivery_date: '' });

  useEffect(() => {
    api.getVendors().then(setVendors);
    api.getAllPOs().then(setPOs).catch(() => {});
    api.getProjects().then(setProjects).catch(() => {});
  }, []);

  const addVendor = async () => {
    if (!vendorForm.name.trim()) return;
    await api.createVendor(vendorForm);
    api.getVendors().then(setVendors);
    setShowAdd(false); setVendorForm({ name: '', contact_person: '', phone: '', email: '', category: '' });
  };

  const addPO = async () => {
    await api.createPO({ ...poForm, total: Number(poForm.total) || 0 });
    api.getAllPOs().then(setPOs);
    setShowPO(false); setPOForm({ vendor_id: '', project_id: '', total: '', notes: '', delivery_date: '' });
  };

  const updatePOStatus = async (poId, status) => {
    await api.updatePO(poId, { status });
    api.getAllPOs().then(setPOs);
  };

  return (
    <>
      <div className="page-header">
        <div><h1 className="page-title">📦 廠商與採購</h1><p className="page-subtitle">廠商管理、採購單追蹤</p></div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-primary" onClick={() => setShowAdd(true)}>➕ 新增廠商</button>
          <button className="btn btn-success" onClick={() => setShowPO(true)}>📋 新增採購單</button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        <button className={`btn ${tab === 'vendors' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setTab('vendors')}>🏭 廠商列表</button>
        <button className={`btn ${tab === 'po' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setTab('po')}>📋 採購單 ({pos.length})</button>
      </div>

      {showAdd && (
        <div className="card" style={{ marginBottom: 16 }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 12 }}>新增廠商</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12 }}>
            {[['name','廠商名稱 *'],['contact_person','聯絡人'],['phone','電話'],['email','Email'],['category','類別']].map(([f,l]) => (
              <div key={f} className="form-group"><label className="form-label">{l}</label>
                <input className="form-input" value={vendorForm[f]} onChange={e => setVendorForm({...vendorForm,[f]:e.target.value})} /></div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 8 }}><button className="btn btn-primary" onClick={addVendor}>建立</button><button className="btn btn-secondary" onClick={() => setShowAdd(false)}>取消</button></div>
        </div>
      )}

      {showPO && (
        <div className="card" style={{ marginBottom: 16 }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 12 }}>新增採購單</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
            <div className="form-group"><label className="form-label">廠商</label><select className="form-select" value={poForm.vendor_id} onChange={e => setPOForm({...poForm,vendor_id:e.target.value})}><option value="">選擇廠商</option>{vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}</select></div>
            <div className="form-group"><label className="form-label">關聯專案</label><select className="form-select" value={poForm.project_id} onChange={e => setPOForm({...poForm,project_id:e.target.value})}><option value="">選擇專案</option>{projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
            <div className="form-group"><label className="form-label">金額</label><input className="form-input" type="number" value={poForm.total} onChange={e => setPOForm({...poForm,total:e.target.value})} /></div>
            <div className="form-group"><label className="form-label">交貨日</label><input className="form-input" type="date" value={poForm.delivery_date} onChange={e => setPOForm({...poForm,delivery_date:e.target.value})} /></div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}><button className="btn btn-primary" onClick={addPO}>建立</button><button className="btn btn-secondary" onClick={() => setShowPO(false)}>取消</button></div>
        </div>
      )}

      {tab === 'vendors' && (
        vendors.length === 0 ? (
          <div className="empty-state"><div className="empty-state-icon">🏭</div><div className="empty-state-title">尚無廠商</div></div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead><tr><th>廠商名稱</th><th>聯絡人</th><th>電話</th><th>類別</th><th>採購單數</th><th>累計金額</th></tr></thead>
              <tbody>{vendors.map(v => (
                <tr key={v.id}>
                  <td style={{ fontWeight: 600 }}>{v.name}</td>
                  <td>{v.contact_person || '-'}</td>
                  <td style={{ fontSize: 12 }}>{v.phone || '-'}</td>
                  <td style={{ fontSize: 12 }}>{v.category || '-'}</td>
                  <td><span className="badge badge-info">{v.po_count}</span></td>
                  <td style={{ fontWeight: 600, color: 'var(--c-primary)' }}>${(v.total_amount || 0).toLocaleString()}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        )
      )}

      {tab === 'po' && (
        pos.length === 0 ? (
          <div className="empty-state"><div className="empty-state-icon">📋</div><div className="empty-state-title">尚無採購單</div></div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead><tr><th>單號</th><th>廠商</th><th>專案</th><th>金額</th><th>交貨日</th><th>狀態</th><th>操作</th></tr></thead>
              <tbody>{pos.map(po => (
                <tr key={po.id}>
                  <td style={{ fontWeight: 600, fontSize: 12, fontFamily: 'monospace' }}>{po.po_number}</td>
                  <td>{po.vendor_name || '-'}</td>
                  <td style={{ fontSize: 12 }}>{po.project_name || '-'}</td>
                  <td style={{ fontWeight: 600 }}>${(po.total || 0).toLocaleString()}</td>
                  <td style={{ fontSize: 12 }}>{po.delivery_date || '-'}</td>
                  <td><span className={`badge ${PO_STATUS[po.status]?.class || ''}`}>{PO_STATUS[po.status]?.label || po.status}</span></td>
                  <td>
                    <select className="form-select" style={{ padding: '3px 6px', fontSize: 11, width: 100 }} value={po.status} onChange={e => updatePOStatus(po.id, e.target.value)}>
                      {Object.entries(PO_STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                    </select>
                  </td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        )
      )}
    </>
  );
}
