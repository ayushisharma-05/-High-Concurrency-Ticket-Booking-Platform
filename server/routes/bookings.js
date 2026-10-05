const express = require('express');
const Booking = require('../models/Booking');
const Event = require('../models/Event');
const { protect } = require('../middleware/auth');
const router = express.Router();

// Helper — release seats back to AVAILABLE
async function releaseSeats(eventId, seatIds, io) {
  for (const seatId of seatIds) {
    await Event.findOneAndUpdate(
      { _id: eventId, 'seats.seatId': seatId },
      { $set: { 'seats.$.status': 'AVAILABLE', 'seats.$.lockedBy': null, 'seats.$.lockedAt': null, 'seats.$.bookingId': null } }
    );
  }
  const updated = await Event.findById(eventId);
  if (updated) io.to(`event-${eventId}`).emit('seatsUpdated', updated.seats);
}

// GET /api/bookings
router.get('/', protect, async (req, res) => {
  try {
    const filter = req.user.role === 'ADMIN' ? {} : { user: req.user._id };
    const bookings = await Booking.find(filter)
      .populate('user', 'name email')
      .populate('event', 'title date venue')
      .sort({ createdAt: -1 });
    res.json(bookings);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/bookings/:id
router.get('/:id', protect, async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id)
      .populate('user', 'name email')
      .populate('event', 'title date venue seats');
    if (!booking) return res.status(404).json({ message: 'Booking not found' });
    res.json(booking);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/bookings — create booking from locked seats
router.post('/', protect, async (req, res) => {
  try {
    const { eventId, seatIds } = req.body;
    const userId = req.user._id;
    const event = await Event.findById(eventId);
    if (!event) return res.status(404).json({ message: 'Event not found' });

    // Verify all seats are locked by this user
    let totalAmount = 0;
    for (const seatId of seatIds) {
      const seat = event.seats.find(s => s.seatId === seatId);
      if (!seat) return res.status(400).json({ message: `Seat ${seatId} not found` });
      if (seat.status !== 'LOCKED' || String(seat.lockedBy) !== String(userId)) {
        return res.status(400).json({ message: `Seat ${seatId} is not locked by you` });
      }
      totalAmount += seat.price;
    }

    const booking = await Booking.create({ user: userId, event: eventId, seats: seatIds, totalAmount });

    // Tag seats with bookingId
    for (const seatId of seatIds) {
      await Event.findOneAndUpdate(
        { _id: eventId, 'seats.seatId': seatId },
        { $set: { 'seats.$.bookingId': booking._id } }
      );
    }

    res.status(201).json(booking);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/bookings/:id/payment — simulated payment (success | failure | timeout)
router.post('/:id/payment', protect, async (req, res) => {
  try {
    const { simulateResult } = req.body;
    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ message: 'Booking not found' });
    if (String(booking.user) !== String(req.user._id)) return res.status(403).json({ message: 'Not your booking' });
    if (booking.status !== 'PENDING') return res.status(400).json({ message: 'Booking not in pending state' });

    const io = req.app.get('io');

    // TIMEOUT
    if (simulateResult === 'timeout') {
      await new Promise(r => setTimeout(r, 3000));
      booking.status = 'FAILED';
      booking.paymentStatus = 'FAILED';
      await booking.save();
      await releaseSeats(booking.event, booking.seats, io);
      return res.status(408).json({ message: 'Payment timed out', booking });
    }

    // FAILURE
    if (simulateResult === 'failure') {
      booking.status = 'FAILED';
      booking.paymentStatus = 'FAILED';
      await booking.save();
      await releaseSeats(booking.event, booking.seats, io);
      return res.status(402).json({ message: 'Payment failed', booking });
    }

    // SUCCESS
    booking.status = 'CONFIRMED';
    booking.paymentStatus = 'SUCCESS';
    await booking.save();

    for (const seatId of booking.seats) {
      await Event.findOneAndUpdate(
        { _id: booking.event, 'seats.seatId': seatId },
        { $set: { 'seats.$.status': 'BOOKED' } }
      );
    }

    const updated = await Event.findById(booking.event);
    io.to(`event-${booking.event}`).emit('seatsUpdated', updated.seats);

    res.json({ message: 'Payment successful! Ticket confirmed.', booking });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/bookings/:id/cancel
router.post('/:id/cancel', protect, async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ message: 'Booking not found' });
    if (String(booking.user) !== String(req.user._id) && req.user.role !== 'ADMIN') {
      return res.status(403).json({ message: 'Not authorized' });
    }

    booking.status = 'CANCELLED';
    await booking.save();

    const io = req.app.get('io');
    await releaseSeats(booking.event, booking.seats, io);

    res.json({ message: 'Booking cancelled', booking });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
