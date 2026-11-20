import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

function apiOrigin(value, name) {
  let url;
  try { url = new URL(value); } catch { /* Report the variable, never its value. */ }
  if (!url || !['http:', 'https:'].includes(url.protocol) || url.username || url.password ||
      url.pathname !== '/' || url.search || url.hash) {
    throw new Error(`${name} must be an HTTP(S) origin without credentials or an /api path.`);
  }
  return url.origin;
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), ['API_PROXY_TARGET', 'VITE_API_BASE_URL', 'PAGES_BASE_PATH']);
  const target = apiOrigin(process.env.API_PROXY_TARGET || env.API_PROXY_TARGET || 'http://localhost:5000', 'API_PROXY_TARGET');
  const publicApi = process.env.VITE_API_BASE_URL ?? env.VITE_API_BASE_URL;
  if (publicApi) apiOrigin(publicApi, 'VITE_API_BASE_URL');
  // Only the public VITE_ variable is embedded in React. The proxy stays in Vite.
  const proxy = { '/api': { target, changeOrigin: true } };
  return {
    base: process.env.PAGES_BASE_PATH || env.PAGES_BASE_PATH || '/',
    plugins: [react()],
    server: { port: 5173, proxy },
    preview: { proxy },
    test: { environment: 'jsdom' },
  };
});
