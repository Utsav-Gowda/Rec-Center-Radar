import React from 'react';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { URL } from 'node:url';
import { transferableAbortController } from 'node:util';
import { afterAll, afterEach, beforeAll, expect, test, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import EquipmentList from '../src/components/PittCommunityMemberUI/EquipmentPortal/EquipmentList.jsx';
import App from '../src/App.jsx';

// This suite spans both packages. Run npm ci in client/ and server/ first.
const serverRequire = createRequire(resolve('../server/package.json'));
const { MongoMemoryServer } = serverRequire('mongodb-memory-server');
const mongoose = serverRequire('mongoose');
const app = serverRequire('./server');
const Floor = mongoose.model('Floor');
const Equipment = mongoose.model('Equipment');
const { floors, equipment } = serverRequire('./src/data/seedEquipment');
const nativeFetch = globalThis.fetch;
const serverProcess = serverRequire('node:process');
const originalDemoMode = serverProcess.env.DEMO_EMPLOYEE_MODE;
let database;
let server;
let origin;

beforeAll(async () => {
  database = await MongoMemoryServer.create();
  await mongoose.connect(database.getUri(), { dbName: 'equipment_search_ui_test' });
  const createdFloors = await Floor.create(floors);
  await Equipment.insertMany(equipment.map(({ floorNumber, roomName, ...item }) => {
    const floor = createdFloors.find((candidate) => candidate.floorNumber === floorNumber);
    return { ...item, floor: floor._id, room: floor.rooms.find((room) => room.name === roomName)._id };
  }));
  server = app.listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  origin = `http://127.0.0.1:${server.address().port}`;
});

afterEach(async () => {
  cleanup();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  if (mongoose.connection.readyState === 1) await Equipment.deleteMany({ registeredBy: 'demo-employee' });
});

afterAll(async () => {
  if (server) await new Promise((resolve, reject) => server.close((err) => err ? reject(err) : resolve()));
  await mongoose.disconnect();
  if (database) await database.stop();
  if (originalDemoMode === undefined) delete serverProcess.env.DEMO_EMPLOYEE_MODE;
  else serverProcess.env.DEMO_EMPLOYEE_MODE = originalDemoMode;
});

test('demo role → registration → shared database → refreshed search and map', async () => {
  serverProcess.env.DEMO_EMPLOYEE_MODE = 'true';
  // Exercise the direct API URLs used by the Pages build, without the Vite proxy.
  vi.stubEnv('VITE_API_BASE_URL', origin);
  vi.stubGlobal('AbortController', transferableAbortController().constructor);
  vi.stubGlobal('fetch', (url, options) => {
    expect(url.startsWith(`${origin}/api/`)).toBe(true);
    return nativeFetch(url, options);
  });
  render(<App />);
  const role = await screen.findByRole('checkbox', { name: 'View as gym employee (demo)' });
  expect(screen.queryByRole('heading', { name: 'Register equipment' })).toBeNull();
  fireEvent.click(role);
  await screen.findByRole('button', { name: 'Register equipment' });
  const floor = await Floor.findOne({ floorNumber: 2 });
  for (const [name, value] of [
    ['Equipment name (required)', 'Sprint Registration Machine'], ['Category (required)', 'Machines'],
    ['Workout type (required)', 'Strength Training'], ['Muscle groups (comma separated, optional)', 'Biceps'],
    ['Floor (required)', String(floor._id)], ['Assigned room (required)', String(floor.rooms[0]._id)],
    ['X position (%) (required)', '25'], ['Y position (%) (required)', '50'],
  ]) fireEvent.change(screen.getByLabelText(name), { target: { value } });
  fireEvent.click(screen.getByRole('button', { name: 'Register equipment' }));
  await screen.findByText(/Registered Sprint Registration Machine as demo-employee/);
  const searchResults = await screen.findByRole('list', { name: 'Equipment results' });
  await within(searchResults).findByRole('heading', { name: 'Sprint Registration Machine' });
  const marker = await screen.findByRole('button', { name: 'Sprint Registration Machine, Weight Room' });
  expect(marker.style.left).toBe('25%');
  expect(marker.style.top).toBe('50%');
  expect(marker.getAttribute('aria-pressed')).toBe('true');
  expect(screen.getByLabelText('Map floor').value).toBe(String(floor._id));
  const stored = await Equipment.findOne({ name: 'Sprint Registration Machine' }).lean();
  expect(stored.registeredBy).toBe('demo-employee');
  expect(Number.isFinite(Date.parse(stored.createdAt.toISOString()))).toBe(true);

  // A second client request sees the same persisted record, rather than browser-only state.
  const otherClient = await nativeFetch(`${origin}/api/equipment?q=Sprint%20Registration`);
  expect((await otherClient.json()).data[0]._id).toBe(String(stored._id));
  fireEvent.click(role);
  expect(screen.queryByRole('heading', { name: 'Register equipment' })).toBeNull();
});

test('input → HTTP API → MongoDB → rendered cards satisfies all three acceptance examples', async () => {
  // Node fetch requires Node's AbortSignal, rather than jsdom's DOM realm.
  vi.stubGlobal('AbortController', transferableAbortController().constructor);
  // Forward the component's relative URLs over real HTTP; no canned API responses.
  vi.stubGlobal('fetch', async (url, options) => {
    try {
      return await nativeFetch(new URL(url, origin), options);
    } catch (error) {
      console.error('Integration HTTP request failed:', error);
      throw error;
    }
  });
  render(<EquipmentList />);
  await screen.findByText('8 equipment items.');

  for (const [query, count, firstName] of [
    ['Squat Rack', 1, 'Squat Rack'],
    ['Strength Training', 5, 'Bench Press'],
    ['Biceps', 3, 'Cable Crossover Machine'],
  ]) {
    const started = performance.now();
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: query } });
    await screen.findByText(`${count} equipment ${count === 1 ? 'item' : 'items'} matching “${query}”.`);
    const duration = performance.now() - started;
    const cards = within(screen.getByRole('list', { name: 'Equipment results' })).getAllByRole('listitem');
    expect(cards).toHaveLength(count);
    expect(within(cards[0]).getByRole('heading', { name: firstName })).toBeTruthy();
    for (const card of cards) {
      expect(within(card).getByText(/^(Free Weights|Machines|Cardio) ·/)).toBeTruthy();
      expect(within(card).getByText(/Floor [12] -/)).toBeTruthy();
    }
    console.info(`${query}: ${duration.toFixed(1)} ms from input to rendered results (local MongoDB + HTTP + DOM)`);
    expect(duration).toBeLessThan(1500);
  }

  fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'zzzzzz' } });
  await screen.findByText(/Check your spelling or try different search terms/);
  expect(screen.queryByRole('list', { name: 'Equipment results' })).toBeNull();
});
