const assert = require('node:assert/strict');
const { before, beforeEach, after, test } = require('node:test');
const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');
const app = require('../server');
const Floor = mongoose.model('Floor');
const Equipment = mongoose.model('Equipment');

let database;
let server;
let origin;
let floors;
const originalDemoMode = process.env.DEMO_EMPLOYEE_MODE;

before(async () => {
  database = await MongoMemoryServer.create();
  await mongoose.connect(database.getUri(), { dbName: 'registration_test' });
  floors = await Floor.create([
    { floorNumber: 0, floorPlanUrl: '/floorplans/ground.png', rooms: [{ name: 'Ground room' }] },
    { floorNumber: 2, name: 'Strength', floorPlanUrl: '/floorplans/strength.png', rooms: [{ name: 'Weight Room' }] },
  ]);
  server = app.listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  origin = `http://127.0.0.1:${server.address().port}`;
}, { timeout: 120000 });

beforeEach(() => { process.env.DEMO_EMPLOYEE_MODE = 'false'; });

after(async () => {
  if (server) await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  await mongoose.disconnect();
  if (database) await database.stop();
  if (originalDemoMode === undefined) delete process.env.DEMO_EMPLOYEE_MODE;
  else process.env.DEMO_EMPLOYEE_MODE = originalDemoMode;
});

function validEntry() {
  return {
    name: 'New Biceps Machine', category: 'Machines', workoutType: 'Strength Training', muscleGroups: ['Biceps'],
    floor: String(floors[1]._id), room: String(floors[1].rooms[0]._id), mapPosition: { x: 0.25, y: 0.5 },
  };
}

function register(body, role = 'employee') {
  return fetch(`${origin}/api/equipment`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', ...(role ? { 'X-Demo-Role': role } : {}) },
    body: JSON.stringify(body),
  });
}

test('demo capability reports the configured state without creating a sign-in session', async () => {
  const disabled = await fetch(`${origin}/api/auth/demo`);
  assert.equal(disabled.headers.get('cache-control'), 'no-store');
  assert.equal((await disabled.json()).enabled, false);
  process.env.DEMO_EMPLOYEE_MODE = 'true';
  const enabled = await (await fetch(`${origin}/api/auth/demo`)).json();
  assert.equal(enabled.enabled, true);
  assert.equal(enabled.employeeId, 'demo-employee');
});

test('rejects writes with demo mode disabled and with a community member or missing role', async () => {
  const beforeCount = await Equipment.countDocuments();
  assert.equal((await register(validEntry())).status, 403);
  process.env.DEMO_EMPLOYEE_MODE = 'true';
  for (const role of [undefined, 'community', 'admin']) {
    assert.equal((await register(validEntry(), role || '')).status, 403);
  }
  assert.equal(await Equipment.countDocuments(), beforeCount);
});

test('lists floors and room IDs in floor order, including an unnamed floor zero', async () => {
  const response = await fetch(`${origin}/api/floors`);
  assert.equal(response.status, 200);
  const { data, count } = await response.json();
  assert.equal(count, 2);
  assert.deepEqual(data.map((floor) => floor.floorNumber), [0, 2]);
  assert.equal(data[1].rooms[0].name, 'Weight Room');
  assert.ok(data[1].rooms[0]._id);
});

test('registers, audits, and exposes equipment to search and map consumers', async () => {
  process.env.DEMO_EMPLOYEE_MODE = 'true';
  const started = Date.now();
  const response = await register({ ...validEntry(), name: '  New Biceps Machine  ', registeredBy: 'forged-user', createdAt: '2000-01-01', status: 'Out of Order' });
  assert.equal(response.status, 201);
  const { data } = await response.json();
  assert.equal(data.name, 'New Biceps Machine');
  assert.equal(data.registeredBy, 'demo-employee');
  assert.equal(data.status, 'Operational');
  assert.ok(Date.parse(data.createdAt) >= started && Date.parse(data.createdAt) <= Date.now());
  assert.equal(data.floor.floorNumber, 2);
  assert.equal(data.floor.floorPlanUrl, '/floorplans/strength.png');
  assert.equal(data.room.name, 'Weight Room');
  const search = await (await fetch(`${origin}/api/equipment?q=New%20Biceps`)).json();
  assert.ok(search.data.some((item) => item._id === data._id));
  const stored = await Equipment.findById(data._id).lean();
  assert.deepEqual(stored.mapPosition, { x: 0.25, y: 0.5 });
  assert.equal(stored.registeredBy, 'demo-employee');
});

for (const field of ['name', 'category', 'workoutType', 'floor', 'room', 'mapPosition']) {
  test(`missing ${field} returns a field-specific error and creates no record`, async () => {
    process.env.DEMO_EMPLOYEE_MODE = 'true';
    const body = validEntry();
    delete body[field];
    const beforeCount = await Equipment.countDocuments();
    const response = await register(body);
    assert.equal(response.status, 400);
    assert.equal(typeof (await response.json()).errors[field], 'string');
    assert.equal(await Equipment.countDocuments(), beforeCount);
  });
}

test('rejects a room from another floor and a floor that does not exist', async () => {
  process.env.DEMO_EMPLOYEE_MODE = 'true';
  for (const [body, field] of [
    [{ ...validEntry(), room: String(floors[0].rooms[0]._id) }, 'room'],
    [{ ...validEntry(), floor: String(new mongoose.Types.ObjectId()) }, 'floor'],
  ]) {
    const response = await register(body);
    assert.equal(response.status, 400);
    assert.ok((await response.json()).errors[field]);
  }
});

test('rejects invalid coordinates, object IDs, oversized text, and malformed muscle groups', async () => {
  process.env.DEMO_EMPLOYEE_MODE = 'true';
  for (const [change, field] of [
    [{ mapPosition: { x: -0.1, y: 0.2 } }, 'mapPosition'],
    [{ mapPosition: { x: 0.2, y: 1.1 } }, 'mapPosition'],
    [{ mapPosition: { x: '0.2', y: 0.2 } }, 'mapPosition'],
    [{ floor: { $ne: null } }, 'floor'],
    [{ name: ' ' }, 'name'],
    [{ name: 'x'.repeat(121) }, 'name'],
    [{ muscleGroups: 'Biceps' }, 'muscleGroups'],
  ]) {
    const response = await register({ ...validEntry(), ...change });
    assert.equal(response.status, 400);
    assert.ok((await response.json()).errors[field]);
  }
});

test('accepts edge positions at 0% and 100%', async () => {
  process.env.DEMO_EMPLOYEE_MODE = 'true';
  const response = await register({ ...validEntry(), name: 'Corner Machine', mapPosition: { x: 0, y: 1 } });
  assert.equal(response.status, 201);
});
