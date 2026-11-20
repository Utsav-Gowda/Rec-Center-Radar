// Adds or refreshes Floor 4 and its seeded equipment without touching any other floor.
// Unlike `npm run seed`, this is safe to run against a database the team shares:
// it only replaces Floor 4 equipment that it created itself (registeredBy: 'seed').
// Equipment registered by employees on Floor 4 is left alone.
// Usage (from server/): npm run seed:floor4
const Floor = require('../models/Floor');
const Equipment = require('../models/Equipment');
const { floor: floorData, equipment } = require('./seedFloor4');

async function upsertFloor4() {
  let floor = await Floor.findOne({ floorNumber: floorData.floorNumber });
  if (!floor) {
    floor = new Floor(floorData);
  } else {
    floor.name = floorData.name;
    floor.floorPlanUrl = floorData.floorPlanUrl;
    // Keep existing room _ids so equipment already assigned to them stays valid.
    const existing = new Set(floor.rooms.map((room) => room.name.toLowerCase()));
    for (const room of floorData.rooms) {
      if (!existing.has(room.name.toLowerCase())) floor.rooms.push(room);
    }
  }
  await floor.save();

  const removed = await Equipment.deleteMany({ floor: floor._id, registeredBy: 'seed' });
  const documents = equipment.map(({ floorNumber, roomName, ...item }) => {
    const room = floor.rooms.find((candidate) => candidate.name === roomName);
    if (!room) throw new Error(`Seed error: no room "${roomName}" on floor ${floorNumber} for "${item.name}".`);
    return { ...item, floor: floor._id, room: room._id, registeredBy: 'seed' };
  });
  // create() (not insertMany) so the room-belongs-to-floor validation hook runs.
  await Equipment.create(documents);
  return { floor, removed: removed.deletedCount, added: documents.length };
}

module.exports = { upsertFloor4 };

if (require.main === module) {
  require('dotenv').config();
  const mongoose = require('mongoose');
  const connectDB = require('../config/db');
  connectDB()
    .then(upsertFloor4)
    .then(({ floor, removed, added }) => {
      console.log(`Floor ${floor.floorNumber} ready: replaced ${removed} seeded items with ${added}.`);
    })
    .catch((err) => {
      console.error(err.message);
      process.exitCode = 1;
    })
    .finally(() => mongoose.disconnect());
}
