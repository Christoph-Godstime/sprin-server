const mongoose = require("mongoose");

const rateSchema = new mongoose.Schema({
  ratePerKm: {
    type: Number,
    required: true,
  },
});

module.exports = mongoose.model("Rate", rateSchema);
