const express = require('express');
const Equipment = require('../models/Equipment');
// Population also needs the Floor model when server.js is the entry point.
require('../models/Floor');
const requireDemoEmployee = require('../middleware/requireDemoEmployee');
const equipmentResponse = require('../utils/equipmentResponse');
const validateRegistration = require('../utils/validateEquipmentRegistration');

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
    .populate('floor', 'floorNumber name floorPlanUrl rooms')
    .sort({ name: 1, _id: 1 })
    .lean();

  const data = items.map(equipmentResponse);

  res.set('Cache-Control', 'no-store').status(200).json({ count: data.length, data });
});

// US7. Audit identity and timestamps come from the server, never from the body.
router.post('/', requireDemoEmployee, async (req, res, next) => {
  const { data, errors } = validateRegistration(req.body);
  if (Object.keys(errors).length) {
    return res.status(400).json({ error: 'Check the highlighted fields.', errors });
  }
  try {
    // create() runs the model's room-belongs-to-floor validation hook.
    const item = await Equipment.create({ ...data, registeredBy: req.employee.id });
    await item.populate('floor', 'floorNumber name floorPlanUrl rooms');
    res.status(201).json({ data: equipmentResponse(item.toObject()) });
  } catch (error) {
    if (error.name !== 'ValidationError') return next(error);
    const fieldErrors = Object.fromEntries(Object.entries(error.errors).map(([field, detail]) => [field, detail.message]));
    return res.status(400).json({ error: 'Check the highlighted fields.', errors: fieldErrors });
  }
});

module.exports = router;
