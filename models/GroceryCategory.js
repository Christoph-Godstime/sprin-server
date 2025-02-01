const mongoose = require("mongoose");

const GroceryCategorySchema = new mongoose.Schema({
  title: { type: String, required: true, unique: true },
  value: { type: String, required: true, unique: true },
  imageUrl: { type: String, required: true },
});

module.exports = mongoose.model("GroceryCategory", GroceryCategorySchema);
