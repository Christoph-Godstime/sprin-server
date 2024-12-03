const router = require("express").Router();
const cartController = require("../controllers/cartController");
const {
  verifyTokenAndAuthorization,
  verifyAdmin,
} = require("../middlewares/verifyToken");

// UPADATE category
router.post("/", verifyTokenAndAuthorization, cartController.addProductToCart);

router.put(
  "/:restaurantId/:itemId",
  verifyTokenAndAuthorization,
  cartController.updateItemInCart
);

router.post(
  "/decrement",
  verifyTokenAndAuthorization,
  cartController.decrementProductQuantity
);

router.delete(
  "/delete/:restaurantId",
  verifyTokenAndAuthorization,
  cartController.removeProductFromCart
);

router.delete(
  "/:restaurantId/:itemId",
  verifyTokenAndAuthorization,
  cartController.removeSingleItemFromRestaurant
);

router.get("/", verifyTokenAndAuthorization, cartController.fetchUserCart);

router.get("/count", verifyTokenAndAuthorization, cartController.getCartCount);

router.get(
  "/:restaurantId",
  verifyTokenAndAuthorization,
  cartController.getCartItemsByRestaurant
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
