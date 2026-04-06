import { useState, useEffect, useCallback } from 'react';
import { useLang } from '../LangContext'
import { api } from '../api';

const CATS = ['A活動企劃','B設計','C印刷','D主持人','E表演','F交通','G設備','H佈置','I其他'];
const FMT = n => n != null ? `$${Number(n).toLocaleString()}` : '$0';

export default function ProfitLoss() {
  const { t } = useLang();
  const [items, setItems] = useState([]);
  const [stats, setStats] = useState({});
  const [view, setView] = useState('exec'); // exec | accounting
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [selected, setSelected] = useState(null);
  const [details, setDetails] = useState([]);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({});

  const load = useCallback(async () => {
    const [list, s] = await Promise.all([api.getProfitLoss({ search }), api.getProfitLossStats()]);
    setItems(list || []);
    setStats(s || {});
  }, [search]);

  useEffect(() => { load(); }, [load]);

  const openDetail = async (pl) => {
    setSelected(pl);
    const res = await api.getProfitLossById(pl.id);
    setDetails(res?.details || []);
  };

  const handleSave = async () => {
    if (selected) {
      await api.updateProfitLoss(selected.id, form);
    } else {
      await api.createProfitLoss(form);
    }
    setShowAdd(false); setForm({}); setSelected(null); load();
  };

  const handleClose = async (pl) => {
    await api.updateProfitLoss(pl.id, { is_closed: !pl.is_closed });
    load();
  };

  const handleLinkLabor = async (pl) => {
    const r = await api.linkPLLabor(pl.id);
    alert(`已匯入 ${r.imported} 筆勞報，成本 ${FMT(r.total_cost)}`);
    load(); if (selected?.id === pl.id) openDetail(pl);
  };

  const handleLinkPurchase = async (pl) => {
    const r = await api.linkPLPurchase(pl.id);
    alert(`已匯入 ${r.imported} 筆採購，成本 ${FMT(r.total_cost)}`);
    load(); if (selected?.id === pl.id) openDetail(pl);
  };

  const addDetail = async () => {
    if (!selected) return;
    await api.createPLDetail(selected.id, {
      category: '其他', item_name: '新項目', qty: 1,
      unit_quote: 0, quote_total: 0, unit_cost: 0, cost_total: 0,
    });
    openDetail(selected);
  };

  const filtered = items.filter(i => {
    if (filter === 'active') return !i.is_closed;
    if (filter === 'closed') return i.is_closed;
    return true;
  });

  return (<>
    <div className="page-header">
      <div>
        <h1 className="page-title">{t('page.profitLoss')}</h1>
        <p className="page-subtitle">追蹤每案報價、成本、毛利 — 對應 Ragic 損益核心</p>
      </div>
      <button className="btn btn-primary" onClick={() => { setShowAdd(true); setSelected(null); setForm({}); }}>
        + 新增損益
      </button>
    </div>

    {/* KPI 卡片 */}
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12, marginBottom: 20 }}>
      {[
        { label: '活動總數', value: stats.total_events || 0, icon: '📋', bg: 'var(--c-primary-light)' },
        { label: '進行中', value: stats.active_events || 0, icon: '🔄', bg: 'var(--c-success-light)' },
        { label: '已結案', value: stats.closed_events || 0, icon: '✅', bg: 'var(--c-info-light)' },
        { label: '總報價', value: FMT(stats.total_quote), icon: '💰', bg: 'var(--c-warning-light)' },
        { label: '總結案金額', value: FMT(stats.total_settlement), icon: '🏦', bg: 'var(--c-info-light)' },
        { label: '淨利潤', value: FMT(stats.total_profit), icon: '📊', bg: 'var(--c-primary-light)' },
        { label: '平均毛利率', value: `${stats.avg_margin || 0}%`, icon: '📈', bg: '#fce7f3' },
      ].map((kpi, i) => (
        <div key={i} className="card" style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 36, height: 36, borderRadius: 8, background: kpi.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>{kpi.icon}</div>
          <div><div style={{ fontSize: 16, fontWeight: 700 }}>{kpi.value}</div><div style={{ fontSize: 11, color: 'var(--c-text-muted)' }}>{kpi.label}</div></div>
        </div>
      ))}
    </div>

    {/* 工具列 */}
    <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
      <div style={{ display: 'flex', background: 'var(--c-bg-elevated)', borderRadius: 8, overflow: 'hidden' }}>
        {[['exec','執行用'],['accounting','會計用']].map(([k,l]) => (
          <button key={k} onClick={() => setView(k)} style={{ padding: '6px 14px', fontSize: 12, fontWeight: 600, border: 'none', cursor: 'pointer', background: view === k ? 'var(--c-primary)' : 'transparent', color: view === k ? '#fff' : 'inherit' }}>{l}</button>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 6 }}>
        {[['all','全部'],['active','進行中'],['closed','已結案']].map(([k,l]) => (
          <button key={k} onClick={() => setFilter(k)} className={`btn btn-sm ${filter === k ? 'btn-primary' : ''}`} style={{ fontSize: 11 }}>{l}</button>
        ))}
      </div>
      <input placeholder="🔍 搜尋活動名稱..." value={search} onChange={e => setSearch(e.target.value)} className="form-input" style={{ flex: 1, minWidth: 160, fontSize: 12, padding: '6px 10px' }} />
    </div>

    {/* 主表格 */}
    <div className="card" style={{ overflow: 'auto' }}>
      <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ background: 'var(--c-bg-elevated)', textAlign: 'left' }}>
            <th style={TH}>編號</th>
            <th style={TH}>活動名稱</th>
            <th style={TH}>類型</th>
            <th style={TH}>負責人</th>
            <th style={TH}>活動日期</th>
            <th style={{...TH, textAlign: 'right'}}>報價金額</th>
            {view === 'accounting' && <><th style={{...TH, textAlign: 'right'}}>結案金額</th><th style={{...TH, textAlign: 'right'}}>訂金</th><th style={{...TH, textAlign: 'right'}}>尾款</th></>}
            <th style={{...TH, textAlign: 'right'}}>成本</th>
            <th style={{...TH, textAlign: 'right'}}>毛利</th>
            <th style={{...TH, textAlign: 'right'}}>毛利率</th>
            <th style={{...TH, textAlign: 'center'}}>結案</th>
            <th style={{...TH, textAlign: 'center'}}>操作</th>
          </tr>
        </thead>
        <tbody>
          {filtered.map(pl => (
            <tr key={pl.id} style={{ borderBottom: '1px solid var(--c-border)', cursor: 'pointer' }} onClick={() => openDetail(pl)}>
              <td style={TD}><span style={{ fontFamily: 'monospace', fontSize: 11, color: 'var(--c-primary)' }}>{pl.pl_no}</span></td>
              <td style={TD}><strong>{pl.event_name}</strong></td>
              <td style={TD}><span style={{ padding: '2px 6px', borderRadius: 4, fontSize: 10, background: pl.event_type === '標案' ? 'var(--c-info-light)' : 'var(--c-warning-light)', fontWeight: 600 }}>{pl.event_type || '活動'}</span></td>
              <td style={TD}>{pl.manager}</td>
              <td style={TD}>{pl.event_start_date?.slice(0,10)}</td>
              <td style={{...TD, textAlign: 'right', fontWeight: 600}}>{FMT(pl.total_quote)}</td>
              {view === 'accounting' && <>
                <td style={{...TD, textAlign: 'right'}}>{FMT(pl.settlement_amount)}</td>
                <td style={{...TD, textAlign: 'right', color: pl.deposit_status === '已收' ? 'var(--c-success)' : 'var(--c-warning)'}}>{FMT(pl.deposit_amount)}</td>
                <td style={{...TD, textAlign: 'right', color: pl.final_payment_status === '已收' ? 'var(--c-success)' : 'var(--c-warning)'}}>{FMT(pl.final_payment_amount)}</td>
              </>}
              <td style={{...TD, textAlign: 'right', color: 'var(--c-danger)'}}>{FMT(pl.total_cost)}</td>
              <td style={{...TD, textAlign: 'right', fontWeight: 700, color: pl.profit >= 0 ? 'var(--c-success)' : 'var(--c-danger)'}}>{FMT(pl.profit)}</td>
              <td style={{...TD, textAlign: 'right'}}><span style={{ padding: '2px 6px', borderRadius: 4, fontSize: 10, background: pl.margin >= 20 ? '#d1fae5' : pl.margin >= 0 ? 'var(--c-warning-light)' : 'var(--c-danger-light)', fontWeight: 600 }}>{pl.margin}%</span></td>
              <td style={{...TD, textAlign: 'center'}}>
                <button onClick={e => { e.stopPropagation(); handleClose(pl); }} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 16 }}>{pl.is_closed ? '✅' : '⬜'}</button>
              </td>
              <td style={{...TD, textAlign: 'center'}}>
                <button onClick={e => { e.stopPropagation(); handleLinkLabor(pl); }} title="匯入勞報成本" style={AB}>👷</button>
                <button onClick={e => { e.stopPropagation(); handleLinkPurchase(pl); }} title="匯入採購成本" style={AB}>🛒</button>
              </td>
            </tr>
          ))}
          {!filtered.length && <tr><td colSpan={99} style={{ textAlign: 'center', padding: 40, color: 'var(--c-text-muted)' }}>尚無損益紀錄</td></tr>}
        </tbody>
      </table>
    </div>

    {/* 明細面板 */}
    {selected && (
      <div style={{ position: 'fixed', top: 0, right: 0, width: 600, height: '100vh', background: 'var(--c-bg)', boxShadow: '-4px 0 20px rgba(0,0,0,.15)', zIndex: 1000, overflow: 'auto', padding: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700 }}>📈 {selected.event_name}</h2>
          <button onClick={() => setSelected(null)} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer' }}>✕</button>
        </div>

        {/* 損益概覽 */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 16 }}>
          <div className="card" style={{ padding: 12, textAlign: 'center' }}><div style={{ fontSize: 11, color: 'var(--c-text-muted)' }}>報價</div><div style={{ fontSize: 16, fontWeight: 700 }}>{FMT(selected.total_quote)}</div></div>
          <div className="card" style={{ padding: 12, textAlign: 'center' }}><div style={{ fontSize: 11, color: 'var(--c-text-muted)' }}>成本</div><div style={{ fontSize: 16, fontWeight: 700, color: 'var(--c-danger)' }}>{FMT(selected.total_cost)}</div></div>
          <div className="card" style={{ padding: 12, textAlign: 'center' }}><div style={{ fontSize: 11, color: 'var(--c-text-muted)' }}>毛利 ({selected.margin}%)</div><div style={{ fontSize: 16, fontWeight: 700, color: selected.profit >= 0 ? 'var(--c-success)' : 'var(--c-danger)' }}>{FMT(selected.profit)}</div></div>
        </div>

        {/* 收款追蹤 */}
        <div className="card" style={{ padding: 14, marginBottom: 16 }}>
          <h4 style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>💰 收款追蹤</h4>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: 12 }}>
            <div>訂金：{FMT(selected.deposit_amount)} <span style={{ color: selected.deposit_status === '已收' ? 'var(--c-success)' : 'var(--c-warning)', fontWeight: 600 }}>({selected.deposit_status || '未設'})</span></div>
            <div>尾款：{FMT(selected.final_payment_amount)} <span style={{ color: selected.final_payment_status === '已收' ? 'var(--c-success)' : 'var(--c-warning)', fontWeight: 600 }}>({selected.final_payment_status || '未設'})</span></div>
            <div>發票：{selected.invoice_no || '—'} <span style={{ color: 'var(--c-primary)', fontWeight: 600 }}>({selected.invoice_status || '未開'})</span></div>
            <div>結案金額：{FMT(selected.settlement_amount)}</div>
          </div>
        </div>

        {/* 執行明細 */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <h4 style={{ fontSize: 13, fontWeight: 600 }}>📋 執行明細 ({details.length} 項)</h4>
          <button className="btn btn-sm btn-primary" onClick={addDetail}>+ 新增明細</button>
        </div>
        <div className="card" style={{ overflow: 'auto', marginBottom: 16 }}>
          <table style={{ width: '100%', fontSize: 11, borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'var(--c-bg-elevated)' }}>
                <th style={TH}>類別</th><th style={TH}>項目名稱</th><th style={{...TH,textAlign:'right'}}>數量</th>
                <th style={{...TH,textAlign:'right'}}>報價</th><th style={{...TH,textAlign:'right'}}>成本</th><th style={{...TH,textAlign:'right'}}>利潤</th>
              </tr>
            </thead>
            <tbody>
              {details.map(d => (
                <tr key={d.id} style={{ borderBottom: '1px solid var(--c-border)' }}>
                  <td style={TD}><span style={{ padding: '1px 5px', borderRadius: 3, fontSize: 10, background: 'var(--c-bg-elevated)' }}>{d.category}</span></td>
                  <td style={TD}>{d.item_name}</td>
                  <td style={{...TD, textAlign:'right'}}>{d.qty}</td>
                  <td style={{...TD, textAlign:'right'}}>{FMT(d.quote_total)}</td>
                  <td style={{...TD, textAlign:'right', color:'var(--c-danger)'}}>{FMT(d.cost_total)}</td>
                  <td style={{...TD, textAlign:'right', color: (d.quote_total-d.cost_total) >= 0 ? 'var(--c-success)' : 'var(--c-danger)', fontWeight:600}}>{FMT(d.quote_total - d.cost_total)}</td>
                </tr>
              ))}
              {!details.length && <tr><td colSpan={6} style={{ textAlign: 'center', padding: 20, color: 'var(--c-text-muted)', fontSize: 11 }}>尚無明細</td></tr>}
            </tbody>
          </table>
        </div>

        {/* 預算追蹤 */}
        <div className="card" style={{ padding: 14, marginBottom: 16 }}>
          <h4 style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>📊 預算追蹤</h4>
          {(() => {
            const budget = selected.budget_amount || selected.total_quote || 0;
            const used = selected.total_cost || 0;
            const remain = budget - used;
            const pct = budget > 0 ? Math.round(used / budget * 100) : 0;
            return (<>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, fontSize: 12, marginBottom: 8 }}>
                <div>預算: <b>{FMT(budget)}</b></div>
                <div>已用: <b style={{ color: 'var(--c-danger)' }}>{FMT(used)}</b></div>
                <div>剩餘: <b style={{ color: remain >= 0 ? 'var(--c-success)' : 'var(--c-danger)' }}>{FMT(remain)}</b></div>
              </div>
              <div style={{ background: 'var(--c-bg-elevated)', borderRadius: 6, height: 16, overflow: 'hidden', position: 'relative' }}>
                <div style={{ width: `${Math.min(pct, 100)}%`, height: '100%', background: pct > 90 ? 'var(--c-danger)' : pct > 70 ? 'var(--c-warning)' : 'var(--c-success)', borderRadius: 6, transition: 'width 0.3s' }}></div>
                <div style={{ position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)', fontSize: 10, fontWeight: 700, lineHeight: '16px' }}>{pct}%</div>
              </div>
            </>);
          })()}
        </div>

        {/* 進度追蹤 */}
        <div className="card" style={{ padding: 14, marginBottom: 16 }}>
          <h4 style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>🚦 進度追蹤</h4>
          <div style={{ display: 'flex', gap: 4 }}>
            {['待處理','企劃中','執行中','已完成','已結案'].map((s, i) => {
              const stageIdx = ['待處理','企劃中','執行中','已完成','已結案'].indexOf(selected.progress_status || (selected.is_closed ? '已結案' : '執行中'));
              const active = i <= stageIdx;
              return (
                <div key={s} style={{ flex: 1, padding: '5px 2px', borderRadius: 4, fontSize: 10, fontWeight: 600, textAlign: 'center',
                  background: active ? (i === 4 ? 'var(--c-success-light)' : i === 3 ? 'var(--c-info-light)' : 'var(--c-warning-light)') : 'var(--c-bg-elevated)',
                  color: active ? (i === 4 ? 'var(--c-success)' : i === 3 ? 'var(--c-info)' : 'var(--c-warning)') : '#94a3b8',
                }}>{s}</div>
              );
            })}
          </div>
        </div>

        {/* 押金/保證金 */}
        {(selected.bid_bond || selected.performance_bond || selected.deposit_amount > 0) && (
          <div className="card" style={{ padding: 14, marginBottom: 16 }}>
            <h4 style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>🏦 押金/保證金</h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, fontSize: 12 }}>
              <div>押標金: <b>{FMT(selected.bid_bond)}</b></div>
              <div>履約保證金: <b>{FMT(selected.performance_bond)}</b></div>
              <div>活動押金: <b>{FMT(selected.event_deposit)}</b></div>
              <div>狀態: <b style={{ color: selected.bond_status === '已退還' ? 'var(--c-success)' : 'var(--c-warning)' }}>{selected.bond_status || '待退還'}</b></div>
              <div>預計退還: <b>{selected.bond_return_date || '—'}</b></div>
            </div>
          </div>
        )}

        {/* 獎金分配 */}
        <div className="card" style={{ padding: 14, marginBottom: 16 }}>
          <h4 style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>🏆 獎金分配</h4>
          {(() => {
            const profit = (selected.settlement_amount || selected.total_quote || 0) - (selected.total_cost || 0);
            const allocatable = Math.round(profit * 0.1);
            return (
              <div style={{ fontSize: 12 }}>
                <div style={{ marginBottom: 6 }}>可分配獎金 (利潤10%): <b style={{ color: 'var(--c-primary)' }}>{FMT(allocatable)}</b></div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 4 }}>
                  {[{r:'企劃',p:10},{r:'執行',p:30},{r:'協助',p:20},{r:'業務',p:15},{r:'行政',p:5}].map(b => (
                    <div key={b.r} style={{ padding: '4px 6px', borderRadius: 4, background: 'var(--c-bg-hover)', textAlign: 'center' }}>
                      <div style={{ fontSize: 10, color: 'var(--c-text-muted)' }}>{b.r} ({b.p}%)</div>
                      <div style={{ fontSize: 12, fontWeight: 600 }}>{FMT(Math.round(allocatable * b.p / 100))}</div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}
        </div>

        {/* 連結操作 */}
        <div className="card" style={{ padding: 14 }}>
          <h4 style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>🔗 跨表連結</h4>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button className="btn btn-sm" onClick={() => handleLinkLabor(selected)}>👷 匯入勞報成本</button>
            <button className="btn btn-sm" onClick={() => handleLinkPurchase(selected)}>🛒 匯入採購成本</button>
            <a href={api.exportPLDetails(selected.id)} target="_blank" rel="noreferrer" className="btn btn-sm">📊 匯出明細</a>
          </div>
          {selected.labor_imported && <div style={{ fontSize: 11, color: 'var(--c-success)', marginTop: 6 }}>✅ 勞報已匯入 {FMT(selected.labor_cost)}</div>}
          {selected.purchase_imported && <div style={{ fontSize: 11, color: 'var(--c-success)' }}>✅ 採購已匯入 {FMT(selected.purchase_cost)}</div>}
        </div>
      </div>
    )}

    {/* 新增/編輯表單 */}
    {showAdd && (
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.4)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="card" style={{ width: 500, maxHeight: '80vh', overflow: 'auto', padding: 24 }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>📈 新增活動損益</h3>
          {[
            ['event_name', '活動名稱', 'text'],
            ['event_type', '活動類型', 'select', ['標案','活動']],
            ['manager', '負責人', 'text'],
            ['customer_name', '客戶/機關', 'text'],
            ['event_start_date', '活動日期', 'date'],
            ['quote_amount', '報價金額', 'number'],
            ['settlement_amount', '結案金額', 'number'],
            ['deposit_amount', '訂金', 'number'],
            ['deposit_status', '訂金狀態', 'select', ['未收','已收','已開發票']],
            ['final_payment_amount', '尾款', 'number'],
            ['final_payment_status', '尾款狀態', 'select', ['未收','已收','已開發票']],
            ['invoice_no', '發票號碼', 'text'],
            ['invoice_status', '發票狀態', 'select', ['未開','訂金已開','已開','不開發票']],
          ].map(([key, label, type, opts]) => (
            <div key={key} style={{ marginBottom: 10 }}>
              <label style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 3 }}>{label}</label>
              {type === 'select' ? (
                <select className="form-input" value={form[key] || ''} onChange={e => setForm(f => ({...f, [key]: e.target.value}))} style={{ width: '100%', fontSize: 12 }}>
                  <option value="">選擇...</option>
                  {opts.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              ) : (
                <input className="form-input" type={type} value={form[key] || ''} onChange={e => setForm(f => ({...f, [key]: type === 'number' ? Number(e.target.value) : e.target.value}))} style={{ width: '100%', fontSize: 12 }} />
              )}
            </div>
          ))}
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 16 }}>
            <button className="btn" onClick={() => setShowAdd(false)}>取消</button>
            <button className="btn btn-primary" onClick={handleSave}>儲存</button>
          </div>
        </div>
      </div>
    )}
  </>);
}

const TH = { padding: '10px 8px', fontSize: 11, fontWeight: 600, color: 'var(--c-text-muted)', borderBottom: '2px solid var(--c-border)' };
const TD = { padding: '10px 8px' };
const AB = { background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, padding: '2px 4px' };
