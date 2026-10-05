/**
 * ══════════════════════════════════════════════════════
 *  UNIT TESTS — Business Logic, Validation, State
 * ══════════════════════════════════════════════════════
 * Run: node tests/unit.test.js
 *
 * These tests validate isolated business logic without
 * needing a running server (model-level tests).
 */

require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Event = require('../models/Event');
const Booking = require('../models/Booking');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/ticket-booking-test';

let passed = 0, failed = 0;

function assert(condition, testName) {
  if (condition) { passed++; console.log(`  ✅ ${testName}`); }
  else { failed++; console.log(`  ❌ ${testName}`); }
}

async function run() {
  await mongoose.connect(MONGO_URI);
  await User.deleteMany({ email: /^unit-test/ });
  await Event.deleteMany({ title: /^UNIT-TEST/ });
  await Booking.deleteMany({});

  console.log('\n══════════════════════════════════════');
  console.log('  UNIT TESTS');
  console.log('══════════════════════════════════════\n');

  // ─── 1. Password Hashing ───
  console.log('▶ Password Hashing');
  const user = await User.create({ name: 'Unit Tester', email: 'unit-test-hash@test.com', password: 'myPassword123', role: 'USER' });
  assert(user.password !== 'myPassword123', 'Password is hashed, not stored in plain text');
  assert(await bcrypt.compare('myPassword123', user.password), 'Hashed password matches original via bcrypt');
  assert(!(await user.matchPassword('wrongPassword')), 'Wrong password does not match');
  assert(await user.matchPassword('myPassword123'), 'Correct password matches');

  // ─── 2. User Role Defaults ───
  console.log('\n▶ User Role Defaults');
  const defaultUser = await User.create({ name: 'Default', email: 'unit-test-role@test.com', password: '123456' });
  assert(defaultUser.role === 'USER', 'Default role is USER');
  const admin = await User.create({ name: 'Admin', email: 'unit-test-admin@test.com', password: '123456', role: 'ADMIN' });
  assert(admin.role === 'ADMIN', 'Explicit ADMIN role is set');

  // ─── 3. Unique Email Constraint ───
  console.log('\n▶ Unique Email Constraint');
  let duplicateError = false;
  try {
    await User.create({ name: 'Dup', email: 'unit-test-hash@test.com', password: '123456' });
  } catch (e) {
    duplicateError = e.code === 11000;
  }
  assert(duplicateError, 'Duplicate email throws MongoDB error code 11000');

  // ─── 4. Event Seat Status Defaults ───
  console.log('\n▶ Event Seat Defaults');
  const event = await Event.create({
    title: 'UNIT-TEST Event', date: new Date(), venue: 'Test', createdBy: user._id,
    seats: [
      { seatId: 'A1', row: 'A', number: 1, price: 500 },
      { seatId: 'A2', row: 'A', number: 2, price: 700 }
    ]
  });
  assert(event.seats[0].status === 'AVAILABLE', 'Seat defaults to AVAILABLE');
  assert(event.seats[0].lockedBy === null, 'lockedBy defaults to null');
  assert(event.seats[0].lockedAt === null, 'lockedAt defaults to null');
  assert(event.seats.length === 2, 'Correct seat count');

  // ─── 5. Seat State Transitions ───
  console.log('\n▶ Seat State Transitions');
  event.seats[0].status = 'LOCKED';
  event.seats[0].lockedBy = user._id;
  event.seats[0].lockedAt = new Date();
  await event.save();
  const reloaded = await Event.findById(event._id);
  assert(reloaded.seats[0].status === 'LOCKED', 'Seat transitions to LOCKED');
  assert(String(reloaded.seats[0].lockedBy) === String(user._id), 'lockedBy set correctly');

  reloaded.seats[0].status = 'BOOKED';
  await reloaded.save();
  const booked = await Event.findById(event._id);
  assert(booked.seats[0].status === 'BOOKED', 'Seat transitions to BOOKED');

  // ─── 6. Seat Price Validation ───
  console.log('\n▶ Price Calculation');
  const seats = event.seats;
  const total = seats.reduce((sum, s) => sum + s.price, 0);
  assert(total === 1200, 'Total price calculated correctly (500 + 700 = 1200)');

  // ─── 7. Booking Auto Ticket Number ───
  console.log('\n▶ Booking Ticket Generation');
  const booking = await Booking.create({
    user: user._id, event: event._id, seats: ['A1'], totalAmount: 500
  });
  assert(booking.ticketNumber.startsWith('TKT-'), 'Ticket number auto-generated with TKT- prefix');
  assert(booking.status === 'PENDING', 'Default booking status is PENDING');
  assert(booking.paymentStatus === 'PENDING', 'Default payment status is PENDING');

  // ─── 8. Booking State Transitions ───
  console.log('\n▶ Booking State Transitions');
  booking.status = 'CONFIRMED';
  booking.paymentStatus = 'SUCCESS';
  await booking.save();
  const confirmedBooking = await Booking.findById(booking._id);
  assert(confirmedBooking.status === 'CONFIRMED', 'Booking transitions to CONFIRMED');

  confirmedBooking.status = 'CANCELLED';
  await confirmedBooking.save();
  const cancelled = await Booking.findById(booking._id);
  assert(cancelled.status === 'CANCELLED', 'Booking transitions to CANCELLED');

  // ─── Cleanup & Summary ───
  await User.deleteMany({ email: /^unit-test/ });
  await Event.deleteMany({ title: /^UNIT-TEST/ });
  await Booking.deleteMany({ _id: booking._id });

  console.log('\n══════════════════════════════════════');
  console.log(`  RESULTS: ${passed} passed, ${failed} failed`);
  console.log('══════════════════════════════════════\n');

  await mongoose.disconnect();
  process.exit(failed > 0 ? 1 : 0);
}

run().catch(e => { console.error(e); process.exit(1); });
