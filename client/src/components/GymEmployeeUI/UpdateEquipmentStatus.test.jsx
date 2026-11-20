import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import UpdateEquipmentStatus from './UpdateEquipmentStatus.jsx';

describe('UpdateEquipmentStatus (US5)', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('pre-fills equipment note and submits PATCH status update with employee header', async () => {
    const mockItems = [
      {
        _id: 'eq1',
        name: 'Cable Crossover',
        status: 'Under Maintenance',
        statusNote: 'Left pulley sticky',
      },
      {
        _id: 'eq2',
        name: 'Rowing Machine',
        status: 'Operational',
        statusNote: '',
      },
    ];

    const fetchMock = vi.fn((url, options) => {
      if (!options || !options.method || options.method === 'GET') {
        return Promise.resolve({
          ok: true,
          json: async () => ({ data: mockItems }),
        });
      }
      return Promise.resolve({
        ok: true,
        json: async () => ({
          data: {
            _id: 'eq2',
            name: 'Rowing Machine',
            status: 'Out of Order',
            statusNote: 'Monitor dead',
            lastVerifiedAt: new Date().toISOString(),
          },
        }),
      });
    });
    vi.stubGlobal('fetch', fetchMock);

    const onUpdated = vi.fn();
    render(<UpdateEquipmentStatus onUpdated={onUpdated} />);

    const noteInput = await screen.findByLabelText(/maintenance note/i);
    expect(noteInput.value).toBe('Left pulley sticky');

    fireEvent.change(screen.getByLabelText(/^equipment$/i), { target: { value: 'eq2' } });
    fireEvent.change(screen.getByLabelText(/^mechanical condition$/i), { target: { value: 'Out of Order' } });
    fireEvent.change(noteInput, { target: { value: 'Monitor dead' } });
    fireEvent.click(screen.getByRole('button', { name: /update equipment status/i }));

    expect(await screen.findByText(/updated rowing machine to out of order/i)).toBeTruthy();
    expect(onUpdated).toHaveBeenCalledTimes(1);

    const patchCall = fetchMock.mock.calls.find(([, opts]) => opts?.method === 'PATCH');
    expect(patchCall[0]).toContain('/api/equipment/eq2/status');
    expect(patchCall[1].headers['x-demo-role']).toBe('employee');
  });
});