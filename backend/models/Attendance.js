const mongoose = require("mongoose");

const attendanceSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  date: { type: String, required: true }, // YYYY-MM-DD
  checkIn: { type: String },
  checkOut: { type: String },
  hours: { type: String },
  reason: { type: String }, // late check-in reason
  checkoutRequestReason: { type: String }, // early checkout request reason
  requestedAt: { type: String }, // time of request
  isEarlyCheckout: { type: Boolean, default: false },
checkoutRequestReason: { type: String },
});

attendanceSchema.index({ userId: 1, date: 1 }, { unique: true });

module.exports = mongoose.model("Attendance", attendanceSchema);