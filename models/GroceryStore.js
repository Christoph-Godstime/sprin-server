const mongoose = require("mongoose");

const groceryStoreSchema = new mongoose.Schema(
  {
    title: { type: String, required: true }, // Name of the grocery store
    openingTime: { type: Date, required: true }, // Opening time
    closingTime: { type: Date, required: true }, // Closing time
    imageUrl: { type: String, required: true }, // Store banner or
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true, // Store owner's user reference
    },
    isAvailable: { type: Boolean, default: true }, // Store availability status
    isActive: { type: Boolean, default: true }, // If the store is active
    verification: {
      type: String,
      default: "Pending",
      enum: ["Pending", "Verified", "Rejected"], // Verification status
    },
    code: { type: String, required: true }, // Unique store code
    logoUrl: { type: String, required: true }, // Store logo
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
      title: { type: String, required: true }, // Address title
    },
  },
  { timestamps: true }
);

groceryStoreSchema.index({ "location.coordinates": "2dsphere" });

const GroceryStore = mongoose.model("GroceryStore", groceryStoreSchema);

module.exports = GroceryStore;
