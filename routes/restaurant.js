const router = require("express").Router();
const restaurantController = require("../controllers/restaurantController");
const { verifyTokenAndAuthorization } = require("../middlewares/verifyToken");

router.get("/byId/:id", restaurantController.getRestaurant);

// CREATE RESTAURANT
router.post(
  "/",
  verifyTokenAndAuthorization,
  restaurantController.addRestaurant
);
router.get("/nearby", restaurantController.getNearbyRestaurants);

router.get(
  "/owner/profile",
  verifyTokenAndAuthorization,
  restaurantController.getRestaurantByOwner
);

// Sevices availability
router.patch(
  "/:id",

  restaurantController.serviceAvailability
);

// GET RESTAURANT BY ID
router.get("/:code", restaurantController.getRandomRestaurants);

router.put("/update/:id", restaurantController.updateRestaurantById);

router.post("/vendor_application", restaurantController.addVendorInformation);

module.exports = router;
