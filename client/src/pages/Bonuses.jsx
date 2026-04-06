import { useState, useEffect } from 'react'
import { useLang } from '../LangContext'

const FMT = n => `$${Number(n || 0).toLocaleString()}`;
const PCT = n => `${(Number(n || 0) * 100).toFixed(1)}%`;

const SOP_STATUS = {
  draft:     { label: '草稿',     icon: '📝', class: 'badge-secondary', color: 'var(--c-text-muted)' },
  kickoff:   { label: '啟動會議', icon: '🚀', class: 'badge-info',      color: 'var(--c-info)' },
  executing: { label: '執行中',   icon: '⚡', class: 'badge-warning',   color: 'var(--c-warning)' },
  review:    { label: '結案審查', icon: '🔍', class: 'badge-primary',   color: 'var(--c-primary)' },
  approved:  { label: '已核准',   icon: '✅', class: 'badge-success',   color: 'var(--c-success)' },
  paid:      { label: '已發放',   icon: '💰', class: 'badge-success',   color: 'var(--c-success)' },
};
const SOP_NEXT = { draft:'kickoff', kickoff:'executing', executing:'review', review:'approved', approved:'paid' };

const CATEGORIES = { bidding: { label: '標案', prefix: 'M' }, commercial: { label: '商業案', prefix: 'C' } };

export default function Bonuses() {
  const { t } = useLang();
  const [tab, setTab] = useState('calculator');
  const [bonuses, setBonuses] = useState([]);
  const [tiers, setTiers] = useState({ bidding: [], commercial: [] });
  const [stats, setStats] = useState({});
  const [events, setEvents] = useState([]);
  const [board, setBoard] = useState({});
  const [calcForm, setCalcForm] = useState({ gross_amount: '', total_cost: '', category: 'bidding', event_id: '' });
  const [calcResult, setCalcResult] = useState(null);
  const [poolForm, setPoolForm] = useState({ pool_amount: '', roles: [] });
  const [poolResult, setPoolResult] = useState(null);
  // Point allocation
  const [selectedBonus, setSelectedBonus] = useState(null);
  const [pointAlloc, setPointAlloc] = useState(null);
  // Review
  const [reviewData, setReviewData] = useState(null);
  const [reviewNotes, setReviewNotes] = useState('');
  const [reviewRating, setReviewRating] = useState(5);

  const headers = () => ({ Authorization: `Bearer ${localStorage.getItem('erp_token')}`, 'Content-Type': 'application/json' });
  const api = async (url, opts) => { const r = await fetch(url, { headers: headers(), ...opts }); return r; };

  const load = async () => {
    try {
      const [bRes, tRes, sRes] = await Promise.all([
        api('/api/bonuses'), api('/api/bonuses/tiers'), api('/api/bonuses/stats'),
      ]);
      if (bRes.ok) { const d = await bRes.json(); setBonuses(Array.isArray(d) ? d : []); }
      if (tRes.ok) { setTiers(await tRes.json()); }
      if (sRes.ok) { setStats(await sRes.json()); }
    } catch (e) { /* silent */ }
  };
  const loadBoard = async () => {
    try { const r = await api('/api/bonuses/sop/board'); if (r.ok) { setBoard((await r.json()).board || {}); } } catch(e) {}
  };

  useEffect(() => { load(); loadBoard(); api('/api/events').then(r=>r.ok?r.json():[]).then(d=>setEvents(Array.isArray(d)?d:[])).catch(()=>{}); }, []);

  // ─── Calculator ───
  const calculate = async () => {
    const body = {}; if (calcForm.event_id) body.event_id = calcForm.event_id;
    if (calcForm.gross_amount) body.gross_amount = Number(calcForm.gross_amount);
    if (calcForm.total_cost) body.total_cost = Number(calcForm.total_cost);
    body.category = calcForm.category;
    const r = await api('/api/bonuses/calculate', { method:'POST', body: JSON.stringify(body) });
    if (r.ok) setCalcResult(await r.json());
  };
  const saveBonus = async () => {
    if (!calcResult) return;
    await api('/api/bonuses', { method:'POST', body: JSON.stringify({
      event_id: calcResult.event_id, amount: calcResult.total_bonus, bonus_type:'total',
      tier_code: calcResult.tier?.code, category: calcResult.category,
      gross_amount: calcResult.gross_amount, net_revenue: calcResult.net_revenue,
      total_cost: calcResult.total_cost, profit: calcResult.profit, margin: calcResult.margin,
      execution_bonus: calcResult.execution_bonus, execution_primary: calcResult.execution_primary,
      execution_secondary: calcResult.execution_secondary, pool_bonus: calcResult.pool_bonus,
      referral_bonus: calcResult.referral_bonus,
    })});
    load(); loadBoard(); setCalcResult(null);
  };

  // ─── SOP ───
  const transitionBonus = async (id, target) => {
    const r = await api(`/api/bonuses/${id}/transition`, { method:'PUT', body: JSON.stringify({ target_status: target }) });
    if (!r.ok) { const err = await r.json(); alert(err.error || '轉換失敗'); return; }
    load(); loadBoard();
  };

  // ─── Pool ───
  const calculatePool = async () => {
    const r = await api('/api/bonuses/calculate/pool', { method:'POST', body: JSON.stringify({ pool_amount: Number(poolForm.pool_amount), roles: poolForm.roles }) });
    if (r.ok) setPoolResult(await r.json());
  };
  const addPoolRole = () => setPoolForm(p => ({ ...p, roles: [...p.roles, { role:'', user_name:'', base_points:1, bonus_points:0, points:1 }] }));
  const updatePoolRole = (i, f, v) => setPoolForm(p => {
    const roles = [...p.roles]; roles[i] = { ...roles[i], [f]: v };
    if (f==='base_points'||f==='bonus_points') roles[i].points = Number(roles[i].base_points||0)+Number(roles[i].bonus_points||0);
    return { ...p, roles };
  });
  const removePoolRole = i => setPoolForm(p => ({ ...p, roles: p.roles.filter((_,j)=>j!==i) }));

  // ─── Point Allocation ───
  const loadPointAlloc = async (bonusId) => {
    try {
      const r = await api(`/api/bonuses/point-allocation/${bonusId}`);
      if (r.ok) { setPointAlloc(await r.json()); return true; }
    } catch(e) {}
    setPointAlloc(null); return false;
  };
  const createPointAlloc = async (bonusId) => {
    const r = await api('/api/bonuses/point-allocation', { method:'POST', body: JSON.stringify({ bonus_id: bonusId }) });
    if (r.ok) { setPointAlloc(await r.json()); }
  };
  const updatePointItem = (section, idx, field, value) => {
    if (!pointAlloc) return;
    const items = [...pointAlloc[section]];
    items[idx] = { ...items[idx], [field]: field === 'points' ? Number(value) : value };
    setPointAlloc({ ...pointAlloc, [section]: items });
  };
  const savePointAlloc = async () => {
    if (!pointAlloc) return;
    const r = await api(`/api/bonuses/point-allocation/${pointAlloc.id}`, { method:'PUT', body: JSON.stringify({ core_items: pointAlloc.core_items, matrix_items: pointAlloc.matrix_items }) });
    if (r.ok) { const d = await r.json(); setPointAlloc(d); loadBoard(); alert('配分已儲存'); }
  };
  const selectBonusForPoints = async (b) => {
    setSelectedBonus(b);
    const loaded = await loadPointAlloc(b.id);
    if (!loaded && (b.status === 'kickoff' || b.status === 'draft')) await createPointAlloc(b.id);
  };

  // ─── Review ───
  const loadReview = async (bonusId) => {
    try { const r = await api(`/api/bonuses/review/${bonusId}`); if (r.ok) { setReviewData(await r.json()); return; } } catch(e) {}
    setReviewData(null);
  };
  const createReview = async (bonusId) => {
    const r = await api(`/api/bonuses/${bonusId}/review`, { method:'POST', body: JSON.stringify({ supervisor_notes: reviewNotes, performance_rating: reviewRating }) });
    if (r.ok) setReviewData(await r.json());
    else { const err = await r.json(); alert(err.error || '建立失敗'); }
  };
  const updateReviewItem = (section, idx, field, value) => {
    if (!reviewData) return;
    const items = [...reviewData[section]];
    items[idx] = { ...items[idx], [field]: field === 'points' ? Number(value) : value };
    setReviewData({ ...reviewData, [section]: items });
  };
  const saveReview = async (bonusId) => {
    if (!reviewData) return;
    const r = await api(`/api/bonuses/${bonusId}/review`, { method:'PUT', body: JSON.stringify({ final_core_items: reviewData.final_core_items, final_matrix_items: reviewData.final_matrix_items, supervisor_notes: reviewNotes, performance_rating: reviewRating }) });
    if (r.ok) { setReviewData(await r.json()); alert('審查已更新'); }
  };
  const approveReview = async (bonusId) => {
    if (!confirm('確定核定此結案審查？核定後將無法修改配分。')) return;
    const r = await api(`/api/bonuses/${bonusId}/review/approve`, { method:'POST' });
    if (r.ok) { await loadReview(bonusId); loadBoard(); alert('已核定'); }
  };
  const selectBonusForReview = async (b) => { setSelectedBonus(b); await loadReview(b.id); };

  // ─── Renderers ───
  const renderCalculator = () => (
    <div className="card" style={{ padding: 24 }}>
      <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>🧮 獎金計算器</h3>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr 1fr', gap:12, marginBottom:16 }}>
        <div className="form-group"><label className="form-label">專案類型</label>
          <select className="form-input" value={calcForm.category} onChange={e=>setCalcForm(p=>({...p,category:e.target.value}))}>
            <option value="bidding">📋 標案（M系列）</option><option value="commercial">💼 商業案（C系列）</option>
          </select></div>
        <div className="form-group"><label className="form-label">含稅金額</label>
          <input className="form-input" type="number" placeholder="例：1000000" value={calcForm.gross_amount} onChange={e=>setCalcForm(p=>({...p,gross_amount:e.target.value}))} /></div>
        <div className="form-group"><label className="form-label">總成本</label>
          <input className="form-input" type="number" placeholder="例：700000" value={calcForm.total_cost} onChange={e=>setCalcForm(p=>({...p,total_cost:e.target.value}))} /></div>
        <div className="form-group"><label className="form-label">或選擇活動</label>
          <select className="form-input" value={calcForm.event_id} onChange={e=>setCalcForm(p=>({...p,event_id:e.target.value}))}>
            <option value="">— 手動輸入 —</option>{events.map(ev=><option key={ev.id} value={ev.id}>{ev.name}</option>)}
          </select></div>
      </div>
      <button className="btn btn-primary" onClick={calculate} style={{ marginBottom:16 }}>🧮 開始計算</button>
      {calcResult && (<div style={{ borderTop:'1px solid var(--c-border)', paddingTop:16 }}>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:10, marginBottom:16 }}>
          {[{ label:'未稅營收',value:FMT(calcResult.net_revenue)},{label:'總成本',value:FMT(calcResult.total_cost),color:'var(--c-danger)'},{label:'利潤',value:FMT(calcResult.profit),color:'var(--c-success)'},{label:'毛利率',value:calcResult.margin_pct,color:'var(--c-warning)'},{label:'級距',value:calcResult.tier?.code||'—',color:'var(--c-primary)'}].map((it,i)=>(
            <div key={i} className="card" style={{ padding:12,textAlign:'center',background:'var(--c-bg)' }}><div style={{ fontSize:18,fontWeight:800,color:it.color }}>{it.value}</div><div style={{ fontSize:10,color:'var(--c-text-muted)' }}>{it.label}</div></div>
          ))}
        </div>
        <h4 style={{ fontSize:13,fontWeight:700,marginBottom:8 }}>📊 三類提撥明細</h4>
        <div className="table-wrap"><table><thead><tr><th>獎金類型</th><th>級距比率</th><th>計算基數</th><th>提撥金額</th></tr></thead><tbody>
          <tr><td>🎯 執行獎金</td><td>{PCT(calcResult.tier?.execution_rate)}</td><td>{FMT(calcResult.profit)}</td><td style={{fontWeight:700,color:'var(--c-primary)'}}>{FMT(calcResult.execution_bonus)}</td></tr>
          <tr><td>🏦 獎金池</td><td>{PCT(calcResult.tier?.pool_rate)}</td><td>{FMT(calcResult.profit)}</td><td style={{fontWeight:700,color:'var(--c-info)'}}>{FMT(calcResult.pool_bonus)}</td></tr>
          <tr><td>🤝 介紹獎金</td><td>{PCT(calcResult.tier?.referral_rate)}</td><td>{FMT(calcResult.profit)}</td><td style={{fontWeight:700,color:'var(--c-warning)'}}>{FMT(calcResult.referral_bonus)}</td></tr>
        </tbody></table></div>
        {calcResult.execution_bonus > 0 && (<>
          <h4 style={{ fontSize:13,fontWeight:700,margin:'12px 0 8px' }}>🎯 執行獎金分配（7:3）</h4>
          <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:12 }}>
            <div className="card" style={{ padding:14,background:'var(--c-bg)' }}><div style={{ fontSize:11,color:'var(--c-text-muted)' }}>主要執行者 (70%)</div><div style={{ fontSize:20,fontWeight:800,color:'var(--c-primary)' }}>{FMT(calcResult.execution_primary)}</div></div>
            <div className="card" style={{ padding:14,background:'var(--c-bg)' }}><div style={{ fontSize:11,color:'var(--c-text-muted)' }}>次要執行者 (30%)</div><div style={{ fontSize:20,fontWeight:800,color:'var(--c-info)' }}>{FMT(calcResult.execution_secondary)}</div></div>
          </div>
        </>)}
        <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',padding:'12px 16px',background:'var(--c-primary-light)',borderRadius:8,marginTop:12 }}>
          <span style={{ fontWeight:700,fontSize:14 }}>🏆 獎金提撥總計</span><span style={{ fontSize:22,fontWeight:900,color:'var(--c-primary)' }}>{FMT(calcResult.total_bonus)}</span>
        </div>
        <div style={{ display:'flex',gap:8,justifyContent:'flex-end',marginTop:12 }}><button className="btn btn-primary" onClick={saveBonus}>💾 儲存獎金紀錄</button></div>
      </div>)}
    </div>
  );

  const renderTiers = () => (
    <div style={{ display:'grid',gap:16 }}>
      {Object.entries(tiers).map(([cat, tierList]) => (
        <div key={cat} className="card" style={{ padding:20 }}>
          <h3 style={{ fontSize:14,fontWeight:700,marginBottom:12 }}>{cat==='bidding'?'📋 標案類（M系列）— 毛利率門檻 20%':'💼 商業案類（C系列）— 毛利率門檻 25%'}</h3>
          <div className="table-wrap"><table><thead><tr><th>級距</th><th>毛利率範圍</th><th>執行獎金</th><th>獎金池</th><th>介紹獎金</th><th>提撥合計</th></tr></thead><tbody>
            {(tierList||[]).map(tier => { const total=(tier.execution_rate||0)+(tier.pool_rate||0)+(tier.referral_rate||0); const z=total===0; return (
              <tr key={tier.code} style={z?{opacity:0.5}:{}}><td style={{fontWeight:700}}>{tier.code}</td>
                <td>{z?`< ${(tier.max_margin*100+0.01).toFixed(0)}%`:`${(tier.min_margin*100).toFixed(0)}% ~ ${(tier.max_margin*100).toFixed(0)}%`}</td>
                <td>{z?'—':PCT(tier.execution_rate)}</td><td>{z?'—':PCT(tier.pool_rate)}</td><td>{z?'—':PCT(tier.referral_rate)}</td>
                <td style={{fontWeight:700,color:z?'':'var(--c-primary)'}}>{z?'無獎金':PCT(total)}</td></tr>
            );})}
          </tbody></table></div>
        </div>
      ))}
    </div>
  );

  const renderRecords = () => (
    bonuses.length === 0 ? (
      <div className="empty-state"><div className="empty-state-icon">🏆</div><div className="empty-state-title">尚無獎金紀錄</div></div>
    ) : (
      <div className="table-wrap"><table><thead><tr><th>活動</th><th>類型</th><th>級距</th><th>執行獎金</th><th>獎金池</th><th>介紹獎金</th><th>總額</th><th>狀態</th><th>操作</th></tr></thead><tbody>{bonuses.map(b=>(
        <tr key={b.id}>
          <td style={{fontWeight:600}}>{b.event_name||'—'}</td>
          <td><span className="badge">{CATEGORIES[b.category]?.label||b.category}</span></td>
          <td style={{fontWeight:700,color:'var(--c-primary)'}}>{b.tier_code||'—'}</td>
          <td>{FMT(b.execution_bonus)}</td><td>{FMT(b.pool_bonus)}</td><td>{FMT(b.referral_bonus)}</td>
          <td style={{fontWeight:700,color:'var(--c-primary)'}}>{FMT(b.amount)}</td>
          <td><span className={`badge ${SOP_STATUS[b.status]?.class||''}`}>{SOP_STATUS[b.status]?.icon} {SOP_STATUS[b.status]?.label||b.status}</span></td>
          <td>{SOP_NEXT[b.status] && <button className="btn btn-sm btn-primary" onClick={()=>transitionBonus(b.id,SOP_NEXT[b.status])}>{SOP_STATUS[SOP_NEXT[b.status]]?.icon} → {SOP_STATUS[SOP_NEXT[b.status]]?.label}</button>}</td>
        </tr>
      ))}</tbody></table></div>
    )
  );

  const renderPool = () => (
    <div className="card" style={{ padding:24 }}>
      <h3 style={{ fontSize:15,fontWeight:700,marginBottom:16 }}>🏦 獎金池分配計算</h3>
      <p style={{ fontSize:12,color:'var(--c-text-muted)',marginBottom:12 }}>公式：個人金額 = (個人總積分 ÷ MAX(6, 實際總積分)) × 獎金池總額<br/>職務基底分各 1 分，績效加分上限 100%。缺額盈餘回流公司。</p>
      <div style={{ display:'grid',gridTemplateColumns:'200px 1fr',gap:12,marginBottom:16 }}>
        <div className="form-group"><label className="form-label">獎金池金額</label><input className="form-input" type="number" value={poolForm.pool_amount} onChange={e=>setPoolForm(p=>({...p,pool_amount:e.target.value}))} placeholder="例：7571" /></div>
        <div style={{ display:'flex',alignItems:'flex-end',gap:8 }}><button className="btn btn-sm" onClick={addPoolRole}>➕ 新增角色</button></div>
      </div>
      {poolForm.roles.length > 0 && (<div className="table-wrap" style={{marginBottom:12}}><table><thead><tr><th>職務</th><th>姓名</th><th>基底分</th><th>績效加分</th><th>總分</th><th></th></tr></thead><tbody>{poolForm.roles.map((r,i)=>(
        <tr key={i}><td><select className="form-input" style={{padding:'3px 6px',fontSize:11}} value={r.role} onChange={e=>updatePoolRole(i,'role',e.target.value)}><option value="">選擇</option>{['企劃','設計','行政','主管','硬體','協助'].map(role=><option key={role} value={role}>{role}</option>)}</select></td>
          <td><input className="form-input" style={{padding:'3px 6px',fontSize:11}} value={r.user_name} onChange={e=>updatePoolRole(i,'user_name',e.target.value)} placeholder="姓名" /></td>
          <td><input className="form-input" type="number" style={{padding:'3px 6px',fontSize:11,width:60}} value={r.base_points} onChange={e=>updatePoolRole(i,'base_points',Number(e.target.value))} /></td>
          <td><input className="form-input" type="number" step="0.5" style={{padding:'3px 6px',fontSize:11,width:60}} value={r.bonus_points} onChange={e=>updatePoolRole(i,'bonus_points',Number(e.target.value))} /></td>
          <td style={{fontWeight:700}}>{r.points}</td>
          <td><button className="btn btn-sm" style={{padding:'2px 6px',fontSize:10}} onClick={()=>removePoolRole(i)}>✕</button></td></tr>
      ))}</tbody></table></div>)}
      <button className="btn btn-primary" onClick={calculatePool}>🧮 計算分配</button>
      {poolResult && (<div style={{ borderTop:'1px solid var(--c-border)',paddingTop:14,marginTop:14 }}>
        <div style={{ display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:10,marginBottom:12 }}>
          <div className="card" style={{padding:10,textAlign:'center',background:'var(--c-bg)'}}><div style={{fontSize:16,fontWeight:800}}>分母 = {poolResult.denominator}</div><div style={{fontSize:10,color:'var(--c-text-muted)'}}>MAX(6, {poolResult.total_points})</div></div>
          <div className="card" style={{padding:10,textAlign:'center',background:'var(--c-bg)'}}><div style={{fontSize:16,fontWeight:800,color:'var(--c-success)'}}>{FMT(poolResult.distributed)}</div><div style={{fontSize:10,color:'var(--c-text-muted)'}}>已分配</div></div>
          <div className="card" style={{padding:10,textAlign:'center',background:'var(--c-bg)'}}><div style={{fontSize:16,fontWeight:800,color:'var(--c-warning)'}}>{FMT(poolResult.company_clawback)}</div><div style={{fontSize:10,color:'var(--c-text-muted)'}}>回流公司</div></div>
        </div>
        {poolResult.allocations?.length > 0 && (<div className="table-wrap"><table><thead><tr><th>職務</th><th>姓名</th><th>基底分</th><th>績效加分</th><th>總分</th><th>分配金額</th></tr></thead><tbody>{poolResult.allocations.map((a,i)=>(
          <tr key={i}><td>{a.role||'—'}</td><td>{a.user_name||'—'}</td><td>{a.base_points}</td><td>{a.bonus_points}</td><td style={{fontWeight:700}}>{a.points}</td><td style={{fontWeight:700,color:'var(--c-primary)'}}>{FMT(a.share)}</td></tr>
        ))}</tbody></table></div>)}
      </div>)}
    </div>
  );

  // ─── SOP Board ───
  const renderBoard = () => {
    const states = ['draft','kickoff','executing','review','approved','paid'];
    return (
      <div style={{ overflowX:'auto', paddingBottom:8 }}>
        <div style={{ display:'grid', gridTemplateColumns:`repeat(${states.length}, minmax(200px, 1fr))`, gap:10, minWidth:1200 }}>
          {states.map(state => {
            const items = board[state] || [];
            const st = SOP_STATUS[state];
            return (
              <div key={state} style={{ background:'var(--c-bg-elevated)', borderRadius:'var(--radius)', padding:12, minHeight:200 }}>
                <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:12, paddingBottom:8, borderBottom:'2px solid var(--c-border)' }}>
                  <span style={{ fontSize:16 }}>{st.icon}</span>
                  <span style={{ fontWeight:700, fontSize:13 }}>{st.label}</span>
                  <span className="badge" style={{ marginLeft:'auto', background:'var(--c-bg)', fontSize:11 }}>{items.length}</span>
                </div>
                {items.length === 0 ? <div style={{ color:'var(--c-text-muted)', fontSize:11, textAlign:'center', padding:20 }}>無案件</div> :
                  items.map(b => (
                    <div key={b.id} className="card" style={{ padding:12, marginBottom:8, cursor:'pointer', transition:'all 0.2s' }}
                      onClick={() => { if(state==='kickoff'||state==='draft') { setTab('points'); selectBonusForPoints(b); } else if(state==='review') { setTab('review'); selectBonusForReview(b); } }}>
                      <div style={{ fontWeight:700, fontSize:13, marginBottom:4 }}>{b.event_name || '手動計算'}</div>
                      <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginBottom:6 }}>
                        <span className="badge badge-primary">{b.tier_code||'—'}</span>
                        <span className="badge">{CATEGORIES[b.category]?.label}</span>
                      </div>
                      <div style={{ fontSize:18, fontWeight:800, color:st.color, marginBottom:6 }}>{FMT(b.amount)}</div>
                      <div style={{ fontSize:10, color:'var(--c-text-muted)' }}>建立 {b.days_since} 天前
                        {b.has_point_allocation && ' • ✅配分'}{b.has_review && ' • ✅審查'}
                      </div>
                      {SOP_NEXT[state] && (
                        <button className="btn btn-sm btn-primary" style={{ marginTop:8, width:'100%' }}
                          onClick={e => { e.stopPropagation(); transitionBonus(b.id, SOP_NEXT[state]); }}>
                          → {SOP_STATUS[SOP_NEXT[state]]?.label}
                        </button>
                      )}
                    </div>
                  ))
                }
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // ─── Point Allocation ───
  const renderPointItems = (items, section, locked) => (
    <div className="table-wrap" style={{ marginBottom:12 }}><table><thead><tr><th style={{width:40}}>圖示</th><th>項目</th><th>說明</th><th style={{width:80}}>負責人</th><th style={{width:60}}>點數</th></tr></thead><tbody>
      {items.map((it,i) => (
        <tr key={it.key}><td style={{fontSize:18,textAlign:'center'}}>{it.icon}</td><td style={{fontWeight:600}}>{it.label}</td><td style={{fontSize:11,color:'var(--c-text-muted)'}}>{it.description}</td>
          <td><input className="form-input" style={{padding:'3px 6px',fontSize:11}} value={it.assignee_name||''} disabled={locked} onChange={e=>updatePointItem(section,i,'assignee_name',e.target.value)} /></td>
          <td><input className="form-input" type="number" min={0} max={it.max||10} step={0.5} style={{padding:'3px 6px',fontSize:11,width:55}} value={it.points||0} disabled={locked} onChange={e=>updatePointItem(section,i,'points',e.target.value)} /></td>
        </tr>))}
    </tbody></table></div>
  );

  const renderPoints = () => {
    const allBonuses = [...(board.draft||[]), ...(board.kickoff||[]), ...(board.executing||[])];
    if (!selectedBonus && allBonuses.length > 0) { selectBonusForPoints(allBonuses[0]); }
    const coreTotal = pointAlloc ? pointAlloc.core_items.reduce((s,c)=>s+(c.points||0),0) : 0;
    const matrixTotal = pointAlloc ? pointAlloc.matrix_items.reduce((s,m)=>s+(m.points||0),0) : 0;
    const total = coreTotal + matrixTotal;
    const locked = pointAlloc?.is_locked;
    return (
      <div style={{ display:'grid', gridTemplateColumns:'220px 1fr', gap:16 }}>
        <div className="card" style={{ padding:16 }}>
          <h4 style={{ fontSize:13, fontWeight:700, marginBottom:12 }}>📋 選擇案件</h4>
          {allBonuses.length === 0 ? <div style={{ color:'var(--c-text-muted)', fontSize:12 }}>無可配分案件</div> :
            allBonuses.map(b => (
              <div key={b.id} onClick={()=>selectBonusForPoints(b)} style={{ padding:'10px 12px', borderRadius:'var(--radius-xs)', cursor:'pointer', marginBottom:4, background: selectedBonus?.id===b.id ? 'var(--c-primary-light)' : 'transparent', border: selectedBonus?.id===b.id ? '1px solid var(--c-primary)' : '1px solid transparent' }}>
                <div style={{ fontWeight:600, fontSize:12 }}>{b.event_name||'手動計算'}</div>
                <div style={{ fontSize:10, color:'var(--c-text-muted)' }}>{SOP_STATUS[b.status]?.icon} {SOP_STATUS[b.status]?.label} • {FMT(b.amount)}</div>
              </div>
            ))
          }
        </div>
        <div>
          {!pointAlloc ? <div className="empty-state"><div className="empty-state-icon">🎯</div><div className="empty-state-title">請選擇案件</div></div> : (
            <div className="card" style={{ padding:24 }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
                <h3 style={{ fontSize:15, fontWeight:700 }}>🎯 10 點積分配分</h3>
                {locked && <span className="badge badge-warning">🔒 已鎖定</span>}
              </div>
              {/* 即時統計 */}
              <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:10, marginBottom:16 }}>
                <div className="card" style={{ padding:10, textAlign:'center', background:'var(--c-bg)' }}><div style={{ fontSize:20, fontWeight:800, color: total>10?'var(--c-danger)':total===10?'var(--c-success)':'var(--c-primary)' }}>{total}</div><div style={{ fontSize:10, color:'var(--c-text-muted)' }}>已配分 / 10</div></div>
                <div className="card" style={{ padding:10, textAlign:'center', background:'var(--c-bg)' }}><div style={{ fontSize:20, fontWeight:800 }}>{coreTotal}</div><div style={{ fontSize:10, color:'var(--c-text-muted)' }}>核心職能</div></div>
                <div className="card" style={{ padding:10, textAlign:'center', background:'var(--c-bg)' }}><div style={{ fontSize:20, fontWeight:800 }}>{matrixTotal}</div><div style={{ fontSize:10, color:'var(--c-text-muted)' }}>任務矩陣</div></div>
                <div className="card" style={{ padding:10, textAlign:'center', background:'var(--c-bg)' }}><div style={{ fontSize:20, fontWeight:800, color: 10-total<0?'var(--c-danger)':'var(--c-success)' }}>{10-total}</div><div style={{ fontSize:10, color:'var(--c-text-muted)' }}>剩餘點數</div></div>
              </div>
              {/* Progress bar */}
              <div style={{ height:8, background:'var(--c-bg-elevated)', borderRadius:4, marginBottom:16, overflow:'hidden' }}>
                <div style={{ height:'100%', width:`${Math.min(total/10*100,100)}%`, background: total>10?'var(--c-danger)':total===10?'var(--c-success)':'var(--c-primary)', borderRadius:4, transition:'width 0.3s ease' }} />
              </div>
              <h4 style={{ fontSize:13, fontWeight:700, marginBottom:8 }}>📊 核心職能（3 ~ 10 點）</h4>
              {renderPointItems(pointAlloc.core_items, 'core_items', locked)}
              <h4 style={{ fontSize:13, fontWeight:700, marginBottom:8 }}>🧩 任務矩陣（0 ~ 7 點）</h4>
              {renderPointItems(pointAlloc.matrix_items, 'matrix_items', locked)}
              {!locked && <div style={{ display:'flex', justifyContent:'flex-end', gap:8 }}><button className="btn btn-primary" onClick={savePointAlloc} disabled={total>10}>💾 儲存配分</button></div>}
            </div>
          )}
        </div>
      </div>
    );
  };

  // ─── Review Tab ───
  const renderReviewTab = () => {
    const reviewBonuses = [...(board.review||[]), ...(board.approved||[]), ...(board.paid||[])];
    if (!selectedBonus && reviewBonuses.length > 0) selectBonusForReview(reviewBonuses[0]);
    return (
      <div style={{ display:'grid', gridTemplateColumns:'220px 1fr', gap:16 }}>
        <div className="card" style={{ padding:16 }}>
          <h4 style={{ fontSize:13, fontWeight:700, marginBottom:12 }}>📋 結案案件</h4>
          {reviewBonuses.length === 0 ? <div style={{ color:'var(--c-text-muted)', fontSize:12 }}>無結案審查案件<br/><span style={{fontSize:11}}>請先在看板將案件推進至「結案審查」</span></div> :
            reviewBonuses.map(b => (
              <div key={b.id} onClick={()=>selectBonusForReview(b)} style={{ padding:'10px 12px', borderRadius:'var(--radius-xs)', cursor:'pointer', marginBottom:4, background: selectedBonus?.id===b.id ? 'var(--c-primary-light)' : 'transparent', border: selectedBonus?.id===b.id ? '1px solid var(--c-primary)' : '1px solid transparent' }}>
                <div style={{ fontWeight:600, fontSize:12 }}>{b.event_name||'手動計算'}</div>
                <div style={{ fontSize:10, color:'var(--c-text-muted)' }}>{SOP_STATUS[b.status]?.icon} {SOP_STATUS[b.status]?.label} • {FMT(b.amount)}</div>
              </div>
            ))
          }
        </div>
        <div>
          {!selectedBonus ? <div className="empty-state"><div className="empty-state-icon">🔍</div><div className="empty-state-title">請選擇案件</div></div> : !reviewData ? (
            <div className="card" style={{ padding:24 }}>
              <h3 style={{ fontSize:15, fontWeight:700, marginBottom:16 }}>🔍 建立結案審查</h3>
              <div className="form-group"><label className="form-label">主管備註</label><textarea className="form-textarea" value={reviewNotes} onChange={e=>setReviewNotes(e.target.value)} placeholder="審查備註..." /></div>
              <div className="form-group"><label className="form-label">績效評分（1-10）</label><input className="form-input" type="number" min={1} max={10} value={reviewRating} onChange={e=>setReviewRating(Number(e.target.value))} /></div>
              <button className="btn btn-primary" onClick={()=>createReview(selectedBonus.id)}>📝 建立審查表</button>
            </div>
          ) : (
            <div className="card" style={{ padding:24 }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
                <h3 style={{ fontSize:15, fontWeight:700 }}>🔍 結案審查 — {selectedBonus?.event_name || '手動計算'}</h3>
                {reviewData.is_approved && <span className="badge badge-success">✅ 已核定</span>}
              </div>
              {/* 初始 vs 最終 對比 */}
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, marginBottom:16 }}>
                <div><h4 style={{ fontSize:13, fontWeight:700, marginBottom:8 }}>📌 啟動時配分（初始值）</h4>
                  <div className="table-wrap"><table><thead><tr><th>項目</th><th>點數</th></tr></thead><tbody>
                    {(reviewData.initial_core_items||[]).concat(reviewData.initial_matrix_items||[]).map(it=>(
                      <tr key={it.key}><td>{it.icon} {it.label}</td><td style={{fontWeight:700}}>{it.points||0}</td></tr>
                    ))}<tr style={{background:'var(--c-bg-elevated)'}}><td style={{fontWeight:700}}>合計</td><td style={{fontWeight:800,color:'var(--c-primary)'}}>{reviewData.initial_total||0}</td></tr>
                  </tbody></table></div>
                </div>
                <div><h4 style={{ fontSize:13, fontWeight:700, marginBottom:8 }}>✏️ 主管核定配分</h4>
                  <div className="table-wrap"><table><thead><tr><th>項目</th><th>點數</th></tr></thead><tbody>
                    {(reviewData.final_core_items||[]).map((it,i)=>(
                      <tr key={it.key}><td>{it.icon} {it.label}</td><td><input className="form-input" type="number" min={0} max={10} step={0.5} style={{padding:'3px 6px',fontSize:11,width:55}} value={it.points||0} disabled={reviewData.is_approved} onChange={e=>updateReviewItem('final_core_items',i,'points',e.target.value)} /></td></tr>
                    ))}
                    {(reviewData.final_matrix_items||[]).map((it,i)=>(
                      <tr key={it.key}><td>{it.icon} {it.label}</td><td><input className="form-input" type="number" min={0} max={7} step={0.5} style={{padding:'3px 6px',fontSize:11,width:55}} value={it.points||0} disabled={reviewData.is_approved} onChange={e=>updateReviewItem('final_matrix_items',i,'points',e.target.value)} /></td></tr>
                    ))}
                    <tr style={{background:'var(--c-bg-elevated)'}}><td style={{fontWeight:700}}>合計</td><td style={{fontWeight:800,color:'var(--c-primary)'}}>{(reviewData.final_core_items||[]).reduce((s,c)=>s+(c.points||0),0)+(reviewData.final_matrix_items||[]).reduce((s,m)=>s+(m.points||0),0)}</td></tr>
                  </tbody></table></div>
                </div>
              </div>
              <div className="form-group"><label className="form-label">主管備註</label><textarea className="form-textarea" value={reviewData.supervisor_notes||''} disabled={reviewData.is_approved} onChange={e=>setReviewData({...reviewData, supervisor_notes:e.target.value})} /></div>
              {!reviewData.is_approved && (
                <div style={{ display:'flex', gap:8, justifyContent:'flex-end' }}>
                  <button className="btn btn-secondary" onClick={()=>saveReview(selectedBonus.id)}>💾 儲存變更</button>
                  <button className="btn btn-success" onClick={()=>approveReview(selectedBonus.id)}>✅ 主管核定</button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  const TABS = [
    { key:'calculator', label:'🧮 獎金計算器' },
    { key:'tiers', label:'📊 級距表' },
    { key:'board', label:'📋 SOP 流程看板' },
    { key:'points', label:'🎯 積分配分' },
    { key:'pool', label:'🏦 獎金池分配' },
    { key:'review', label:'🔍 結案審查' },
    { key:'records', label:`💰 獎金紀錄 (${bonuses.length})` },
  ];

  return (<>
    <div className="page-header"><div><h1 className="page-title">{t('page.bonuses')}</h1><p className="page-subtitle">專案利潤共享與獎金分配管理</p></div></div>
    {/* KPI */}
    <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12, marginBottom:20 }}>
      <div className="stat-card"><div className="stat-icon" style={{background:'var(--c-warning-light)'}}>⏳</div><div><div className="stat-value">{FMT(stats.pending_amount)}</div><div className="stat-label">待處理 ({stats.pending_count||0})</div></div></div>
      <div className="stat-card"><div className="stat-icon" style={{background:'var(--c-info-light)'}}>✅</div><div><div className="stat-value" style={{color:'var(--c-info)'}}>{FMT(stats.approved_amount)}</div><div className="stat-label">已核准 ({stats.approved_count||0})</div></div></div>
      <div className="stat-card"><div className="stat-icon" style={{background:'var(--c-success-light)'}}>💰</div><div><div className="stat-value" style={{color:'var(--c-success)'}}>{FMT(stats.paid_amount)}</div><div className="stat-label">已發放 ({stats.paid_count||0})</div></div></div>
      <div className="stat-card"><div className="stat-icon" style={{background:'var(--c-primary-light)'}}>🏆</div><div><div className="stat-value" style={{color:'var(--c-primary)'}}>{FMT(stats.total_amount)}</div><div className="stat-label">獎金總額</div></div></div>
    </div>
    {/* Tabs */}
    <div className="sub-tabs" style={{ marginBottom:16, flexWrap:'wrap' }}>
      {TABS.map(t => <button key={t.key} className={`sub-tab ${tab===t.key?'active':''}`} onClick={()=>{setTab(t.key);if(t.key==='board')loadBoard();}}>{t.label}</button>)}
    </div>
    {tab==='calculator' && renderCalculator()}
    {tab==='tiers' && renderTiers()}
    {tab==='board' && renderBoard()}
    {tab==='points' && renderPoints()}
    {tab==='pool' && renderPool()}
    {tab==='review' && renderReviewTab()}
    {tab==='records' && renderRecords()}
  </>);
}
