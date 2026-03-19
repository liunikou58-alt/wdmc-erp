/**
 * WebSocket 即時通知服務
 * 
 * 功能：
 * - 用戶連線後即時推送通知
 * - 審批狀態變更即時通知
 * - 排班衝突警告即時推送
 * - 全域廣播（系統公告）
 */
const WebSocket = require('ws');
const url = require('url');

let wss = null;
const clients = new Map(); // userId -> Set<ws>

function init(server) {
  wss = new WebSocket.Server({ server, path: '/ws' });

  wss.on('connection', (ws, req) => {
    const params = url.parse(req.url, true).query;
    const userId = params.userId;

    if (userId) {
      if (!clients.has(userId)) clients.set(userId, new Set());
      clients.get(userId).add(ws);
      console.log(`[WS] 用戶 ${userId} 已連線 (在線: ${clients.size})`);
    }

    // 心跳
    ws.isAlive = true;
    ws.on('pong', () => { ws.isAlive = true; });

    ws.on('close', () => {
      if (userId && clients.has(userId)) {
        clients.get(userId).delete(ws);
        if (clients.get(userId).size === 0) clients.delete(userId);
      }
    });

    // 歡迎訊息
    ws.send(JSON.stringify({ type: 'connected', message: '已連線到 WDMC ERP 即時通知', timestamp: new Date().toISOString() }));
  });

  // 心跳檢查 30 秒
  setInterval(() => {
    wss.clients.forEach(ws => {
      if (!ws.isAlive) return ws.terminate();
      ws.isAlive = false;
      ws.ping();
    });
  }, 30000);

  console.log('[WS] WebSocket 即時通知已啟動');
}

// 發送給指定用戶
function sendToUser(userId, data) {
  const userClients = clients.get(userId);
  if (!userClients) return;
  const msg = JSON.stringify(data);
  userClients.forEach(ws => {
    if (ws.readyState === WebSocket.OPEN) ws.send(msg);
  });
}

// 發送給多個用戶
function sendToUsers(userIds, data) {
  userIds.forEach(id => sendToUser(id, data));
}

// 全域廣播
function broadcast(data) {
  if (!wss) return;
  const msg = JSON.stringify(data);
  wss.clients.forEach(ws => {
    if (ws.readyState === WebSocket.OPEN) ws.send(msg);
  });
}

// 通知 helpers
function notifyApproval(userId, approval, action) {
  sendToUser(userId, {
    type: 'notification', category: 'approval',
    title: action === 'approved' ? '✅ 審批已通過' : action === 'rejected' ? '❌ 審批被退回' : '📋 新審批待處理',
    message: `「${approval.title}」${action === 'approved' ? '已核准' : action === 'rejected' ? '已退回' : '需要您審核'}`,
    link: '/approvals', timestamp: new Date().toISOString()
  });
}

function notifySchedule(userId, schedule, type) {
  sendToUser(userId, {
    type: 'notification', category: 'schedule',
    title: type === 'conflict' ? '⚠️ 排班衝突' : '📅 新排班通知',
    message: schedule.title || `${schedule.start_date} 已排班`,
    link: '/scheduling', timestamp: new Date().toISOString()
  });
}

function notifySystem(message) {
  broadcast({
    type: 'notification', category: 'system',
    title: '📢 系統通知', message,
    timestamp: new Date().toISOString()
  });
}

function getOnlineCount() {
  return clients.size;
}

module.exports = { init, sendToUser, sendToUsers, broadcast, notifyApproval, notifySchedule, notifySystem, getOnlineCount };
