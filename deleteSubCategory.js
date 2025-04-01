require("dotenv").config();
const mongoose = require("mongoose");
const Grocery = require("./models/Grocery"); // Adjust the path as needed
const SubCategory = require("./models/SubCategory"); // Adjust the path as needed

const deleteGroceriesInSubCategory = async (subCategoryId) => {
  try {
    await mongoose.connect(process.env.MONGO_URL, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    const subCategory = await SubCategory.findById(subCategoryId);
    if (!subCategory) {
      console.log("SubCategory not found");
      return;
    }

    const deleteResult = await Grocery.deleteMany({
      subCategory: subCategoryId,
    });
    console.log(`${deleteResult.deletedCount} groceries deleted successfully.`);
  } catch (error) {
    console.error("Error deleting groceries:", error);
  } finally {
    mongoose.connection.close();
  }
};

const subCategoryId = "67e1536293f90b4a93eab9b6"; // Replace with actual subcategory ID
deleteGroceriesInSubCategory(subCategoryId);
