const mongoose = require("mongoose");
require("dotenv").config();

let connectionPromise;

const connectDB = async () => {
  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  if (!process.env.MONGO_URL) {
    throw new Error("MONGO_URL is not configured");
  }

  if (!connectionPromise) {
    connectionPromise = mongoose
      .connect(process.env.MONGO_URL, {
        serverSelectionTimeoutMS: 10000,
      })
      .then((connection) => {
        console.log("Connected to MongoDB successfully");
        return connection;
      })
      .catch((error) => {
        connectionPromise = undefined;
        console.error("MongoDB connection failed:", error.message);
        throw error;
      });
  }

  return connectionPromise;
};

module.exports = connectDB;
