/**
 * ══════════════════════════════════════════════════════════
 *  INTEGRATION + EDGE-CASE TESTS — API + DB Together
 * ══════════════════════════════════════════════════════════
 * Run: node tests/integration.test.js
 *
 * Requires the server to be running on localhost:5000.
 * Tests real API calls against the live database.
 */

const http = require('http');
const BASE = 'http://localhost:5000/api';

let passed = 0, failed = 0;

function assert(condition, testName) {
  if (condition) { passed++; console.log(`  ✅ ${testName}`); }
  else { failed++; console.log(`  ❌ ${testName}`); }
}

function req(method, path, body, token) {
  return new Promise((resolve, reject) => {
    const url = new URL(BASE + path);
    const data = body ? JSON.stringify(body) : null;
    const opts = {
      hostname: url.hostname, port: url.port, path: url.pathname,
      method, headers: { 'Content-Type': 'application/json' }
    };
    if (token) opts.headers['Authorization'] = `Bearer ${token}`;
    const request = http.request(opts, (res) => {
      let body = '';
      res.on('data', c => body += c);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, data: JSON.parse(body) }); }
        catch { resolve({ status: res.statusCode, data: body }); }
      });
    });
    request.on('error', reject);
    if (data) request.write(data);
    request.end();
  });
}

async function run() {
  console.log('\n══════════════════════════════════════════');
  console.log('  INTEGRATION & EDGE-CASE TESTS');
  console.log('══════════════════════════════════════════\n');

  const ts = Date.now();

  // ═══════════════════════════════════════
  //  1. AUTH TESTS
  // ═══════════════════════════════════════
  console.log('▶ Authentication');

  // Register
  const reg = await req('POST', '/auth/register', { name: 'IntTest', email: `inttest-${ts}@test.com`, password: 'test1234', role: 'ADMIN' });
  assert(reg.status === 201, 'Register returns 201');
  assert(reg.data.token, 'Register returns JWT token');
  assert(reg.data.role === 'ADMIN', 'Register respects role');
  const token = reg.data.token;

  // Register user
  const regUser = await req('POST', '/auth/register', { name: 'NormalUser', email: `intuser-${ts}@test.com`, password: 'test1234' });
  const userToken = regUser.data.token;

  // Login
  const login = await req('POST', '/auth/login', { email: `inttest-${ts}@test.com`, password: 'test1234' });
  assert(login.status === 200, 'Login returns 200');
  assert(login.data.token, 'Login returns JWT token');

  // ─── EDGE: Invalid Login ───
  console.log('\n▶ Edge: Invalid Authentication');
  const badLogin = await req('POST', '/auth/login', { email: `inttest-${ts}@test.com`, password: 'WRONG' });
  assert(badLogin.status === 401, 'Wrong password returns 401');

  const noUser = await req('POST', '/auth/login', { email: 'nonexistent@test.com', password: '123' });
  assert(noUser.status === 401, 'Non-existent user returns 401');

  // ─── EDGE: Missing Fields ───
  const missingFields = await req('POST', '/auth/register', { email: 'x@x.com' });
  assert(missingFields.status === 400 || missingFields.status === 500, 'Missing fields returns error');

  // ─── EDGE: Duplicate Registration ───
  const dup = await req('POST', '/auth/register', { name: 'Dup', email: `inttest-${ts}@test.com`, password: 'test1234' });
  assert(dup.status === 400, 'Duplicate email returns 400');

  // ─── EDGE: No Token ───
  console.log('\n▶ Edge: Unauthorized Access');
  const noAuth = await req('GET', '/events');
  assert(noAuth.status === 401, 'No token returns 401');

  // ─── EDGE: Invalid Token ───
  const badToken = await req('GET', '/events', null, 'invalid.jwt.token');
  assert(badToken.status === 401, 'Invalid token returns 401');

  // ─── EDGE: Expired/Garbage Token ───
  const garbageToken = await req('GET', '/events', null, 'eyJhbGciOiJIUzI1NiJ9.eyJpZCI6IjEyMyJ9.garbage');
  assert(garbageToken.status === 401, 'Garbage token returns 401');

  // ═══════════════════════════════════════
  //  2. EVENT CRUD TESTS
  // ═══════════════════════════════════════
  console.log('\n▶ Event CRUD');

  const createEv = await req('POST', '/events', {
    title: `INT-TEST Event ${ts}`, description: 'Test', date: new Date(Date.now() + 86400000).toISOString(),
    venue: 'Test Venue', isPublished: true,
    seats: [
      { seatId: 'A1', row: 'A', number: 1, price: 500 },
      { seatId: 'A2', row: 'A', number: 2, price: 700 },
      { seatId: 'B1', row: 'B', number: 1, price: 300 }
    ]
  }, token);
  assert(createEv.status === 201, 'Admin creates event (201)');
  const eventId = createEv.data._id;

  // ─── EDGE: User cannot create event ───
  const userCreate = await req('POST', '/events', { title: 'Hack', date: new Date(), venue: 'X', seats: [] }, userToken);
  assert(userCreate.status === 403, 'Normal user cannot create event (403)');

  // Get events
  const listEv = await req('GET', '/events', null, token);
  assert(listEv.status === 200, 'List events returns 200');
  assert(Array.isArray(listEv.data), 'Events response is array');

  // Get single event
  const getEv = await req('GET', `/events/${eventId}`, null, token);
  assert(getEv.status === 200, 'Get single event returns 200');
  assert(getEv.data.seats.length === 3, 'Event has 3 seats');

  // ─── EDGE: Non-existent event ───
  const notFound = await req('GET', '/events/000000000000000000000000', null, token);
  assert(notFound.status === 404, 'Non-existent event returns 404');

  // Update event
  const updateEv = await req('PUT', `/events/${eventId}`, { title: `INT-TEST Updated ${ts}` }, token);
  assert(updateEv.status === 200, 'Update event returns 200');
  assert(updateEv.data.title.includes('Updated'), 'Title updated correctly');

  // ═══════════════════════════════════════
  //  3. SEAT LOCKING TESTS
  // ═══════════════════════════════════════
  console.log('\n▶ Seat Locking');

  const seats = await req('GET', `/events/${eventId}/seats`, null, token);
  assert(seats.status === 200, 'Get seats returns 200');
  assert(seats.data.every(s => s.status === 'AVAILABLE'), 'All seats initially AVAILABLE');

  // Lock seats
  const lock = await req('POST', '/seats/lock', { eventId, seatIds: ['A1', 'A2'] }, token);
  assert(lock.status === 200, 'Lock seats returns 200');
  assert(lock.data.lockedSeats.length === 2, '2 seats locked successfully');

  // ─── EDGE: Double lock same seat ───
  const doubleLock = await req('POST', '/seats/lock', { eventId, seatIds: ['A1'] }, userToken);
  assert(doubleLock.status === 409, 'Double-lock returns 409 Conflict');

  // ═══════════════════════════════════════
  //  4. BOOKING FLOW TESTS
  // ═══════════════════════════════════════
  console.log('\n▶ Booking Flow');

  // ─── EDGE: User books seats locked by someone else ───
  const badBooking = await req('POST', '/bookings', { eventId, seatIds: ['A1'] }, userToken);
  assert(badBooking.status === 400, 'Cannot book seats locked by another user (400)');

  // Create valid booking
  const booking = await req('POST', '/bookings', { eventId, seatIds: ['A1', 'A2'] }, token);
  assert(booking.status === 201, 'Create booking returns 201');
  assert(booking.data.totalAmount === 1200, 'Total amount calculated correctly (500+700)');
  assert(booking.data.status === 'PENDING', 'New booking is PENDING');
  const bookingId = booking.data._id;

  // Get bookings
  const myBookings = await req('GET', '/bookings', null, token);
  assert(myBookings.status === 200, 'List bookings returns 200');

  // Get single booking
  const getBooking = await req('GET', `/bookings/${bookingId}`, null, token);
  assert(getBooking.status === 200, 'Get single booking returns 200');

  // ═══════════════════════════════════════
  //  5. PAYMENT SIMULATION TESTS
  // ═══════════════════════════════════════
  console.log('\n▶ Payment Simulation');

  // ─── Payment FAILURE test ───
  // First lock B1 and create new booking for failure test
  await req('POST', '/seats/lock', { eventId, seatIds: ['B1'] }, token);
  const failBooking = await req('POST', '/bookings', { eventId, seatIds: ['B1'] }, token);
  const failId = failBooking.data._id;

  const payFail = await req('POST', `/bookings/${failId}/payment`, { simulateResult: 'failure' }, token);
  assert(payFail.status === 402, 'Payment failure returns 402');
  assert(payFail.data.booking.status === 'FAILED', 'Booking status set to FAILED');

  // Verify seat released after payment failure
  const seatsAfterFail = await req('GET', `/events/${eventId}/seats`, null, token);
  const b1After = seatsAfterFail.data.find(s => s.seatId === 'B1');
  assert(b1After.status === 'AVAILABLE', 'Seat released back to AVAILABLE after payment failure');

  // ─── Payment SUCCESS test ───
  const paySuccess = await req('POST', `/bookings/${bookingId}/payment`, { simulateResult: 'success' }, token);
  assert(paySuccess.status === 200, 'Payment success returns 200');
  assert(paySuccess.data.booking.status === 'CONFIRMED', 'Booking confirmed after payment');
  assert(paySuccess.data.booking.paymentStatus === 'SUCCESS', 'Payment status is SUCCESS');

  // Verify seats now BOOKED
  const seatsAfterPay = await req('GET', `/events/${eventId}/seats`, null, token);
  const a1 = seatsAfterPay.data.find(s => s.seatId === 'A1');
  assert(a1.status === 'BOOKED', 'Seat A1 is BOOKED after successful payment');

  // ─── EDGE: Pay already confirmed booking ───
  const doublePay = await req('POST', `/bookings/${bookingId}/payment`, { simulateResult: 'success' }, token);
  assert(doublePay.status === 400, 'Cannot pay already confirmed booking (400)');

  // ═══════════════════════════════════════
  //  6. CANCELLATION TESTS
  // ═══════════════════════════════════════
  console.log('\n▶ Cancellation');

  const cancel = await req('POST', `/bookings/${bookingId}/cancel`, {}, token);
  assert(cancel.status === 200, 'Cancel returns 200');
  assert(cancel.data.booking.status === 'CANCELLED', 'Booking status is CANCELLED');

  // Verify seats released
  const seatsAfterCancel = await req('GET', `/events/${eventId}/seats`, null, token);
  const a1c = seatsAfterCancel.data.find(s => s.seatId === 'A1');
  assert(a1c.status === 'AVAILABLE', 'Seats released after cancellation');

  // ─── EDGE: Cancel by unauthorized user ───
  // (user tries to cancel admin's booking)
  // Already cancelled so this tests a different path
  const otherCancel = await req('POST', `/bookings/${bookingId}/cancel`, {}, userToken);
  assert(otherCancel.status === 403, 'Unauthorized user cannot cancel others booking');

  // ═══════════════════════════════════════
  //  7. ADMIN DASHBOARD TEST
  // ═══════════════════════════════════════
  console.log('\n▶ Admin Dashboard');

  const dash = await req('GET', '/dashboard', null, token);
  assert(dash.status === 200, 'Dashboard returns 200 for admin');
  assert(typeof dash.data.totalEvents === 'number', 'Dashboard has totalEvents');
  assert(typeof dash.data.revenue === 'number', 'Dashboard has revenue');
  assert(typeof dash.data.soldSeats === 'number', 'Dashboard has soldSeats');
  assert(Array.isArray(dash.data.chartData), 'Dashboard has chartData array');

  // ─── EDGE: Normal user cannot access dashboard ───
  const userDash = await req('GET', '/dashboard', null, userToken);
  assert(userDash.status === 403, 'Normal user cannot access dashboard (403)');

  // ═══════════════════════════════════════
  //  8. CLEANUP
  // ═══════════════════════════════════════
  await req('DELETE', `/events/${eventId}`, null, token);

  // ─── EDGE: Delete non-existent ───
  const delGhost = await req('DELETE', '/events/000000000000000000000000', null, token);
  assert(delGhost.status === 404, 'Delete non-existent event returns 404');

  // ═══════════════════════════════════════
  //  SUMMARY
  // ═══════════════════════════════════════
  console.log('\n══════════════════════════════════════════');
  console.log(`  RESULTS: ${passed} passed, ${failed} failed`);
  console.log('══════════════════════════════════════════\n');

  process.exit(failed > 0 ? 1 : 0);
}

run().catch(e => { console.error('Test error:', e.message); process.exit(1); });
