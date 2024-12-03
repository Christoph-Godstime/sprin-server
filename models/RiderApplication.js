const mongoose = require("mongoose");

const riderApplicationSchema = new mongoose.Schema(
  {
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    phoneNumber: { type: String, required: true },
    deviceType: { type: String, required: true, enum: ["iOS", "Android"] },
  },
  { timestamps: true }
);

const RiderApplication = mongoose.model(
  "RiderApplication",
  riderApplicationSchema
);

module.exports = RiderApplication;
