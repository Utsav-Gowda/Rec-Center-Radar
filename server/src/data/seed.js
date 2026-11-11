// Clears and reseeds the Floor and Equipment collections.
// Usage (from server/): npm run seed
require('dotenv').config();

const mongoose = require('mongoose');
const connectDB = require('../config/db');
const Floor = require('../models/Floor');
const Equipment = require('../models/Equipment');
const { floors, equipment } = require('./seedEquipment');

async function seed() {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Refusing to seed: NODE_ENV is production.');
  }

  await connectDB();

  await Equipment.deleteMany({});
  await Floor.deleteMany({});

  const createdFloors = await Floor.create(floors);
  const floorByNumber = new Map(createdFloors.map((f) => [f.floorNumber, f]));

  const equipmentDocs = equipment.map(({ floorNumber, roomName, ...rest }) => {
    const floor = floorByNumber.get(floorNumber);
    if (!floor) throw new Error(`Seed error: no floor ${floorNumber} for "${rest.name}".`);
    const room = floor.rooms.find((r) => r.name === roomName);
    if (!room) throw new Error(`Seed error: no room "${roomName}" on floor ${floorNumber} for "${rest.name}".`);
    return { ...rest, floor: floor._id, room: room._id, registeredBy: 'seed' };
  });

  // create() (not insertMany) so the room-belongs-to-floor validation hook runs.
  await Equipment.create(equipmentDocs);

  console.log(`Seeded ${createdFloors.length} floors and ${equipmentDocs.length} equipment items.`);
}

seed()
  .catch((err) => {
    console.error(err.message);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
