const router = require("express").Router();
const userController = require("../controllers/userController");
const {
  verifyTokenAndAuthorization,
  verifyAdmin,
} = require("../middlewares/verifyToken");

// UPADATE USER
router.put("/", verifyTokenAndAuthorization, userController.updateUser);

// DELETE USER
router.post(
  "/verify/:otp",

  userController.verifyAccount
);

router.post("/delete-request", userController.requestDeleteUser);

router.post("/resend-otp", userController.resendOtp);

router.post("/verify-phone", userController.verifyPhoneNumber);

router.post("/resend-phone-otp", userController.resendPhoneOtp);

router.delete("/", verifyTokenAndAuthorization, userController.deleteUser);

// GET USER

router.get("/", verifyTokenAndAuthorization, userController.getUser);

// Add Skills

router.get(
  "/push_token",
  verifyTokenAndAuthorization,
  userController.getPushToken
);

router.post(
  "/save_pushtoken",
  verifyTokenAndAuthorization,
  userController.savePushToken
);

router.post("/contact_us", userController.contactUs);

router.get("/ratePerKm", userController.getRatePerKm);

router.get("/calculate-distance", userController.googleMapDistanceMatrix);

module.exports = router;
