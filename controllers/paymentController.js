const Payment = require("../models/Payment");
const PayoutRequest = require("../models/payoutRequest");
const PaymentHistory = require("../models/PaymentHistory");
const BankDetails = require("../models/BankDetails");
const sendPayoutApprovalEmail = require("../utils/email_payoutApproval");
const generateOtp = require("../utils/otp_generator");
const sendBankDetailsEmail = require("../utils/email_bankDetails");
const sendPushNotification = require("../utils/sendPushNotification");
const { getAdminPushTokens } = require("../utils/adminPushTokens");

module.exports = {
  requestPayout: async (req, res) => {
    const { restaurantId, bankName, accountNumber, accountName, email } =
      req.body;

    try {
      const payment = await Payment.findOne({ restaurantId });

      if (!payment) {
        return res.status(404).json({
          status: false,
          message: "No payment records found for this restaurant.",
        });
      }

      // Check if unpaid wallet balance is empty
      if (
        payment.unpaid.totalOrders === 0 &&
        payment.unpaid.withdrawable === 0 &&
        payment.unpaid.commission === 0
      ) {
        return res.status(400).json({
          status: false,
          message:
            "Your unpaid wallet balance is empty. No payout can be requested.",
        });
      }

      if (payment.unpaid.withdrawable < 1000) {
        return res.status(400).json({
          status: false,
          message:
            "You can only request a payout when your unpaid withdrawable earnings are above ₦1,000.",
        });
      }

      // Calculate the amount to be requested based on unpaid values
      const amountToRequest = payment.unpaid.withdrawable;
      const orderNumber = payment.unpaid.totalOrders;
      const commissionAmount = payment.unpaid.commission;

      // Create payout request
      const payoutRequest = new PayoutRequest({
        restaurantId,
        bankName,
        accountNumber,
        accountName,
        amount: amountToRequest,
        orderNumber: orderNumber,
        commissionAmount: commissionAmount,
        status: "Pending",
        email,
      });

      // Move unpaid values to pending (for this specific request)
      payment.pending.totalOrders += payment.unpaid.totalOrders;
      payment.pending.withdrawable += amountToRequest;
      payment.pending.commission += payment.unpaid.commission;

      // Reset unpaid values
      payment.unpaid.totalOrders = 0;
      payment.unpaid.withdrawable = 0;
      payment.unpaid.commission = 0;

      await payoutRequest.save();
      await payment.save();

      // Create payment history entry
      const paymentHistory = new PaymentHistory({
        restaurantId,
        amount: amountToRequest,
        status: "Pending",
        paymentMethod: "Bank Transfer",
        bankDetails: {
          bankName,
          accountNumber,
          accountName,
        },
        orderNumber: orderNumber, // Add order number to payment history
        commissionAmount: commissionAmount, // Add commission amount to payment history

        requestedAt: new Date(),
      });

      await paymentHistory.save();

      let adminPushTokens = [];
      try {
        adminPushTokens = (await getAdminPushTokens()) || [];
      } catch (error) {
        console.error("Error fetching admin push tokens:", error.message);
      }

      // Send push notifications to admins
      if (adminPushTokens.length > 0) {
        try {
          const nigerianTime = new Date().toLocaleString("en-NG", {
            timeZone: "Africa/Lagos",
          });
          await sendPushNotification(
            adminPushTokens,
            "Admin Notification - New Payout Request",
            `A new payout request has been made by restaurant ID: ${restaurantId}, Account name: ${accountName} on ${nigerianTime}.`
          );
          console.log("Admin notification sent successfully.");
        } catch (notificationError) {
          console.error(
            "Error sending admin notification:",
            notificationError.message
          );
        }
      }

      res.status(200).json({
        status: true,
        message: "Payout request submitted successfully",
        data: payoutRequest,
      });
    } catch (error) {
      res.status(500).json({
        status: false,
        message: "An error occurred while requesting payout.",
        error: error.message,
      });
    }
  },

  getPaymentHistory: async (req, res) => {
    const { restaurantId } = req.params;

    try {
      // Find all payment history records for the restaurant
      const paymentHistory = await PaymentHistory.find({ restaurantId })
        .sort({ requestedAt: -1 }) // Sort by requestedAt in descending order
        .exec();

      if (paymentHistory.length === 0) {
        return res.status(404).json({
          status: false,
          message: "No payment history found for this restaurant.",
        });
      }

      res.status(200).json({
        status: true,
        message: "Payment history retrieved successfully",
        data: paymentHistory,
      });
    } catch (error) {
      res.status(500).json({
        status: false,
        message: "An error occurred while retrieving payment history.",
        error: error.message,
      });
    }
  },

  getPaymentDetails: async (req, res) => {
    const { restaurantId } = req.params; // Assuming req.user contains the restaurant's details

    try {
      // Find the payment details for the restaurant
      const paymentDetails = await Payment.findOne({ restaurantId });

      if (!paymentDetails) {
        return res.status(404).json({
          status: false,
          message: "No earnings found for this restaurant.",
        });
      }

      res.status(200).json({
        status: true,
        message: "Payment details retrieved successfully",
        data: paymentDetails,
      });
    } catch (error) {
      res.status(500).json({
        status: false,
        message: "An error occurred while retrieving payment details.",
        error: error.message,
      });
    }
  },

  getBankDetails: async (req, res) => {
    const { restaurantId } = req.params;

    try {
      const bankDetails = await BankDetails.findOne({ restaurantId });

      if (!bankDetails) {
        return res.status(200).json({
          status: true,
          message: "No bank details found for this restaurant.",
          data: null, // Set data to null to indicate no details are found
        });
      }

      res.status(200).json({
        status: true,
        message: "Bank details retrieved successfully.",
        data: bankDetails,
      });
    } catch (error) {
      res.status(500).json({
        status: false,
        message: "An error occurred while retrieving bank details.",
        error: error.message,
      });
    }
  },

  updateBankDetails: async (req, res) => {
    const { restaurantId, bankName, accountNumber, accountName, email } =
      req.body;

    try {
      let bankDetails = await BankDetails.findOne({ restaurantId });

      if (!bankDetails) {
        bankDetails = new BankDetails({
          restaurantId,
          bankName,
          accountNumber,
          accountName,
          email,
        });
      } else {
        bankDetails.bankName = bankName;
        bankDetails.accountNumber = accountNumber;
        bankDetails.accountName = accountName;
        bankDetails.email = email;
        bankDetails.confirmed = false; // Reset confirmed status on update
      }

      // Generate a confirmation code
      const confirmationCode = generateOtp();
      bankDetails.confirmationCode = confirmationCode;

      await bankDetails.save();

      // Send the confirmation code to the user's email
      await sendBankDetailsEmail(email, confirmationCode);

      res.status(200).json({
        status: true,
        message:
          "A confirmation code has been sent to your email. Please use the OTP to complete your bank details update",
      });
    } catch (error) {
      res.status(500).json({
        status: false,
        message: "An error occurred while updating bank details.",
        error: error.message,
      });
    }
  },

  confirmBankDetails: async (req, res) => {
    const { restaurantId, confirmationCode } = req.body;

    try {
      const bankDetails = await BankDetails.findOne({ restaurantId });

      if (!bankDetails) {
        return res.status(404).json({
          status: false,
          message: "Bank details not found for this restaurant.",
        });
      }

      // Verify the confirmation code
      if (bankDetails.confirmationCode !== confirmationCode) {
        return res.status(400).json({
          status: false,
          message: "Invalid confirmation code.",
        });
      }

      // Update the confirmation status
      bankDetails.confirmed = true;
      bankDetails.confirmationCode = null; // Clear the confirmation code after successful confirmation

      await bankDetails.save();

      res.status(200).json({
        status: true,
        message: "Bank details confirmed successfully.",
      });
    } catch (error) {
      res.status(500).json({
        status: false,
        message: "An error occurred while confirming bank details.",
        error: error.message,
      });
    }
  },
};
