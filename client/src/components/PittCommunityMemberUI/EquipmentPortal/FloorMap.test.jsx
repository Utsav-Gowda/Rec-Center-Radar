import React from 'react';
import { afterEach, expect, test, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import FloorMap from './FloorMap.jsx';

afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

test('shows stored coordinates and selection, and clearly labels a missing floor-plan image', async () => {
  const floor = { _id: 'floor-2', floorNumber: 2, floorPlanUrl: '/missing-floor-plan.png' };
  const item = { _id: 'machine', name: 'Cable Machine', category: 'Machines', floor, room: { name: 'Weight Room' }, mapPosition: { x: 0.25, y: 0.5 } };
  vi.stubGlobal('fetch', vi.fn().mockImplementation(async (url) => ({ ok: true, json: async () => ({ data: url === '/api/floors' ? [floor] : [item] }) })));
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
