const mongoose = require("mongoose");

const riderPaymentHistorySchema = new mongoose.Schema({
  riderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Rider",
    required: true,
  },
  amount: {
    type: Number,
    required: true,
  },
  status: {
    type: String,
    enum: ["Pending", "Completed", "Rejected"],
    default: "Pending",
  },
  paymentMethod: {
    type: String,
    enum: ["Bank Transfer", "Other"],
    required: true,
  },
  bankDetails: {
    bankName: { type: String, required: true },
    accountNumber: { type: String, required: true },
    accountName: { type: String, required: true },
  },
  requestedAt: {
    type: Date,
    default: Date.now,
  },
  completedAt: {
    type: Date,
  },
  // New fields
  orderNumber: {
    type: Number, // Assuming orderNumber is a number. Adjust the type as necessary.
    required: true,
  },
  commissionAmount: {
    type: Number, // Storing the total commission amount related to this payout
    required: true,
  },
});

const RiderPaymentHistory = mongoose.model(
  "RiderPaymentHistory",
  riderPaymentHistorySchema
);

module.exports = RiderPaymentHistory;
