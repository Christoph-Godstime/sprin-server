const router = require("express").Router();
const groceryStoreController = require("../controllers/groceryStoreController");
const { verifyTokenAndAuthorization } = require("../middlewares/verifyToken");

router.post(
  "/",
  verifyTokenAndAuthorization,
  groceryStoreController.addGroceryStore
);

router.get(
  "/owner/profile",
  verifyTokenAndAuthorization,
  groceryStoreController.getGroceryStoreByOwner
);

router.get("/byId/:id", groceryStoreController.getGroceryStore);

router.put(
  "/:id",
  verifyTokenAndAuthorization,
  groceryStoreController.updateGroceryStoreById
);

router.get("/nearby", groceryStoreController.getNearbyGroceryStore);

router.patch(
  "/:id",
  verifyTokenAndAuthorization,
  groceryStoreController.serviceAvailability
);

module.exports = router;
