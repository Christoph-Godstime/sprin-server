const router = require("express").Router();
const ordersController = require("../controllers/orderController");
const {
  verifyTokenAndAuthorization,
  verifyAdmin,
  verifyRider,
  verifyVendor,
} = require("../middlewares/verifyToken");

router.post(
  "/calculate",
  verifyTokenAndAuthorization,
  ordersController.calculateOrderDetails
);

router.post(
  "/verify-payment",
  verifyTokenAndAuthorization,
  ordersController.verifyPayment
);

router.post(
  "/wallet-payment",
  verifyTokenAndAuthorization,
  ordersController.verifyWalletPayment
);

router.post("/apply-coupon", ordersController.applyCoupon);

router.post(
  "/update-wallet",
  verifyTokenAndAuthorization,
  ordersController.updateWallet
);

router.get(
  "/wallet-balance",
  verifyTokenAndAuthorization,
  ordersController.walletBalance
);

router.get(
  "/userOrders",
  verifyTokenAndAuthorization,
  ordersController.getUserOrders
);
router.get("/orderslist/:id", ordersController.getRestaurantOrdersList);

router.get(
  "/riderorderslist",
  verifyTokenAndAuthorization,
  verifyRider,
  ordersController.getRiderOrdersList
);

router.post("/", ordersController.placeOrder);
router.get("/:id", ordersController.getOrderDetails);
router.delete("/:id", ordersController.deleteOrder);
router.post("/rate/:id", ordersController.rateOrder);
router.put(
  "/process/:id/:status",
  verifyTokenAndAuthorization,
  ordersController.updateOrderStatus
);

router.post("/assign-rider/:orderId", ordersController.assignOrderToRider);

router.post("/payment-status/:id", ordersController.updatePaymentStatus);

router.post(
  "/rate-food",
  verifyTokenAndAuthorization,
  ordersController.addOrUpdateRating
);

router.get(
  "/order-details/:orderId",
  verifyTokenAndAuthorization,
  ordersController.getOrderDetailsByOrderId
);

router.post(
  "/order-count",
  verifyTokenAndAuthorization,
  ordersController.checkUserOrderCount
);

module.exports = router;
