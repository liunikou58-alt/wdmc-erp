import { createContext, useContext, useState, useEffect } from 'react'

const Ctx = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('erp_token'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) { setLoading(false); return; }
    fetch('/api/auth/me', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(setUser)
      .catch(() => { localStorage.removeItem('erp_token'); setToken(null); })
      .finally(() => setLoading(false));
  }, [token]);

  const login = async (username, password) => {
    const res = await fetch('/api/auth/login', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    localStorage.setItem('erp_token', data.token);
    setToken(data.token); setUser(data.user);
  };

  const logout = () => { localStorage.removeItem('erp_token'); setToken(null); setUser(null); };

  return <Ctx.Provider value={{ user, token, loading, login, logout, isAdmin: user?.role === 'admin' }}>{children}</Ctx.Provider>;
}

export const useAuth = () => useContext(Ctx);
