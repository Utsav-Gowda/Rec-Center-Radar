import React from 'react';
import { afterEach, expect, test, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import EquipmentList from './EquipmentList.jsx';

const squatRack = {
  _id: 'squat-rack', name: 'Squat Rack', category: 'Free Weights',
  workoutType: 'Strength Training', status: 'Operational',
  floor: { floorNumber: 2, name: 'Floor 2 - Strength' },
};
const cableMachine = {
  ...squatRack, _id: 'cable', name: 'Cable Crossover Machine', category: 'Machines',
};

function response(data, status = 200) {
  return { ok: status === 200, status, json: async () => ({ count: data.length, data }) };
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

test('consumes the real API envelope and displays name, category, and assigned floor', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response([squatRack])));
  render(<EquipmentList />);
  const card = (await screen.findByRole('heading', { name: 'Squat Rack' })).closest('li');
  expect(within(card).getByText(/Free Weights/)).toBeTruthy();
  expect(within(card).getByText('Floor 2 - Strength')).toBeTruthy();
  expect(screen.getByRole('searchbox', { name: 'Search equipment' }).maxLength).toBe(100);
  expect(screen.getByRole('status').textContent).toBe('1 equipment item.');
});

test.each([['Squat Rack', squatRack], ['Strength Training', squatRack], ['Biceps', cableMachine]])('submits %s as one encoded search and renders within 1.5 s with a fast API', async (query, item) => {
  const fetchMock = vi.fn().mockResolvedValueOnce(response([])).mockResolvedValue(response([item]));
  vi.stubGlobal('fetch', fetchMock);
  render(<EquipmentList />);
  await screen.findByText('No equipment available yet.');
  const started = performance.now();
  fireEvent.change(screen.getByRole('searchbox'), { target: { value: `  ${query}  ` } });
  expect(screen.getByRole('status').textContent).toBe('Searching equipment…');
  await screen.findByRole('heading', { name: item.name });
  expect(performance.now() - started).toBeLessThan(1500);
  expect(fetchMock).toHaveBeenLastCalledWith(`/api/equipment?q=${encodeURIComponent(query)}`, expect.objectContaining({ signal: expect.any(AbortSignal) }));
});

test('shows spelling guidance when a query has no results, and Clear search restores the catalog', async () => {
  const user = userEvent.setup();
  const fetchMock = vi.fn().mockImplementation((url) => Promise.resolve(response(url.includes('?') ? [] : [squatRack])));
  vi.stubGlobal('fetch', fetchMock);
  render(<EquipmentList />);
  await screen.findByRole('heading', { name: 'Squat Rack' });
  await user.type(screen.getByRole('searchbox'), 'zzzz');
  await screen.findByText(/Check your spelling or try different search terms/);
  expect(screen.queryByRole('heading', { name: 'Squat Rack' })).toBeNull();
  await user.click(screen.getByRole('button', { name: 'Clear search' }));
  await screen.findByRole('heading', { name: 'Squat Rack' });
  expect(screen.getByRole('searchbox').value).toBe('');
  expect(fetchMock).toHaveBeenLastCalledWith('/api/equipment', expect.any(Object));
});

test('cancels obsolete requests and ignores a late response even if fetch ignores abort', async () => {
  let resolveOldRequest;
  const fetchMock = vi.fn()
    .mockResolvedValueOnce(response([squatRack]))
    .mockImplementationOnce(() => new Promise((resolve) => { resolveOldRequest = resolve; }))
    .mockResolvedValueOnce(response([cableMachine]));
  vi.stubGlobal('fetch', fetchMock);
  render(<EquipmentList />);
  await screen.findByRole('heading', { name: 'Squat Rack' });
  fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'Squat' } });
  await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
  const oldSignal = fetchMock.mock.calls[1][1].signal;
  fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'Biceps' } });
  expect(oldSignal.aborted).toBe(true);
  expect(screen.queryByRole('heading', { name: 'Squat Rack' })).toBeNull();
  await screen.findByRole('heading', { name: 'Cable Crossover Machine' });
  await act(async () => resolveOldRequest(response([squatRack])));
  expect(screen.queryByRole('heading', { name: 'Squat Rack' })).toBeNull();
  expect(screen.getByRole('heading', { name: 'Cable Crossover Machine' })).toBeTruthy();
});

test('coalesces rapid input and keeps the search box available while loading', async () => {
  const fetchMock = vi.fn().mockResolvedValue(response([]));
  vi.stubGlobal('fetch', fetchMock);
  render(<EquipmentList />);
  await screen.findByText('No equipment available yet.');
  const input = screen.getByRole('searchbox');
  for (const value of ['B', 'Bi', 'Biceps']) fireEvent.change(input, { target: { value } });
  expect(input.disabled).toBe(false);
  await screen.findByText(/No equipment matches/);
  expect(fetchMock).toHaveBeenCalledTimes(2);
  expect(fetchMock.mock.calls[1][0]).toBe('/api/equipment?q=Biceps');
});

test('keeps API errors distinct from empty results and allows retry', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(response([], 500)).mockResolvedValueOnce(response([squatRack])));
  render(<EquipmentList />);
  await screen.findByRole('alert');
  expect(screen.queryByText(/No equipment/)).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'Retry search' }));
  await screen.findByRole('heading', { name: 'Squat Rack' });
  expect(screen.queryByRole('alert')).toBeNull();
});

test('rejects malformed API data instead of silently showing no matches', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => [] }));
  render(<EquipmentList />);
  await screen.findByRole('alert');
  expect(screen.queryByText(/No equipment/)).toBeNull();
});

test('renders an unnamed floor number including zero, or a clear missing-floor fallback', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response([
    { ...squatRack, floor: { floorNumber: 0 } },
    { ...cableMachine, floor: null },
  ])));
  render(<EquipmentList />);
  await screen.findByRole('heading', { name: 'Squat Rack' });
  expect(screen.getByText('0')).toBeTruthy();
  expect(screen.getByText('Not assigned')).toBeTruthy();
});
