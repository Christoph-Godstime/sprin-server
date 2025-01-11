const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const orderItemSchema = new mongoose.Schema({
  foodId: { type: mongoose.Schema.Types.ObjectId, ref: "Food" },
  quantity: { type: Number, required: true },
  price: { type: Number, required: true },
  additives: { type: Array },
  instructions: { type: String, default: "" },
  title: { type: String, required: true },
  imageUrl: { type: String, required: true },
  time: { type: String, required: true },
  rating: { type: Number, required: false },
  feedback: { type: String, required: false },
  rated: { type: Boolean, default: false },
  feedbackId: { type: Schema.Types.ObjectId, ref: "Feedback", required: false },
});

const orderSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    orderItems: [orderItemSchema],
    orderTotal: { type: Number, required: true },
    deliveryFee: { type: Number, required: true },
    grandTotal: { type: Number, required: true },
    deliveryAddress: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Address",
      required: true,
    },
    paymentMethod: { type: String },
    paymentStatus: {
      type: String,
      default: "Pending",
      enum: ["Pending", "Completed", "Failed"],
    },
    orderStatus: {
      type: String,
      default: "Placed",
      enum: [
        "Placed",
        "Preparing",
        "Ready",
        "Rider Assigned",
        "Rider Accepted Order",
        "Out for Delivery",
        "Arrived",
        "Delivered",
      ],
    },
    orderDate: { type: Date, default: Date.now },
    restaurantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Restaurant",
      required: true,
    },
    freeDelivery: { type: Boolean, default: false, required: true },
    assignedRider: { type: mongoose.Schema.Types.ObjectId, ref: "Rider" },
    riderRating: { type: Number, required: false },
    riderFeedback: { type: String, required: false },
    riderRated: { type: Boolean, default: false },
    riderFeedbackId: {
      type: Schema.Types.ObjectId,
      ref: "Feedback",
      required: false,
    },
    previouslyAssignedRiders: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Rider",
      },
    ],
    rating: { type: Number, min: 1, max: 5 },
    feedback: String,
    promoCode: String,
    discountAmount: Number,
    referredBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    notes: String,
    restaurantSecretCode: { type: String, required: true },
    riderSecretCode: { type: String, required: true },
    preparingTime: { type: Date },
    readyTime: { type: Date },
    riderAssignedTime: { type: Date },
    riderAcceptedTime: { type: Date },
    inTransitTime: { type: Date },
    arrivalTime: { type: Date },
    deliveryTime: { type: Date },
    progressSteps: { type: Number },
    rated: { type: Boolean, default: false },
    feedback: { type: String, default: "" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Order", orderSchema);
