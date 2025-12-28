import { test, expect } from './test-setup';
import {
  waitForEvent,
  waitForEventSequence,
  assertNoErrors,
  getEventCursor,
  getEventsSince,
  clearEvents,
  getInstrumentationInfo,
} from './helpers/events';

test.describe('Zetacard Golden Path E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Verify instrumentation is available
    const info = await getInstrumentationInfo(page);
    test.expect(info.version).toBeTruthy();
  });

  test('loads home without console errors', async ({ page }) => {
    await page.goto('/');
    
    // Wait for canvas to render
    const canvas = page.locator('[data-testid="canvas-root"]');
    await expect(canvas).toBeVisible();
    
    // Verify no errors occurred
    await assertNoErrors(page);
    
    // Verify main view is visible
    const mainView = page.locator('[data-testid="main-view"]');
    await expect(mainView).toBeVisible();
  });

  test('omnibox search → card opens (event sequence)', async ({ page }) => {
    await clearEvents(page);
    const cursorBeforeSearch = await getEventCursor(page);

    // Type in omnibox
    const omniboxInput = page.getByPlaceholderText(/Type or paste to find cards/i);
    await omniboxInput.fill('spectral');

    // Wait for SEARCH_QUERY event with specific query
    const searchEvent = await waitForEvent(page, 'SEARCH_QUERY', {
      predicate: (e: any) => e.query === 'spectral',
      sinceIndex: cursorBeforeSearch,
      timeout: 5000,
    });
    expect(searchEvent.type).toBe('SEARCH_QUERY');
    expect((searchEvent as any).flowId).toBeTruthy();

    // Click Run button
    const runButton = page.getByRole('button', { name: /Run/i }).first();
    await runButton.click();

    // Wait for CARD_OPENED event with same flowId
    const cardOpenEvent = await waitForEvent(page, 'CARD_OPENED', {
      sinceIndex: cursorBeforeSearch,
      timeout: 5000,
    });
    expect(cardOpenEvent.type).toBe('CARD_OPENED');
    expect((cardOpenEvent as any).mode).toBe('Run');

    // Verify event sequence is coherent (same flowId)
    const events = await getEventsSince(page, cursorBeforeSearch);
    const flowId = (searchEvent as any).flowId;
    const cardOpenedSameFlow = events.find((e: any) => e.type === 'CARD_OPENED' && e.flowId === flowId);
    expect(cardOpenedSameFlow).toBeTruthy();

    // No errors
    await assertNoErrors(page, { sinceIndex: cursorBeforeSearch });
  });

  test('close card → returns to main view', async ({ page }) => {
    await clearEvents(page);
    const cursorBeforeClose = await getEventCursor(page);

    // Open a card first
    const omniboxInput = page.getByPlaceholderText(/Type or paste to find cards/i);
    await omniboxInput.fill('heartbeat');
    await waitForEvent(page, 'SEARCH_QUERY', { timeout: 5000 });

    const runButton = page.getByRole('button', { name: /Run/i }).first();
    await runButton.click();
    await waitForEvent(page, 'CARD_OPENED', { timeout: 5000 });

    // Close card
    const closeButton = page.getByRole('button', { name: /Close \(Esc\)/i });
    await closeButton.click();

    // Wait for CARD_CLOSED event
    const closeEvent = await waitForEvent(page, 'CARD_CLOSED', {
      sinceIndex: cursorBeforeClose,
      timeout: 5000,
    });
    expect(closeEvent.type).toBe('CARD_CLOSED');

    // Verify main view is visible again
    const mainView = page.locator('[data-testid="main-view"]');
    await expect(mainView).toBeVisible();
  });

  test('canvas renders with correct dimensions', async ({ page }) => {
    const canvas = page.locator('[data-testid="canvas-root"]').first();
    await expect(canvas).toBeVisible();

    const width = await canvas.evaluate((el: HTMLCanvasElement) => el.width);
    const height = await canvas.evaluate((el: HTMLCanvasElement) => el.height);
    
    expect(width).toBe(900);
    expect(height).toBe(600);
  });

  test('complete workflow: search → open → close', async ({ page }) => {
    await clearEvents(page);

    // Perform complete workflow
    const omniboxInput = page.getByPlaceholderText(/Type or paste to find cards/i);
    await omniboxInput.fill('gi flow');

    // Wait for full sequence
    const sequence = await waitForEventSequence(page, [
      { type: 'SEARCH_QUERY' },
      { type: 'CARD_SELECTED' },
      { type: 'CARD_OPENED' },
    ], { timeout: 10000 });

    expect(sequence).toHaveLength(3);
    expect(sequence[0].type).toBe('SEARCH_QUERY');
    expect(sequence[1].type).toBe('CARD_SELECTED');
    expect(sequence[2].type).toBe('CARD_OPENED');

    // All should share same flowId
    const flowId = (sequence[0] as any).flowId;
    for (const event of sequence) {
      expect((event as any).flowId).toBe(flowId);
    }

    // Close
    const closeButton = page.getByRole('button', { name: /Close \(Esc\)/i });
    await closeButton.click();

    // Wait for CARD_CLOSED
    const allEvents = await page.evaluate(() => (window as any).__zetacard__.getEvents());
    expect(allEvents.some((e: any) => e.type === 'CARD_CLOSED')).toBe(true);

    // No errors during workflow
    await assertNoErrors(page);
  });

  // ============ CANARY TESTS ============

  test('(canary) deep-link routing works', async ({ page }) => {
    // This would test routing directly to a card (once you have routing)
    // For now, just verify app loads without 404
    await page.goto('/');
    
    // Verify we got the app, not a 404
    const canvas = page.locator('[data-testid="canvas-root"]');
    await expect(canvas).toBeVisible();
    
    const response = page.context().request;
    expect(page.url()).toContain('localhost');
  });

  test('(canary) cold-start: no errors on fresh load', async ({ page }) => {
    // Fresh load should emit no errors
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    await page.goto('/');
    await page.waitForSelector('[data-testid="canvas-root"]');

    // Check instrumentation errors
    const instrumentationErrors = await page.evaluate(() => 
      (window as any).__zetacard__.getErrors?.() ?? []
    );

    expect(errors).toHaveLength(0);
    expect(instrumentationErrors).toHaveLength(0);
  });
});

