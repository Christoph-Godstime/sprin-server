const router = require("express").Router();
const groceryCategoryController = require("../controllers/groceryCategoryController");
const { verifyStore, verifyAdmin } = require("../middlewares/verifyToken");

// Grocery category routes
router.post("/", verifyStore, groceryCategoryController.createGroceryCategory); // Create a new grocery category
router.get("/", groceryCategoryController.getAllGroceryCategories); // Get all grocery categories
router.patch(
  "/:id",
  verifyStore,
  groceryCategoryController.updateGroceryCategory
); // Update a grocery category
router.delete(
  "/:id",
  verifyStore,
  groceryCategoryController.deleteGroceryCategory
); // Delete a grocery category
router.patch(
  "/:id/image",
  verifyStore,
  groceryCategoryController.patchGroceryCategoryImage
); // Patch grocery category image

// Subcategory routes
router.post(
  "/:id/subcategories",
  verifyStore,
  groceryCategoryController.addSubCategory
); // Add a subcategory
router.patch(
  "/:id/subcategories/:subCategoryId",
  verifyStore,
  groceryCategoryController.updateSubCategory
); // Update a subcategory
router.delete(
  "/:id/subcategories/:subCategoryId",
  verifyStore,
  groceryCategoryController.deleteSubCategory
); // Delete a subcategory

router.get(
  "/all-categories-with-groceries",
  groceryCategoryController.getAllCategoriesWithRandomGroceries
);

router.get(
  "/allSubCategoriesItems/:id",
  groceryCategoryController.getCategoryWithGroceries
);

module.exports = router;
