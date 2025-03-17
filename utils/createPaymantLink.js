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
