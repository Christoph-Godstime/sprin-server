const axios = require("axios");
const User = require("../models/User"); // Import User model

exports.createPaymentLink = async (
  orderId,
  userId,
  remainingBalance,
  referredBy
) => {
  try {
    const user = await User.findById(userId);
    if (!user) return null;

    const paystackData = {
      email: user.email,
      amount: remainingBalance * 100, // Convert NGN to kobo
      currency: "NGN",
      reference: `${orderId}-${Date.now()}`, // Unique reference
      callback_url: `https://sprin-server.onrender.com/payment-success`,
      metadata: {
        custom_fields: [
          {
            display_name: "Full Name",
            variable_name: "full_name",
            value: `${user?.firstName} ${user?.lastName}`,
          },
          {
            display_name: "Mobile Number",
            variable_name: "mobile",
            value: user?.phoneNumber,
          },
          {
            display_name: "Order Type",
            variable_name: "order_type",
            value: "Order balance payment",
          },
        ],
        orderId,
        senderId: userId,
        referredBy: referredBy || null,
      },
    };

    const response = await axios.post(
      "https://api.paystack.co/transaction/initialize",
      paystackData,
      {
        headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}` },
      }
    );

    return response.data.status ? response.data.data.authorization_url : null;
  } catch (error) {
    console.error("Error creating payment link:", error.message);
    return null;
  }
};

// exports.paystackWebhook = async (req, res) => {
//     try {
//       // **1. Verify Paystack Webhook Signature**
//       const secret = process.env.PAYSTACK_SECRET_KEY;
//       const hash = crypto
//         .createHmac("sha512", secret)
//         .update(JSON.stringify(req.body))
//         .digest("hex");

//       if (hash !== req.headers["x-paystack-signature"]) {
//         return res
//           .status(401)
//           .json({ status: false, message: "Unauthorized webhook" });
//       }

//       // **2. Extract Payment Data**
//       const event = req.body;
//       if (event.event !== "charge.success") {
//         return res
//           .status(400)
//           .json({ status: false, message: "Invalid event type" });
//       }

//       const { reference, metadata } = event.data;
//       const { orderId, storeId, referredBy } = metadata;

//       // Check if paymentStatus is already "Completed"
//       const existingOrder = await Order.findById(orderId);
//       if (!existingOrder) {
//         return res
//           .status(404)
//           .json({ status: false, message: "Order not found" });
//       }
//       if (existingOrder.paymentStatus === "Completed") {
//         return res.status(200).send();
//       }

//       // **3. Verify Payment with Paystack API**
//       const response = await axios.get(
//         `https://api.paystack.co/transaction/verify/${reference}`,
//         {
//           headers: {
//             Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
//           },
//         }
//       );

//       const { status, data } = response.data;
//       const transactionAmount = data.amount / 100; // Convert from kobo to Naira
//       const grandTotal = existingOrder.grandTotal;
//       const user = await User.findById(existingOrder.userId);

//       if (status === true) {
//         let newPaidAmount = (existingOrder.paidAmount || 0) + transactionAmount;
//         let remainingBalance = grandTotal - newPaidAmount;

//         if (newPaidAmount < grandTotal) {
//           await Order.findByIdAndUpdate(orderId, {
//             paymentStatus: "Partially Paid",
//             paidAmount: newPaidAmount,
//             remainingBalance: remainingBalance,
//           });

//           if (user) {
//             const paymentLink = await createPaymentLink(
//               orderId,
//               user._id,
//               remainingBalance,
//               referredBy
//             );

//             await sendPaymentIssueEmail(
//               user.email,
//               user.firstName,
//               orderId,
//               "underpay",
//               grandTotal,
//               newPaidAmount,
//               paymentLink
//             );
//           }

//           return res.status(200).json({
//             status: true,
//             message: `Payment of ₦${transactionAmount} received. ₦${remainingBalance} remaining.`,
//           });
//         }

//         await Order.findByIdAndUpdate(orderId, { paymentStatus: "Completed" });

//         res.status(200).send();

//         const updatedOrder = await Order.findById(orderId)
//           .select(
//             "userId deliveryAddress orderItems deliveryFee storeId storeType orderStatus storeCoords recipientCoords paymentStatus orderDate storeSecretCode riderSecretCode updatedAt freeDelivery serviceFee"
//           )
//           .populate({ path: "userId", select: "phone profile" })
//           .populate({
//             path: "storeId",

//             select: "title imageUrl logoUrl time",
//             populate: {
//               path: "owner",

//               select: "expoPushToken firstName lastName phone",
//             },
//           })
//           .populate({
//             path: "orderItems.productId",
//             select: "title imageUrl time",
//           })
//           .populate({
//             path: "deliveryAddress",
//             select: "addressLine1 latitude longitude",
//           });

//         const storeOwnerPushToken = updatedOrder.storeId.owner?.expoPushToken;

//         if (storeOwnerPushToken) {
//           await sendPushNotification(
//             [storeOwnerPushToken],
//             "New Order Request 🚀",
//             "You have received a new order! Open the app to view the details and start preparing."
//           );
//         } else {
//           console.error("Store owner's expoPushToken not found.");
//         }

//         if (newPaidAmount > grandTotal) {
//           const excessAmount = newPaidAmount - grandTotal;
//           await Order.findByIdAndUpdate(orderId, {
//             overPaidAmount: excessAmount,
//             paymentStatus: "Completed",
//             paidAmount: grandTotal,
//             remainingBalance: 0,
//           });

//           if (user) {
//             user.walletBalance += excessAmount;
//             await user.save();

//             await sendPaymentIssueEmail(
//               user.email,
//               user.firstName,
//               orderId,
//               "overpay",
//               grandTotal,
//               newPaidAmount
//             );
//           }
//         }

//         if (referredBy) {
//           const referrer = await User.findById(referredBy);
//           if (referrer) {
//             referrer.walletBalance += 500;
//             await referrer.save();

//             await CompanyRevenue.findOneAndUpdate(
//               {},
//               { $inc: { referral: 1000, balance: -1000 } },
//               { new: true, upsert: true }
//             );

//             if (referrer.expoPushToken) {
//               const fullName = `${referrer.firstName} ${referrer.lastName}`;
//               const message = `${fullName}, your Sprin app referral code has been used by someone! ₦500 has been added to your wallet, bringing your total wallet balance to ₦${referrer.walletBalance}. You can use it to pay for an order at any time.`;

//               await sendPushNotification(
//                 [referrer.expoPushToken],
//                 "Referral Reward 🎉",
//                 message
//               );
//             } else {
//               console.error("Referrer's expoPushToken not found.");
//             }
//           } else {
//             console.error("Referrer not found");
//           }
//         }

//         if (updatedOrder.freeDelivery) {
//           await CompanyRevenue.findOneAndUpdate(
//             {},
//             {
//               $inc: {
//                 freedelivery: Number(updatedOrder.deliveryFee),
//                 balance: -Number(updatedOrder.deliveryFee),
//               },
//             },
//             { new: true, upsert: true }
//           );
//         }

//         // Add service fee separately to company revenue balance
//         await CompanyRevenue.findOneAndUpdate(
//           {},
//           {
//             $inc: {
//               balance: Number(updatedOrder.serviceFee),
//             },
//           },
//           { new: true, upsert: true }
//         );

//         let adminPushTokens = [];
//         try {
//           adminPushTokens = (await getAdminPushTokens()) || [];
//         } catch (error) {
//           console.error("Error fetching admin push tokens:", error.message);
//         }

//         if (adminPushTokens.length > 0) {
//           try {
//             const nigerianTime = convertToNigerianTime(updatedOrder.orderDate);
//             await sendPushNotification(
//               adminPushTokens,
//               "Admin Notification - New Restaurant Order",
//               `A new order for ${updatedOrder.storeId.title} on ${nigerianTime} | ${updatedOrder.storeId.owner?.phone}.`
//             );
//             console.log("Admin notification sent successfully.");
//           } catch (notificationError) {
//             console.error(
//               "Error sending admin notification:",
//               notificationError.message
//             );
//           }
//         }

//         const { userSocketMap, io } = req;
//         const storeSocketId = userSocketMap[storeId];

//         if (storeSocketId) {
//           io.to(storeSocketId).emit("newOrder", updatedOrder);
//         }
//       }
//     } catch (error) {
//       console.error("Webhook Error:", error.message);
//       res.status(500).json({ status: false, message: error.message });
//     }
//   };
