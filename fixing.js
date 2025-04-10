const mongoose = require("mongoose");
const Food = require("./models/Food");
require("dotenv").config();

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

    const newFood = new Food({
      title: "Sausage Pizza - Large",
      restaurantName: "JC Pizza",
      time: "30",
      foodTags: ["Cheese", "Sausage Pizza", "Pizza"],
      category: "6751328ad9a8227f3d67465e",
      foodType: ["Cheese", "Sausage Pizza", "Pizza"],
      code: "330105",
      isAvailable: true,
      restaurant: "67f5f4ee4534520e07a70a9d",
      rating: 5,
      ratingCount: 0,
      totalRating: 0,
      description: "Large sausage pizza",
      price: 16700,
      additives: [
        { id: "655727", title: "Extra cheese", price: "2800" },
        { id: "327315", title: "Extra topping", price: "2300" },
        { id: "492949", title: "Extra pepperoni", price: "3400" },
      ],
      imageUrl: [
        "https://firebasestorage.googleapis.com/v0/b/sprinfare2024.appspot.com/o/images%2FYHIwYidGhdqUqObJhLtEnkgqtc?alt=media&token=123cfc87-40dc-44a6-846b-228194f5fc14",
        "https://firebasestorage.googleapis.com/v0/b/sprinfare2024.appspot.com/o/images%2FYHIwYidGhdqUqObJhLtEnkgqtc?alt=media&token=123cfc87-40dc-44a6-846b-228194f5fc14",
      ],
      location: {
        type: "Point",
        coordinates: [6.11579, 5.7877439],
      },
      feedbacks: [],
    });

    const savedFood = await newFood.save();
    console.log("Food item added successfully:", savedFood);
  } catch (error) {
    console.error("Error adding food item:", error);
  } finally {
    await mongoose.disconnect();
  }
};

fixing();
