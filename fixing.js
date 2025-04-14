const mongoose = require("mongoose");
const Food = require("./models/Food");
require("dotenv").config();
const fs = require("fs");
const path = require("path");

// Grocery model (adjust path if needed)
const Grocery = require("./models/Grocery");

const categories = [
  {
    title: "Beers And Ciders",
    value: "beers-and-ciders",
    imageUrl:
      "https://firebasestorage.googleapis.com/v0/b/sprinfare2024.appspot.com/o/images%2FSaJkqumGAVvRcSvJHAadyNZNOB?alt=media&token=d89f4ad5-dea2-41ae-8f98-a67c12519ec5",
  },
  {
    title: "Spirits",
    value: "spirits",
    imageUrl:
      "https://firebasestorage.googleapis.com/v0/b/sprinfare2024.appspot.com/o/images%2FlrLpkeHEdabIUgLERAIZFzIFMd?alt=media&token=fcde16a7-9e65-43b6-a3b1-fbaa07535851",
  },
  {
    title: "Wine",
    value: "wine",
    imageUrl:
      "https://firebasestorage.googleapis.com/v0/b/sprinfare2024.appspot.com/o/images%2FBkTTDyasejXYSNnkTgmSjFQQyb?alt=media&token=841b3fed-e7e3-425e-ac06-20b17a3b9289",
  },
];

const fixing = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URL, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log("Connected to MongoDB");

    const newGrocery = new Grocery({
      title: "B. Agofure Peanuts",
      category: "679f0681ba0df5eed77fa93b", // replace with valid ObjectId
      subCategory: "67dfb8b8568092ac4c162081", // replace with valid ObjectId
      groceryStore: "679a64c44733392faf1956d9", // optional, or remove if not using
      price: 3900,
      quantity: "SM",
      isAvailable: true,
      imageUrl: [
        "https://storage.googleapis.com/sprinfare2024.appspot.com/d2aa7754-8faf-4e75-8361-3437d70682a8.png",
      ],
      location: {
        type: "Point",
        coordinates: [6.114286556839943, 5.783790830243707],
      },
    });

    const savedGrocery = await newGrocery.save();
    console.log("Grocery saved:", savedGrocery);
  } catch (error) {
    console.error("Error adding grocery:", error);
  } finally {
    await mongoose.disconnect();
    console.log("Disconnected from MongoDB");
  }
};

fixing();
