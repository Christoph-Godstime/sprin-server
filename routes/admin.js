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

module.exports = router;
