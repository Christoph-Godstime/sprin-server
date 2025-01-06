const router = require("express").Router();
const riderController = require("../controllers/riderController");
const {
  verifyTokenAndAuthorization,
  verifyRider,
} = require("../middlewares/verifyToken");

router.post(
  "/",
  verifyTokenAndAuthorization,

  riderController.addRider
);

router.get(
  "/profile",
  verifyTokenAndAuthorization,
  verifyRider,
  riderController.getRiderByProfile
);

router.patch(
  "/:id",
  verifyTokenAndAuthorization,
  verifyRider,
  riderController.isTakingOrderToggle
);

router.put(
  "/update/:id",
  verifyTokenAndAuthorization,
  verifyRider,
  riderController.updateRiderProfileById
);

router.get(
  "/riderOrderHistory",
  verifyTokenAndAuthorization,
  verifyRider,
  riderController.riderOrderHistory
);

router.get(
  "/feedbacks",
  verifyTokenAndAuthorization,
  verifyRider,
  riderController.getRiderFeedback
);

router.put(
  "/:id/coordinates",
  verifyTokenAndAuthorization,
  verifyRider,
  riderController.updateRiderCoordinate
);

router.post("/rider_application", riderController.addRiderInformation);

module.exports = router;
