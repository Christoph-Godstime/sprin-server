const mongoose = require("mongoose");

const cartSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    storeId: { type: mongoose.Schema.Types.ObjectId, refPath: "storeType" }, // Reference to either a Restaurant or GroceryStore
    storeType: {
      type: String,
      enum: ["Restaurant", "GroceryStore"],
      required: true,
    }, // Store type
    items: [
      {
        _id: {
          type: mongoose.Schema.Types.ObjectId,
          default: mongoose.Types.ObjectId,
        },
        productId: {
          type: mongoose.Schema.Types.ObjectId,
          required: true,
          refPath: "items.itemType", // Dynamically reference based on itemType
        },
        itemType: {
          type: String,
          enum: ["Food", "Grocery"], // Dynamically determines which model productId refers to
          required: true,
        },
        quantity: { type: Number, required: true },
        additives: { type: Array }, // Optional for grocery
        instructions: { type: String, default: "" }, // Optional for grocery
        price: { type: Number, required: true },
        title: { type: String, required: true },
        imageUrl: { type: String, required: true },
        time: { type: String }, // Optional delivery or preparation time
      },
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model("Cart", cartSchema);
