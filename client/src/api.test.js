import { afterEach, expect, test, vi } from 'vitest';
import { apiUrl, publicAssetUrl } from './api.js';

afterEach(() => vi.unstubAllEnvs());

test('local API requests use the proxy, while hosted requests preserve the search query at the configured origin', () => {
  vi.stubEnv('VITE_API_BASE_URL', '');
  expect(apiUrl('/api/health')).toBe('/api/health');
  vi.stubEnv('VITE_API_BASE_URL', 'https://example.onrender.com/');
  expect(apiUrl('/api/equipment?q=Squat%20Rack')).toBe('https://example.onrender.com/api/equipment?q=Squat%20Rack');
});

test('floor-plan images respect the repository base without changing remote image URLs', () => {
  vi.stubEnv('BASE_URL', '/Rec-Center-Radar/');
  for (const path of ['/floorplans/floor-2.png', 'floorplans/floor-2.png', '/Rec-Center-Radar/floorplans/floor-2.png']) {
    expect(publicAssetUrl(path)).toBe('/Rec-Center-Radar/floorplans/floor-2.png');
  }
  expect(publicAssetUrl('https://images.example.com/floor.png')).toBe('https://images.example.com/floor.png');
  vi.stubEnv('BASE_URL', '/');
  expect(publicAssetUrl('/floorplans/floor-2.png')).toBe('/floorplans/floor-2.png');
});
