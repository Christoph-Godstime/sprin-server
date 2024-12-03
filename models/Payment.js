const mongoose = require("mongoose");

const paymentSchema = new mongoose.Schema({
  restaurantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Restaurant",
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

const Payment = mongoose.model("Payment", paymentSchema);

module.exports = Payment;
