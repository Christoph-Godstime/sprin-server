const Rider = require("../models/Rider");
const User = require("../models/User");
const Order = require("../models/Orders");
const Restaurant = require("../models/Restaurant");
const RiderApplication = require("../models/RiderApplication");
const sendPushNotification = require("../utils/sendPushNotification");
const { getAdminPushTokens } = require("../utils/adminPushTokens");

module.exports = {
  addRider: async (req, res) => {
    const riderProfile = mongoose.Types.ObjectId(req.user.id);

    const existingRider = await Rider.findOne({ riderProfile: riderProfile });
    if (existingRider) {
      return res.status(400).json({
        status: false,
        message: "Rider with this code already exists",
        data: existingRider,
      });
    }

    const newRider = new Rider({
      ...req.body,
      startingTime: new Date(req.body.startingTime),
      closingTime: new Date(req.body.closingTime),
      riderProfile: riderProfile,
    });

    try {
      const data = await newRider.save();
      await User.findByIdAndUpdate(
        riderProfile,
        {
          userType: "Rider",
        },
        {
          new: true,
          runValidators: true,
        }
      );
      res.status(201).json(data);
    } catch (error) {
      res.status(500).json(error.message);
    }
  },

  getRiderByProfile: async (req, res) => {
    try {
      const rider = await Rider.findOne({ riderProfile: req.user.id });

      if (!rider) {
        return res
          .status(404)
          .json({ status: false, message: "Rider not found" });
      }

      res.status(200).json(rider);
    } catch (error) {
      res.status(500).json({ status: false, message: error.message });
    }
  },

  isTakingOrderToggle: async (req, res) => {
    const riderId = req.params.id;
    try {
      const rider = await Rider.findById(riderId);

      if (!rider) {
        return res.status(404).json({ message: "Rider not found" });
      }

      rider.isTakingOrders = !rider.isTakingOrders;

      await rider.save();

      res.status(200).json({
        message: "Rider availability toggled successfully",
        isTakingOrders: rider.isTakingOrders,
      });
    } catch (error) {
      res.status(500).json(error);
    }
  },

  updateRiderProfileById: async (req, res) => {
    const riderId = req.params.id;

    try {
      const updatedRiderProfile = await Rider.findByIdAndUpdate(
        riderId,
        req.body,
        {
          new: true,
          runValidators: true,
        }
      );

      if (!updatedRiderProfile) {
        return res
          .status(404)
          .json({ status: false, message: "Rider not found" });
      }

      res
        .status(200)
        .json({ status: true, message: "Rider profile successfully updated" });
    } catch (error) {
      res.status(500).json(error);
    }
  },

  deleteRider: async (req, res) => {
    const riderId = req.params.id;

    if (!riderId) {
      return res.status(400).json({
        status: false,
        message: "Rider ID is required for deletion.",
      });
    }

    try {
      await Rider.findByIdAndRemove(id);

      res
        .status(200)
        .json({ status: true, message: "Rider successfully deleted" });
    } catch (error) {
      console.error("Error deleting Rider:", error);
      res.status(500).json({
        status: false,
        message: "An error occurred while deleting the rider.",
      });
    }
  },

  riderOrderHistory: async (req, res) => {
    const riderProfile = req.user.id;
    try {
      const rider = await Rider.findOne({ riderProfile: riderProfile });

      if (!rider) {
        return res.status(404).json({
          status: false,
          message: "Rider profile not found",
        });
      }

      const orders = await Order.find({
        orderStatus: "Delivered",
        assignedRider: rider._id,
        paymentStatus: "Completed",
      })
        .populate({
          path: "restaurantId",
          select: "title coords", // Only populate title and coords of restaurant
        })
        .populate({
          path: "deliveryAddress",
          select: "addressLine1", // Populate delivery address details
        });
      res.status(200).json(orders);
    } catch (error) {
      res.status(500).json({
        status: false,
        message: "Error fetching order history",
        error: error.message,
      });
    }
  },

  getRiderFeedback: async (req, res) => {
    const riderId = req.user.id;

    try {
      const riderProfile = await Rider.findOne({ riderProfile: riderId });

      const rider = await Rider.findById(riderProfile._id)
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

      if (!rider) {
        return res.status(404).json({
          status: false,
          message: "Rider not found",
        });
      }

      res.status(200).json({
        status: true,
        message: "Rider feedbacks retrieved successfully",
        feedbacks: rider.feedbacks,
        rating: rider.rating,
        ratingCount: rider.ratingCount,
        totalRating: rider.totalRating,
      });
    } catch (error) {
      res.status(500).json({
        status: false,
        message: "Error fetching feedbacks",
        error: error.message,
      });
    }
  },

  addRiderInformation: async (req, res) => {
    try {
      const { firstName, lastName, email, phoneNumber, deviceType } = req.body;

      // Validate required fields
      if (!firstName || !lastName || !email || !phoneNumber || !deviceType) {
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

      // Check if the email already exists in the Rider collection
      const existingRider = await RiderApplication.findOne({ email });
      if (existingRider) {
        return res
          .status(409)
          .json({ message: "Rider with this email already submitted." });
      }

      // Save Rider information to the Rider collection
      const newRider = new RiderApplication({
        firstName,
        lastName,
        email,
        phoneNumber,
        deviceType,
      });

      await newRider.save();

      const adminPushTokens = await getAdminPushTokens();

      // Send push notification to admins
      if (adminPushTokens.length > 0) {
        await sendPushNotification(
          adminPushTokens,
          "New Rider Application",
          `A new rider application has been submitted by ${firstName} ${lastName}.`
        );
      }

      return res.status(201).json({
        message: "Rider application information submitted successfully.",
      });
    } catch (error) {
      res.status(500).json({ status: false, message: error.message });
    }
  },
};
