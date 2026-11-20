const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { before, after, test } = require('node:test');
const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');
// Import the real app first: its routes must register models needed for population.
const app = require('../server');
const Equipment = mongoose.model('Equipment');
const Floor = mongoose.model('Floor');
const { floor: floor4, equipment: floor4Equipment } = require('../src/data/seedFloor4');
const { upsertFloor4 } = require('../src/data/addFloor4');

let database;
let server;
let baseUrl;

before(async () => {
  // Explicit local URI: never connect to or seed the shared Atlas database.
  database = await MongoMemoryServer.create();
  await mongoose.connect(database.getUri(), { dbName: 'floor_map_test' });
  await Promise.all([Equipment.init(), Floor.init()]);
  server = app.listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
}, { timeout: 120000 });

after(async () => {
  if (server) await new Promise((resolve, reject) => server.close((err) => err ? reject(err) : resolve()));
  await mongoose.disconnect();
  if (database) await database.stop();
});

function box(item) {
  const { x, y } = item.mapPosition;
  const { width, height } = item.mapSize;
  return { left: x - width / 2, right: x + width / 2, top: y - height / 2, bottom: y + height / 2 };
}

test('Floor 4 seed data has unique names, valid rooms, and footprints inside the floor plan', () => {
  const rooms = new Set(floor4.rooms.map((room) => room.name));
  assert.equal(new Set(floor4Equipment.map((item) => item.name)).size, floor4Equipment.length);
  for (const item of floor4Equipment) {
    assert.equal(item.floorNumber, floor4.floorNumber, item.name);
    assert.ok(rooms.has(item.roomName), item.name);
    assert.ok(item.category && item.workoutType && item.muscleGroups.length, item.name);
    const outline = box(item);
    assert.ok(outline.left >= 0 && outline.top >= 0 && outline.right <= 1 && outline.bottom <= 1, item.name);
    assert.ok(item.mapLabel && item.mapLabel.length <= 40, item.name);
  }
});

test('no two Floor 4 machine outlines overlap, so each highlight points at one machine', () => {
  const boxes = floor4Equipment.map((item) => [item.name, box(item)]);
  for (let i = 0; i < boxes.length; i++) {
    for (let j = i + 1; j < boxes.length; j++) {
      const [nameA, a] = boxes[i];
      const [nameB, b] = boxes[j];
      const overlaps = a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;
      assert.equal(overlaps, false, `${nameA} overlaps ${nameB}`);
    }
  }
});

test('the Floor 4 floor-plan image ships with the client', () => {
  const file = path.resolve(__dirname, '../../client/public', floor4.floorPlanUrl.replace(/^\//, ''));
  const svg = fs.readFileSync(file, 'utf8');
  assert.match(svg, /viewBox="0 0 1510 740"/);
});

test('npm run seed:floor4 is repeatable and leaves employee-registered equipment alone', async () => {
  const first = await upsertFloor4();
  const room = first.floor.rooms[0];
  await Equipment.create({
    name: 'Staff Added Rower', category: 'Cardio', workoutType: 'Cardio', floor: first.floor._id,
    room: room._id, mapPosition: { x: 0.5, y: 0.5 }, registeredBy: 'demo-employee',
  });
  const second = await upsertFloor4();
  assert.equal(second.removed, floor4Equipment.length);
  assert.equal(String(second.floor._id), String(first.floor._id));
  assert.equal(String(second.floor.rooms[0]._id), String(room._id));
  assert.equal(await Floor.countDocuments({ floorNumber: 4 }), 1);
  assert.equal(await Equipment.countDocuments({ floor: first.floor._id }), floor4Equipment.length + 1);
  assert.ok(await Equipment.exists({ name: 'Staff Added Rower' }));
});

test('the API returns what the map needs to outline a machine on its floor', async () => {
  const floors = await (await fetch(`${baseUrl}/api/floors`)).json();
  const apiFloor = floors.data.find((item) => item.floorNumber === 4);
  assert.equal(apiFloor.floorPlanUrl, '/floorplans/floor-4.svg');

  const result = await (await fetch(`${baseUrl}/api/equipment?q=Hack%20Squat`)).json();
  assert.deepEqual(result.data.map((item) => item.name), ['Plate-Loaded Hack Squat 1', 'Plate-Loaded Hack Squat 2']);
  const [first] = result.data;
  const seeded = floor4Equipment.find((item) => item.name === first.name);
  assert.equal(first.floor._id, String(apiFloor._id));
  assert.equal(first.floor.floorPlanUrl, '/floorplans/floor-4.svg');
  assert.equal(first.room.name, 'Fitness Zone 402');
  assert.deepEqual(first.mapPosition, seeded.mapPosition);
  assert.deepEqual(first.mapSize, seeded.mapSize);
  assert.equal(first.mapLabel, 'Hack Squat');
});
