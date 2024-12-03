const Food = require("../models/Food");
const Order = require("../models/Orders");

module.exports = {
  addFood: async (req, res) => {
    const newFood = new Food(req.body);
    try {
      await newFood.save();
      res
        .status(201)
        .json({ status: true, message: "Food item successfully created" });
    } catch (error) {
      console.log(error.message);

      res.status(500).json(error);
    }
  },

  foodRating: async (req, res) => {
    const { orderId, foodId, rating, feedback } = req.body;
    try {
      const order = await Order.findById(orderId);
      if (!order) return res.status(404).send("Order not found");
      if (order.orderStatus !== "Delivered")
        return res.status(400).send("Order not completed");

      const orderItem = order.orderItems.find(
        (item) => item.foodId.toString() === foodId
      );
      if (!orderItem)
        return res.status(404).send("Food item not found in order");

      if (orderItem.rating)
        return res.status(400).send("Food item already rated");

      // Update the order item with the rating and feedback
      orderItem.rating = rating;
      orderItem.feedback = feedback;
      await order.save();

      // Update the food rating
      const food = await Food.findById(foodId);
      food.totalRating += rating;
      food.ratingCount += 1;
      food.rating = food.totalRating / food.ratingCount;
      await food.save();

      res.status(200).send("Rating submitted successfully");
    } catch (error) {
      res.status(500).send("Server error");
    }
  },

  getFoodById: async (req, res) => {
    const foodId = req.params.id;

    try {
      const food = await Food.findById(foodId); // populate the restaurant field if needed

      if (!food) {
        return res
          .status(404)
          .json({ status: false, message: "Food item not found" });
      }

      res.status(200).json(food);
    } catch (error) {
      res.status(500).json(error);
    }
  },

  getFoodNearby: async (req, res) => {
    const latitude = parseFloat(req.query.lat);
    const longitude = parseFloat(req.query.lng);
    const radius = 10000; // Radius in meters
    const limit = 30;
    const twoWeeksAgo = new Date();
    twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);

    if (!latitude || !longitude) {
      return res.status(400).json({
        status: false,
        message: "Latitude and longitude are required",
      });
    }

    try {
      // First, try to find food items from the last 2 weeks
      let food = await Food.aggregate([
        {
          $geoNear: {
            near: { type: "Point", coordinates: [longitude, latitude] },
            distanceField: "distance",
            maxDistance: radius,
            spherical: true,
          },
        },
        {
          $match: {
            createdAt: { $gte: twoWeeksAgo },
          },
        },
        {
          $sample: { size: limit },
        },
      ]);

      // If no recent food items found, get other nearby food items
      if (food.length === 0) {
        food = await Food.aggregate([
          {
            $geoNear: {
              near: { type: "Point", coordinates: [longitude, latitude] },
              distanceField: "distance",
              maxDistance: radius,
              spherical: true,
            },
          },
          {
            $sample: { size: limit },
          },
        ]);
      }

      return res.status(200).json(food);
    } catch (error) {
      console.error("Failed to retrieve food items:", error);
      return res.status(500).json({ message: "Server error", error });
    }
  },

  getFoodNearbyWithDynamicRadius: async (req, res) => {
    const latitude = parseFloat(req.query.lat);
    const longitude = parseFloat(req.query.lng);
    const limit = 30;

    if (!latitude || !longitude) {
      return res.status(400).json({
        status: false,
        message: "Latitude and longitude are required",
      });
    }

    const searchRadius = async (radius) => {
      return await Food.aggregate([
        {
          $geoNear: {
            near: { type: "Point", coordinates: [longitude, latitude] },
            distanceField: "distance",
            maxDistance: radius,
            spherical: true,
          },
        },
        {
          $sample: { size: limit },
        },
      ]);
    };

    try {
      let food = await searchRadius(1000); // First attempt with 1000m

      if (food.length === 0) {
        food = await searchRadius(2000); // Second attempt with 2000m
      }

      if (food.length === 0) {
        food = await searchRadius(10000); // Final attempt with 10000m
      }

      return res.status(200).json(food);
    } catch (error) {
      console.error("Failed to retrieve food items:", error);
      return res.status(500).json({ message: "Server error", error });
    }
  },

  getRestaurantAllFoods: async (req, res) => {
    const restaurantId = req.params.restaurantId;

    try {
      const foods = await Food.find({ restaurant: restaurantId });

      if (!foods || foods.length === 0) {
        return res.status(404).json({
          status: false,
          message: "No food items found for this restaurant",
        });
      }

      res.status(200).json(foods);
    } catch (error) {
      res.status(500).json(error);
    }
  },

  getFoodListByRestaurant: async (req, res) => {
    const restaurantId = req.params.restaurantId;

    try {
      const foods = await Food.find({ restaurant: restaurantId });

      if (!foods || foods.length === 0) {
        return res.status(404).json({
          status: false,
          message: "No food items found for this restaurant",
        });
      }

      res.status(200).json(foods);
    } catch (error) {
      res.status(500).json(error);
    }
  },

  deleteFoodById: async (req, res) => {
    const foodId = req.params.id;

    try {
      const food = await Food.findByIdAndDelete(foodId);

      if (!food) {
        return res
          .status(404)
          .json({ status: false, message: "Food item not found" });
      }

      res
        .status(200)
        .json({ status: true, message: "Food item successfully deleted" });
    } catch (error) {
      res.status(500).json(error);
    }
  },

  foodAvailability: async (req, res) => {
    const foodId = req.params.id;

    try {
      // Find the restaurant by its ID
      const food = await Food.findById(foodId);

      if (!food) {
        return res.status(404).json({ message: "Food not found" });
      }

      // Toggle the isAvailable field
      food.isAvailable = !food.isAvailable;

      // Save the changes
      await food.save();

      res
        .status(200)
        .json({ message: "Food availability toggled successfully" });
    } catch (error) {
      res.status(500).json(error);
    }
  },

  updateFoodById: async (req, res) => {
    const foodId = req.params.id;

    try {
      const updatedFood = await Food.findByIdAndUpdate(foodId, req.body, {
        new: true,
        runValidators: true,
      });

      if (!updatedFood) {
        return res
          .status(404)
          .json({ status: false, message: "Food item not found" });
      }

      res
        .status(200)
        .json({ status: true, message: "Food item successfully updated" });
    } catch (error) {
      res.status(500).json(error);
    }
  },

  addFoodTag: async (req, res) => {
    const foodId = req.params.id;
    const { tag } = req.body; // Assuming the tag to be added is sent in the request body

    if (!tag) {
      return res
        .status(400)
        .json({ status: false, message: "Tag is required" });
    }

    try {
      const food = await Food.findById(foodId);

      if (!food) {
        return res
          .status(404)
          .json({ status: false, message: "Food item not found" });
      }

      // Check if tag already exists
      if (food.foodTags.includes(tag)) {
        return res
          .status(400)
          .json({ status: false, message: "Tag already exists" });
      }

      food.foodTags.push(tag);
      await food.save();

      res
        .status(200)
        .json({ status: true, message: "Tag successfully added", data: food });
    } catch (error) {
      res.status(500).json(error);
    }
  },

  getRandomFoodsByCode: async (req, res) => {
    try {
      // If code is provided in the params, try to fetch matching food items

      const randomFoodItems = await Food.aggregate([
        { $match: { code: req.params.code } },
        { $sample: { size: 5 } },
        { $project: { _id: 0 } },
      ]);

      res.status(200).json(randomFoodItems);
    } catch (error) {
      res.status(500).json(error);
    }
  },

  addFoodType: async (req, res) => {
    const foodId = req.params.id;
    const { foodType } = req.body.foodType; // Assuming the tag to be added is sent in the request body

    try {
      const food = await Food.findById(foodId);

      if (!food) {
        return res
          .status(404)
          .json({ status: false, message: "Food item not found" });
      }

      // Check if tag already exists
      if (food.foodType.includes(foodType)) {
        return res
          .status(400)
          .json({ status: false, message: "Type already exists" });
      }

      food.foodType.push(foodType);
      await food.save();

      res
        .status(200)
        .json({ status: true, message: "Type successfully added" });
    } catch (error) {
      res.status(500).json(error);
    }
  },

  getRandomFoodsByCategoryAndCode: async (req, res) => {
    const { category, code } = req.params;

    try {
      // Attempt to find random foods that match both category and code
      let foods = await Food.aggregate([
        { $match: { category: category, code: code } },
        { $sample: { size: 20 } },
      ]);

      // If no foods are found, try to find random foods that match only the code
      if (!foods || foods.length === 0) {
        foods = await Food.aggregate([
          { $match: { code: code } },
          { $sample: { size: 20 } },
        ]);
      }

      // If still no foods are found, get any random foods
      if (!foods || foods.length === 0) {
        foods = await Food.aggregate([{ $sample: { size: 20 } }]);
      }

      res.status(200).json(foods);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  getRandomFoodsByCategory: async (req, res) => {
    const category = req.params.category;

    try {
      const foods = await Food.aggregate([
        { $match: { category: category } },
        { $sample: { size: 20 } }, // Adjust the size as needed
      ]);

      res.status(200).json(foods);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  searchFoods: async (req, res) => {
    const search = req.params.food; // The partial search term
    try {
      const results = await Food.aggregate([
        {
          $search: {
            index: "foods",
            text: {
              query: search,
              path: ["title", "restaurantName", "description"], // Fields to search
              fuzzy: {
                maxEdits: 1, // Allows for typo tolerance
              },
            },
          },
        },
        {
          $limit: 1000, // Optionally limit the number of results before shuffling
        },
        {
          $addFields: { random: { $rand: {} } }, // Add a field with a random number
        },
        {
          $sort: { random: 1 }, // Sort by the random number to shuffle
        },
        {
          $limit: 50, // Limit to 30 documents
        },
        {
          $project: { random: 0 }, // Remove the random field from the output
        },
      ]);
      res.status(200).json(results);
    } catch (error) {
      res.status(500).json({ error: error.message, status: false });
    }
  },
};
