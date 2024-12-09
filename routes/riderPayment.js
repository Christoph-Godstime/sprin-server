const router = require("express").Router();
const riderPaymentController = require("../controllers/riderPaymentController");
const {
  verifyTokenAndAuthorization,
  verifyRider,
  verifyAdmin,
} = require("../middlewares/verifyToken");

router.post(
  "/payout/request",
  verifyTokenAndAuthorization,
  verifyRider,
  riderPaymentController.requestPayout
);

router.post(
  "/payout/approve/:payoutRequestId",
  verifyAdmin,
  riderPaymentController.approvePayout
);

router.get(
  "/history/:riderId",
  verifyTokenAndAuthorization,
  verifyRider,
  riderPaymentController.getPaymentHistory
);

router.get(
  "/details/:riderId",
  verifyTokenAndAuthorization,
  verifyRider,
  riderPaymentController.getPaymentDetails
);

module.exports = router;
