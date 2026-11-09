require('dotenv').config();
const express = require('express');
const connectDB = require('./config/db');

// Register models so their indexes are built on startup.
require('./models/Floor');
require('./models/Equipment');
require('./models/StatusUpdate');
require('./models/Relocation');

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 5000;

connectDB()
  .then(() => {
    app.listen(PORT, () => console.log(`Server listening on port ${PORT}`));
  })
  .catch((err) => {
    console.error('Failed to connect to MongoDB Atlas:', err.message);
    process.exit(1);
  });