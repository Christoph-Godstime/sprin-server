const mongoose = require("mongoose");

const cartSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    restaurantId: { type: mongoose.Schema.Types.ObjectId, ref: "Restaurant" },
    items: [
      {
        _id: {
          type: mongoose.Schema.Types.ObjectId,
          default: mongoose.Types.ObjectId,
        },
        foodId: { type: mongoose.Schema.Types.ObjectId, ref: "Food" },
        quantity: { type: Number, required: true },
        additives: { type: Array },
        instructions: { type: String, default: "" },
        price: { type: Number, required: true },
        title: { type: String, required: true },
        imageUrl: { type: String, required: true },
        time: { type: String },
      },
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model("Cart", cartSchema);
