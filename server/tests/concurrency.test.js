/**
 * CONCURRENCY TEST
 * Demonstrates that only ONE out of N concurrent requests can lock the same seat.
 * 
 * HOW TO RUN:
 *   1. Make sure MongoDB and the server are running (npm run dev)
 *   2. Run: node tests/concurrency.test.js
 * 
 * STRATEGY:
 *   MongoDB's findOneAndUpdate is atomic at the document level.
 *   The lock query filters by { status: 'AVAILABLE' }, so only the first
 *   update that reaches MongoDB will match. All subsequent concurrent
 *   updates find status = 'LOCKED' and return null (no match).
 */

const http = require('http');

const BASE = 'http://localhost:5000/api';
const CONCURRENT_REQUESTS = 100;

// HTTP helper (no external deps)
function request(method, path, body, token) {
  return new Promise((resolve, reject) => {
    const url = new URL(BASE + path);
    const data = body ? JSON.stringify(body) : null;
    const opts = {
      hostname: url.hostname, port: url.port, path: url.pathname,
      method, headers: { 'Content-Type': 'application/json' }
    };
    if (token) opts.headers['Authorization'] = `Bearer ${token}`;
    const req = http.request(opts, (res) => {
      let body = '';
      res.on('data', c => body += c);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, data: JSON.parse(body) }); }
        catch { resolve({ status: res.statusCode, data: body }); }
      });
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

async function runTest() {
  console.log('╔════════════════════════════════════════════════════╗');
  console.log('║       CONCURRENCY TEST — SEAT LOCKING             ║');
  console.log('╚════════════════════════════════════════════════════╝\n');

  // 1. Register a test admin
  const email = `test-admin-${Date.now()}@test.com`;
  const reg = await request('POST', '/auth/register', {
    name: 'Test Admin', email, password: 'test1234', role: 'ADMIN'
  });

  if (reg.status !== 201) {
    console.error('Failed to register test user:', reg.data);
    return;
  }

  const token = reg.data.token;
  console.log('✓ Test admin registered\n');

  // 2. Create a test event with a single seat
  const eventRes = await request('POST', '/events', {
    title: 'Concurrency Test Event',
    description: 'Testing concurrent seat locking',
    date: new Date(Date.now() + 86400000).toISOString(),
    venue: 'Test Venue',
    isPublished: true,
    seats: [{ seatId: 'A1', row: 'A', number: 1, price: 500, status: 'AVAILABLE' }]
  }, token);

  if (eventRes.status !== 201) {
    console.error('Failed to create event:', eventRes.data);
    return;
  }

  const eventId = eventRes.data._id;
  console.log(`✓ Test event created (ID: ${eventId})\n`);

  // 3. Fire N concurrent lock requests for the SAME seat
  console.log(`→ Firing ${CONCURRENT_REQUESTS} concurrent lock requests for seat A1...\n`);

  const promises = [];
  for (let i = 0; i < CONCURRENT_REQUESTS; i++) {
    promises.push(
      request('POST', '/seats/lock', { eventId, seatIds: ['A1'] }, token)
    );
  }

  const results = await Promise.all(promises);
  const successes = results.filter(r => r.status === 200);
  const conflicts = results.filter(r => r.status === 409);
  const errors    = results.filter(r => r.status !== 200 && r.status !== 409);

  console.log('╔════════════════════════════════════════════════════╗');
  console.log(`║  Total Requests:  ${CONCURRENT_REQUESTS.toString().padEnd(33)}║`);
  console.log(`║  Successful:      ${successes.length.toString().padEnd(33)}║`);
  console.log(`║  Conflicts (409): ${conflicts.length.toString().padEnd(33)}║`);
  console.log(`║  Errors:          ${errors.length.toString().padEnd(33)}║`);
  console.log('╚════════════════════════════════════════════════════╝\n');

  if (successes.length === 1) {
    console.log('✅ TEST PASSED — Only 1 request successfully locked the seat!');
    console.log('   This proves MongoDB\'s atomic findOneAndUpdate prevents double-booking.\n');
  } else {
    console.log(`❌ TEST FAILED — ${successes.length} requests succeeded (expected exactly 1)\n`);
  }

  // Cleanup: delete test event
  await request('DELETE', `/events/${eventId}`, null, token);
  console.log('✓ Cleaned up test event');
}

runTest().catch(err => console.error('Test error:', err));
