const router = require("express").Router();
const ratingController = require("../controllers/ratingController");
const { verifyTokenAndAuthorization } = require("../middlewares/verifyToken");

// rating restaurant
router.post("/", ratingController.addOrUpdateRating);

router.get(
  "/",
  verifyTokenAndAuthorization,
  ratingController.checkIfUserRatedRestaurant
);

// rating rider
router.post(
  "/rate-rider",
  verifyTokenAndAuthorization,
  ratingController.addRiderRating
);

router.get("/feedbacks/:foodId", ratingController.getFoodFeedback);

module.exports = router;
