import { useState, useEffect } from 'react'
import { useLang } from '../LangContext'
import { api } from '../api'

const getPO_STATUS = (t) => ({
  pending: { label: t('vendor.poStatus.pending'), class: 'badge-warning' },
  confirmed: { label: t('vendor.poStatus.confirmed'), class: 'badge-primary' },
  delivered: { label: t('vendor.poStatus.delivered'), class: 'badge-info' },
  completed: { label: t('vendor.poStatus.completed'), class: 'badge-success' },
  cancelled: { label: t('vendor.poStatus.cancelled'), class: 'badge-danger' },
});

const TIERS = [
  { value: '月結廠商', label: '月結廠商', color: 'var(--c-success)', bg: 'var(--c-success-light)', rule: '當月結計金額 +45天匯款' },
  { value: '常配合廠商', label: '常配合廠商', color: 'var(--c-primary)', bg: 'var(--c-primary-light)', rule: '活動日隔月底付款' },
  { value: '普通廠商', label: '普通/特殊廠商', color: 'var(--c-warning)', bg: 'var(--c-warning-light)', rule: '定金+尾款隔月底/現金全額' },
];

export default function Vendors() {
  const { t } = useLang();
  const PO_STATUS = getPO_STATUS(t);
  const [tab, setTab] = useState('vendors');
  const [vendors, setVendors] = useState([]);
  const [pos, setPOs] = useState([]);
  const [projects, setProjects] = useState([]);
  const [showAdd, setShowAdd] = useState(false);
  const [showPO, setShowPO] = useState(false);
  const [vendorForm, setVendorForm] = useState({ name: '', contact_person: '', phone: '', email: '', category: '', payment_tier: '普通廠商', tax_id: '', bank_account: '', bank_name: '' });
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
    setShowAdd(false); setVendorForm({ name: '', contact_person: '', phone: '', email: '', category: '', payment_tier: '普通廠商', tax_id: '', bank_account: '', bank_name: '' });
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

  const updateVendorTier = async (vendorId, payment_tier) => {
    await api.updateVendor(vendorId, { payment_tier });
    api.getVendors().then(setVendors);
  };

  const getUpgradeSuggestion = (v) => {
    if (v.payment_tier === '普通廠商' && v.po_count >= 2) return { msg: '此廠商已配合 ' + v.po_count + ' 次，建議升級為「常配合廠商」', target: '常配合廠商' };
    if (v.payment_tier === '常配合廠商' && v.po_count >= 5) return { msg: '此廠商已配合 ' + v.po_count + ' 次，建議升級為「月結廠商」', target: '月結廠商' };
    return null;
  };

  const tierInfo = (tierValue) => TIERS.find(t => t.value === tierValue) || TIERS[2];

  return (
    <>
      <div className="page-header">
        <div><h1 className="page-title">{t('page.vendors')}</h1><p className="page-subtitle">廠商管理 · 結帳分級 · 採購關聯</p></div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-primary" onClick={() => setShowAdd(true)}>{t('vendor.addVendor')}</button>
          <button className="btn btn-success" onClick={() => setShowPO(true)}>{t('vendor.addPO')}</button>
        </div>
      </div>

      {/* 分級說明卡片 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 20 }}>
        {TIERS.map(tier => (
          <div key={tier.value} className="card" style={{ padding: '14px 18px', borderLeft: `4px solid ${tier.color}` }}>
            <div style={{ fontWeight: 700, fontSize: 14, color: tier.color, marginBottom: 4 }}>{tier.label}</div>
            <div style={{ fontSize: 12, color: 'var(--c-text-muted)' }}>{tier.rule}</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: tier.color, marginTop: 6 }}>{vendors.filter(v => v.payment_tier === tier.value).length} 家</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        <button className={`btn ${tab === 'vendors' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setTab('vendors')}>{t('vendor.vendorList')}</button>
        <button className={`btn ${tab === 'po' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setTab('po')}>{t('vendor.poTab')} ({pos.length})</button>
      </div>

      {showAdd && (
        <div className="card" style={{ marginBottom: 16, animation: 'fadeUp 0.2s ease' }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 12 }}>{t('vendor.addVendor')}</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
            <div className="form-group"><label className="form-label">廠商名稱 *</label><input className="form-input" value={vendorForm.name} onChange={e => setVendorForm({...vendorForm, name: e.target.value})} /></div>
            <div className="form-group"><label className="form-label">聯絡人</label><input className="form-input" value={vendorForm.contact_person} onChange={e => setVendorForm({...vendorForm, contact_person: e.target.value})} /></div>
            <div className="form-group"><label className="form-label">電話</label><input className="form-input" value={vendorForm.phone} onChange={e => setVendorForm({...vendorForm, phone: e.target.value})} /></div>
            <div className="form-group"><label className="form-label">Email</label><input className="form-input" value={vendorForm.email} onChange={e => setVendorForm({...vendorForm, email: e.target.value})} /></div>
            <div className="form-group"><label className="form-label">分類</label><input className="form-input" value={vendorForm.category} onChange={e => setVendorForm({...vendorForm, category: e.target.value})} /></div>
            <div className="form-group"><label className="form-label">結帳級別</label>
              <select className="form-select" value={vendorForm.payment_tier} onChange={e => setVendorForm({...vendorForm, payment_tier: e.target.value})}>
                {TIERS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div className="form-group"><label className="form-label">統一編號</label><input className="form-input" value={vendorForm.tax_id} onChange={e => setVendorForm({...vendorForm, tax_id: e.target.value})} /></div>
            <div className="form-group"><label className="form-label">銀行名稱</label><input className="form-input" value={vendorForm.bank_name} onChange={e => setVendorForm({...vendorForm, bank_name: e.target.value})} /></div>
          </div>
          <div className="form-group"><label className="form-label">匯款帳號</label><input className="form-input" value={vendorForm.bank_account} onChange={e => setVendorForm({...vendorForm, bank_account: e.target.value})} /></div>
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}><button className="btn btn-primary" onClick={addVendor}>{t('common.create2')}</button><button className="btn btn-secondary" onClick={() => setShowAdd(false)}>{t('common.cancel')}</button></div>
        </div>
      )}

      {showPO && (
        <div className="card" style={{ marginBottom: 16 }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 12 }}>{t('vendor.addPO')}</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
            <div className="form-group"><label className="form-label">{t('vendor.vendor')}</label><select className="form-select" value={poForm.vendor_id} onChange={e => setPOForm({...poForm,vendor_id:e.target.value})}><option value="">{t('vendor.selectVendor')}</option>{vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}</select></div>
            <div className="form-group"><label className="form-label">{t('vendor.relatedProject')}</label><select className="form-select" value={poForm.project_id} onChange={e => setPOForm({...poForm,project_id:e.target.value})}><option value="">{t('vendor.selectProject')}</option>{projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
            <div className="form-group"><label className="form-label">{t('vendor.amount')}</label><input className="form-input" type="number" value={poForm.total} onChange={e => setPOForm({...poForm,total:e.target.value})} /></div>
            <div className="form-group"><label className="form-label">{t('vendor.deliveryDate')}</label><input className="form-input" type="date" value={poForm.delivery_date} onChange={e => setPOForm({...poForm,delivery_date:e.target.value})} /></div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}><button className="btn btn-primary" onClick={addPO}>建立</button><button className="btn btn-secondary" onClick={() => setShowPO(false)}>取消</button></div>
        </div>
      )}

      {tab === 'vendors' && (
        vendors.length === 0 ? (
          <div className="empty-state"><div className="empty-state-icon">🏭</div><div className="empty-state-title">{t('vendor.noVendors')}</div></div>
        ) : (<>
          {vendors.filter(v => getUpgradeSuggestion(v)).length > 0 && (
            <div style={{ background: 'var(--c-warning-light)', border: '1px solid var(--c-warning)', borderRadius: 12, padding: '14px 18px', marginBottom: 16 }}>
              <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--c-warning)', marginBottom: 6 }}>💡 廠商升級建議</div>
              {vendors.filter(v => getUpgradeSuggestion(v)).map(v => {
                const sug = getUpgradeSuggestion(v);
                return (
                  <div key={v.id} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, marginBottom: 4 }}>
                    <span>• <b>{v.name}</b>：{sug.msg}</span>
                    <button className="btn btn-sm btn-primary" style={{ fontSize: 10, padding: '2px 8px' }} onClick={() => updateVendorTier(v.id, sug.target)}>一鍵升級</button>
                  </div>
                );
              })}
            </div>
          )}
          <div className="table-wrap">
            <table>
              <thead><tr><th>廠商名稱</th><th>結帳級別</th><th>聯絡人</th><th>電話</th><th>統編</th><th>分類</th><th>配合次數</th><th>累計金額</th></tr></thead>
              <tbody>{vendors.map(v => {
                const ti = tierInfo(v.payment_tier);
                return (
                  <tr key={v.id}>
                    <td style={{ fontWeight: 600 }}>{v.name}</td>
                    <td><span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600, background: ti.bg, color: ti.color }}>{ti.label}</span></td>
                    <td>{v.contact_person || '-'}</td>
                    <td style={{ fontSize: 12 }}>{v.phone || '-'}</td>
                    <td style={{ fontSize: 12, fontFamily: 'monospace' }}>{v.tax_id || '-'}</td>
                    <td style={{ fontSize: 12 }}>{v.category || '-'}</td>
                    <td><span className="badge badge-info">{v.po_count}</span></td>
                    <td style={{ fontWeight: 600, color: 'var(--c-primary)' }}>${(v.total_amount || 0).toLocaleString()}</td>
                  </tr>
                );
              })}</tbody>
            </table>
          </div>
        </>)
      )}

      {tab === 'po' && (
        pos.length === 0 ? (
          <div className="empty-state"><div className="empty-state-icon">📋</div><div className="empty-state-title">{t('vendor.noPOs')}</div></div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead><tr><th>{t('vendor.poNo')}</th><th>{t('vendor.vendor')}</th><th>{t('vendor.project')}</th><th>{t('vendor.amount')}</th><th>{t('vendor.deliveryDate')}</th><th>{t('common.status')}</th><th>{t('common.actions')}</th></tr></thead>
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
