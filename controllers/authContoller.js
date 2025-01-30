const User = require("../models/User");
const Restaurant = require("../models/Restaurant");
const Rider = require("../models/Rider");
const GroceryStore = require("../models/GroceryStore");
const CryptoJS = require("crypto-js");
const jwt = require("jsonwebtoken");
const admin = require("firebase-admin");
const sendVerificationEmail = require("../utils/email_verification");
const sendResetPasswordEmail = require("../utils/email_resetPassword");
const generateOtp = require("../utils/otp_generator");
const {
  hash,
  verify,
  getRandomIntInclusive,
  capitalizeFirstLetter,
  decapitalize,
} = require("../utils/helper");

// const twilio = require("twilio");
// const client = twilio(
//   process.env.TWILIO_ACCOUNT_SID,
//   process.env.TWILIO_AUTH_TOKEN
// );

const generateReferralCode = async () => {
  let referralCode;
  let isUnique = false;

  while (!isUnique) {
    // Generate a random referral code
    referralCode = Math.random().toString(36).substring(2, 10).toUpperCase();

    // Check if the referral code already exists in the database
    const existingUser = await User.findOne({ referralCode });
    if (!existingUser) {
      isUnique = true; // The code is unique
    }
  }

  return referralCode;
};

module.exports = {
  createUser: async (req, res) => {
    const { email, phone, password, firstName, lastName } = req.body;

    try {
      if (!email || !phone || !password || !firstName || !lastName) {
        return res.status(400).json({
          status: false,
          message:
            "All fields (email, phone, password, first name, last name) are required.",
        });
      }

      // Validate phone number format
      const validatePhoneNumber = (phone) => /^\+[1-9]\d{1,14}$/.test(phone);
      if (!validatePhoneNumber(phone)) {
        return res.status(400).json({
          status: false,
          message:
            "Invalid phone number format. Use E.164 format (e.g., +2348012345678).",
        });
      }

      // Check if the email already exists
      const existingEmail = await User.findOne({ email });
      if (existingEmail) {
        return res
          .status(400)
          .json({ status: false, message: "Email is already registered." });
      }

      // Check if the phone number already exists
      const existingPhone = await User.findOne({ phone });
      if (existingPhone) {
        return res.status(400).json({
          status: false,
          message: "Phone number is already registered.",
        });
      }

      const otp = generateOtp();
      const referralCode = await generateReferralCode();

      const encryptedPassword = CryptoJS.AES.encrypt(
        password,
        process.env.SECRET
      ).toString();

      const newUser = new User({
        firstName: capitalizeFirstLetter(firstName),
        lastName: capitalizeFirstLetter(lastName),
        email,
        phone,
        otp: otp,
        userType: "Client",
        password: encryptedPassword,
        referralCode,
        emailVerified: false,
        phoneVerified: false,
        lastPhoneOtpSent: new Date(),
        lastEmailOtpSent: new Date(),
      });

      await newUser.save();
      sendVerificationEmail(newUser.email, otp);

      // Send phone verification OTP using Twilio Verify API
      // await client.verify.v2
      //   .services(process.env.TWILIO_VERIFY_SERVICE_SID)
      //   .verifications.create({ to: phone, channel: "sms", ttl: 600 });

      return res.status(201).json({
        status: true,
        message: "Sign up successful. OTP sent for email verification.",
      });
    } catch (error) {
      return res.status(500).json({ status: false, message: error.message });
    }
  },

  loginUser: async (req, res) => {
    try {
      const user = await User.findOne(
        { email: req.body.email },
        { __v: 0, createdAt: 0, updatedAt: 0 }
      );

      if (!user) {
        return res
          .status(401)
          .json({ status: false, message: "Wrong Login Details" });
      }

      console.log("this is user: ", user.id);

      let restaurant;
      let rider;
      let store;

      if (user.userType === "Vendor") {
        restaurant = await Restaurant.findOne({ owner: user.id }).select({
          coords: 1,
        });
        console.log("this is restaurant: ", restaurant);

        if (!restaurant) {
          return res
            .status(404)
            .json({ status: false, message: "Restaurant not found" });
        }
      }

      if (user.userType === "Store") {
        store = await GroceryStore.findOne({ owner: user.id }).select({
          coords: 1,
        });
        console.log("this is store: ", store);

        if (!store) {
          return res
            .status(404)
            .json({ status: false, message: "Grocery Store not found" });
        }
      }

      if (user.userType === "Rider") {
        rider = await Rider.findOne({ riderProfile: user.id }).select({
          point: 1,
        });
        console.log(rider.point.coordinates);

        if (!rider) {
          return res
            .status(404)
            .json({ status: false, message: "Rider not found" });
        }
      }

      const decryptedPass = CryptoJS.AES.decrypt(
        user.password,
        process.env.SECRET
      );
      const depassword = decryptedPass.toString(CryptoJS.enc.Utf8);

      if (depassword !== req.body.password) {
        return res
          .status(401)
          .json({ status: false, message: "Wrong Login Details" });
      }

      const userToken = jwt.sign(
        {
          id: user._id,
          userType: user.userType,
          email: user.email,
        },
        process.env.JWT_SEC,
        { expiresIn: "21d" }
      );

      const { password, ...others } = user._doc;

      if (user.userType === "Client") {
        res.status(200).json({ ...others, userToken });
      } else if (user.userType === "Vendor") {
        res.status(200).json({
          ...others,
          userToken,
          latitude: restaurant.coords.latitude,
          longitude: restaurant.coords.longitude,
        });
      } else if (user.userType === "Store") {
        res.status(200).json({
          ...others,
          userToken,
          latitude: store.coords.latitude,
          longitude: store.coords.longitude,
        });
      } else if (user.userType === "Rider") {
        res.status(200).json({
          ...others,
          userToken,
          latitude: rider.point.coordinates[1], // Assuming [longitude, latitude]
          longitude: rider.point.coordinates[0],
        });
      }
    } catch (error) {
      console.log(error);
      res.status(500).json({ status: false, message: error });
    }
  },

  changePassword: async (req, res) => {
    try {
      const user = await User.findById(req.user.id);
      if (!user) {
        return res
          .status(404)
          .json({ status: false, message: "User not found" });
      }

      const decryptedPass = CryptoJS.AES.decrypt(
        user.password,
        process.env.SECRET
      ).toString(CryptoJS.enc.Utf8);
      if (decryptedPass !== req.body.currentPassword) {
        return res
          .status(401)
          .json({ status: false, message: "Current password is incorrect" });
      }

      user.password = CryptoJS.AES.encrypt(
        req.body.newPassword,
        process.env.SECRET
      ).toString();
      await user.save();

      res
        .status(200)
        .json({ status: true, message: "Password changed successfully" });
    } catch (error) {
      res.status(500).json({ status: false, message: error.message });
    }
  },

  forgotPassword: async (req, res) => {
    try {
      const user = await User.findOne({ email: req.body.email });
      if (!user) {
        return res
          .status(404)
          .json({ status: false, message: "User not found" });
      }

      const otp = generateOtp();

      user.resetPasswordToken = otp;
      user.resetPasswordExpires = Date.now() + 600000;
      await user.save();

      await sendResetPasswordEmail(user.email, otp);

      res.status(200).json({ status: true, message: "OTP sent to email" });
    } catch (error) {
      res.status(500).json({ status: false, message: error.message });
    }
  },

  resetPassword: async (req, res) => {
    try {
      if (!req.body.password) {
        return res
          .status(400)
          .json({ status: false, message: "Password is required" });
      }

      const user = await User.findOne({ email: req.body.email });

      if (!user) {
        return res
          .status(404)
          .json({ status: false, message: "User not found" });
      }

      if (user.resetPasswordToken !== req.body.otp) {
        return res.status(400).json({ status: false, message: "Invalid OTP" });
      }

      if (user.resetPasswordExpires <= Date.now()) {
        return res.status(400).json({ status: false, message: "Expired OTP" });
      }

      user.password = CryptoJS.AES.encrypt(
        req.body.password,
        process.env.SECRET
      ).toString();
      user.resetPasswordToken = undefined;
      user.resetPasswordExpires = undefined;
      await user.save();

      res
        .status(200)
        .json({ status: true, message: "Password reset successful!" });
    } catch (error) {
      res.status(500).json({ status: false, message: error.message });
    }
  },
};
