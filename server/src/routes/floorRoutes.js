const express = require('express');
const Floor = require('../models/Floor');

const router = express.Router();

// Existing floors/rooms are the source of truth for registration locations.
router.get('/', async (req, res) => {
  const data = await Floor.find().select('floorNumber name floorPlanUrl rooms').sort({ floorNumber: 1 }).lean();
  res.set('Cache-Control', 'no-store').json({ count: data.length, data });
});

module.exports = router;
