const mongoose = require("mongoose");

const riderSchema = new mongoose.Schema(
  {
    startingTime: { type: Date, required: true },
    closingTime: { type: Date, required: true },
    vehicleType: {
      type: String,
      required: true,
      enum: ["Bicycle", "Motorbike", "Scooter", "Car"],
    },
    vehicleBrand: {
      type: String,
      validate: {
        validator: function (value) {
          // Only require vehicleBrand if the vehicle type is not "Bicycle"
          return this.vehicleType === "Bicycle" || !!value;
        },
        message: "Vehicle brand is required unless the vehicle type is Bicycle",
      },
    },
    plateNumber: {
      type: String,
      validate: {
        validator: function (value) {
          // Only require plateNumber if the vehicle type is not "Bicycle"
          return this.vehicleType === "Bicycle" || !!value;
        },
        message: "Plate number is required unless the vehicle type is Bicycle",
      },
    },
    imageUrl: { type: String, required: true },
    riderIdentification: { type: String, required: true },
    vehicleDoc: { type: String, required: true },
    riderProfile: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    nextOfKinName: { type: String, required: true },
    nextOfKinPhone: { type: String, required: true },
    guarantorName: { type: String, required: true },
    guarantorPhone: { type: String, required: true },
    relationshipWithGuarantor: {
      type: String,
      required: true,
      enum: [
        "Brother",
        "Sister",
        "Cousin",
        "Father",
        "Mother",
        "Friend",
        "Aunty",
        "Uncle",
        "Colleague",
        "Supervisor",
      ], // Updated enum options for relationship with guarantor
    },
    isAvailable: {
      type: Boolean,
      default: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    isTakingOrders: {
      type: Boolean,
      default: true,
    },
    verification: {
      type: String,
      default: "Pending",
      enum: ["Pending", "Verified", "Rejected"],
    },
    verificationMessage: {
      type: String,
      default:
        "Please allow up to 24 hours for your verification to be processed. You will receive an email notification once your verification is complete.",
    },
    rating: { type: Number, min: 1, max: 5, default: 5 },
    ratingCount: { type: Number, default: 0 },
    totalRating: { type: Number, default: 0 },
    feedbacks: [{ type: mongoose.Schema.Types.ObjectId, ref: "Feedback" }],
    code: { type: String, required: true },
    point: {
      type: {
        type: String,
        enum: ["Point"],
        required: true,
        default: "Point",
      },
      coordinates: {
        type: [Number],
        required: true,
      },
    },
    assignedOrders: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Order",
      },
    ],
  },
  { timestamps: true }
);

riderSchema.index({ point: "2dsphere" }); // Geospatial index

module.exports = mongoose.model("Rider", riderSchema);
