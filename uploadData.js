const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");
const { ObjectId } = mongoose.Types;
const admin = require("firebase-admin");
const Grocery = require("./models/Grocery");
const SubCategory = require("./models/SubCategory");
const { v4: uuidv4 } = require("uuid");
const axios = require("axios");
require("dotenv").config();

// Initialize Firebase Admin SDK
const serviceAccount = require("./firebaseConfig.json");
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
});
const bucket = admin.storage().bucket();

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URL, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// Function to upload image to Firebase
const uploadImageToFirebase = async (imageUrl) => {
  try {
    // Fetch image from URL
    const response = await axios.get(imageUrl, { responseType: "arraybuffer" });

    // Generate a unique filename for the image
    const filename = `${uuidv4()}.jpg`;

    // Create a file object and upload it to Firebase
    const file = bucket.file(filename);
    await file.save(response.data, {
      metadata: { contentType: "image/jpeg" },
    });
    await file.makePublic();
    return `https://storage.googleapis.com/${bucket.name}/${file.name}`;
  } catch (error) {
    console.error("Error uploading image:", error);
    return null;
  }
};

// Function to process and upload groceries
const processGroceries = async () => {
  try {
    const data = JSON.parse(
      fs.readFileSync(path.join(__dirname, "updated_products.json"), "utf-8")
    );

    for (const product of data) {
      const { title, price, imageUrl, quantity } = product;

      // Upload images to Firebase
      const uploadedImage = await uploadImageToFirebase(imageUrl);

      // Save grocery item to MongoDB
      await Grocery.create({
        title,
        category: new ObjectId("67f357bd1472f43edb9b3dcf"),
        subCategory: new ObjectId("67f362714534520e07a6a3ca"),
        groceryStore: new ObjectId("679a64c44733392faf1956d9"),
        price,
        quantity,
        imageUrl: uploadedImage,
        location: {
          type: "Point",
          coordinates: [6.114286556839943, 5.783790830243707],
        },
      });

      console.log(`Added: ${title}`);
    }

    console.log("All groceries processed successfully.");
  } catch (error) {
    console.error("Error processing groceries:", error);
  } finally {
    mongoose.disconnect();
  }
};

// Start the process
processGroceries();
