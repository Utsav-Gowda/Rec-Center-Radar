const mongoose = require('mongoose');

async function connectDB() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error('MONGODB_URI is not set. Copy .env.example to .env and add your Atlas connection string.');
  }

  mongoose.connection.on('error', (err) => console.error('MongoDB connection error:', err.message));
  mongoose.connection.on('disconnected', () => console.warn('MongoDB disconnected'));

  // Fail after 10 seconds instead of hanging if Atlas is unreachable (e.g., IP not on the access list).
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 10000 });

  console.log(`MongoDB Atlas connected: ${mongoose.connection.host} / database "${mongoose.connection.name}"`);
  return mongoose.connection;
}

module.exports = connectDB;