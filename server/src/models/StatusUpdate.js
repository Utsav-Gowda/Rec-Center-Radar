const mongoose = require('mongoose');
const { Schema } = mongoose;
const { EQUIPMENT_STATUSES } = require('./constants');

// Status history (AOM: StatusUpdate; FR4, FR6, FR10, US5).
const statusUpdateSchema = new Schema(
  {
    equipment: { type: Schema.Types.ObjectId, ref: 'Equipment', required: true },
    previousStatus: { type: String, enum: EQUIPMENT_STATUSES },
    newStatus: { type: String, enum: EQUIPMENT_STATUSES, required: true },
    note: { type: String, trim: true, maxlength: 500 },
    updatedBy: { type: String, required: true }, // Pitt ID of the gym employee (placeholder until a User model exists)
  },
  { timestamps: { createdAt: true, updatedAt: false } } // history entries are never edited
);

// "Latest changes for this machine" queries.
statusUpdateSchema.index({ equipment: 1, createdAt: -1 });

module.exports = mongoose.model('StatusUpdate', statusUpdateSchema);
