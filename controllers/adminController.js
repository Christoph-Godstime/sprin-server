const User = require("../models/User");
const Restaurant = require("../models/Restaurant");
const Rider = require("../models/Rider");
const Rate = require("../models/Rate");
const CryptoJS = require("crypto-js");
const jwt = require("jsonwebtoken");
const admin = require("firebase-admin");
const sendVerificationEmail = require("../utils/email_verification");
const restaurantVerification = require("../utils/email_restaurantVerification");
const generateOtp = require("../utils/otp_generator");
const {
  hash,
  verify,
  getRandomIntInclusive,
  capitalizeFirstLetter,
  decapitalize,
} = require("../utils/helper");

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
  createAdmin: async (req, res) => {
    const { email, phone, password, firstName, lastName, userType } = req.body;

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

      // Ensure only the specific admin can create other Admin accounts
      if (userType === "Admin") {
        if (
          req.user.userType !== "Admin" ||
          req.user.email !== "christophergodstime45@gmail.com"
        ) {
          return res.status(403).json({
            status: false,
            message:
              "Only the specified Admin can create other Admin accounts.",
          });
        }
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
        userType: userType || "Client", // Default to Client if userType is not provided
        password: encryptedPassword,
        referralCode,
        emailVerified: false,
        phoneVerified: false,
        lastPhoneOtpSent: new Date(),
        lastEmailOtpSent: new Date(),
      });

      await newUser.save();

      // Send verification email or other setup for Admin account
      if (userType === "Admin") {
        sendVerificationEmail(newUser.email, otp);
      }

      return res.status(201).json({
        status: true,
        message: `Sign up successful for ${
          userType || "Client"
        }. OTP sent for email verification.`,
      });
    } catch (error) {
      return res.status(500).json({ status: false, message: error.message });
    }
  },

  loginAdmin: async (req, res) => {
    try {
      // Find the user by email
      const admin = await User.findOne(
        { email: req.body.email, userType: "Admin" },
        { __v: 0, createdAt: 0, updatedAt: 0 }
      );

      if (!admin) {
        return res
          .status(401)
          .json({ status: false, message: "Invalid login credentials" });
      }

      // Decrypt the stored password
      const decryptedPass = CryptoJS.AES.decrypt(
        admin.password,
        process.env.SECRET
      );
      const depassword = decryptedPass.toString(CryptoJS.enc.Utf8);

      // Check if the provided password matches
      if (depassword !== req.body.password) {
        return res
          .status(401)
          .json({ status: false, message: "Invalid login credentials" });
      }

      // Generate a JWT token for the admin
      const adminToken = jwt.sign(
        {
          id: admin._id,
          userType: admin.userType,
          email: admin.email,
        },
        process.env.JWT_SEC,
        { expiresIn: "21d" }
      );

      // Exclude the password from the response
      const { password, ...others } = admin._doc;

      // Return the admin data along with the token
      res.status(200).json({ ...others, adminToken });
    } catch (error) {
      console.log(error);
      res.status(500).json({ status: false, message: error.message });
    }
  },

  updateRestaurantStatus: async (req, res) => {
    try {
      const { restaurantId, status, message } = req.body;

      // Ensure the user is an admin
      if (req.user.userType !== "Admin") {
        return res.status(403).json({
          status: false,
          message: "Only admins can update restaurant verification status.",
        });
      }

      // Validate the status
      const validStatuses = ["Verified", "Rejected"];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({
          status: false,
          message:
            "Invalid status. Allowed values are 'Verified' or 'Rejected'.",
        });
      }

      // Find the restaurant
      const restaurant = await Restaurant.findById(restaurantId).populate(
        "owner",
        "email firstName lastName"
      );
      if (!restaurant) {
        return res.status(404).json({
          status: false,
          message: "Restaurant not found.",
        });
      }

      // Check if the restaurant is already verified
      if (restaurant.verification === "Verified" && status === "Verified") {
        return res.status(400).json({
          status: false,
          message: "The restaurant is already verified.",
        });
      }

      // Prepare update data
      const updateData = {
        verification: status,
      };

      if (status === "Rejected" && message) {
        updateData.verificationMessage = message;
      }

      // Update restaurant status
      const updatedRestaurant = await Restaurant.findByIdAndUpdate(
        restaurantId,
        updateData,
        { new: true }
      ).populate("owner", "email firstName lastName");

      // Prepare email content
      const ownerEmail = updatedRestaurant.owner.email;
      const subject = `Your restaurant has been ${status.toLowerCase()}`;
      const htmlContent = `
        <html>
          <body style="font-family: Arial, sans-serif; margin: 0; padding: 0; background-color: #f4f4f4;">
            <table align="center" width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; padding: 20px; border-radius: 8px; box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);">
              <tr>
                <td style="text-align: center; padding-bottom: 20px;">
                 <img src="https://firebasestorage.googleapis.com/v0/b/sprinfare2024.appspot.com/o/sprin-images%2Fsprin.png?alt=media&token=09e6548d-6f53-4f93-a42a-faa117abe41f" alt="Sprin Logo" style="width: 120px; margin-bottom: 20px;">
                  <h1 style="color: #333;">${
                    status === "Verified"
                      ? "Congratulations!"
                      : "Unfortunately, Your Restaurant Has Been Rejected"
                  }</h1>
                </td>
              </tr>
              <tr>
                <td style="padding-bottom: 20px; color: #555;">
                  ${
                    status === "Verified"
                      ? `<p>Your restaurant, <strong>${updatedRestaurant.title}</strong>, has been verified.</p>
                       <p>We are excited to have you onboard! You can now log in to the restaurant app and start adding foods and taking orders.</p>
                       <p>If you have any questions or need assistance, please <a href="https://www.sprinapp.com/contact" style="color: #007bff; text-decoration: none;">contact support</a>.</p>`
                      : `<p>Reason: ${message}</p>
                       <p>Please <a href="https://www.sprinapp.com/contact" style="color: #007bff; text-decoration: none;">contact support</a> if you have any questions.</p>`
                  }
                </td>
              </tr>
              <tr>
                <td style="padding-top: 20px; border-top: 1px solid #ddd; text-align: center; color: #777;">
                  <p style="margin: 0; font-size: 12px;">&copy; ${new Date().getFullYear()} Sprin Technologies. All rights reserved.</p>
                </td>
              </tr>
            </table>
          </body>
        </html>
      `;

      // Send email notification to the restaurant owner
      await restaurantVerification(ownerEmail, subject, htmlContent);

      return res.status(200).json({
        status: true,
        message: `Restaurant has been ${status.toLowerCase()} and the owner has been notified via email.`,
        restaurant: updatedRestaurant,
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({
        status: false,
        message: error.message,
      });
    }
  },

  createRatePerKm: async (req, res) => {
    try {
      const { ratePerKm } = req.body;

      // Ensure the user is an admin
      if (req.user.userType !== "Admin") {
        return res.status(403).json({
          status: false,
          message: "Only admins can create the rate per kilometer.",
        });
      }

      // Validate the rate
      if (!ratePerKm || typeof ratePerKm !== "number" || ratePerKm <= 0) {
        return res.status(400).json({
          status: false,
          message: "Invalid rate. Must be a positive number.",
        });
      }

      // Check if a rate already exists
      const existingRate = await Rate.findOne();
      if (existingRate) {
        return res.status(400).json({
          status: false,
          message: "Rate per kilometer already exists. Use update instead.",
        });
      }

      // Create a new rate
      const newRate = new Rate({ ratePerKm });
      await newRate.save();

      return res.status(201).json({
        status: true,
        message: "Rate per kilometer created successfully.",
        ratePerKm: newRate.ratePerKm,
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({
        status: false,
        message: error.message,
      });
    }
  },

  // Update the rate per kilometer
  updateRatePerKm: async (req, res) => {
    try {
      const { ratePerKm } = req.body;

      // Ensure the user is an admin
      if (req.user.userType !== "Admin") {
        return res.status(403).json({
          status: false,
          message: "Only admins can update the rate per kilometer.",
        });
      }

      // Validate the rate
      if (!ratePerKm || typeof ratePerKm !== "number" || ratePerKm <= 0) {
        return res.status(400).json({
          status: false,
          message: "Invalid rate. Must be a positive number.",
        });
      }

      // Find and update the rate
      const updatedRate = await Rate.findOneAndUpdate(
        {},
        { ratePerKm },
        { new: true }
      );

      if (!updatedRate) {
        return res.status(404).json({
          status: false,
          message: "Rate per kilometer not found.",
        });
      }

      return res.status(200).json({
        status: true,
        message: "Rate per kilometer updated successfully.",
        ratePerKm: updatedRate.ratePerKm,
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({
        status: false,
        message: error.message,
      });
    }
  },
};
