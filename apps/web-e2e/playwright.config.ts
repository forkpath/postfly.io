import { workspaceRoot } from '@nx/devkit'
import { nxE2EPreset } from '@nx/playwright/preset'
import { defineConfig, devices } from '@playwright/test'

// BASE_URL opts into testing an explicitly deployed environment. Local runs use
// a dedicated strict port so they can never reuse an unrelated development app.
const externalBaseURL = process.env['BASE_URL']
const e2ePort = process.env['E2E_WEB_PORT'] || '4173'
const baseURL = externalBaseURL || `http://localhost:${e2ePort}`

/**
 * Read environment variables from file.
 * https://github.com/motdotla/dotenv
 */
// require('dotenv').config();

/**
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
  ...nxE2EPreset(__filename, { testDir: './src' }),
  outputDir: '../../dist/test-results/web-e2e/artifacts',
  reporter: [
    ['list'],
    ['junit', { outputFile: '../../dist/test-results/web-e2e/junit.xml' }],
    ['html', { outputFolder: '../../dist/test-results/web-e2e/html', open: 'never' }]
  ],
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    baseURL,
    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure'
  },
  /* Run your local dev server before starting the tests */
  webServer: externalBaseURL
    ? undefined
    : {
        command: 'node apps/web/.output/server/index.mjs',
        url: baseURL,
        reuseExistingServer: false,
        env: {
          HOST: 'localhost',
          PORT: e2ePort
        },
        cwd: workspaceRoot
      },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] }
    },

    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] }
    },

    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] }
    }

    // Uncomment for mobile browsers support
    /* {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 12'] },
    }, */

    // Uncomment for branded browsers
    /* {
      name: 'Microsoft Edge',
      use: { ...devices['Desktop Edge'], channel: 'msedge' },
    },
    {
      name: 'Google Chrome',
      use: { ...devices['Desktop Chrome'], channel: 'chrome' },
    } */
  ]
})
