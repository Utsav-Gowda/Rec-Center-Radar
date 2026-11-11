import React from 'react';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { URL } from 'node:url';
import { transferableAbortController } from 'node:util';
import { afterAll, afterEach, beforeAll, expect, test, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import EquipmentList from '../src/components/PittCommunityMemberUI/EquipmentPortal/EquipmentList.jsx';

// This suite spans both packages. Run npm ci in client/ and server/ first.
const serverRequire = createRequire(resolve('../server/package.json'));
const { MongoMemoryServer } = serverRequire('mongodb-memory-server');
const mongoose = serverRequire('mongoose');
const app = serverRequire('./server');
const Floor = mongoose.model('Floor');
const Equipment = mongoose.model('Equipment');
const { floors, equipment } = serverRequire('./src/data/seedEquipment');
const nativeFetch = globalThis.fetch;
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

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

afterAll(async () => {
  if (server) await new Promise((resolve, reject) => server.close((err) => err ? reject(err) : resolve()));
  await mongoose.disconnect();
  if (database) await database.stop();
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
