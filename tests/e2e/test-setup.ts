import { test as base, expect } from '@playwright/test';

export { expect };

/**
 * Custom test fixture with:
 * - Health check before each test
 * - Clear failure reporting with last events + console errors
 * - Event cursor/reset helpers
 * 
 * Import this in spec files instead of @playwright/test:
 *   import { test, expect } from './test-setup';
 */

/**
 * Health check: verify app is in a ready state
 */
async function healthCheck(page: any) {
  try {
    // Check page is loaded
    if (page.url().includes('about:blank') || page.url().includes('about:error')) {
      throw new Error(`HEALTH_CHECK_FAILED: Page is at ${page.url()}`);
    }

    // Check instrumentation is available
    const hasInstrumentation = await page.evaluate(() => {
      return typeof (window as any).__zetacard__ !== 'undefined';
    });

    if (!hasInstrumentation) {
      throw new Error('HEALTH_CHECK_FAILED: window.__zetacard__ not found');
    }

    // Check version contract
    const version = await page.evaluate(() => (window as any).__zetacard__.version);
    if (!version) {
      throw new Error('HEALTH_CHECK_FAILED: __zetacard__.version missing');
    }

    return { healthy: true, version };
  } catch (e) {
    return { healthy: false, error: (e as Error).message };
  }
}

/**
 * Failure header: print unmissable signal with context
 */
async function printFailureHeader(
  testInfo: any,
  page: any,
  reason: string
) {
  const timestamp = new Date().toISOString();
  const file = testInfo.file.split('/').pop();
  const title = testInfo.title;
  const retry = testInfo.retry;
  const url = page.url();

  console.log('\n' + '='.repeat(80));
  console.log('❌ TEST FAILED');
  console.log('='.repeat(80));
  console.log(`📝 Test:    ${title}`);
  console.log(`📂 File:    ${file}`);
  console.log(`🔄 Retry:   ${retry}`);
  console.log(`🌐 URL:     ${url}`);
  console.log(`⏱️  Time:     ${timestamp}`);
  console.log(`📋 Reason:   ${reason}`);

  // Get last events from instrumentation
  try {
    const lastEvents = await page.evaluate(() => {
      const events = (window as any).__zetacard__?.getEvents?.() ?? [];
      return events.slice(-5);
    });

    if (lastEvents.length > 0) {
      console.log('\n📊 Last Events:');
      lastEvents.forEach((e: any, i: number) => {
        const typeStr = e.type;
        const details = JSON.stringify(e).substring(0, 70);
        console.log(`   ${i + 1}. [${typeStr}] ${details}`);
      });
    }
  } catch (e) {
    console.log(`   (could not fetch events: ${(e as Error).message})`);
  }

  // Get console errors
  try {
    const logs = await page.evaluate(() => {
      return (window as any).__pageLogs__ ?? [];
    });

    if (logs.length > 0) {
      console.log('\n🚨 Console Logs:');
      logs.slice(-3).forEach((log: any) => {
        console.log(`   [${log.type.toUpperCase()}] ${log.text}`);
      });
    }
  } catch (e) {
    // Silently ignore
  }

  console.log('='.repeat(80) + '\n');
}

export const test = base.extend({
  // Add a fixture that includes our hooks
});

// Register hooks on the base test object
base.beforeEach(async ({ page }, testInfo) => {
  // Collect console messages
  const logs: any[] = [];
  page.on('console', (msg) => {
    logs.push({
      type: msg.type(),
      text: msg.text(),
      location: msg.location(),
    });
  });
  (page as any).__pageLogs__ = logs;

  // Collect page errors
  const errors: any[] = [];
  page.on('pageerror', (err) => {
    errors.push(err.message);
  });
  (page as any).__pageErrors__ = errors;

  // Navigate to app
  await page.goto('/');

  // Health check
  const health = await healthCheck(page);
  if (!health.healthy) {
    throw new Error(`BOOTSTRAP: ${health.error}`);
  }

  // Reset events before test
  await page.evaluate(() => {
    const events = (window as any).__zetacard__;
    if (events?.clearEvents) {
      events.clearEvents();
    }
  });
});

base.afterEach(async ({ page }, testInfo) => {
  if (testInfo.status === 'failed') {
    const reason = testInfo.error?.message ?? 'Unknown failure';
    await printFailureHeader(testInfo, page, reason);
  }
});

// Export the test object with hooks applied
export const test = base;

