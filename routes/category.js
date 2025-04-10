const router = require("express").Router();
const categoryController = require("../controllers/categoryController");
const {
  verifyTokenAndAuthorization,
  verifyAdmin,
  verifyStore,
} = require("../middlewares/verifyToken");

// UPADATE category
router.put("/:id", verifyStore, categoryController.updateCategory);

router.post("/", verifyStore, categoryController.createCategory);

// DELETE category

router.delete("/:id", verifyStore, categoryController.deleteCategory);

router.post("/image/:id", verifyStore, categoryController.patchCategoryImage);

// GET category
router.get("/", categoryController.getAllCategories);

// GET category
router.get("/random", categoryController.getRandomCategories);

// Add Skills

module.exports = router;
