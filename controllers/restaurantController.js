const Restaurant = require("../models/Restaurant");
const User = require("../models/User");
const VendorApplication = require("../models/VendorApplication");
const sendPushNotification = require("../utils/sendPushNotification");
const { getAdminPushTokens } = require("../utils/adminPushTokens");
const mongoose = require("mongoose");

const adminPushTokens = [
  "ExponentPushToken[bqYCioJmXpKlXskTpN6PEI]",
  "ExponentPushToken[czk7m2Ec1nyF3Da3ieTxM1]",
];

module.exports = {
  addRestaurant: async (req, res) => {
    console.log(req.body);
    let owner;
    try {
      owner = new mongoose.Types.ObjectId(req.user.id);
    } catch (error) {
      return res.status(400).json({
        status: false,
        message: "Invalid user ID format",
      });
    }

    const existingRestaurant = await Restaurant.findOne({ owner: owner });
    if (existingRestaurant) {
      return res.status(400).json({
        status: false,
        message: "Restaurant with this user profile already exists",
        data: existingRestaurant,
      });
    }

    const newRestaurant = new Restaurant({
      ...req.body,
      openingTime: new Date(req.body.openingTime),
      closingTime: new Date(req.body.closingTime),
      owner: owner,
    });

    try {
      const data = await newRestaurant.save();
      await User.findByIdAndUpdate(
        owner,
        { userType: "Vendor" },
        { new: true, runValidators: true }
      );

      let adminPushTokens = [];
      try {
        adminPushTokens = (await getAdminPushTokens()) || [];
      } catch (error) {
        console.error("Error fetching admin push tokens:", error.message);
      }

      if (adminPushTokens.length > 0) {
        const address = req.body.coords?.address || "Address not provided";
        try {
          await sendPushNotification(
            adminPushTokens,
            "Admin Notification - New Restaurant Signup",
            `A new restaurant signed up. Name: ${req.body.title} | Address: ${address}`
          );
          console.log("Admin notification sent successfully.");
        } catch (notificationError) {
          console.error(
            "Error sending admin notification:",
            notificationError.message
          );
        }
      }

      res.status(201).json(data);
    } catch (error) {
      console.log(error.message);
      res.status(500).json(error.message);
    }
  },

  getNearbyRestaurants: async (req, res) => {
    const latitude = parseFloat(req.query.lat);
    const longitude = parseFloat(req.query.lng);
    const radius = 10000; // 10 km radius
    const limit = 30; // Number of restaurants to return

    if (!latitude || !longitude) {
      return res
        .status(400)
        .json({ message: "Latitude and longitude are required" });
    }

    try {
      const restaurants = await Restaurant.aggregate([
        {
          $geoNear: {
            near: { type: "Point", coordinates: [longitude, latitude] },
            distanceField: "distance",
            maxDistance: radius,
            spherical: true,
          },
        },
        {
          $sample: { size: limit }, // Randomly select documents
        },
      ]);

      return res.status(200).json(restaurants);
    } catch (error) {
      console.error("Failed to retrieve nearby restaurants:", error);
      return res.status(500).json({ message: "Server error", error });
    }
  },

  getRandomRestaurants: async (req, res) => {
    try {
      let randomRestaurants = [];

      // Check if code is provided in the params
      if (req.params.code) {
        randomRestaurants = await Restaurant.aggregate([
          { $match: { code: req.params.code } },
          { $sample: { size: 5 } },
          { $project: { __v: 0 } },
        ]);
      }

      // If no code provided in params or no restaurants match the provided code
      if (!randomRestaurants.length) {
        randomRestaurants = await Restaurant.aggregate([
          { $sample: { size: 5 } },
          { $project: { __v: 0 } },
        ]);
      }

      // Respond with the results
      if (randomRestaurants.length) {
        res.status(200).json(randomRestaurants);
      } else {
        res.status(404).json({ message: "No restaurants found" });
      }
    } catch (error) {
      console.log(error);
      res.status(500).json(error);
    }
  },

  serviceAvailability: async (req, res) => {
    const restaurantId = req.params.id;

    try {
      // Find the restaurant by its ID
      const restaurant = await Restaurant.findById(restaurantId);

      if (!restaurant) {
        return res.status(404).json({ message: "Restaurant not found" });
      }

      // Toggle the isAvailable field
      restaurant.isAvailable = !restaurant.isAvailable;

      // Save the changes
      await restaurant.save();

      res.status(200).json({
        message: "Restaurant availability toggled successfully",
        isAvailable: restaurant.isAvailable,
      });
    } catch (error) {
      res.status(500).json(error);
    }
  },

  updateRestaurantById: async (req, res) => {
    const restaurantId = req.params.id;

    try {
      const updatedRestaurant = await Restaurant.findByIdAndUpdate(
        restaurantId,
        req.body,
        {
          new: true,
          runValidators: true,
        }
      );

      if (!updatedRestaurant) {
        return res
          .status(404)
          .json({ status: false, message: "Restaurant not found" });
      }

      res
        .status(200)
        .json({ status: true, message: "Restaurant successfully updated" });
    } catch (error) {
      res.status(500).json(error);
    }
  },

  deleteRestaurant: async (req, res) => {
    const restaurantId = req.params.id;

    if (!restaurantId) {
      return res.status(400).json({
        status: false,
        message: "Restaurant ID is required for deletion.",
      });
    }

    try {
      await Restaurant.findByIdAndRemove(restaurantId);

      res
        .status(200)
        .json({ status: true, message: "Restaurant successfully deleted" });
    } catch (error) {
      console.error("Error deleting Restaurant:", error);
      res.status(500).json({
        status: false,
        message: "An error occurred while deleting the restaurant.",
      });
    }
  },
  getRestaurant: async (req, res) => {
    const id = req.params.id;
    console.log(id);

    try {
      const restaurant = await Restaurant.findById(id); // populate the restaurant field if needed

      if (!restaurant) {
        return res
          .status(404)
          .json({ status: false, message: "restaurant item not found" });
      }

      res.status(200).json(restaurant);
    } catch (error) {
      res.status(500).json(error);
    }
  },

  getRestaurantByOwner: async (req, res) => {
    try {
      const restaurant = await Restaurant.findOne({ owner: req.user.id }); // populate the restaurant field if needed

      if (!restaurant) {
        return res
          .status(404)
          .json({ status: false, message: "restaurant item not found" });
      }

      res.status(200).json(restaurant);
    } catch (error) {
      res.status(500).json({ status: false, message: error.message });
    }
  },

  addVendorInformation: async (req, res) => {
    try {
      const {
        restaurantName,
        firstName,
        lastName,
        email,
        phoneNumber,
        deviceType,
      } = req.body;

      // Validate required fields
      if (
        !restaurantName ||
        !firstName ||
        !lastName ||
        !email ||
        !phoneNumber ||
        !deviceType
      ) {
        return res.status(400).json({ message: "All fields are required." });
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({ message: "Invalid email format." });
      }

      const phoneRegex = /^[0-9]{10,15}$/; // Allows 10 to 15 digits
      if (!phoneRegex.test(phoneNumber)) {
        return res
          .status(400)
          .json({ message: "Invalid phone number format." });
      }

      // Validate device type
      const validDeviceTypes = ["iOS", "Android"];
      if (!validDeviceTypes.includes(deviceType)) {
        return res
          .status(400)
          .json({ message: "Device type must be 'iOS' or 'Android'." });
      }

      // Check if the email already exists in the Vendor collection
      const existingVendor = await VendorApplication.findOne({ email });
      if (existingVendor) {
        return res
          .status(409)
          .json({ message: "Vendor with this email already submitted." });
      }

      // Save vendor information to the Vendor collection
      const newVendor = new VendorApplication({
        restaurantName,
        firstName,
        lastName,
        email,
        phoneNumber,
        deviceType,
      });

      await newVendor.save();

      let adminPushTokens = [];
      try {
        adminPushTokens = (await getAdminPushTokens()) || [];
      } catch (error) {
        console.error("Error fetching admin push tokens:", error.message);
      }

      if (adminPushTokens.length > 0) {
        try {
          await sendPushNotification(
            adminPushTokens,
            "Admin Notification - Vendor Application On Website",
            `A new vendor application has been submitted by ${restaurantName}.`
          );
          console.log("Admin notification sent successfully.");
        } catch (notificationError) {
          console.error(
            "Error sending admin notification:",
            notificationError.message
          );
        }
      }

      return res.status(201).json({
        message: "Vendor application information submitted successfully.",
      });
    } catch (error) {
      res.status(500).json({ status: false, message: error.message });
    }
  },
};
