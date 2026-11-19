import React from 'react';
import { afterEach, expect, test, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import App from './App.jsx';

afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

test('does not expose demo controls or registration when the API disables demo mode', async () => {
  vi.stubGlobal('fetch', vi.fn().mockImplementation(async (url) => ({
    ok: true,
    json: async () => url === '/api/auth/demo' ? { enabled: false }
      : url === '/api/health' ? { status: 'ok', database: 'connected' }
        : { data: [], count: 0 },
  })));
  render(<App />);
  await screen.findByText('No floors are configured yet.');
  expect(screen.queryByRole('checkbox')).toBeNull();
  expect(screen.queryByRole('heading', { name: 'Register equipment' })).toBeNull();
});

test('selecting a search result opens the floor map on that machine\'s floor and outlines it (US2)', async () => {
  const floor2 = { _id: 'floor-2', floorNumber: 2, name: 'Floor 2 - Strength', floorPlanUrl: '/floorplans/floor-2.png' };
  const floor4 = { _id: 'floor-4', floorNumber: 4, name: 'Floor 4 - Fitness Floor', floorPlanUrl: '/floorplans/floor-4.svg' };
  const rack = { _id: 'rack', name: 'Squat Rack', category: 'Free Weights', status: 'Operational', floor: floor2,
    room: { name: 'Weight Room' }, mapPosition: { x: 0.2, y: 0.3 } };
  const hack = { _id: 'hack', name: 'Plate-Loaded Hack Squat 1', category: 'Plate-Loaded', status: 'Operational', floor: floor4,
    room: { name: 'Fitness Zone 402' }, mapPosition: { x: 0.67, y: 0.61 }, mapSize: { width: 0.05, height: 0.06 }, mapLabel: 'Hack Squat' };
  vi.stubGlobal('fetch', vi.fn().mockImplementation(async (url) => ({
    ok: true,
    json: async () => url === '/api/auth/demo' ? { enabled: false }
      : url === '/api/health' ? { status: 'ok', database: 'connected' }
        : url === '/api/floors' ? { data: [floor2, floor4] } : { data: [rack, hack] },
  })));
  render(<App />);
  await screen.findByRole('button', { name: 'Squat Rack, Weight Room' });
  expect(screen.getByLabelText('Map floor').value).toBe('floor-2');
  fireEvent.click(await screen.findByRole('button', { name: 'Show Plate-Loaded Hack Squat 1 on floor map' }));
  const outline = await screen.findByRole('button', { name: 'Plate-Loaded Hack Squat 1, Fitness Zone 402' });
  expect(screen.getByLabelText('Map floor').value).toBe('floor-4');
  expect(outline.getAttribute('aria-pressed')).toBe('true');
});
