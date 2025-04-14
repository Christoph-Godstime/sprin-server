const mongoose = require("mongoose");

const groceryPaymentHistorySchema = new mongoose.Schema({
  groceryStoreId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "GroceryStore",
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
  orderNumber: {
    type: Number,
    required: true,
  },
  commissionAmount: {
    type: Number,
    required: true,
  },
});

const GroceryPaymentHistory = mongoose.model(
  "GroceryPaymentHistory",
  groceryPaymentHistorySchema
);

module.exports = GroceryPaymentHistory;
