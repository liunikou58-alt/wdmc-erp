/**
 * NotificationBell — 即時通知鈴鐺元件
 * 
 * WebSocket 連線，即時接收通知
 * 點擊展開通知面板，顯示歷史通知
 */
import { useState, useEffect, useRef, useCallback } from 'react'
import { api } from '../api'

export default function NotificationBell({ userId }) {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unread, setUnread] = useState(0);
  const [wsStatus, setWsStatus] = useState('disconnected');
  const wsRef = useRef(null);
  const reconnectRef = useRef(null);

  const loadNotifications = useCallback(async () => {
    try {
      const data = await api.getNotifications();
      setNotifications(data || []);
      const countData = await api.getUnreadCount();
      setUnread(countData?.count || 0);
    } catch {}
  }, []);

  // WebSocket 連線
  useEffect(() => {
    if (!userId) return;

    function connect() {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws?userId=${userId}`;
      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        setWsStatus('connected');
        console.log('[WS] 已連線');
      };

      ws.onmessage = (e) => {
        try {
          const data = JSON.parse(e.data);
          if (data.type === 'notification') {
            setNotifications(prev => [{ id: Date.now(), ...data, read: false, created_at: data.timestamp }, ...prev]);
            setUnread(prev => prev + 1);
            // 瀏覽器通知
            if (Notification.permission === 'granted') {
              new Notification(data.title, { body: data.message, icon: '🏢' });
            }
          }
        } catch {}
      };

      ws.onclose = () => {
        setWsStatus('disconnected');
        reconnectRef.current = setTimeout(connect, 5000);
      };

      ws.onerror = () => ws.close();
      wsRef.current = ws;
    }

    connect();
    loadNotifications();

    // 請求瀏覽器通知權限
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }

    return () => {
      clearTimeout(reconnectRef.current);
      wsRef.current?.close();
    };
  }, [userId, loadNotifications]);

  const markAllRead = async () => {
    await api.markAllRead();
    setUnread(0);
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const categoryIcons = { approval: '📋', schedule: '📅', system: '📢', upload: '📤' };

  return (
    <div style={{ position: 'relative' }}>
      <button onClick={() => { setOpen(!open); if (!open) loadNotifications(); }}
        style={{ background: 'none', border: 'none', cursor: 'pointer', position: 'relative', padding: '6px 8px', borderRadius: 8 }}>
        <span style={{ fontSize: 20 }}>🔔</span>
        {unread > 0 && (
          <span style={{ position: 'absolute', top: 2, right: 2, background: 'var(--c-danger)', color: 'white', fontSize: 9, fontWeight: 800, width: 18, height: 18, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid var(--c-bg-sidebar)' }}>
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {/* 連線狀態指示 */}
      <span style={{ position: 'absolute', bottom: 4, right: 4, width: 8, height: 8, borderRadius: '50%', background: wsStatus === 'connected' ? '#22c55e' : '#ef4444', border: '2px solid var(--c-bg-sidebar)' }} />

      {/* 通知面板 */}
      {open && (
        <>
          <div style={{ position: 'fixed', inset: 0, zIndex: 998 }} onClick={() => setOpen(false)} />
          <div style={{ position: 'absolute', top: 'calc(100% + 8px)', right: 0, width: 340, maxHeight: 400, background: 'white', borderRadius: 14, boxShadow: '0 12px 40px rgba(0,0,0,0.18)', border: '1px solid var(--c-border)', zIndex: 999, overflow: 'hidden', animation: 'fadeInUp 0.15s ease' }}>
            {/* 標題 */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 16px', borderBottom: '1px solid var(--c-border)' }}>
              <div style={{ fontWeight: 700, fontSize: 14 }}>🔔 通知中心</div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <span style={{ fontSize: 10, color: wsStatus === 'connected' ? 'var(--c-success)' : 'var(--c-danger)' }}>● {wsStatus === 'connected' ? '即時' : '離線'}</span>
                {unread > 0 && <button onClick={markAllRead} style={{ background: 'none', border: 'none', fontSize: 11, color: 'var(--c-primary)', cursor: 'pointer', fontWeight: 600 }}>全部已讀</button>}
              </div>
            </div>

            {/* 通知列表 */}
            <div style={{ maxHeight: 340, overflowY: 'auto' }}>
              {notifications.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '30px 20px', color: 'var(--c-text-muted)' }}>
                  <div style={{ fontSize: 32, marginBottom: 8 }}>🔕</div>
                  <div style={{ fontSize: 13 }}>暫無通知</div>
                </div>
              ) : notifications.slice(0, 20).map(n => (
                <div key={n.id} style={{ display: 'flex', gap: 10, padding: '10px 16px', borderBottom: '1px solid var(--c-bg)', background: n.read ? 'white' : 'var(--c-primary-light)', cursor: 'pointer', transition: 'background 0.15s' }}>
                  <span style={{ fontSize: 18, marginTop: 2 }}>{categoryIcons[n.category] || '📌'}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: n.read ? 500 : 700, fontSize: 13, marginBottom: 2 }}>{n.title}</div>
                    <div style={{ fontSize: 11, color: 'var(--c-text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{n.message}</div>
                    <div style={{ fontSize: 10, color: 'var(--c-text-muted)', marginTop: 3 }}>
                      {n.created_at ? new Date(n.created_at).toLocaleString('zh-TW', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : ''}
                    </div>
                  </div>
                  {!n.read && <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--c-primary)', marginTop: 6, flexShrink: 0 }} />}
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
