const router = require("express").Router();
const cartController = require("../controllers/cartController");
const {
  verifyTokenAndAuthorization,
  verifyAdmin,
} = require("../middlewares/verifyToken");

// UPADATE category
router.post("/", verifyTokenAndAuthorization, cartController.addProductToCart);

router.put(
  "/:storeId/:itemId",
  verifyTokenAndAuthorization,
  cartController.updateItemInCart
);

router.post(
  "/decrement",
  verifyTokenAndAuthorization,
  cartController.decrementProductQuantity
);

router.get(
  "/nearest-grocery-cart",
  verifyTokenAndAuthorization,
  cartController.getNearestGroceryStoreCart
);

router.delete(
  "/delete/:storeId/:itemType",
  verifyTokenAndAuthorization,
  cartController.removeProductFromCart
);

router.delete(
  "/:storeId/:itemId/:itemType",
  verifyTokenAndAuthorization,
  cartController.removeSingleItemFromStore
);

router.get("/", verifyTokenAndAuthorization, cartController.fetchUserCart);

router.get("/count", verifyTokenAndAuthorization, cartController.getCartCount);

router.get(
  "/:storeId",
  verifyTokenAndAuthorization,
  cartController.getCartItemsByStore
);

// router.get(
//   "/number",
//   verifyTokenAndAuthorization,
//   cartController.getCartNumber
// );

router.delete(
  "/clear",
  verifyTokenAndAuthorization,
  cartController.clearUserCart
);

// Add Skills

module.exports = router;
