// models/WalletCreditRecord.js
const mongoose = require("mongoose");

const WalletCreditRecordSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      unique: true, // Ensure one record per user
      required: true,
    },
    hasReceivedInitialCredit: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("WalletCreditRecord", WalletCreditRecordSchema);
