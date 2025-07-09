const mongoose = require("mongoose");

const restaurantSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    openingTime: { type: Date, required: true },
    closingTime: { type: Date, required: true },
    imageUrl: { type: String, required: true },
    restaurantDoc: { type: String, required: true },
    foods: { type: Array },
    pickup: { type: Boolean, required: true, default: true },
    delivery: { type: Boolean, required: true, default: true },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    restaurantCommission: { type: Number, default: 0.0 },
    isAvailable: { type: Boolean, default: true },
    isActive: {
      type: Boolean,
      default: true,
    },
    verification: {
      type: String,
      default: "Pending",
      enum: ["Pending", "Verified", "Rejected"],
    },
    verificationMessage: {
      type: String,
      default:
        "Please allow up to 24 hours for your verification to be processed. You will receive an email notification once your verification is complete.",
    },
    code: { type: String, required: true },
    logoUrl: { type: String, required: true },
    rating: {
      type: Number,
      min: 1,
      max: 5,
      default: 5,
    },
    ratingCount: {
      type: Number,
      default: 0,
    },
    distance: { type: String },
    location: {
      type: { type: String, enum: ["Point"], required: true, default: "Point" },
      coordinates: { type: [Number], required: true }, // [longitude, latitude]
    },
    coords: {
      id: { type: String },
      latitude: { type: Number, required: true },
      longitude: { type: Number, required: true },
      latitudeDelta: { type: Number, default: 0.0122 },
      longitudeDelta: { type: Number, default: 0.0221 },
      address: { type: String, required: true },
      title: { type: String, required: true },
    },
  },
  { timestamps: true }
);

restaurantSchema.index({ "location.coordinates": "2dsphere" });

const Restaurant = mongoose.model("Restaurant", restaurantSchema);

module.exports = Restaurant;
