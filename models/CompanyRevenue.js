const mongoose = require("mongoose");

const companyRevenueSchema = new mongoose.Schema({
  balance: {
    type: Number,
    required: true,
    default: 0,
  },
  referral: {
    type: Number,
    required: true,
    default: 0,
  },
  freedelivery: {
    type: Number,
    required: true,
    default: 0,
  },
  commissions: {
    type: Number,
    required: true,
    default: 0,
  },
  expenses: {
    type: Number,
    required: true,
    default: 0,
  },
});

const CompanyRevenue = mongoose.model("CompanyRevenue", companyRevenueSchema);

module.exports = CompanyRevenue;
