const mongoose = require("mongoose");

const contactUsSchema = new mongoose.Schema(
  {
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    email: { type: String, required: true },
    phoneNumber: { type: String, required: true },
    message: { type: String, required: true },
  },
  { timestamps: true }
);

const ContactUs = mongoose.model("ContactUs", contactUsSchema);

module.exports = ContactUs;
