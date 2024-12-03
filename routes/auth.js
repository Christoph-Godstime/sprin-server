const router = require("express").Router();
const authController = require("../controllers/authContoller");
const {
  verifyTokenAndAuthorization,
  verifyAdmin,
} = require("../middlewares/verifyToken");

// REGISTRATION

router.post("/register", authController.createUser);

// LOGIN
router.post("/login", authController.loginUser);

router.post(
  "/change-password",
  verifyTokenAndAuthorization,
  authController.changePassword
);
router.post("/forgot-password", authController.forgotPassword);
router.post("/reset-password", authController.resetPassword);

module.exports = router;
