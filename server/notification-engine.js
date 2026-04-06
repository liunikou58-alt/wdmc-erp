/**
 * 通知引擎 — LINE Notify + Email + 站內通知
 * 三通道統一管理
 */
const nodemailer = require('nodemailer');

// 系統設定（可從 db 讀取或環境變數）
let config = {
  line: { enabled: false, token: '' },
  email: { enabled: false, host: '', port: 587, user: '', pass: '', from: '' },
};

function configure(newConfig) {
  config = { ...config, ...newConfig };
}

// ═══ LINE Notify ═══
async function sendLineNotify(message) {
  if (!config.line.enabled || !config.line.token) return;
  try {
    await fetch('https://notify-api.line.me/api/notify', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.line.token}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: `message=${encodeURIComponent(message)}`,
    });
  } catch (e) {
    console.error('[LINE Notify]', e.message);
  }
}

// ═══ Email ═══
async function sendEmail(to, subject, html) {
  if (!config.email.enabled) return;
  try {
    const transporter = nodemailer.createTransport({
      host: config.email.host,
      port: config.email.port,
      secure: config.email.port === 465,
      auth: { user: config.email.user, pass: config.email.pass },
    });
    await transporter.sendMail({
      from: config.email.from || config.email.user,
      to, subject, html,
    });
  } catch (e) {
    console.error('[Email]', e.message);
  }
}

// ═══ 通知事件觸發 ═══
const EVENTS = {
  PROPOSAL_CREATED: { line: true, email: false, template: (d) => `\n[WDMC管理中心] 📝 新報價單「${d.title}」已建立，金額 $${(d.amount || 0).toLocaleString()}` },
  PROPOSAL_SENT: { line: false, email: true, template: (d) => `報價單「${d.title}」已寄送給客戶` },
  APPROVAL_PENDING: { line: true, email: true, template: (d) => `\n[WDMC管理中心] 📋 審批待簽核：${d.title}，請儘速處理` },
  APPROVAL_DONE: { line: true, email: false, template: (d) => `\n[WDMC管理中心] ✅ 審批通過：${d.title}` },
  PO_APPROVED: { line: true, email: false, template: (d) => `\n[WDMC管理中心] 🛒 採購單 ${d.po_no} 已核准` },
  EVENT_UPCOMING: { line: true, email: true, template: (d) => `\n[WDMC管理中心] 📅 活動提醒：「${d.title}」將於 ${d.date} 開始` },
  EVENT_CLOSED: { line: true, email: true, template: (d) => `\n[WDMC管理中心] 🏁 活動結案：「${d.title}」毛利率 ${d.margin}%` },
  PAYMENT_OVERDUE: { line: true, email: true, template: (d) => `\n[WDMC管理中心] ⚠️ 付款逾期：${d.description}，金額 $${(d.amount||0).toLocaleString()}` },
  MONTHLY_SUMMARY: { line: false, email: true, template: (d) => `WDMC管理中心 月度財務摘要` },
  DAILY_REPORT_MISSING: { line: true, email: false, template: (d) => `\n[WDMC管理中心] ⚠️ ${d.user_name}，您今日（${d.date}）尚未填寫工作會報，請儘速至系統填寫。` },
  PROPOSAL_WON: { line: true, email: true, template: (d) => `\n[WDMC管理中心] 🎉 恭喜得標！「${d.title}」已自動建立行事曆活動日、採購單及損益表。` },
};

async function emit(eventName, data, options = {}) {
  const event = EVENTS[eventName];
  if (!event) return;

  const message = event.template(data);

  // 站內通知（寫入 db）
  if (options.db) {
    options.db.insert('notifications', {
      id: require('uuid').v4(),
      type: eventName,
      message: message.trim(),
      data: JSON.stringify(data),
      read: false,
      user_id: options.userId || null,
      created_at: new Date().toISOString(),
    });
  }

  // LINE
  if (event.line) await sendLineNotify(message);

  // Email
  if (event.email && options.emailTo) {
    await sendEmail(options.emailTo, message.trim().split('\n')[0], `<div style="font-family:sans-serif;padding:20px"><h2 style="color:#1e40af">WDMC管理中心</h2><p>${message}</p></div>`);
  }
}

module.exports = { configure, sendLineNotify, sendEmail, emit, EVENTS, startDailyReportScheduler };

/**
 * 每日工作會報排程檢查
 *  - 每天 17:30 執行
 *  - 檢查所有員工當天是否已填報
 *  - 週末、國定假日、有休假記錄者免填
 *  - 未填者發送站內通知
 */
function startDailyReportScheduler(db) {
  // 台灣國定假日（每年需要更新或動態讀取）
  const TW_HOLIDAYS = [
    '01-01', // 元旦
    '01-02', // 彈性放假
    '02-28', // 和平紀念日
    '04-04', // 兒童節
    '04-05', // 清明節  
    '05-01', // 勞動節
    '10-10', // 國慶日
  ];

  function checkDaily() {
    const now = new Date();
    const dow = now.getDay();
    if (dow === 0 || dow === 6) return; // 週末

    const today = now.toISOString().slice(0, 10);
    const mmdd = today.slice(5); // MM-DD
    if (TW_HOLIDAYS.includes(mmdd)) return; // 國定假日

    const users = db.getAll('users').filter(u => u.role !== 'system');
    const reports = db.find('daily_reports', r => r.date === today);
    const leaves = db.find('attendance', a => a.start_date <= today && (a.end_date || a.start_date) >= today && a.status === 'approved');

    users.forEach(user => {
      // 已填報 → 跳過
      if (reports.some(r => r.user_id === user.id)) return;
      // 有核准休假 → 跳過
      if (leaves.some(l => l.user_id === user.id)) return;

      // 發送站內通知
      emit('DAILY_REPORT_MISSING', { user_name: user.display_name, date: today }, {
        db, userId: user.id,
      });
    });

    console.log(`[DailyReport Scheduler] ${today} 已檢查 ${users.length} 名員工`);
  }

  // 計算距離今天 17:30 的毫秒數
  function scheduleNext() {
    const now = new Date();
    const target = new Date(now);
    target.setHours(17, 30, 0, 0);
    if (now >= target) {
      target.setDate(target.getDate() + 1); // 明天 17:30
    }
    const delay = target - now;
    setTimeout(() => {
      checkDaily();
      // 之後每 24 小時執行一次
      setInterval(checkDaily, 24 * 60 * 60 * 1000);
    }, delay);
    console.log(`[DailyReport Scheduler] 已排程，將於 ${target.toLocaleString('zh-TW')} 首次執行`);
  }

  scheduleNext();
}
