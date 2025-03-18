const crypto = require("crypto");
const Order = require("../models/Orders");
const axios = require("axios");
const User = require("../models/User");
const CompanyRevenue = require("../models/CompanyRevenue");
const sendPushNotification = require("../utils/sendPushNotification");
const { getAdminPushTokens } = require("../utils/adminPushTokens");
const { convertToNigerianTime } = require("../utils/helper");

exports.paystackWebhook = async (req, res) => {
  try {
    // **1. Verify Paystack Webhook Signature**
    const secret = process.env.PAYSTACK_SECRET_KEY;
    const hash = crypto
      .createHmac("sha512", secret)
      .update(JSON.stringify(req.body))
      .digest("hex");

    console.log("hash: ", hash);

    if (hash !== req.headers["x-paystack-signature"]) {
      console.log("Unauthorized webhook");
      return res
        .status(401)
        .json({ status: false, message: "Unauthorized webhook" });
    }

    // **2. Extract Payment Data**
    const event = req.body;
    if (event.event !== "charge.success") {
      console.log("Invalid event type");
      return res
        .status(400)
        .json({ status: false, message: "Invalid event type" });
    }

    const { reference, metadata } = event.data;
    console.log("data: ", event.data);
    const { orderId, storeId, referredBy } = metadata;

    // Check if paymentStatus is already "Completed"
    const existingOrder = await Order.findById(orderId);
    if (!existingOrder) {
      return res
        .status(404)
        .json({ status: false, message: "Order not found" });
    }
    if (existingOrder.paymentStatus === "Completed") {
      return res.status(200).send();
    }

    // **3. Verify Payment with Paystack API**
    const response = await axios.get(
      `https://api.paystack.co/transaction/verify/${reference}`,
      {
        headers: {
          Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        },
      }
    );

    console.log("response: ", response);

    const { status, data } = response.data;

    if (status === true) {
      await Order.findByIdAndUpdate(orderId, { paymentStatus: "Completed" });

      res.status(200).send();

      const updatedOrder = await Order.findById(orderId)
        .select(
          "userId deliveryAddress orderItems deliveryFee storeId storeType orderStatus storeCoords recipientCoords paymentStatus orderDate storeSecretCode riderSecretCode updatedAt freeDelivery serviceFee"
        )
        .populate({ path: "userId", select: "phone profile" })
        .populate({
          path: "storeId",

          select: "title imageUrl logoUrl time",
          populate: {
            path: "owner",

            select: "expoPushToken firstName lastName phone",
          },
        })
        .populate({
          path: "orderItems.productId",
          select: "title imageUrl time",
        })
        .populate({
          path: "deliveryAddress",
          select: "addressLine1 latitude longitude",
        });

      const storeOwnerPushToken = updatedOrder.storeId.owner?.expoPushToken;

      if (storeOwnerPushToken) {
        await sendPushNotification(
          [storeOwnerPushToken],
          "New Order Request 🚀",
          "You have received a new order! Open the app to view the details and start preparing."
        );
      } else {
        console.error("Store owner's expoPushToken not found.");
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

          if (referrer.expoPushToken) {
            const fullName = `${referrer.firstName} ${referrer.lastName}`;
            const message = `${fullName}, your Sprin app referral code has been used by someone! ₦500 has been added to your wallet, bringing your total wallet balance to ₦${referrer.walletBalance}. You can use it to pay for an order at any time.`;

            await sendPushNotification(
              [referrer.expoPushToken],
              "Referral Reward 🎉",
              message
            );
          } else {
            console.error("Referrer's expoPushToken not found.");
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
          console.log("Admin notification sent successfully.");
        } catch (notificationError) {
          console.error(
            "Error sending admin notification:",
            notificationError.message
          );
        }
      }

      const { userSocketMap, io } = req;
      const storeSocketId = userSocketMap[storeId];

      if (storeSocketId) {
        io.to(storeSocketId).emit("newOrder", updatedOrder);
      }
    }
  } catch (error) {
    console.error("Webhook Error:", error.message);
    res.status(500).json({ status: false, message: error.message });
  }
};
