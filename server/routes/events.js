const express = require('express');
const Event = require('../models/Event');
const { protect, adminOnly } = require('../middleware/auth');
const router = express.Router();

// GET /api/events - list events (users see published only, admins see all)
router.get('/', protect, async (req, res) => {
  try {
    const filter = req.user.role === 'ADMIN' ? {} : { isPublished: true };
    const events = await Event.find(filter).select('-seats').sort({ date: 1 });
    res.json(events);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/events - admin creates event
router.post('/', protect, adminOnly, async (req, res) => {
  try {
    const { title, description, date, venue, seats, isPublished } = req.body;
    const event = await Event.create({
      title, description, date, venue, seats, isPublished, createdBy: req.user._id
    });
    res.status(201).json(event);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/events/:id
router.get('/:id', protect, async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ message: 'Event not found' });
    res.json(event);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT /api/events/:id - admin updates event
router.put('/:id', protect, adminOnly, async (req, res) => {
  try {
    const event = await Event.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!event) return res.status(404).json({ message: 'Event not found' });

    const io = req.app.get('io');
    io.to(`event-${event._id}`).emit('eventUpdated', event);

    res.json(event);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE /api/events/:id
router.delete('/:id', protect, adminOnly, async (req, res) => {
  try {
    const event = await Event.findByIdAndDelete(req.params.id);
    if (!event) return res.status(404).json({ message: 'Event not found' });
    res.json({ message: 'Event deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
