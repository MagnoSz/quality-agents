import { defineConfig } from '@playwright/test';

// Electron only: no browser download. One window, tests share it in order.
export default defineConfig({
  testDir: '.',
  timeout: 120_000,
  expect: { timeout: 20_000 },
  workers: 1,
  fullyParallel: false,
  reporter: 'list',
  outputDir: './results',
});
