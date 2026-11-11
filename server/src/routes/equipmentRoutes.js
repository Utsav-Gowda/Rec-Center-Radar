const express = require('express');
const Equipment = require('../models/Equipment');

const router = express.Router();

// GET /api/equipment - list all equipment with floor and room names resolved.
router.get('/', async (req, res) => {
  const items = await Equipment.find()
    .populate('floor', 'floorNumber name rooms')
    .sort({ name: 1 })
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
