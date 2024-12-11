const User = require("../models/User");
const DeleteRequest = require("../models/DeleteRequest");
const generateOtp = require("../utils/otp_generator");
const sendVerificationEmail = require("../utils/email_verification");
const CryptoJS = require("crypto-js");
const ContactUs = require("../models/ContactUs");
const sendPushNotification = require("../utils/sendPushNotification");
const { getAdminPushTokens } = require("../utils/adminPushTokens");

const twilio = require("twilio");
const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

module.exports = {
  updateUser: async (req, res) => {
    if (!req.body.firstName) {
      return res
        .status(400)
        .json({ status: false, message: "First name is required" });
    }
    if (!req.body.lastName) {
      return res
        .status(400)
        .json({ status: false, message: "Last name is required" });
    }
    if (!req.body.email) {
      return res
        .status(400)
        .json({ status: false, message: "Email is required" });
    }
    if (!req.body.phone) {
      return res
        .status(400)
        .json({ status: false, message: "Phone number is required" });
    }

    if (req.body.password) {
      req.body.password = CryptoJS.AES.encrypt(
        req.body.password,
        process.env.SECRET
      ).toString();
    }

    try {
      const updatedUser = await User.findByIdAndUpdate(
        req.user.id,
        {
          $set: req.body,
        },
        { new: true }
      );
      const { password, __v, createdAt, ...others } = updatedUser._doc;

      res.status(200).json({ ...others });
    } catch (err) {
      res.status(500).json({ status: false, message: err.message });
    }
  },

  deleteUser: async (req, res) => {
    try {
      await User.findByIdAndDelete(req.user.id);
      res.status(200).json("Successfully Deleted");
    } catch (error) {
      res.status(500).json({ status: false, message: error.message });
    }
  },

  requestDeleteUser: async (req, res) => {
    try {
      const { email, message } = req.body;

      // Check if email is provided
      if (!email) {
        return res.status(400).json({ message: "Email is required" });
      }

      // Check if the email exists in the User collection
      const user = await User.findOne({ email });
      if (!user) {
        return res
          .status(404)
          .json({ message: "User with this email does not exist" });
      }

      // Save the delete request to the DeleteRequest collection
      const deleteRequest = new DeleteRequest({
        userId: user._id,
        email,
        message,
      });

      await deleteRequest.save();

      return res
        .status(200)
        .json({ message: "Delete request submitted successfully" });
    } catch (error) {
      console.error("Error in delete request:", error);
      return res
        .status(500)
        .json({ message: "An error occurred. Please try again later." });
    }
  },

  getUser: async (req, res) => {
    try {
      const user = await User.findById(req.user.id);
      const { password, __v, createdAt, ...userdata } = user._doc;
      res.status(200).json(userdata);
    } catch (error) {
      res.status(500).json({ status: false, message: error.message });
    }
  },

  getAllUsers: async (req, res) => {
    try {
      const allUser = await User.find();

      res.status(200).json(allUser);
    } catch (error) {
      res.status(500).json({ status: false, message: error.message });
    }
  },

  verifyAccount: async (req, res) => {
    const providedOtp = req.params.otp;
    const { email } = req.body; // Assuming email is sent in the body of the request

    try {
      const user = await User.findOne({ email: email });

      if (!user) {
        return res
          .status(404)
          .json({ status: false, message: "User not found" });
      }

      // Check if the OTP matches
      if (user.otp !== providedOtp) {
        return res.status(400).json({
          status: false,
          message:
            "Email verification failed. Please cross-check the number sent to your email and try again.",
        });
      }

      // Check if the OTP has expired (e.g., valid for 5 minutes)
      const otpSentTime = new Date(user.lastEmailOtpSent);
      const currentTime = new Date();
      const timeElapsed = currentTime - otpSentTime;
      const otpExpirationTime = 10 * 60 * 1000; // 10 minutes in milliseconds

      if (timeElapsed > otpExpirationTime) {
        return res.status(400).json({
          status: false,
          message: "Email OTP has expired. Please request a new one.",
        });
      }

      // If the OTP is valid and not expired, mark the account as verified
      await User.findOneAndUpdate(
        { email: email },
        { verified: true, otp: "none" }, // Clear the OTP after verification
        { new: true }
      );

      const updatedUser = await User.findOne({ email: email });
      const { password, __v, otp, createdAt, ...others } = updatedUser._doc;

      return res.status(200).json({
        status: true,
        message: "Email verified successfully",
        ...others,
      });
    } catch (error) {
      res.status(500).json({ status: false, message: error.message });
    }
  },

  resendOtp: async (req, res) => {
    const { email } = req.body; // Assuming email is sent in the body of the request

    try {
      const user = await User.findOne({ email: email });

      if (!user) {
        return res
          .status(404)
          .json({ status: false, message: "User not found" });
      }

      // Check if the last email OTP was sent and if it was sent less than 5 minutes ago
      if (user.lastEmailOtpSent) {
        const timeSinceLastOtp = new Date() - new Date(user.lastEmailOtpSent);
        const threeMinutesInMs = 3 * 60 * 1000; // 3 minutes in milliseconds

        if (timeSinceLastOtp < threeMinutesInMs) {
          return res.status(400).json({
            status: false,
            message: "You can only request a new OTP after 3 minutes.",
          });
        }
      }

      // Generate a new OTP and save it
      const otp = generateOtp();
      user.otp = otp;
      user.lastEmailOtpSent = new Date(); // Update the last OTP sent timestamp
      await user.save();

      sendVerificationEmail(user.email, otp);

      res
        .status(200)
        .json({ status: true, message: "OTP has been resent to your email." });
    } catch (error) {
      res.status(500).json({ status: false, message: error.message });
    }
  },

  verifyPhoneNumber: async (req, res) => {
    const { email, otp } = req.body;

    try {
      // Find the user by email and get their phone number
      const user = await User.findOne({ email });
      if (!user) {
        return res
          .status(404)
          .json({ status: false, message: "User not found" });
      }

      const phone = user.phone;

      // Verify the OTP using Twilio Verify API
      const verificationCheck = await client.verify.v2
        .services(process.env.TWILIO_VERIFY_SERVICE_SID)
        .verificationChecks.create({ to: phone, code: otp });

      if (verificationCheck.status === "approved") {
        // Update phone verification status if OTP is valid
        user.phoneVerified = true;
        await user.save();

        return res.status(200).json({
          status: true,
          message: "Phone number verified successfully.",
        });
      } else if (verificationCheck.status === "expired") {
        return res.status(400).json({
          status: false,
          message: "Phone number OTP has expired. Please request a new OTP.",
        });
      } else {
        return res
          .status(400)
          .json({ status: false, message: "Invalid OTP. Please try again." });
      }
    } catch (error) {
      return res.status(500).json({ status: false, message: error.message });
    }
  },

  resendPhoneOtp: async (req, res) => {
    const { email } = req.body;

    try {
      // Find the user by email and get their phone number
      const user = await User.findOne({ email });
      if (!user) {
        return res
          .status(404)
          .json({ status: false, message: "User not found" });
      }

      // Check if an OTP was sent and if it was sent less than 5 minutes ago
      if (user.lastPhoneOtpSent) {
        // Updated field name
        const timeSinceLastOtp = new Date() - new Date(user.lastPhoneOtpSent);
        const threeMinutesInMs = 3 * 60 * 1000; // 3 minutes in milliseconds

        if (timeSinceLastOtp < threeMinutesInMs) {
          return res.status(400).json({
            status: false,
            message: "You can only request a new OTP after 3 minutes.",
          });
        }
      }

      // Send a new OTP via Twilio Verify API
      const phone = user.phone; // Extract phone number from the user document
      await client.verify.v2
        .services(process.env.TWILIO_VERIFY_SERVICE_SID)
        .verifications.create({ to: phone, channel: "sms" });

      // Update the `lastPhoneOtpSent` timestamp in the user document
      user.lastPhoneOtpSent = new Date(); // Updated field name
      await user.save();

      return res
        .status(200)
        .json({ status: true, message: "OTP has been resent to your phone." });
    } catch (error) {
      return res.status(500).json({ status: false, message: error.message });
    }
  },

  savePushToken: async (req, res) => {
    const { token } = req.body;
    const userId = req.user.id;
    try {
      const user = await User.findByIdAndUpdate(
        userId,
        { expoPushToken: token },
        { new: true }
      );

      if (!user) {
        return res
          .status(404)
          .json({ status: false, message: "User not found" });
      }

      res.status(200).json({
        status: true,
        message: "Push token saved successfully",
      });
    } catch (error) {
      res.status(500).json({ status: false, message: error.message });
    }
  },

  getPushToken: async (req, res) => {
    const userId = req.user.id;
    try {
      // Find user by ID
      const user = await User.findById(userId).select("expoPushToken"); // Adjust the fields as necessary

      // If user not found, return 404
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Return user details
      res.status(200).json({
        message: "User details fetched successfully",
        expoPushToken: user.expoPushToken, // Include the push token in the response
      });
    } catch (error) {
      res.status(500).json({ status: false, message: error.message });
    }
  },

  contactUs: async (req, res) => {
    try {
      const { firstName, lastName, email, phoneNumber, message } = req.body;

      // Validate required fields
      if (!firstName || !lastName || !email || !phoneNumber || !message) {
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

      const newRider = new ContactUs({
        firstName,
        lastName,
        email,
        phoneNumber,
        message,
      });

      await newRider.save();

      const adminPushTokens = await getAdminPushTokens();

      // Send push notification to admins
      if (adminPushTokens.length > 0) {
        await sendPushNotification(
          adminPushTokens,
          "Admin Notification - Customer Support Message",
          `A new customer support message has been submitted by ${firstName} ${lastName}.`
        );
      }

      return res.status(201).json({
        message: "Message sent successfully.",
      });
    } catch (error) {
      res.status(500).json({ status: false, message: error.message });
    }
  },
};
