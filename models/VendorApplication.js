const mongoose = require("mongoose");

const vendorApplicationSchema = new mongoose.Schema(
  {
    restaurantName: { type: String, required: true },
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    phoneNumber: { type: String, required: true },
    deviceType: { type: String, required: true, enum: ["iOS", "Android"] },
  },
  { timestamps: true }
);

const VendorApplication = mongoose.model(
  "VendorApplication",
  vendorApplicationSchema
);

module.exports = VendorApplication;
