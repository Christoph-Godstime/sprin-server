const mongoose = require("mongoose");

const bankDetailsSchema = new mongoose.Schema({
  restaurantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Restaurant",
    required: true,
  },
  bankName: {
    type: String,
    required: true,
  },
  accountNumber: {
    type: String,
    required: true,
  },
  accountName: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
  },
  confirmationCode: {
    type: String,
  },
  confirmed: {
    type: Boolean,
    default: false,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

const BankDetails = mongoose.model("BankDetails", bankDetailsSchema);

module.exports = BankDetails;
