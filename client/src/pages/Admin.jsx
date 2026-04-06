import { useState, useEffect } from 'react'
import { useLang } from '../LangContext'
import { api } from '../api'
import { useAuth } from '../AuthContext'
import { ROLE_LABELS, ROLE_COLORS } from '../PermissionSystem'

export default function Admin() {
  const { t } = useLang();
  const { user: me } = useAuth();
  const [tab, setTab] = useState('users');
  const [users, setUsers] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [activities, setActivities] = useState([]);
  const [roles, setRoles] = useState([]);
  const [showAdd, setShowAdd] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({ username: '', password: '', display_name: '', role: 'staff', department_id: '', email: '' });
  const [newDept, setNewDept] = useState('');
  const [newDeptIcon, setNewDeptIcon] = useState('🏢');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = () => {
    api.getUsers().then(setUsers).catch(() => {});
    api.getDepartments().then(setDepartments);
    api.getActivities().then(setActivities).catch(() => {});
    // 載入可用角色（只會回傳低於或等於自己的角色）
    api.get('/api/auth/roles').then(setRoles).catch(() => {});
  };

  const addUser = async () => {
    if (!form.username || !form.password) return;
    try {
      await api.createUser(form);
      loadData();
      setShowAdd(false);
      setForm({ username: '', password: '', display_name: '', role: 'staff', department_id: '', email: '' });
    } catch (e) {
      alert(e.message || '建立失敗');
    }
  };

  const startEdit = (u) => {
    setEditId(u.id);
    setForm({ username: u.username, password: '', display_name: u.display_name, role: u.role, department_id: u.department_id || '', email: u.email || '' });
  };

  const saveEdit = async () => {
    const updates = { display_name: form.display_name, role: form.role, department_id: form.department_id, email: form.email };
    if (form.password) updates.password = form.password;
    try {
      await api.updateUser(editId, updates);
      setEditId(null);
      loadData();
    } catch (e) {
      alert(e.message || '更新失敗');
    }
  };

  const toggle = async (u) => {
    await api.updateUser(u.id, { is_active: !u.is_active });
    loadData();
  };

  const addDept = async () => {
    if (!newDept.trim()) return;
    await api.createDepartment({ name: newDept, icon: newDeptIcon });
    setNewDept(''); setNewDeptIcon('🏢');
    loadData();
  };

  const set = f => e => setForm({ ...form, [f]: e.target.value });

  const RoleBadge = ({ role }) => {
    const color = ROLE_COLORS[role] || '#94a3b8';
    return <span style={{ display: 'inline-block', background: `${color}20`, color, padding: '2px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600 }}>{ROLE_LABELS[role] || role}</span>;
  };

  return (
    <>
      <div className="page-header"><div><h1 className="page-title">{t('page.admin')}</h1><p className="page-subtitle">帳號、部門與系統設定</p></div></div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
        {[{ k: 'users', l: '👥 帳號管理' }, { k: 'departments', l: '🏢 部門管理' }, { k: 'logs', l: '📝 操作紀錄' }].map(t =>
          <button key={t.k} className={`btn ${tab === t.k ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setTab(t.k)}>{t.l}</button>
        )}
      </div>

      {tab === 'users' && (<>
        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 10, marginBottom: 20 }}>
          {Object.entries(ROLE_LABELS).map(([role, label]) => {
            const count = users.filter(u => u.role === role && u.is_active).length;
            const color = ROLE_COLORS[role];
            return (
              <div key={role} className="card" style={{ textAlign: 'center', padding: '10px 8px' }}>
                <div style={{ fontSize: 22, fontWeight: 800, color }}>{count}</div>
                <div style={{ fontSize: 11, color: 'var(--c-text-muted)' }}>{label}</div>
              </div>
            );
          })}
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
          <button className="btn btn-primary" onClick={() => { setShowAdd(true); setEditId(null); }}>{t('admin.addUser')}</button>
        </div>

        {/* Add Form */}
        {showAdd && (
          <div className="card" style={{ marginBottom: 16 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
              <div className="form-group"><label className="form-label">帳號 *</label><input className="form-input" value={form.username} onChange={set('username')} /></div>
              <div className="form-group"><label className="form-label">密碼 *</label><input className="form-input" type="password" value={form.password} onChange={set('password')} /></div>
              <div className="form-group"><label className="form-label">姓名</label><input className="form-input" value={form.display_name} onChange={set('display_name')} /></div>
              <div className="form-group"><label className="form-label">Email</label><input className="form-input" value={form.email} onChange={set('email')} /></div>
              <div className="form-group"><label className="form-label">{t('admin.role')}</label>
                <select className="form-select" value={form.role} onChange={set('role')}>
                  {roles.map(r => <option key={r.id} value={r.id}>{r.label}（L{r.level}）</option>)}
                </select>
              </div>
              <div className="form-group"><label className="form-label">{t('admin.dept')}</label>
                <select className="form-select" value={form.department_id} onChange={set('department_id')}>
                  <option value="">- 未指定 -</option>
                  {departments.map(d => <option key={d.id} value={d.id}>{d.icon} {d.name}</option>)}
                </select>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              <button className="btn btn-primary" onClick={addUser}>✅ 建立帳號</button>
              <button className="btn btn-secondary" onClick={() => setShowAdd(false)}>{t('common.cancel')}</button>
            </div>
          </div>
        )}

        {/* User Table */}
        <div className="table-wrap">
          <table>
            <thead><tr><th>姓名</th><th>帳號</th><th>角色</th><th>部門</th><th>Email</th><th>狀態</th><th>操作</th></tr></thead>
            <tbody>{users.map(u => (
              editId === u.id ? (
                <tr key={u.id} style={{ background: 'var(--c-bg-hover)' }}>
                  <td><input className="form-input" value={form.display_name} onChange={set('display_name')} style={{ marginBottom: 0, padding: 4, fontSize: 13 }} /></td>
                  <td style={{ fontSize: 12, color: 'var(--c-text-muted)' }}>@{u.username}</td>
                  <td><select className="form-select" value={form.role} onChange={set('role')} style={{ marginBottom: 0, padding: 4, fontSize: 12 }}>
                    {roles.map(r => <option key={r.id} value={r.id}>{r.label}</option>)}
                  </select></td>
                  <td><select className="form-select" value={form.department_id} onChange={set('department_id')} style={{ marginBottom: 0, padding: 4, fontSize: 12 }}>
                    <option value="">-</option>{departments.map(d => <option key={d.id} value={d.id}>{d.icon} {d.name}</option>)}
                  </select></td>
                  <td><input className="form-input" value={form.email} onChange={set('email')} style={{ marginBottom: 0, padding: 4, fontSize: 12 }} /></td>
                  <td colSpan={2}><div style={{ display: 'flex', gap: 6 }}>
                    <button className="btn btn-sm btn-primary" onClick={saveEdit}>💾</button>
                    <button className="btn btn-sm btn-secondary" onClick={() => setEditId(null)}>✕</button>
                  </div></td>
                </tr>
              ) : (
                <tr key={u.id} style={{ opacity: u.is_active ? 1 : 0.5 }}>
                  <td style={{ fontWeight: 600 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 28, height: 28, borderRadius: '50%', background: u.avatar_color || '#6366f1', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 12, fontWeight: 700, flexShrink: 0 }}>
                        {(u.display_name || u.username || '?')[0]}
                      </div>
                      {u.display_name}
                    </div>
                  </td>
                  <td style={{ fontSize: 12, color: 'var(--c-text-muted)' }}>@{u.username}</td>
                  <td><RoleBadge role={u.role} /></td>
                  <td>{u.department_icon} {u.department_name || '-'}</td>
                  <td style={{ fontSize: 12, color: 'var(--c-text-muted)' }}>{u.email || '-'}</td>
                  <td>{u.is_active ? <span className="badge badge-success">啟用</span> : <span className="badge badge-danger">停用</span>}</td>
                  <td>
                    <div style={{ display: 'flex', gap: 4 }}>
                      {u.username !== 'ceo' && <button className="btn btn-sm btn-secondary" onClick={() => startEdit(u)} title="編輯">✏️</button>}
                      {u.username !== 'ceo' && u.id !== me?.id && (
                        <button className={`btn btn-sm ${u.is_active ? 'btn-danger' : 'btn-primary'}`} onClick={() => toggle(u)}>
                          {u.is_active ? '停用' : '啟用'}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              )
            ))}</tbody>
          </table>
        </div>
      </>)}

      {tab === 'departments' && (<>
        <div className="card" style={{ marginBottom: 16, display: 'flex', gap: 12, alignItems: 'flex-end' }}>
          <div style={{ width: 60 }}><label className="form-label">圖示</label><input className="form-input" value={newDeptIcon} onChange={e => setNewDeptIcon(e.target.value)} /></div>
          <div style={{ flex: 1 }}><label className="form-label">部門名稱</label><input className="form-input" value={newDept} onChange={e => setNewDept(e.target.value)} placeholder="新部門名稱" /></div>
          <button className="btn btn-primary" onClick={addDept}>➕ 新增</button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
          {departments.map(d => {
            const count = users.filter(u => u.department_id === d.id && u.is_active).length;
            return (
              <div key={d.id} className="card" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 18px' }}>
                <span style={{ fontSize: 28 }}>{d.icon}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600 }}>{d.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--c-text-muted)' }}>{count} 人</div>
                </div>
              </div>
            );
          })}
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
