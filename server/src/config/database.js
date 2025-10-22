const mongoose = require('mongoose');
require('dotenv').config();

// MongoDB connection configuration
const connectDB = async (uri) => {
  try {
    await mongoose.connect(uri)
    .then((conn) => {
      console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
    })
    .catch((err) => {
      console.error('❌ MongoDB connection error:', err);
      process.exit(1);
    })
  }
  catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
}

// // Handle connection events
// mongoose.connection.on('connected', () => {
//   console.log('📊 Mongoose connected to MongoDB');
// });

// mongoose.connection.on('error', (err) => {
//   console.error('❌ Mongoose connection error:', err);
// });

// mongoose.connection.on('disconnected', () => {
//   console.log('📊 Mongoose disconnected');
// });

// Graceful shutdown
process.on('SIGINT', async () => {
  await mongoose.connection.close();
  console.log('📊 MongoDB connection closed through app termination');
  process.exit(0);
});

module.exports = { connectDB };