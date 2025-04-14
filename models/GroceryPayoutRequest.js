const mongoose = require("mongoose");

const groceryPayoutRequestSchema = new mongoose.Schema({
  groceryStoreId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "GroceryStore",
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
    type: Number, // Assuming orderNumber is a number
    required: true,
  },
  commissionAmount: {
    type: Number,
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
groceryPayoutRequestSchema.pre("save", function (next) {
  this.updatedAt = Date.now();
  next();
});

const GroceryPayoutRequest = mongoose.model(
  "GroceryPayoutRequest",
  groceryPayoutRequestSchema
);

module.exports = GroceryPayoutRequest;
