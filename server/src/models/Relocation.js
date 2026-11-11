const mongoose = require('mongoose');
const { Schema } = mongoose;

// Location history (AOM: Relocation with "from" and "to" rooms; FR8, FR10, US8).
const relocationSchema = new Schema(
  {
    equipment: { type: Schema.Types.ObjectId, ref: 'Equipment', required: true },
    fromFloor: { type: Schema.Types.ObjectId, ref: 'Floor', required: true },
    fromRoom: { type: Schema.Types.ObjectId, required: true },
    toFloor: { type: Schema.Types.ObjectId, ref: 'Floor', required: true },
    toRoom: { type: Schema.Types.ObjectId, required: true },
    movedBy: { type: String, required: true }, // Pitt ID of the gym employee (placeholder until a User model exists)
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

relocationSchema.index({ equipment: 1, createdAt: -1 });

module.exports = mongoose.model('Relocation', relocationSchema);
