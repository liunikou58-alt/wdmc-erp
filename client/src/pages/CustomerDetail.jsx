import { useState, useEffect } from 'react'
import { useLang } from '../LangContext'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { api } from '../api'

const FMT = n => `$${Number(n || 0).toLocaleString()}`;
const LEVEL_COLORS = {
  VVIP: { bg: 'linear-gradient(135deg, #f59e0b, #ef4444)', color: '#fff' },
  VIP: { bg: 'linear-gradient(135deg, #8b5cf6, #6366f1)', color: '#fff' },
  '一般': { bg: 'var(--c-bg-elevated)', color: 'var(--c-text-muted)' },
};

export default function CustomerDetail() {
  const { t } = useLang();
  const { id } = useParams();
  const navigate = useNavigate();
  const [customer, setCustomer] = useState(null);
  const [loadError, setLoadError] = useState(null);
  const [tab, setTab] = useState('overview');
  const [cases, setCases] = useState([]);
  const [showAddCase, setShowAddCase] = useState(false);
  const [caseForm, setCaseForm] = useState({ title: '', description: '', event_date: '', budget: 0 });
  // ═══ 年度統計 ═══
  const [yearlyStats, setYearlyStats] = useState(null);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [yearlyLoading, setYearlyLoading] = useState(false);

  useEffect(() => {
    setLoadError(null);
    setCustomer(null);
    api.getCustomer(id).then(c => {
      if (!c || !c.id) {
        setLoadError('客戶資料格式錯誤');
        return;
      }
      setCustomer(c);
      setCases(c.cases || []);
    }).catch(err => {
      console.error('[CustomerDetail] Load failed:', err);
      setLoadError(err?.message || '無法載入客戶資料');
    });
  }, [id]);

  // 年度統計載入（必須在所有 early return 之前，遵守 React Hooks 規則）
  const loadYearlyStats = async (yr) => {
    setYearlyLoading(true);
    try {
      const data = await api.getCustomerYearlyStats(id, yr);
      setYearlyStats(data);
    } catch { setYearlyStats(null); }
    setYearlyLoading(false);
  };
  useEffect(() => { if (tab === 'yearly') loadYearlyStats(selectedYear); }, [tab, selectedYear]);

  const addCase = async () => {
    if (!caseForm.title) return;
    await api.createCase(id, caseForm);
    const c = await api.getCustomer(id);
    setCustomer(c); setCases(c.cases || []);
    setShowAddCase(false); setCaseForm({ title: '', description: '', event_date: '', budget: 0 });
  };

  // ═══ Early returns（所有 hooks 已在上面呼叫完畢）═══
  if (loadError) return (
    <div style={{ padding: 60, textAlign: 'center' }}>
      <div style={{ fontSize: 48, marginBottom: 16 }}>⚠️</div>
      <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>無法載入客戶資料</h2>
      <p style={{ fontSize: 13, color: 'var(--c-text-muted)', marginBottom: 20 }}>{loadError}</p>
      <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
        <button className="btn btn-primary" onClick={() => navigate('/customers')}>← 返回客戶列表</button>
        <button className="btn" onClick={() => window.location.reload()}>🔄 重試</button>
      </div>
    </div>
  );

  if (!customer) return <div style={{ padding: 40, textAlign: 'center', color: 'var(--c-text-muted)' }}>載入中...</div>;

  const proposals = customer.proposals || [];
  const contracts = customer.contracts || [];
  const projects = customer.projects || [];
  const events = customer.events || [];
  const lvl = LEVEL_COLORS[customer.customer_level] || LEVEL_COLORS['一般'];
  const typeIcon = customer.company_type === 'government' ? '🏛️' : customer.company_type === 'peer' ? '🤝' : '💼';
  const typeLabel = customer.company_type === 'government' ? '政府客戶' : customer.company_type === 'peer' ? '同業客戶' : '商業客戶';

  // 統計計算
  const totalQuoteAmt = proposals.reduce((s, p) => s + (p.total_with_tax || p.total_amount || 0), 0);
  const totalContractAmt = contracts.reduce((s, c) => s + (Number(c.amount) || Number(c.total_amount) || 0), 0);
  const wonCount = proposals.filter(p => p.status === 'won' || p.status === 'converted').length;
  const lostCount = proposals.filter(p => p.status === 'lost' || p.status === 'rejected').length;
  const winRate = (wonCount + lostCount) > 0 ? Math.round(wonCount / (wonCount + lostCount) * 100) : 0;

  const TABS = [
    ['overview', `📊 總覽`],
    ['yearly', '📆 年度統計'],
    ['cases', `📋 案件 (${cases.length})`],
    ['proposals', `📝 報價單 (${proposals.length})`],
    ['contracts', `📃 合約 (${contracts.length})`],
    ['projects', `📁 專案 (${projects.length})`],
    ['events', `🎪 活動 (${events.length})`],
    ['notes', '📌 備忘錄'],
  ];

  return (<>
    {/* Header */}
    <div className="page-header">
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <button className="btn btn-sm" onClick={() => navigate('/customers')} style={{ fontSize: 14 }}>← 返回</button>
        <div className="avatar" style={{ background: 'var(--c-primary)', width: 52, height: 52, fontSize: 24 }}>{(customer.name || '?')[0]}</div>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <h1 className="page-title" style={{ margin: 0 }}>{customer.name}</h1>
            <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: lvl.bg, color: lvl.color }}>{customer.customer_level || '一般'}</span>
            <span className="badge">{typeIcon} {typeLabel}</span>
          </div>
          <p className="page-subtitle" style={{ margin: 0 }}>
            {customer.contact_person && <span>👤 {customer.contact_person}</span>}
            {customer.phone && <span style={{ marginLeft: 12 }}>📞 {customer.phone}</span>}
            {customer.email && <span style={{ marginLeft: 12 }}>✉️ {customer.email}</span>}
            {customer.tax_id && <span style={{ marginLeft: 12 }}>🏢 {customer.tax_id}</span>}
          </p>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <Link to="/proposals" className="btn btn-primary" style={{ textDecoration: 'none' }}>📝 新增報價單</Link>
        <button className="btn btn-sm" onClick={() => setShowAddCase(true)}>+ 新增案件</button>
      </div>
    </div>

    {/* KPI Cards */}
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12, marginBottom: 20 }}>
      <div className="stat-card"><div className="stat-icon">📋</div><div><div className="stat-value">{cases.length}</div><div className="stat-label">案件數</div></div></div>
      <div className="stat-card"><div className="stat-icon" style={{ background: 'var(--c-info-light)' }}>📝</div><div><div className="stat-value" style={{ color: 'var(--c-info)' }}>{proposals.length}</div><div className="stat-label">報價單</div></div></div>
      <div className="stat-card"><div className="stat-icon" style={{ background: 'var(--c-success-light)' }}>📃</div><div><div className="stat-value" style={{ color: 'var(--c-success)' }}>{contracts.length}</div><div className="stat-label">合約</div></div></div>
      <div className="stat-card"><div className="stat-icon" style={{ background: 'var(--c-warning-light)' }}>💰</div><div><div className="stat-value" style={{ color: 'var(--c-warning)' }}>{FMT(totalContractAmt)}</div><div className="stat-label">合約總額</div></div></div>
      <div className="stat-card"><div className="stat-icon" style={{ background: winRate >= 50 ? 'var(--c-success-light)' : 'var(--c-danger-light)' }}>🎯</div><div><div className="stat-value" style={{ color: winRate >= 50 ? 'var(--c-success)' : 'var(--c-danger)' }}>{winRate}%</div><div className="stat-label">得標率 ({wonCount}贏/{lostCount}失)</div></div></div>
    </div>

    {/* Tabs */}
    <div className="sub-tabs" style={{ marginBottom: 16 }}>
      {TABS.map(([k, l]) => <button key={k} className={`sub-tab ${tab === k ? 'active' : ''}`} onClick={() => setTab(k)}>{l}</button>)}
    </div>

    {/* Tab: Overview */}
    {tab === 'overview' && (
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {/* 基本資訊 */}
        <div className="card" style={{ padding: 18 }}>
          <h4 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>🏢 基本資訊</h4>
          <div style={{ display: 'grid', gap: 8, fontSize: 13 }}>
            {[
              ['公司名稱', customer.name], ['統一編號', customer.tax_id || '—'],
              ['公司類型', `${typeIcon} ${typeLabel}`], ['客戶等級', customer.customer_level || '一般'],
              ['聯絡人', customer.contact_person || '—'], ['電話', customer.phone || '—'],
              ['Email', customer.email || '—'], ['傳真', customer.fax || '—'],
              ['地址', customer.address || '—'], ['網站', customer.website || '—'],
            ].map(([l, v], i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px solid var(--c-border)' }}>
                <span style={{ color: 'var(--c-text-muted)' }}>{l}</span>
                <span style={{ fontWeight: 600 }}>{v}</span>
              </div>
            ))}
          </div>
        </div>

        {/* 合作統計 */}
        <div className="card" style={{ padding: 18 }}>
          <h4 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>📊 合作統計</h4>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
            <div className="card" style={{ padding: 12, textAlign: 'center', background: 'var(--c-bg)' }}>
              <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--c-success)' }}>{wonCount}</div>
              <div style={{ fontSize: 10, color: 'var(--c-text-muted)' }}>得標案件</div>
            </div>
            <div className="card" style={{ padding: 12, textAlign: 'center', background: 'var(--c-bg)' }}>
              <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--c-danger)' }}>{lostCount}</div>
              <div style={{ fontSize: 10, color: 'var(--c-text-muted)' }}>失標案件</div>
            </div>
            <div className="card" style={{ padding: 12, textAlign: 'center', background: 'var(--c-bg)' }}>
              <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--c-primary)' }}>{FMT(totalQuoteAmt)}</div>
              <div style={{ fontSize: 10, color: 'var(--c-text-muted)' }}>報價總額</div>
            </div>
            <div className="card" style={{ padding: 12, textAlign: 'center', background: 'var(--c-bg)' }}>
              <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--c-warning)' }}>{FMT(totalContractAmt)}</div>
              <div style={{ fontSize: 10, color: 'var(--c-text-muted)' }}>合約總額</div>
            </div>
          </div>
          {/* Win Rate Bar */}
          <div style={{ marginTop: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 4 }}>
              <span>得標率</span><span style={{ fontWeight: 700, color: winRate >= 50 ? 'var(--c-success)' : 'var(--c-danger)' }}>{winRate}%</span>
            </div>
            <div style={{ background: 'var(--c-bg)', borderRadius: 10, height: 12, overflow: 'hidden' }}>
              <div style={{ width: `${winRate}%`, height: '100%', background: winRate >= 50 ? 'var(--c-success)' : 'var(--c-danger)', borderRadius: 10, transition: 'width .5s ease' }} />
            </div>
          </div>
        </div>

        {/* 最近文件 */}
        <div className="card" style={{ padding: 18, gridColumn: '1/-1' }}>
          <h4 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>📂 最近文件</h4>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
            {proposals.slice(0, 4).map(p => (
              <div key={p.id} className="card" style={{ padding: 10, fontSize: 12, background: 'var(--c-bg)' }}>
                <div style={{ fontWeight: 700, fontSize: 11 }}>📝 {p.title}</div>
                <div style={{ color: 'var(--c-text-muted)', fontSize: 10 }}>{FMT(p.total_with_tax || p.total_amount)}</div>
              </div>
            ))}
            {contracts.slice(0, 4).map(c => (
              <div key={c.id} className="card" style={{ padding: 10, fontSize: 12, background: 'var(--c-bg)' }}>
                <div style={{ fontWeight: 700, fontSize: 11 }}>📃 {c.title || c.name}</div>
                <div style={{ color: 'var(--c-text-muted)', fontSize: 10 }}>{FMT(c.amount || c.total_amount)}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )}

    {/* Tab: Cases */}
    {tab === 'cases' && (
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
          <h4 style={{ fontSize: 14, fontWeight: 700 }}>📋 案件歷史</h4>
          <button className="btn btn-sm btn-primary" onClick={() => setShowAddCase(true)}>+ 新增案件</button>
        </div>
        {cases.length === 0 ? (
          <div className="empty-state" style={{ padding: 30 }}><div className="empty-state-icon">📋</div><div className="empty-state-title">尚無案件</div></div>
        ) : (
          <div className="table-wrap"><table>
            <thead><tr><th>案件名稱</th><th>活動日期</th><th>預算</th><th>狀態</th><th>建立時間</th></tr></thead>
            <tbody>{cases.map(c => (
              <tr key={c.id}>
                <td style={{ fontWeight: 600 }}>{c.title}</td>
                <td style={{ fontSize: 12 }}>{c.event_date || '—'}</td>
                <td style={{ fontWeight: 600, color: 'var(--c-primary)' }}>{FMT(c.budget)}</td>
                <td><span className="badge">{c.status || 'inquiry'}</span></td>
                <td style={{ fontSize: 11, color: 'var(--c-text-muted)' }}>{(c.created_at || '').slice(0, 10)}</td>
              </tr>
            ))}</tbody>
          </table></div>
        )}
      </div>
    )}

    {/* Tab: Proposals */}
    {tab === 'proposals' && (
      <div>
        <h4 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>📝 報價單歷史</h4>
        {proposals.length === 0 ? (
          <div className="empty-state" style={{ padding: 30 }}><div className="empty-state-icon">📝</div><div className="empty-state-title">尚無報價單</div></div>
        ) : (
          <div className="table-wrap"><table>
            <thead><tr><th>報價單</th><th>活動類型</th><th>報價金額</th><th>狀態</th><th>日期</th></tr></thead>
            <tbody>{proposals.map(p => (
              <tr key={p.id}>
                <td style={{ fontWeight: 600 }}>{p.title}</td>
                <td style={{ fontSize: 12 }}>{p.event_type || '—'}</td>
                <td style={{ fontWeight: 700, color: 'var(--c-primary)' }}>{FMT(p.total_with_tax || p.total_amount)}</td>
                <td><span className={`badge ${p.status === 'won' ? 'badge-success' : p.status === 'lost' ? 'badge-danger' : 'badge-info'}`}>{p.status || 'draft'}</span></td>
                <td style={{ fontSize: 11, color: 'var(--c-text-muted)' }}>{(p.created_at || '').slice(0, 10)}</td>
              </tr>
            ))}</tbody>
          </table></div>
        )}
      </div>
    )}

    {/* Tab: Contracts */}
    {tab === 'contracts' && (
      <div>
        <h4 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>📃 合約歷史</h4>
        {contracts.length === 0 ? (
          <div className="empty-state" style={{ padding: 30 }}><div className="empty-state-icon">📃</div><div className="empty-state-title">尚無合約</div></div>
        ) : (
          <div className="table-wrap"><table>
            <thead><tr><th>合約編號</th><th>合約名稱</th><th>金額</th><th>期間</th><th>狀態</th></tr></thead>
            <tbody>{contracts.map(c => (
              <tr key={c.id}>
                <td style={{ fontFamily: 'monospace', fontSize: 11 }}>{c.contract_number || c.contract_no}</td>
                <td style={{ fontWeight: 600 }}>{c.title || c.name}</td>
                <td style={{ fontWeight: 700, color: 'var(--c-primary)' }}>{FMT(c.amount || c.total_amount)}</td>
                <td style={{ fontSize: 11 }}>{c.start_date || '?'} ~ {c.end_date || '?'}</td>
                <td><span className="badge">{c.status || 'draft'}</span></td>
              </tr>
            ))}</tbody>
          </table></div>
        )}
      </div>
    )}

    {/* Tab: Projects */}
    {tab === 'projects' && (
      <div>
        <h4 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>📁 專案歷史</h4>
        {projects.length === 0 ? (
          <div className="empty-state" style={{ padding: 30 }}><div className="empty-state-icon">📁</div><div className="empty-state-title">尚無專案</div></div>
        ) : (
          <div style={{ display: 'grid', gap: 10 }}>
            {projects.map(p => (
              <Link key={p.id} to={`/projects/${p.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                <div className="card" style={{ padding: 14, display: 'flex', justifyContent: 'space-between' }}>
                  <div><div style={{ fontWeight: 700 }}>{p.name}</div><div style={{ fontSize: 11, color: 'var(--c-text-muted)' }}>{p.event_type || '—'} · {p.deadline || '—'}</div></div>
                  <span className={`badge ${p.status === 'completed' ? 'badge-success' : 'badge-primary'}`}>{p.status}</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    )}

    {/* Tab: Events */}
    {tab === 'events' && (
      <div>
        <h4 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>🎪 活動歷史</h4>
        {events.length === 0 ? (
          <div className="empty-state" style={{ padding: 30 }}><div className="empty-state-icon">🎪</div><div className="empty-state-title">尚無活動</div></div>
        ) : (
          <div className="table-wrap"><table>
            <thead><tr><th>活動編號</th><th>活動名稱</th><th>日期</th><th>報價金額</th><th>毛利率</th><th>狀態</th></tr></thead>
            <tbody>{events.map(e => {
              const margin = e.quote_amount > 0 ? Math.round((e.quote_amount - (e.cost_amount || 0)) / e.quote_amount * 100) : 0;
              return (
                <tr key={e.id}>
                  <td style={{ fontFamily: 'monospace', fontSize: 11 }}>{e.event_no || '—'}</td>
                  <td style={{ fontWeight: 600 }}>{e.name}</td>
                  <td style={{ fontSize: 12 }}>{(e.event_date || '—').slice(0, 10)}</td>
                  <td style={{ fontWeight: 700, color: 'var(--c-primary)' }}>{FMT(e.quote_amount)}</td>
                  <td style={{ fontWeight: 700, color: margin >= 20 ? 'var(--c-success)' : 'var(--c-danger)' }}>{margin}%</td>
                  <td><span className={`badge ${e.status === 'closed' ? 'badge-success' : 'badge-primary'}`}>{e.status === 'closed' ? '已結案' : '進行中'}</span></td>
                </tr>
              );
            })}</tbody>
          </table></div>
        )}
      </div>
    )}

    {/* Tab: Yearly Stats */}
    {tab === 'yearly' && (
      <div>
        {/* 年度選擇器 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
          <h4 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>📆 年度服務歷程</h4>
          <div style={{ display: 'flex', gap: 6, marginLeft: 'auto', flexWrap: 'wrap' }}>
            {(yearlyStats?.available_years || [new Date().getFullYear()]).map(yr => (
              <button key={yr} className={`btn btn-sm ${selectedYear === yr ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setSelectedYear(yr)} style={{ minWidth: 70 }}>
                {yr}年
              </button>
            ))}
          </div>
        </div>

        {yearlyLoading ? (
          <div style={{ textAlign: 'center', padding: 40, color: 'var(--c-text-muted)' }}>載入中...</div>
        ) : yearlyStats ? (
          <>
            {/* 年度 KPI */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12, marginBottom: 20 }}>
              <div className="stat-card">
                <div className="stat-icon">📋</div>
                <div><div className="stat-value">{yearlyStats.summary.total_cases}</div><div className="stat-label">{selectedYear}年 案件</div></div>
              </div>
              <div className="stat-card">
                <div className="stat-icon" style={{ background: 'var(--c-info-light)' }}>📝</div>
                <div><div className="stat-value" style={{ color: 'var(--c-info)' }}>{yearlyStats.summary.total_proposals}</div><div className="stat-label">報價單</div></div>
              </div>
              <div className="stat-card">
                <div className="stat-icon" style={{ background: 'var(--c-success-light)' }}>📃</div>
                <div><div className="stat-value" style={{ color: 'var(--c-success)' }}>{yearlyStats.summary.total_contracts}</div><div className="stat-label">合約</div></div>
              </div>
              <div className="stat-card">
                <div className="stat-icon" style={{ background: 'var(--c-warning-light)' }}>💰</div>
                <div><div className="stat-value" style={{ color: 'var(--c-warning)' }}>{FMT(yearlyStats.summary.total_revenue)}</div><div className="stat-label">年度營收</div></div>
              </div>
              <div className="stat-card">
                <div className="stat-icon" style={{ background: yearlyStats.summary.win_rate >= 50 ? 'var(--c-success-light)' : 'var(--c-danger-light)' }}>🎯</div>
                <div><div className="stat-value" style={{ color: yearlyStats.summary.win_rate >= 50 ? 'var(--c-success)' : 'var(--c-danger)' }}>{yearlyStats.summary.win_rate}%</div>
                <div className="stat-label">得標率 ({yearlyStats.summary.won_count}贏/{yearlyStats.summary.lost_count}失)</div></div>
              </div>
            </div>

            {/* 月度時間線 */}
            <div className="card" style={{ padding: 20 }}>
              <h4 style={{ fontSize: 14, fontWeight: 700, marginBottom: 16 }}>📅 {selectedYear}年 月度服務歷程</h4>
              {yearlyStats.monthly_breakdown.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 30, color: 'var(--c-text-muted)', fontSize: 13 }}>
                  {selectedYear}年 尚無服務紀錄
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {yearlyStats.monthly_breakdown.map(mb => (
                    <div key={mb.month} style={{ borderLeft: '4px solid var(--c-primary)', paddingLeft: 16, paddingBottom: 8 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                        <span style={{ fontWeight: 800, fontSize: 15, color: 'var(--c-primary)', minWidth: 50 }}>{mb.month}月</span>
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                          {mb.cases.length > 0 && <span className="badge badge-info">📋 {mb.cases.length} 案件</span>}
                          {mb.proposals.length > 0 && <span className="badge badge-primary">📝 {mb.proposals.length} 報價</span>}
                          {mb.contracts.length > 0 && <span className="badge badge-success">📃 {mb.contracts.length} 合約</span>}
                          {mb.events.length > 0 && <span className="badge badge-warning">🎪 {mb.events.length} 活動</span>}
                          {mb.revenue > 0 && <span className="badge" style={{ background: 'var(--c-success-light)', color: 'var(--c-success)' }}>💰 {FMT(mb.revenue)}</span>}
                        </div>
                      </div>
                      {/* 展開每月的詳細事件 */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        {mb.cases.map(cs => (
                          <div key={cs.id} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, padding: '4px 8px', background: 'var(--c-bg)', borderRadius: 6 }}>
                            <span style={{ color: 'var(--c-info)' }}>📋</span>
                            <span style={{ fontWeight: 600 }}>{cs.title}</span>
                            <span style={{ color: 'var(--c-text-muted)', marginLeft: 'auto' }}>{(cs.event_date || cs.created_at || '').slice(0,10)}</span>
                          </div>
                        ))}
                        {mb.proposals.map(p => (
                          <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, padding: '4px 8px', background: 'var(--c-bg)', borderRadius: 6 }}>
                            <span>📝</span>
                            <span style={{ fontWeight: 600 }}>{p.title}</span>
                            <span className={`badge ${p.status === 'won' ? 'badge-success' : p.status === 'lost' ? 'badge-danger' : 'badge-info'}`} style={{ fontSize: 10 }}>{p.status || 'draft'}</span>
                            <span style={{ color: 'var(--c-primary)', fontWeight: 700, marginLeft: 'auto' }}>{FMT(p.total_with_tax || p.total_amount)}</span>
                          </div>
                        ))}
                        {mb.contracts.map(ct => (
                          <div key={ct.id} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, padding: '4px 8px', background: 'var(--c-bg)', borderRadius: 6 }}>
                            <span>📃</span>
                            <span style={{ fontWeight: 600 }}>{ct.title || ct.name}</span>
                            <span style={{ color: 'var(--c-success)', fontWeight: 700, marginLeft: 'auto' }}>{FMT(ct.amount || ct.total_amount)}</span>
                          </div>
                        ))}
                        {mb.events.map(ev => (
                          <div key={ev.id} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, padding: '4px 8px', background: 'var(--c-bg)', borderRadius: 6 }}>
                            <span>🎪</span>
                            <span style={{ fontWeight: 600 }}>{ev.name}</span>
                            <span style={{ color: 'var(--c-text-muted)', marginLeft: 'auto' }}>{(ev.event_date || '').slice(0,10)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 年度摘要 bar */}
            <div className="card" style={{ padding: 18, marginTop: 16 }}>
              <h4 style={{ fontSize: 14, fontWeight: 700, marginBottom: 14 }}>📊 {selectedYear}年 年度報價總額 vs 合約總額</h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                    <span>報價總額</span><span style={{ fontWeight: 700, color: 'var(--c-primary)' }}>{FMT(yearlyStats.summary.total_quote_amount)}</span>
                  </div>
                  <div style={{ background: 'var(--c-bg)', borderRadius: 10, height: 14, overflow: 'hidden' }}>
                    <div style={{ width: '100%', height: '100%', background: 'var(--c-primary)', borderRadius: 10 }} />
                  </div>
                </div>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                    <span>合約總額</span><span style={{ fontWeight: 700, color: 'var(--c-success)' }}>{FMT(yearlyStats.summary.total_revenue)}</span>
                  </div>
                  <div style={{ background: 'var(--c-bg)', borderRadius: 10, height: 14, overflow: 'hidden' }}>
                    <div style={{ width: yearlyStats.summary.total_quote_amount > 0 ? `${Math.min(100, Math.round(yearlyStats.summary.total_revenue / yearlyStats.summary.total_quote_amount * 100))}%` : '0%', height: '100%', background: 'var(--c-success)', borderRadius: 10, transition: 'width .5s ease' }} />
                  </div>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div style={{ textAlign: 'center', padding: 30, color: 'var(--c-text-muted)' }}>無法載入年度統計</div>
        )}
      </div>
    )}

    {/* Tab: Notes */}
    {tab === 'notes' && (
      <div className="card" style={{ padding: 18 }}>
        <h4 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>📌 備忘錄</h4>
        <div style={{ padding: 20, textAlign: 'center', color: 'var(--c-text-muted)', fontSize: 13 }}>
          {customer.notes ? <div style={{ whiteSpace: 'pre-wrap', textAlign: 'left' }}>{customer.notes}</div> : '尚無備忘錄'}
        </div>
      </div>
    )}

    {/* Add Case Modal */}
    {showAddCase && (
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.4)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="card" style={{ width: 480, padding: 24, animation: 'fadeUp 0.3s ease' }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 14 }}>+ 新增案件</h3>
          <div className="form-group"><label className="form-label">案件名稱 *</label><input className="form-input" value={caseForm.title} onChange={e => setCaseForm({ ...caseForm, title: e.target.value })} /></div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div className="form-group"><label className="form-label">活動日期</label><input type="date" className="form-input" value={caseForm.event_date} onChange={e => setCaseForm({ ...caseForm, event_date: e.target.value })} /></div>
            <div className="form-group"><label className="form-label">預算</label><input type="number" className="form-input" value={caseForm.budget} onChange={e => setCaseForm({ ...caseForm, budget: Number(e.target.value) })} /></div>
          </div>
          <div className="form-group"><label className="form-label">說明</label><textarea className="form-input" value={caseForm.description} onChange={e => setCaseForm({ ...caseForm, description: e.target.value })} rows={2} /></div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 10 }}>
            <button className="btn btn-secondary" onClick={() => setShowAddCase(false)}>取消</button>
            <button className="btn btn-primary" onClick={addCase}>建立</button>
          </div>
        </div>
      </div>
    )}
  </>);
}
