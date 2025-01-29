const mongoose = require("mongoose");

const subCategorySchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    value: { type: String, required: true },
    imageUrl: { type: String },
  },
  { _id: true } // Ensure each subcategory gets its own unique `_id`
);

const groceryCategorySchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    value: { type: String, required: true },
    imageUrl: { type: String, required: true },
    subCategories: [subCategorySchema], // Use the defined subcategory schema
  },
  { timestamps: true }
);

module.exports = mongoose.model("GroceryCategory", groceryCategorySchema);
