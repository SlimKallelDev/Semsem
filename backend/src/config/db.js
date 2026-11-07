// src/config/db.js
const mongoose = require('mongoose');
const env = require("./env");

const connectDB = async () => {
  if (mongoose.connection.readyState === 1) return mongoose.connection;
  let lastError;
  for (let attempt = 0; attempt < 4; attempt += 1) {
    try {
      await mongoose.connect(env.MONGO_URI, {
        maxPoolSize: 10,
        minPoolSize: 0,
        serverSelectionTimeoutMS: 30000,
        socketTimeoutMS: 45000,
        maxIdleTimeMS: 60000,
      });
      console.log('MongoDB connected successfully');
      console.log(`Database name: ${mongoose.connection.db.databaseName}`);
      console.log(`Connected to host: ${mongoose.connection.host}`);
      return mongoose.connection;
    } catch (err) {
      lastError = err;
      console.error(`MongoDB connection attempt ${attempt + 1}/4 failed:`, err.message || err);
      if (attempt < 3) await new Promise((resolve) => setTimeout(resolve, 1500 * (attempt + 1)));
    }
  }
  throw lastError;
};

module.exports = connectDB;
