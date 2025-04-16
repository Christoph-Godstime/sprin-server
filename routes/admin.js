const router = require("express").Router();
const AdminContoller = require("../controllers/adminController");
const {
  verifyTokenAndAuthorization,
  verifyAdmin,
  verifyStore,
} = require("../middlewares/verifyToken");

router.post("/register", verifyStore, AdminContoller.createAdmin);

router.post("/login", AdminContoller.loginAdmin);

router.post(
  "/verify-restaurant",
  verifyStore,
  AdminContoller.updateRestaurantStatus
);

router.post("/verify-rider", verifyStore, AdminContoller.updateRiderStatus);

router.post("/ratePerKm", verifyStore, AdminContoller.createRatePerKm);

router.put("/ratePerKm", verifyStore, AdminContoller.updateRatePerKm);

router.post(
  "/riderPayout/approve/:payoutRequestId",
  verifyStore,
  AdminContoller.riderApprovePayout
);

router.post(
  "/groceryStorePayout/approve/:payoutRequestId",
  verifyStore,
  AdminContoller.groceryStoreApprovePayout
);

router.get(
  "/payouts/pending",
  verifyStore,
  AdminContoller.getPendingPayoutRequests
);

router.post(
  "/restaurantPayout/approve/:payoutRequestId",
  verifyStore,
  AdminContoller.restaurantApprovePayout
);

router.put(
  "/update-commission/:restaurantId",
  verifyStore,
  AdminContoller.updateRestaurantCommission
);

router.get("/orders/pending", verifyStore, AdminContoller.getPendingOrders);

router.get(
  "/pending-accounts",
  verifyStore,
  AdminContoller.getPendingRestaurantsAndRiders
);

module.exports = router;
