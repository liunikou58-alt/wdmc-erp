import { useState, useEffect, useCallback } from 'react'
import { api } from '../api'

const FMT = n => `$${Number(n || 0).toLocaleString()}`;
const TABS = [
  { key: 'event', label: '🪇 活動請付款', type: 'event_payment' },
  { key: 'company', label: '🔖 公司請付款', type: 'company_payment' },
  { key: 'petty', label: '💵 零用金', type: 'petty_cash' },
  { key: 'proof', label: '🏷️ 支出證明', type: 'expense_proof' },
];
const PAY_METHODS = ['匯款(瓦當麥可）', '匯款(瓦當硬體）', '現金(瓦當麥可）', '現金(瓦當硬體）', '刷卡'];
const INVOICE_STATUSES = ['未處理', '已收發票', '不需發票', '已開'];
const CURRENCIES = ['新台幣', '人民幣', '美金'];

// 4-stage approval
const STAGES = [
  { key: 'submitted', label: '📝 已提交', color: '#dbeafe', text: '#1d4ed8' },
  { key: 'manager_approved', label: '👔 主管已核', color: '#fef3c7', text: '#92400e' },
  { key: 'accountant_approved', label: '🧮 會計已核', color: '#ede9fe', text: '#7c3aed' },
  { key: 'paid', label: '✅ 已付款', color: '#dcfce7', text: '#166534' },
  { key: 'rejected', label: '❌ 退回', color: '#fee2e2', text: '#991b1b' },
];
const STAGE_MAP = {};
STAGES.forEach(s => STAGE_MAP[s.key] = s);

export default function Payments() {
  const [tab, setTab] = useState('event');
  const [payments, setPayments] = useState([]);
  const [proofs, setProofs] = useState([]);
  const [stats, setStats] = useState({});
  const [showAdd, setShowAdd] = useState(false);
  const [selected, setSelected] = useState(null);
  const [projects, setProjects] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [form, setForm] = useState({});

  const load = useCallback(() => {
    api.getPayments().then(setPayments).catch(() => {});
    api.getPaymentStats().then(setStats).catch(() => {});
    api.getExpenseProofs().then(setProofs).catch(() => {});
    api.getProjects().then(setProjects).catch(() => {});
    api.getVendors().then(setVendors).catch(() => {});
  }, []);

  useEffect(() => { load(); }, [load]);

  const currentItems = tab === 'proof' ? proofs :
    payments.filter(p => {
      if (tab === 'event') return p.type === 'event_payment';
      if (tab === 'company') return p.type === 'company_payment';
      if (tab === 'petty') return p.type === 'petty_cash';
      return true;
    });

  const create = async () => {
    if (tab === 'proof') {
      await api.createExpenseProof({ ...form, amount: Number(form.amount) || 0 });
    } else {
      await api.createPayment({
        ...form,
        type: TABS.find(t => t.key === tab)?.type || 'event_payment',
        amount: Number(form.amount) || 0,
        tax_amount: Math.round((Number(form.amount) || 0) * 0.05),
        total_with_tax: Math.round((Number(form.amount) || 0) * 1.05),
      });
    }
    setShowAdd(false); setForm({}); load();
  };

  const advanceStage = async (p) => {
    const next = {
      submitted: 'manager_approved',
      manager_approved: 'accountant_approved',
      accountant_approved: 'paid',
    }[p.status];
    if (!next) return;
    if (next === 'paid') {
      await api.markPaymentPaid(p.id);
    } else {
      await api.approvePayment(p.id);
      // Custom status update for multi-stage
      await api.updatePayment?.(p.id, { status: next }).catch(() => {});
    }
    load();
    if (selected?.id === p.id) setSelected({ ...selected, status: next });
  };

  const rejectPayment = async (p) => {
    await api.rejectPayment(p.id);
    load();
  };

  const tabStats = {
    event: payments.filter(p => p.type === 'event_payment').length,
    company: payments.filter(p => p.type === 'company_payment').length,
    petty: payments.filter(p => p.type === 'petty_cash').length,
    proof: proofs.length,
  };

  return (<>
    <div className="page-header">
      <div><h1 className="page-title">💰 請付款 / 零用金</h1><p className="page-subtitle">多階段簽核: 申請→主管→會計→付款 | 發票追蹤 | 匯款資訊</p></div>
      <div style={{ display: 'flex', gap: 6 }}>
        <button className="btn btn-primary" onClick={() => { setShowAdd(true); setForm({}); }}>➕ 新增</button>
        <a href={api.exportVendorSettlement()} target="_blank" rel="noreferrer" className="btn">📊 月結對帳</a>
      </div>
    </div>

    {/* KPI */}
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12, marginBottom: 16 }}>
      {[
        { label: '總申請', value: stats.total || 0, icon: '📋' },
        { label: '待審核', value: stats.pending || 0, icon: '⏳', color: '#f59e0b' },
        { label: '已付款', value: stats.paid || 0, icon: '✅', color: '#10b981' },
        { label: '待付金額', value: FMT(stats.pending_amount), icon: '💸', color: '#ef4444' },
        { label: '已付金額', value: FMT(stats.paid_amount), icon: '🏦' },
      ].map((k, i) => (
        <div key={i} className="stat-card"><div className="stat-label">{k.icon} {k.label}</div><div className="stat-value" style={{ color: k.color, fontSize: 16 }}>{k.value}</div></div>
      ))}
    </div>

    {/* Tabs */}
    <div style={{ display: 'flex', gap: 4, marginBottom: 16, background: 'var(--c-bg-elevated)', borderRadius: 8, padding: 3, width: 'fit-content' }}>
      {TABS.map(t => (
        <button key={t.key} onClick={() => setTab(t.key)} style={{
          padding: '6px 14px', fontSize: 12, fontWeight: 600, border: 'none', cursor: 'pointer', borderRadius: 6,
          background: tab === t.key ? 'var(--c-primary)' : 'transparent',
          color: tab === t.key ? '#fff' : 'inherit',
        }}>{t.label} ({tabStats[t.key]})</button>
      ))}
    </div>

    {/* 主表格 */}
    <div className="card" style={{ overflow: 'auto' }}>
      <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
        <thead><tr style={{ background: 'var(--c-bg-elevated)', textAlign: 'left' }}>
          <th style={TH}>單號</th>
          <th style={TH}>{tab === 'proof' ? '日期' : '活動/專案'}</th>
          <th style={TH}>{tab === 'proof' ? '用途' : '廠商/對象'}</th>
          <th style={TH}>內容</th>
          <th style={{...TH, textAlign:'right'}}>小計</th>
          <th style={{...TH, textAlign:'right'}}>稅金</th>
          <th style={{...TH, textAlign:'right'}}>總計</th>
          <th style={TH}>簽核狀態</th>
          <th style={TH}>支付</th>
          <th style={{...TH, textAlign:'center'}}>操作</th>
        </tr></thead>
        <tbody>
          {currentItems.map(p => {
            const stage = STAGE_MAP[p.status] || STAGE_MAP[p.reimbursement_status] || STAGE_MAP.submitted;
            return (
              <tr key={p.id} style={{ borderBottom: '1px solid var(--c-border)', cursor: 'pointer' }} onClick={() => setSelected(p)}>
                <td style={TD}><span style={{ fontFamily: 'monospace', fontSize: 10, color: 'var(--c-primary)' }}>{p.request_no || p.proof_no || '—'}</span></td>
                <td style={{...TD, maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'}}>{p.event_name || p.project_name || p.expense_date || '—'}</td>
                <td style={TD}>{p.vendor_name || p.payee_name || p.reporter_name || '—'}</td>
                <td style={{...TD, maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'}}>{p.reason || p.purpose || '—'}</td>
                <td style={{...TD, textAlign:'right'}}>{FMT(p.amount)}</td>
                <td style={{...TD, textAlign:'right', color:'#f59e0b'}}>{FMT(p.tax_amount)}</td>
                <td style={{...TD, textAlign:'right', fontWeight:700}}>{FMT(p.total_with_tax || p.amount)}</td>
                <td style={TD}><span style={{ padding: '2px 8px', borderRadius: 6, fontSize: 10, background: stage.color, color: stage.text, fontWeight: 600 }}>{stage.label}</span></td>
                <td style={TD}>{p.payment_method || '—'}</td>
                <td style={{...TD, textAlign:'center'}}>
                  {(p.status === 'submitted' || p.status === 'manager_approved' || p.status === 'accountant_approved') && (
                    <button className="btn btn-sm btn-primary" onClick={e => { e.stopPropagation(); advanceStage(p); }} style={{ fontSize: 10, padding: '2px 6px' }}>✅ 核准</button>
                  )}
                  {p.status === 'submitted' && (
                    <button className="btn btn-sm" onClick={e => { e.stopPropagation(); rejectPayment(p); }} style={{ fontSize: 10, padding: '2px 6px', marginLeft: 4 }}>❌</button>
                  )}
                </td>
              </tr>
            );
          })}
          {!currentItems.length && <tr><td colSpan={10} style={{ textAlign: 'center', padding: 30, color: 'var(--c-text-muted)' }}>尚無資料</td></tr>}
        </tbody>
      </table>
    </div>

    {/* === 明細側面板 === */}
    {selected && (
      <div style={{ position: 'fixed', top: 0, right: 0, width: 500, height: '100vh', background: 'var(--c-bg)', boxShadow: '-4px 0 20px rgba(0,0,0,.15)', zIndex: 1000, overflow: 'auto', padding: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <h2 style={{ fontSize: 15, fontWeight: 700 }}>💰 {selected.request_no || selected.proof_no}</h2>
          <button onClick={() => setSelected(null)} style={{ background: 'none', border: 'none', fontSize: 18, cursor: 'pointer' }}>✕</button>
        </div>

        {/* 簽核流程 */}
        <div className="card" style={{ padding: 14, marginBottom: 14 }}>
          <h4 style={{ fontSize: 13, fontWeight: 600, marginBottom: 10 }}>📋 簽核流程</h4>
          <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
            {['submitted','manager_approved','accountant_approved','paid'].map((s, i) => {
              const active = STAGES.findIndex(x => x.key === selected.status) >= i;
              const stage = STAGES[i];
              return (
                <div key={s} style={{ flex: 1, display: 'flex', alignItems: 'center' }}>
                  <div style={{
                    flex: 1, padding: '6px 4px', borderRadius: 6, fontSize: 10, fontWeight: 600, textAlign: 'center',
                    background: active ? stage.color : '#f1f5f9',
                    color: active ? stage.text : '#94a3b8',
                  }}>{stage.label}</div>
                  {i < 3 && <div style={{ width: 16, textAlign: 'center', fontSize: 10, color: '#94a3b8' }}>→</div>}
                </div>
              );
            })}
          </div>
          <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
            {selected.status !== 'paid' && selected.status !== 'rejected' && (
              <button className="btn btn-sm btn-primary" onClick={() => advanceStage(selected)}>✅ 核准 (下一步)</button>
            )}
            {selected.status === 'submitted' && (
              <button className="btn btn-sm" onClick={() => rejectPayment(selected)} style={{ color: '#ef4444' }}>❌ 退回</button>
            )}
          </div>
        </div>

        {/* 付款資訊 */}
        <div className="card" style={{ padding: 14, marginBottom: 14 }}>
          <h4 style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>💳 付款資訊</h4>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, fontSize: 12 }}>
            <div>活動: <b>{selected.event_name || selected.project_name || '—'}</b></div>
            <div>廠商: <b>{selected.vendor_name || selected.payee_name || '—'}</b></div>
            <div>支付方式: <b>{selected.payment_method || '—'}</b></div>
            <div>幣別: <b>{selected.currency || '新台幣'}</b></div>
            <div>申請人: <b>{selected.applicant_name || '—'}</b></div>
            <div>申請日期: <b>{(selected.created_at || '').slice(0,10)}</b></div>
            <div>預計匯款: <b>{selected.expected_pay_date || '—'}</b></div>
            <div>實際匯款: <b style={{ color: selected.actual_pay_date ? '#10b981' : '#f59e0b' }}>{selected.actual_pay_date || '未付'}</b></div>
          </div>
        </div>

        {/* 金額 */}
        <div className="card" style={{ padding: 14, marginBottom: 14 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, fontSize: 12 }}>
            <div>小計:</div><div style={{ textAlign: 'right', fontWeight: 600 }}>{FMT(selected.amount)}</div>
            <div>稅金:</div><div style={{ textAlign: 'right', color: '#f59e0b' }}>{FMT(selected.tax_amount)}</div>
            <div style={{ fontWeight: 700, fontSize: 14 }}>總計:</div><div style={{ textAlign: 'right', fontWeight: 700, fontSize: 14 }}>{FMT(selected.total_with_tax || selected.amount)}</div>
            {selected.deposit_amount > 0 && <>
              <div>押金/保證金:</div><div style={{ textAlign: 'right', color: '#6366f1' }}>{FMT(selected.deposit_amount)}</div>
            </>}
          </div>
        </div>

        {/* 發票追蹤 */}
        <div className="card" style={{ padding: 14 }}>
          <h4 style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>🧾 發票資訊</h4>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, fontSize: 12 }}>
            <div>發票號碼: <b>{selected.invoice_no || '—'}</b></div>
            <div>發票日期: <b>{selected.invoice_date || '—'}</b></div>
            <div>發票抬頭: <b>{selected.invoice_title || '—'}</b></div>
            <div>統編: <b>{selected.invoice_tax_id || '—'}</b></div>
            <div>銷售額: <b>{FMT(selected.invoice_subtotal)}</b></div>
            <div>稅額: <b>{FMT(selected.invoice_tax)}</b></div>
          </div>
        </div>
      </div>
    )}

    {/* 新增表單 */}
    {showAdd && (
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.4)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="card" style={{ width: 520, maxHeight: '80vh', overflow: 'auto', padding: 24 }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 14 }}>💰 新增{TABS.find(t => t.key === tab)?.label}</h3>
          {[
            ['event_name', '活動名稱', 'text'],
            ['vendor_name', '廠商/對象', 'text'],
            ['reason', '內容/事由', 'text'],
            ['payment_method', '支付方式', 'select', PAY_METHODS],
            ['amount', '小計 (未稅)', 'number'],
            ['currency', '幣別', 'select', CURRENCIES],
            ['expected_pay_date', '預計匯款日期', 'date'],
            ['invoice_no', '發票號碼', 'text'],
            ['invoice_title', '發票抬頭', 'text'],
            ['invoice_tax_id', '統編', 'text'],
            ['deposit_amount', '押金/保證金', 'number'],
            ['note', '備註', 'textarea'],
          ].map(([key, label, type, opts]) => (
            <div key={key} style={{ marginBottom: 8 }}>
              <label style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 2 }}>{label}</label>
              {type === 'select' ? (
                <select className="form-input" value={form[key] || ''} onChange={e => setForm(f => ({...f, [key]: e.target.value}))} style={{ width: '100%', fontSize: 12 }}>
                  <option value="">選擇...</option>
                  {(opts || []).map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              ) : type === 'textarea' ? (
                <textarea className="form-input" value={form[key] || ''} onChange={e => setForm(f => ({...f, [key]: e.target.value}))} rows={2} style={{ width: '100%', fontSize: 12 }} />
              ) : (
                <input className="form-input" type={type} value={form[key] || ''} onChange={e => setForm(f => ({...f, [key]: type === 'number' ? Number(e.target.value) : e.target.value}))} style={{ width: '100%', fontSize: 12 }} />
              )}
            </div>
          ))}
          <div style={{ fontSize: 12, padding: 8, background: '#f0fdf4', borderRadius: 6, marginBottom: 10 }}>
            稅金 (5%): <b>{FMT(Math.round((Number(form.amount) || 0) * 0.05))}</b> | 
            總計: <b>{FMT(Math.round((Number(form.amount) || 0) * 1.05))}</b>
          </div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button className="btn" onClick={() => setShowAdd(false)}>取消</button>
            <button className="btn btn-primary" onClick={create}>提交申請</button>
          </div>
        </div>
      </div>
    )}
  </>);
}

const TH = { padding: '8px 6px', fontSize: 10, fontWeight: 600, color: 'var(--c-text-muted)', borderBottom: '2px solid var(--c-border)' };
const TD = { padding: '8px 6px' };
