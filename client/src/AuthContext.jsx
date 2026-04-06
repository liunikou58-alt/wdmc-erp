import { createContext, useContext, useState, useEffect } from 'react'

const Ctx = createContext(null);

// 角色層級（與後端 permissions.js 對齊）
const ROLE_LEVELS = {
  assistant: 1, staff: 2, senior: 3, manager: 4, director: 5, ceo: 6,
};

// 前端權限矩陣（簡化版，僅用於側邊欄/UI 門控）
const NAV_PERMISSIONS = {
  '/': 'assistant',
  '/calendar': 'assistant',
  '/guide': 'assistant',
  '/customers': 'staff',
  '/proposals': 'staff',
  '/contracts': 'senior',
  '/events': 'assistant',
  '/bonuses': 'manager',
  '/projects': 'assistant',
  '/win-loss': 'manager',
  '/scheduling': 'assistant',
  '/checklists': 'assistant',
  '/labor': 'assistant',
  '/esign': 'staff',
  '/vendors': 'senior',
  '/purchase-orders': 'senior',
  '/assets': 'assistant',
  '/inventory': 'assistant',
  '/resources': 'staff',
  '/profit-loss': 'director',
  '/finance': 'manager',
  '/payments': 'staff',
  '/approvals': 'staff',
  '/bi': 'manager',
  '/knowledge': 'assistant',
  '/files': 'assistant',
  '/forms': 'staff',
  '/bridge': 'director',
  '/admin': 'director',
};

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

  const roleLevel = ROLE_LEVELS[user?.role] || 0;
  const isAdmin = roleLevel >= ROLE_LEVELS.director;

  // 檢查使用者是否有權限訪問某路徑
  const canAccess = (path) => {
    const minRole = NAV_PERMISSIONS[path];
    if (!minRole) return true; // 未定義的路徑預設允許
    return roleLevel >= (ROLE_LEVELS[minRole] || 99);
  };

  return <Ctx.Provider value={{
    user, token, loading, login, logout,
    isAdmin, roleLevel, canAccess,
    roleName: user?.role_label || user?.role || '',
  }}>{children}</Ctx.Provider>;
}

export const useAuth = () => useContext(Ctx);
