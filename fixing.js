const mongoose = require("mongoose");
const GroceryCategory = require("./models/GroceryCategory"); // Adjust the path to your Order model
require("dotenv").config();

const categories = [
  {
    title: "Bakery And Cake",
    value: "bakery-and-cake",
    imageUrl:
      "https://firebasestorage.googleapis.com/v0/b/sprinfare2024.appspot.com/o/images%2Fbakery%20and%20cake.png?alt=media&token=40d40c38-fa3d-4abd-8392-94434dc2cec2",
  },
  {
    title: "Fresh Fruits and Vegetables",
    value: "fresh-fruits-and-vegetables",
    imageUrl:
      "https://firebasestorage.googleapis.com/v0/b/sprinfare2024.appspot.com/o/images%2Ffruits.png?alt=media&token=89c1d75e-3841-4133-affc-4c36041c265a",
  },
  {
    title: "Dairy Products",
    value: "dairy-products",
    imageUrl:
      "https://firebasestorage.googleapis.com/v0/b/sprinfare2024.appspot.com/o/images%2Fdairy%20products.png?alt=media&token=d588cc30-5fb3-482f-968e-c52d0a081ec6",
  },
  {
    title: "Frozen Foods and Butchery",
    value: "frozen-foods-and-butchery",
    imageUrl:
      "https://firebasestorage.googleapis.com/v0/b/sprinfare2024.appspot.com/o/images%2Ffrozen%20foods%20and%20butchery.png?alt=media&token=886ff5a8-3ec7-488c-a860-2a2e4d914462",
  },
  {
    title: "Non-Alcoholic Drinks",
    value: "non-alcoholic-drinks",
    imageUrl:
      "https://firebasestorage.googleapis.com/v0/b/sprinfare2024.appspot.com/o/images%2Fnon-alcoholic%20drinks.png?alt=media&token=028a6736-da1f-42f2-af17-5f1062990094",
  },
  {
    title: "Food Cupboard",
    value: "food-cupboard",
    imageUrl:
      "https://firebasestorage.googleapis.com/v0/b/sprinfare2024.appspot.com/o/images%2Ffood%20cupboard.png?alt=media&token=428bb243-aec8-4227-a6e3-ec0af71da6e6",
  },
  {
    title: "Condiments and Sauces",
    value: "condiments-and-sauces",
    imageUrl:
      "https://firebasestorage.googleapis.com/v0/b/sprinfare2024.appspot.com/o/images%2Fcondiments%20and%20sauces.png?alt=media&token=09e94432-67b7-498d-8703-c68bd57d0728",
  },
  {
    title: "Stationaries",
    value: "stationaries",
    imageUrl:
      "https://firebasestorage.googleapis.com/v0/b/sprinfare2024.appspot.com/o/images%2Fstationaries.png?alt=media&token=c77c7cb6-65fb-41ae-8ce4-46c823c7a816",
  },
  {
    title: "Ice Cream & Desserts",
    value: "ice-cream-&-desserts",
    imageUrl:
      "https://firebasestorage.googleapis.com/v0/b/sprinfare2024.appspot.com/o/images%2Fice%20cream%20and%20dessets.png?alt=media&token=2fd0a24e-79e8-4149-8b49-6b411a5a58c2",
  },
  {
    title: "Rice & Pasta",
    value: "rice-&-pasta",
    imageUrl:
      "https://firebasestorage.googleapis.com/v0/b/sprinfare2024.appspot.com/o/images%2Fbaby%20products.png?alt=media&token=8335b594-89fc-41c8-81a9-211bf667e784",
  },
  {
    title: "Home Essentials",
    value: "home-essentials",
    imageUrl:
      "https://firebasestorage.googleapis.com/v0/b/sprinfare2024.appspot.com/o/images%2Fhome%20essentials.png?alt=media&token=912e32fa-f4bb-4b9c-9686-0d7fde87426d",
  },
];

const fixing = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URL, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log("Connected to MongoDB");

    for (const category of categories) {
      await GroceryCategory.updateOne(
        { value: category.value },
        { $set: { imageUrl: category.imageUrl } },
        { upsert: true }
      );
    }

    console.log("Categories updated successfully");
    mongoose.connection.close();
  } catch (error) {
    console.error("Error updating categories:", error);
    mongoose.connection.close();
  }
};

fixing();
