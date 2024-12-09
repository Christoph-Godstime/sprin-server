const router = require("express").Router();
const categoryController = require("../controllers/categoryController");
const {
  verifyTokenAndAuthorization,
  verifyAdmin,
} = require("../middlewares/verifyToken");

// UPADATE category
router.put("/:id", verifyAdmin, categoryController.updateCategory);

router.post("/", verifyAdmin, categoryController.createCategory);

// DELETE category

router.delete("/:id", verifyAdmin, categoryController.deleteCategory);

router.post("/image/:id", verifyAdmin, categoryController.patchCategoryImage);

// GET category
router.get("/", categoryController.getAllCategories);

// GET category
router.get("/random", categoryController.getRandomCategories);

// Add Skills

module.exports = router;
