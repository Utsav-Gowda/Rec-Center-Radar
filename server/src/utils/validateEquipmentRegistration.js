const mongoose = require('mongoose');

module.exports = function validateEquipmentRegistration(body) {
  const input = body && typeof body === 'object' && !Array.isArray(body) ? body : {};
  const errors = {};
  const data = {};
  for (const [field, label, maximum] of [
    ['name', 'Equipment name', 120], ['category', 'Category', 80], ['workoutType', 'Workout type', 100],
  ]) {
    if (typeof input[field] !== 'string' || !input[field].trim()) {
      errors[field] = `${label} is required.`;
    } else if (input[field].trim().length > maximum) {
      errors[field] = `${label} must be at most ${maximum} characters.`;
    } else {
      data[field] = input[field].trim();
    }
  }
  for (const [field, label] of [['floor', 'Floor'], ['room', 'Assigned room']]) {
    if (typeof input[field] !== 'string' || !mongoose.isObjectIdOrHexString(input[field])) {
      errors[field] = `${label} is required and must be a valid selection.`;
    } else {
      data[field] = input[field];
    }
  }
  const position = input.mapPosition;
  if (!position || !['x', 'y'].every((axis) =>
    typeof position[axis] === 'number' && Number.isFinite(position[axis]) && position[axis] >= 0 && position[axis] <= 1)) {
    errors.mapPosition = 'Assigned location needs X and Y positions between 0% and 100%.';
  } else {
    data.mapPosition = { x: position.x, y: position.y };
  }
  const groups = input.muscleGroups ?? [];
  if (!Array.isArray(groups) || groups.length > 12 || groups.some((group) =>
    typeof group !== 'string' || !group.trim() || group.trim().length > 64)) {
    errors.muscleGroups = 'Use at most 12 muscle groups, each between 1 and 64 characters.';
  } else {
    data.muscleGroups = [...new Set(groups.map((group) => group.trim()))];
  }
  return { data, errors };
};
