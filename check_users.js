const db = require('./server/db');
const users = db.getAll('users');
if (users.length === 0) {
  console.log('NO USERS FOUND - need to re-seed');
} else {
  console.log('Users found:', users.length);
  users.forEach(u => {
    console.log(`  ${u.username} | ${u.display_name} | role:${u.role} | ${u.is_active ? 'ACTIVE' : 'DISABLED'}`);
  });
}
