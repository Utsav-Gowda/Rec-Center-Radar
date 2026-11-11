const express = require('express');
const Equipment = require('../models/Equipment');
// Population also needs the Floor model when server.js is the entry point.
require('../models/Floor');

const router = express.Router();

// GET /api/equipment?q=... - literal, case-insensitive substring search (US1).
// Omitting q, or supplying only whitespace, returns the whole catalog.
router.get('/', async (req, res) => {
  const rawQuery = req.query.q ?? '';
  if (typeof rawQuery !== 'string') {
    return res.status(400).json({ error: 'Search must be a single text value.' });
  }
  const query = rawQuery.trim();
  if (query.length > 100 || query.includes('\0')) {
    return res.status(400).json({ error: 'Search must be at most 100 characters without null characters.' });
  }

  // Escape metacharacters so input such as ".*" is text, not an executable regex.
  const pattern = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const filter = query
    ? { $or: ['name', 'workoutType', 'muscleGroups'].map((field) => ({
        [field]: { $regex: pattern, $options: 'i' },
      })) }
    : {};

  const items = await Equipment.find(filter)
    .maxTimeMS(1000)
    .populate('floor', 'floorNumber name rooms')
    .sort({ name: 1, _id: 1 })
    .lean();

  const data = items.map((item) => {
    const room = item.floor?.rooms?.find((r) => r._id.equals(item.room));
    return {
      ...item,
      floor: item.floor
        ? { _id: item.floor._id, floorNumber: item.floor.floorNumber, name: item.floor.name }
        : null,
      room: room ? { _id: room._id, name: room.name } : { _id: item.room, name: null },
    };
  });

  res.status(200).json({ count: data.length, data });
});

module.exports = router;
