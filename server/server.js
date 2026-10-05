require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const connectDB = require('./config/db');
const Event = require('./models/Event');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: 'http://localhost:5173', credentials: true }
});

// Store io on app for use in routes
app.set('io', io);

// Middleware
app.use(cors({ origin: 'http://localhost:5173', credentials: true }));
app.use(express.json());

// ── Routes ──
app.use('/api/auth',      require('./routes/auth'));
app.use('/api/events',    require('./routes/events'));
app.use('/api',           require('./routes/seats'));      // /api/events/:id/seats & /api/seats/lock
app.use('/api/bookings',  require('./routes/bookings'));
app.use('/api/dashboard', require('./routes/dashboard'));

// ── Socket.IO ──
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  socket.on('joinEvent', (eventId) => {
    socket.join(`event-${eventId}`);
  });

  socket.on('leaveEvent', (eventId) => {
    socket.leave(`event-${eventId}`);
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// ── Lock Expiry Cleanup (runs every 30 seconds) ──
const LOCK_MS = (process.env.LOCK_DURATION_MINUTES || 5) * 60 * 1000;

setInterval(async () => {
  try {
    const cutoff = new Date(Date.now() - LOCK_MS);
    const events = await Event.find({
      seats: { $elemMatch: { status: 'LOCKED', lockedAt: { $lt: cutoff } } }
    });

    for (const event of events) {
      let changed = false;
      event.seats.forEach(seat => {
        if (seat.status === 'LOCKED' && seat.lockedAt && seat.lockedAt < cutoff) {
          seat.status = 'AVAILABLE';
          seat.lockedBy = null;
          seat.lockedAt = null;
          seat.bookingId = null;
          changed = true;
        }
      });
      if (changed) {
        await event.save();
        io.to(`event-${event._id}`).emit('seatsUpdated', event.seats);
        console.log(`Released expired locks for: ${event.title}`);
      }
    }
  } catch (err) {
    console.error('Lock cleanup error:', err.message);
  }
}, 30000);

// ── Start Server ──
const PORT = process.env.PORT || 5000;

connectDB().then(() => {
  server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
});

module.exports = { app, server };
