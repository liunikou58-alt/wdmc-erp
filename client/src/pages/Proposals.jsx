import { useState, useEffect, useCallback } from 'react'
import { useLang } from '../LangContext'
import { api } from '../api'

const FMT = n => n != null ? `$${Number(n).toLocaleString()}` : '$0';
const DEPARTMENTS = ['瓦當麥可', '瓦當硬體'];
const CASE_STATUSES = ['提案中', '得標', '流標', '等待回覆', '詢價', '已結束'];
const CASE_TYPES = ['標案', '商業案', '同業'];
const REGIONS = [
  { label: '1:一般', value: 1 },
  { label: '2:北部/南部', value: 1.2 },
  { label: '3:中部', value: 1 },
  { label: '4:東部/離島', value: 1.5 },
];
const ITEM_CATS = ['CE節目','CE出席人','E佈置','FM模組','G活動','G設備','H燈光','A活動企劃','B設計','C印刷','U贈品','Z雜支'];
const CS_COLORS = {
  '提案中': { bg: 'var(--c-info-light)', color: 'var(--c-info)' },
  '得標': { bg: 'var(--c-success-light)', color: 'var(--c-success)' },
  '流標': { bg: 'var(--c-danger-light)', color: 'var(--c-danger)' },
  '等待回覆': { bg: 'var(--c-warning-light)', color: 'var(--c-warning)' },
  '詢價': { bg: 'var(--c-primary-light)', color: 'var(--c-primary)' },
  '已結束': { bg: 'var(--c-bg-elevated)', color: 'var(--c-text-muted)' },
};

export default function Proposals() {
  const { t } = useLang();
  const [proposals, setProposals] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [selected, setSelected] = useState(null);
  const [items, setItems] = useState([]);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({});
  const [templates, setTemplates] = useState([]);
  const [filter, setFilter] = useState('all');
  const [users, setUsers] = useState([]);
  const [itemTab, setItemTab] = useState('quote');

  const load = useCallback(async () => {
    const [p, c] = await Promise.all([api.getProposals(), api.getCustomers().catch(() => [])]);
    setProposals(p || []);
    setCustomers(c || []);
    setTemplates((p || []).filter(x => x.is_template));
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { api.getUsers().then(setUsers).catch(() => {}); }, []);

  const openDetail = async (p) => {
    setSelected(p);
    const its = await api.getProposalItems(p.id).catch(() => []);
    setItems(its || []);
  };

  // === 公式引擎 ===
  const calcItem = (item) => {
    const unitPrice = Number(item.unit_price || 0);
    const qty = Number(item.qty || 1);
    const amount = unitPrice * qty;
    return { ...item, amount };
  };

  const calcTotals = (itemList, p) => {
    const subtotal = itemList.reduce((s, i) => s + (i.amount || 0), 0);
    const regionMult = Number(p?.region_markup || 1);
    const subtotalWithRegion = Math.round(subtotal * regionMult);
    const taxRate = p?.tax_exempt ? 0 : 0.05;
    const tax = Math.round(subtotalWithRegion * taxRate);
    const total = subtotalWithRegion + tax;
    const totalCost = itemList.reduce((s, i) => s + (Number(i.cost_price || 0) * Number(i.qty || 1)), 0);
    const projectPrice = Number(p?.project_price || 0);
    const discount = projectPrice > 0 ? total - projectPrice : 0;
    const margin = total > 0 ? Math.round((total - totalCost) / total * 10000) / 100 : 0;
    return { subtotal: subtotalWithRegion, tax, total, totalCost, margin, discount, projectPrice };
  };

  const addItem = async () => {
    if (!selected) return;
    await api.createProposalItem(selected.id, {
      category: 'CE節目', item: '新項目', qty: 1, unit: '式',
      unit_price: 0, amount: 0, note: '',
      fee_type: itemTab,
    });
    const its = await api.getProposalItems(selected.id);
    setItems(its || []);
  };

  const updateItem = async (itemId, field, value) => {
    const idx = items.findIndex(i => i.id === itemId);
    if (idx < 0) return;
    const updated = { ...items[idx], [field]: value };
    const calced = calcItem(updated);
    const newItems = [...items]; newItems[idx] = calced; setItems(newItems);
    await api.updateProposalItem(selected.id, itemId, calced);
  };

  const deleteItem = async (itemId) => {
    await api.deleteProposalItem(selected.id, itemId);
    setItems(items.filter(i => i.id !== itemId));
  };

  const applyTemplate = async (tplId) => {
    const tplItems = await api.getProposalItems(tplId).catch(() => []);
    for (const ti of tplItems) {
      await api.createProposalItem(selected.id, {
        category: ti.category, item: ti.item, qty: ti.qty, unit: ti.unit,
        cost_price: ti.cost_price, markup: ti.markup, adjust_fee: ti.adjust_fee,
        unit_price: ti.unit_price, amount: ti.amount, note: ti.note,
      });
    }
    const its = await api.getProposalItems(selected.id);
    setItems(its || []); load();
  };

  const saveAsTemplate = async () => {
    if (!selected) return;
    await api.updateProposal(selected.id, { is_template: true });
    load();
    alert('已儲存為範本');
  };

  const createPL = async () => {
    if (!selected) return;
    await api.linkPLFromProposal(selected.id);
    alert('已從此報價單建立活動損益表');
  };

  const handleSave = async () => {
    if (selected) {
      await api.updateProposal(selected.id, form);
    } else {
      await api.createProposal(form);
    }
    setShowAdd(false); setForm({}); load();
  };

  const exportCSV = () => {
    if (!selected) return;
    window.open(api.exportProposal(selected.id), '_blank');
  };

  const totals = selected ? calcTotals(items, selected) : {};
  const stats = {
    total: proposals.length,
    proposing: proposals.filter(p => p.case_status === '提案中').length,
    won: proposals.filter(p => p.case_status === '得標').length,
    totalAmt: proposals.reduce((s, p) => s + (p.total_amount || p.total_quote || 0), 0),
  };

  const filtered = proposals.filter(p => {
    if (filter === 'all') return !p.is_template;
    if (filter === 'templates') return p.is_template;
    return p.case_status === filter && !p.is_template;
  });

  return (<>
    <div className="page-header">
      <div><h1 className="page-title">{t('page.proposals')}</h1><p className="page-subtitle">Ragic 格式 · 標案/商業案分類 · 稅金切換 · 範本 · 匯出</p></div>
      <button className="btn btn-primary" onClick={() => { setShowAdd(true); setSelected(null); setForm({ department: '瓦當麥可', case_status: '提案中', case_type: '標案', region_markup: 1, tax_exempt: false }); }}>{t('proposals.add')}</button>
    </div>

    {/* KPI */}
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 16 }}>
      {[
        { label: '總提案', value: stats.total },
        { label: '提案中', value: stats.proposing, color: 'var(--c-info)' },
        { label: '已得標', value: stats.won, color: 'var(--c-success)' },
        { label: '報價總額', value: FMT(stats.totalAmt) },
      ].map((k, i) => (
        <div key={i} className="stat-card"><div className="stat-label">{k.label}</div><div className="stat-value" style={{ color: k.color }}>{k.value}</div></div>
      ))}
    </div>

    {/* 篩選 */}
    <div style={{ display: 'flex', gap: 6, marginBottom: 14, flexWrap: 'wrap' }}>
      {[['all','全部'],['提案中','提案中'],['得標','得標'],['流標','流標'],['等待回覆','等待'],['templates','範本']].map(([k,l]) => (
        <button key={k} onClick={() => setFilter(k)} className={`btn btn-sm ${filter === k ? 'btn-primary' : ''}`} style={{ fontSize: 11 }}>{l}</button>
      ))}
    </div>

    {/* 主表格 */}
    <div className="card" style={{ overflow: 'auto' }}>
      <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
        <thead><tr style={{ background: 'var(--c-bg-elevated)', textAlign: 'left' }}>
          <th style={TH}>案件編號</th><th style={TH}>部門</th><th style={TH}>{t('proposals.eventDate')}</th>
          <th style={TH}>客戶名稱</th><th style={TH}>活動名稱</th>
          <th style={{...TH, textAlign:'right'}}>小計</th><th style={{...TH, textAlign:'right'}}>稅金</th>
          <th style={{...TH, textAlign:'right'}}>總計</th><th style={{...TH, textAlign:'right'}}>專案報價</th>
          <th style={TH}>案件狀況</th><th style={TH}>案件</th>
        </tr></thead>
        <tbody>{filtered.map(p => {
          const cs = CS_COLORS[p.case_status] || CS_COLORS['提案中'];
          return (
            <tr key={p.id} style={{ borderBottom: '1px solid var(--c-border)', cursor: 'pointer' }} onClick={() => openDetail(p)}>
              <td style={TD}><span style={{ fontFamily: 'monospace', fontSize: 10, color: 'var(--c-primary)' }}>{p.quote_no || '—'}</span></td>
              <td style={TD}>{p.department || '瓦當麥可'}</td>
              <td style={TD}>{(p.event_date || '').slice(0,10)}</td>
              <td style={TD}>{p.customer_name || '—'}</td>
              <td style={{...TD, fontWeight: 600}}>{p.is_template && '[範本] '}{p.title}</td>
              <td style={{...TD, textAlign:'right'}}>{FMT(p.subtotal || p.total_amount)}</td>
              <td style={{...TD, textAlign:'right', color:'var(--c-warning)'}}>{FMT(p.tax_amount)}</td>
              <td style={{...TD, textAlign:'right', fontWeight:700, color:'var(--c-success)'}}>{FMT(p.total_with_tax || p.total_amount)}</td>
              <td style={{...TD, textAlign:'right', fontWeight:700, color:'var(--c-danger)'}}>{p.project_price ? FMT(p.project_price) : ''}</td>
              <td style={TD}><span style={{ padding: '3px 8px', borderRadius: 6, fontSize: 11, background: cs.bg, color: cs.color, fontWeight: 600 }}>{p.case_status || '提案中'}</span></td>
              <td style={{...TD, fontSize: 11}}>{p.case_type || '商業案'}</td>
            </tr>
          );
        })}</tbody>
      </table>
    </div>

    {/* === 右側明細面板 === */}
    {selected && (
      <div style={{ position: 'fixed', top: 0, right: 0, width: 680, height: '100vh', background: 'var(--c-bg)', boxShadow: '-4px 0 20px rgba(0,0,0,.15)', zIndex: 1000, overflow: 'auto', padding: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <h2 style={{ fontSize: 15, fontWeight: 700 }}>{selected.title}</h2>
          <div style={{ display: 'flex', gap: 6 }}>
            <button className="btn btn-sm" onClick={exportCSV} title="匯出CSV">CSV</button>
            <button className="btn btn-sm" onClick={() => api.printProposalPDF(selected.id)} title="匯出正式報價單 PDF（含公司大小章）" style={{ background: 'var(--c-danger)', color: '#fff' }}>PDF報價單</button>
            <button className="btn btn-sm" onClick={saveAsTemplate} title="存為範本">存範本</button>
            <button className="btn btn-sm btn-primary" onClick={createPL} title="建立損益">→損益</button>
            <button className="btn btn-sm" style={{ background: 'var(--c-success)', color: '#fff' }} onClick={async () => {
              if (!confirm('確定要觸發得標流程？\n\n將自動建立：\n• 採購單 (從報價明細)\n• 損益表\n• 更新狀態為「得標」')) return;
              const r = await api.proposalToAll(selected.id).catch(e => { alert('觸發失敗: ' + e.message); return null; });
              if (r) { alert(r.message || '已完成自動流程'); load(); }
            }} title="得標→自動建PO+損益">得標觸發</button>
            <button onClick={() => setSelected(null)} style={{ background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: 'var(--c-text)' }}>✕</button>
          </div>
        </div>

        {/* 報價資訊 */}
        <div className="card" style={{ padding: 12, marginBottom: 12 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 8, fontSize: 12 }}>
            <div>客戶: <b>{selected.customer_name || '—'}</b></div>
            <div>部門: <b>{selected.department || '瓦當麥可'}</b></div>
            <div>開始: <b>{(selected.event_date || '').slice(0,10)}</b></div>
            <div>結束: <b>{(selected.event_end_date || '').slice(0,10) || '—'}</b></div>
            <div>狀態: <b>{selected.case_status}</b></div>
            <div>企劃: <b>{users.find(u => u.id === selected.planner_id)?.display_name || '—'}</b></div>
            <div style={{ gridColumn: '3 / -1' }}>地址: <b>{selected.event_address || '—'}</b></div>
          </div>
        </div>

        {/* 範本匯入 */}
        {templates.length > 0 && (
          <div style={{ marginBottom: 10, display: 'flex', gap: 6, alignItems: 'center', fontSize: 12 }}>
            <span>套用範本:</span>
            {templates.slice(0,3).map(t => (
              <button key={t.id} className="btn btn-sm" onClick={() => applyTemplate(t.id)} style={{ fontSize: 11 }}>{t.title}</button>
            ))}
          </div>
        )}

        {/* 報價明細 Tab分類 + 表格 (Ragic格式) */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 6 }}>
          {[['quote','報價內容'],['execution','專案執行費'],['adjustment','土建項目']].map(([k,l]) => (
            <button key={k} onClick={() => setItemTab(k)} className={`btn btn-sm ${itemTab === k ? 'btn-primary' : ''}`} style={{ fontSize: 11 }}>{l} ({items.filter(i => (i.fee_type || 'quote') === k).length})</button>
          ))}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
          <h4 style={{ fontSize: 13, fontWeight: 600 }}>{itemTab === 'quote' ? '報價明細' : itemTab === 'execution' ? '專案執行費' : '土建項目'} ({items.filter(i => (i.fee_type || 'quote') === itemTab).length} 項)</h4>
          <button className="btn btn-sm btn-primary" onClick={addItem}>+ 新增項目</button>
        </div>
        <div className="card" style={{ overflow: 'auto', marginBottom: 12 }}>
          <table style={{ width: '100%', fontSize: 11, borderCollapse: 'collapse' }}>
            <thead><tr style={{ background: 'var(--c-bg-elevated)' }}>
              <th style={TH}>類別</th><th style={TH}>項目</th><th style={{...TH,width:40}}>數量</th><th style={TH}>單位</th>
              <th style={{...TH,textAlign:'right'}}>單價</th>
              <th style={{...TH,textAlign:'right'}}>金額</th><th style={TH}>確認/備註</th><th style={{width:30}}></th>
            </tr></thead>
            <tbody>
              {items.filter(i => (i.fee_type || 'quote') === itemTab).map(item => (
                <tr key={item.id} style={{ borderBottom: '1px solid var(--c-border)' }}>
                  <td style={TD}>
                    <select value={item.category || ''} onChange={e => updateItem(item.id, 'category', e.target.value)} style={SEL}>
                      {ITEM_CATS.map(c => <option key={c}>{c}</option>)}
                    </select>
                  </td>
                  <td style={TD}><input value={item.item || ''} onChange={e => updateItem(item.id, 'item', e.target.value)} style={{...INP, width: 140}} /></td>
                  <td style={TD}><input type="number" value={item.qty || 1} onChange={e => updateItem(item.id, 'qty', Number(e.target.value))} style={{...INP, width: 40, textAlign:'right'}} /></td>
                  <td style={TD}><input value={item.unit || '式'} onChange={e => updateItem(item.id, 'unit', e.target.value)} style={{...INP, width: 30}} /></td>
                  <td style={{...TD, textAlign:'right'}}>
                    <input type="number" value={item.unit_price || 0} onChange={e => updateItem(item.id, 'unit_price', Number(e.target.value))} style={{...INP, width: 80, textAlign:'right'}} />
                  </td>
                  <td style={{...TD, textAlign:'right', fontWeight: 700}}>{FMT(item.amount)}</td>
                  <td style={TD}><input value={item.note || ''} onChange={e => updateItem(item.id, 'note', e.target.value)} style={{...INP, width: 100}} placeholder="備註" /></td>
                  <td style={TD}><button onClick={() => deleteItem(item.id)} style={{ background:'none', border:'none', cursor:'pointer', fontSize:12, color:'var(--c-danger)' }}>×</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* 自動計算摘要 */}
        <div className="card" style={{ padding: 14 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: 12 }}>
            <div>小計 (未稅):</div><div style={{ textAlign: 'right', fontWeight: 600 }}>{FMT(totals.subtotal)}</div>
            <div>稅金 (5%):</div><div style={{ textAlign: 'right', color: 'var(--c-warning)' }}>{FMT(totals.tax)}</div>
            <div style={{ fontWeight: 700, fontSize: 14 }}>總計 (含稅):</div><div style={{ textAlign: 'right', fontWeight: 700, fontSize: 14, color: 'var(--c-success)' }}>{FMT(totals.total)}</div>
            <div style={{ borderTop: '1px solid var(--c-border)', paddingTop: 6 }}>總成本:</div><div style={{ textAlign: 'right', color: 'var(--c-danger)', borderTop: '1px solid var(--c-border)', paddingTop: 6 }}>{FMT(totals.totalCost)}</div>
            <div>毛利率:</div><div style={{ textAlign: 'right', fontWeight: 600, color: totals.margin >= 20 ? 'var(--c-success)' : 'var(--c-danger)' }}>{totals.margin}%</div>
            {totals.projectPrice > 0 && <>
              <div style={{ color: 'var(--c-danger)', fontWeight: 600 }}>專案報價:</div><div style={{ textAlign: 'right', fontWeight: 700, color: 'var(--c-danger)' }}>{FMT(totals.projectPrice)}</div>
              <div>折扣:</div><div style={{ textAlign: 'right', color: 'var(--c-warning)' }}>{FMT(totals.discount)}</div>
            </>}
          </div>
        </div>
      </div>
    )}

    {/* 新增表單 */}
    {showAdd && (
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.4)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="card" style={{ width: 550, maxHeight: '80vh', overflow: 'auto', padding: 24 }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 14 }}>新增報價單</h3>
          {[
            ['title', '活動名稱 *', 'text'],
            ['department', '部門', 'select', DEPARTMENTS],
            ['customer_id', '客戶', 'select', customers.map(c => ({ v: c.id, l: c.name }))],
            ['planner_id', '企劃負責人', 'select', users.map(u => ({ v: u.id, l: u.display_name }))],
            ['event_date', '活動開始日期', 'date'],
            ['event_end_date', '活動結束日期', 'date'],
            ['event_address', '活動地址', 'text'],
            ['case_status', '案件狀況', 'select', CASE_STATUSES],
            ['case_type', '案件類型', 'select', CASE_TYPES],
            ['region_markup', '地區加成', 'select', REGIONS.map(r => ({ v: r.value, l: r.label }))],
            ['tax_exempt', '免稅', 'checkbox'],
            ['project_price', '專案報價', 'number'],
            ['description', '活動需求', 'textarea'],
          ].map(([key, label, type, opts]) => (
            <div key={key} style={{ marginBottom: 8 }}>
              <label style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 2 }}>{label}</label>
              {type === 'select' ? (
                <select className="form-input" value={form[key] || ''} onChange={e => setForm(f => ({...f, [key]: e.target.value}))} style={{ width: '100%', fontSize: 12 }}>
                  <option value="">選擇...</option>
                  {(opts || []).map((o, i) => typeof o === 'string' ? <option key={i} value={o}>{o}</option> : <option key={i} value={o.v}>{o.l}</option>)}
                </select>
              ) : type === 'textarea' ? (
                <textarea className="form-input" value={form[key] || ''} onChange={e => setForm(f => ({...f, [key]: e.target.value}))} rows={2} style={{ width: '100%', fontSize: 12 }} />
              ) : type === 'checkbox' ? (
                <input type="checkbox" checked={!!form[key]} onChange={e => setForm(f => ({...f, [key]: e.target.checked}))} />
              ) : (
                <input className="form-input" type={type} value={form[key] || ''} onChange={e => setForm(f => ({...f, [key]: type === 'number' ? Number(e.target.value) : e.target.value}))} style={{ width: '100%', fontSize: 12 }} />
              )}
            </div>
          ))}
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 14 }}>
            <button className="btn" onClick={() => setShowAdd(false)}>{t('common.cancel')}</button>
            <button className="btn btn-primary" onClick={handleSave}>儲存</button>
          </div>
        </div>
      </div>
    )}
  </>);
}

const TH = { padding: '8px 6px', fontSize: 10, fontWeight: 600, color: 'var(--c-text-muted)', borderBottom: '2px solid var(--c-border)' };
const TD = { padding: '6px' };
const INP = { border: '1px solid var(--c-border)', borderRadius: 4, padding: '3px 5px', fontSize: 11, background: 'var(--c-bg-card-solid)', color: 'var(--c-text)' };
const SEL = { border: '1px solid var(--c-border)', borderRadius: 4, padding: '2px 4px', fontSize: 10, background: 'var(--c-bg-card-solid)', color: 'var(--c-text)' };

