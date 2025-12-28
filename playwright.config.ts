import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright E2E test configuration for Zetacard
 * 
 * Configured for unmissable failure reporting:
 * - Single worker during debugging (no interleaved logs)
 * - Screenshots + videos on failure only
 * - HTML report with traces
 * - Structured console output for failure identification
 */
export default defineConfig({
  testDir: './tests/e2e',
  
  // DEBUG MODE: Single worker, no parallelism (makes logs readable)
  // Once stable, change to: fullyParallel: true, workers: process.env.CI ? 1 : undefined
  fullyParallel: false,
  workers: 1,
  
  forbidOnly: !!process.env.CI,
  
  // Retries: disabled during debug to see first failure
  // Change to: retries: process.env.CI ? 2 : 0,
  retries: 0,
  
  // MAX_FAILURES: stop on first failure during debug
  maxFailures: process.env.CI ? undefined : 1,
  
  // REPORTERS: line + HTML (line shows failures immediately, HTML has full details)
  reporter: [
    ['line'],
    ['html', { open: 'never', outputFolder: 'playwright-report' }],
  ],
  
  use: {
    baseURL: 'http://127.0.0.1:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },

    // Disable Firefox/WebKit during debug to speed up feedback
    // {
    //   name: 'firefox',
    //   use: { ...devices['Desktop Firefox'] },
    // },

    // {
    //   name: 'webkit',
    //   use: { ...devices['Desktop Safari'] },
    // },
  ],

  webServer: {
    command: 'npm run dev',
    url: 'http://127.0.0.1:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
});
