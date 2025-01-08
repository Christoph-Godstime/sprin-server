const cron = require("node-cron");
const orderController = require("../controllers/orderController");
const Restaurant = require("../models/Restaurant");
const Rider = require("../models/Rider");
const Order = require("../models/Orders");

// Function to format time as HH:MM
const formatTime = (date) => {
  const hours = date.getUTCHours().toString().padStart(2, "0");
  const minutes = date.getUTCMinutes().toString().padStart(2, "0");
  return `${hours}:${minutes}`;
};

const reassignUnacceptedOrders = (io, userSocketMap) => async () => {
  try {
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);

    // Find orders that are in "Rider Assigned" status and were assigned more than 10 minutes ago
    const ordersToReassign = await Order.find({
      orderStatus: { $in: ["Ready", "Rider Assigned"] },
      riderAssignedTime: { $lte: tenMinutesAgo },
    });

    // console.log("unaccepted orders: ", ordersToReassign);

    for (const order of ordersToReassign) {
      // console.log(
      //   `Rider did not accept order ${order._id} within 3 minutes. Reassigning...`
      // );
      const req = {
        io,
        userSocketMap,
      };

      await orderController.reassignOrder(order._id, order.assignedRider, req);
    }

    // console.log("Order reassignment cron job executed successfully");
  } catch (error) {
    console.error("Error in order reassignment cron job:", error);
  }
};

// Function to update restaurant availability
const updateRestaurantAvailability = async () => {
  try {
    const restaurants = await Restaurant.find();

    const currentTime = new Date();
    const currentFormattedTime = formatTime(currentTime);

    for (const restaurant of restaurants) {
      if (
        !restaurant.openingTime ||
        !restaurant.closingTime ||
        !restaurant.restaurantDoc ||
        !restaurant.location.coordinates
      ) {
        // console.warn(
        //   `Skipping restaurant with missing required fields: ${restaurant._id}`
        // );
        continue;
      }

      const openingTime = new Date(restaurant.openingTime);
      const closingTime = new Date(restaurant.closingTime);

      const formattedOpeningTime = formatTime(openingTime);
      const formattedClosingTime = formatTime(closingTime);

      if (
        currentFormattedTime >= formattedOpeningTime &&
        currentFormattedTime <= formattedClosingTime
      ) {
        restaurant.isActive = true;
      } else {
        restaurant.isActive = false;
      }

      await restaurant.save();
    }

    // console.log("Restaurant availability updated successfully");
  } catch (error) {
    console.error("Error updating restaurant availability", error);
  }
};

const updateRiderAvailability = async () => {
  try {
    const riders = await Rider.find();

    const currentTime = new Date();
    const currentFormattedTime = formatTime(currentTime);

    for (const rider of riders) {
      const startingTime = new Date(rider.startingTime);
      const closingTime = new Date(rider.closingTime);

      const formattedStartingTime = formatTime(startingTime);
      const formattedClosingTime = formatTime(closingTime);

      if (
        currentFormattedTime >= formattedStartingTime &&
        currentFormattedTime <= formattedClosingTime
      ) {
        rider.isActive = true;
      } else {
        rider.isActive = false;
      }

      await rider.save();
    }
  } catch (error) {
    console.error("Error updating rider availability", error);
  }
};

module.exports = {
  reassignUnacceptedOrders,
  updateRestaurantAvailability,
  updateRiderAvailability,
};
