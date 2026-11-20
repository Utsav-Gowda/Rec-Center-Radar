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

test.each([0, 2])('prefixes an unnamed floor %s and renders a clear missing-floor fallback', async (floorNumber) => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response([
    { ...squatRack, floor: { floorNumber } },
    { ...cableMachine, floor: null },
  ])));
  render(<EquipmentList />);
  await screen.findByRole('heading', { name: 'Squat Rack' });
  expect(screen.getByText(`Floor ${floorNumber}`)).toBeTruthy();
  expect(screen.getByText('Not assigned')).toBeTruthy();
});

test('shows staff verification timestamp and optional notes only for Under Maintenance or Out of Order equipment', async () => {
  const verifiedAt = '2026-11-16T14:30:00.000Z';
  const expectedTimestamp = new Date(verifiedAt).toLocaleString();

  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response([
    {
      ...squatRack,
      status: 'Operational',
      lastVerifiedAt: verifiedAt,
      statusNote: 'Should stay hidden while operational',
    },
    {
      ...cableMachine,
      _id: 'cable-1',
      name: 'Cable Crossover Machine',
      status: 'Under Maintenance',
      lastVerifiedAt: verifiedAt,
      statusNote: 'Left cable frayed; replacement part ordered.',
    },
    {
      ...cableMachine,
      _id: 'treadmill-1',
      name: 'Treadmill',
      status: 'Out of Order',
      lastVerifiedAt: verifiedAt,
    },
  ])));

  render(<EquipmentList />);
  const operationalCard = (await screen.findByRole('heading', { name: 'Squat Rack' })).closest('li');
  const maintenanceCard = screen.getByRole('heading', { name: 'Cable Crossover Machine' }).closest('li');
  const outOfOrderCard = screen.getByRole('heading', { name: 'Treadmill' }).closest('li');

  expect(within(operationalCard).getByText('Operational')).toBeTruthy();
  expect(within(operationalCard).queryByText(/Last verified by staff:/i)).toBeNull();
  expect(within(operationalCard).queryByText(/Should stay hidden while operational/)).toBeNull();

  expect(within(maintenanceCard).getByText('Under Maintenance')).toBeTruthy();
  expect(within(maintenanceCard).getByText(/Last verified by staff:/i)).toBeTruthy();
  expect(within(maintenanceCard).getByText(expectedTimestamp)).toBeTruthy();
  expect(within(maintenanceCard).getByText(/Left cable frayed; replacement part ordered\./)).toBeTruthy();

  expect(within(outOfOrderCard).getByText('Out of Order')).toBeTruthy();
  expect(within(outOfOrderCard).getByText(/Last verified by staff:/i)).toBeTruthy();
  expect(within(outOfOrderCard).getByText(expectedTimestamp)).toBeTruthy();
  expect(within(outOfOrderCard).queryByText(/Staff note:/i)).toBeNull();
});

test('states that condition labels reflect mechanical working order rather than real-time occupancy', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response([squatRack])));
  render(<EquipmentList />);
  await screen.findByRole('heading', { name: 'Squat Rack' });
  expect(screen.getByText(/mechanical working order/i)).toBeTruthy();
  expect(screen.getByText(/not real-time availability or occupancy/i)).toBeTruthy();
});
test('Show on map hands the selected result to the floor map (US2) and is hidden without a handler', async () => {
  const placed = { ...squatRack, floor: { _id: 'floor-2', floorNumber: 2, name: 'Floor 2 - Strength' } };
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response([placed, { ...cableMachine, floor: null }])));
  const onShowOnMap = vi.fn();
  const { rerender } = render(<EquipmentList onShowOnMap={onShowOnMap} />);
  fireEvent.click(await screen.findByRole('button', { name: 'Show Squat Rack on floor map' }));
  expect(onShowOnMap).toHaveBeenCalledWith(placed);
  // A machine without an assigned floor has nowhere to show.
  expect(screen.queryByRole('button', { name: 'Show Cable Crossover Machine on floor map' })).toBeNull();
  rerender(<EquipmentList />);
  expect(screen.queryByRole('button', { name: /on floor map/ })).toBeNull();
});

// US3: filters
const f1 = { _id: 'f1', floorNumber: 1, name: 'Floor 1 - Cardio' };
const f2 = { _id: 'f2', floorNumber: 2, name: 'Floor 2 - Strength' };
const treadmill = { ...squatRack, _id: 'tm', name: 'Treadmill', category: 'Cardio', floor: f1, room: { _id: 'r1', name: 'Cardio Room' } };
const rack = { ...squatRack, _id: 'sr', floor: f2, room: { _id: 'r2', name: 'Weight Room' } };

function filterApi() {
  return vi.fn().mockImplementation((url) => {
    const params = new URL(url, 'http://localhost').searchParams;
    const all = [treadmill, rack];
    const data = all.filter((e) => (!params.get('floor') || e.floor._id === params.get('floor'))
      && (!params.get('category') || e.category === params.get('category')));
    return Promise.resolve(response(data));
  });
}

test('US3: filters combine, show removable chips, and Clear All restores the catalog', async () => {
  const user = userEvent.setup();
  const fetchMock = filterApi();
  vi.stubGlobal('fetch', fetchMock);
  render(<EquipmentList />);
  await screen.findByRole('heading', { name: 'Treadmill' });
  expect(screen.getByRole('heading', { name: 'Squat Rack' })).toBeTruthy();

  await user.selectOptions(screen.getByLabelText('Floor'), 'f2');
  await waitFor(() => expect(screen.queryByRole('heading', { name: 'Treadmill' })).toBeNull());
  expect(fetchMock).toHaveBeenLastCalledWith('/api/equipment?floor=f2', expect.any(Object));
  await user.selectOptions(screen.getByLabelText('Category'), 'Free Weights');
  await waitFor(() => expect(fetchMock).toHaveBeenLastCalledWith('/api/equipment?floor=f2&category=Free%20Weights', expect.any(Object)));

  const chips = within(screen.getByRole('list', { name: 'Active filters' }));
  expect(chips.getByRole('button', { name: 'Remove filter Floor: Floor 2 - Strength' })).toBeTruthy();
  expect(chips.getByRole('button', { name: 'Remove filter Category: Free Weights' })).toBeTruthy();

  await user.click(chips.getByRole('button', { name: 'Remove filter Floor: Floor 2 - Strength' }));
  await waitFor(() => expect(fetchMock).toHaveBeenLastCalledWith('/api/equipment?category=Free%20Weights', expect.any(Object)));
  expect(screen.queryByRole('button', { name: 'Remove filter Floor: Floor 2 - Strength' })).toBeNull();

  await user.click(screen.getByRole('button', { name: 'Clear All' }));
  await screen.findByRole('heading', { name: 'Treadmill' });
  expect(screen.getByRole('heading', { name: 'Squat Rack' })).toBeTruthy();
  expect(screen.queryByRole('list', { name: 'Active filters' })).toBeNull();
  expect(fetchMock).toHaveBeenLastCalledWith('/api/equipment', expect.any(Object));
});

test('US3: choosing a floor limits the room choices and changing floors drops the room filter', async () => {
  const user = userEvent.setup();
  vi.stubGlobal('fetch', filterApi());
  render(<EquipmentList />);
  await screen.findByRole('heading', { name: 'Treadmill' });
  const room = screen.getByLabelText('Room');
  expect(within(room).getAllByRole('option').map((o) => o.textContent)).toEqual(['All rooms', 'Cardio Room', 'Weight Room']);
  await user.selectOptions(screen.getByLabelText('Floor'), 'f1');
  expect(within(room).getAllByRole('option').map((o) => o.textContent)).toEqual(['All rooms', 'Cardio Room']);
  await user.selectOptions(room, 'r1');
  expect(room.value).toBe('r1');
  await user.selectOptions(screen.getByLabelText('Floor'), 'f2');
  expect(room.value).toBe('');
});

test('US3: an empty filtered result explains how to recover', async () => {
  const user = userEvent.setup();
  vi.stubGlobal('fetch', vi.fn().mockImplementation((url) => Promise.resolve(response(url.includes('status=') ? [] : [squatRack]))));
  render(<EquipmentList />);
  await screen.findByRole('heading', { name: 'Squat Rack' });
  await user.selectOptions(screen.getByLabelText('Operational condition'), 'Out of Order');
  await screen.findByText(/No equipment matches the selected filters/);
});
