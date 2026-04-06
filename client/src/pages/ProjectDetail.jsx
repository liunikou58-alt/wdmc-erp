import { useState, useEffect } from 'react'
import { useLang } from '../LangContext'
import { useParams, Link } from 'react-router-dom'
import { api } from '../api'
import { useAuth } from '../AuthContext'
import GanttChart from '../components/GanttChart'

const TASK_STATUS = { todo: '📋 待辦', in_progress: '🔄 進行中', review: '👁️ 待審核', done: '✅ 完成' };
const PRIORITY = { high: '🔴', medium: '🟡', low: '🟢' };

export default function ProjectDetail() {
  const { t } = useLang();
  const { id } = useParams();
  const { token } = useAuth();
  const [project, setProject] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [users, setUsers] = useState([]);
  const [showAddTask, setShowAddTask] = useState(false);
  const [taskForm, setTaskForm] = useState({ title: '', department_id: '', assignee_id: '', priority: 'medium', due_date: '' });
  const [budgetItems, setBudgetItems] = useState([]);
  const [showBudgetForm, setShowBudgetForm] = useState(false);
  const [budgetForm, setBudgetForm] = useState({ category: '場地費', description: '', estimated_amount: '' });
  const [poSpent, setPoSpent] = useState(0);

  const [loadError, setLoadError] = useState(null);

  const load = () => {
    setLoadError(null);
    api.getProject(id).then(p => {
      if (!p || !p.id) { setLoadError('專案不存在'); return; }
      setProject(p);
    }).catch(err => {
      console.error('[ProjectDetail] Load failed:', err);
      setLoadError(err?.message || '無法載入專案');
    });
    api.getProjectTasks(id).then(setTasks).catch(() => {});
    api.getBudgetItems(id).then(setBudgetItems).catch(() => {});
    // Get total PO spending for this project
    api.getAllPOs().then(pos => {
      const spent = (pos || []).filter(p => p.project_id === id && p.status !== 'cancelled').reduce((s, p) => s + (p.total || 0), 0);
      setPoSpent(spent);
    }).catch(() => {});
  };
  useEffect(() => {
    load();
    api.getDepartments().then(setDepartments).catch(() => {});
    api.getUsers().then(setUsers).catch(() => {});
  }, [id]);

  const addTask = async () => {
    if (!taskForm.title.trim()) return;
    await api.createProjectTask(id, taskForm);
    setShowAddTask(false); setTaskForm({ title: '', department_id: '', assignee_id: '', priority: 'medium', due_date: '' });
    load();
  };

  const updateTaskStatus = async (tid, status) => {
    await api.updateProjectTask(id, tid, { status });
    load();
  };

  const toggleDesignApproval = async () => {
    if (!window.confirm(project.design_approved ? '確定要取消核准？' : '確認核准前期設計？核准後即可發包硬體採購。')) return;
    await api.updateProject(id, { design_approved: !project.design_approved });
    load();
  };

  if (loadError) return (
    <div style={{ padding: 60, textAlign: 'center' }}>
      <div style={{ fontSize: 48, marginBottom: 16 }}>⚠️</div>
      <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>無法載入專案</h2>
      <p style={{ fontSize: 13, color: 'var(--c-text-muted)', marginBottom: 20 }}>{loadError}</p>
      <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
        <Link to="/projects" className="btn btn-primary" style={{ textDecoration: 'none' }}>← 返回專案列表</Link>
        <button className="btn" onClick={() => { setLoadError(null); load(); }}>🔄 重試</button>
      </div>
    </div>
  );

  if (!project) return <div className="loader-wrap"><div className="loader" /></div>;

  const doneTasks = tasks.filter(t => t.status === 'done').length;
  const progress = tasks.length ? Math.round((doneTasks / tasks.length) * 100) : 0;
  const set = f => e => setTaskForm({ ...taskForm, [f]: e.target.value });

  return (
    <>
      <div style={{ marginBottom: 16 }}><Link to="/projects" style={{ color: 'var(--c-text-muted)', fontSize: 13, textDecoration: 'none' }}>← 返回專案列表</Link></div>

      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 className="page-title">
            {project.name}
            {project.design_approved && <span className="badge badge-success" style={{ marginLeft: 12, fontSize: 12 }}>✔️ 設計已核准</span>}
          </h1>
          <p className="page-subtitle">{project.customer_name || '未關聯客戶'} · {project.event_type || '未分類'}</p>
        </div>
        <div>
          <button 
            className={`btn ${project.design_approved ? 'btn-danger' : 'btn-success'}`} 
            onClick={toggleDesignApproval}
          >
            {project.design_approved ? '❌ 撤銷設計核准' : '✅ 核准前期設計'}
          </button>
        </div>
      </div>

      {/* 專案資訊 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 24 }}>
        <div className="stat-card"><div className="stat-icon" style={{ background: 'var(--c-primary-light)' }}>📋</div><div><div className="stat-value">{tasks.length}</div><div className="stat-label">總任務</div></div></div>
        <div className="stat-card"><div className="stat-icon" style={{ background: 'var(--c-success-light)' }}>✅</div><div><div className="stat-value">{doneTasks}</div><div className="stat-label">已完成</div></div></div>
        <div className="stat-card"><div className="stat-icon" style={{ background: 'var(--c-info-light)' }}>📊</div><div><div className="stat-value">{progress}%</div><div className="stat-label">完成率</div></div></div>
        <div className="stat-card"><div className="stat-icon" style={{ background: 'var(--c-warning-light)' }}>💰</div><div><div className="stat-value">${(project.budget || 0).toLocaleString()}</div><div className="stat-label">預算</div></div></div>
      </div>

      {/* 預算明細 (Budget Breakdown) */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700 }}>💰 預估預算表</h2>
          <button className="btn btn-primary btn-sm" onClick={() => setShowBudgetForm(true)}>+ 新增科目</button>
        </div>

        {/* Budget utilization bar */}
        {project.budget > 0 && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
              <span>預算使用率</span>
              <span style={{ fontWeight: 700, color: poSpent > project.budget ? 'var(--c-danger)' : 'var(--c-success)' }}>
                ${poSpent.toLocaleString()} / ${project.budget.toLocaleString()} ({project.budget > 0 ? Math.round(poSpent / project.budget * 100) : 0}%)
              </span>
            </div>
            <div style={{ height: 8, borderRadius: 4, background: 'var(--c-border)', overflow: 'hidden' }}>
              <div style={{ height: '100%', borderRadius: 4, width: `${Math.min(100, project.budget > 0 ? poSpent / project.budget * 100 : 0)}%`, background: poSpent > project.budget ? 'var(--c-danger)' : poSpent > project.budget * 0.8 ? 'var(--c-warning)' : 'var(--c-success)', transition: 'width 0.5s ease' }} />
            </div>
          </div>
        )}

        {showBudgetForm && (
          <div style={{ border: '1px dashed var(--c-primary)', borderRadius: 10, padding: 14, marginBottom: 12 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr 1fr', gap: 10 }}>
              <div className="form-group"><label className="form-label">科目</label>
                <select className="form-select" value={budgetForm.category} onChange={e => setBudgetForm({...budgetForm, category: e.target.value})}>
                  {['場地費', '人力費', '印刷費', '硬體租金', '設計費', '交通費', '餐飲費', '保險費', '稅金', '印花稅', '勞報', '其他'].map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div className="form-group"><label className="form-label">說明</label><input className="form-input" value={budgetForm.description} onChange={e => setBudgetForm({...budgetForm, description: e.target.value})} /></div>
              <div className="form-group"><label className="form-label">預估金額</label><input className="form-input" type="number" value={budgetForm.estimated_amount} onChange={e => setBudgetForm({...budgetForm, estimated_amount: e.target.value})} /></div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-primary btn-sm" onClick={async () => { await api.createBudgetItem(id, {...budgetForm, estimated_amount: Number(budgetForm.estimated_amount) || 0}); setShowBudgetForm(false); setBudgetForm({ category: '場地費', description: '', estimated_amount: '' }); load(); }}>建立</button>
              <button className="btn btn-secondary btn-sm" onClick={() => setShowBudgetForm(false)}>取消</button>
            </div>
          </div>
        )}

        {budgetItems.length === 0 ? (
          <p style={{ color: 'var(--c-text-muted)', fontSize: 13, textAlign: 'center', padding: 16 }}>尚無預算科目，點擊「+ 新增科目」開始編列</p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead><tr><th>科目</th><th>說明</th><th>預估金額</th><th>操作</th></tr></thead>
              <tbody>
                {budgetItems.map(item => (
                  <tr key={item.id}>
                    <td style={{ fontWeight: 600 }}>{item.category}</td>
                    <td style={{ fontSize: 12 }}>{item.description || '-'}</td>
                    <td style={{ fontWeight: 700, color: 'var(--c-primary)' }}>${(item.estimated_amount || 0).toLocaleString()}</td>
                    <td><button className="btn btn-danger btn-sm" style={{ fontSize: 10, padding: '2px 6px' }} onClick={async () => { await api.deleteBudgetItem(id, item.id); load(); }}>✕</button></td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr style={{ fontWeight: 700, background: 'var(--c-bg-elevated)' }}>
                  <td colSpan={2} style={{ textAlign: 'right' }}>預算合計</td>
                  <td style={{ color: 'var(--c-primary)' }}>${budgetItems.reduce((s, b) => s + (b.estimated_amount || 0), 0).toLocaleString()}</td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {/* 甘特圖 (Gantt Chart) */}
      <div style={{ marginBottom: 24 }}>
        <GanttChart tasks={tasks} startDate={project.start_date} endDate={project.end_date} />
      </div>

      {/* 任務管理 */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700 }}>📋 專案任務</h2>
          <button className="btn btn-primary btn-sm" onClick={() => setShowAddTask(true)}>➕ 新增任務</button>
        </div>

        {showAddTask && (
          <div style={{ border: '1px solid var(--c-border)', borderRadius: 10, padding: '14px 16px', marginBottom: 16, background: 'var(--c-bg)' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr', gap: 10 }}>
              <div className="form-group"><label className="form-label">任務名稱 *</label><input className="form-input" value={taskForm.title} onChange={set('title')} /></div>
              <div className="form-group"><label className="form-label">部門</label><select className="form-select" value={taskForm.department_id} onChange={set('department_id')}><option value="">-</option>{departments.map(d => <option key={d.id} value={d.id}>{d.icon} {d.name}</option>)}</select></div>
              <div className="form-group"><label className="form-label">負責人</label><select className="form-select" value={taskForm.assignee_id} onChange={set('assignee_id')}><option value="">-</option>{users.map(u => <option key={u.id} value={u.id}>{u.display_name}</option>)}</select></div>
              <div className="form-group"><label className="form-label">優先級</label><select className="form-select" value={taskForm.priority} onChange={set('priority')}><option value="high">🔴 高</option><option value="medium">🟡 中</option><option value="low">🟢 低</option></select></div>
              <div className="form-group"><label className="form-label">截止日</label><input className="form-input" type="date" value={taskForm.due_date} onChange={set('due_date')} /></div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}><button className="btn btn-primary btn-sm" onClick={addTask}>建立</button><button className="btn btn-secondary btn-sm" onClick={() => setShowAddTask(false)}>取消</button></div>
          </div>
        )}

        {tasks.length === 0 ? (
          <p style={{ color: 'var(--c-text-muted)', fontSize: 13, textAlign: 'center', padding: 20 }}>尚無任務</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {tasks.map(t => (
              <div key={t.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', border: '1px solid var(--c-border)', borderRadius: 8, background: t.status === 'done' ? 'var(--c-success-light)' : 'white' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span>{PRIORITY[t.priority]}</span>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 13, textDecoration: t.status === 'done' ? 'line-through' : 'none' }}>{t.title}</div>
                    <div style={{ fontSize: 11, color: 'var(--c-text-muted)' }}>{t.department_icon} {t.department_name || '-'} · {t.assignee_name || '未指派'} {t.due_date && `· 📅 ${t.due_date}`}</div>
                  </div>
                </div>
                <select className="form-select" value={t.status} style={{ width: 130, padding: '4px 8px', fontSize: 11 }}
                  onChange={e => updateTaskStatus(t.id, e.target.value)}>
                  {Object.entries(TASK_STATUS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
