import { useState, useEffect } from 'react'
import { useLang } from '../LangContext'
import { useAuth } from '../AuthContext'
import { api } from '../api'

/* ──────────────────── 預估預算表 (Two-Layer Budget Table) ──────────────────── */
export default function BudgetTable() {
  const { t } = useLang();
  const { user } = useAuth();
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);
  const [proposals, setProposals] = useState([]);
  const [items, setItems] = useState([]);
  const [level2Open, setLevel2Open] = useState(null); // which item index is expanded
  const [detailRows, setDetailRows] = useState({}); // level2 rows per item

  useEffect(() => {
    api.getProjects().then(setProjects).catch(() => {});
    api.getProposals?.().then(setProposals).catch(() => {});
  }, []);

  // Demo sample data for a budget table
  const [demoItems] = useState([
    { id: 1, category: 'U贈品', name: '立體獎座', component: '座', quoteQty: 100, quoteAmount: 2200, costQty: 100, costAmount: 1591, status: '', details: [
      { seq: 1, name: '包裝組合', qty: 100, unitPrice: 800, vendor: '包裝王', person: 'KIKI', approved: true, manager: '江雅筠' },
      { seq: 2, name: '立體獎座', qty: 100, unitPrice: 791, vendor: '獎座工坊', person: 'KIKI', approved: true, manager: '江雅筠' },
    ]},
    { id: 2, category: 'U贈品', name: '獎狀+框', component: '份', quoteQty: 400, quoteAmount: 156, costQty: 400, costAmount: 80, status: '', details: [
      { seq: 1, name: '獎狀', qty: 400, unitPrice: 50, vendor: '印刷廠A', person: 'KIKI', approved: false, manager: '' },
      { seq: 2, name: '相框', qty: 400, unitPrice: 30, vendor: '框框公司', person: 'KIKI', approved: false, manager: '' },
    ]},
    { id: 3, category: 'H燈光', name: '場地燈光', component: '式', quoteQty: 1, quoteAmount: 80000, costQty: 1, costAmount: 55000, status: '', details: [
      { seq: 1, name: 'LED Par 租用', qty: 20, unitPrice: 1500, vendor: '燈光專家', person: '猴子', approved: false, manager: '' },
      { seq: 2, name: '控台+操作', qty: 1, unitPrice: 25000, vendor: '燈光專家', person: '猴子', approved: false, manager: '' },
    ]},
    { id: 4, category: 'CE節目', name: '主持人費用', component: '場', quoteQty: 1, quoteAmount: 15000, costQty: 1, costAmount: 12000, status: '', details: [
      { seq: 1, name: '主持人', qty: 1, unitPrice: 12000, vendor: '主持事務所', person: '沈攸言', approved: false, manager: '' },
    ]},
  ]);

  const budgetItems = items.length > 0 ? items : demoItems;

  const quoteTotal = budgetItems.reduce((s, i) => s + i.quoteQty * i.quoteAmount, 0);
  const costTotal = budgetItems.reduce((s, i) => s + i.costQty * i.costAmount, 0);
  const totalProfit = quoteTotal - costTotal;
  const grossMargin = quoteTotal > 0 ? ((totalProfit / quoteTotal) * 100).toFixed(2) : '0.00';

  const toggleLevel2 = (idx) => {
    setLevel2Open(level2Open === idx ? null : idx);
  };

  const toggleApproval = (itemIdx, detailIdx) => {
    // Toggle approval of a detail row
    const item = budgetItems[itemIdx];
    const detail = item.details[detailIdx];
    detail.approved = !detail.approved;
    if (detail.approved) {
      detail.manager = user.display_name;
    } else {
      detail.manager = '';
    }
    setDetailRows({ ...detailRows }); // force re-render
  };

  return (<>
    <div style={{ marginBottom: 20 }}>
      <h1 style={{ fontSize: 22, fontWeight: 800 }}>{t('budget.title')}</h1>
      <p style={{ fontSize: 13, color: 'var(--c-text-muted)', marginTop: 4 }}>{t('budget.subtitle')}</p>
    </div>

    {/* Project Selection */}
    <div className="card" style={{ marginBottom: 16 }}>
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
        <select value={selectedProject || ''} onChange={e => setSelectedProject(e.target.value)}
          style={{ padding: '8px 12px', border: '1px solid var(--c-border)', borderRadius: 8, background: 'var(--c-bg)', color: 'var(--c-text)', fontSize: 13, minWidth: 240 }}>
          <option value="">-- 選擇專案 --</option>
          {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <button className="btn btn-sm" style={{ background: 'var(--c-primary)', color: 'white', border: 'none' }}>
          {t('budget.importFromQuote')}
        </button>
      </div>
    </div>

    {/* Summary Cards */}
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 12, marginBottom: 20 }}>
      {[
        { label: t('budget.quoteTotalExTax'), value: `$${quoteTotal.toLocaleString()}`, color: 'var(--c-primary)' },
        { label: t('budget.quoteTotalIncTax'), value: `$${Math.round(quoteTotal * 1.05).toLocaleString()}`, color: 'var(--c-primary)' },
        { label: t('budget.costTotalExTax'), value: `$${costTotal.toLocaleString()}`, color: 'var(--c-warning)' },
        { label: t('budget.costTotalIncTax'), value: `$${Math.round(costTotal * 1.05).toLocaleString()}`, color: 'var(--c-warning)' },
        { label: t('budget.totalProfit'), value: `$${totalProfit.toLocaleString()}`, color: totalProfit >= 0 ? 'var(--c-success)' : 'var(--c-danger)' },
        { label: t('budget.grossMargin'), value: `${grossMargin}%`, color: parseFloat(grossMargin) >= 30 ? 'var(--c-success)' : 'var(--c-danger)' },
      ].map((s, i) => (
        <div key={i} className="stat-card">
          <div><div className="stat-value" style={{ color: s.color, fontSize: 16 }}>{s.value}</div>
          <div className="stat-label">{s.label}</div></div>
        </div>
      ))}
    </div>

    {/* Level 1: Item Navigation Table */}
    <div className="card" style={{ marginBottom: 20 }}>
      <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>{t('budget.level1')}</h3>
      <div style={{ overflowX: 'auto' }}>
        <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: '2px solid var(--c-border)' }}>
              {[t('budget.category'), t('budget.itemName'), t('budget.component'),
                t('budget.quoteQty'), t('budget.quoteAmount'), t('budget.quoteTotal'),
                t('budget.costQty'), t('budget.costAmount'), t('budget.costTotal'),
                t('budget.profit'), t('budget.inquiryStatus'),
              ].map((h, i) => (
                <th key={i} style={{ padding: '10px 8px', textAlign: i < 3 ? 'left' : 'right', fontWeight: 600, fontSize: 12, color: 'var(--c-text-muted)', whiteSpace: 'nowrap' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {budgetItems.map((item, idx) => {
              const qt = item.quoteQty * item.quoteAmount;
              const ct = item.costQty * item.costAmount;
              const profit = qt - ct;
              return (
                <tr key={idx} style={{ borderBottom: '1px solid var(--c-border)', cursor: 'pointer', transition: 'background 0.15s' }}
                  onClick={() => toggleLevel2(idx)}
                  onMouseOver={e => e.currentTarget.style.background = 'var(--c-primary-bg)'}
                  onMouseOut={e => e.currentTarget.style.background = ''}>
                  <td style={{ padding: '10px 8px' }}>
                    <span style={{ color: 'var(--c-primary)', fontWeight: 600, cursor: 'pointer', textDecoration: 'underline' }}>{item.category}</span>
                  </td>
                  <td style={{ padding: '10px 8px', fontWeight: 500 }}>{item.name}</td>
                  <td style={{ padding: '10px 8px', color: 'var(--c-text-muted)' }}>{item.component}</td>
                  <td style={{ padding: '10px 8px', textAlign: 'right' }}>{item.quoteQty}</td>
                  <td style={{ padding: '10px 8px', textAlign: 'right' }}>${item.quoteAmount.toLocaleString()}</td>
                  <td style={{ padding: '10px 8px', textAlign: 'right', fontWeight: 600 }}>${qt.toLocaleString()}</td>
                  <td style={{ padding: '10px 8px', textAlign: 'right', color: 'var(--c-warning)' }}>{item.costQty}</td>
                  <td style={{ padding: '10px 8px', textAlign: 'right', color: 'var(--c-warning)' }}>${item.costAmount.toLocaleString()}</td>
                  <td style={{ padding: '10px 8px', textAlign: 'right', fontWeight: 600, color: 'var(--c-warning)' }}>${ct.toLocaleString()}</td>
                  <td style={{ padding: '10px 8px', textAlign: 'right', fontWeight: 700, color: profit >= 0 ? 'var(--c-success)' : 'var(--c-danger)' }}>
                    ${profit.toLocaleString()}
                  </td>
                  <td style={{ padding: '10px 8px', color: 'var(--c-text-muted)', fontSize: 12 }}>{item.status || '-'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>

    {/* Level 2: Cost Breakdown Detail (shown when a row is clicked) */}
    {level2Open !== null && (
      <div className="card" style={{ marginBottom: 20, animation: 'fadeUp 0.3s ease', border: '2px solid var(--c-primary)', borderRadius: 14 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3 style={{ fontSize: 15, fontWeight: 700 }}>
            {t('budget.level2')} — {budgetItems[level2Open].category} / {budgetItems[level2Open].name}
          </h3>
          <button className="btn btn-sm btn-ghost" onClick={() => setLevel2Open(null)}>× 關閉</button>
        </div>

        {/* Level 2 Header */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 16, padding: '12px 16px', background: 'var(--c-primary-bg)', borderRadius: 10 }}>
          <div><div style={{ fontSize: 11, color: 'var(--c-text-muted)' }}>報價總價</div><div style={{ fontWeight: 700 }}>${(budgetItems[level2Open].quoteQty * budgetItems[level2Open].quoteAmount).toLocaleString()}</div></div>
          <div><div style={{ fontSize: 11, color: 'var(--c-text-muted)' }}>成本總價</div><div style={{ fontWeight: 700, color: 'var(--c-warning)' }}>${(budgetItems[level2Open].costQty * budgetItems[level2Open].costAmount).toLocaleString()}</div></div>
          <div><div style={{ fontSize: 11, color: 'var(--c-text-muted)' }}>{t('budget.profit')}</div><div style={{ fontWeight: 700, color: 'var(--c-success)' }}>${((budgetItems[level2Open].quoteQty * budgetItems[level2Open].quoteAmount) - (budgetItems[level2Open].costQty * budgetItems[level2Open].costAmount)).toLocaleString()}</div></div>
          <div><div style={{ fontSize: 11, color: 'var(--c-text-muted)' }}>{t('budget.remainingBudget')}</div><div style={{ fontWeight: 700 }}>${(budgetItems[level2Open].costQty * budgetItems[level2Open].costAmount).toLocaleString()}</div></div>
        </div>

        {/* Level 2 Detail Table */}
        <div style={{ overflowX: 'auto' }}>
          <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--c-border)' }}>
                {['項次', '項目', '數量', '金額/數量', '小計', '廠商名稱', '備註', '負責人', '主管簽核', '主管名稱'].map((h, i) => (
                  <th key={i} style={{ padding: '10px 8px', textAlign: i > 2 && i < 5 ? 'right' : 'left', fontWeight: 600, fontSize: 12, color: 'var(--c-text-muted)', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(budgetItems[level2Open].details || []).map((d, di) => (
                <tr key={di} style={{ borderBottom: '1px solid var(--c-border)' }}>
                  <td style={{ padding: '10px 8px' }}>{d.seq}</td>
                  <td style={{ padding: '10px 8px', fontWeight: 500 }}>{d.name}</td>
                  <td style={{ padding: '10px 8px' }}>{d.qty}</td>
                  <td style={{ padding: '10px 8px', textAlign: 'right' }}>${d.unitPrice.toLocaleString()}</td>
                  <td style={{ padding: '10px 8px', textAlign: 'right', fontWeight: 600 }}>${(d.qty * d.unitPrice).toLocaleString()}</td>
                  <td style={{ padding: '10px 8px', color: 'var(--c-text-muted)' }}>{d.vendor}</td>
                  <td style={{ padding: '10px 8px' }}>-</td>
                  <td style={{ padding: '10px 8px' }}>{d.person}</td>
                  <td style={{ padding: '10px 8px' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer' }}>
                      <input type="checkbox" checked={d.approved} onChange={() => toggleApproval(level2Open, di)} style={{ width: 16, height: 16, accentColor: 'var(--c-success)' }} />
                      <span style={{ fontSize: 12, color: d.approved ? 'var(--c-success)' : 'var(--c-text-muted)' }}>{d.approved ? '已簽核' : '待簽核'}</span>
                    </label>
                  </td>
                  <td style={{ padding: '10px 8px', fontWeight: 500 }}>{d.manager || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div style={{ marginTop: 12, padding: '10px 14px', background: 'rgba(255,59,48,0.08)', borderRadius: 8, fontSize: 12, color: 'var(--c-danger)' }}>
          儲存後，成本金額會自動帶入第一層 · 主管簽核後才可進行該項目的採購
        </div>
      </div>
    )}
  </>);
}
