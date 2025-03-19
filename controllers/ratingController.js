const Rating = require("../models/Rating");
const Restaurant = require("../models/Restaurant");
const Order = require("../models/Orders");
const Rider = require("../models/Rider");
const Feedback = require("../models/Feedback");
const Food = require("../models/Food");

module.exports = {
  addOrUpdateRating: async (req, res) => {
    const { userId, restaurantId, rating } = req.body;

    try {
      // Check if user has ordered from the restaurant
      const orderExists = await Order.findOne({
        userId: userId,
        storeId: restaurantId,
      });
      if (!orderExists) {
        return res.status(400).json({
          status: false,
          message: "You must have ordered from this restaurant to rate it.",
        });
      }

      // Check if user has already rated this restaurant
      const existingRating = await Rating.findOne({
        userId: userId,
        restaurantId: restaurantId,
      });
      if (existingRating) {
        return res.status(400).json({
          status: false,
          message: "You can only rate a restaurant once.",
        });
      }

      // Add the new rating
      const newRating = new Rating({ userId, restaurantId, rating });
      await newRating.save();

      // Update the restaurant's average rating and rating count
      const [restaurants] = await Rating.aggregate([
        { $match: { restaurantId: restaurantId } },
        {
          $group: {
            _id: "$restaurantId",
            averageRating: { $avg: "$rating" },
            count: { $sum: 1 },
          },
        },
      ]);

      if (restaurants) {
        const { averageRating, count } = restaurants;
        await Restaurant.findByIdAndUpdate(
          restaurantId,
          {
            rating: averageRating,
            ratingCount: count,
          },
          { new: true }
        );
      }

      return res
        .status(200)
        .json({ status: true, message: "Store rated successfully" });
    } catch (error) {
      res.status(500).json(error);
    }
  },

  checkIfUserRatedRestaurant: async (req, res) => {
    const restaurantId = req.query.restaurantId;
    const userId = req.user.id;

    try {
      const ratingExists = await Rating.findOne({
        userId: userId,
        restaurantId: restaurantId,
      });

      if (ratingExists) {
        return res.status(200).json({
          status: true,
          message: "You have already rated this restaurant.",
          rating: ratingExists.rating,
        });
      } else {
        return res.status(200).json({
          status: false,
          message: "You have not rated this restaurant yet.",
        });
      }
    } catch (error) {
      return res.status(500).json({ status: false, message: error.message });
    }
  },

  addRiderRating: async (req, res) => {
    const userId = req.user.id;
    const { riderId, orderId, rating, feedbackText } = req.body;

    try {
      // Check if the order exists with the provided user and orderId
      const order = await Order.findOne({ _id: orderId, userId: userId });

      if (!order) {
        return res.status(400).json({
          status: false,
          message: "Order not found or does not belong to this user.",
        });
      }

      // Find the specific order item
      //   const orderItem = order.orderItems.id(orderItemId);

      //   if (!orderItem) {
      //     return res.status(400).json({
      //       status: false,
      //       message: "Order item not found.",
      //     });
      //   }

      // Check if the order status is "Delivered" and if the rider has not been rated yet
      if (order.orderStatus !== "Delivered" || order.riderRated) {
        return res.status(400).json({
          status: false,
          message: "Order must be delivered and the rider not yet rated.",
        });
      }

      // Validate that feedback is only provided if a rating is given
      if (feedbackText && !rating) {
        return res.status(400).json({
          status: false,
          message: "Feedback must be accompanied by a rating.",
        });
      }

      let feedbackId = null;
      // Create and save feedback if both rating and feedback are provided
      if (rating) {
        if (feedbackText) {
          const feedback = new Feedback({
            userId,
            rating,
            feedback: feedbackText,
          });
          const savedFeedback = await feedback.save();
          feedbackId = savedFeedback._id;
        }

        // Update the specific order item
        order.riderRating = rating;
        order.riderFeedback = feedbackText || "";
        order.riderRated = true;
        order.riderFeedbackId = feedbackId || null;

        await order.save();

        // Find the rider to update its rating
        const rider = await Rider.findById(riderId);

        if (!rider) {
          return res.status(404).json({
            status: false,
            message: "Rider not found.",
          });
        }

        // Calculate the new rating for the rider
        const newRatingCount = rider.ratingCount + 1;
        const newTotalRating = rider.totalRating + rating;
        const newAverageRating = newTotalRating / newRatingCount;

        // Update the rider document with the new rating and feedback
        await Rider.findByIdAndUpdate(
          riderId,
          {
            rating: newAverageRating,
            ratingCount: newRatingCount,
            totalRating: newTotalRating,
            $push: { feedbacks: feedbackId || [] },
          },
          { new: true }
        );

        // Respond based on whether feedback was provided or not
        if (feedbackText) {
          return res.status(200).json({
            status: true,
            message: "Rider rated and feedback updated successfully",
          });
        } else {
          return res.status(200).json({
            status: true,
            message: "Rider rated successfully",
          });
        }
      } else {
        return res.status(400).json({
          status: false,
          message: "Rating is required.",
        });
      }
    } catch (error) {
      console.error("Error updating rating and feedback:", error.message);
      res.status(500).json({
        status: false,
        message: "An error occurred while updating the rating and feedback.",
        error: error.message,
      });
    }
  },

  getFoodFeedback: async (req, res) => {
    const foodId = req.params.foodId;
    try {
      const food = await Food.findById(foodId)
        .populate({
          path: "feedbacks",
          model: "Feedback",
          select: "rating feedback createdAt",
          populate: {
            path: "userId",
            model: "User",
            select: "firstName email",
          },
        })
        .exec();

      if (!food) {
        return res.status(404).json({
          status: false,
          message: "Food not found",
        });
      }

      res.status(200).json({
        status: true,
        message: "Food feedbacks retrieved successfully",
        feedbacks: food.feedbacks,
        rating: food.rating,
        ratingCount: food.ratingCount,
        totalRating: food.totalRating,
      });
    } catch (error) {
      res.status(500).json({
        status: false,
        message: "Error fetching feedbacks",
        error: error.message,
      });
    }
  },
};
