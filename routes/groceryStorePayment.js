const router = require("express").Router();
const paymentController = require("../controllers/groceryPaymentControllers");
const {
  verifyTokenAndAuthorization,
  verifyAdmin,
  verifyStore,
} = require("../middlewares/verifyToken");

router.post(
  "/payout/request",
  verifyTokenAndAuthorization,
  verifyStore,
  paymentController.requestPayout
);

router.get(
  "/history/:groceryStoreId",
  verifyTokenAndAuthorization,
  verifyStore,
  paymentController.getPaymentHistory
);

router.get(
  "/details/:groceryStoreId",
  verifyTokenAndAuthorization,
  verifyStore,
  paymentController.getPaymentDetails
);

module.exports = router;
