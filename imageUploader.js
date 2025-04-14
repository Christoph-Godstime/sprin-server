const fs = require("fs");
const path = require("path");
const inquirer = require("inquirer");
const admin = require("firebase-admin");
const { v4: uuidv4 } = require("uuid");
require("dotenv").config();

// Firebase Admin Init
const serviceAccount = require("./firebaseConfig.json");
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
});
const bucket = admin.storage().bucket();

// Upload Function
const uploadLocalImage = async (filePath) => {
  try {
    const fileName = `${uuidv4()}${path.extname(filePath)}`;
    const file = bucket.file(fileName);

    const fileBuffer = fs.readFileSync(filePath);

    await file.save(fileBuffer, {
      metadata: {
        contentType: "image/jpeg", // adjust if needed
      },
    });

    await file.makePublic();
    const publicUrl = `https://storage.googleapis.com/${bucket.name}/${file.name}`;
    console.log("Uploaded URL:", publicUrl);
  } catch (err) {
    console.error("Error uploading:", err.message);
  }
};

// Prompt user for file path
const imageUploader = async () => {
  const { filePath } = await inquirer.prompt([
    {
      type: "input",
      name: "filePath",
      message: "Enter the full path to the image:",
      validate: (input) => fs.existsSync(input) || "File not found!",
    },
  ]);

  await uploadLocalImage(filePath);
};

imageUploader();
