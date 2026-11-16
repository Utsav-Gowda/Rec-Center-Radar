import React from 'react';
import { afterEach, expect, test, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import RegisterEquipment from './RegisterEquipment.jsx';

const floors = [
  { _id: 'floor-0', floorNumber: 0, rooms: [{ _id: 'room-0', name: 'Ground Room' }] },
  { _id: 'floor-2', floorNumber: 2, name: 'Strength', rooms: [{ _id: 'room-2', name: 'Weight Room' }] },
];
const reply = (data, status = 200) => ({ ok: status < 400, status, json: async () => data });

afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

async function fillForm() {
  await screen.findByRole('button', { name: 'Register equipment' });
  for (const [name, value] of [
    ['Equipment name (required)', 'New Machine'], ['Category (required)', 'Machines'],
    ['Workout type (required)', 'Strength Training'], ['Muscle groups (comma separated, optional)', 'Biceps, Back'],
    ['Floor (required)', 'floor-2'], ['Assigned room (required)', 'room-2'],
    ['X position (%) (required)', '25'], ['Y position (%) (required)', '50'],
  ]) fireEvent.change(screen.getByLabelText(name), { target: { value } });
}

test('shows required-field errors and does not post an incomplete entry', async () => {
  const fetchMock = vi.fn().mockResolvedValue(reply({ data: floors }));
  vi.stubGlobal('fetch', fetchMock);
  render(<RegisterEquipment />);
  const button = await screen.findByRole('button', { name: 'Register equipment' });
  fireEvent.click(button);
  expect(screen.getByRole('alert').textContent).toMatch(/highlighted fields/);
  for (const message of ['Equipment name is required.', 'Category is required.', 'Floor is required.', 'Assigned room is required.']) {
    expect(screen.getByText(message)).toBeTruthy();
  }
  expect(screen.getByText(/Assigned location needs X and Y/)).toBeTruthy();
  expect(fetchMock).toHaveBeenCalledTimes(1);
});

test('changing floors clears the assigned room and coordinates', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(reply({ data: floors })));
  render(<RegisterEquipment />);
  await fillForm();
  fireEvent.change(screen.getByLabelText('Floor (required)'), { target: { value: 'floor-0' } });
  expect(screen.getByLabelText('Assigned room (required)').value).toBe('');
  expect(screen.getByLabelText('X position (%) (required)').value).toBe('');
  expect(screen.queryByRole('option', { name: 'Weight Room' })).toBeNull();
  expect(screen.getByRole('option', { name: 'Floor 0' })).toBeTruthy();
});

test('posts a demo-role request with normalized location and reports server audit fields', async () => {
  const saved = { _id: 'new-machine', name: 'New Machine', registeredBy: 'demo-employee', createdAt: '2026-11-16T12:00:00Z' };
  const fetchMock = vi.fn().mockResolvedValueOnce(reply({ data: floors })).mockResolvedValueOnce(reply({ data: saved }, 201));
  vi.stubGlobal('fetch', fetchMock);
  const created = vi.fn();
  render(<RegisterEquipment onCreated={created} />);
  await fillForm();
  fireEvent.click(screen.getByRole('button', { name: 'Register equipment' }));
  await screen.findByText(/Registered New Machine as demo-employee/);
  const [url, options] = fetchMock.mock.calls[1];
  expect(url).toBe('/api/equipment');
  expect(options.headers['X-Demo-Role']).toBe('employee');
  const body = JSON.parse(options.body);
  expect(body.mapPosition).toEqual({ x: 0.25, y: 0.5 });
  expect(body.muscleGroups).toEqual(['Biceps', 'Back']);
  expect(body.registeredBy).toBeUndefined();
  expect(body.createdAt).toBeUndefined();
  expect(created).toHaveBeenCalledWith(saved);
});

test('keeps input and surfaces backend validation errors without reporting success', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(reply({ data: floors }))
    .mockResolvedValueOnce(reply({ error: 'Check the highlighted fields.', errors: { room: 'Room does not belong to the selected floor.' } }, 400)));
  const created = vi.fn();
  render(<RegisterEquipment onCreated={created} />);
  await fillForm();
  fireEvent.click(screen.getByRole('button', { name: 'Register equipment' }));
  await screen.findByText('Room does not belong to the selected floor.');
  expect(screen.getByLabelText('Assigned room (required)').getAttribute('aria-invalid')).toBe('true');
  expect(screen.getByLabelText('Equipment name (required)').value).toBe('New Machine');
  expect(created).not.toHaveBeenCalled();
});

test('handles missing floor data and lets a failed floor request be retried', async () => {
  vi.stubGlobal('fetch', vi.fn().mockRejectedValueOnce(new Error('Network down')).mockResolvedValueOnce(reply({ data: [] })));
  render(<RegisterEquipment />);
  await screen.findByRole('alert');
  fireEvent.click(screen.getByRole('button', { name: 'Retry floors' }));
  await screen.findByText(/No floors are configured yet/);
  expect(screen.queryByRole('button', { name: 'Register equipment' })).toBeNull();
});
