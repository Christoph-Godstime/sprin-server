const mongoose = require("mongoose");

const riderPayoutRequestSchema = new mongoose.Schema({
  riderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Rider",
    required: true,
  },
  bankName: {
    type: String,
    required: true,
  },
  accountNumber: {
    type: String,
    required: true,
  },
  accountName: {
    type: String,
    required: true,
  },
  amount: {
    type: Number,
    required: true,
  },
  orderNumber: {
    type: Number, // Assuming orderNumber is a string
    required: true,
  },
  commissionAmount: {
    type: Number, // This will store the commission amount related to this payout
    required: true,
  },
  status: {
    type: String,
    enum: ["Pending", "Approved", "Rejected"],
    default: "Pending",
  },
  email: {
    type: String,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

// Pre-save hook to update the `updatedAt` field
riderPayoutRequestSchema.pre("save", function (next) {
  this.updatedAt = Date.now();
  next();
});

const RiderPayoutRequest = mongoose.model(
  "RiderPayoutRequest",
  riderPayoutRequestSchema
);

module.exports = RiderPayoutRequest;
