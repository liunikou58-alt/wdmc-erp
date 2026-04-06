import { useState, useEffect } from 'react'
import { useLang } from '../LangContext'
import { api } from '../api'

const FMT = n => `$${Number(n || 0).toLocaleString()}`;

export default function WinLossReport() {
  const { t } = useLang();
  const [proposals, setProposals] = useState([]);
  const [year, setYear] = useState(new Date().getFullYear());
  const [typeFilter, setTypeFilter] = useState('all');

  useEffect(() => { api.getProposals().then(setProposals).catch(() => {}); }, []);

  const yearProposals = proposals.filter(p => (p.created_at || '').startsWith(String(year)));
  const filtered = typeFilter === 'all' ? yearProposals : yearProposals.filter(p => p.case_type === typeFilter);

  const won = filtered.filter(p => p.status === 'won' || p.status === 'converted');
  const lost = filtered.filter(p => p.status === 'lost' || p.status === 'rejected');
  const pending = filtered.filter(p => !['won', 'converted', 'lost', 'rejected'].includes(p.status));
  const total = won.length + lost.length;
  const winRate = total > 0 ? Math.round(won.length / total * 100) : 0;
  const lossRate = total > 0 ? Math.round(lost.length / total * 100) : 0;
  const wonAmt = won.reduce((s, p) => s + (p.total_with_tax || p.total_amount || p.budget || 0), 0);
  const lostAmt = lost.reduce((s, p) => s + (p.total_with_tax || p.total_amount || p.budget || 0), 0);

  // 月度分析
  const months = Array.from({ length: 12 }, (_, i) => {
    const m = String(i + 1).padStart(2, '0');
    const mp = filtered.filter(p => (p.created_at || '').slice(5, 7) === m);
    const mWon = mp.filter(p => p.status === 'won' || p.status === 'converted').length;
    const mLost = mp.filter(p => p.status === 'lost' || p.status === 'rejected').length;
    const mTotal = mWon + mLost;
    return { month: `${i + 1}月`, total: mp.length, won: mWon, lost: mLost, rate: mTotal > 0 ? Math.round(mWon / mTotal * 100) : 0 };
  });

  // 客戶排行
  const customerMap = {};
  filtered.forEach(p => {
    const name = p.customer_name || '未知';
    if (!customerMap[name]) customerMap[name] = { name, won: 0, lost: 0, totalAmt: 0 };
    if (p.status === 'won' || p.status === 'converted') { customerMap[name].won++; customerMap[name].totalAmt += (p.total_with_tax || p.total_amount || 0); }
    else if (p.status === 'lost' || p.status === 'rejected') customerMap[name].lost++;
  });
  const topCustomers = Object.values(customerMap).sort((a, b) => (b.won + b.lost) - (a.won + a.lost)).slice(0, 10);

  return (<>
    <div className="page-header">
      <div><h1 className="page-title">{t('page.winLoss')}</h1><p className="page-subtitle">年度提案勝率與金額統計報表</p></div>
      <div style={{ display: 'flex', gap: 8 }}>
        <select className="form-input" value={year} onChange={e => setYear(Number(e.target.value))} style={{ width: 100 }}>
          {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}年</option>)}
        </select>
        <select className="form-input" value={typeFilter} onChange={e => setTypeFilter(e.target.value)} style={{ width: 100 }}>
          <option value="all">全部類型</option><option value="commercial">商案</option><option value="government">標案</option><option value="peer">同業</option>
        </select>
      </div>
    </div>

    {/* KPI */}
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 12, marginBottom: 24 }}>
      <div className="stat-card"><div className="stat-icon">📋</div><div><div className="stat-value">{filtered.length}</div><div className="stat-label">總提案</div></div></div>
      <div className="stat-card"><div className="stat-icon" style={{ background: 'var(--c-success-light)' }}>✅</div><div><div className="stat-value" style={{ color: 'var(--c-success)' }}>{won.length}</div><div className="stat-label">得標</div></div></div>
      <div className="stat-card"><div className="stat-icon" style={{ background: 'var(--c-danger-light)' }}>❌</div><div><div className="stat-value" style={{ color: 'var(--c-danger)' }}>{lost.length}</div><div className="stat-label">流標</div></div></div>
      <div className="stat-card"><div className="stat-icon" style={{ background: 'var(--c-warning-light)' }}>⏳</div><div><div className="stat-value" style={{ color: 'var(--c-warning)' }}>{pending.length}</div><div className="stat-label">進行中</div></div></div>
      <div className="stat-card"><div className="stat-icon" style={{ background: winRate >= 50 ? 'var(--c-success-light)' : 'var(--c-danger-light)' }}>🎯</div><div><div className="stat-value" style={{ color: winRate >= 50 ? 'var(--c-success)' : 'var(--c-danger)' }}>{winRate}%</div><div className="stat-label">得標率</div></div></div>
      <div className="stat-card"><div className="stat-icon" style={{ background: 'var(--c-danger-light)' }}>📉</div><div><div className="stat-value" style={{ color: 'var(--c-danger)' }}>{lossRate}%</div><div className="stat-label">流標率</div></div></div>
    </div>

    {/* Visual Bars */}
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
      {/* Win vs Loss Bar */}
      <div className="card" style={{ padding: 18 }}>
        <h4 style={{ fontSize: 14, fontWeight: 700, marginBottom: 14 }}>🎯 得標 vs 流標 金額</h4>
        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', height: 120 }}>
          <div style={{ flex: 1, textAlign: 'center' }}>
            <div style={{ background: 'var(--c-success)', borderRadius: '8px 8px 0 0', height: Math.max(20, wonAmt > 0 ? 100 : 0), transition: 'height .5s' }} />
            <div style={{ fontSize: 11, marginTop: 6, fontWeight: 700, color: 'var(--c-success)' }}>{FMT(wonAmt)}</div>
            <div style={{ fontSize: 10, color: 'var(--c-text-muted)' }}>得標金額</div>
          </div>
          <div style={{ flex: 1, textAlign: 'center' }}>
            <div style={{ background: 'var(--c-danger)', borderRadius: '8px 8px 0 0', height: Math.max(20, lostAmt > 0 ? (wonAmt > 0 ? Math.round(lostAmt / wonAmt * 100) : 100) : 0), transition: 'height .5s' }} />
            <div style={{ fontSize: 11, marginTop: 6, fontWeight: 700, color: 'var(--c-danger)' }}>{FMT(lostAmt)}</div>
            <div style={{ fontSize: 10, color: 'var(--c-text-muted)' }}>流標金額</div>
          </div>
        </div>
      </div>

      {/* Win Rate Donut */}
      <div className="card" style={{ padding: 18 }}>
        <h4 style={{ fontSize: 14, fontWeight: 700, marginBottom: 14 }}>📊 得標率</h4>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 20 }}>
          <div style={{ position: 'relative', width: 100, height: 100 }}>
            <svg viewBox="0 0 36 36" style={{ width: 100, height: 100, transform: 'rotate(-90deg)' }}>
              <circle cx="18" cy="18" r="16" fill="none" stroke="var(--c-border)" strokeWidth="3" />
              <circle cx="18" cy="18" r="16" fill="none" stroke={winRate >= 50 ? 'var(--c-success)' : 'var(--c-danger)'} strokeWidth="3" strokeDasharray={`${winRate} ${100 - winRate}`} strokeLinecap="round" />
            </svg>
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, fontWeight: 800, color: winRate >= 50 ? 'var(--c-success)' : 'var(--c-danger)' }}>{winRate}%</div>
          </div>
          <div style={{ fontSize: 12, lineHeight: 2 }}>
            <div>✅ 得標：<b>{won.length}</b> 件</div>
            <div>❌ 流標：<b>{lost.length}</b> 件</div>
            <div>⏳ 進行中：<b>{pending.length}</b> 件</div>
          </div>
        </div>
      </div>
    </div>

    {/* Monthly Table */}
    <div className="card" style={{ padding: 18, marginBottom: 20 }}>
      <h4 style={{ fontSize: 14, fontWeight: 700, marginBottom: 14 }}>📅 月度分析</h4>
      <div className="table-wrap"><table>
        <thead><tr><th>月份</th><th>總提案</th><th>得標</th><th>流標</th><th>得標率</th><th>趨勢</th></tr></thead>
        <tbody>{months.map(m => (
          <tr key={m.month}>
            <td style={{ fontWeight: 600 }}>{m.month}</td>
            <td>{m.total}</td>
            <td style={{ color: 'var(--c-success)', fontWeight: 700 }}>{m.won}</td>
            <td style={{ color: 'var(--c-danger)', fontWeight: 700 }}>{m.lost}</td>
            <td style={{ fontWeight: 700, color: m.rate >= 50 ? 'var(--c-success)' : m.rate > 0 ? 'var(--c-danger)' : 'var(--c-text-muted)' }}>{m.total > 0 ? `${m.rate}%` : '—'}</td>
            <td style={{ width: 120 }}>
              {m.total > 0 && (
                <div style={{ display: 'flex', height: 8, borderRadius: 4, overflow: 'hidden', background: 'var(--c-bg)' }}>
                  {m.won > 0 && <div style={{ width: `${m.won / (m.won + m.lost) * 100}%`, background: 'var(--c-success)' }} />}
                  {m.lost > 0 && <div style={{ width: `${m.lost / (m.won + m.lost) * 100}%`, background: 'var(--c-danger)' }} />}
                </div>
              )}
            </td>
          </tr>
        ))}</tbody>
      </table></div>
    </div>

    {/* Customer Ranking */}
    {topCustomers.length > 0 && (
      <div className="card" style={{ padding: 18 }}>
        <h4 style={{ fontSize: 14, fontWeight: 700, marginBottom: 14 }}>🏆 客戶排行</h4>
        <div className="table-wrap"><table>
          <thead><tr><th>客戶</th><th>得標</th><th>流標</th><th>得標率</th><th>得標金額</th></tr></thead>
          <tbody>{topCustomers.map(c => {
            const t = c.won + c.lost;
            const r = t > 0 ? Math.round(c.won / t * 100) : 0;
            return (
              <tr key={c.name}>
                <td style={{ fontWeight: 600 }}>{c.name}</td>
                <td style={{ color: 'var(--c-success)', fontWeight: 700 }}>{c.won}</td>
                <td style={{ color: 'var(--c-danger)', fontWeight: 700 }}>{c.lost}</td>
                <td style={{ fontWeight: 700, color: r >= 50 ? 'var(--c-success)' : 'var(--c-danger)' }}>{r}%</td>
                <td style={{ fontWeight: 700, color: 'var(--c-primary)' }}>{FMT(c.totalAmt)}</td>
              </tr>
            );
          })}</tbody>
        </table></div>
      </div>
    )}
  </>);
}
