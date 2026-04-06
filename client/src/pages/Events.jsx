import { useState, useEffect, useCallback } from 'react'
import { useLang } from '../LangContext'
import { api } from '../api'

const FMT = n => n != null ? `$${Number(n).toLocaleString()}` : '$0';
const STATUS_MAP = {
  active: { label: '進行中', color: 'var(--c-primary)', bg: 'var(--c-primary-light)', icon: '🎪' },
  closed: { label: '已結案', color: 'var(--c-success)', bg: 'var(--c-success-light)', icon: '✅' },
  cancelled: { label: '已取消', color: 'var(--c-danger)', bg: 'var(--c-danger-light)', icon: '❌' },
};
const INV_STATUS = ['未開', '已開', '已收', '不需要'];
const EVENT_TYPES = ['活動', '演唱會', '展覽', '記者會', '尾牙', '春酒', '產品發表', '園遊會', '婚禮', '標案', '其他'];
const PAY_TYPES = [
  { key: 'deposit', label: '💰 訂金' },
  { key: 'final', label: '💵 尾款' },
  { key: 'guarantee', label: '🔒 保證金' },
];
const DEPOSIT_TYPES = ['押金', '押標金', '履約保證金'];

export default function Events() {
  const { t } = useLang();
  const [events, setEvents] = useState([]);
  const [stats, setStats] = useState({});
  const [customers, setCustomers] = useState([]);
  const [users, setUsers] = useState([]);
  const [proposals, setProposals] = useState([]);
  const [showAdd, setShowAdd] = useState(false);
  const [selected, setSelected] = useState(null);
  const [detail, setDetail] = useState(null);
  const [form, setForm] = useState({});
  const [filter, setFilter] = useState('all');
  const [detailTab, setDetailTab] = useState('info');
  const [payments, setPayments] = useState([]);
  const [subEvents, setSubEvents] = useState([]);
  const [showPayForm, setShowPayForm] = useState(false);
  const [payForm, setPayForm] = useState({});
  const [rundown, setRundown] = useState([]);
  const [performers, setPerformers] = useState([]);
  const [showRundownForm, setShowRundownForm] = useState(false);
  const [rundownForm, setRundownForm] = useState({});
  const [showPerformerForm, setShowPerformerForm] = useState(false);
  const [performerForm, setPerformerForm] = useState({});

  const load = useCallback(async () => {
    const [e, s] = await Promise.all([api.getEvents(), api.getEventStats()]);
    setEvents(e || []); setStats(s || {});
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    api.getCustomers().then(setCustomers).catch(() => {});
    api.getUsers().then(setUsers).catch(() => {});
    api.getProposals().then(r => setProposals((r || []).filter(p => !p.is_template))).catch(() => {});
  }, []);

  const openDetail = async (e) => {
    setSelected(e);
    const d = await api.getEvent(e.id).catch(() => e);
    setDetail(d);
    setDetailTab('info');
    const [pays, subs, rd, pf] = await Promise.all([
      api.getEventPayments(e.id).catch(() => []),
      api.getSubEvents(e.id).catch(() => []),
      api.getEventRundown(e.id).catch(() => []),
      api.getEventPerformers(e.id).catch(() => []),
    ]);
    setPayments(pays || []);
    setSubEvents(subs || []);
    setRundown(rd || []);
    setPerformers(pf || []);
  };

  const save = async () => {
    if (!form.name) return alert('請填寫活動名稱');
    selected ? await api.updateEvent(selected.id, form) : await api.createEvent(form);
    setShowAdd(false); setSelected(null); setDetail(null); setForm({}); load();
  };

  const closeEvent = async (id) => { if (!confirm('確定要結案此活動？')) return; await api.closeEvent(id); load(); if (selected?.id === id) setSelected(null); };
  const del = async (id) => { if (!confirm('確定刪除此活動（含子活動）？')) return; await api.deleteEvent(id); load(); if (selected?.id === id) { setSelected(null); setDetail(null); } };
  const set = f => e => setForm({ ...form, [f]: e.target.value });

  // 款項操作
  const addPayment = async () => {
    if (!selected) return;
    await api.createEventPayment(selected.id, payForm);
    const pays = await api.getEventPayments(selected.id);
    setPayments(pays || []);
    setShowPayForm(false); setPayForm({});
  };
  const deletePayment = async (payId) => {
    await api.deleteEventPayment(selected.id, payId);
    setPayments(payments.filter(p => p.id !== payId));
  };
  const updatePayField = async (payId, field, value) => {
    await api.updateEventPayment(selected.id, payId, { [field]: value });
    setPayments(payments.map(p => p.id === payId ? { ...p, [field]: value } : p));
  };

  // 新增子活動
  const addSubEvent = () => {
    setForm({ name: '', event_type: '活動', company: '瓦當麥可', status: 'active', parent_event_id: selected.id, customer_id: selected.customer_id || '' });
    setShowAdd(true);
  };

  const filtered = events.filter(e => filter === 'all' || e.status === filter);

  return (<>
    <div className="page-header">
      <div><h1 className="page-title">{t('page.events')}</h1><p className="page-subtitle">追蹤活動從確認到結案 · 母子活動 · 款項保證金</p></div>
      <button className="btn btn-primary" onClick={() => { setShowAdd(true); setSelected(null); setForm({ event_type: '活動', company: '瓦當麥可', status: 'active' }); }}>{t('events.add')}</button>
    </div>

    {/* KPI */}
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12, marginBottom: 20 }}>
      {[
        { label: '總活動', value: stats.total || 0, icon: '🎪', color: 'var(--c-primary)' },
        { label: '進行中', value: stats.active || 0, icon: '🔵', color: 'var(--c-info)' },
        { label: '已結案', value: stats.closed || 0, icon: '✅', color: 'var(--c-success)' },
        { label: '總營收', value: FMT(stats.total_revenue), icon: '💰', color: 'var(--c-warning)' },
        { label: '平均毛利', value: `${stats.avg_margin || 0}%`, icon: '📊', color: (stats.avg_margin || 0) >= 20 ? 'var(--c-success)' : 'var(--c-danger)' },
      ].map((k, i) => (
        <div key={i} className="stat-card">
          <div className="stat-icon" style={{ background: `color-mix(in srgb, ${k.color} 15%, transparent)` }}>{k.icon}</div>
          <div><div className="stat-value" style={{ color: k.color }}>{k.value}</div><div className="stat-label">{k.label}</div></div>
        </div>
      ))}
    </div>

    {/* Filter */}
    <div className="sub-tabs" style={{ marginBottom: 16 }}>
      {[
        { key: 'all', label: '全部', count: events.length },
        { key: 'active', label: '🎪 進行中', count: events.filter(e => e.status === 'active').length },
        { key: 'closed', label: '✅ 已結案', count: events.filter(e => e.status === 'closed').length },
      ].map(f => (
        <button key={f.key} className={`sub-tab ${filter === f.key ? 'active' : ''}`} onClick={() => setFilter(f.key)}>
          {f.label} ({f.count})
        </button>
      ))}
    </div>

    <div style={{ display: 'flex', gap: 16 }}>
      {/* Event List */}
      <div style={{ flex: selected ? '0 0 380px' : 1, transition: 'flex .3s' }}>
        {filtered.length === 0 ? (
          <div className="empty-state"><div className="empty-state-icon">🎪</div><div className="empty-state-title">{t('events.empty')}</div></div>
        ) : (
          <div style={{ display: 'grid', gap: 10, gridTemplateColumns: selected ? '1fr' : 'repeat(auto-fill, minmax(340px, 1fr))' }}>
            {filtered.map(e => {
              const st = STATUS_MAP[e.status] || STATUS_MAP.active;
              return (
                <div key={e.id} className="card" style={{ padding: 16, cursor: 'pointer', border: selected?.id === e.id ? '2px solid var(--c-primary)' : '2px solid transparent', transition: 'all .15s' }}
                  onClick={() => openDetail(e)}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 14 }}>{e.name}</div>
                      <div style={{ fontSize: 10, color: 'var(--c-text-muted)', fontFamily: 'monospace' }}>{e.event_no}</div>
                    </div>
                    <span className="badge" style={{ background: st.bg, color: st.color, fontSize: 10 }}>{st.icon} {st.label}</span>
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, fontSize: 11, color: 'var(--c-text-secondary)', marginBottom: 8 }}>
                    {e.event_date && <span>📅 {e.event_date.slice(0, 10)}</span>}
                    {e.event_type && <span className="capsule">{e.event_type}</span>}
                    {e.customer_name && <span>🤝 {e.customer_name}</span>}
                    {e.sub_event_count > 0 && <span className="badge badge-info" style={{ fontSize: 9 }}>📂 {e.sub_event_count} 子活動</span>}
                  </div>
                  <div style={{ display: 'flex', gap: 12, fontSize: 12 }}>
                    <div><div style={{ fontSize: 9, color: 'var(--c-text-muted)' }}>報價</div><div style={{ fontWeight: 700 }}>{FMT(e.quote_amount)}</div></div>
                    <div><div style={{ fontSize: 9, color: 'var(--c-text-muted)' }}>毛利率</div><div style={{ fontWeight: 700, color: (e.margin || 0) >= 20 ? 'var(--c-success)' : 'var(--c-danger)' }}>{e.margin || 0}%</div></div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Detail Panel */}
      {selected && detail && (
        <div className="card" style={{ flex: 1, padding: 20, overflow: 'auto', maxHeight: 'calc(100vh - 200px)', animation: 'fadeUp 0.2s ease' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div>
              <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>🎪 {detail.name}</h2>
              <span style={{ fontSize: 11, color: 'var(--c-text-muted)', fontFamily: 'monospace' }}>{detail.event_no}</span>
              {detail.parent_event && <span className="badge badge-info" style={{ marginLeft: 8, fontSize: 10 }}>子活動 ← {detail.parent_event.name}</span>}
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <button className="btn btn-sm" onClick={() => { setForm({ ...detail }); setShowAdd(true); }}>✏️</button>
              {detail.status !== 'closed' && <button className="btn btn-sm btn-success" onClick={() => closeEvent(detail.id)}>結案</button>}
              <button className="btn btn-sm btn-danger" onClick={() => del(detail.id)}>🗑️</button>
              <button className="btn btn-sm" onClick={() => { setSelected(null); setDetail(null); }}>✕</button>
            </div>
          </div>

          {/* Detail Tabs */}
          <div className="sub-tabs" style={{ marginBottom: 16, flexWrap: 'wrap' }}>
            {[
              ['info', '📋 基本資訊'],
              ['rundown', `🕐 Rundown (${rundown.length})`],
              ['performers', `🎤 出演名單 (${performers.length})`],
              ['payments', `💰 款項保證金 (${payments.length})`],
              ['sub', `📂 子活動 (${subEvents.length})`],
              ['budget', '📊 預算/收支'],
              ['progress', '📋 進度清單'],
              ['labor', '📝 勞報單'],
            ].map(([k, l]) => (
              <button key={k} className={`sub-tab ${detailTab === k ? 'active' : ''}`} onClick={() => setDetailTab(k)} style={{ fontSize: 12 }}>{l}</button>
            ))}
          </div>

          {/* Tab: Info */}
          {detailTab === 'info' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, fontSize: 13 }}>
              <div className="card" style={{ padding: 12 }}><div style={{ fontSize: 10, color: 'var(--c-text-muted)' }}>活動類型</div><div style={{ fontWeight: 600 }}>{detail.event_type || '活動'}</div></div>
              <div className="card" style={{ padding: 12 }}><div style={{ fontSize: 10, color: 'var(--c-text-muted)' }}>{t('events.date')}</div><div style={{ fontWeight: 600 }}>{(detail.event_date || '').slice(0,10)} {detail.event_end_date ? `~ ${detail.event_end_date.slice(0,10)}` : ''}</div></div>
              <div className="card" style={{ padding: 12 }}><div style={{ fontSize: 10, color: 'var(--c-text-muted)' }}>客戶</div><div style={{ fontWeight: 600 }}>{detail.customer_name || customers.find(c=>c.id===detail.customer_id)?.name || '—'}</div></div>
              <div className="card" style={{ padding: 12 }}><div style={{ fontSize: 10, color: 'var(--c-text-muted)' }}>負責人</div><div style={{ fontWeight: 600 }}>{detail.pm_name || users.find(u=>u.id===detail.pm_id)?.display_name || '—'}</div></div>
              <div className="card" style={{ padding: 12 }}><div style={{ fontSize: 10, color: 'var(--c-text-muted)' }}>報價金額</div><div style={{ fontWeight: 700, color: 'var(--c-primary)' }}>{FMT(detail.quote_amount)}</div></div>
              <div className="card" style={{ padding: 12 }}><div style={{ fontSize: 10, color: 'var(--c-text-muted)' }}>結案金額</div><div style={{ fontWeight: 700, color: 'var(--c-success)' }}>{detail.settlement_amount ? FMT(detail.settlement_amount) : '—'}</div></div>
              <div className="card" style={{ padding: 12 }}><div style={{ fontSize: 10, color: 'var(--c-text-muted)' }}>成本</div><div style={{ fontWeight: 700, color: 'var(--c-danger)' }}>{FMT(detail.cost_amount)}</div></div>
              <div className="card" style={{ padding: 12 }}><div style={{ fontSize: 10, color: 'var(--c-text-muted)' }}>發票狀態</div><div style={{ fontWeight: 600 }}>{detail.invoice_status || '未開'} {detail.invoice_no && `(${detail.invoice_no})`}</div></div>
              {detail.event_address && <div className="card" style={{ padding: 12, gridColumn: '1/-1' }}><div style={{ fontSize: 10, color: 'var(--c-text-muted)' }}>活動地址</div><div style={{ fontWeight: 600 }}>{detail.event_address}</div></div>}
              {detail.notes && <div className="card" style={{ padding: 12, gridColumn: '1/-1' }}><div style={{ fontSize: 10, color: 'var(--c-text-muted)' }}>備註</div><div>{detail.notes}</div></div>}
            </div>
          )}

          {/* Tab: Payments */}
          {detailTab === 'payments' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                <h4 style={{ fontSize: 14, fontWeight: 700 }}>💰 款項與保證金</h4>
                <button className="btn btn-sm btn-primary" onClick={() => { setShowPayForm(true); setPayForm({ payment_type: 'deposit', amount: 0, invoice_status: '未開' }); }}>+ 新增款項</button>
              </div>

              {payments.length === 0 ? (
                <div className="empty-state" style={{ padding: 30 }}><div className="empty-state-icon">💰</div><div className="empty-state-title">尚無款項記錄</div></div>
              ) : (
                <div style={{ display: 'grid', gap: 10 }}>
                  {payments.map(p => {
                    const pt = PAY_TYPES.find(t => t.key === p.payment_type) || PAY_TYPES[0];
                    return (
                      <div key={p.id} className="card" style={{ padding: 14 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                          <span style={{ fontWeight: 700, fontSize: 14 }}>{pt.label}</span>
                          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                            <span style={{ fontWeight: 700, fontSize: 16, color: 'var(--c-primary)' }}>{FMT(p.amount)}</span>
                            <button className="btn btn-sm btn-danger" onClick={() => deletePayment(p.id)} style={{ fontSize: 10 }}>🗑️</button>
                          </div>
                        </div>
                        {p.deposit_type && <div style={{ fontSize: 11, marginBottom: 6 }}><span className="badge badge-warning">{p.deposit_type}</span></div>}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: 12 }}>
                          <div>
                            <span style={{ color: 'var(--c-text-muted)', fontSize: 10 }}>預計日期</span>
                            <input type="date" className="form-input" value={p.expected_date || ''} onChange={e => updatePayField(p.id, 'expected_date', e.target.value)} style={{ fontSize: 11, padding: '4px 6px' }} />
                          </div>
                          <div>
                            <span style={{ color: 'var(--c-text-muted)', fontSize: 10 }}>實際日期</span>
                            <input type="date" className="form-input" value={p.actual_date || ''} onChange={e => updatePayField(p.id, 'actual_date', e.target.value)} style={{ fontSize: 11, padding: '4px 6px' }} />
                          </div>
                          <div>
                            <span style={{ color: 'var(--c-text-muted)', fontSize: 10 }}>發票狀態</span>
                            <select className="form-input" value={p.invoice_status || '未開'} onChange={e => updatePayField(p.id, 'invoice_status', e.target.value)} style={{ fontSize: 11, padding: '4px 6px' }}>
                              {INV_STATUS.map(s => <option key={s}>{s}</option>)}
                            </select>
                          </div>
                          <div>
                            <span style={{ color: 'var(--c-text-muted)', fontSize: 10 }}>發票號碼</span>
                            <input className="form-input" value={p.invoice_no || ''} onChange={e => updatePayField(p.id, 'invoice_no', e.target.value)} placeholder="發票號碼" style={{ fontSize: 11, padding: '4px 6px' }} />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Payment Form Modal */}
              {showPayForm && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.4)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <div className="card" style={{ width: 450, padding: 24 }}>
                    <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 14 }}>💰 新增款項</h3>
                    <div style={{ display: 'grid', gap: 10 }}>
                      <div className="form-group"><label className="form-label">款項類型</label>
                        <select className="form-input" value={payForm.payment_type} onChange={e => setPayForm({...payForm, payment_type: e.target.value})}>
                          {PAY_TYPES.map(t => <option key={t.key} value={t.key}>{t.label}</option>)}
                        </select>
                      </div>
                      <div className="form-group"><label className="form-label">金額</label><input type="number" className="form-input" value={payForm.amount || ''} onChange={e => setPayForm({...payForm, amount: Number(e.target.value)})} /></div>
                      {payForm.payment_type === 'guarantee' && (
                        <div className="form-group"><label className="form-label">保證金類型</label>
                          <select className="form-input" value={payForm.deposit_type || ''} onChange={e => setPayForm({...payForm, deposit_type: e.target.value})}>
                            <option value="">選擇...</option>
                            {DEPOSIT_TYPES.map(t => <option key={t}>{t}</option>)}
                          </select>
                        </div>
                      )}
                      <div className="form-group"><label className="form-label">預計日期</label><input type="date" className="form-input" value={payForm.expected_date || ''} onChange={e => setPayForm({...payForm, expected_date: e.target.value})} /></div>
                      <div className="form-group"><label className="form-label">備註</label><input className="form-input" value={payForm.notes || ''} onChange={e => setPayForm({...payForm, notes: e.target.value})} /></div>
                    </div>
                    <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 14 }}>
                      <button className="btn btn-secondary" onClick={() => setShowPayForm(false)}>取消</button>
                      <button className="btn btn-primary" onClick={addPayment}>建立</button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Tab: Sub Events */}
          {detailTab === 'sub' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                <h4 style={{ fontSize: 14, fontWeight: 700 }}>📂 子活動/分案</h4>
                <button className="btn btn-sm btn-primary" onClick={addSubEvent}>+ 新增子活動</button>
              </div>
              {subEvents.length === 0 ? (
                <div className="empty-state" style={{ padding: 30 }}><div className="empty-state-icon">📂</div><div className="empty-state-title">尚無子活動</div><p>可新增子活動來管理分案</p></div>
              ) : (
                <div style={{ display: 'grid', gap: 10 }}>
                  {subEvents.map(se => {
                    const st = STATUS_MAP[se.status] || STATUS_MAP.active;
                    return (
                      <div key={se.id} className="card" style={{ padding: 14, cursor: 'pointer' }} onClick={() => openDetail(se)}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div>
                            <div style={{ fontWeight: 700 }}>{se.name}</div>
                            <div style={{ fontSize: 11, color: 'var(--c-text-muted)' }}>{se.event_no} · {(se.event_date || '').slice(0,10)}</div>
                          </div>
                          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                            <span style={{ fontWeight: 700 }}>{FMT(se.quote_amount)}</span>
                            <span className="badge" style={{ background: st.bg, color: st.color, fontSize: 10 }}>{st.icon} {st.label}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Tab: Budget */}
          {detailTab === 'budget' && (
            <div>
              <h4 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>📊 預算與收支明細</h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
                <div className="card" style={{ padding: 14, textAlign: 'center' }}><div style={{ fontSize: 10, color: 'var(--c-text-muted)' }}>報價金額</div><div style={{ fontSize: 18, fontWeight: 700, color: 'var(--c-primary)' }}>{FMT(detail.quote_amount)}</div></div>
                <div className="card" style={{ padding: 14, textAlign: 'center' }}><div style={{ fontSize: 10, color: 'var(--c-text-muted)' }}>總成本</div><div style={{ fontSize: 18, fontWeight: 700, color: 'var(--c-danger)' }}>{FMT(detail.cost_amount)}</div></div>
                <div className="card" style={{ padding: 14, textAlign: 'center' }}><div style={{ fontSize: 10, color: 'var(--c-text-muted)' }}>毛利</div><div style={{ fontSize: 18, fontWeight: 700, color: 'var(--c-success)' }}>{FMT((detail.quote_amount||0) - (detail.cost_amount||0))}</div></div>
              </div>
              {detail.related_pos?.length > 0 && (
                <div style={{ marginTop: 16 }}>
                  <h5 style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>📦 關聯採購單</h5>
                  {detail.related_pos.map(po => (
                    <div key={po.id} className="card" style={{ padding: 10, marginBottom: 6, display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                      <span>{po.po_no} — {po.description || po.vendor_name}</span>
                      <span style={{ fontWeight: 700 }}>{FMT(po.amount)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Tab: Rundown 時間軸 */}
          {detailTab === 'rundown' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                <h4 style={{ fontSize: 14, fontWeight: 700 }}>🕐 Rundown 活動流程時間表</h4>
                <button className="btn btn-sm btn-primary" onClick={() => { setShowRundownForm(true); setRundownForm({ start_time: '', end_time: '', description: '', responsible: '', department: '', notes: '' }); }}>+ 新增流程</button>
              </div>
              {showRundownForm && (
                <div className="card" style={{ padding: 14, marginBottom: 12, border: '1px dashed var(--c-primary)' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 2fr 1fr 1fr', gap: 8 }}>
                    <div className="form-group"><label className="form-label">開始時間</label><input type="time" className="form-input" value={rundownForm.start_time} onChange={e => setRundownForm({...rundownForm, start_time: e.target.value})} /></div>
                    <div className="form-group"><label className="form-label">結束時間</label><input type="time" className="form-input" value={rundownForm.end_time} onChange={e => setRundownForm({...rundownForm, end_time: e.target.value})} /></div>
                    <div className="form-group"><label className="form-label">工作項目 *</label><input className="form-input" value={rundownForm.description} onChange={e => setRundownForm({...rundownForm, description: e.target.value})} /></div>
                    <div className="form-group"><label className="form-label">負責人</label><input className="form-input" value={rundownForm.responsible} onChange={e => setRundownForm({...rundownForm, responsible: e.target.value})} /></div>
                    <div className="form-group"><label className="form-label">部門</label><input className="form-input" value={rundownForm.department} onChange={e => setRundownForm({...rundownForm, department: e.target.value})} /></div>
                  </div>
                  <div className="form-group"><label className="form-label">備註</label><input className="form-input" value={rundownForm.notes || ''} onChange={e => setRundownForm({...rundownForm, notes: e.target.value})} /></div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button className="btn btn-sm btn-primary" onClick={async () => { await api.createRundownItem(selected.id, rundownForm); setShowRundownForm(false); const r = await api.getEventRundown(selected.id); setRundown(r || []); }}>建立</button>
                    <button className="btn btn-sm btn-secondary" onClick={() => setShowRundownForm(false)}>取消</button>
                  </div>
                </div>
              )}
              {rundown.length === 0 ? (
                <div className="card" style={{ padding: 30, textAlign: 'center', color: 'var(--c-text-muted)' }}>
                  <div style={{ fontSize: 32, marginBottom: 8 }}>🕐</div>
                  <div>尚無 Rundown 流程</div>
                  <div style={{ fontSize: 12, marginTop: 4 }}>點擊「+ 新增流程」開始規劃活動時間軸</div>
                </div>
              ) : (
                <div style={{ position: 'relative', paddingLeft: 20 }}>
                  <div style={{ position: 'absolute', left: 8, top: 0, bottom: 0, width: 2, background: 'var(--c-primary)', opacity: 0.2 }} />
                  {rundown.map((item, i) => (
                    <div key={item.id} style={{ position: 'relative', marginBottom: 12, paddingLeft: 20 }}>
                      <div style={{ position: 'absolute', left: -16, top: 6, width: 10, height: 10, borderRadius: '50%', background: 'var(--c-primary)', border: '2px solid white', boxShadow: '0 0 0 2px var(--c-primary)' }} />
                      <div className="card" style={{ padding: '12px 16px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <span style={{ fontFamily: 'monospace', fontSize: 13, fontWeight: 700, color: 'var(--c-primary)' }}>{item.start_time}{item.end_time ? ` - ${item.end_time}` : ''}</span>
                            <span style={{ fontWeight: 600, fontSize: 14 }}>{item.description}</span>
                          </div>
                          <button className="btn btn-sm btn-danger" style={{ fontSize: 10, padding: '2px 6px' }} onClick={async () => { await api.deleteRundownItem(selected.id, item.id); const r = await api.getEventRundown(selected.id); setRundown(r || []); }}>✕</button>
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--c-text-muted)', marginTop: 4 }}>
                          {item.responsible && <span>👤 {item.responsible}</span>}
                          {item.department && <span style={{ marginLeft: 8 }}>🏢 {item.department}</span>}
                          {item.notes && <span style={{ marginLeft: 8 }}>📝 {item.notes}</span>}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Tab: Performers 出演人員 */}
          {detailTab === 'performers' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                <h4 style={{ fontSize: 14, fontWeight: 700 }}>🎤 出演人員名單</h4>
                <button className="btn btn-sm btn-primary" onClick={() => { setShowPerformerForm(true); setPerformerForm({ role_type: '主持人', name: '', contact: '', fee: '', confirm_status: '已邀請', notes: '' }); }}>+ 新增人員</button>
              </div>
              {showPerformerForm && (
                <div className="card" style={{ padding: 14, marginBottom: 12, border: '1px dashed var(--c-primary)' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr 1fr', gap: 8 }}>
                    <div className="form-group"><label className="form-label">角色</label>
                      <select className="form-select" value={performerForm.role_type} onChange={e => setPerformerForm({...performerForm, role_type: e.target.value})}>
                        {['主持人', '表演者', '嘉賓', '工作人員', '其他'].map(r => <option key={r}>{r}</option>)}
                      </select>
                    </div>
                    <div className="form-group"><label className="form-label">姓名 *</label><input className="form-input" value={performerForm.name} onChange={e => setPerformerForm({...performerForm, name: e.target.value})} /></div>
                    <div className="form-group"><label className="form-label">聯絡方式</label><input className="form-input" value={performerForm.contact} onChange={e => setPerformerForm({...performerForm, contact: e.target.value})} /></div>
                    <div className="form-group"><label className="form-label">費用</label><input type="number" className="form-input" value={performerForm.fee} onChange={e => setPerformerForm({...performerForm, fee: e.target.value})} /></div>
                    <div className="form-group"><label className="form-label">確認狀態</label>
                      <select className="form-select" value={performerForm.confirm_status} onChange={e => setPerformerForm({...performerForm, confirm_status: e.target.value})}>
                        {['已邀請', '已確認', '已簽約', '已取消'].map(s => <option key={s}>{s}</option>)}
                      </select>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button className="btn btn-sm btn-primary" onClick={async () => { await api.createPerformer(selected.id, {...performerForm, fee: Number(performerForm.fee) || 0}); setShowPerformerForm(false); const p = await api.getEventPerformers(selected.id); setPerformers(p || []); }}>建立</button>
                    <button className="btn btn-sm btn-secondary" onClick={() => setShowPerformerForm(false)}>取消</button>
                  </div>
                </div>
              )}
              {performers.length === 0 ? (
                <div className="card" style={{ padding: 30, textAlign: 'center', color: 'var(--c-text-muted)' }}>
                  <div style={{ fontSize: 32, marginBottom: 8 }}>🎤</div>
                  <div>尚無出演人員</div>
                  <div style={{ fontSize: 12, marginTop: 4 }}>點擊「+ 新增人員」登記主持人、表演者</div>
                </div>
              ) : (
                <div className="table-wrap">
                  <table>
                    <thead><tr><th>角色</th><th>姓名</th><th>聯絡方式</th><th>費用</th><th>狀態</th><th>操作</th></tr></thead>
                    <tbody>{performers.map(p => {
                      const ROLE_COLORS = { '主持人': 'var(--c-primary)', '表演者': 'var(--c-success)', '嘉賓': 'var(--c-warning)', '工作人員': 'var(--c-info)' };
                      const CONFIRM_COLORS = { '已邀請': 'badge-warning', '已確認': 'badge-primary', '已簽約': 'badge-success', '已取消': 'badge-danger' };
                      return (
                        <tr key={p.id}>
                          <td><span style={{ color: ROLE_COLORS[p.role_type] || 'var(--c-text)', fontWeight: 700 }}>{p.role_type}</span></td>
                          <td style={{ fontWeight: 600 }}>{p.name}</td>
                          <td style={{ fontSize: 12 }}>{p.contact || '-'}</td>
                          <td style={{ fontWeight: 600 }}>{p.fee > 0 ? FMT(p.fee) : '-'}</td>
                          <td><span className={`badge ${CONFIRM_COLORS[p.confirm_status] || ''}`}>{p.confirm_status}</span></td>
                          <td><button className="btn btn-sm btn-danger" style={{ fontSize: 10, padding: '2px 6px' }} onClick={async () => { await api.deletePerformer(selected.id, p.id); const pf = await api.getEventPerformers(selected.id); setPerformers(pf || []); }}>🗑️</button></td>
                        </tr>
                      );
                    })}</tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Tab: Progress */}
          {detailTab === 'progress' && (
            <div>
              <h4 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>📋 進度清單</h4>
              <div className="card" style={{ padding: 20, textAlign: 'center', color: 'var(--c-text-muted)' }}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>📋</div>
                <div>進度清單已整合至專案管理模組</div>
                <div style={{ fontSize: 12, marginTop: 4 }}>請前往「進度清單」頁面管理此活動的任務</div>
              </div>
            </div>
          )}

          {/* Tab: Labor */}
          {detailTab === 'labor' && (
            <div>
              <h4 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>📝 勞報單明細</h4>
              {detail.related_labors?.length > 0 ? (
                detail.related_labors.map(lr => (
                  <div key={lr.id} className="card" style={{ padding: 12, marginBottom: 8, display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                    <div><div style={{ fontWeight: 700 }}>{lr.report_no}</div><div style={{ fontSize: 11, color: 'var(--c-text-muted)' }}>{lr.event_date} · {lr.worker_count || 0} 人</div></div>
                    <div style={{ fontWeight: 700, color: 'var(--c-primary)' }}>{FMT(lr.total_amount)}</div>
                  </div>
                ))
              ) : (
                <div className="card" style={{ padding: 20, textAlign: 'center', color: 'var(--c-text-muted)' }}>
                  <div style={{ fontSize: 32, marginBottom: 8 }}>📝</div>
                  <div>尚無勞報單</div>
                  <div style={{ fontSize: 12, marginTop: 4 }}>請前往「勞報單」頁面建立</div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>

    {/* Add/Edit Modal */}
    {showAdd && (
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.4)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="card" style={{ width: 620, maxHeight: '85vh', overflow: 'auto', padding: 24, animation: 'fadeUp 0.3s ease' }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 14 }}>🎪 {selected ? '編輯活動' : form.parent_event_id ? '新增子活動' : '新增活動'}</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div className="form-group" style={{ gridColumn: '1 / -1' }}><label className="form-label">{t('events.name')}</label><input className="form-input" value={form.name || ''} onChange={set('name')} /></div>
            <div className="form-group"><label className="form-label">活動開始日期</label><input type="date" className="form-input" value={form.event_date || ''} onChange={set('event_date')} /></div>
            <div className="form-group"><label className="form-label">活動結束日期</label><input type="date" className="form-input" value={form.event_end_date || ''} onChange={set('event_end_date')} /></div>
            <div className="form-group"><label className="form-label">類型</label><select className="form-input" value={form.event_type || '活動'} onChange={set('event_type')}>{EVENT_TYPES.map(t => <option key={t}>{t}</option>)}</select></div>
            <div className="form-group"><label className="form-label">客戶</label><select className="form-input" value={form.customer_id || ''} onChange={set('customer_id')}><option value="">--</option>{customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
            <div className="form-group"><label className="form-label">負責人</label><select className="form-input" value={form.pm_id || ''} onChange={set('pm_id')}><option value="">--</option>{users.map(u => <option key={u.id} value={u.id}>{u.display_name}</option>)}</select></div>
            <div className="form-group">
              <label className="form-label">📝 關聯報價單（自動帶入金額）</label>
              <select className="form-input" value={form.proposal_id || ''} onChange={set('proposal_id')}>
                <option value="">不關聯報價單</option>
                {proposals.map(p => <option key={p.id} value={p.id}>{p.title} ({FMT(p.total_with_tax || p.total_amount)})</option>)}
              </select>
            </div>
            <div className="form-group"><label className="form-label">報價金額</label><input type="number" className="form-input" value={form.quote_amount || ''} onChange={set('quote_amount')} /></div>
            <div className="form-group"><label className="form-label">結案金額</label><input type="number" className="form-input" value={form.settlement_amount || ''} onChange={set('settlement_amount')} /></div>
            <div className="form-group"><label className="form-label">成本金額</label><input type="number" className="form-input" value={form.cost_amount || ''} onChange={set('cost_amount')} /></div>
            <div className="form-group"><label className="form-label">發票狀況</label><select className="form-input" value={form.invoice_status || '未開'} onChange={set('invoice_status')}>{INV_STATUS.map(s => <option key={s}>{s}</option>)}</select></div>
            <div className="form-group" style={{ gridColumn: '1/-1' }}><label className="form-label">活動地址</label><input className="form-input" value={form.event_address || ''} onChange={set('event_address')} /></div>
            <div className="form-group" style={{ gridColumn: '1/-1' }}><label className="form-label">📋 問卷調查連結（結案必要）</label><input className="form-input" value={form.survey_url || ''} onChange={set('survey_url')} placeholder="https://forms.gle/..." /></div>
          </div>
          <div className="form-group" style={{ marginTop: 8 }}><label className="form-label">備註</label><textarea className="form-input" value={form.notes || ''} onChange={set('notes')} rows={2} /></div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 14 }}>
            <button className="btn btn-secondary" onClick={() => { setShowAdd(false); setSelected(null); }}>取消</button>
            <button className="btn btn-primary" onClick={save}>儲存</button>
          </div>
        </div>
      </div>
    )}
  </>);
}
