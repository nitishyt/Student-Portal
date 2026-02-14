const mongoose = require('mongoose');
require('dotenv').config();

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB connected successfully');
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error.message);
    if (error.message.includes('Authentication failed')) {
      console.error('👉 Tip: Check your database credentials in the .env file.');
    }
    process.exit(1);
  }
};

module.exports = connectDB;
