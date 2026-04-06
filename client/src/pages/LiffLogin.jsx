import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';

export default function LiffLogin() {
  const [status, setStatus] = useState('初始化 LINE 登入模組中...');
  const { login } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // 模擬 LIFF 載入流程與自動登入綁定機制
    // 實際環境需透過 npm i @line/liff 引入 liff.init()
    const initLiff = async () => {
      try {
        setStatus('正在連線至 LINE 伺服器...');
        await new Promise(r => setTimeout(r, 800));

        // 假設 LIFF 已取得使用者的 LINE ID
        setStatus('驗證身分中...');
        await new Promise(r => setTimeout(r, 600));

        // 在真實場景會發送 API 到 /api/auth/liff_login
        // 如果後端綁定成功會回傳 token。這裡直接作為體驗預備，以 CEO 帳號模擬登入。
        const res = await fetch('http://localhost:3002/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: 'ceo@wdmc.com', password: 'password' })
        });
        const data = await res.json();
        
        if (data.token) {
          setStatus('登入成功，正在導向首頁...');
          login(data.token, data.user);
          setTimeout(() => navigate('/'), 500);
        } else {
          setStatus('登入失敗，您的 LINE 尚未綁定系統帳號。');
        }
      } catch (err) {
        setStatus('LINE 登入發生錯誤，請聯絡管理員。');
      }
    };
    
    initLiff();
  }, [login, navigate]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: 'var(--c-bg)' }}>
      <div style={{ background: '#00B900', color: 'white', padding: '20px 40px', borderRadius: 16, textAlign: 'center', boxShadow: '0 8px 24px rgba(0,185,0,0.2)' }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>💬</div>
        <h2 style={{ margin: 0, marginBottom: 12 }}>WDMC 系統認證</h2>
        <div style={{ fontSize: 14 }}>{status}</div>
      </div>
    </div>
  );
}
