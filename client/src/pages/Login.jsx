import { useState } from 'react'
import { useAuth } from '../AuthContext'

export default function Login() {
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault(); setError(''); setLoading(true);
    try { await login(username, password); } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #eef2ff 0%, #e0e7ff 50%, #c7d2fe 100%)' }}>
      <form onSubmit={submit} style={{ background: 'white', borderRadius: 20, padding: '48px 40px', width: 400, boxShadow: '0 20px 60px rgba(79,70,229,0.15)' }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ fontSize: 48, marginBottom: 8 }}>🏢</div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: '#1e293b' }}>WDMC ERP</h1>
          <p style={{ color: '#64748b', fontSize: 13 }}>瓦當麥可企業營運管理系統</p>
        </div>
        <div className="form-group">
          <label className="form-label">帳號</label>
          <input className="form-input" value={username} onChange={e => setUsername(e.target.value)} placeholder="員工帳號" autoFocus required />
        </div>
        <div className="form-group">
          <label className="form-label">密碼</label>
          <input className="form-input" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="密碼" required />
        </div>
        {error && <p style={{ color: 'var(--c-danger)', fontSize: 13, marginBottom: 12 }}>❌ {error}</p>}
        <button type="submit" className="btn btn-primary" disabled={loading}
          style={{ width: '100%', justifyContent: 'center', padding: 12, fontSize: 15 }}>
          {loading ? '登入中...' : '🚀 登入'}
        </button>
        <p style={{ textAlign: 'center', fontSize: 11, color: '#94a3b8', marginTop: 20 }}>預設帳號：admin / admin123</p>
      </form>
    </div>
  );
}
