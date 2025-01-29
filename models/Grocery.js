const mongoose = require("mongoose");

const grocerySchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "GroceryCategory",
      required: true,
    },
    subCategory: { type: String, required: true },
    groceryStore: { type: mongoose.Schema.Types.ObjectId, ref: "GroceryStore" },
    price: { type: Number, required: true },
    quantity: { type: String, required: true }, // e.g., "1.5L", "500g"
    isAvailable: { type: Boolean, default: true },
    imageUrl: { type: Array, required: true },
    location: {
      type: { type: String, enum: ["Point"], required: true, default: "Point" },
      coordinates: { type: [Number], required: true }, // [longitude, latitude]
    },
  },
  { timestamps: true }
);

grocerySchema.index({ "location.coordinates": "2dsphere" });

module.exports = mongoose.model("Grocery", grocerySchema);
