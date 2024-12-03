const mongoose = require("mongoose");

const foodSchema = new mongoose.Schema({
  title: { type: String, required: true },
  restaurantName: { type: String, required: true },
  time: { type: String, required: true },
  foodTags: { type: Array, required: true },
  category: { type: String, required: true },
  foodType: { type: Array, required: true },
  code: { type: String, required: true },
  isAvailable: { type: Boolean, required: true, default: true },
  restaurant: { type: mongoose.Schema.Types.ObjectId, ref: "Restaurant" },
  rating: { type: Number, min: 1, max: 5, default: 5 },
  ratingCount: { type: Number, default: 0 },
  totalRating: { type: Number, default: 0 },
  distance: { type: Number },
  description: { type: String, required: true },
  price: { type: Number, required: true },
  additives: { type: Array, required: true },
  imageUrl: { type: Array, required: true },
  location: {
    type: { type: String, enum: ["Point"], required: true, default: "Point" },
    coordinates: { type: [Number], required: true }, // [longitude, latitude]
  },
  feedbacks: [{ type: mongoose.Schema.Types.ObjectId, ref: "Feedback" }],
});

foodSchema.index({ "location.coordinates": "2dsphere" });

module.exports = mongoose.model("Food", foodSchema);
