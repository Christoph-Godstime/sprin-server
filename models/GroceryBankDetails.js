const mongoose = require("mongoose");

const groceryBankDetailsSchema = new mongoose.Schema({
  groceryStoreId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "GroceryStore",
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

const GroceryBankDetails = mongoose.model(
  "GroceryBankDetails",
  groceryBankDetailsSchema
);

module.exports = GroceryBankDetails;
