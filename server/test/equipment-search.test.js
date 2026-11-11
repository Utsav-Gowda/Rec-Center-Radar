const assert = require('node:assert/strict');
const { before, after, test } = require('node:test');
const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');
// Import the real app first: its routes must register models needed for population.
const app = require('../server');
const Equipment = mongoose.model('Equipment');
const Floor = mongoose.model('Floor');
const { floors, equipment } = require('../src/data/seedEquipment');

let database;
let server;
let baseUrl;
const catalogSize = equipment.length + 1001;

before(async () => {
  // Explicit local URI: never connect to or seed the shared Atlas database.
  database = await MongoMemoryServer.create();
  await mongoose.connect(database.getUri(), { dbName: 'equipment_search_test' });
  const createdFloors = await Floor.create(floors);
  const byNumber = new Map(createdFloors.map((floor) => [floor.floorNumber, floor]));
  const documents = equipment.map(({ floorNumber, roomName, ...item }) => {
    const floor = byNumber.get(floorNumber);
    return { ...item, floor: floor._id, room: floor.rooms.find((room) => room.name === roomName)._id };
  });
  const location = { floor: createdFloors[0]._id, room: createdFloors[0].rooms[0]._id, mapPosition: { x: 0.5, y: 0.5 } };
  documents.push({ ...location, name: 'Cable (Wide) + Bar', category: 'Machines', workoutType: 'Mobility', muscleGroups: ['Shoulders'] });
  for (let index = 0; index < 1000; index++) {
    documents.push({ ...location, name: `Exercise Station ${index}`, category: 'Machines', workoutType: 'Mobility', muscleGroups: ['Core'] });
  }
  await Equipment.insertMany(documents);
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

async function search(query) {
  const response = await fetch(`${baseUrl}/api/equipment${query === undefined ? '' : `?q=${encodeURIComponent(query)}`}`);
  assert.equal(response.status, 200);
  return response.json();
}

test('the real app starts and keeps placeholder routers mounted', async () => {
  assert.equal((await fetch(`${baseUrl}/api/health`)).status, 200);
  for (const path of ['reports', 'reports/example', 'announcements', 'auth']) {
    assert.equal((await fetch(`${baseUrl}/api/${path}`)).status, 501);
  }
});

test('an omitted or whitespace-only query returns the catalog in name order', async () => {
  for (const query of [undefined, '   ']) {
    const result = await search(query);
    assert.equal(result.count, catalogSize);
    assert.equal(result.data.length, catalogSize);
    assert.equal(result.data[0].name, 'Bench Press');
  }
});

for (const [query, names] of [
  ['  sQuAt rAcK  ', ['Squat Rack']],
  ['rack', ['Squat Rack']],
  ['Strength Training', ['Bench Press', 'Cable Crossover Machine', 'Lat Pulldown', 'Leg Press', 'Squat Rack']],
  ['bIcEpS', ['Cable Crossover Machine', 'Lat Pulldown', 'Rowing Machine']],
]) {
  test(`searches name, workout type, or muscle groups for ${JSON.stringify(query)}`, async () => {
    const result = await search(query);
    assert.equal(result.count, names.length);
    assert.deepEqual(result.data.map((item) => item.name), names);
    for (const item of result.data) {
      assert.ok(item.category);
      assert.ok(Number.isInteger(item.floor.floorNumber));
      assert.ok(item.floor.name);
      assert.ok(item.room.name);
    }
  });
}

test('no match returns an empty result rather than an error or category-only matches', async () => {
  for (const query of ['not-a-machine', 'Free Weights']) {
    assert.deepEqual(await search(query), { count: 0, data: [] });
  }
});

test('regex punctuation is treated literally', async () => {
  assert.equal((await search('(Wide) +')).data[0].name, 'Cable (Wide) + Bar');
  for (const query of ['.*', '[', '^', '$', '\\', '?']) {
    assert.deepEqual(await search(query), { count: 0, data: [] });
  }
});

test('rejects oversized, null-containing, or repeated query values', async () => {
  for (const suffix of [`q=${'x'.repeat(101)}`, 'q=%00', 'q=Squat&q=Biceps']) {
    const response = await fetch(`${baseUrl}/api/equipment?${suffix}`);
    assert.equal(response.status, 400);
    assert.equal(typeof (await response.json()).error, 'string');
  }
});

test('each acceptance query completes within the API budget on a 1,009-item catalog', async (context) => {
  // Reserve 200 ms of the 1.5 s goal for the client's typing debounce.
  for (const query of ['Squat Rack', 'Strength Training', 'Biceps']) {
    const started = performance.now();
    const result = await search(query);
    const duration = performance.now() - started;
    assert.ok(result.count > 0);
    context.diagnostic(`${query}: ${duration.toFixed(1)} ms (local MongoDB, ${catalogSize} items)`);
    assert.ok(duration < 1300, `${query} took ${duration.toFixed(1)} ms`);
  }
});
