const GroceryStore = require("../models/GroceryStore");
const User = require("../models/User");
const sendPushNotification = require("../utils/sendPushNotification");
const { getAdminPushTokens } = require("../utils/adminPushTokens");
const mongoose = require("mongoose");

module.exports = {
  addGroceryStore: async (req, res) => {
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

    const existingStore = await GroceryStore.findOne({ owner: owner });
    if (existingStore) {
      return res.status(400).json({
        status: false,
        message: "Store with this user profile already exists",
        data: existingStore,
      });
    }

    const newStore = new GroceryStore({
      ...req.body,
      openingTime: new Date(req.body.openingTime),
      closingTime: new Date(req.body.closingTime),
      owner: owner,
    });

    try {
      const data = await newStore.save();
      await User.findByIdAndUpdate(
        owner,
        { userType: "Store" },
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
            "Admin Notification - New Grocery Store Signup",
            `A new grocery store signed up. Name: ${req.body.title} | Address: ${address}`
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

  getGroceryStoreByOwner: async (req, res) => {
    try {
      const groceryStore = await GroceryStore.findOne({ owner: req.user.id }); // populate the GroceryStore field if needed

      if (!groceryStore) {
        return res
          .status(404)
          .json({ status: false, message: "grocery store item not found" });
      }

      res.status(200).json(groceryStore);
    } catch (error) {
      res.status(500).json({ status: false, message: error.message });
    }
  },

  getNearbyGroceryStore: async (req, res) => {
    const latitude = parseFloat(req.query.lat);
    const longitude = parseFloat(req.query.lng);
    const radius = 10000; // 10 km radius

    if (!latitude || !longitude) {
      return res
        .status(400)
        .json({ message: "Latitude and longitude are required" });
    }

    try {
      const groceryStore = await GroceryStore.aggregate([
        {
          $geoNear: {
            near: { type: "Point", coordinates: [longitude, latitude] },
            distanceField: "distance",
            maxDistance: radius,
            spherical: true,
          },
        },
        {
          $sort: {
            distance: 1, // Closest stores come first
          },
        },
        {
          $limit: 1, // Return only one grocery store
        },
      ]);

      if (groceryStore.length === 0) {
        return res
          .status(404)
          .json({ message: "No grocery store found within 10 km radius." });
      }

      return res.status(200).json(groceryStore[0]); // Return the single grocery store
    } catch (error) {
      console.error("Failed to retrieve nearby grocery store:", error);
      return res.status(500).json({ message: "Server error", error });
    }
  },

  serviceAvailability: async (req, res) => {
    const groceryStoreId = req.params.id;

    try {
      // Find the store by its ID
      const groceryStore = await GroceryStore.findById(groceryStoreId);

      if (!groceryStore) {
        return res.status(404).json({ message: "Store not found" });
      }

      // Toggle the isAvailable field
      groceryStore.isAvailable = !groceryStore.isAvailable;

      // Save the changes
      await groceryStore.save();

      res.status(200).json({
        message: "Store availability toggled successfully",
        isAvailable: groceryStore.isAvailable,
      });
    } catch (error) {
      res.status(500).json(error);
    }
  },

  updateGroceryStoreById: async (req, res) => {
    const groceryStoreId = req.params.id;

    try {
      const updatedGroceryStore = await GroceryStore.findByIdAndUpdate(
        groceryStoreId,
        req.body,
        {
          new: true,
          runValidators: true,
        }
      );

      if (!updatedGroceryStore) {
        return res
          .status(404)
          .json({ status: false, message: "Store not found" });
      }

      res
        .status(200)
        .json({ status: true, message: "Store successfully updated" });
    } catch (error) {
      res.status(500).json(error);
    }
  },

  getGroceryStore: async (req, res) => {
    const id = req.params.id;
    console.log(id);

    try {
      const groceryStore = await GroceryStore.findById(id);

      if (!groceryStore) {
        return res
          .status(404)
          .json({ status: false, message: "Store not found" });
      }

      res.status(200).json(groceryStore);
    } catch (error) {
      res.status(500).json(error);
    }
  },
};
