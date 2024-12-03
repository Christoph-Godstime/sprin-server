const mongoose = require('mongoose');
const dotenv = require('dotenv').config()

const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URL);
        console.log("Connected to the DB successfully");
    } catch (err) {
        
        await mongoose.connect(process.env.MONGO_URL);
        console.log("Reconnected to the DB successfully");
    }
};

module.exports = connectDB;