// Quick API test for bonus P1 features
const http = require('http');

function req(method, path, body, token) {
  return new Promise((resolve, reject) => {
    const opts = { hostname: 'localhost', port: 3002, path, method, headers: { 'Content-Type': 'application/json' } };
    if (token) opts.headers.Authorization = `Bearer ${token}`;
    const r = http.request(opts, res => {
      let data = '';
      res.on('data', d => data += d);
      res.on('end', () => resolve({ status: res.statusCode, body: JSON.parse(data || '{}') }));
    });
    r.on('error', reject);
    if (body) r.write(JSON.stringify(body));
    r.end();
  });
}

async function test() {
  console.log('=== 1. Login ===');
  const login = await req('POST', '/api/auth/login', { username: 'ceo', password: 'wdmc2026' });
  console.log('Status:', login.status);
  const token = login.body.token;
  if (!token) { console.log('Login failed:', login.body); return; }
  console.log('Token OK');

  console.log('\n=== 2. GET /api/bonuses ===');
  const list = await req('GET', '/api/bonuses', null, token);
  console.log('Status:', list.status, 'Count:', list.body.length);

  console.log('\n=== 3. GET /api/bonuses/tiers ===');
  const tiers = await req('GET', '/api/bonuses/tiers', null, token);
  console.log('Status:', tiers.status, 'Bidding tiers:', tiers.body.bidding?.length, 'Commercial:', tiers.body.commercial?.length);

  console.log('\n=== 4. GET /api/bonuses/stats ===');
  const stats = await req('GET', '/api/bonuses/stats', null, token);
  console.log('Status:', stats.status, 'Total:', stats.body.total);

  console.log('\n=== 5. GET /api/bonuses/sop/states ===');
  const states = await req('GET', '/api/bonuses/sop/states', null, token);
  console.log('Status:', states.status, 'States:', states.body.states);

  console.log('\n=== 6. POST /api/bonuses/calculate ===');
  const calc = await req('POST', '/api/bonuses/calculate', { gross_amount: 1000000, total_cost: 700000, category: 'bidding' }, token);
  console.log('Status:', calc.status, 'Tier:', calc.body.tier?.code, 'Total bonus:', calc.body.total_bonus);

  console.log('\n=== 7. POST /api/bonuses (create record) ===');
  const create = await req('POST', '/api/bonuses', {
    amount: calc.body.total_bonus, bonus_type: 'total', tier_code: calc.body.tier?.code,
    category: 'bidding', gross_amount: 1000000, net_revenue: calc.body.net_revenue,
    total_cost: 700000, profit: calc.body.profit, margin: calc.body.margin,
    execution_bonus: calc.body.execution_bonus, pool_bonus: calc.body.pool_bonus, referral_bonus: calc.body.referral_bonus
  }, token);
  console.log('Status:', create.status, 'ID:', create.body.id, 'Status(SOP):', create.body.status);
  const bonusId = create.body.id;

  console.log('\n=== 8. PUT transition: draft → kickoff ===');
  const t1 = await req('PUT', `/api/bonuses/${bonusId}/transition`, { target_status: 'kickoff' }, token);
  console.log('Status:', t1.status, 'New status:', t1.body.status || t1.body.error);

  console.log('\n=== 9. GET point allocation ===');
  const pa = await req('GET', `/api/bonuses/point-allocation/${bonusId}`, null, token);
  console.log('Status:', pa.status, 'Has allocation:', pa.status === 200, 'Total points:', pa.body.total_points);

  console.log('\n=== 10. PUT update point allocation ===');
  if (pa.body.id) {
    const core = pa.body.core_items.map((c, i) => ({ ...c, points: i === 0 ? 3 : i === 1 ? 3 : i === 2 ? 2 : 2 }));
    const upd = await req('PUT', `/api/bonuses/point-allocation/${pa.body.id}`, { core_items: core }, token);
    console.log('Status:', upd.status, 'Core subtotal:', upd.body.core_subtotal, 'Allocated:', upd.body.allocated_total);
  }

  console.log('\n=== 11. PUT transition: kickoff → executing ===');
  const t2 = await req('PUT', `/api/bonuses/${bonusId}/transition`, { target_status: 'executing' }, token);
  console.log('Status:', t2.status, 'New status:', t2.body.status || t2.body.error);

  console.log('\n=== 12. PUT transition: executing → review ===');
  const t3 = await req('PUT', `/api/bonuses/${bonusId}/transition`, { target_status: 'review' }, token);
  console.log('Status:', t3.status, 'New status:', t3.body.status || t3.body.error);

  console.log('\n=== 13. POST create review ===');
  const rv = await req('POST', `/api/bonuses/${bonusId}/review`, { supervisor_notes: '測試審查', performance_rating: 8 }, token);
  console.log('Status:', rv.status, 'Review ID:', rv.body.id || rv.body.error);

  console.log('\n=== 14. POST approve review ===');
  const ap = await req('POST', `/api/bonuses/${bonusId}/review/approve`, {}, token);
  console.log('Status:', ap.status, 'Result:', ap.body);

  console.log('\n=== 15. PUT transition: review → approved ===');
  const t4 = await req('PUT', `/api/bonuses/${bonusId}/transition`, { target_status: 'approved' }, token);
  console.log('Status:', t4.status, 'New status:', t4.body.status || t4.body.error);

  console.log('\n=== 16. GET SOP board ===');
  const board = await req('GET', '/api/bonuses/sop/board', null, token);
  console.log('Status:', board.status);
  for (const [state, items] of Object.entries(board.body.board || {})) {
    console.log(`  ${state}: ${items.length} items`);
  }

  console.log('\n✅ All P1 API tests completed!');
}

test().catch(e => console.error('FAIL:', e));
