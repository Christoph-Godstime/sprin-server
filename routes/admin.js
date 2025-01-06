const router = require("express").Router();
const AdminContoller = require("../controllers/adminController");
const {
  verifyTokenAndAuthorization,
  verifyAdmin,
} = require("../middlewares/verifyToken");

router.post("/register", verifyAdmin, AdminContoller.createAdmin);

router.post("/login", AdminContoller.loginAdmin);

router.post(
  "/verify-restaurant",
  verifyAdmin,
  AdminContoller.updateRestaurantStatus
);

router.post("/verify-rider", verifyAdmin, AdminContoller.updateRiderStatus);

router.post("/ratePerKm", verifyAdmin, AdminContoller.createRatePerKm);

router.put("/ratePerKm", verifyAdmin, AdminContoller.updateRatePerKm);

module.exports = router;
