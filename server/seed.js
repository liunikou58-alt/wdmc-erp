const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const db = require('./db');

module.exports = function seed() {
  if (db.getAll('departments').length === 0) {
    const depts = [
      { name: '管理部', icon: '👑', sort: 1 },
      { name: '企劃部', icon: '📋', sort: 2 },
      { name: '業務部', icon: '🤝', sort: 3 },
      { name: '音響組', icon: '🔊', sort: 4 },
      { name: '燈光組', icon: '💡', sort: 5 },
      { name: '輸出設計組', icon: '🎨', sort: 6 },
      { name: '視訊組', icon: '📹', sort: 7 },
      { name: '現場執行組', icon: '🏗️', sort: 8 },
      { name: '財務部', icon: '💰', sort: 9 },
      { name: '採購部', icon: '📦', sort: 10 },
    ];
    depts.forEach(d => db.insert('departments', { id: uuidv4(), ...d }));
    console.log('[Seed] 建立 10 個部門');
  }

  if (db.getAll('users').length === 0) {
    const mgmtDept = db.findOne('departments', d => d.name === '管理部');
    db.insert('users', {
      id: uuidv4(), username: 'admin', password_hash: bcrypt.hashSync('admin123', 10),
      display_name: '系統管理員', email: 'admin@wdmc.com', role: 'admin',
      department_id: mgmtDept?.id || null, is_active: true, avatar_color: '#6366f1'
    });
    console.log('[Seed] 建立管理員 admin / admin123');
  }

  if (db.getAll('system_settings').length === 0) {
    db.insert('system_settings', {
      id: uuidv4(), key: 'company', value: {
        name: '瓦當麥可整合行銷有限公司', name_en: 'WDMC Co., Ltd.',
        tax_id: '', address: '', phone: '', email: '', logo: ''
      }
    });
    console.log('[Seed] 建立公司基本設定');
  }
};
