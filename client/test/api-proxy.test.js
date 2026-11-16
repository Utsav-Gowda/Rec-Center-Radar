// @vitest-environment node
import { afterEach, expect, test, vi } from 'vitest';
import viteConfig from '../vite.config.js';

afterEach(() => vi.unstubAllEnvs());

test.each(['http://localhost:5000', 'https://example.onrender.com/'])('proxies API requests to %s in dev and preview', (target) => {
  vi.stubEnv('API_PROXY_TARGET', target);
  const config = viteConfig({ mode: 'test' });
  expect(config.server.proxy['/api']).toEqual({ target: new URL(target).origin, changeOrigin: true });
  expect(config.preview.proxy).toEqual(config.server.proxy);
});

test.each(['mongodb://example.com', 'https://user:password@example.com', 'https://example.com/api', 'https://example.com/?q=x'])('rejects a proxy value that is not an API origin', (target) => {
  vi.stubEnv('API_PROXY_TARGET', target);
  expect(() => viteConfig({ mode: 'test' })).toThrow(/HTTP\(S\) origin/);
});

test('Pages builds use the requested repository path and a direct public API without changing the local proxy', () => {
  vi.stubEnv('PAGES_BASE_PATH', '/Rec-Center-Radar/');
  vi.stubEnv('VITE_API_BASE_URL', 'https://example.onrender.com');
  vi.stubEnv('API_PROXY_TARGET', 'http://localhost:5000');
  const config = viteConfig({ mode: 'production' });
  expect(config.base).toBe('/Rec-Center-Radar/');
  expect(config.server.proxy['/api'].target).toBe('http://localhost:5000');
});

test.each(['mongodb+srv://example.com', 'https://user:password@example.com', 'https://example.com/api', 'invalid'])('rejects an invalid public API origin without echoing its value', (target) => {
  vi.stubEnv('VITE_API_BASE_URL', target);
  expect(() => viteConfig({ mode: 'production' })).toThrow('VITE_API_BASE_URL must be an HTTP(S) origin without credentials or an /api path.');
});
