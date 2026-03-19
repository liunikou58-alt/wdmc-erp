import { useState, useEffect } from 'react'
import { api } from '../api'
import { useAuth } from '../AuthContext'

const ROLES = { admin: '👑 管理員', manager: '📋 主管', staff: '👤 員工', designer: '🎨 設計', executor: '🏗️ 執行' };

export default function Admin() {
  const { token } = useAuth();
  const [tab, setTab] = useState('users');
  const [users, setUsers] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [activities, setActivities] = useState([]);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ username: '', password: '', display_name: '', role: 'staff', department_id: '' });
  const [newDept, setNewDept] = useState('');

  useEffect(() => {
    api.getUsers().then(setUsers);
    api.getDepartments().then(setDepartments);
    api.getActivities().then(setActivities).catch(() => {});
  }, []);

  const addUser = async () => {
    await api.createUser(form);
    api.getUsers().then(setUsers);
    setShowAdd(false); setForm({ username: '', password: '', display_name: '', role: 'staff', department_id: '' });
  };

  const toggle = async (u) => {
    await api.updateUser(u.id, { is_active: !u.is_active });
    api.getUsers().then(setUsers);
  };

  const addDept = async () => {
    if (!newDept.trim()) return;
    await api.createDepartment({ name: newDept });
    api.getDepartments().then(setDepartments);
    setNewDept('');
  };

  const set = f => e => setForm({ ...form, [f]: e.target.value });

  return (
    <>
      <div className="page-header"><div><h1 className="page-title">⚙️ 系統管理</h1><p className="page-subtitle">帳號、部門與系統設定</p></div></div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
        {[{ k: 'users', l: '👥 帳號管理' }, { k: 'departments', l: '🏢 部門管理' }, { k: 'logs', l: '📝 操作紀錄' }].map(t =>
          <button key={t.k} className={`btn ${tab === t.k ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setTab(t.k)}>{t.l}</button>
        )}
      </div>

      {tab === 'users' && (<>
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
          <button className="btn btn-primary" onClick={() => setShowAdd(true)}>➕ 新增帳號</button>
        </div>
        {showAdd && (
          <div className="card" style={{ marginBottom: 16 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10 }}>
              <div className="form-group"><label className="form-label">帳號</label><input className="form-input" value={form.username} onChange={set('username')} /></div>
              <div className="form-group"><label className="form-label">密碼</label><input className="form-input" type="password" value={form.password} onChange={set('password')} /></div>
              <div className="form-group"><label className="form-label">姓名</label><input className="form-input" value={form.display_name} onChange={set('display_name')} /></div>
              <div className="form-group"><label className="form-label">角色</label><select className="form-select" value={form.role} onChange={set('role')}>{Object.entries(ROLES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></div>
              <div className="form-group"><label className="form-label">部門</label><select className="form-select" value={form.department_id} onChange={set('department_id')}><option value="">-</option>{departments.map(d => <option key={d.id} value={d.id}>{d.icon} {d.name}</option>)}</select></div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}><button className="btn btn-primary" onClick={addUser}>建立</button><button className="btn btn-secondary" onClick={() => setShowAdd(false)}>取消</button></div>
          </div>
        )}
        <div className="table-wrap">
          <table>
            <thead><tr><th>姓名</th><th>帳號</th><th>角色</th><th>部門</th><th>狀態</th><th>操作</th></tr></thead>
            <tbody>{users.map(u => (
              <tr key={u.id}>
                <td style={{ fontWeight: 600 }}>{u.display_name}</td>
                <td style={{ fontSize: 12, color: 'var(--c-text-muted)' }}>@{u.username}</td>
                <td><span className="badge badge-primary">{ROLES[u.role] || u.role}</span></td>
                <td>{u.department_icon} {u.department_name || '-'}</td>
                <td>{u.is_active ? <span className="badge badge-success">啟用</span> : <span className="badge badge-danger">停用</span>}</td>
                <td>{u.username !== 'admin' && <button className={`btn btn-sm ${u.is_active ? 'btn-danger' : 'btn-primary'}`} onClick={() => toggle(u)}>{u.is_active ? '停用' : '啟用'}</button>}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      </>)}

      {tab === 'departments' && (<>
        <div className="card" style={{ marginBottom: 16, display: 'flex', gap: 12, alignItems: 'flex-end' }}>
          <div style={{ flex: 1 }}><label className="form-label">新增部門</label><input className="form-input" value={newDept} onChange={e => setNewDept(e.target.value)} placeholder="部門名稱" /></div>
          <button className="btn btn-primary" onClick={addDept}>➕ 新增</button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
          {departments.map(d => (
            <div key={d.id} className="card" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 18px' }}>
              <span style={{ fontSize: 24 }}>{d.icon}</span>
              <span style={{ fontWeight: 600 }}>{d.name}</span>
            </div>
          ))}
        </div>
      </>)}

      {tab === 'logs' && (
        <div className="table-wrap">
          <table>
            <thead><tr><th>時間</th><th>使用者</th><th>操作</th><th>詳情</th></tr></thead>
            <tbody>{activities.map(a => (
              <tr key={a.id}>
                <td style={{ fontSize: 12, color: 'var(--c-text-muted)', whiteSpace: 'nowrap' }}>{new Date(a.created_at).toLocaleString('zh-TW')}</td>
                <td style={{ fontWeight: 500 }}>{a.display_name}</td>
                <td><span className="badge badge-info">{a.action}</span></td>
                <td style={{ fontSize: 13 }}>{a.detail}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}
    </>
  );
}
