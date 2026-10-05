const express = require('express');
const Event = require('../models/Event');
const { protect } = require('../middleware/auth');
const router = express.Router();

// GET /api/events/:id/seats
router.get('/events/:id/seats', protect, async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ message: 'Event not found' });

    // Clean expired locks before returning
    const lockMs = (process.env.LOCK_DURATION_MINUTES || 5) * 60 * 1000;
    const now = new Date();
    let changed = false;

    event.seats.forEach(seat => {
      if (seat.status === 'LOCKED' && seat.lockedAt && (now - seat.lockedAt > lockMs)) {
        seat.status = 'AVAILABLE';
        seat.lockedBy = null;
        seat.lockedAt = null;
        seat.bookingId = null;
        changed = true;
      }
    });

    if (changed) {
      await event.save();
      const io = req.app.get('io');
      io.to(`event-${event._id}`).emit('seatsUpdated', event.seats);
    }

    res.json(event.seats);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/seats/lock — atomic seat locking (concurrency-safe)
router.post('/seats/lock', protect, async (req, res) => {
  try {
    const { eventId, seatIds } = req.body;
    const userId = req.user._id;
    const lockMs = (process.env.LOCK_DURATION_MINUTES || 5) * 60 * 1000;
    const now = new Date();
    const lockedSeats = [];
    const failedSeats = [];

    for (const seatId of seatIds) {
      // Atomic: only locks if seat is AVAILABLE or has an expired lock
      const result = await Event.findOneAndUpdate(
        {
          _id: eventId,
          seats: {
            $elemMatch: {
              seatId,
              $or: [
                { status: 'AVAILABLE' },
                { status: 'LOCKED', lockedAt: { $lt: new Date(now - lockMs) } }
              ]
            }
          }
        },
        {
          $set: {
            'seats.$.status': 'LOCKED',
            'seats.$.lockedBy': userId,
            'seats.$.lockedAt': now
          }
        },
        { new: true }
      );

      if (result) lockedSeats.push(seatId);
      else failedSeats.push(seatId);
    }

    // If any seat failed, rollback all locked seats in this batch
    if (failedSeats.length > 0 && lockedSeats.length > 0) {
      for (const seatId of lockedSeats) {
        await Event.findOneAndUpdate(
          { _id: eventId, 'seats.seatId': seatId, 'seats.lockedBy': userId },
          {
            $set: {
              'seats.$.status': 'AVAILABLE',
              'seats.$.lockedBy': null,
              'seats.$.lockedAt': null
            }
          }
        );
      }

      const io = req.app.get('io');
      const updated = await Event.findById(eventId);
      io.to(`event-${eventId}`).emit('seatsUpdated', updated.seats);

      return res.status(409).json({ message: 'Some seats are no longer available', failedSeats, lockedSeats: [] });
    }

    if (lockedSeats.length === 0) {
      return res.status(409).json({ message: 'Seats are no longer available', failedSeats, lockedSeats: [] });
    }

    // Broadcast updated seats to all clients
    const io = req.app.get('io');
    const updated = await Event.findById(eventId);
    io.to(`event-${eventId}`).emit('seatsUpdated', updated.seats);

    res.json({ message: 'Seats locked successfully', lockedSeats, failedSeats });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
