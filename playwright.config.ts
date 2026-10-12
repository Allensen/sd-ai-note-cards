import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests', timeout: 60000, fullyParallel: false, workers: 1,
  use: { baseURL: process.env.TEST_URL || 'http://127.0.0.1:4173', browserName: 'chromium', channel: process.env.CI ? undefined : 'chrome', viewport: { width: 1440, height: 1080 }, screenshot: 'only-on-failure', trace: 'retain-on-failure' },
  reporter: [['list']],
  webServer: process.env.TEST_URL ? undefined : { command: 'npm run dev -- --port 4173 --strictPort', url: 'http://127.0.0.1:4173', reuseExistingServer: !process.env.CI },
});
