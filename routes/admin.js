const router = require("express").Router();
const AdminController = require("../controllers/adminController");
const {
  verifyTokenAndAuthorization,
  verifyAdmin,
  verifyStore,
} = require("../middlewares/verifyToken");

router.post("/register", verifyStore, AdminController.createAdmin);

router.post("/login", AdminController.loginAdmin);

router.post(
  "/verify-restaurant",
  verifyStore,
  AdminController.updateRestaurantStatus
);

router.post("/verify-rider", verifyStore, AdminController.updateRiderStatus);

router.post("/ratePerKm", verifyStore, AdminController.createRatePerKm);

router.put("/ratePerKm", verifyStore, AdminController.updateRatePerKm);

router.post(
  "/riderPayout/approve/:payoutRequestId",
  verifyStore,
  AdminController.riderApprovePayout
);

router.post(
  "/groceryStorePayout/approve/:payoutRequestId",
  verifyStore,
  AdminController.groceryStoreApprovePayout
);

router.get(
  "/payouts/pending",
  verifyStore,
  AdminController.getPendingPayoutRequests
);

router.post(
  "/restaurantPayout/approve/:payoutRequestId",
  verifyStore,
  AdminController.restaurantApprovePayout
);

router.put(
  "/update-commission/:restaurantId",
  verifyStore,
  AdminController.updateRestaurantCommission
);

router.get("/orders/pending", verifyStore, AdminController.getPendingOrders);

router.get(
  "/pending-accounts",
  verifyStore,
  AdminController.getPendingRestaurantsAndRiders
);

router.put(
  "/orders/:orderId/mark-payment-completed",
  verifyStore,
  AdminController.markPaymentAsCompleted
);

router.get(
  "/orders/today-pending",
  verifyStore,
  AdminController.getTodaysPendingOrders
);

router.get(
  "/restaurant-owners",
  verifyStore,
  AdminController.getRestaurantWithOwnerDetails
);

router.post(
  "/wallet/credit",
  verifyStore,
  AdminController.addWalletCreditByEmail
);

router.get(
  "/wallet/credited-users",
  verifyStore,
  AdminController.getUsersWithCredit
);

router.post(
  "/user/change-referral-code",
  verifyStore,
  AdminController.changeReferralCode
);

router.get("/users/all", verifyStore, AdminController.getAllUsers);

module.exports = router;
