const mongoose = require("mongoose");

const deleteRequestSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    email: { type: String, required: true },
    message: { type: String },
  },
  { timestamps: true }
);

module.exports = mongoose.model("DeleteRequest", deleteRequestSchema);
