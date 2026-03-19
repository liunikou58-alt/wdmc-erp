require('dotenv').config({ path: require('path').resolve(__dirname, '..', '.env') });
const express = require('express');
const cors = require('cors');
const path = require('path');
const http = require('http');

require('./db');
require('./seed')();

const app = express();
const PORT = process.env.PORT || 3002;

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, '..', 'data', 'uploads')));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/customers', require('./routes/customers'));
app.use('/api/projects', require('./routes/projects'));
app.use('/api/proposals', require('./routes/proposals'));
app.use('/api/vendors', require('./routes/vendors'));
app.use('/api/finance', require('./routes/finance'));
app.use('/api/bi', require('./routes/bi'));
app.use('/api/knowledge', require('./routes/knowledge'));
app.use('/api/assets', require('./routes/assets'));
app.use('/api/contracts', require('./routes/contracts'));
app.use('/api/bridge', require('./routes/bridge'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/calendar', require('./routes/calendar'));
app.use('/api/schedules', require('./routes/schedules'));
app.use('/api/checklists', require('./routes/checklists'));
app.use('/api/files', require('./routes/files'));
app.use('/api/approvals', require('./routes/approvals'));
app.use('/api/reports', require('./routes/reports'));
app.use('/api/workers', require('./routes/workers'));
app.use('/api/labor-reports', require('./routes/labor-reports'));
app.use('/api/payments', require('./routes/payments'));
app.use('/api/inventory', require('./routes/inventory'));
app.use('/api/deposits', require('./routes/deposits'));
app.use('/api/quotation-items', require('./routes/quotation-items'));
app.use('/api/resources', require('./routes/resources'));
app.use('/api/event-docs', require('./routes/event-docs'));
app.use('/api/form-builder', require('./routes/form-builder'));
app.use('/api/profit-loss', require('./routes/profit-loss'));
app.use('/api/purchase-orders', require('./routes/purchase-orders'));
app.use('/api/export', require('./routes/export'));

// Health (with WS online count)
const ws = require('./ws');
app.get('/api/health', (req, res) => res.json({
  status: 'ok', system: 'WDMC ERP',
  time: new Date().toISOString(),
  online: ws.getOnlineCount(),
  websocket: true
}));

// Serve frontend build (for production / tunnel access)
const fs = require('fs');
const clientBuild = path.join(__dirname, '..', 'client', 'dist');
if (fs.existsSync(clientBuild)) {
  app.use(express.static(clientBuild));
  app.get('*', (req, res) => {
    if (!req.path.startsWith('/api/') && !req.path.startsWith('/ws')) {
      res.sendFile(path.join(clientBuild, 'index.html'));
    }
  });
}

// Error handling
app.use((err, req, res, next) => {
  console.error('[ERP Error]', err);
  res.status(500).json({ error: err.message || '伺服器錯誤' });
});

// HTTP + WebSocket
const server = http.createServer(app);
ws.init(server);

server.listen(PORT, () => {
  console.log(`\n🏢 WDMC ERP 系統已啟動`);
  console.log(`   http://localhost:${PORT}`);
  console.log(`   WebSocket: ws://localhost:${PORT}/ws`);
  console.log(`   Health: http://localhost:${PORT}/api/health\n`);
});
