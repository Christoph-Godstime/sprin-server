const router = require("express").Router();
const paymentController = require("../controllers/groceryPaymentControllers");
const {
  verifyTokenAndAuthorization,
  verifyAdmin,
  verifyStore,
} = require("../middlewares/verifyToken");

router.get(
  "/:groceryStoreId",
  verifyTokenAndAuthorization,
  verifyStore,
  paymentController.getBankDetails
);

router.put(
  "/",
  verifyTokenAndAuthorization,
  verifyStore,
  paymentController.updateBankDetails
);

router.post(
  "/confirm",
  verifyTokenAndAuthorization,
  verifyStore,
  paymentController.confirmBankDetails
);

module.exports = router;
