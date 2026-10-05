const mongoose = require('mongoose');

const seatSchema = new mongoose.Schema({
  seatId:    { type: String, required: true },               // e.g. "A1"
  row:       { type: String, required: true },               // e.g. "A"
  number:    { type: Number, required: true },               // e.g. 1
  price:     { type: Number, required: true },               // seat price
  status:    { type: String, enum: ['AVAILABLE', 'LOCKED', 'BOOKED'], default: 'AVAILABLE' },
  lockedBy:  { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  lockedAt:  { type: Date, default: null },
  bookingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking', default: null }
}, { _id: false });

const eventSchema = new mongoose.Schema({
  title:       { type: String, required: true },
  description: { type: String, default: '' },
  date:        { type: Date, required: true },
  venue:       { type: String, required: true },
  isPublished: { type: Boolean, default: false },
  seats:       [seatSchema],
  createdBy:   { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

module.exports = mongoose.model('Event', eventSchema);
