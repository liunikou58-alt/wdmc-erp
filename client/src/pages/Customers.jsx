import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api'

export default function Customers() {
  const [customers, setCustomers] = useState([]);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: '', contact_person: '', phone: '', email: '', category: 'corporate' });

  useEffect(() => { api.getCustomers().then(setCustomers).catch(() => {}); }, []);

  const add = async () => {
    if (!form.name.trim()) return;
    await api.createCustomer(form);
    api.getCustomers().then(setCustomers);
    setShowAdd(false); setForm({ name: '', contact_person: '', phone: '', email: '', category: 'corporate' });
  };

  const set = f => e => setForm({ ...form, [f]: e.target.value });

  return (
    <>
      <div className="page-header">
        <div><h1 className="page-title">🤝 客戶管理</h1><p className="page-subtitle">管理客戶資料、案件與合作紀錄</p></div>
        <button className="btn btn-primary" onClick={() => setShowAdd(true)}>➕ 新增客戶</button>
      </div>

      {showAdd && (
        <div className="card" style={{ marginBottom: 20 }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 12 }}>新增客戶</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: 12 }}>
            <div className="form-group"><label className="form-label">公司/機構名稱 *</label><input className="form-input" value={form.name} onChange={set('name')} /></div>
            <div className="form-group"><label className="form-label">聯絡人</label><input className="form-input" value={form.contact_person} onChange={set('contact_person')} /></div>
            <div className="form-group"><label className="form-label">電話</label><input className="form-input" value={form.phone} onChange={set('phone')} /></div>
            <div className="form-group"><label className="form-label">Email</label><input className="form-input" value={form.email} onChange={set('email')} /></div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-primary" onClick={add}>✅ 建立</button>
            <button className="btn btn-secondary" onClick={() => setShowAdd(false)}>取消</button>
          </div>
        </div>
      )}

      {customers.length === 0 ? (
        <div className="empty-state"><div className="empty-state-icon">🤝</div><div className="empty-state-title">尚無客戶</div><p>點擊「新增客戶」開始建立客戶資料</p></div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead><tr><th>客戶名稱</th><th>聯絡人</th><th>電話</th><th>案件數</th><th>專案數</th><th>操作</th></tr></thead>
            <tbody>
              {customers.map(c => (
                <tr key={c.id}>
                  <td style={{ fontWeight: 600 }}><Link to={`/customers/${c.id}`} style={{ color:'var(--c-primary)', textDecoration:'none' }}>{c.name}</Link></td>
                  <td>{c.contact_person || '-'}</td>
                  <td style={{ fontSize: 12 }}>{c.phone || '-'}</td>
                  <td><span className="badge badge-info">{c.case_count}</span></td>
                  <td><span className="badge badge-primary">{c.project_count}</span></td>
                  <td><button className="btn btn-danger btn-sm" onClick={async () => { await api.deleteCustomer(c.id); api.getCustomers().then(setCustomers); }}>刪除</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
