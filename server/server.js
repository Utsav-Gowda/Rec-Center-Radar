require('dotenv').config();

const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');

const connectDB = require('./src/config/db');
const equipmentRoutes = require('./src/routes/equipmentRoutes');
const reportRoutes = require('./src/routes/reportRoutes');
const announcementRoutes = require('./src/routes/announcementRoutes');
const authRoutes = require('./src/routes/authRoutes');
const app = express();
const PORT = process.env.PORT || 5000;

// CORS: allow the configured client origin(s); comma-separated list supported.
const allowedOrigins = (process.env.CLIENT_ORIGIN || 'http://localhost:5173')
  .split(',')
  .map((origin) => origin.trim());

app.use(cors({ origin: allowedOrigins }));
app.use(express.json({ limit: '100kb' }));

// Health check: reports API uptime and database connection state.
app.get('/api/health', (req, res) => {
  const dbConnected = mongoose.connection.readyState === 1;
  res.status(dbConnected ? 200 : 503).json({
    status: dbConnected ? 'ok' : 'degraded',
    database: dbConnected ? 'connected' : 'disconnected',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

// Subsystem routers
app.use('/api/equipment', equipmentRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/announcements', announcementRoutes);
app.use('/api/auth', authRoutes);

// 404 for unknown API routes
app.use('/api', (req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Central error handler. Express 5 forwards rejected promises from async
// route handlers here automatically.
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  let status = err.status || err.statusCode || 500;
  if (err.name === 'ValidationError' || err.name === 'CastError') status = 400;
  if (status >= 500) console.error(err);
  res.status(status).json({
    error: status >= 500 ? 'Internal server error' : err.message,
  });
});

async function start() {
  try {
    await connectDB();
    app.listen(PORT, () => {
      console.log(`Rec Center Radar API listening on port ${PORT}`);
    });
  } catch (err) {
    console.error('Failed to start server:', err.message);
    process.exit(1);
  }
}

// Only start when run directly, so tests can import the app.
if (require.main === module) {
  start();
}

module.exports = app;
