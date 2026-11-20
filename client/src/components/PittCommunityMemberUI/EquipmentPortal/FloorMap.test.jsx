import React from 'react';
import { afterEach, expect, test, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import FloorMap from './FloorMap.jsx';

afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

function stubCatalog(floors, equipment) {
  vi.stubGlobal('fetch', vi.fn().mockImplementation(async (url) => ({
    ok: true, json: async () => ({ data: url === '/api/floors' ? floors : equipment }),
  })));
}

const floor2 = { _id: 'floor-2', floorNumber: 2, name: 'Floor 2 - Strength', floorPlanUrl: '/missing-floor-plan.png' };
const floor4 = { _id: 'floor-4', floorNumber: 4, name: 'Floor 4 - Fitness Floor', floorPlanUrl: '/floorplans/floor-4.svg' };
const room = { _id: 'room', name: 'Fitness Zone 402' };
const hackSquat = {
  _id: 'hack-1', name: 'Plate-Loaded Hack Squat 1', category: 'Plate-Loaded', status: 'Operational', floor: floor4, room,
  mapPosition: { x: 0.6716, y: 0.6081 }, mapSize: { width: 0.0477, height: 0.0622 }, mapLabel: 'Hack Squat',
};
const legPress = { ...hackSquat, _id: 'press-1', name: 'Plate-Loaded Leg Press 1', mapLabel: 'Leg Press', mapPosition: { x: 0.5, y: 0.6 } };
const squatRack = { _id: 'squat', name: 'Squat Rack', category: 'Free Weights', floor: floor2, room: { name: 'Weight Room' }, mapPosition: { x: 0.2, y: 0.3 } };

test('shows stored coordinates and selection, and clearly labels a missing floor-plan image', async () => {
  const floor = { _id: 'floor-2', floorNumber: 2, floorPlanUrl: '/missing-floor-plan.png' };
  const item = { _id: 'machine', name: 'Cable Machine', category: 'Machines', floor, room: { name: 'Weight Room' }, mapPosition: { x: 0.25, y: 0.5 } };
  stubCatalog([floor], [item]);
  render(<FloorMap />);
  const marker = await screen.findByRole('button', { name: 'Cable Machine, Weight Room' });
  expect(marker.style.left).toBe('25%');
  expect(marker.style.top).toBe('50%');
  expect(screen.getByRole('option', { name: 'Floor 2' })).toBeTruthy();
  fireEvent.error(screen.getByRole('img', { name: 'Floor plan for Floor 2' }));
  expect(screen.getByText(/not the actual floor layout/)).toBeTruthy();
  fireEvent.click(marker);
  expect(marker.getAttribute('aria-pressed')).toBe('true');
  expect(screen.getByRole('status').textContent).toContain('Cable Machine · Machines · Floor 2 · Weight Room');
});

test('surfaces API failures rather than displaying an empty map as if loading succeeded', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 500 }));
  render(<FloorMap />);
  await screen.findByRole('alert');
  expect(screen.queryByLabelText('Map floor')).toBeNull();
  expect(screen.getByRole('button', { name: 'Refresh map' }).disabled).toBe(false);
});

test('a selected search result opens its own floor and outlines its exact footprint within 2 seconds', async () => {
  stubCatalog([floor2, floor4], [squatRack, hackSquat, legPress]);
  const started = performance.now();
  const { rerender } = render(<FloorMap />);
  await screen.findByRole('button', { name: 'Squat Rack, Weight Room' });
  expect(screen.getByLabelText('Map floor').value).toBe('floor-2');

  rerender(<FloorMap focusEquipment={{ ...hackSquat, scrollToMap: true }} />);
  const outline = await screen.findByRole('button', { name: 'Plate-Loaded Hack Squat 1, Fitness Zone 402' });
  expect(performance.now() - started).toBeLessThan(2000);
  expect(screen.getByLabelText('Map floor').value).toBe('floor-4');
  expect(screen.getByRole('img', { name: 'Floor plan for Floor 4 - Fitness Floor' }).getAttribute('src')).toBe('/floorplans/floor-4.svg');
  expect(screen.queryByRole('button', { name: 'Squat Rack, Weight Room' })).toBeNull();

  expect(outline.className).toBe('map-machine');
  expect(outline.getAttribute('aria-pressed')).toBe('true');
  expect(outline.style.left).toBe(`${0.6716 * 100}%`);
  expect(outline.style.width).toBe(`${0.0477 * 100}%`);
  expect(outline.style.height).toBe(`${0.0622 * 100}%`);
  expect(within(outline).getByText('Hack Squat')).toBeTruthy();
  expect(screen.getByRole('button', { name: 'Plate-Loaded Leg Press 1, Fitness Zone 402' }).getAttribute('aria-pressed')).toBe('false');
  expect(screen.getByRole('status').textContent)
    .toBe('Plate-Loaded Hack Squat 1 · Plate-Loaded · Floor 4 - Fitness Floor · Fitness Zone 402 · Operational');
  expect(document.querySelector('.map-callout').textContent).toBe('Plate-Loaded Hack Squat 1');
});

test('picking another machine moves the outline, and changing floors clears it', async () => {
  stubCatalog([floor2, floor4], [squatRack, hackSquat, legPress]);
  render(<FloorMap focusEquipment={hackSquat} />);
  const press = await screen.findByRole('button', { name: 'Plate-Loaded Leg Press 1, Fitness Zone 402' });
  fireEvent.click(press);
  expect(press.getAttribute('aria-pressed')).toBe('true');
  expect(screen.getByRole('button', { name: 'Plate-Loaded Hack Squat 1, Fitness Zone 402' }).getAttribute('aria-pressed')).toBe('false');
  expect(document.querySelectorAll('.map-callout')).toHaveLength(1);
  fireEvent.change(screen.getByLabelText('Map floor'), { target: { value: 'floor-2' } });
  expect(document.querySelector('.map-callout')).toBeNull();
  expect(screen.queryByRole('status')).toBeNull();
});

test('zoom keeps the whole floor at 100% and enlarges it for small screens on request', async () => {
  stubCatalog([floor4], [hackSquat]);
  render(<FloorMap focusEquipment={hackSquat} />);
  await screen.findByRole('button', { name: 'Plate-Loaded Hack Squat 1, Fitness Zone 402' });
  const map = screen.getByLabelText('Equipment positions on Floor 4 - Fitness Floor');
  expect(map.style.width).toBe('100%');
  expect(screen.getByRole('button', { name: 'Zoom out' }).disabled).toBe(true);
  fireEvent.click(screen.getByRole('button', { name: 'Zoom in' }));
  expect(map.style.width).toBe('200%');
  fireEvent.click(screen.getByRole('button', { name: 'Zoom in' }));
  expect(map.style.width).toBe('300%');
  expect(screen.getByRole('button', { name: 'Zoom in' }).disabled).toBe(true);
});

test('explains when a selected machine has no saved map position', async () => {
  const unplaced = { ...squatRack, _id: 'no-position', name: 'Mystery Machine', mapPosition: undefined };
  stubCatalog([floor2], [squatRack, unplaced]);
  render(<FloorMap focusEquipment={unplaced} />);
  await screen.findByText('Mystery Machine does not have a saved map position yet.');
});
