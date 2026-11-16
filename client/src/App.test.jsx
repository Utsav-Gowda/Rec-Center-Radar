import React from 'react';
import { afterEach, expect, test, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
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
