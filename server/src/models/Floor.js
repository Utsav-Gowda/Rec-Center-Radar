const mongoose = require('mongoose');
const { Schema } = mongoose;

// Rooms are embedded in their floor (AOM: Floor 1 *-- 1..* Room, composition).
// Each embedded room still gets its own _id, which Equipment references.
const roomSchema = new Schema({
  name: { type: String, required: true, trim: true },
});

const floorSchema = new Schema(
  {
    floorNumber: { type: Number, required: true, unique: true },
    name: { type: String, trim: true }, // optional display name, e.g. "Floor 4 - Strength"
    floorPlanUrl: { type: String, required: true }, // floor plan image used for the map (FR2)
    rooms: {
      type: [roomSchema],
      default: [],
      validate: {
        validator: (rooms) => new Set(rooms.map((r) => r.name.toLowerCase())).size === rooms.length,
        message: 'Room names must be unique within a floor.',
      },
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Floor', floorSchema);
