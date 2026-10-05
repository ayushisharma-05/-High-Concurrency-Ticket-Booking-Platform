const express = require('express');
const Event = require('../models/Event');
const Booking = require('../models/Booking');
const { protect, adminOnly } = require('../middleware/auth');
const router = express.Router();

// GET /api/dashboard — admin stats
router.get('/', protect, adminOnly, async (req, res) => {
  try {
    const events = await Event.find();
    const bookings = await Booking.find().populate('user', 'name email').populate('event', 'title');

    const totalEvents = events.length;
    const totalBookings = bookings.length;
    const confirmed = bookings.filter(b => b.status === 'CONFIRMED');
    const cancelled = bookings.filter(b => b.status === 'CANCELLED');
    const revenue = confirmed.reduce((sum, b) => sum + b.totalAmount, 0);

    let availableSeats = 0, soldSeats = 0;
    events.forEach(e => e.seats.forEach(s => {
      if (s.status === 'AVAILABLE') availableSeats++;
      if (s.status === 'BOOKED') soldSeats++;
    }));

    // Chart data — revenue per event
    const revenueMap = {};
    confirmed.forEach(b => {
      const name = b.event?.title || 'Unknown';
      revenueMap[name] = (revenueMap[name] || 0) + b.totalAmount;
    });
    const chartData = Object.entries(revenueMap).map(([name, revenue]) => ({ name, revenue }));

    // Recent bookings
    const recentBookings = bookings.slice(0, 10);

    res.json({
      totalEvents, totalBookings, revenue, availableSeats, soldSeats,
      cancelledBookings: cancelled.length, recentBookings, chartData
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
