const assert = require('node:assert/strict');
const { before, beforeEach, after, test } = require('node:test');
const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');
const app = require('../server');

const Floor = mongoose.model('Floor');
const Equipment = mongoose.model('Equipment');
const StatusUpdate = mongoose.model('StatusUpdate');

let database;
let server;
let origin;
let equipment;
const originalDemoMode = process.env.DEMO_EMPLOYEE_MODE;

before(async () => {
  database = await MongoMemoryServer.create();
  await mongoose.connect(database.getUri(), { dbName: 'status_update_test' });

  const floor = await Floor.create({
    floorNumber: 2,
    name: 'Strength',
    floorPlanUrl: '/floorplans/strength.png',
    rooms: [{ name: 'Weight Room' }],
  });

  equipment = await Equipment.create({
    name: 'US5 Test Treadmill',
    category: 'Cardio',
    workoutType: 'Running',
    floor: floor._id,
    room: floor.rooms[0]._id,
    mapPosition: { x: 0.25, y: 0.5 },
    status: 'Operational',
  });

  server = app.listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  origin = `http://127.0.0.1:${server.address().port}`;
}, { timeout: 120000 });

beforeEach(() => {
  process.env.DEMO_EMPLOYEE_MODE = 'false';
});

after(async () => {
  if (server) {
    await new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
  }
  await mongoose.disconnect();
  if (database) await database.stop();
  if (originalDemoMode === undefined) delete process.env.DEMO_EMPLOYEE_MODE;
  else process.env.DEMO_EMPLOYEE_MODE = originalDemoMode;
});

function patchStatus(id, body, role = 'employee') {
  return fetch(`${origin}/api/equipment/${id}/status`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      ...(role ? { 'X-Demo-Role': role } : {}),
    },
    body: JSON.stringify(body),
  });
}

test('rejects status updates with demo mode disabled or missing/community role (US5)', async () => {
  assert.equal((await patchStatus(equipment._id, { status: 'Out of Order' })).status, 403);

  process.env.DEMO_EMPLOYEE_MODE = 'true';
  for (const role of [undefined, 'community', 'admin']) {
    assert.equal((await patchStatus(equipment._id, { status: 'Out of Order' }, role || '')).status, 403);
  }
});

test('rejects invalid equipment ID, unknown equipment, and invalid status/note values (US5)', async () => {
  process.env.DEMO_EMPLOYEE_MODE = 'true';

  assert.equal((await patchStatus('not-an-id', { status: 'Out of Order' })).status, 400);
  assert.equal((await patchStatus(new mongoose.Types.ObjectId(), { status: 'Out of Order' })).status, 404);
  assert.equal((await patchStatus(equipment._id, { status: 'Broken' })).status, 400);
  assert.equal((await patchStatus(equipment._id, { status: 'Out of Order', statusNote: 'x'.repeat(501) })).status, 400);
});

test('updates condition, optional note, verification timestamp, and StatusUpdate audit log (US5)', async () => {
  process.env.DEMO_EMPLOYEE_MODE = 'true';
  const started = Date.now();

  const response = await patchStatus(equipment._id, {
    status: 'Under Maintenance',
    statusNote: '  Belt alignment scheduled for morning shift.  ',
  });
  assert.equal(response.status, 200);

  const { data } = await response.json();
  assert.equal(data.status, 'Under Maintenance');
  assert.equal(data.statusNote, 'Belt alignment scheduled for morning shift.');
  assert.ok(Date.parse(data.lastVerifiedAt) >= started && Date.parse(data.lastVerifiedAt) <= Date.now());

  const logs = await StatusUpdate.find({ equipment: equipment._id }).lean();
  assert.equal(logs.length, 1);
  assert.equal(logs[0].previousStatus, 'Operational');
  assert.equal(logs[0].newStatus, 'Under Maintenance');
  assert.equal(logs[0].note, 'Belt alignment scheduled for morning shift.');
  assert.equal(logs[0].updatedBy, 'demo-employee');
  assert.ok(logs[0].createdAt);
});