import { useState } from 'react'
import { useAuth } from '../AuthContext'
import { useLang } from '../LangContext'

export default function Login() {
  const { login } = useAuth();
  const { t } = useLang();
  const [form, setForm] = useState({ username: '', password: '' });
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault(); setErr(''); setLoading(true);
    try { await login(form.username, form.password); }
    catch { setErr('帳號或密碼錯誤'); }
    setLoading(false);
  };

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--c-bg-warm)', padding: 20,
    }}>
      <div style={{
        background: 'var(--c-bg-card)', backdropFilter: 'blur(20px)',
        border: '1px solid var(--c-border)', borderRadius: 24, padding: '40px 36px',
        width: '100%', maxWidth: 400, boxShadow: 'var(--shadow-lg)',
        animation: 'fadeUp 0.5s ease',
      }}>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ fontSize: 40, marginBottom: 8 }}>🏢</div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--c-text)' }}>{t('login.title')}</h1>
          <p style={{ fontSize: 13, color: 'var(--c-text-muted)', marginTop: 4 }}>{t('login.subtitle')}</p>
        </div>

        <form onSubmit={submit}>
          <div className="form-group">
            <label className="form-label">{t('login.username')}</label>
            <input className="form-input" value={form.username} onChange={e => setForm({ ...form, username: e.target.value })}
              placeholder="請輸入帳號" autoFocus />
          </div>
          <div className="form-group">
            <label className="form-label">{t('login.password')}</label>
            <input className="form-input" type="password" value={form.password}
              onChange={e => setForm({ ...form, password: e.target.value })} placeholder="請輸入密碼" />
          </div>

          {err && <div style={{ color: 'var(--c-danger)', fontSize: 12, marginBottom: 12, textAlign: 'center' }}>{err}</div>}

          <button type="submit" className="btn btn-primary" disabled={loading} style={{
            width: '100%', justifyContent: 'center', padding: '12px', fontSize: 14,
            borderRadius: 12, marginTop: 4,
          }}>
            {loading ? t('login.submitting') : '🔓 ' + t('login.submit')}
          </button>
        </form>
      </div>
    </div>
  );
}
