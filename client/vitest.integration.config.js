import { defineConfig, mergeConfig } from 'vitest/config';
import viteConfig from './vite.config.js';

export default mergeConfig(viteConfig, defineConfig({
  test: { include: ['test/**/*.integration.jsx'], hookTimeout: 120000 },
}));
