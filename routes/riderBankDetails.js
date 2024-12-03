const router = require("express").Router();
const riderPaymentController = require("../controllers/riderPaymentController");
const {
  verifyTokenAndAuthorization,
  verifyRider,
} = require("../middlewares/verifyToken");

router.get(
  "/:riderId",
  verifyTokenAndAuthorization,
  verifyRider,
  riderPaymentController.getBankDetails
);

router.put(
  "/",
  verifyTokenAndAuthorization,
  verifyRider,
  riderPaymentController.updateBankDetails
);

router.post(
  "/confirm",
  verifyTokenAndAuthorization,
  verifyRider,
  riderPaymentController.confirmBankDetails
);

module.exports = router;
