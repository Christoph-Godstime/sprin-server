const mongoose = require("mongoose");
const GroceryStore = require("../models/GroceryStore");
const Grocery = require("../models/Grocery");
const SubCategory = require("../models/SubCategory");

module.exports = {
  addGroceryItem: async (req, res) => {
    try {
      const { title, quantity, groceryStore } = req.body;

      // Ensure the grocery store exists
      const storeExists = await GroceryStore.findById(groceryStore);
      if (!storeExists) {
        return res
          .status(404)
          .json({ status: false, message: "Grocery store not found" });
      }

      // Check for an existing grocery item (Case-Insensitive Title Check)
      const existingGrocery = await Grocery.findOne({
        title: { $regex: new RegExp(`^${title}$`, "i") }, // Case-insensitive regex match
        quantity,
        groceryStore,
      });

      if (existingGrocery) {
        return res.status(400).json({
          status: false,
          message:
            "Grocery item with the same title and quantity already exists in this store",
        });
      }

      // Create new grocery item
      const newGrocery = new Grocery(req.body);
      await newGrocery.save();

      res
        .status(201)
        .json({ status: true, message: "Grocery item successfully created" });
    } catch (error) {
      console.error("Error adding grocery item:", error.message);
      res.status(500).json({ status: false, message: error.message });
    }
  },

  toggleGroceryAvailability: async (req, res) => {
    const groceryId = req.params.id;

    try {
      // Find the grocery item by its ID
      const grocery = await Grocery.findById(groceryId);

      if (!grocery) {
        return res
          .status(404)
          .json({ status: false, message: "Grocery item not found" });
      }

      // Toggle the isAvailable field
      grocery.isAvailable = !grocery.isAvailable;

      // Save the changes
      await grocery.save();

      res.status(200).json({
        status: true,
        message: "Grocery availability toggled successfully",
        isAvailable: grocery.isAvailable,
      });
    } catch (error) {
      console.error("Error toggling grocery availability:", error.message);
      res.status(500).json({ status: false, message: error.message });
    }
  },

  getSubCategoriesAndGroceries: async (req, res) => {
    try {
      const { categoryId } = req.params;

      if (!mongoose.Types.ObjectId.isValid(categoryId)) {
        return res.status(400).json({ message: "Invalid category ID" });
      }

      // Find all subcategories under the given category ID
      const subCategories = await SubCategory.find({ categoryId });

      if (subCategories.length === 0) {
        return res.status(404).json({ message: "No subcategories found" });
      }

      // Fetch groceries grouped by subcategory
      const subCategoryData = await Promise.all(
        subCategories.map(async (subCategory) => {
          const groceries = await Grocery.find({
            subCategory: subCategory._id,
          });

          return {
            subCategory: {
              _id: subCategory._id,
              title: subCategory.title,
              value: subCategory.value,
              imageUrl: subCategory.imageUrl,
            },
            groceries,
          };
        })
      );

      res.status(200).json(subCategoryData);
    } catch (error) {
      console.error("Error fetching subcategories and groceries:", error);
      res.status(500).json({ message: "Server error" });
    }
  },

  updateGroceryItem: async (req, res) => {
    try {
      const { id } = req.params;
      const { title, quantity, groceryStore, price, imageUrl } = req.body;

      // Check if the grocery item exists
      const groceryItem = await Grocery.findById(id);
      if (!groceryItem) {
        return res
          .status(404)
          .json({ status: false, message: "Grocery item not found" });
      }

      // Ensure the grocery store exists
      if (groceryStore) {
        const storeExists = await GroceryStore.findById(groceryStore);
        if (!storeExists) {
          return res
            .status(404)
            .json({ status: false, message: "Grocery store not found" });
        }
      }

      // Check for duplicate title and quantity in the same grocery store (excluding the current item)
      const existingGrocery = await Grocery.findOne({
        _id: { $ne: id }, // Exclude the current item
        title: { $regex: new RegExp(`^${title}$`, "i") }, // Case-insensitive match
        quantity,
        groceryStore,
      });

      if (existingGrocery) {
        return res.status(400).json({
          status: false,
          message:
            "Another grocery item with the same title and quantity already exists in this store",
        });
      }

      // Update the grocery item
      const updatedGrocery = await Grocery.findByIdAndUpdate(
        id,
        { title, quantity, price, imageUrl },
        { new: true, runValidators: true }
      );

      res.status(200).json({
        status: true,
        message: "Grocery item updated successfully",
        grocery: updatedGrocery,
      });
    } catch (error) {
      console.error("Error updating grocery item:", error.message);
      res.status(500).json({ status: false, message: error.message });
    }
  },
};
