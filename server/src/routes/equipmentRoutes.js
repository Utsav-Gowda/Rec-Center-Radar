const mongoose = require('mongoose');
const StatusUpdate = require('../models/StatusUpdate');
const { EQUIPMENT_STATUSES } = require('../models/constants');

const express = require('express');
const Equipment = require('../models/Equipment');
// Population also needs the Floor model when server.js is the entry point.
require('../models/Floor');
const requireDemoEmployee = require('../middleware/requireDemoEmployee');
const equipmentResponse = require('../utils/equipmentResponse');
const validateRegistration = require('../utils/validateEquipmentRegistration');

const router = express.Router();

// US3. Each optional filter must be one plain string; arrays or nested objects
// (e.g. ?floor[$ne]=x) are rejected so query operators can never reach MongoDB.
function readFilters(query) {
  const filter = {};
  const errors = {};
  for (const key of ['floor', 'room', 'category', 'status']) {
    const raw = query[key];
    if (raw === undefined || raw === '') continue;
    if (typeof raw !== 'string' || raw.includes('\0')) {
      errors[key] = `${key} must be a single text value.`;
    } else if ((key === 'floor' || key === 'room') && !mongoose.isValidObjectId(raw)) {
      errors[key] = `${key} must be a valid ID.`;
    } else if (key === 'status' && !EQUIPMENT_STATUSES.includes(raw)) {
      errors[key] = `status must be one of: ${EQUIPMENT_STATUSES.join(', ')}.`;
    } else if (key === 'category' && raw.trim().length > 100) {
      errors[key] = 'category must be at most 100 characters.';
    } else {
      filter[key] = key === 'category' ? raw.trim() : raw;
    }
  }
  return { filter, errors };
}

// GET /api/equipment?q=...&floor=...&room=...&category=...&status=...
// q is a literal, case-insensitive substring search (US1). Omitting q, or supplying
// only whitespace, returns the whole catalog. The US3 filters narrow the result and
// combine with q and with each other using AND.
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
  const { filter: facets, errors } = readFilters(req.query);
  if (Object.keys(errors).length) {
    return res.status(400).json({ error: 'Check the filter values.', errors });
  }
  const filter = query
    ? { ...facets, $or: ['name', 'workoutType', 'muscleGroups'].map((field) => ({
        [field]: { $regex: pattern, $options: 'i' },
      })) }
    : facets;

  const items = await Equipment.find(filter)
    .maxTimeMS(1000)
    .populate('floor', 'floorNumber name floorPlanUrl rooms')
    .sort({ name: 1, _id: 1 })
    .lean();

  const data = items.map(equipmentResponse);

  res.set('Cache-Control', 'no-store').status(200).json({ count: data.length, data });
});

// US5. Authorized gym employees update mechanical condition and attach optional notes (FR4, FR6, FR10).
router.patch('/:id/status', requireDemoEmployee, async (req, res, next) => {
  const { id } = req.params;
  if (!mongoose.isValidObjectId(id)) {
    return res.status(400).json({ error: 'Invalid equipment ID.' });
  }

  const { status, statusNote } = req.body ?? {};
  const errors = {};

  if (typeof status !== 'string' || !EQUIPMENT_STATUSES.includes(status)) {
    errors.status = `Status must be one of: ${EQUIPMENT_STATUSES.join(', ')}.`;
  }

  let normalizedNote = '';
  if (statusNote !== undefined && statusNote !== null) {
    if (typeof statusNote !== 'string') {
      errors.statusNote = 'Maintenance note must be text.';
    } else if (statusNote.includes('\0')) {
      errors.statusNote = 'Maintenance note cannot contain null characters.';
    } else if (statusNote.trim().length > 500) {
      errors.statusNote = 'Maintenance note must be 500 characters or fewer.';
    } else {
      normalizedNote = statusNote.trim();
    }
  }

  if (Object.keys(errors).length) {
    return res.status(400).json({ error: 'Check the highlighted fields.', errors });
  }

  try {
    const item = await Equipment.findById(id);
    if (!item) {
      return res.status(404).json({ error: 'Equipment not found.' });
    }

    const previousStatus = item.status;
    const verifiedAt = new Date();

    item.status = status;
    item.statusNote = normalizedNote || undefined;
    item.lastVerifiedAt = verifiedAt;
    await item.save();

    await StatusUpdate.create({
      equipment: item._id,
      previousStatus,
      newStatus: status,
      note: normalizedNote || undefined,
      updatedBy: req.employee.id,
    });

    await item.populate('floor', 'floorNumber name floorPlanUrl rooms');
    return res.status(200).json({ data: equipmentResponse(item.toObject()) });
  } catch (error) {
    return next(error);
  }
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
