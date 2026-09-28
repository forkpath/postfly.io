import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 2,
  timeout: 60000,
  expect: { timeout: 15000 },
  outputDir: '../../dist/test-results/extension/e2e/artifacts',
  reporter: [
    ['list'],
    ['junit', { outputFile: '../../dist/test-results/extension/e2e/junit.xml' }],
    ['html', { outputFolder: '../../dist/test-results/extension/e2e/html', open: 'never' }]
  ],
  projects: [{ name: 'chromium-extension', use: { browserName: 'chromium' } }]
})
