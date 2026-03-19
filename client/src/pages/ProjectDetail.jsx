import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { api } from '../api'
import { useAuth } from '../AuthContext'

const TASK_STATUS = { todo: '📋 待辦', in_progress: '🔄 進行中', review: '👁️ 待審核', done: '✅ 完成' };
const PRIORITY = { high: '🔴', medium: '🟡', low: '🟢' };

export default function ProjectDetail() {
  const { id } = useParams();
  const { token } = useAuth();
  const [project, setProject] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [users, setUsers] = useState([]);
  const [showAddTask, setShowAddTask] = useState(false);
  const [taskForm, setTaskForm] = useState({ title: '', department_id: '', assignee_id: '', priority: 'medium', due_date: '' });

  const load = () => {
    api.getProject(id).then(setProject);
    api.getProjectTasks(id).then(setTasks);
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

  if (!project) return <div className="loader-wrap"><div className="loader" /></div>;

  const doneTasks = tasks.filter(t => t.status === 'done').length;
  const progress = tasks.length ? Math.round((doneTasks / tasks.length) * 100) : 0;
  const set = f => e => setTaskForm({ ...taskForm, [f]: e.target.value });

  return (
    <>
      <div style={{ marginBottom: 16 }}><Link to="/projects" style={{ color: 'var(--c-text-muted)', fontSize: 13, textDecoration: 'none' }}>← 返回專案列表</Link></div>

      <div className="page-header">
        <div>
          <h1 className="page-title">{project.name}</h1>
          <p className="page-subtitle">{project.customer_name || '未關聯客戶'} · {project.event_type || '未分類'}</p>
        </div>
      </div>

      {/* 專案資訊 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 24 }}>
        <div className="stat-card"><div className="stat-icon" style={{ background: 'var(--c-primary-light)' }}>📋</div><div><div className="stat-value">{tasks.length}</div><div className="stat-label">總任務</div></div></div>
        <div className="stat-card"><div className="stat-icon" style={{ background: 'var(--c-success-light)' }}>✅</div><div><div className="stat-value">{doneTasks}</div><div className="stat-label">已完成</div></div></div>
        <div className="stat-card"><div className="stat-icon" style={{ background: 'var(--c-info-light)' }}>📊</div><div><div className="stat-value">{progress}%</div><div className="stat-label">完成率</div></div></div>
        <div className="stat-card"><div className="stat-icon" style={{ background: 'var(--c-warning-light)' }}>💰</div><div><div className="stat-value">${(project.budget || 0).toLocaleString()}</div><div className="stat-label">預算</div></div></div>
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
