const router = require("express").Router();
const groceryController = require("../controllers/groceryController");
const { verifyStore } = require("../middlewares/verifyToken");

// Route to add a new grocery item
router.post("/", verifyStore, groceryController.addGroceryItem);

// Route to update a grocery item by its ID
router.put("/:id", verifyStore, groceryController.updateGroceryById);

// Route to toggle the availability of a grocery item by its ID
router.patch(
  "/:id/toggle-availability",
  verifyStore,
  groceryController.toggleGroceryAvailability
);

module.exports = router;
