// src/config/db.js
const mongoose = require('mongoose');
const env = require("./env");

const connectDB = async () => {
  try {
    await mongoose.connect(env.MONGO_URI);

    console.log('MongoDB connected successfully');
    console.log(`Database name: ${mongoose.connection.db.databaseName}`);
    console.log(`Connected to host: ${mongoose.connection.host}`);
  } catch (err) {
    console.error('MongoDB connection failed:');
    console.error(err.message || err);
    process.exit(1); // Exit in dev; in production consider retry logic
  }
};

module.exports = connectDB;
