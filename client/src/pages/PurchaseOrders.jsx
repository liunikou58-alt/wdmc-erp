import { useState, useEffect, useCallback } from 'react'
import { api } from '../api'

const FMT = n => `$${Number(n || 0).toLocaleString()}`;
const PO_STATUSES = ['訂購中', '尚未訂購', '已確認', '已結案'];
const PAY_METHODS = ['匯款(瓦當麥可）','匯款(瓦當硬體）','現金(瓦當麥可）','現金(瓦當硬體）','刷卡','Michael代墊'];
const VOUCHER_TYPES = ['發票', '勞報單', '收據', '支出證明單'];
const ST_COLORS = {
  '訂購中': { bg: '#fef3c7', color: '#92400e' },
  '尚未訂購': { bg: '#fee2e2', color: '#991b1b' },
  '已確認': { bg: '#dcfce7', color: '#166534' },
  '已結案': { bg: '#f1f5f9', color: '#475569' },
};

export default function PurchaseOrders() {
  const [pos, setPOs] = useState([]);
  const [stats, setStats] = useState({});
  const [selected, setSelected] = useState(null);
  const [items, setItems] = useState([]);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({});
  const [vendors, setVendors] = useState([]);
  const [filter, setFilter] = useState('all');

  const load = useCallback(async () => {
    const [p, s, v] = await Promise.all([
      api.getPurchaseOrders(), api.getPOStats(), api.getVendors().catch(() => [])
    ]);
    setPOs(p || []); setStats(s || {}); setVendors(v || []);
  }, []);

  useEffect(() => { load(); }, [load]);

  const openDetail = async (po) => {
    setSelected(po);
    const its = await api.getPOItems(po.id).catch(() => []);
    setItems(its || []);
  };

  const create = async () => {
    await api.createPO(form);
    setShowAdd(false); setForm({}); load();
  };

  const addItem = async () => {
    if (!selected) return;
    await api.createPOItem(selected.id, { item: '新項目', qty: 1, unit: '式', unit_price: 0 });
    const its = await api.getPOItems(selected.id);
    setItems(its || []);
  };

  const toPayment = async () => {
    if (!selected) return;
    await api.poToPayment(selected.id);
    alert('已拋轉請付款！');
    load();
  };

  const toPL = async () => {
    if (!selected) return;
    await api.poToPL(selected.id);
    alert('已連結損益表！');
  };

  const filtered = pos.filter(p => filter === 'all' || p.status === filter);

  return (<>
    <div className="page-header">
      <div><h1 className="page-title">🧮 活動採購單</h1><p className="page-subtitle">PO管理 · 廠商連結 · 拋轉請付款 · 連結損益</p></div>
      <button className="btn btn-primary" onClick={() => { setShowAdd(true); setForm({ status: '訂購中', tax_rate: 0 }); }}>➕ 新增採購單</button>
    </div>

    {/* KPI */}
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12, marginBottom: 16 }}>
      {[
        { label: '總採購', value: stats.total || 0, icon: '📦' },
        { label: '訂購中', value: stats.ordering || 0, icon: '🔄', color: '#f59e0b' },
        { label: '已確認', value: stats.confirmed || 0, icon: '✅', color: '#10b981' },
        { label: '已結案', value: stats.closed || 0, icon: '🏁' },
        { label: '總金額', value: FMT(stats.total_amount), icon: '💰' },
      ].map((k, i) => (
        <div key={i} className="stat-card"><div className="stat-label">{k.icon} {k.label}</div><div className="stat-value" style={{ color: k.color, fontSize: 15 }}>{k.value}</div></div>
      ))}
    </div>

    {/* 篩選 */}
    <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
      {[['all','全部'],...PO_STATUSES.map(s=>[s,s])].map(([k,l]) => (
        <button key={k} onClick={() => setFilter(k)} className={`btn btn-sm ${filter === k ? 'btn-primary' : ''}`} style={{ fontSize: 11 }}>{l}</button>
      ))}
    </div>

    {/* 主表 */}
    <div className="card" style={{ overflow: 'auto' }}>
      <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
        <thead><tr style={{ background: 'var(--c-bg-elevated)', textAlign: 'left' }}>
          <th style={TH}>PO 編號</th><th style={TH}>採購日期</th><th style={TH}>採購人</th>
          <th style={TH}>活動名稱</th><th style={TH}>廠商</th>
          <th style={{...TH,textAlign:'right'}}>小計</th><th style={{...TH,textAlign:'right'}}>稅額</th>
          <th style={{...TH,textAlign:'right'}}>合計</th><th style={TH}>支付方式</th>
          <th style={TH}>狀態</th><th style={TH}>拋轉</th>
        </tr></thead>
        <tbody>{filtered.map(po => {
          const stc = ST_COLORS[po.status] || ST_COLORS['訂購中'];
          return (
            <tr key={po.id} style={{ borderBottom: '1px solid var(--c-border)', cursor: 'pointer' }} onClick={() => openDetail(po)}>
              <td style={TD}><span style={{ fontFamily: 'monospace', fontSize: 10, color: 'var(--c-primary)' }}>{po.po_no}</span></td>
              <td style={TD}>{(po.purchase_date || po.created_at || '').slice(0,10)}</td>
              <td style={TD}>{po.purchaser || '—'}</td>
              <td style={{...TD, fontWeight: 600, maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'}}>{po.event_name || '—'}</td>
              <td style={TD}>{po.vendor_name || '—'}</td>
              <td style={{...TD, textAlign:'right'}}>{FMT(po.subtotal)}</td>
              <td style={{...TD, textAlign:'right', color:'#f59e0b'}}>{FMT(po.tax_amount)}</td>
              <td style={{...TD, textAlign:'right', fontWeight:700}}>{FMT(po.total)}</td>
              <td style={{...TD, fontSize: 10}}>{po.payment_method || '—'}</td>
              <td style={TD}><span style={{ padding: '2px 8px', borderRadius: 6, fontSize: 10, background: stc.bg, color: stc.color, fontWeight: 600 }}>{po.status}</span></td>
              <td style={TD}>{po.payment_created ? '✅' : ''}</td>
            </tr>
          );
        })}</tbody>
      </table>
    </div>

    {/* 側面板 */}
    {selected && (
      <div style={{ position: 'fixed', top: 0, right: 0, width: 620, height: '100vh', background: 'var(--c-bg)', boxShadow: '-4px 0 20px rgba(0,0,0,.15)', zIndex: 1000, overflow: 'auto', padding: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <h2 style={{ fontSize: 15, fontWeight: 700 }}>🧮 {selected.po_no}</h2>
          <div style={{ display: 'flex', gap: 6 }}>
            <button className="btn btn-sm btn-primary" onClick={toPayment}>💰 拋轉請付款</button>
            <button className="btn btn-sm" onClick={toPL}>📈 連結損益</button>
            <button onClick={() => setSelected(null)} style={{ background: 'none', border: 'none', fontSize: 18, cursor: 'pointer' }}>✕</button>
          </div>
        </div>

        {/* 採購資訊 */}
        <div className="card" style={{ padding: 12, marginBottom: 12 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, fontSize: 12 }}>
            <div>活動: <b>{selected.event_name || '—'}</b></div>
            <div>活動日期: <b>{selected.event_date || '—'}</b></div>
            <div>廠商: <b>{selected.vendor_name || '—'}</b></div>
            <div>統編: <b>{selected.vendor_tax_id || '—'}</b></div>
            <div>採購人: <b>{selected.purchaser || '—'}</b></div>
            <div>狀態: <b>{selected.status}</b></div>
            <div>原始憑證: <b>{selected.voucher_type || '—'}</b></div>
            <div>支付方式: <b>{selected.payment_method || '—'}</b></div>
            <div>付款條件: <b>{selected.payment_terms || '—'}</b></div>
            <div>預計付款: <b>{selected.expected_pay_date || '—'}</b></div>
          </div>
        </div>

        {/* 明細 */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
          <h4 style={{ fontSize: 13, fontWeight: 600 }}>📋 採購明細 ({items.length} 項)</h4>
          <button className="btn btn-sm btn-primary" onClick={addItem}>+ 新增</button>
        </div>
        <div className="card" style={{ overflow: 'auto', marginBottom: 12 }}>
          <table style={{ width: '100%', fontSize: 11, borderCollapse: 'collapse' }}>
            <thead><tr style={{ background: 'var(--c-bg-elevated)' }}>
              <th style={TH}>項目</th><th style={{...TH,width:40}}>數量</th><th style={TH}>單位</th>
              <th style={{...TH,textAlign:'right'}}>單價</th><th style={{...TH,textAlign:'right'}}>金額</th>
            </tr></thead>
            <tbody>{items.map(it => (
              <tr key={it.id} style={{ borderBottom: '1px solid var(--c-border)' }}>
                <td style={TD}>{it.item || '—'}</td>
                <td style={TD}>{it.qty}</td>
                <td style={TD}>{it.unit || '式'}</td>
                <td style={{...TD, textAlign:'right'}}>{FMT(it.unit_price)}</td>
                <td style={{...TD, textAlign:'right', fontWeight:600}}>{FMT(it.amount)}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>

        {/* 金額 */}
        <div className="card" style={{ padding: 12 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, fontSize: 12 }}>
            <div>小計:</div><div style={{ textAlign: 'right' }}>{FMT(selected.subtotal)}</div>
            <div>稅額:</div><div style={{ textAlign: 'right', color: '#f59e0b' }}>{FMT(selected.tax_amount)}</div>
            <div style={{ fontWeight: 700 }}>合計:</div><div style={{ textAlign: 'right', fontWeight: 700, fontSize: 14 }}>{FMT(selected.total)}</div>
          </div>
        </div>
      </div>
    )}

    {/* 新增表單 */}
    {showAdd && (
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.4)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="card" style={{ width: 520, maxHeight: '80vh', overflow: 'auto', padding: 24 }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 14 }}>🧮 新增採購單</h3>
          {[
            ['event_name', '活動名稱', 'text'],
            ['event_date', '活動日期', 'date'],
            ['purchaser', '採購人員', 'text'],
            ['vendor_name', '廠商名稱', 'text'],
            ['vendor_tax_id', '統一編號', 'text'],
            ['status', '狀態', 'select', PO_STATUSES],
            ['payment_method', '支付方式', 'select', PAY_METHODS],
            ['voucher_type', '原始憑證', 'select', VOUCHER_TYPES],
            ['payment_terms', '付款條件', 'select', ['月結 30','月結 60','月結 90','交貨付現','交單付現']],
            ['expected_pay_date', '預計付款日', 'date'],
            ['subtotal', '小計', 'number'],
            ['tax_rate', '稅率', 'select', [{ v: 0, l: '免稅' }, { v: 0.05, l: '5%' }]],
            ['note', '備註', 'textarea'],
          ].map(([key, label, type, opts]) => (
            <div key={key} style={{ marginBottom: 8 }}>
              <label style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 2 }}>{label}</label>
              {type === 'select' ? (
                <select className="form-input" value={form[key] ?? ''} onChange={e => setForm(f => ({...f, [key]: e.target.value}))} style={{ width: '100%', fontSize: 12 }}>
                  <option value="">選擇...</option>
                  {(opts || []).map((o, i) => typeof o === 'string' ? <option key={i} value={o}>{o}</option> : <option key={i} value={o.v}>{o.l}</option>)}
                </select>
              ) : type === 'textarea' ? (
                <textarea className="form-input" value={form[key] || ''} onChange={e => setForm(f => ({...f, [key]: e.target.value}))} rows={2} style={{ width: '100%', fontSize: 12 }} />
              ) : (
                <input className="form-input" type={type} value={form[key] || ''} onChange={e => setForm(f => ({...f, [key]: type === 'number' ? Number(e.target.value) : e.target.value}))} style={{ width: '100%', fontSize: 12 }} />
              )}
            </div>
          ))}
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 14 }}>
            <button className="btn" onClick={() => setShowAdd(false)}>取消</button>
            <button className="btn btn-primary" onClick={create}>建立採購單</button>
          </div>
        </div>
      </div>
    )}
  </>);
}

const TH = { padding: '8px 6px', fontSize: 10, fontWeight: 600, color: 'var(--c-text-muted)', borderBottom: '2px solid var(--c-border)' };
const TD = { padding: '6px' };
