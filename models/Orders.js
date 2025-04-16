const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const orderItemSchema = new mongoose.Schema({
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    refPath: "orderItems.itemType",
    required: true,
  }, // References either Food or Grocery
  itemType: {
    type: String,
    enum: ["Food", "Grocery"],
    required: true,
  }, // Determines the model of productId
  quantity: { type: Number, required: true },
  price: { type: Number, required: true },
  additives: { type: Array }, // Optional for groceries
  instructions: { type: String, default: "" }, // Optional for groceries
  title: { type: String, required: true },
  imageUrl: { type: String, required: true },
  time: { type: String }, // Can be food preparation time or grocery delivery estimate
  rating: { type: Number },
  feedback: { type: String },
  rated: { type: Boolean, default: false },
  feedbackId: { type: Schema.Types.ObjectId, ref: "Feedback" },
});

const orderSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    storeId: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: "storeType",
      required: true,
    }, // References either Restaurant or GroceryStore
    storeType: {
      type: String,
      enum: ["Restaurant", "GroceryStore"],
      required: true,
    }, // Determines which store type storeId references
    orderItems: [orderItemSchema],
    serviceFee: { type: Number, required: true },
    orderTotal: { type: Number, required: true },
    deliveryFee: { type: Number, required: true },
    grandTotal: { type: Number, required: true },
    walletAmountUsed: { type: Number, default: 0 },
    deliveryAddress: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Address",
      required: true,
    },
    paymentMethod: { type: String },
    reference: {
      type: String,
      required: true,
      unique: true,
    },

    paymentStatus: {
      type: String,
      default: "Pending",
      enum: ["Pending", "Completed", "Partially Paid", "Failed"],
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
    freeDelivery: { type: Boolean, default: false },
    assignedRider: { type: mongoose.Schema.Types.ObjectId, ref: "Rider" },
    riderRating: { type: Number },
    riderFeedback: { type: String },
    riderRated: { type: Boolean, default: false },
    riderFeedbackId: { type: Schema.Types.ObjectId, ref: "Feedback" },
    previouslyAssignedRiders: [
      { type: mongoose.Schema.Types.ObjectId, ref: "Rider" },
    ],
    rating: { type: Number, min: 1, max: 5 },
    feedback: { type: String, default: "" },
    promoCode: { type: String },
    discountAmount: { type: Number },
    referredBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    notes: { type: String },
    storeSecretCode: { type: String, required: true },
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
  },
  { timestamps: true }
);

module.exports = mongoose.model("Order", orderSchema);
