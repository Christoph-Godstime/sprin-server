const mongoose = require("mongoose");

const storePaymentSchema = new mongoose.Schema({
  storeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "GroceryStore",
    required: true,
  },
  unpaid: {
    totalOrders: { type: Number, default: 0 },
    withdrawable: { type: Number, default: 0 },
    commission: { type: Number, default: 0 },
  },
  pending: {
    totalOrders: { type: Number, default: 0 },
    withdrawable: { type: Number, default: 0 },
    commission: { type: Number, default: 0 },
  },
  paid: {
    totalOrders: { type: Number, default: 0 },
    withdrawable: { type: Number, default: 0 },
    commission: { type: Number, default: 0 },
  },
  total: {
    totalOrders: { type: Number, default: 0 },
    withdrawable: { type: Number, default: 0 },
    commission: { type: Number, default: 0 },
  },
});

const StorePayment = mongoose.model("StorePayment", storePaymentSchema);

module.exports = StorePayment;
