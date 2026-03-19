import { useState, useEffect } from 'react'
import { api } from '../api'

const STATUS_LABELS = { planning: '規劃中', in_progress: '執行中', completed: '已結案', cancelled: '已取消' };
const STATUS_COLORS = { planning: '#0891b2', in_progress: '#4f46e5', completed: '#16a34a', cancelled: '#dc2626' };

export default function BIDashboard() {
  const [overview, setOverview] = useState(null);
  const [projectData, setProjectData] = useState(null);
  const [customerData, setCustomerData] = useState([]);
  const [deptData, setDeptData] = useState([]);
  const [revenueData, setRevenueData] = useState([]);

  useEffect(() => {
    api.getBIOverview().then(setOverview);
    api.getBIProjects().then(setProjectData);
    api.getBICustomers().then(setCustomerData);
    api.getBIDepartments().then(setDeptData);
    api.getBIRevenue().then(setRevenueData);
  }, []);

  if (!overview) return <div className="loader-wrap"><div className="loader" /></div>;

  const maxCustRev = Math.max(...customerData.map(c => c.total_revenue), 1);

  return (
    <>
      <div className="page-header"><div><h1 className="page-title">📊 營運分析 BI</h1><p className="page-subtitle">數據驅動的營運決策分析</p></div></div>

      {/* KPI 概覽 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 14, marginBottom: 28 }}>
        {[
          { icon: '📁', bg: 'var(--c-primary-light)', label: '總專案', value: overview.projects.total, sub: `${overview.projects.active} 進行中` },
          { icon: '🤝', bg: 'var(--c-success-light)', label: '總客戶', value: overview.customers.total },
          { icon: '💵', bg: 'var(--c-success-light)', label: '總收入', value: `$${(overview.finance.totalRevenue).toLocaleString()}`, color: 'var(--c-success)' },
          { icon: '📈', bg: 'var(--c-primary-light)', label: '毛利率', value: `${overview.finance.profitMargin}%`, color: overview.finance.profitMargin >= 0 ? 'var(--c-success)' : 'var(--c-danger)' },
          { icon: '🔄', bg: 'var(--c-info-light)', label: '提案成功率', value: `${overview.proposals.conversionRate}%`, sub: `${overview.proposals.converted}/${overview.proposals.total}` },
        ].map((s, i) => (
          <div key={i} className="stat-card">
            <div className="stat-icon" style={{ background: s.bg }}>{s.icon}</div>
            <div>
              <div className="stat-value" style={{ color: s.color || 'inherit' }}>{s.value}</div>
              <div className="stat-label">{s.label}</div>
              {s.sub && <div style={{ fontSize: 10, color: 'var(--c-text-muted)' }}>{s.sub}</div>}
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 24 }}>
        {/* 專案狀態分布 */}
        <div className="card">
          <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>📁 專案狀態分布</h3>
          {projectData && Object.entries(projectData.byStatus).map(([status, count]) => (
            <div key={status} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
              <span style={{ fontSize: 12, width: 60 }}>{STATUS_LABELS[status] || status}</span>
              <div style={{ flex: 1, height: 24, background: 'var(--c-bg)', borderRadius: 6, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${(count / (overview.projects.total || 1)) * 100}%`, background: STATUS_COLORS[status] || '#6366f1', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', paddingRight: 8, color: 'white', fontSize: 11, fontWeight: 700, minWidth: 30 }}>{count}</div>
              </div>
            </div>
          ))}
        </div>

        {/* 部門績效 */}
        <div className="card">
          <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>🏢 部門任務完成率</h3>
          {deptData.length === 0 ? <p style={{ color: 'var(--c-text-muted)', fontSize: 13 }}>尚無任務資料</p> : deptData.map(d => (
            <div key={d.id} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
              <span style={{ fontSize: 12, width: 90 }}>{d.icon} {d.name}</span>
              <div style={{ flex: 1, height: 24, background: 'var(--c-bg)', borderRadius: 6, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${d.completion_rate}%`, background: d.completion_rate >= 80 ? 'var(--c-success)' : d.completion_rate >= 50 ? 'var(--c-warning)' : 'var(--c-danger)', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', paddingRight: 8, color: 'white', fontSize: 11, fontWeight: 700, minWidth: 30 }}>{d.completion_rate}%</div>
              </div>
              <span style={{ fontSize: 11, color: 'var(--c-text-muted)', width: 50 }}>{d.done_tasks}/{d.total_tasks}</span>
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        {/* 客戶營收排名 */}
        <div className="card">
          <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>🤝 客戶營收排名</h3>
          {customerData.length === 0 ? <p style={{ color: 'var(--c-text-muted)', fontSize: 13 }}>尚無客戶資料</p> : customerData.slice(0, 10).map((c, i) => (
            <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: i < 3 ? 'var(--c-primary)' : 'var(--c-text-muted)', width: 22 }}>#{i + 1}</span>
              <span style={{ fontSize: 13, fontWeight: 500, width: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</span>
              <div style={{ flex: 1, height: 20, background: 'var(--c-bg)', borderRadius: 4 }}>
                <div style={{ height: '100%', width: `${(c.total_revenue / maxCustRev) * 100}%`, background: 'var(--c-primary)', borderRadius: 4, minWidth: 2 }} />
              </div>
              <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--c-success)' }}>${c.total_revenue.toLocaleString()}</span>
            </div>
          ))}
        </div>

        {/* 專案毛利排名 */}
        <div className="card">
          <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>💰 專案毛利排名</h3>
          {projectData?.projects?.length === 0 ? <p style={{ color: 'var(--c-text-muted)', fontSize: 13 }}>尚無專案資料</p> :
            projectData?.projects?.sort((a, b) => b.profit - a.profit).slice(0, 10).map((p, i) => (
              <div key={p.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--c-border)' }}>
                <div>
                  <span style={{ fontSize: 13, fontWeight: 600 }}>{p.name}</span>
                  <span style={{ fontSize: 11, color: 'var(--c-text-muted)', marginLeft: 8 }}>{p.event_type || ''}</span>
                </div>
                <div style={{ display: 'flex', gap: 16, fontSize: 12 }}>
                  <span style={{ color: 'var(--c-success)' }}>收 ${p.revenue.toLocaleString()}</span>
                  <span style={{ color: 'var(--c-danger)' }}>支 ${p.expense.toLocaleString()}</span>
                  <span style={{ fontWeight: 700, color: p.profit >= 0 ? 'var(--c-success)' : 'var(--c-danger)' }}>{p.profit >= 0 ? '+' : ''}${p.profit.toLocaleString()}</span>
                </div>
              </div>
            ))
          }
        </div>
      </div>
    </>
  );
}
