const router = require("express").Router();
const paymentController = require("../controllers/paymentController");
const {
  verifyTokenAndAuthorization,
  verifyAdmin,
} = require("../middlewares/verifyToken");

router.post(
  "/payout/request",
  verifyTokenAndAuthorization,
  paymentController.requestPayout
);

router.post(
  "/payout/approve/:payoutRequestId",
  verifyAdmin,
  paymentController.approvePayout
);

router.get(
  "/history/:restaurantId",
  verifyTokenAndAuthorization,
  paymentController.getPaymentHistory
);

router.get(
  "/details/:restaurantId",
  verifyTokenAndAuthorization,
  paymentController.getPaymentDetails
);

module.exports = router;
