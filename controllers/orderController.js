const Order = require("../models/Orders");
const Food = require("../models/Food");
const Feedback = require("../models/Feedback");
const User = require("../models/User");
const Restaurant = require("../models/Restaurant");
const Rider = require("../models/Rider");
const Payment = require("../models/Payment");
const RiderPayment = require("../models/RiderPayment");
const axios = require("axios");
const mongoose = require("mongoose");
const sendPushNotification = require("../utils/sendPushNotification");
const { getAdminPushTokens } = require("../utils/adminPushTokens");
const { convertToNigerianTime } = require("../utils/helper");

const generateSecretCode = () => {
  return Math.floor(1000 + Math.random() * 9000).toString();
};

const processRestaurantPayment = async (order) => {
  const restaurantId = order.restaurantId;
  const orderTotal = order.orderTotal;
  const withdrawable = orderTotal * 0.85;
  const commission = orderTotal * 0.15;

  // Find the restaurant's payment record and update unpaid fields
  let payment = await Payment.findOne({ restaurantId });

  if (!payment) {
    payment = new Payment({ restaurantId });
  }

  payment.unpaid.totalOrders += 1;
  payment.unpaid.withdrawable += withdrawable;
  payment.unpaid.commission += commission;

  // Update total fields
  payment.total.totalOrders += 1;
  payment.total.withdrawable += withdrawable;
  payment.total.commission += commission;

  await payment.save();
};

const processRiderPayment = async (order) => {
  const riderId = order.assignedRider;
  const deliveryFee = order.deliveryFee;
  const withdrawable = deliveryFee * 1;
  const commission = deliveryFee * 0;

  // Find the rider's payment record and update unpaid fields
  let payment = await RiderPayment.findOne({ riderId });

  if (!payment) {
    payment = new RiderPayment({ riderId });
  }

  payment.unpaid.totalOrders += 1;
  payment.unpaid.withdrawable += withdrawable;
  payment.unpaid.commission += commission;

  // Update total fields
  payment.total.totalOrders += 1;
  payment.total.withdrawable += withdrawable;
  payment.total.commission += commission;

  await payment.save();
};

module.exports = {
  calculateOrderDetails: async (req, res) => {
    const userId = req.user.id;
    const { promoCode, useWallet, orderTotal, deliveryFee } = req.body;

    try {
      let discountAmount = 0;
      let walletBalance = 0;
      let grandTotal = orderTotal + deliveryFee;
      let referrerId = null;
      let freeDelivery = false;

      // Initialize promo code response
      let promoCodeStatus = { valid: false, message: "" };

      let paystackPayment = false;
      let walletPayment = false;
      let partialWalletPayment = false;

      // Helper function to round to the nearest ten
      const roundToNearestTen = (value) => Math.ceil(value / 10) * 10;

      // Round up deliveryFee to the nearest ten
      const roundedDeliveryFee = roundToNearestTen(deliveryFee);

      // Fetch user wallet balance
      const user = await User.findById(userId);
      if (!user) {
        return res
          .status(404)
          .json({ status: false, message: "User not found." });
      }
      walletBalance = user.walletBalance;
      const originalWalletBalance = user.walletBalance;

      // Check free delivery eligibility
      const orderCount = await Order.countDocuments({
        userId: new mongoose.Types.ObjectId(userId),
        paymentStatus: "Completed",
      });
      freeDelivery = orderCount % 10 === 0 || orderCount % 10 === 1;

      let discountedDeliveryFee = roundedDeliveryFee;
      if (freeDelivery) {
        discountedDeliveryFee = 0;
      } else {
        discountedDeliveryFee = roundToNearestTen(
          parseFloat((roundedDeliveryFee * 0.85).toFixed(2))
        );
      }

      // const riderDeliveryFee = roundToNearestTen(
      //   parseFloat((discountedDeliveryFee * 0.85).toFixed(2))
      // );

      const riderDeliveryFee = roundToNearestTen(
        parseFloat(discountedDeliveryFee.toFixed(2))
      );

      // Validate promo code if provided
      if (promoCode) {
        try {
          const referrer = await User.findOne({ referralCode: promoCode });
          if (!referrer) {
            promoCodeStatus = { valid: false, message: "Invalid promo code." };
          } else if (referrer._id.toString() === userId.toString()) {
            promoCodeStatus = {
              valid: false,
              message: "You cannot use your own promo code.",
            };
          } else if (orderCount > 0) {
            promoCodeStatus = {
              valid: false,
              message: "Promo code can only be used on your first order.",
            };
          } else {
            discountAmount = 500;
            referrerId = referrer._id;
            promoCodeStatus = {
              valid: true,
              message: "Promo code applied successfully.",
            };
          }
        } catch (error) {
          promoCodeStatus = {
            valid: false,
            message: "Error validating the promo code.",
          };
        }
      }

      // Handle wallet balance
      if (useWallet && walletBalance > 0) {
        const totalWithDiscount =
          orderTotal + parseFloat(discountedDeliveryFee) - discountAmount;

        if (walletBalance >= totalWithDiscount) {
          walletAmountUsed = totalWithDiscount;
          grandTotal = 0;
          walletBalance -= totalWithDiscount;
          walletPayment = true;
        } else {
          walletAmountUsed = walletBalance;
          grandTotal = totalWithDiscount - walletBalance;
          walletBalance = 0;
          partialWalletPayment = true;
        }
      } else {
        walletAmountUsed = 0;
        grandTotal =
          orderTotal + parseFloat(discountedDeliveryFee) - discountAmount;
      }

      if (grandTotal > 0) {
        paystackPayment = true;
      }

      res.status(200).json({
        status: true,
        orderTotal,
        normalDeliveryFee: deliveryFee,
        roundedDeliveryFee, // Rounded delivery fee
        discountedDeliveryFee, // Rounded discounted delivery fee
        riderDeliveryFee, // Rounded rider delivery fee
        freeDelivery,
        originalWalletBalance,
        walletBalance,
        walletAmountUsed,
        grandTotal,
        discountAmount,
        referrerId,
        paystackPayment,
        walletPayment,
        partialWalletPayment,
        promoCodeStatus, // Include promo code status
      });
    } catch (error) {
      console.error("Error in calculateOrderDetails:", error.message);
      res.status(500).json({
        status: false,
        message: "Server error.",
        error: error.message,
      });
    }
  },

  verifyPayment: async (req, res) => {
    const { reference, orderId, restaurantId, senderId, referredBy } = req.body;

    try {
      const response = await axios.get(
        `https://api.paystack.co/transaction/verify/${reference}`,
        {
          headers: {
            Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
          },
        }
      );

      const { status, data } = response.data;
      if (status === true) {
        await Order.findByIdAndUpdate(orderId, { paymentStatus: "Completed" });

        const updatedOrder = await Order.findById(orderId)
          .select(
            "userId deliveryAddress orderItems deliveryFee restaurantId orderStatus restaurantCoords recipientCoords paymentStatus orderDate restaurantSecretCode riderSecretCode updatedAt"
          )
          .populate({
            path: "userId",
            select: "phone profile",
          })
          .populate({
            path: "restaurantId",
            select: "title imageUrl logoUrl time",
            populate: {
              path: "owner",
              select: "expoPushToken firstName lastName phone",
            },
          })
          .populate({
            path: "orderItems.foodId",
            select: "title imageUrl time",
          })
          .populate({
            path: "deliveryAddress",
            select: "addressLine1 latitude longitude",
          });

        if (referredBy) {
          // Update the referrer's wallet balance
          const referrer = await User.findById(referredBy);
          if (referrer) {
            referrer.walletBalance += 500;
            await referrer.save();
          } else {
            console.error("Referrer not found");
          }
        }

        const restaurantOwnerPushToken =
          updatedOrder.restaurantId.owner?.expoPushToken;

        if (restaurantOwnerPushToken) {
          await sendPushNotification(
            [restaurantOwnerPushToken],
            "New Order Request 🚀",
            "You have received a new order! Open the app to view the details and start preparing."
          );
        } else {
          console.error("Restaurant owner's expoPushToken not found.");
        }

        let adminPushTokens = [];
        try {
          adminPushTokens = (await getAdminPushTokens()) || [];
        } catch (error) {
          console.error("Error fetching admin push tokens:", error.message);
        }

        if (adminPushTokens.length > 0) {
          try {
            const nigerianTime = convertToNigerianTime(updatedOrder.orderDate);
            await sendPushNotification(
              adminPushTokens,
              "Admin Notification - New Restaurant Order",
              `A new order for ${updatedOrder.restaurantId.title} on ${nigerianTime} | ${updatedOrder.restaurantId.owner?.phone}.`
            );
            console.log("Admin notification sent successfully.");
          } catch (notificationError) {
            console.error(
              "Error sending admin notification:",
              notificationError.message
            );
          }
        }

        res
          .status(200)
          .json({ status: true, message: "Payment verified successfully" });

        const { userSocketMap, io } = req;
        const restaurantSocketId = userSocketMap[restaurantId];

        console.log("restaurant Id", restaurantId);

        if (restaurantSocketId) {
          console.log(
            "emitting recieveOrder event to the restaurant",
            restaurantId
          );
          io.to(restaurantSocketId).emit("newOrder", updatedOrder);
        } else {
          console.log("restaurant socekt ID not found");
        }
      } else {
        res
          .status(400)
          .json({ status: false, message: "Payment verification failed" });
      }
    } catch (error) {
      res
        .status(500)
        .json({ status: false, message: "Error verifying payment" });
    }
  },

  verifyWalletPayment: async (req, res) => {
    const { orderId, restaurantId, senderId, referredBy } = req.body;

    try {
      await Order.findByIdAndUpdate(orderId, {
        paymentStatus: "Completed",
        paymentMethod: "wallet",
      });

      const updatedOrder = await Order.findById(orderId)
        .select(
          "userId deliveryAddress orderItems deliveryFee restaurantId orderStatus restaurantCoords recipientCoords paymentStatus orderDate restaurantSecretCode riderSecretCode updatedAt"
        )
        .populate({
          path: "userId",
          select: "phone profile",
        })
        .populate({
          path: "restaurantId",
          select: "title imageUrl logoUrl time",
          populate: {
            path: "owner",
            select: "expoPushToken firstName lastName phone",
          },
        })
        .populate({
          path: "orderItems.foodId",
          select: "title imageUrl time",
        })
        .populate({
          path: "deliveryAddress",
          select: "addressLine1 latitude longitude",
        });

      if (referredBy) {
        // Update the referrer's wallet balance
        const referrer = await User.findById(referredBy);
        if (referrer) {
          referrer.walletBalance += 500;
          await referrer.save();
        } else {
          console.error("Referrer not found");
        }
      }

      const restaurantOwnerPushToken =
        updatedOrder.restaurantId.owner?.expoPushToken;

      if (restaurantOwnerPushToken) {
        await sendPushNotification(
          [restaurantOwnerPushToken],
          "New Order Request 🚀",
          "You have received a new order! Open the app to view the details and start preparing."
        );
      } else {
        console.error("Restaurant owner's expoPushToken not found.");
      }

      let adminPushTokens = [];
      try {
        adminPushTokens = (await getAdminPushTokens()) || [];
      } catch (error) {
        console.error("Error fetching admin push tokens:", error.message);
      }

      if (adminPushTokens.length > 0) {
        try {
          const nigerianTime = convertToNigerianTime(updatedOrder.orderDate);

          await sendPushNotification(
            adminPushTokens,
            "Admin Notification - New Restaurant Order",
            `A new order for ${updatedOrder.restaurantId.title} on ${nigerianTime} | ${updatedOrder.restaurantId.owner?.phone}.`
          );
          console.log("Admin notification sent successfully.");
        } catch (notificationError) {
          console.error(
            "Error sending admin notification:",
            notificationError.message
          );
        }
      }

      res
        .status(200)
        .json({ status: true, message: "Payment verified successfully" });

      const { userSocketMap, io } = req;
      const restaurantSocketId = userSocketMap[restaurantId];

      console.log("restaurant Id", restaurantId);

      if (restaurantSocketId) {
        console.log(
          "emitting recieveOrder event to the restaurant",
          restaurantId
        );
        io.to(restaurantSocketId).emit("newOrder", updatedOrder);
      } else {
        console.log("restaurant socekt ID not found");
      }
    } catch (error) {
      res
        .status(500)
        .json({ status: false, message: "Error completing wallet payment" });
    }
  },

  placeOrder: async (req, res) => {
    try {
      const { restaurantId } = req.body;

      // Fetch the restaurant by ID
      const restaurant = await Restaurant.findById(restaurantId);

      // Check if the restaurant exists
      if (!restaurant) {
        return res.status(404).json({
          status: false,
          message: "Restaurant not found",
        });
      }

      // Check if the restaurant is active and available
      if (!restaurant.isActive) {
        return res.status(400).json({
          status: false,
          message: "Restaurant is closed",
        });
      }

      if (!restaurant.isAvailable) {
        return res.status(400).json({
          status: false,
          message:
            "Restaurant is currently not accepting orders, Please try again",
        });
      }

      const order = new Order({
        ...req.body,
        restaurantSecretCode: generateSecretCode(),
        riderSecretCode: generateSecretCode(),
      });
      await order.save();
      res.status(201).json({
        status: true,
        message: "Order placed successfully",
        data: order,
      });
    } catch (error) {
      console.log(error);
      res.status(500).json(error);
    }
  },

  applyCoupon: async (req, res) => {
    const { promoCode, userId } = req.body;

    try {
      // Check if the coupon code exists
      const referrer = await User.findOne({ referralCode: promoCode });
      if (!referrer) {
        return res
          .status(400)
          .json({ status: false, message: "Coupon code not found." });
      }

      // Ensure the user is not applying their own coupon code
      if (referrer._id.toString() === userId.toString()) {
        return res.status(400).json({
          status: false,
          message: "You cannot use your own coupon code.",
        });
      }

      // Check if it's the user's first order
      const existingOrders = await Order.find({
        userId,
        paymentStatus: "Completed", // Only consider completed orders
      });

      if (existingOrders.length > 0) {
        return res.status(400).json({
          status: false,
          message:
            "This is not your first order, you can only use this referral code on your first order.",
        });
      }

      res.status(200).json({
        status: true,
        discountAmount: 500,
        referrerId: referrer._id, // Add referrer ID to response
      });
    } catch (error) {
      res.status(500).json({ status: false, message: error.message });
    }
  },

  updateWallet: async (req, res) => {
    const { amountUsed } = req.body;
    const userId = req.user.id; // Ensure you have user ID from auth middleware

    try {
      const user = await User.findById(userId);
      if (!user) {
        return res
          .status(404)
          .json({ status: false, message: "User not found" });
      }

      if (user.walletBalance < amountUsed) {
        return res
          .status(400)
          .json({ status: false, message: "Insufficient wallet balance" });
      }

      user.walletBalance -= amountUsed;
      await user.save();

      res.status(200).json({ status: true, message: "Wallet balance updated" });
    } catch (error) {
      res.status(500).json({ status: false, message: error.message });
    }
  },

  walletBalance: async (req, res) => {
    try {
      const user = await User.findById(req.user.id);
      if (!user) return res.status(404).json({ message: "User not found" });

      res.status(200).json({ walletBalance: user.walletBalance });
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  },

  getOrderDetails: async (req, res) => {
    const orderId = req.params.id;

    try {
      const order = await Order.findById(orderId)
        .populate({
          path: "userId",
          select: "name email", // Fetch only the name and email of the user
        })
        .populate({
          path: "deliveryAddress",
          select: "addressLine1 city state postalCode", // Fetch specific address fields
        })
        .populate({
          path: "restaurantId",
          select: "name location", // Fetch the name and location of the restaurant
        })
        .populate({
          path: "assignedRider",
          select: "name phone",
        });

      if (order) {
        res.status(200).json({ status: true, data: order });
      } else {
        res.status(404).json({ status: false, message: "Order not found" });
      }
    } catch (error) {
      res.status(500).json(error);
    }
  },

  deleteOrder: async (req, res) => {
    const { orderId } = req.params;

    try {
      await Order.findByIdAndDelete(orderId);
      res
        .status(200)
        .json({ status: true, message: "Order deleted successfully" });
    } catch (error) {
      res.status(500).json(error);
    }
  },

  getUserOrders: async (req, res) => {
    const userId = req.user.id;
    try {
      const orders = await Order.find({ userId })
        .populate("restaurantId")
        .populate({
          path: "assignedRider",
          select: "vehicleType vehicleBrand plateNumber imageUrl point",
          populate: {
            path: "riderProfile",
            select: "phone firstName lastName email",
          },
        });
      res.status(200).json({ status: true, data: orders });
    } catch (error) {
      console.log(error);
      res.status(500).json(error);
    }
  },

  rateOrder: async (req, res) => {
    const orderId = req.params.id;
    const { rating, feedback } = req.body;

    try {
      const updatedOrder = await Order.findByIdAndUpdate(
        orderId,
        { rating, feedback },
        { new: true }
      );
      if (updatedOrder) {
        res.status(200).json({
          status: true,
          message: "Rating and feedback added successfully",
          data: updatedOrder,
        });
      } else {
        res.status(404).json({ status: false, message: "Order not found" });
      }
    } catch (error) {
      res.status(500).json(error);
    }
  },

  updateOrderStatus: async (req, res) => {
    const { id: orderId, status: orderStatus } = req.params;
    const { userId, riderResponse, secretCode } = req.body;

    const modifierId = req.user.id;

    try {
      const user = await User.findById(userId).select("expoPushToken");

      let updateFields = { orderStatus };
      const currentTime = new Date();
      const order = await Order.findById(orderId);

      if (!order) {
        return res
          .status(404)
          .json({ status: false, message: "Order not found" });
      }

      // Check if the modifier is the restaurant owner
      const restaurant = await Restaurant.findOne({ owner: modifierId });
      const isRestaurantOwner =
        restaurant && restaurant._id.equals(order.restaurantId);

      // Check if the modifier is the assigned rider
      const rider = await Rider.findOne({ riderProfile: modifierId });
      const isAssignedRider = rider && rider._id.equals(order.assignedRider);

      // Verify if the modifier is either the restaurant owner or assigned rider
      if (!isRestaurantOwner && !isAssignedRider) {
        return res.status(403).json({
          status: false,
          message: "You are not authorized to update this order.",
        });
      }

      switch (orderStatus) {
        case "Preparing":
          updateFields.preparingTime = currentTime;
          updateFields.progressSteps = 1;

          await sendPushNotification(
            [user.expoPushToken],
            "Order Update",
            "Your order is now being prepared."
          );

          break;
        case "Ready":
          updateFields.readyTime = currentTime;
          updateFields.progressSteps = 2;
          // Automatically assign the order to a rider once it's ready
          console.log("assigning order before");
          const assignResult = await module.exports.assignOrderToRider(
            orderId,
            req
          );

          const backdatedTime = new Date(
            currentTime.getTime() - 10 * 60 * 1000
          ); // Subtract 3 minutes
          if (
            !assignResult.status &&
            order.previouslyAssignedRiders?.length === 0
          ) {
            updateFields.orderStatus = "Ready";
            // updateFields.riderAssignedTime = backdatedTime;
          } else if (!assignResult.status) {
            return res.status(500).json(assignResult);
          }
          console.log("assigning order after");

          await sendPushNotification(
            [user.expoPushToken],
            "Order Update",
            "Your order is ready and has been assigned to a rider."
          );
          break;
        case "Rider Assigned":
          if (riderResponse === "accept") {
            updateFields.orderStatus = "Rider Accepted Order";
            updateFields.riderAcceptedTime = currentTime;
            updateFields.progressSteps = 3;
            // await order.save();

            // return res.status(200).json({
            //   status: true,
            //   message: "Rider accepted the order",
            //   data: order,
            // });
            await sendPushNotification(
              [user.expoPushToken],
              "Order Update",
              "A rider has accepted your order."
            );
          } else if (riderResponse === "decline") {
            // Reassign the order to another rider
            await module.exports.reassignOrder(
              order._id,
              order.assignedRider,
              req
            );
            return res.status(200).json({
              status: true,
              message: "Rider declined the order, reassigning...",
            });
          }
          break;

        case "Out for Delivery":
          updateFields.inTransitTime = currentTime;
          updateFields.progressSteps = 4;

          // Process restaurant's payment
          await processRestaurantPayment(order);
          await sendPushNotification(
            [user.expoPushToken],
            "Order Update",
            "Your order is out for delivery."
          );
          break;
        case "Arrived":
          updateFields.arrivalTime = currentTime;
          updateFields.progressSteps = 5;

          await sendPushNotification(
            [user.expoPushToken],
            "Order Update",
            "Your order has arrived."
          );
          break;
        case "Delivered":
          // Validate rider secret code
          if (secretCode !== order.riderSecretCode) {
            return res.status(400).json({
              status: false,
              message:
                "Invalid secret code. Order cannot be marked as delivered.",
            });
          }

          updateFields.deliveryTime = currentTime;
          updateFields.progressSteps = 6;

          await processRiderPayment(order);

          // Update the rider's availability and assigned orders
          if (order.assignedRider) {
            await Rider.findByIdAndUpdate(order.assignedRider, {
              isAvailable: true,
              assignedOrders: [],
            });
          }

          await sendPushNotification(
            [user.expoPushToken],
            "Order Update",
            "Your order has been delivered. Thank you for choosing our service! 😎"
          );
          break;
        default:
          break;
      }

      const updatedOrder = await Order.findByIdAndUpdate(
        orderId,
        updateFields,
        { new: true }
      )
        .populate("restaurantId")
        .populate({
          path: "assignedRider",
          select: "vehicleType vehicleBrand plateNumber imageUrl point",
          populate: {
            path: "riderProfile",
            select: "phone firstName lastName email",
          },
        });

      if (updatedOrder) {
        let rider = null;
        if (updatedOrder.assignedRider) {
          rider = await User.findById(
            updatedOrder.assignedRider.riderProfile
          ).select("firstName lastName email phone userType profile");
        }

        // res.status(200).json({
        //   status: true,
        //   message: "Order status updated successfully",
        //   data: { order: updatedOrder, rider },
        // });

        // const { userSocketMap, io } = req;
        // const customerSocketId = userSocketMap[userId];

        // if (customerSocketId) {
        //   io.to(customerSocketId).emit("newStatus", { order: updatedOrder, rider });
        // }

        res.status(200).json({
          status: true,
          message: "Order status updated successfully",
          data: updatedOrder,
        });

        const { userSocketMap, io } = req;

        const customerSocketId = userSocketMap[userId];

        console.log("userId from controller", userId);

        if (customerSocketId) {
          console.log(
            "emitting recieveOrderStatus event to the customer",
            userId
          );
          io.to(customerSocketId).emit("newStatus", updatedOrder);
        } else {
          console.log("client socekt ID not found");
        }
      } else {
        res.status(404).json({ status: false, message: "Order not found" });
      }
    } catch (error) {
      res.status(500).json(error);
      console.log(error);
    }
  },

  assignOrderToRider: async (orderId, req) => {
    try {
      const order = await Order.findById(orderId).populate("restaurantId");
      if (!order) {
        throw new Error("Order not found");
      }

      // console.log(order, orderId);

      const restaurantId = order.restaurantId._id;

      // Find the restaurant by restaurantId
      const restaurant = await Restaurant.findById(restaurantId);
      if (!restaurant) {
        throw new Error("Restaurant not found");
      }

      const restaurantLocation = restaurant.location.coordinates;

      console.log(restaurantId, restaurantLocation);

      // Find the nearest available rider within a radius (e.g., 5 km),
      // excluding riders who were previously assigned
      const availableRiders = await Rider.find({
        isAvailable: true,
        isActive: true,
        isTakingOrders: true,
        verification: "Verified",
        _id: { $nin: order.previouslyAssignedRiders || [] }, // Exclude previously assigned riders
        point: {
          $near: {
            $geometry: { type: "Point", coordinates: restaurantLocation },
            $maxDistance: 5000, // 5 km radius
            $minDistance: 0, // Optionally, you can set a minimum distance
          },
        },
      }).limit(1);

      console.log("available rider: ", availableRiders);

      if (availableRiders.length === 0) {
        // No available riders: Set status to "Ready" and backdate riderAssignedTime
        order.orderStatus = "Ready";
        order.riderAssignedTime = new Date(Date.now() - 10 * 60 * 1000); // Backdate by 10 minutes
        await order.save();

        return {
          status: true,
          message: "No available rider; order set to Ready",
        };
      }

      const assignedRider = availableRiders[0];

      console.log("assignedRider: ", assignedRider);

      // Assign rider to order and update status
      order.assignedRider = assignedRider._id;
      order.orderStatus = "Rider Assigned";
      order.riderAssignedTime = new Date(); // Set the time the rider was assigned
      await order.save();

      // Update rider's status and save
      assignedRider.isAvailable = false;
      assignedRider.assignedOrders.push(order._id);
      await assignedRider.save();

      const parcels = await Order.find({
        orderStatus: { $nin: ["Placed", "Preparing", "Delivered"] },
        assignedRider: assignedRider._id,
        paymentStatus: "Completed",
      })
        .select(
          "userId deliveryAddress orderItems deliveryFee restaurantId orderStatus restaurantCoords recipientCoords paymentStatus orderDate restaurantSecretCode riderSecretCode updatedAt assignedRider readyTime riderAssignedTime riderAcceptedTime inTransitTime arrivalTime deliveryTime progressSteps"
        )
        .populate({
          path: "assignedRider",
          select: "vehicleType vehicleBrand plateNumber imageUrl point",
          populate: {
            path: "riderProfile",
            select: "phone firstName lastName email",
          },
        })
        .populate({
          path: "userId",
          select: "phone profile firstName lastName email",
        })
        .populate({
          path: "restaurantId",
          select: "title imageUrl logoUrl location coords",
          populate: {
            path: "owner", // Populate the owner field
            select: "phone firstName lastName email", // Select the owner's details
          },
        })
        .populate({
          path: "orderItems.foodId",
          select: "title imageUrl time",
        })
        .populate({
          path: "deliveryAddress",
          select:
            "addressLine1 latitude longitude postalCode deliveryInstructions",
        });

      const { userSocketMap, io } = req;
      const riderSocketId = userSocketMap[assignedRider._id];

      console.log("rider Id", assignedRider._id);

      if (riderSocketId) {
        console.log(
          "emitting recieveRiderOrder event to the rider",
          assignedRider._id
        );
        io.to(riderSocketId).emit("newRiderOrder", parcels);
      } else {
        console.log("rider socket ID not found");
      }

      const riderPushToken = parcels.assignedRider.riderProfile?.expoPushToken;

      if (riderPushToken) {
        await sendPushNotification(
          [riderPushToken],
          "New Order Alert 🚀",
          "You have a new delivery request! Open the app to check the details and take action promptly."
        );
      } else {
        console.error("Rider's expoPushToken not found.");
      }

      let adminPushTokens = [];
      try {
        adminPushTokens = (await getAdminPushTokens()) || [];
      } catch (error) {
        console.error("Error fetching admin push tokens:", error.message);
      }

      if (adminPushTokens.length > 0) {
        try {
          const nigerianTime = convertToNigerianTime(parcels.orderDate);
          await sendPushNotification(
            "Admin Notification - New Rider Order",
            `A new order for ${parcels.assignedRider.riderProfile.firstName} on ${nigerianTime} | ${parcels.assignedRider.riderProfile.phone}.`
          );
          console.log("Admin notification sent successfully.");
        } catch (notificationError) {
          console.error(
            "Error sending admin notification:",
            notificationError.message
          );
        }
      }

      return { status: true, message: "Order assigned to rider" };
    } catch (error) {
      console.error("Error assigning order:", error);
      return { status: false, message: error.message };
    }
  },

  reassignOrder: async (orderId, riderId, req) => {
    try {
      const { userSocketMap, io } = req;
      const riderSocketId = userSocketMap[riderId];

      console.log("rider Id", riderId);

      if (riderSocketId) {
        console.log(
          "emitting recieveDeleteRiderOrder event to the rider",
          riderId
        );
        io.to(riderSocketId).emit("newDeleteRiderOrder", orderId);
      } else {
        console.log("rider socket ID not found");
      }

      // Mark the current rider as available again
      await Rider.findByIdAndUpdate(riderId, {
        isAvailable: true,
        assignedOrders: [],
      });

      // Reassign the order to another rider
      const order = await Order.findById(orderId);
      if (!order) throw new Error("Order not found");

      // Add the rider to the previouslyAssignedRiders array
      order.previouslyAssignedRiders.push(riderId);

      // Reset the assigned rider and status
      order.assignedRider = null;
      order.orderStatus = "Ready"; // Reset status
      await order.save();

      // Reassign to a new rider
      await module.exports.assignOrderToRider(orderId, req);
      // if (!assignResult.status) {
      //   return res.status(500).json(assignResult);
      // }
    } catch (error) {
      console.error("Error reassigning order:", error.message);
    }
  },

  updatePaymentStatus: async (req, res) => {
    const orderId = req.params.id;
    const { paymentStatus } = req.body;

    try {
      const updatedOrder = await Order.findByIdAndUpdate(
        orderId,
        { paymentStatus },
        { new: true }
      );
      if (updatedOrder) {
        res.status(200).json({
          status: true,
          message: "Payment status updated successfully",
          data: updatedOrder,
        });
      } else {
        res.status(404).json({ status: false, message: "Order not found" });
      }
    } catch (error) {
      res.status(500).json(error);
    }
  },

  getRestaurantOrdersList: async (req, res) => {
    let status;
    if (req.query.status === "placed") {
      status = "Placed";
    } else if (req.query.status === "preparing") {
      status = "Preparing";
    } else if (req.query.status === "ready") {
      status = ["Ready", "Rider Accepted Order", "Rider Assigned"];
    } else if (req.query.status === "out_for_delivery") {
      status = ["Out for Delivery", "Arrived"];
    } else if (req.query.status === "delivered") {
      status = "Delivered";
    } else if (req.query.status === "manual") {
      status = "Manual";
    } else if (req.query.status === "cancelled") {
      status = "Cancelled";
    }
    try {
      const parcels = await Order.find({
        orderStatus: Array.isArray(status) ? { $in: status } : status,
        restaurantId: req.params.id,
        $or: [{ paymentStatus: "Completed" }, { paymentStatus: "Pending" }],
      })
        .select(
          "userId deliveryAddress orderItems deliveryFee restaurantId orderStatus restaurantCoords recipientCoords paymentStatus orderDate restaurantSecretCode riderSecretCode updatedAt assignedRider readyTime riderAssignedTime riderAcceptedTime inTransitTime arrivalTime deliveryTime progressSteps"
        )
        .populate({
          path: "assignedRider",
          select: "vehicleType vehicleBrand plateNumber imageUrl point",
          populate: {
            path: "riderProfile",
            select: "phone firstName lastName email",
          },
        })
        .populate({
          path: "userId",
          select: "phone profile",
        })
        .populate({
          path: "restaurantId",
          select: "title imageUrl logoUrl time",
        })
        .populate({
          path: "orderItems.foodId",
          select: "title imageUrl time",
        })
        .populate({
          path: "deliveryAddress",
          select: "addressLine1 latitude longitude",
        });

      res.status(200).json(parcels);
    } catch (error) {
      res.status(500).json({
        status: false,
        message: "Error retrieving parcels",
        error: error.message,
      });
    }
  },

  getRiderOrdersList: async (req, res) => {
    const riderProfile = req.user.id;
    // let status;
    // if (req.query.status === "Ready") {
    //   status = "Ready";
    // } else if (req.query.status === "Rider Assigned") {
    //   status = "Rider Assigned";
    // } else if (req.query.status === "Rider Accepted Order") {
    //   status = "Rider Accepted Order";
    // } else if (req.query.status === "Out for Delivery") {
    //   status = "Out for Delivery";
    // } else if (req.query.status === "Arrived") {
    //   status = "Arrived";
    // } else if (req.query.status === "delivered") {
    //   status = "Delivered";
    // }

    try {
      const rider = await Rider.findOne({ riderProfile: riderProfile });

      if (!rider) {
        return res.status(404).json({
          status: false,
          message: "Rider profile not found",
        });
      }
      const parcels = await Order.find({
        orderStatus: { $nin: ["Placed", "Preparing", "Delivered"] },
        assignedRider: rider._id,
        paymentStatus: "Completed",
      })
        .select(
          "userId deliveryAddress orderItems deliveryFee restaurantId orderStatus restaurantCoords recipientCoords paymentStatus orderDate restaurantSecretCode riderSecretCode updatedAt assignedRider readyTime riderAssignedTime riderAcceptedTime inTransitTime arrivalTime deliveryTime progressSteps"
        )
        .populate({
          path: "assignedRider",
          select: "vehicleType vehicleBrand plateNumber imageUrl point",
          populate: {
            path: "riderProfile",
            select: "phone firstName lastName email",
          },
        })
        .populate({
          path: "userId",
          select: "phone profile firstName lastName email",
        })
        .populate({
          path: "restaurantId",
          select: "title imageUrl logoUrl location coords",
          populate: {
            path: "owner", // Populate the owner field
            select: "phone firstName lastName email", // Select the owner's details
          },
        })
        .populate({
          path: "orderItems.foodId",
          select: "title imageUrl time",
        })
        .populate({
          path: "deliveryAddress",
          select:
            "addressLine1 latitude longitude postalCode deliveryInstructions",
        });

      res.status(200).json(parcels);
    } catch (error) {
      res.status(500).json({
        status: false,
        message: "Error retrieving parcels",
        error: error.message,
      });
    }
  },

  addOrUpdateRating: async (req, res) => {
    const userId = req.user.id;
    const { foodId, orderId, orderItemId, rating, feedbackText } = req.body;

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
      const orderItem = order.orderItems.id(orderItemId);

      if (!orderItem) {
        return res.status(400).json({
          status: false,
          message: "Order item not found.",
        });
      }

      // Check if the order status is "Delivered" and if the item has not been rated yet
      if (order.orderStatus !== "Delivered" || orderItem.rated) {
        return res.status(400).json({
          status: false,
          message: "Order must be delivered and the item not yet rated.",
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
        orderItem.rating = rating;
        orderItem.feedback = feedbackText || "";
        orderItem.rated = true;
        orderItem.feedbackId = feedbackId || null;

        await order.save();

        // Find the food item to update its rating
        const food = await Food.findById(foodId);

        if (!food) {
          return res.status(404).json({
            status: false,
            message: "Food item not found.",
          });
        }

        // Calculate the new rating for the food item
        const newRatingCount = food.ratingCount + 1;
        const newTotalRating = food.totalRating + rating;
        const newAverageRating = newTotalRating / newRatingCount;

        // Update the food document with the new rating and feedback
        await Food.findByIdAndUpdate(
          foodId,
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
            message: "Order item rated and feedback updated successfully",
          });
        } else {
          return res.status(200).json({
            status: true,
            message: "Order item rated successfully",
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

  getOrderDetailsByOrderId: async (req, res) => {
    const userId = req.user.id;
    const { orderId } = req.params;

    try {
      // Find the order with detailed population
      const order = await Order.findOne({ _id: orderId, userId })
        .populate({
          path: "orderItems.foodId",
          select: "rating ratingCount imageUrl title description",
        })
        .populate({
          path: "restaurantId",
          select:
            "title logoUrl coords rating ratingCount openingTime closingTime foods pickup delivery owner isAvailable verification verificationMessage code distance location coords imageUrl",
        });

      if (!order) {
        return res.status(404).json({
          status: false,
          message: "Order not found for the specified user.",
        });
      }

      // Format the response
      const formattedOrder = {
        __v: order.__v,
        _id: order._id,
        createdAt: order.createdAt,
        deliveryAddress: order.deliveryAddress,
        deliveryFee: order.deliveryFee,
        deliveryTime: order.deliveryTime,
        discountAmount: order.discountAmount || 0,
        grandTotal: order.grandTotal,
        orderDate: order.orderDate,
        orderItems: order.orderItems.map((item) => ({
          _id: item._id,
          additives: item.additives || [], // Assuming this field may not always be present
          foodId: item.foodId._id,
          imageUrl: item.foodId.imageUrl,
          instructions: item.instructions || "",
          price: item.price,
          quantity: item.quantity,
          time: item.time || "",
          title: item.title,
          rating: item.rating,
          feedback: item.feedback,
          rated: item.rated,
        })),
        orderStatus: order.orderStatus,
        orderTotal: order.orderTotal,
        paymentMethod: order.paymentMethod,
        paymentStatus: order.paymentStatus,
        preparingTime: order.preparingTime,
        progressSteps: order.progressSteps || 1,
        readyTime: order.readyTime,
        referredBy: order.referredBy || null,
        restaurantId: {
          __v: order.restaurantId.__v,
          _id: order.restaurantId._id,
          closingTime: order.restaurantId.closingTime,
          code: order.restaurantId.code,
          coords: order.restaurantId.coords,
          createdAt: order.restaurantId.createdAt,
          delivery: order.restaurantId.delivery,
          foods: order.restaurantId.foods,
          imageUrl: order.restaurantId.imageUrl,
          isAvailable: order.restaurantId.isAvailable,
          location: order.restaurantId.location,
          logoUrl: order.restaurantId.logoUrl,
          openingTime: order.restaurantId.openingTime,
          owner: order.restaurantId.owner,
          pickup: order.restaurantId.pickup,
          rating: order.restaurantId.rating,
          ratingCount: order.restaurantId.ratingCount,
          restaurantDoc: order.restaurantId.restaurantDoc || "", // Assuming this field may not always be present
          title: order.restaurantId.title,
          updatedAt: order.restaurantId.updatedAt,
          verification: order.restaurantId.verification,
          verificationMessage: order.restaurantId.verificationMessage,
        },
        restaurantSecretCode: order.restaurantSecretCode || "",
        riderSecretCode: order.riderSecretCode || "",
        updatedAt: order.updatedAt,
        userId: order.userId,
      };

      res.status(200).json({ status: true, order: formattedOrder });
    } catch (error) {
      console.error(error);
      res.status(500).json({ status: false, message: error.message });
    }
  },

  checkUserOrderCount: async (req, res) => {
    try {
      const userId = req.user.id;
      const orderCount = await Order.countDocuments({
        userId: new mongoose.Types.ObjectId(userId),
        paymentStatus: "Completed",
      });

      // Check the pattern: True for 0-1, 10-11, 20-21... and False for 2-9, 12-19, 22-29...
      const cyclePosition = orderCount % 10; // Get the position in the 10-order cycle
      const isTrue = cyclePosition === 0 || cyclePosition === 1;

      res.status(200).json({
        status: true,
        result: isTrue, // Return true or false based on the pattern
        orderCount, // Also return the number of completed orders (optional, for reference)
      });
    } catch (error) {
      res.status(500).json({
        status: false,
        message: "Error checking user order status",
        error: error.message,
      });
    }
  },
};
