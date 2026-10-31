import { defineConfig, devices } from '@playwright/test';

/**
 * E2E tests run the real web app + API against Firebase emulators with offline AI/speech providers.
 * Chromium's fake microphone produces a test tone; the offline STT returns the mission's sample lines.
 */
export default defineConfig({
  testDir: '.',
  timeout: 120_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  outputDir: '../../test-results/e2e',
  reporter: [['list'], ['html', { outputFolder: '../../playwright-report', open: 'never' }]],
  use: {
    baseURL: 'http://127.0.0.1:4173',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    locale: 'vi-VN',
    permissions: ['microphone'],
    launchOptions: {
      args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', '--autoplay-policy=no-user-gesture-required'],
    },
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile', use: { ...devices['Pixel 7'] }, grep: /@mobile/ },
  ],
  webServer: {
    command:
      'mkdir -p test-results && VITE_USE_AUTH_EMULATOR=true npm run build --workspace @ecs/web && npm run build --workspace @ecs/api && bash tests/e2e/start-stack.sh',
    cwd: '../..',
    url: 'http://127.0.0.1:4173',
    timeout: 300_000,
    reuseExistingServer: !process.env.CI,
    stdout: 'ignore',
    stderr: 'pipe',
  },
});
