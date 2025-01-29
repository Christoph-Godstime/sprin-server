const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema(
  {
    firstName: {
      type: String,
      required: true,
    },
    lastName: {
      type: String,
      required: true,
    },
    email: { type: String, required: true, unique: true },
    otp: { type: String, required: true },
    verified: { type: Boolean, required: true, default: false },
    phoneVerified: { type: Boolean, required: true, default: false },
    password: { type: String, required: true },
    address: { type: Array, required: false },
    phone: { type: String, required: true, unique: true },
    userType: {
      type: String,
      required: true,
      default: "Client",
      enum: ["Admin", "Rider", "Vendor", "Client", "Store"],
    },
    profile: {
      type: String,
      require: true,
      default:
        "https://firebasestorage.googleapis.com/v0/b/sprinfare2024.appspot.com/o/images%2Fboy.png?alt=media&token=bf004ac5-75a6-4d0d-b323-91fe9021754e",
    },
    resetPasswordToken: String,
    resetPasswordExpires: Date,
    referralCode: { type: String, unique: true, required: true }, // New field
    referredBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, // New field
    walletBalance: { type: Number, default: 0, required: true }, // New field
    expoPushToken: {
      type: String,
      default: null,
    },
    lastPhoneOtpSent: { type: Date },
    lastEmailOtpSent: { type: Date },
  },
  { timestamps: true }
);
module.exports = mongoose.model("User", UserSchema);
