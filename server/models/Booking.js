const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
  user:          { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  event:         { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true },
  seats:         [{ type: String }],   // Array of seatIds like ["A1", "A2"]
  totalAmount:   { type: Number, required: true },
  status:        { type: String, enum: ['PENDING', 'CONFIRMED', 'CANCELLED', 'FAILED'], default: 'PENDING' },
  paymentStatus: { type: String, enum: ['PENDING', 'SUCCESS', 'FAILED'], default: 'PENDING' },
  ticketNumber:  { type: String, unique: true, sparse: true }
}, { timestamps: true });

// Auto-generate ticket number
bookingSchema.pre('save', function (next) {
  if (!this.ticketNumber) {
    this.ticketNumber = 'TKT-' + Date.now() + '-' + Math.random().toString(36).substring(2, 8).toUpperCase();
  }
  next();
});

module.exports = mongoose.model('Booking', bookingSchema);
