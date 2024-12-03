const router = require("express").Router();
const foodController = require("../controllers/foodController");

// UPADATE category
router.post("/", foodController.addFood);

router.get(
  "/restaurant-foods/:restaurantId",
  foodController.getFoodListByRestaurant
);

router.get(
  "/all-restaurant-foods/:restaurantId",
  foodController.getRestaurantAllFoods
);

router.get("/nearby", foodController.getFoodNearby);

router.get("/fastest-food", foodController.getFoodNearbyWithDynamicRadius);

router.post("/tags/:id", foodController.addFoodTag);

router.post("/type/:id", foodController.addFoodType);

router.put("/update/:id", foodController.updateFoodById);

router.get("/:id", foodController.getFoodById);
router.get("/search/:food", foodController.searchFoods);

router.get("/category/:category", foodController.getRandomFoodsByCategory);

router.get("/:category/:code", foodController.getRandomFoodsByCategoryAndCode);

router.delete("/:id", foodController.deleteFoodById);

router.patch("/:id", foodController.foodAvailability);

router.get("/recommendation/:code", foodController.getRandomFoodsByCode);

module.exports = router;
