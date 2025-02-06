const router = require("express").Router();
const groceryController = require("../controllers/groceryController");
const { verifyStore } = require("../middlewares/verifyToken");

// Route to add a new grocery item
router.post("/", verifyStore, groceryController.addGroceryItem);

router.get(
  "/subcategories-groceries/:categoryId",
  verifyStore,
  groceryController.getSubCategoriesAndGroceries
);

router.put("/update/:id", verifyStore, groceryController.updateGroceryItem);

module.exports = router;
