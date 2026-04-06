import { useState, useEffect } from 'react'
import { useLang } from '../LangContext'
import { api } from '../api'

/* ──────────── 結案績效檢討表 (Project Review) ──────────── */
export default function ProjectReview() {
  const { t } = useLang();
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState('');
  const [form, setForm] = useState({
    projectName: '', department: '', projectManager: '', customerName: '',
    budgetLimit: 0, actualSpend: 0,
    efficiency: 0,
  });
  const [kpiRows, setKpiRows] = useState([
    { role: '企劃', person: '', score: '', bonus: '', note: '' },
    { role: '設計', person: '', score: '', bonus: '', note: '' },
    { role: '執行', person: '', score: '', bonus: '', note: '' },
  ]);
  const [lessons, setLessons] = useState('');

  useEffect(() => {
    api.getProjects().then(setProjects).catch(() => {});
  }, []);

  const handleProjectSelect = (projId) => {
    setSelectedProject(projId);
    const proj = projects.find(p => String(p.id) === String(projId));
    if (proj) {
      setForm(prev => ({
        ...prev,
        projectName: proj.name,
        department: proj.department || '',
        projectManager: proj.assigned_to_name || '',
      }));
    }
  };

  const surplus = form.budgetLimit - form.actualSpend;
  const isOverBudget = surplus < 0;

  const updateKpi = (idx, field, value) => {
    const next = [...kpiRows];
    next[idx] = { ...next[idx], [field]: value };
    setKpiRows(next);
  };

  return (<>
    <div style={{ marginBottom: 20 }}>
      <h1 style={{ fontSize: 22, fontWeight: 800 }}>{t('review.title')}</h1>
      <p style={{ fontSize: 13, color: 'var(--c-text-muted)', marginTop: 4 }}>
        專案名稱可連結到專案 · 預算上限自動從預估成本表帶入 · 實際支出自動從採購單帶入
      </p>
    </div>

    {/* Project Selection */}
    <div className="card" style={{ marginBottom: 16 }}>
      <select value={selectedProject} onChange={e => handleProjectSelect(e.target.value)}
        style={{ padding: '8px 12px', border: '1px solid var(--c-border)', borderRadius: 8, background: 'var(--c-bg)', color: 'var(--c-text)', fontSize: 13, minWidth: 300 }}>
        <option value="">-- 選擇專案 --</option>
        {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
      </select>
    </div>

    {/* Section A: Summary */}
    <div className="card" style={{ marginBottom: 20 }}>
      <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16, paddingBottom: 8, borderBottom: '2px solid var(--c-primary)' }}>
        A. {t('review.summary')}
      </h3>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14 }}>
        {[
          { label: '專案名稱', value: form.projectName, linked: true },
          { label: '部門名稱', value: form.department },
          { label: '專案主管', value: form.projectManager },
          { label: '客戶名稱', value: form.customerName, auto: true },
        ].map((f, i) => (
          <div key={i}>
            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--c-text-muted)', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
              {f.label}
              {f.auto && <span style={{ fontSize: 10, color: 'var(--c-primary)', background: 'var(--c-primary-bg)', padding: '1px 6px', borderRadius: 4 }}>自動</span>}
              {f.linked && <span style={{ fontSize: 10, color: 'var(--c-info)', background: 'color-mix(in srgb, var(--c-info) 10%, transparent)', padding: '1px 6px', borderRadius: 4 }}>可連結</span>}
            </label>
            <div style={{ padding: '8px 10px', border: '1px solid var(--c-border)', borderRadius: 8, fontSize: 13, background: 'var(--c-primary-bg)', minHeight: 36 }}>
              {f.value || '-'}
            </div>
          </div>
        ))}
      </div>
    </div>

    {/* Section B: Financials */}
    <div className="card" style={{ marginBottom: 20 }}>
      <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16, paddingBottom: 8, borderBottom: '2px solid var(--c-warning)' }}>
        B. {t('review.financials')}
      </h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 16 }}>
        <div>
          <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--c-text-muted)', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
            {t('review.budgetLimit')}
            <span style={{ fontSize: 10, color: 'var(--c-primary)', background: 'var(--c-primary-bg)', padding: '1px 6px', borderRadius: 4 }}>自動連動預算表</span>
          </label>
          <input type="number" value={form.budgetLimit} onChange={e => setForm({ ...form, budgetLimit: parseInt(e.target.value) || 0 })}
            style={{ width: '100%', padding: '8px 10px', border: '1px solid var(--c-border)', borderRadius: 8, background: 'var(--c-primary-bg)', color: 'var(--c-text)', fontSize: 13 }} />
        </div>
        <div>
          <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--c-text-muted)', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
            {t('review.actualSpend')}
            <span style={{ fontSize: 10, color: 'var(--c-primary)', background: 'var(--c-primary-bg)', padding: '1px 6px', borderRadius: 4 }}>自動連動採購單</span>
          </label>
          <input type="number" value={form.actualSpend} onChange={e => setForm({ ...form, actualSpend: parseInt(e.target.value) || 0 })}
            style={{ width: '100%', padding: '8px 10px', border: '1px solid var(--c-border)', borderRadius: 8, background: 'var(--c-primary-bg)', color: 'var(--c-text)', fontSize: 13 }} />
        </div>
        <div>
          <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--c-text-muted)', marginBottom: 4, display: 'block' }}>{t('review.surplus')}</label>
          <div style={{
            padding: '8px 10px', border: '1px solid var(--c-border)', borderRadius: 8, fontSize: 16, fontWeight: 800,
            color: isOverBudget ? 'var(--c-danger)' : 'var(--c-success)',
            background: isOverBudget ? 'rgba(255,59,48,0.06)' : 'rgba(52,199,89,0.06)',
          }}>
            {isOverBudget ? '超支 ' : '結餘 '}${Math.abs(surplus).toLocaleString()}
          </div>
        </div>
        <div>
          <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--c-text-muted)', marginBottom: 4, display: 'block' }}>{t('review.efficiency')}</label>
          <div style={{ padding: '8px 10px', border: '1px solid var(--c-border)', borderRadius: 8, fontSize: 16, fontWeight: 700 }}>
            {form.budgetLimit > 0 ? ((form.actualSpend / form.budgetLimit) * 100).toFixed(1) : 0}%
          </div>
        </div>
      </div>
    </div>

    {/* Section C: KPI & Bonus */}
    <div className="card" style={{ marginBottom: 20 }}>
      <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16, paddingBottom: 8, borderBottom: '2px solid var(--c-success)' }}>
        C. {t('review.kpi')}
      </h3>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
        <thead>
          <tr style={{ borderBottom: '2px solid var(--c-border)' }}>
            {['職務', '主責人員', '績效分數', '預發獎金', '備註/結算狀態'].map((h, i) => (
              <th key={i} style={{ padding: '10px 8px', textAlign: 'left', fontWeight: 600, fontSize: 12, color: 'var(--c-text-muted)' }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {kpiRows.map((r, i) => (
            <tr key={i} style={{ borderBottom: '1px solid var(--c-border)' }}>
              <td style={{ padding: '10px 8px', fontWeight: 600 }}>{r.role}</td>
              <td style={{ padding: '10px 8px' }}>
                <input value={r.person} onChange={e => updateKpi(i, 'person', e.target.value)}
                  style={{ padding: '6px 8px', border: '1px solid var(--c-border)', borderRadius: 6, background: 'var(--c-bg)', color: 'var(--c-text)', fontSize: 12 }} />
              </td>
              <td style={{ padding: '10px 8px' }}>
                <input type="number" min="0" max="10" value={r.score} onChange={e => updateKpi(i, 'score', e.target.value)}
                  placeholder="1-10" style={{ width: 60, padding: '6px 8px', border: '1px solid var(--c-border)', borderRadius: 6, background: 'var(--c-bg)', color: 'var(--c-text)', fontSize: 12 }} />
              </td>
              <td style={{ padding: '10px 8px' }}>
                <input type="number" value={r.bonus} onChange={e => updateKpi(i, 'bonus', e.target.value)}
                  placeholder="$0" style={{ width: 80, padding: '6px 8px', border: '1px solid var(--c-border)', borderRadius: 6, background: 'var(--c-bg)', color: 'var(--c-text)', fontSize: 12 }} />
              </td>
              <td style={{ padding: '10px 8px' }}>
                <input value={r.note} onChange={e => updateKpi(i, 'note', e.target.value)}
                  style={{ width: '100%', padding: '6px 8px', border: '1px solid var(--c-border)', borderRadius: 6, background: 'var(--c-bg)', color: 'var(--c-text)', fontSize: 12 }} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <button className="btn btn-sm" onClick={() => setKpiRows([...kpiRows, { role: '', person: '', score: '', bonus: '', note: '' }])}
        style={{ marginTop: 8, background: 'var(--c-primary-bg)', color: 'var(--c-primary)', border: '1px dashed var(--c-primary)' }}>+ 新增角色</button>
    </div>

    {/* Section D: Lessons */}
    <div className="card" style={{ marginBottom: 20 }}>
      <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16, paddingBottom: 8, borderBottom: '2px solid var(--c-accent)' }}>
        D. {t('review.lessonsLearned')}
      </h3>
      <textarea value={lessons} onChange={e => setLessons(e.target.value)} rows={5} placeholder="請記錄經驗總結與優化建議..."
        style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--c-border)', borderRadius: 8, background: 'var(--c-bg)', color: 'var(--c-text)', fontSize: 13, resize: 'vertical' }} />
    </div>

    <div style={{ display: 'flex', gap: 8 }}>
      <button className="btn" style={{ background: 'var(--c-primary)', color: 'white', border: 'none' }}>{t('common.save')}</button>
      <button className="btn btn-ghost">{t('common.cancel')}</button>
    </div>
  </>);
}
