const router = require("express").Router();
const paymentController = require("../controllers/paymentController");
const {
  verifyTokenAndAuthorization,
  verifyAdmin,
} = require("../middlewares/verifyToken");

router.get(
  "/:restaurantId",
  verifyTokenAndAuthorization,
  paymentController.getBankDetails
);

router.put(
  "/",
  verifyTokenAndAuthorization,
  paymentController.updateBankDetails
);

router.post(
  "/confirm",
  verifyTokenAndAuthorization,
  paymentController.confirmBankDetails
);

module.exports = router;
