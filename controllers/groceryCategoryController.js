const GroceryCategory = require("../models/GroceryCategory");
const SubCategory = require("../models/SubCategory");
const Grocery = require("../models/Grocery");
const GroceryStore = require("../models/GroceryStore");

module.exports = {
  // Create a new grocery category
  createGroceryCategory: async (req, res) => {
    const { title, value, imageUrl } = req.body;

    try {
      const existingCategory = await GroceryCategory.findOne({
        $or: [{ title }, { value }],
      });

      if (existingCategory) {
        return res.status(400).json({
          status: false,
          message:
            "Grocery category with the same title or value already exists",
        });
      }

      const newCategory = new GroceryCategory({
        title,
        value,
        imageUrl,
      });

      await newCategory.save();

      res.status(201).json({
        status: true,
        message: "Grocery category successfully created",
        data: newCategory,
      });
    } catch (error) {
      console.error("Error creating grocery category:", error);
      res.status(500).json({ status: false, message: "Server error" });
    }
  },

  // Add a subcategory to an existing grocery category
  addSubCategory: async (req, res) => {
    const { categoryId } = req.params;
    const { title, value, imageUrl } = req.body;

    try {
      const category = await GroceryCategory.findById(categoryId);
      if (!category) {
        return res
          .status(404)
          .json({ status: false, message: "Grocery category not found" });
      }

      const existingSubCategory = await SubCategory.findOne({ categoryId });

      if (existingSubCategory) {
        const isDuplicate = await SubCategory.findOne({
          categoryId,
          $or: [
            { title: { $regex: `^${title}$`, $options: "i" } }, // Case-insensitive check for title
            { value: { $regex: `^${value}$`, $options: "i" } }, // Case-insensitive check for value
          ],
        });

        if (isDuplicate) {
          return res.status(400).json({
            status: false,
            message: "Subcategory with the same title or value already exists",
          });
        }
      }

      const newSubCategory = new SubCategory({
        title,
        value,
        imageUrl,
        categoryId,
      });
      await newSubCategory.save();

      res.status(201).json({
        status: true,
        message: "Subcategory successfully added",
        data: newSubCategory,
      });
    } catch (error) {
      console.error("Error adding subcategory:", error);
      res.status(500).json({ status: false, message: "Server error" });
    }
  },

  updateGroceryCategory: async (req, res) => {
    const { id } = req.params;
    const { title, value, imageUrl } = req.body;

    try {
      const updatedCategory = await GroceryCategory.findByIdAndUpdate(
        id,
        { title, value, imageUrl },
        { new: true }
      );

      if (!updatedCategory) {
        return res
          .status(404)
          .json({ status: false, message: "Grocery category not found" });
      }

      res.status(200).json({
        status: true,
        message: "Category updated",
        data: updatedCategory,
      });
    } catch (error) {
      console.error("Error updating category:", error);
      res.status(500).json({ status: false, message: "Server error" });
    }
  },

  // Update an existing subcategory
  updateSubCategory: async (req, res) => {
    const { subCategoryId } = req.params;
    const { title, value, imageUrl } = req.body;

    try {
      const existingSubCategory = await SubCategory.findById(subCategoryId);
      if (!existingSubCategory) {
        return res
          .status(404)
          .json({ status: false, message: "Subcategory not found" });
      }

      const isDuplicate = await SubCategory.findOne({
        categoryId: existingSubCategory.categoryId,
        _id: { $ne: subCategoryId }, // Exclude the current subcategory
        $or: [
          { title: { $regex: `^${title}$`, $options: "i" } },
          { value: { $regex: `^${value}$`, $options: "i" } },
        ],
      });

      if (isDuplicate) {
        return res.status(400).json({
          status: false,
          message: "Subcategory with the same title or value already exists",
        });
      }

      const updatedSubCategory = await SubCategory.findByIdAndUpdate(
        subCategoryId,
        { title, value, imageUrl },
        { new: true }
      );

      res.status(200).json({
        status: true,
        message: "Subcategory updated",
        data: updatedSubCategory,
      });
    } catch (error) {
      console.error("Error updating subcategory:", error);
      res.status(500).json({ status: false, message: "Server error" });
    }
  },

  // Delete a subcategory
  deleteSubCategory: async (req, res) => {
    const { id, subCategoryId } = req.params; // Grocery category ID and subcategory ID

    try {
      const groceryCategory = await GroceryCategory.findById(id);

      if (!groceryCategory) {
        return res.status(404).json({
          status: false,
          message: "Grocery category not found",
        });
      }

      // Find and remove the subcategory
      const subCategory = groceryCategory.subCategories.id(subCategoryId);

      if (!subCategory) {
        return res.status(404).json({
          status: false,
          message: "Subcategory not found",
        });
      }

      subCategory.remove();
      await groceryCategory.save();

      res.status(200).json({
        status: true,
        message: "Subcategory successfully deleted",
        data: groceryCategory,
      });
    } catch (error) {
      console.error("Error deleting subcategory:", error);
      res.status(500).json({
        status: false,
        message: "An error occurred while deleting the subcategory",
      });
    }
  },

  deleteGroceryCategory: async (req, res) => {
    const { id } = req.params;

    try {
      const deletedCategory = await GroceryCategory.findByIdAndDelete(id);
      if (!deletedCategory) {
        return res
          .status(404)
          .json({ status: false, message: "Grocery category not found" });
      }

      // Also delete related subcategories
      await SubCategory.deleteMany({ categoryId: id });

      res.status(200).json({ status: true, message: "Category deleted" });
    } catch (error) {
      console.error("Error deleting category:", error);
      res.status(500).json({ status: false, message: "Server error" });
    }
  },

  getAllGroceryCategories: async (req, res) => {
    try {
      const categories = await GroceryCategory.find({}, { __v: 0 });

      // Shuffle the categories array
      const shuffledCategories = categories.sort(() => Math.random() - 0.5);

      res.status(200).json(shuffledCategories);
    } catch (error) {
      console.error("Error fetching grocery categories:", error);
      res.status(500).json({
        status: false,
        message: "An error occurred while fetching the grocery categories.",
      });
    }
  },

  getStoreGroceryCategories: async (req, res) => {
    try {
      // const excludedTitles = ["Beers And Ciders", "Spirits", "Wine"];

      const excludedTitles = [
        "Frozen Foods and Butchery",
        "Fresh Fruits and Vegetables",
        "Ice Cream & Desserts",
      ];

      // const categories = await GroceryCategory.find({}, { __v: 0 });

      const categories = await GroceryCategory.find(
        { title: { $nin: excludedTitles } },
        { __v: 0 }
      );

      // Shuffle the categories array
      const shuffledCategories = categories.sort(() => Math.random() - 0.5);

      res.status(200).json(shuffledCategories);
    } catch (error) {
      console.error("Error fetching grocery categories:", error);
      res.status(500).json({
        status: false,
        message: "An error occurred while fetching the grocery categories.",
      });
    }
  },

  getSubcategoriesByCategoryId: async (req, res) => {
    try {
      const { categoryId } = req.params;

      // Find the category by ID
      const category = await GroceryCategory.findById(categoryId);
      if (!category) {
        return res.status(404).json({
          status: false,
          message: "Category not found.",
        });
      }

      // Fetch all subcategories for this category
      const subcategories = await SubCategory.find({
        categoryId: category._id,
      }).sort({ title: 1 });

      // Include category details along with subcategories
      const response = {
        category: {
          title: category.title,
          value: category.value,
          imageUrl: category.imageUrl,
        },
        subcategories,
      };

      res.status(200).json(response);
    } catch (error) {
      console.error("Error fetching subcategories:", error);
      res.status(500).json({
        status: false,
        message: "An error occurred while fetching the subcategories.",
      });
    }
  },

  getSubcategoryById: async (req, res) => {
    try {
      const { categoryId, subcategoryId } = req.params;

      // Find the category by ID
      const category = await GroceryCategory.findById(categoryId);
      if (!category) {
        return res.status(404).json({
          status: false,
          message: "Category not found.",
        });
      }

      // Find the subcategory by its ID within the subCategories collection
      const subcategory = await SubCategory.findOne({
        categoryId: category._id,
        _id: subcategoryId,
      });
      if (!subcategory) {
        return res.status(404).json({
          status: false,
          message: "Subcategory not found.",
        });
      }

      // Respond with the subcategory details
      res.status(200).json({
        status: true,
        message: "Subcategory found",
        data: subcategory,
      });
    } catch (error) {
      console.error("Error fetching subcategory:", error);
      res.status(500).json({
        status: false,
        message: "An error occurred while fetching the subcategory.",
      });
    }
  },

  patchGroceryCategoryImage: async (req, res) => {
    const id = req.params.id;
    const { imageUrl } = req.body;

    try {
      const updatedCategory = await GroceryCategory.findByIdAndUpdate(
        id,
        { imageUrl },
        { new: true }
      );

      if (!updatedCategory) {
        return res
          .status(404)
          .json({ status: false, message: "Grocery category not found." });
      }

      res.status(200).json({
        status: true,
        message: "Grocery category image successfully patched",
        data: updatedCategory,
      });
    } catch (error) {
      console.error("Error patching grocery category image:", error);
      res.status(500).json({
        status: false,
        message: "An error occurred while patching the grocery category image.",
      });
    }
  },

  getAllCategoriesWithRandomGroceries: async (req, res) => {
    try {
      const latitude = parseFloat(req.query.lat);
      const longitude = parseFloat(req.query.lng);
      const radius = 10000; // 10 km radius

      // const excludedTitles = ["Beers And Ciders", "Spirits", "Wine"];

      const excludedTitles = [
        "Frozen Foods and Butchery",
        "Fresh Fruits and Vegetables",
        "Ice Cream & Desserts",
      ];

      if (!latitude || !longitude) {
        return res
          .status(400)
          .json({ message: "Latitude and longitude are required" });
      }

      // Find the nearest grocery store within the radius
      const nearestStore = await GroceryStore.aggregate([
        {
          $geoNear: {
            near: { type: "Point", coordinates: [longitude, latitude] },
            distanceField: "distance",
            maxDistance: radius,
            spherical: true,
          },
        },
        {
          $match: {
            verification: "Verified",
          },
        },
        {
          $sort: { distance: 1 }, // Sort by closest store
        },
        {
          $limit: 1, // Get only the closest store
        },
      ]);

      if (nearestStore.length === 0) {
        return res
          .status(404)
          .json({ message: "No grocery store found within 10km" });
      }

      const store = nearestStore[0];
      const storeId = store._id;

      // Fetch all categories
      // const categories = await GroceryCategory.find(
      //   {},
      //   { title: 1, value: 1, imageUrl: 1 }
      // ).sort({ title: 1 });

      const categories = await GroceryCategory.find(
        { title: { $nin: excludedTitles } },
        { title: 1, value: 1, imageUrl: 1 }
      ).sort({ title: 1 });

      // Fetch 10 random grocery items for each category from the nearest store
      const categoriesWithGroceries = await Promise.all(
        categories.map(async (category) => {
          const groceries = await Grocery.aggregate([
            {
              $match: {
                category: category._id,
                groceryStore: storeId,
                isAvailable: true,
              },
            },
            { $sample: { size: 10 } },
            {
              $project: {
                _id: 1,
                category: 1,
                subCategory: 1,
                groceryStore: 1,
                price: 1,
                quantity: 1,
                isAvailable: 1,
                imageUrl: 1,
                location: 1,
                title: 1,
                createdAt: 1,
                updatedAt: 1,
                __v: 1,
              },
            },
          ]);

          return { ...category.toObject(), groceries };
        })
      );

      res.status(200).json({
        status: true,
        message:
          "All categories with random grocery items retrieved successfully",
        storeDetails: store, // Include store details in the response
        data: categoriesWithGroceries,
      });
    } catch (error) {
      console.error("Error fetching categories with groceries:", error.message);
      res.status(500).json({ status: false, message: error.message });
    }
  },

  getCategoryWithGroceries: async (req, res) => {
    const { id } = req.params; // Category ID

    try {
      // Find the category by ID
      const category = await GroceryCategory.findById(id);

      if (!category) {
        return res
          .status(404)
          .json({ status: false, message: "Category not found" });
      }

      // Fetch subcategories
      const subcategories = await SubCategory.find({
        categoryId: category._id,
      });

      // Fetch groceries grouped by subcategory, returning only the required fields
      const groceries = await Grocery.aggregate([
        { $match: { category: category._id } },
        {
          $project: {
            _id: 1,
            category: 1,
            subCategory: 1,
            groceryStore: 1,
            price: 1,
            quantity: 1,
            isAvailable: 1,
            imageUrl: 1,
            location: 1,
            title: 1,
            createdAt: 1,
            updatedAt: 1,
            __v: 1,
          },
        },
        {
          $group: {
            _id: "$subCategory",
            items: { $push: "$$ROOT" }, // Includes only the projected fields
          },
        },
      ]);

      // Format the response with subcategories and their corresponding groceries
      const formattedData = {
        _id: category._id,
        title: category.title,
        value: category.value,
        imageUrl: category.imageUrl,
        subCategories: subcategories.map((sub) => ({
          _id: sub._id,
          title: sub.title,
          value: sub.value,
          imageUrl: sub.imageUrl,
          groceries:
            groceries.find((g) => g._id?.toString() === sub._id?.toString())
              ?.items || [],
        })),
      };

      res.status(200).json({
        status: true,
        message: "Category retrieved successfully",
        data: formattedData,
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ status: false, message: "Server error", error });
    }
  },
};
