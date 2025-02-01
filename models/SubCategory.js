const mongoose = require("mongoose");

const SubCategorySchema = new mongoose.Schema({
  title: { type: String, required: true },
  value: { type: String, required: true },
  imageUrl: { type: String },
  categoryId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "GroceryCategory",
    required: true,
  },
});

module.exports = mongoose.model("SubCategory", SubCategorySchema);
