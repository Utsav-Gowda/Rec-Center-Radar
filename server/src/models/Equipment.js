const mongoose = require('mongoose');
const { Schema } = mongoose;
const { EQUIPMENT_STATUSES } = require('./constants');

const equipmentSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },                 // FR1, FR7
    category: { type: String, required: true, trim: true },             // FR3 filter, FR7
    workoutType: { type: String, required: true, trim: true },          // FR1
    muscleGroups: { type: [String], default: [] },                      // FR1 (a machine can target several)

    // Current status is stored here for fast reads (FR4, NFR1).
    // Every change is also logged in the StatusUpdate collection (FR10).
    status: { type: String, enum: EQUIPMENT_STATUSES, default: 'Operational', required: true },
    statusNote: { type: String, trim: true, maxlength: 500 },           // optional employee note (FR4)
    lastVerifiedAt: { type: Date, default: Date.now },                  // when status was last verified (FR4)

    floor: { type: Schema.Types.ObjectId, ref: 'Floor', required: true }, // FR2, FR3
    room: { type: Schema.Types.ObjectId, required: true },                // _id of a room inside floor.rooms

    // Marker position on the floor plan, stored as fractions of the image (0 to 1)
    // so it scales to any screen size (FR2, NFR7).
    mapPosition: {
      x: { type: Number, required: true, min: 0, max: 1 },
      y: { type: Number, required: true, min: 0, max: 1 },
    },

    registeredBy: { type: String }, // Pitt ID of the gym employee (placeholder until a User model exists)
  },
  { timestamps: true } // createdAt doubles as registeredAt (AOM attribute)
);

// Search by name, workout type, muscle group, or category (FR1, NFR1).
equipmentSchema.index(
  { name: 'text', workoutType: 'text', muscleGroups: 'text', category: 'text' },
  { name: 'equipment_search', weights: { name: 5, muscleGroups: 3, workoutType: 2, category: 1 } }
);
// Filters (FR3).
equipmentSchema.index({ floor: 1, room: 1 });
equipmentSchema.index({ status: 1 });
equipmentSchema.index({ category: 1 });

// Reject equipment whose room is not on its floor.
// Note: this runs on save()/create(), not on findOneAndUpdate(). Use save() when relocating.
equipmentSchema.pre('validate', async function () {
  if (!this.isNew && !this.isModified('floor') && !this.isModified('room')) return;
  const Floor = mongoose.model('Floor');
  const floor = await Floor.findById(this.floor).select('rooms._id').lean();
  if (!floor) {
    this.invalidate('floor', 'Floor does not exist.');
    return;
  }
  if (!floor.rooms.some((r) => r._id.equals(this.room))) {
    this.invalidate('room', 'Room does not belong to the selected floor.');
  }
});

module.exports = mongoose.model('Equipment', equipmentSchema);
