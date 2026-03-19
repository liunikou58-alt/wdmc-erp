import { useState, useEffect, useCallback } from 'react'
import { api } from '../api'

const FMT = n => `${Number(n || 0).toLocaleString()}`;
const TABS = [
  { key: 'items', label: '🗄️ 物品主檔' },
  { key: 'movements', label: '📋 出入庫單' },
  { key: 'counts', label: '⛴️ 盤點' },
  { key: 'receipts', label: '🚛 進貨' },
];
const MV_STATUS = { completed: '✅ 已完成', pending: '⏳ 待處理' };

export default function Inventory() {
  const [tab, setTab] = useState('items');
  const [items, setItems] = useState([]);
  const [movements, setMovements] = useState([]);
  const [counts, setCounts] = useState([]);
  const [receipts, setReceipts] = useState([]);
  const [projects, setProjects] = useState([]);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({});
  const [selected, setSelected] = useState(null);

  const load = useCallback(async () => {
    const [a, m, c, r, p] = await Promise.all([
      api.getAssets().catch(() => []),
      api.getMovements().catch(() => []),
      api.getCounts().catch(() => []),
      api.getReceipts().catch(() => []),
      api.getProjects().catch(() => []),
    ]);
    setItems(a || []); setMovements(m || []); setCounts(c || []); setReceipts(r || []); setProjects(p || []);
  }, []);

  useEffect(() => { load(); }, [load]);

  // === 出庫 ===
  const doCheckout = async () => {
    if (!form.project_id || !form.checkout_items?.length) return alert('請選擇專案和物品');
    await api.checkout({
      project_id: form.project_id,
      return_date: form.return_date || '',
      notes: form.notes || '',
      items: form.checkout_items,
    });
    setShowAdd(false); setForm({}); load();
  };

  // === 入庫 ===
  const doCheckin = async () => {
    if (!form.checkin_items?.length) return alert('請選擇物品');
    await api.checkin({
      project_id: form.project_id || '',
      notes: form.notes || '',
      items: form.checkin_items,
    });
    setShowAdd(false); setForm({}); load();
  };

  // === 盤點 ===
  const doCount = async () => {
    if (!form.count_items?.length) return alert('請選擇物品');
    const result = await api.createCount({
      warehouse: form.warehouse || '公司倉庫',
      items: form.count_items,
    });
    if (result?.id && form.auto_adjust) {
      await api.completeCount(result.id, { notes: form.notes || '' });
    }
    setShowAdd(false); setForm({}); load();
  };

  // === 進貨 ===
  const doReceipt = async () => {
    if (!form.receipt_items?.length) return alert('請新增物品');
    await api.createReceipt({
      vendor_id: form.vendor_id || '',
      notes: form.notes || '',
      items: form.receipt_items,
    });
    setShowAdd(false); setForm({}); load();
  };

  const addFormItem = (key) => {
    const list = form[key] || [];
    setForm(f => ({ ...f, [key]: [...list, { item_id: '', quantity: 1, notes: '' }] }));
  };

  const updateFormItem = (key, idx, field, val) => {
    const list = [...(form[key] || [])];
    list[idx] = { ...list[idx], [field]: field === 'quantity' || field === 'actual_qty' || field === 'unit_price' ? Number(val) : val };
    setForm(f => ({ ...f, [key]: list }));
  };

  return (<>
    <div className="page-header">
      <div><h1 className="page-title">🗳️ 物品管理</h1><p className="page-subtitle">主檔 · 出入庫 · 盤點 · 進貨 — 全流程管理</p></div>
      <button className="btn btn-primary" onClick={() => { setShowAdd(true); setForm({}); }}>
        {tab === 'items' ? '➕ 新增物品' : tab === 'movements' ? '📦 出庫/入庫' : tab === 'counts' ? '📋 新增盤點' : '🚛 新增進貨'}
      </button>
    </div>

    {/* KPI */}
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12, marginBottom: 16 }}>
      {[
        { label: '物品總數', value: items.length, icon: '📦' },
        { label: '出入庫單', value: movements.length, icon: '📋' },
        { label: '盤點紀錄', value: counts.length, icon: '⛴️' },
        { label: '進貨紀錄', value: receipts.length, icon: '🚛' },
        { label: '總庫存', value: FMT(items.reduce((s, i) => s + (i.quantity || 0), 0)), icon: '📊' },
      ].map((k, i) => (
        <div key={i} className="stat-card"><div className="stat-label">{k.icon} {k.label}</div><div className="stat-value" style={{ fontSize: 15 }}>{k.value}</div></div>
      ))}
    </div>

    {/* Tabs */}
    <div style={{ display: 'flex', gap: 4, marginBottom: 16, background: 'var(--c-bg-elevated)', borderRadius: 8, padding: 3, width: 'fit-content' }}>
      {TABS.map(t => (
        <button key={t.key} onClick={() => setTab(t.key)} style={{
          padding: '6px 14px', fontSize: 12, fontWeight: 600, border: 'none', cursor: 'pointer', borderRadius: 6,
          background: tab === t.key ? 'var(--c-primary)' : 'transparent',
          color: tab === t.key ? '#fff' : 'inherit',
        }}>{t.label}</button>
      ))}
    </div>

    {/* ===== Tab: 物品主檔 ===== */}
    {tab === 'items' && (
      <div className="card" style={{ overflow: 'auto' }}>
        <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
          <thead><tr style={{ background: 'var(--c-bg-elevated)', textAlign: 'left' }}>
            <th style={TH}>名稱</th><th style={TH}>分類</th><th style={TH}>單位</th>
            <th style={{...TH,textAlign:'right'}}>總庫存</th><th style={{...TH,textAlign:'right'}}>可用</th>
            <th style={TH}>狀態</th>
          </tr></thead>
          <tbody>{items.map(it => (
            <tr key={it.id} style={{ borderBottom: '1px solid var(--c-border)' }}>
              <td style={{...TD, fontWeight: 600}}>{it.name || '—'}</td>
              <td style={TD}><span style={{ padding: '1px 6px', borderRadius: 4, fontSize: 10, background: '#f1f5f9' }}>{it.category || '—'}</span></td>
              <td style={TD}>{it.unit || '個'}</td>
              <td style={{...TD, textAlign:'right', fontWeight: 600}}>{it.quantity || 0}</td>
              <td style={{...TD, textAlign:'right', color: (it.available_qty || 0) <= 0 ? '#ef4444' : '#10b981'}}>{it.available_qty || 0}</td>
              <td style={TD}><span style={{ fontSize: 10, fontWeight: 600, color: it.status === 'available' ? '#10b981' : '#f59e0b' }}>{it.status === 'available' ? '🟢 可用' : '🟡 使用中'}</span></td>
            </tr>
          ))}</tbody>
        </table>
        {!items.length && <div style={{ textAlign: 'center', padding: 30, color: 'var(--c-text-muted)' }}>尚無物品資料</div>}
      </div>
    )}

    {/* ===== Tab: 出入庫單 ===== */}
    {tab === 'movements' && (
      <div className="card" style={{ overflow: 'auto' }}>
        <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
          <thead><tr style={{ background: 'var(--c-bg-elevated)', textAlign: 'left' }}>
            <th style={TH}>單號</th><th style={TH}>類型</th><th style={TH}>日期</th>
            <th style={TH}>活動/專案</th><th style={{...TH,textAlign:'right'}}>物品數</th><th style={TH}>狀態</th>
          </tr></thead>
          <tbody>{movements.map(m => (
            <tr key={m.id} style={{ borderBottom: '1px solid var(--c-border)', cursor: 'pointer' }} onClick={() => setSelected(m)}>
              <td style={TD}><span style={{ fontFamily: 'monospace', fontSize: 10, color: 'var(--c-primary)' }}>{m.movement_no}</span></td>
              <td style={TD}><span style={{ padding: '2px 8px', borderRadius: 6, fontSize: 10, fontWeight: 600,
                background: m.type === 'out' ? '#fee2e2' : '#dcfce7',
                color: m.type === 'out' ? '#991b1b' : '#166534',
              }}>{m.type === 'out' ? '📤 出庫' : '📥 入庫'}</span></td>
              <td style={TD}>{m.movement_date}</td>
              <td style={TD}>{m.project_name || '—'}</td>
              <td style={{...TD, textAlign:'right', fontWeight: 600}}>{m.item_count || 0}</td>
              <td style={TD}>{MV_STATUS[m.status] || m.status}</td>
            </tr>
          ))}</tbody>
        </table>
        {!movements.length && <div style={{ textAlign: 'center', padding: 30, color: 'var(--c-text-muted)' }}>尚無出入庫紀錄</div>}
      </div>
    )}

    {/* ===== Tab: 盤點 ===== */}
    {tab === 'counts' && (
      <div className="card" style={{ overflow: 'auto' }}>
        <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
          <thead><tr style={{ background: 'var(--c-bg-elevated)', textAlign: 'left' }}>
            <th style={TH}>盤點編號</th><th style={TH}>日期</th><th style={TH}>盤點人</th>
            <th style={{...TH,textAlign:'right'}}>品項數</th><th style={TH}>狀態</th>
          </tr></thead>
          <tbody>{counts.map(c => (
            <tr key={c.id} style={{ borderBottom: '1px solid var(--c-border)' }}>
              <td style={TD}><span style={{ fontFamily: 'monospace', fontSize: 10, color: 'var(--c-primary)' }}>{c.count_no}</span></td>
              <td style={TD}>{c.count_date}</td>
              <td style={TD}>{c.counted_by_name || '—'}</td>
              <td style={{...TD, textAlign:'right'}}>{c.item_count || 0}</td>
              <td style={TD}><span style={{ padding: '2px 8px', borderRadius: 6, fontSize: 10, fontWeight: 600,
                background: c.status === 'completed' ? '#dcfce7' : '#fef3c7',
                color: c.status === 'completed' ? '#166534' : '#92400e',
              }}>{c.status === 'completed' ? '✅ 已完成' : '🔄 進行中'}</span></td>
            </tr>
          ))}</tbody>
        </table>
        {!counts.length && <div style={{ textAlign: 'center', padding: 30, color: 'var(--c-text-muted)' }}>尚無盤點紀錄</div>}
      </div>
    )}

    {/* ===== Tab: 進貨 ===== */}
    {tab === 'receipts' && (
      <div className="card" style={{ overflow: 'auto' }}>
        <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
          <thead><tr style={{ background: 'var(--c-bg-elevated)', textAlign: 'left' }}>
            <th style={TH}>進貨編號</th><th style={TH}>日期</th><th style={TH}>廠商</th>
            <th style={{...TH,textAlign:'right'}}>金額</th><th style={TH}>驗收</th>
          </tr></thead>
          <tbody>{receipts.map(r => (
            <tr key={r.id} style={{ borderBottom: '1px solid var(--c-border)' }}>
              <td style={TD}><span style={{ fontFamily: 'monospace', fontSize: 10, color: 'var(--c-primary)' }}>{r.receipt_no}</span></td>
              <td style={TD}>{r.receipt_date}</td>
              <td style={TD}>{r.vendor_name || '—'}</td>
              <td style={{...TD, textAlign:'right', fontWeight: 600}}>${FMT(r.total_amount)}</td>
              <td style={TD}><span style={{ fontSize: 10, fontWeight: 600, color: r.inspection_status === 'passed' ? '#10b981' : '#f59e0b' }}>
                {r.inspection_status === 'passed' ? '✅ 已驗收' : '⏳ 待驗收'}
              </span></td>
            </tr>
          ))}</tbody>
        </table>
        {!receipts.length && <div style={{ textAlign: 'center', padding: 30, color: 'var(--c-text-muted)' }}>尚無進貨紀錄</div>}
      </div>
    )}

    {/* ===== 出入庫明細面板 ===== */}
    {selected && (
      <div style={{ position: 'fixed', top: 0, right: 0, width: 500, height: '100vh', background: 'var(--c-bg)', boxShadow: '-4px 0 20px rgba(0,0,0,.15)', zIndex: 1000, overflow: 'auto', padding: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
          <h2 style={{ fontSize: 15, fontWeight: 700 }}>{selected.type === 'out' ? '📤 出庫單' : '📥 入庫單'} {selected.movement_no}</h2>
          <button onClick={() => setSelected(null)} style={{ background: 'none', border: 'none', fontSize: 18, cursor: 'pointer' }}>✕</button>
        </div>
        <div className="card" style={{ padding: 12, marginBottom: 12 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, fontSize: 12 }}>
            <div>日期: <b>{selected.movement_date}</b></div>
            <div>專案: <b>{selected.project_name || '—'}</b></div>
            <div>經手人: <b>{selected.handled_by_name || '—'}</b></div>
            <div>狀態: <b>{MV_STATUS[selected.status]}</b></div>
            {selected.return_date && <div>預計歸還: <b>{selected.return_date}</b></div>}
            {selected.notes && <div style={{ gridColumn: '1/3' }}>備註: {selected.notes}</div>}
          </div>
        </div>
        <h4 style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}>📦 物品清單 ({(selected.details || []).length} 項)</h4>
        <div className="card" style={{ overflow: 'auto' }}>
          <table style={{ width: '100%', fontSize: 11, borderCollapse: 'collapse' }}>
            <thead><tr style={{ background: 'var(--c-bg-elevated)' }}>
              <th style={TH}>物品</th><th style={{...TH,textAlign:'right'}}>數量</th><th style={TH}>狀態</th><th style={TH}>備註</th>
            </tr></thead>
            <tbody>{(selected.details || []).map(d => {
              const asset = items.find(a => a.id === d.item_id);
              return (
                <tr key={d.id} style={{ borderBottom: '1px solid var(--c-border)' }}>
                  <td style={TD}>{asset?.name || d.item_id}</td>
                  <td style={{...TD, textAlign:'right', fontWeight: 600}}>{d.quantity}</td>
                  <td style={TD}>{d.condition || 'normal'}</td>
                  <td style={{...TD, fontSize: 10, color: 'var(--c-text-muted)'}}>{d.notes || '—'}</td>
                </tr>
              );
            })}</tbody>
          </table>
        </div>
      </div>
    )}

    {/* ===== 新增表單 (多用途) ===== */}
    {showAdd && (
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.4)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="card" style={{ width: 550, maxHeight: '85vh', overflow: 'auto', padding: 24 }}>

          {/* 出庫/入庫 */}
          {tab === 'movements' && (<>
            <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 12 }}>📦 出庫 / 入庫</h3>
            <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
              <button className={`btn btn-sm ${form.mv_type !== 'in' ? 'btn-primary' : ''}`} onClick={() => setForm(f => ({...f, mv_type: 'out'}))}>📤 出庫</button>
              <button className={`btn btn-sm ${form.mv_type === 'in' ? 'btn-primary' : ''}`} onClick={() => setForm(f => ({...f, mv_type: 'in'}))}>📥 入庫</button>
            </div>
            <div style={{ marginBottom: 8 }}>
              <label style={LBL}>活動/專案</label>
              <select className="form-input" value={form.project_id || ''} onChange={e => setForm(f => ({...f, project_id: e.target.value}))} style={{ width: '100%', fontSize: 12 }}>
                <option value="">選擇專案...</option>
                {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            {form.mv_type !== 'in' && <div style={{ marginBottom: 8 }}>
              <label style={LBL}>預計歸還日</label>
              <input className="form-input" type="date" value={form.return_date || ''} onChange={e => setForm(f => ({...f, return_date: e.target.value}))} style={{ width: '100%', fontSize: 12 }} />
            </div>}
            <div style={{ marginBottom: 8 }}>
              <label style={LBL}>備註</label>
              <textarea className="form-input" value={form.notes || ''} onChange={e => setForm(f => ({...f, notes: e.target.value}))} rows={2} style={{ width: '100%', fontSize: 12 }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <label style={LBL}>物品清單</label>
              <button className="btn btn-sm" onClick={() => addFormItem(form.mv_type === 'in' ? 'checkin_items' : 'checkout_items')}>+ 新增</button>
            </div>
            {(form[form.mv_type === 'in' ? 'checkin_items' : 'checkout_items'] || []).map((it, idx) => (
              <div key={idx} style={{ display: 'flex', gap: 6, marginBottom: 4 }}>
                <select className="form-input" value={it.item_id} onChange={e => updateFormItem(form.mv_type === 'in' ? 'checkin_items' : 'checkout_items', idx, 'item_id', e.target.value)} style={{ flex: 2, fontSize: 11 }}>
                  <option value="">選擇物品</option>
                  {items.map(a => <option key={a.id} value={a.id}>{a.name} (庫存:{a.quantity||0})</option>)}
                </select>
                <input className="form-input" type="number" min={1} value={it.quantity} onChange={e => updateFormItem(form.mv_type === 'in' ? 'checkin_items' : 'checkout_items', idx, 'quantity', e.target.value)} style={{ width: 60, fontSize: 11 }} />
              </div>
            ))}
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 14 }}>
              <button className="btn" onClick={() => setShowAdd(false)}>取消</button>
              <button className="btn btn-primary" onClick={form.mv_type === 'in' ? doCheckin : doCheckout}>{form.mv_type === 'in' ? '📥 入庫' : '📤 出庫'}</button>
            </div>
          </>)}

          {/* 盤點 */}
          {tab === 'counts' && (<>
            <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 12 }}>📋 新增盤點</h3>
            <div style={{ marginBottom: 8 }}>
              <label style={LBL}>倉庫</label>
              <input className="form-input" value={form.warehouse || '公司倉庫'} onChange={e => setForm(f => ({...f, warehouse: e.target.value}))} style={{ width: '100%', fontSize: 12 }} />
            </div>
            <label style={{ ...LBL, display: 'flex', alignItems: 'center', gap: 6 }}>
              <input type="checkbox" checked={form.auto_adjust || false} onChange={e => setForm(f => ({...f, auto_adjust: e.target.checked}))} /> 盤點完成後自動調整庫存
            </label>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, marginTop: 8 }}>
              <label style={LBL}>盤點物品</label>
              <button className="btn btn-sm" onClick={() => addFormItem('count_items')}>+</button>
            </div>
            {(form.count_items || []).map((it, idx) => (
              <div key={idx} style={{ display: 'flex', gap: 6, marginBottom: 4 }}>
                <select className="form-input" value={it.item_id} onChange={e => updateFormItem('count_items', idx, 'item_id', e.target.value)} style={{ flex: 2, fontSize: 11 }}>
                  <option value="">選擇物品</option>
                  {items.map(a => <option key={a.id} value={a.id}>{a.name} (系統:{a.quantity||0})</option>)}
                </select>
                <input className="form-input" placeholder="實際數量" type="number" min={0} value={it.actual_qty || ''} onChange={e => updateFormItem('count_items', idx, 'actual_qty', e.target.value)} style={{ width: 80, fontSize: 11 }} />
              </div>
            ))}
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 14 }}>
              <button className="btn" onClick={() => setShowAdd(false)}>取消</button>
              <button className="btn btn-primary" onClick={doCount}>⛴️ 送出盤點</button>
            </div>
          </>)}

          {/* 進貨 */}
          {tab === 'receipts' && (<>
            <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 12 }}>🚛 新增進貨</h3>
            <div style={{ marginBottom: 8 }}>
              <label style={LBL}>備註</label>
              <textarea className="form-input" value={form.notes || ''} onChange={e => setForm(f => ({...f, notes: e.target.value}))} rows={2} style={{ width: '100%', fontSize: 12 }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <label style={LBL}>進貨品項</label>
              <button className="btn btn-sm" onClick={() => addFormItem('receipt_items')}>+</button>
            </div>
            {(form.receipt_items || []).map((it, idx) => (
              <div key={idx} style={{ display: 'flex', gap: 6, marginBottom: 4 }}>
                <select className="form-input" value={it.item_id} onChange={e => updateFormItem('receipt_items', idx, 'item_id', e.target.value)} style={{ flex: 2, fontSize: 11 }}>
                  <option value="">選擇物品</option>
                  {items.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
                <input className="form-input" placeholder="數量" type="number" min={1} value={it.quantity} onChange={e => updateFormItem('receipt_items', idx, 'quantity', e.target.value)} style={{ width: 60, fontSize: 11 }} />
                <input className="form-input" placeholder="單價" type="number" value={it.unit_price || ''} onChange={e => updateFormItem('receipt_items', idx, 'unit_price', e.target.value)} style={{ width: 80, fontSize: 11 }} />
              </div>
            ))}
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 14 }}>
              <button className="btn" onClick={() => setShowAdd(false)}>取消</button>
              <button className="btn btn-primary" onClick={doReceipt}>🚛 確認進貨</button>
            </div>
          </>)}

          {/* 新增物品 */}
          {tab === 'items' && (<>
            <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 12 }}>🗄️ 新增物品</h3>
            {[
              ['name', '物品名稱', 'text'],
              ['category', '分類', 'select', ['設備用品','文具用品','活動道具','週邊耗材','辦公用品']],
              ['unit', '單位', 'text'],
              ['quantity', '初始庫存', 'number'],
            ].map(([key, label, type, opts]) => (
              <div key={key} style={{ marginBottom: 8 }}>
                <label style={LBL}>{label}</label>
                {type === 'select' ? (
                  <select className="form-input" value={form[key] || ''} onChange={e => setForm(f => ({...f, [key]: e.target.value}))} style={{ width: '100%', fontSize: 12 }}>
                    <option value="">選擇...</option>
                    {(opts||[]).map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                ) : (
                  <input className="form-input" type={type} value={form[key] || ''} onChange={e => setForm(f => ({...f, [key]: type === 'number' ? Number(e.target.value) : e.target.value}))} style={{ width: '100%', fontSize: 12 }} />
                )}
              </div>
            ))}
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 14 }}>
              <button className="btn" onClick={() => setShowAdd(false)}>取消</button>
              <button className="btn btn-primary" onClick={async () => {
                await api.createAsset?.({ ...form, available_qty: form.quantity || 0, status: 'available' }).catch(() => {});
                setShowAdd(false); setForm({}); load();
              }}>儲存</button>
            </div>
          </>)}

        </div>
      </div>
    )}
  </>);
}

const TH = { padding: '8px 6px', fontSize: 10, fontWeight: 600, color: 'var(--c-text-muted)', borderBottom: '2px solid var(--c-border)' };
const TD = { padding: '8px 6px' };
const LBL = { fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 2 };
