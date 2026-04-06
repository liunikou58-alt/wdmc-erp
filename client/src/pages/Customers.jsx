import { useState, useEffect } from 'react'
import { useLang } from '../LangContext'
import { Link } from 'react-router-dom'
import { api } from '../api'

const getCOMPANY_TYPES = (t) => [
  { key: 'all', label: t('cust.all'), icon: '🏢' },
  { key: 'government', label: t('cust.government'), icon: '🏛️' },
  { key: 'corporate', label: t('cust.corporate'), icon: '💼' },
  { key: 'peer', label: t('cust.peer'), icon: '🤝' },
];

const LEVELS = ['VVIP', 'VIP', '一般'];
const LEVEL_COLORS = {
  VVIP: { bg: 'linear-gradient(135deg, #f59e0b, #ef4444)', color: '#fff' },
  VIP: { bg: 'linear-gradient(135deg, #8b5cf6, #6366f1)', color: '#fff' },
  '一般': { bg: 'var(--c-bg-elevated)', color: 'var(--c-text-muted)' },
};

export default function Customers() {
  const { t } = useLang();
  const COMPANY_TYPES = getCOMPANY_TYPES(t);
  const [customers, setCustomers] = useState([]);
  const [showAdd, setShowAdd] = useState(false);
  const [editCustomer, setEditCustomer] = useState(null);
  const [form, setForm] = useState({ name: '', contact_person: '', phone: '', email: '', company_type: 'corporate', customer_level: '一般', tax_id: '', address: '', fax: '', website: '' });
  const [activeTab, setActiveTab] = useState('all');
  const [search, setSearch] = useState('');

  const load = () => {
    const params = {};
    if (activeTab !== 'all') params.company_type = activeTab;
    if (search.trim()) params.q = search.trim();
    api.getCustomers(params).then(setCustomers).catch(() => {});
  };

  useEffect(() => { load(); }, [activeTab, search]);

  const add = async () => {
    if (!form.name.trim()) return;
    if (editCustomer) {
      await api.updateCustomer(editCustomer.id, form);
    } else {
      await api.createCustomer(form);
    }
    load();
    setShowAdd(false);
    setEditCustomer(null);
    setForm({ name: '', contact_person: '', phone: '', email: '', company_type: 'corporate', customer_level: '一般', tax_id: '', address: '', fax: '', website: '' });
  };

  const openEdit = (c) => {
    setEditCustomer(c);
    setForm({
      name: c.name || '', contact_person: c.contact_person || '', phone: c.phone || '',
      email: c.email || '', company_type: c.company_type || 'corporate',
      customer_level: c.customer_level || '一般', tax_id: c.tax_id || '',
      address: c.address || '', fax: c.fax || '', website: c.website || '',
    });
    setShowAdd(true);
  };

  const set = f => e => setForm({ ...form, [f]: e.target.value });

  const tabCounts = {
    all: customers.length,
    government: customers.filter(c => c.company_type === 'government').length,
    corporate: customers.filter(c => c.company_type === 'corporate').length,
    peer: customers.filter(c => c.company_type === 'peer').length,
  };

  // For "all" tab, use all; for specific tab, API already filtered
  const displayed = customers;

  return (<>
    <div className="page-header">
      <div><h1 className="page-title">{t('page.customers')}</h1><p className="page-subtitle">{t('cust.subtitle')}</p></div>
      <button className="btn btn-primary" onClick={() => { setShowAdd(true); setEditCustomer(null); setForm({ name: '', contact_person: '', phone: '', email: '', company_type: activeTab === 'all' ? 'corporate' : activeTab, customer_level: '一般', tax_id: '', address: '', fax: '', website: '' }); }}>{t('cust.addCustomer')}</button>
    </div>

    {/* KPI */}
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 20 }}>
      <div className="stat-card"><div className="stat-icon">🤝</div><div><div className="stat-value">{customers.length}</div><div className="stat-label">{t('cust.totalCustomers')}</div></div></div>
      <div className="stat-card"><div className="stat-icon" style={{ background: 'var(--c-info-light)' }}>📋</div><div><div className="stat-value" style={{ color: 'var(--c-info)' }}>{customers.reduce((s,c) => s + (c.case_count || 0), 0)}</div><div className="stat-label">{t('cust.totalCases')}</div></div></div>
      <div className="stat-card"><div className="stat-icon" style={{ background: 'var(--c-success-light)' }}>📁</div><div><div className="stat-value" style={{ color: 'var(--c-success)' }}>{customers.reduce((s,c) => s + (c.project_count || 0), 0)}</div><div className="stat-label">{t('cust.totalProjects')}</div></div></div>
      <div className="stat-card"><div className="stat-icon" style={{ background: 'var(--c-warning-light)' }}>📜</div><div><div className="stat-value" style={{ color: 'var(--c-warning)' }}>{customers.reduce((s,c) => s + (c.contract_count || 0), 0)}</div><div className="stat-label">{t('cust.totalContracts')}</div></div></div>
    </div>

    {/* Tabs + Search */}
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
      <div className="sub-tabs">
        {COMPANY_TYPES.map(t => (
          <button key={t.key} className={`sub-tab ${activeTab === t.key ? 'active' : ''}`} onClick={() => setActiveTab(t.key)}>
            {t.label} ({activeTab === 'all' ? tabCounts[t.key] : (t.key === activeTab ? displayed.length : '—')})
          </button>
        ))}
      </div>
      <div style={{ position: 'relative' }}>
        <input
          type="text" className="form-input" placeholder={t('cust.searchPlaceholder')}
          value={search} onChange={e => setSearch(e.target.value)}
          style={{ width: 280, paddingLeft: 12, fontSize: 13 }}
        />
        {search && <button onClick={() => setSearch('')} style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--c-text-muted)', fontSize: 14 }}>✕</button>}
      </div>
    </div>

    {/* Add/Edit Modal */}
    {showAdd && (
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.4)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="card" style={{ width: 600, maxHeight: '85vh', overflow: 'auto', padding: 24, animation: 'fadeUp 0.3s ease' }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 14 }}>{editCustomer ? t('cust.editCustomer') : t('cust.addNewCustomer')}</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="form-group" style={{ gridColumn: '1/-1' }}><label className="form-label">{t('cust.companyName')}</label><input className="form-input" value={form.name} onChange={set('name')} /></div>
            <div className="form-group">
              <label className="form-label">{t('cust.companyType')}</label>
              <select className="form-input" value={form.company_type} onChange={set('company_type')}>
                <option value="government">{t('cust.government')}</option>
                <option value="corporate">{t('cust.corporate')}</option>
                <option value="peer">{t('cust.peer')}</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">{t('cust.customerLevel')}</label>
              <select className="form-input" value={form.customer_level} onChange={set('customer_level')}>
                {LEVELS.map(l => <option key={l} value={l}>{l === 'VVIP' ? '👑 VVIP' : l === 'VIP' ? '⭐ VIP' : t('cust.regular')}</option>)}
              </select>
            </div>
            <div className="form-group"><label className="form-label">{t('cust.contactPerson')}</label><input className="form-input" value={form.contact_person} onChange={set('contact_person')} /></div>
            <div className="form-group"><label className="form-label">{t('cust.phone')}</label><input className="form-input" value={form.phone} onChange={set('phone')} /></div>
            <div className="form-group"><label className="form-label">Email</label><input className="form-input" value={form.email} onChange={set('email')} /></div>
            <div className="form-group"><label className="form-label">{t('cust.taxId')}</label><input className="form-input" value={form.tax_id} onChange={set('tax_id')} placeholder={t('cust.taxIdHint')} /></div>
            <div className="form-group"><label className="form-label">{t('cust.fax')}</label><input className="form-input" value={form.fax} onChange={set('fax')} /></div>
            <div className="form-group"><label className="form-label">{t('cust.website')}</label><input className="form-input" value={form.website} onChange={set('website')} /></div>
            <div className="form-group" style={{ gridColumn: '1/-1' }}><label className="form-label">{t('cust.address')}</label><input className="form-input" value={form.address} onChange={set('address')} /></div>
          </div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 14 }}>
            <button className="btn btn-secondary" onClick={() => { setShowAdd(false); setEditCustomer(null); }}>{t('common.cancel')}</button>
            <button className="btn btn-primary" onClick={add}>✅ {editCustomer ? t('common.update') : t('common.create2')}</button>
          </div>
        </div>
      </div>
    )}

    {/* Customer Cards */}
    {displayed.length === 0 ? (
      <div className="empty-state"><div className="empty-state-icon">🤝</div><div className="empty-state-title">{search ? t('cust.noSearchResult') : t('cust.noCustomers')}</div><p>{search ? t('cust.tryOtherKeyword') : t('cust.addCustomerHint')}</p></div>
    ) : (
      <div className="card-grid">
        {displayed.map(c => {
          const lvl = LEVEL_COLORS[c.customer_level] || LEVEL_COLORS['一般'];
          const typeIcon = c.company_type === 'government' ? '🏛️' : c.company_type === 'peer' ? '🤝' : '💼';
          const typeLabel = c.company_type === 'government' ? t('cust.govShort') : c.company_type === 'peer' ? t('cust.peerShort') : t('cust.corpShort');
          return (
            <div key={c.id} className="card" style={{ padding: 18, cursor: 'pointer', transition: 'transform .15s, box-shadow .15s' }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 25px rgba(0,0,0,.12)'; }}
              onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = ''; }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
                <div className="avatar" style={{ background: 'var(--c-primary)', width: 44, height: 44, fontSize: 18 }}>{(c.name || '?')[0]}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 15 }}>{c.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--c-text-muted)' }}>{c.contact_person || t('cust.noContact')}</div>
                </div>
                <span style={{ padding: '3px 8px', borderRadius: 20, fontSize: 10, fontWeight: 700, background: lvl.bg, color: lvl.color, letterSpacing: 1 }}>
                  {c.customer_level || '一般'}
                </span>
              </div>

              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', fontSize: 11, marginBottom: 10 }}>
                <span className="badge" style={{ fontSize: 10 }}>{typeIcon} {typeLabel}</span>
                <span className="badge badge-info">{c.case_count || 0} {t('cust.cases')}</span>
                <span className="badge badge-primary">{c.project_count || 0} {t('cust.projects')}</span>
                <span className="badge badge-success">{c.contract_count || 0} {t('cust.contracts')}</span>
              </div>

              <div style={{ display: 'flex', gap: 8, fontSize: 12, color: 'var(--c-text-muted)', flexWrap: 'wrap' }}>
                {c.phone && <span>📞 {c.phone}</span>}
                {c.email && <span>✉️ {c.email}</span>}
                {c.tax_id && <span>🏢 {c.tax_id}</span>}
              </div>

              <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
                <Link to={`/customers/${c.id}`} className="btn btn-sm btn-primary" style={{ textDecoration: 'none', fontSize: 11 }}>{t('cust.detail')}</Link>
                <button className="btn btn-sm" onClick={(e) => { e.stopPropagation(); openEdit(c); }} style={{ fontSize: 11 }}>{t('common.edit2')}</button>
              </div>
            </div>
          );
        })}
      </div>
    )}
  </>);
}
