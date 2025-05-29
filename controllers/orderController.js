const Order = require("../models/Orders");
const Food = require("../models/Food");
const Grocery = require("../models/Grocery");
const GroceryStore = require("../models/GroceryStore");
const Feedback = require("../models/Feedback");
const User = require("../models/User");
const Restaurant = require("../models/Restaurant");
const Rider = require("../models/Rider");
const Payment = require("../models/Payment");
const GroceryPayment = require("../models/GroceryPayment");
const RiderPayment = require("../models/RiderPayment");
const CompanyRevenue = require("../models/CompanyRevenue");
const Address = require("../models/Address");
const axios = require("axios");
const mongoose = require("mongoose");
const sendPushNotification = require("../utils/sendPushNotification");
const { getAdminPushTokens } = require("../utils/adminPushTokens");
const { convertToNigerianTime } = require("../utils/helper");
const sendFirstOrderThankYouEmail = require("../utils/email_firstOrderMessage");
const sendReferralRewardEmail = require("../utils/sendReferralRewardEmail");
const sendNewOrderNotificationEmail = require("../utils/sendNewOrderNotificationEmail");
const sendOrderUpdateEmail = require("../utils/sendOrderUpdateEmail");
const adminEmailNotification = require("../utils/adminEmailNotification");

const generateSecretCode = () => {
  return Math.floor(1000 + Math.random() * 9000).toString();
};

const processStorePayment = async (order) => {
  const { storeId, orderTotal, storeType } = order;
  let store, commissionRate, paymentModel, paymentQuery;

  if (storeType === "Restaurant") {
    store = await Restaurant.findById(storeId);
    if (!store) {
      throw new Error("Restaurant not found");
    }
    commissionRate = store.restaurantCommission || 0.1; // Default 10%
    paymentModel = Payment;
    paymentQuery = { restaurantId: storeId };
  } else if (storeType === "GroceryStore") {
    store = await GroceryStore.findById(storeId);
    if (!store) {
      throw new Error("Grocery Store not found");
    }
    commissionRate = store.storeCommission || 0.0; // Default 0%
    paymentModel = GroceryPayment;
    paymentQuery = { groceryStoreId: storeId };
  } else {
    throw new Error("Invalid store type");
  }

  const commission = orderTotal * commissionRate;
  const withdrawable = orderTotal - commission;

  // Find the store's payment record and update unpaid fields
  let payment = await paymentModel.findOne(paymentQuery);

  if (!payment) {
    payment = new paymentModel(paymentQuery);
  }

  payment.unpaid.totalOrders += 1;
  payment.unpaid.withdrawable += withdrawable;
  payment.unpaid.commission += commission;

  // Update total fields
  payment.total.totalOrders += 1;
  payment.total.withdrawable += withdrawable;
  payment.total.commission += commission;

  await payment.save();

  // Add commission to CompanyRevenue
  try {
    const result = await CompanyRevenue.findOneAndUpdate(
      {},
      {
        $inc: {
          balance: commission,
          commissions: commission,
        },
      },
      { new: true, upsert: true }
    );

    if (!result) {
      console.error("Company revenue record not found or created.");
    }
  } catch (error) {
    console.error("Error updating company revenue:", error.message);
  }
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
      let referrerId = null;
      let freeDelivery = false;

      // Initialize promo code response
      let promoCodeStatus = { valid: false, message: "" };

      let paystackPayment = false;
      let walletPayment = false;
      let partialWalletPayment = false;

      // Helper function to round to the nearest ten
      const roundToNearestTen = (value) => Math.ceil(value / 10) * 10;

      // Ensure minimum delivery fee is 500
      const normalDeliveryFee = deliveryFee < 500 ? 500 : deliveryFee;

      // Round up deliveryFee to the nearest ten
      const roundedDeliveryFee = roundToNearestTen(normalDeliveryFee);

      // Fetch user wallet balance
      const user = await User.findById(userId);
      if (!user) {
        return res
          .status(404)
          .json({ status: false, message: "User not found." });
      }
      walletBalance = user.walletBalance;
      const originalWalletBalance = user.walletBalance;

      // Check if today is free delivery promo day (May 8, 2025)
      const today = new Date();
      const isFreeDeliveryDay =
        today.getFullYear() === 2025 &&
        today.getMonth() === 4 && // May = 4 (0-indexed)
        today.getDate() === 21;

      const orderCount = await Order.countDocuments({
        userId: new mongoose.Types.ObjectId(userId),
        paymentStatus: "Completed",
      });

      if (isFreeDeliveryDay) {
        freeDelivery = true;
      } else {
        freeDelivery = orderCount % 10 === 0 || orderCount % 10 === 1;
      }

      let discountedDeliveryFee = roundedDeliveryFee;
      if (freeDelivery) {
        discountedDeliveryFee = 0;
      } else {
        discountedDeliveryFee = roundToNearestTen(
          parseFloat((roundedDeliveryFee * 0.85).toFixed(2))
        );
      }

      const riderDeliveryFee = roundToNearestTen(
        parseFloat((roundedDeliveryFee * 0.85).toFixed(2))
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

      // Calculate Service Fee: 3% of orderTotal + ₦100, rounded up to nearest ten
      const serviceFee = roundToNearestTen(
        parseFloat((orderTotal * 0.03 + 100).toFixed(2))
      );

      let grandTotal =
        orderTotal +
        parseFloat(discountedDeliveryFee) +
        serviceFee -
        discountAmount;

      // Handle wallet balance
      let walletAmountUsed = 0;
      if (useWallet && walletBalance > 0) {
        const totalWithDiscount = grandTotal;

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
      }

      if (grandTotal > 0) {
        paystackPayment = true;
      }

      res.status(200).json({
        status: true,
        orderTotal,
        normalDeliveryFee, // Minimum 500 enforced
        roundedDeliveryFee, // Rounded delivery fee
        discountedDeliveryFee, // Rounded discounted delivery fee
        riderDeliveryFee, // Rounded rider delivery fee
        serviceFee, // 3% + 100 flat Service Fee
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
    const {
      reference,
      orderId,
      storeId,
      senderId,
      referredBy,
      storeType,
      walletAmountUsed,
    } = req.body;

    try {
      const existingOrder = await Order.findById(orderId);
      if (!existingOrder) {
        return res
          .status(404)
          .json({ status: false, message: "Order not found" });
      }
      if (existingOrder.paymentStatus === "Completed") {
        return res
          .status(200)
          .json({ status: true, message: "Payment verified successfully" });
      }

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

        if (walletAmountUsed > 0) {
          const user = await User.findById(existingOrder.userId);
          if (user) {
            user.walletBalance -= walletAmountUsed;
            await user.save();
          }
        }

        const updatedOrder = await Order.findById(orderId)
          .select(
            "userId deliveryAddress orderItems deliveryFee storeId storeType orderStatus storeCoords recipientCoords paymentStatus orderDate storeSecretCode riderSecretCode updatedAt freeDelivery serviceFee orderTotal grandTotal"
          )
          .populate({
            path: "userId",
            select: "phone profile firstName lastName",
          })
          .populate({
            path: "storeId",
            select: "title imageUrl logoUrl time",
            populate: {
              path: "owner",
              select: "expoPushToken firstName lastName phone email",
            },
          })
          .populate({
            path: "orderItems.productId",
            select: "title imageUrl time",
          })
          .populate({
            path: "deliveryAddress",
            select: "addressLine1 latitude longitude deliveryInstructions",
          });

        const storeOwnerPushToken = updatedOrder.storeId.owner?.expoPushToken;

        const storeOwnerEmail = updatedOrder.storeId.owner?.email;

        if (storeOwnerPushToken) {
          await sendPushNotification(
            [storeOwnerPushToken],
            "New Order Request 🚀",
            "You have received a new order! Open the app to view the details and start preparing."
          );
        } else {
          await sendNewOrderNotificationEmail(
            storeOwnerEmail,
            updatedOrder.storeId.title
          );
        }

        if (referredBy) {
          const referrer = await User.findById(referredBy);
          if (referrer) {
            referrer.walletBalance += 500;
            await referrer.save();

            await CompanyRevenue.findOneAndUpdate(
              {},
              { $inc: { referral: 1000, balance: -1000 } },
              { new: true, upsert: true }
            );

            const fullName = `${referrer.firstName}`;

            if (referrer.expoPushToken) {
              const message = `${fullName}, your Sprin app referral code has been used by someone! ₦500 has been added to your wallet, bringing your total wallet balance to ₦${referrer.walletBalance}. You can use it to pay for an order at any time.`;

              await sendPushNotification(
                [referrer.expoPushToken],
                "Referral Reward 🎉",
                message
              );
            } else {
              await sendReferralRewardEmail(
                referrer.email,
                fullName,
                referrer.walletBalance
              );
            }
          } else {
            console.error("Referrer not found");
          }
        }

        if (updatedOrder.freeDelivery) {
          await CompanyRevenue.findOneAndUpdate(
            {},
            {
              $inc: {
                freedelivery: Number(updatedOrder.deliveryFee),
                balance: -Number(updatedOrder.deliveryFee),
              },
            },
            { new: true, upsert: true }
          );
        }

        // Add service fee separately to company revenue balance
        await CompanyRevenue.findOneAndUpdate(
          {},
          {
            $inc: {
              balance: Number(updatedOrder.serviceFee),
            },
          },
          { new: true, upsert: true }
        );

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
              `A new order for ${updatedOrder.storeId.title} on ${nigerianTime} | ${updatedOrder.storeId.owner?.phone}.`
            );
            await adminEmailNotification(updatedOrder);

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
        const storeSocketId = userSocketMap[storeId];

        if (storeSocketId) {
          io.to(storeSocketId).emit("newOrder", updatedOrder);
        }
      } else {
        res
          .status(400)
          .json({ status: false, message: "Payment verification failed" });
      }
    } catch (error) {
      res.status(500).json({ status: false, message: error.message });
    }
  },

  verifyWalletPayment: async (req, res) => {
    const {
      orderId,
      storeId,
      senderId,
      referredBy,
      storeType,
      walletAmountUsed,
    } = req.body;

    try {
      await Order.findByIdAndUpdate(orderId, {
        paymentStatus: "Completed",
        paymentMethod: "wallet",
      });

      if (walletAmountUsed > 0) {
        const user = await User.findById(senderId);
        if (user) {
          user.walletBalance -= walletAmountUsed;
          await user.save();
        }
      }

      const updatedOrder = await Order.findById(orderId)
        .select(
          "userId deliveryAddress orderItems deliveryFee storeId storeType orderStatus storeCoords recipientCoords paymentStatus orderDate storeSecretCode riderSecretCode updatedAt freeDelivery serviceFee orderTotal grandTotal"
        )
        .populate({
          path: "userId",
          select: "phone profile firstName lastName",
        })
        .populate({
          path: "storeId",
          select: "title imageUrl logoUrl time",
          populate: {
            path: "owner",
            select: "expoPushToken firstName lastName phone email",
          },
        })
        .populate({
          path: "orderItems.productId",
          select: "title imageUrl time",
        })
        .populate({
          path: "deliveryAddress",
          select: "addressLine1 latitude longitude deliveryInstructions",
        });
      const storeOwnerPushToken = updatedOrder.storeId.owner?.expoPushToken;

      const storeOwnerEmail = updatedOrder.storeId.owner?.email;

      if (storeOwnerPushToken) {
        await sendPushNotification(
          [storeOwnerPushToken],
          "New Order Request 🚀",
          "You have received a new order! Open the app to view the details and start preparing."
        );
      } else {
        await sendNewOrderNotificationEmail(
          storeOwnerEmail,
          updatedOrder.storeId.title
        );
      }

      if (referredBy) {
        const referrer = await User.findById(referredBy);
        if (referrer) {
          referrer.walletBalance += 500;
          await referrer.save();

          await CompanyRevenue.findOneAndUpdate(
            {},
            { $inc: { referral: 1000, balance: -1000 } },
            { new: true, upsert: true }
          );

          const fullName = `${referrer.firstName}`;

          if (referrer.expoPushToken) {
            const message = `${fullName}, your Sprin app referral code was used by someone! ₦500 has been added to your wallet, bringing your total wallet balance to ₦${referrer.walletBalance}. You can use it to pay for an order at any time.`;

            await sendPushNotification(
              [referrer.expoPushToken],
              "Referral Reward 🎉",
              message
            );
          } else {
            await sendReferralRewardEmail(
              referrer.email,
              fullName,
              referrer.walletBalance
            );
          }
        } else {
          console.error("Referrer not found");
        }
      }

      if (updatedOrder.freeDelivery) {
        await CompanyRevenue.findOneAndUpdate(
          {},
          {
            $inc: {
              freedelivery: Number(updatedOrder.deliveryFee),
              balance: -Number(updatedOrder.deliveryFee),
            },
          },
          { new: true, upsert: true }
        );
      }

      // Add service fee separately to company revenue balance
      await CompanyRevenue.findOneAndUpdate(
        {},
        {
          $inc: {
            balance: Number(updatedOrder.serviceFee),
          },
        },
        { new: true, upsert: true }
      );

      let adminPushTokens = [];
      try {
        adminPushTokens = (await getAdminPushTokens()) || [];
      } catch (error) {
        console.error("Error fetching admin push tokens:", error.message);
      }

      console.log("order date: ", updatedOrder.orderDate);

      if (adminPushTokens.length > 0) {
        try {
          const nigerianTime = convertToNigerianTime(updatedOrder.orderDate);
          await sendPushNotification(
            adminPushTokens,
            "Admin Notification - New Restaurant Order",
            `A new order for ${updatedOrder.storeId.title} on ${nigerianTime} | ${updatedOrder.storeId.owner?.phone}.`
          );
          await adminEmailNotification(updatedOrder);
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
      const storeSocketId = userSocketMap[storeId];

      console.log("store Id", storeId);

      if (storeSocketId) {
        console.log("emitting recieveOrder event to the store", storeId);
        io.to(storeSocketId).emit("newOrder", updatedOrder);
      } else {
        console.log("store socekt ID not found");
      }
    } catch (error) {
      res.status(500).json({ status: false, message: error });
    }
  },

  placeOrder: async (req, res) => {
    try {
      const { storeId, storeType, orderItems, orderTotal } = req.body;

      // Check if orderTotal is below 1000
      if (orderTotal < 2000) {
        return res.status(400).json({
          status: false,
          message:
            "The minimum order amount is ₦1,000. You cannot place an order below this amount. Please add more items to your cart to meet the minimum order requirement.",
        });
      }

      // Fetch the store based on storeId and storeType
      let store;
      if (storeType === "Restaurant") {
        store = await Restaurant.findById(storeId);
      } else if (storeType === "GroceryStore") {
        store = await GroceryStore.findById(storeId); // Replace with the actual model for grocery stores
      }

      // Check if the store exists
      if (!store) {
        return res.status(404).json({
          status: false,
          message: `${storeType} not found`,
        });
      }

      const userAddress = await Address.findOne({
        userId: req.body.userId,
        default: true,
      });
      if (!userAddress) {
        return res.status(404).json({
          status: false,
          message:
            "Default delivery address not found. Please set a default delivery address to proceed",
        });
      }

      const { latitude: userLat, longitude: userLng } = userAddress;

      const { coords } = store;

      // Validate if coords is an object and contains latitude and longitude
      if (
        !coords ||
        typeof coords.latitude !== "number" ||
        typeof coords.longitude !== "number"
      ) {
        return res.status(400).json({
          status: false,
          message: "Invalid store coordinates.",
        });
      }

      const { latitude: storeLat, longitude: storeLng } = coords;

      // Function to calculate distance in KM using Haversine formula
      function calculateDistance(lat1, lon1, lat2, lon2) {
        const R = 6371; // Radius of the Earth in KM
        const dLat = degreesToRadians(lat2 - lat1);
        const dLon = degreesToRadians(lon2 - lon1);
        const a =
          Math.sin(dLat / 2) * Math.sin(dLat / 2) +
          Math.cos(degreesToRadians(lat1)) *
            Math.cos(degreesToRadians(lat2)) *
            Math.sin(dLon / 2) *
            Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c; // Distance in KM
      }

      function degreesToRadians(degrees) {
        return (degrees * Math.PI) / 180;
      }

      const distance = calculateDistance(userLat, userLng, storeLat, storeLng);
      if (distance > 10) {
        return res.status(400).json({
          status: false,
          message:
            "The store is too far from your delivery address. Please choose a closer store.",
        });
      }

      // Check if the store is active and available
      if (!store.isActive) {
        return res.status(400).json({
          status: false,
          message: `${storeType} is closed`,
        });
      }

      if (!store.isAvailable) {
        return res.status(400).json({
          status: false,
          message: `${storeType} is currently not accepting orders. Please try again later.`,
        });
      }

      // Validate order items
      if (!orderItems || orderItems.length === 0) {
        return res.status(400).json({
          status: false,
          message: "No items in the order.",
        });
      }

      // Check availability of products (Food or Grocery)
      const productIds = orderItems.map((item) => item.productId);
      let products = [];
      if (storeType === "Restaurant") {
        products = await Food.find({ _id: { $in: productIds } });
      } else if (storeType === "GroceryStore") {
        products = await Grocery.find({ _id: { $in: productIds } });
      }

      const unavailableProducts = products
        .filter((product) => !product.isAvailable)
        .map((product) => product.title);

      if (unavailableProducts.length > 0) {
        if (orderItems.length === 1) {
          // Single item order
          return res.status(400).json({
            status: false,
            message: `The item '${unavailableProducts[0]}' is not available at the moment. Please try again later.`,
          });
        } else if (unavailableProducts.length === 1) {
          // Multiple items with one unavailable
          return res.status(400).json({
            status: false,
            message: `The item '${unavailableProducts[0]}' is not available at the moment. Please remove it from your cart to proceed.`,
          });
        } else {
          // Multiple items with multiple unavailable
          return res.status(400).json({
            status: false,
            message: `The following items are not available: ${unavailableProducts.join(
              ", "
            )}. Please remove them from your cart to proceed.`,
          });
        }
      }

      // Create order
      const order = new Order({
        ...req.body,
        storeSecretCode: generateSecretCode(),
        riderSecretCode: generateSecretCode(),
      });

      await order.save();

      let adminPushTokens = [];
      try {
        adminPushTokens = (await getAdminPushTokens()) || [];
      } catch (error) {
        console.error("Error fetching admin push tokens:", error.message);
      }

      if (adminPushTokens.length > 0) {
        try {
          const nigerianTime = convertToNigerianTime(order.createdAt);
          await sendPushNotification(
            adminPushTokens,
            "Admin Notification - Pending Payment",
            `Order placed but pending payment on ${nigerianTime}.`
          );
          console.log("Admin notification sent successfully.");
        } catch (notificationError) {
          console.error(
            "Error sending admin notification:",
            notificationError.message
          );
        }
      }

      res.status(201).json({
        status: true,
        message: "Order placed successfully",
        data: order,
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({
        status: false,
        message:
          "An error occurred while placing the order. Please try again later.",
      });
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
      const orders = await Order.find({
        userId,
        paymentStatus: "Completed", // ✅ Only completed payments
      })
        .populate("storeId")
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
      const user = await User.findById(userId).select(
        "expoPushToken email firstName"
      );

      let updateFields = { orderStatus };
      const currentTime = new Date();
      const order = await Order.findById(orderId).populate({
        path: "storeId",
        select: "owner",
      });

      if (!order || !order.storeId) {
        return res
          .status(404)
          .json({ status: false, message: "Order or store not found" });
      }

      const isStoreOwner = order.storeId.owner.equals(modifierId);
      const rider = await Rider.findOne({ riderProfile: modifierId });
      const isAssignedRider = rider && rider._id.equals(order.assignedRider);

      if (!isStoreOwner && !isAssignedRider) {
        return res.status(403).json({
          status: false,
          message: "You are not authorized to update this order.",
        });
      }

      let statusMessages = "";

      switch (orderStatus) {
        case "Preparing":
          updateFields.preparingTime = currentTime;
          updateFields.progressSteps = 1;
          statusMessages = "Your order is now being prepared.";
          break;

        case "Ready":
          updateFields.readyTime = currentTime;
          updateFields.progressSteps = 2;
          statusMessages =
            "Your order is ready and has been assigned to a rider.";
          const assignResult = await module.exports.assignOrderToRider(
            orderId,
            req
          );
          if (
            !assignResult.status &&
            order.previouslyAssignedRiders?.length === 0
          ) {
            updateFields.orderStatus = "Ready";
          } else if (!assignResult.status) {
            return res.status(500).json(assignResult);
          }

          break;

        case "Rider Assigned":
          if (riderResponse === "accept") {
            updateFields.orderStatus = "Rider Accepted Order";
            updateFields.riderAcceptedTime = currentTime;
            updateFields.progressSteps = 3;
            statusMessages = "A rider has accepted your order.";
          } else if (riderResponse === "decline") {
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
          await processStorePayment(order);
          statusMessages = "Your order is out for delivery.";
          break;

        case "Arrived":
          updateFields.arrivalTime = currentTime;
          updateFields.progressSteps = 5;
          statusMessages = "Your order has arrived.";
          break;

        case "Delivered":
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

          if (order.assignedRider) {
            await Rider.findByIdAndUpdate(order.assignedRider, {
              isAvailable: true,
              assignedOrders: [],
            });
          }

          statusMessages =
            "Your order has been delivered. Thank you for choosing our service! 😎";

          const userOrders = await Order.find({ userId });
          if (userOrders.length === 1) {
            await sendFirstOrderThankYouEmail(user.email, user.firstName);
          }
          break;
      }

      // Check if user has a push token, else send an email
      if (user.expoPushToken) {
        await sendPushNotification(
          [user.expoPushToken],
          "Order Update",
          statusMessages
        );
      } else {
        await sendOrderUpdateEmail(user.email, user.firstName, statusMessages);
      }

      const updatedOrder = await Order.findByIdAndUpdate(
        orderId,
        updateFields,
        { new: true }
      )
        .populate("storeId")
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
            "Emitting receiveOrderStatus event to the customer",
            userId
          );
          io.to(customerSocketId).emit("newStatus", updatedOrder);
        } else {
          console.log("Client socket ID not found");
        }
      }
    } catch (error) {
      console.log(error);
      res.status(500).json({ status: false, error });
    }
  },

  assignOrderToRider: async (orderId, req) => {
    try {
      const order = await Order.findById(orderId).populate("storeId");
      if (!order) {
        throw new Error("Order not found");
      }

      const storeId = order.storeId._id;
      const storeType = order.storeType;

      // Find the store based on storeType
      const store =
        storeType === "Restaurant"
          ? await Restaurant.findById(storeId)
          : await GroceryStore.findById(storeId);

      if (!store) {
        throw new Error(`${storeType} not found`);
      }

      const storeLocation = store.location.coordinates;

      console.log(storeId, storeLocation);

      // Find the nearest available rider within a 5 km radius,
      // excluding previously assigned riders
      const availableRiders = await Rider.find({
        isAvailable: true,
        isActive: true,
        isTakingOrders: true,
        verification: "Verified",
        _id: { $nin: order.previouslyAssignedRiders || [] },
        point: {
          $near: {
            $geometry: { type: "Point", coordinates: storeLocation },
            $maxDistance: 5000, // 5 km radius
            $minDistance: 0,
          },
        },
      }).limit(1);

      console.log("Available rider: ", availableRiders);

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

      console.log("Assigned Rider: ", assignedRider);

      // Assign rider to order and update status
      await Order.findByIdAndUpdate(
        order._id,
        {
          assignedRider: assignedRider._id,
          orderStatus: "Rider Assigned",
          riderAssignedTime: new Date(),
        },
        { new: true }
      );

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
          "userId deliveryAddress orderItems deliveryFee storeId orderStatus storeType recipientCoords paymentStatus orderDate storeSecretCode riderSecretCode updatedAt assignedRider readyTime riderAssignedTime riderAcceptedTime inTransitTime arrivalTime deliveryTime progressSteps"
        )
        .populate({
          path: "assignedRider",
          select: "vehicleType vehicleBrand plateNumber imageUrl point",
          populate: {
            path: "riderProfile",
            select: "phone firstName lastName email expoPushToken",
          },
        })
        .populate({
          path: "userId",
          select: "phone profile firstName lastName email",
        })
        .populate({
          path: "storeId",
          select: "title imageUrl logoUrl location coords",
          populate: {
            path: "owner",
            select: "phone firstName lastName email",
          },
        })
        .populate({
          path: "orderItems.productId",
          select: "title imageUrl time",
        })
        .populate({
          path: "deliveryAddress",
          select:
            "addressLine1 latitude longitude postalCode deliveryInstructions",
        });

      const { userSocketMap, io } = req;
      const riderSocketId = userSocketMap[assignedRider._id];

      console.log("Rider ID", assignedRider._id);

      if (riderSocketId) {
        console.log(
          "Emitting receiveRiderOrder event to the rider",
          assignedRider._id
        );
        io.to(riderSocketId).emit("newRiderOrder", parcels);
      } else {
        console.log("Rider socket ID not found");
      }

      const parcel = parcels[0];

      const riderPushToken = parcel?.assignedRider?.riderProfile?.expoPushToken;

      console.log("assigned rider details: ", parcel.assignedRider);

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
          const nigerianTime = convertToNigerianTime(parcel.orderDate);
          await sendPushNotification(
            "Admin Notification - New Rider Order",
            `A new order for ${parcel.assignedRider.riderProfile.firstName} on ${nigerianTime} | ${parcel.assignedRider.riderProfile.phone}.`
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
    } else if (req.query.status === "cancelled") {
      status = "Cancelled";
    } else if (req.query.status === "ready") {
      status = ["Ready", "Rider Accepted Order", "Rider Assigned"];
    } else if (req.query.status === "out_for_delivery") {
      status = ["Out for Delivery", "Arrived"];
    } else if (req.query.status === "delivered") {
      status = "Delivered";
    }

    try {
      const orders = await Order.find({
        orderStatus: Array.isArray(status) ? { $in: status } : status,
        storeId: req.params.id,
        $or: [{ paymentStatus: "Completed" }, { paymentStatus: "Pending" }],
      })
        .select(
          "userId deliveryAddress orderItems deliveryFee storeId storeType orderStatus paymentStatus orderDate storeSecretCode riderSecretCode updatedAt assignedRider readyTime riderAssignedTime riderAcceptedTime inTransitTime arrivalTime deliveryTime progressSteps"
        )
        .populate({
          path: "assignedRider",
          select: "vehicleType vehicleBrand plateNumber imageUrl point",
        })
        .populate({ path: "userId", select: "phone profile" })
        .populate({
          path: "storeId",
          select: "title imageUrl logoUrl time",
          model: req.query.storeType,
        })
        .populate({
          path: "orderItems.productId",
          select: "title imageUrl time",
          model: "Food",
        })
        .populate({
          path: "orderItems.productId",
          select: "title imageUrl",
          model: "Grocery",
        })
        .populate({
          path: "deliveryAddress",
          select: "addressLine1 latitude longitude",
        });

      res.status(200).json(orders);
    } catch (error) {
      res.status(500).json({
        status: false,
        message: "Error retrieving orders",
        error: error.message,
      });
    }
  },

  getRiderOrdersList: async (req, res) => {
    const riderProfile = req.user.id;

    try {
      const rider = await Rider.findOne({ riderProfile: riderProfile });
      if (!rider) {
        return res
          .status(404)
          .json({ status: false, message: "Rider profile not found" });
      }

      const orders = await Order.find({
        orderStatus: { $nin: ["Placed", "Preparing", "Delivered"] },
        assignedRider: rider._id,
        paymentStatus: "Completed",
      })
        .select(
          "userId deliveryAddress orderItems deliveryFee storeId storeType orderStatus paymentStatus orderDate storeSecretCode riderSecretCode updatedAt assignedRider readyTime riderAssignedTime riderAcceptedTime inTransitTime arrivalTime deliveryTime progressSteps"
        )
        .populate({
          path: "assignedRider",
          select: "vehicleType vehicleBrand plateNumber imageUrl point",
        })
        .populate({
          path: "userId",
          select: "phone profile firstName lastName email",
        })
        .populate({
          path: "storeId",
          select: "title imageUrl logoUrl location coords owner",
          populate: {
            path: "owner",
            select: "firstName lastName email phone profile",
          },
        })
        .populate({
          path: "orderItems.productId",
          select: "title imageUrl time",
          model: "Food",
        })
        .populate({
          path: "orderItems.productId",
          select: "title imageUrl",
          model: "Grocery",
        })
        .populate({
          path: "deliveryAddress",
          select:
            "addressLine1 latitude longitude postalCode deliveryInstructions",
        });

      res.status(200).json(orders);
    } catch (error) {
      res.status(500).json({
        status: false,
        message: "Error retrieving orders",
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
          path: "orderItems.productId",
          select: "rating ratingCount imageUrl title description",
        })
        .populate({
          path: "storeId",
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
          productId: item.productId._id,
          itemType: item.itemType,
          imageUrl: item.productId.imageUrl,
          title: item.title,
          price: item.price,
          quantity: item.quantity,
          time: item.time || "",
          additives: item.additives || [],
          instructions: item.instructions || "",
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
        storeId: {
          __v: order.storeId.__v,
          _id: order.storeId._id,
          closingTime: order.storeId.closingTime,
          code: order.storeId.code,
          coords: order.storeId.coords,
          createdAt: order.storeId.createdAt,
          delivery: order.storeId.delivery,
          foods: order.storeId.foods,
          imageUrl: order.storeId.imageUrl,
          isAvailable: order.storeId.isAvailable,
          location: order.storeId.location,
          logoUrl: order.storeId.logoUrl,
          openingTime: order.storeId.openingTime,
          owner: order.storeId.owner,
          pickup: order.storeId.pickup,
          rating: order.storeId.rating,
          ratingCount: order.storeId.ratingCount,
          storeDoc: order.storeId.storeDoc || "", // Assuming this field may not always be present
          title: order.storeId.title,
          updatedAt: order.storeId.updatedAt,
          verification: order.storeId.verification,
          verificationMessage: order.storeId.verificationMessage,
        },
        storeSecretCode: order.storeSecretCode || "",
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
