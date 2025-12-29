# How to Run Tests with Unmissable Failure Reporting

## Quick Start

### Run all Vitest unit tests
```bash
npm run test
```

### Run Playwright E2E tests with clear failure reporting
```bash
npx playwright test
```

### Run single failing test
```bash
npx playwright test path/to/test.spec.ts -g "test name" --max-failures=1 --workers=1
```

## What You'll See

When a test fails, you'll now get:

```
================================================================================
❌ TEST FAILED
================================================================================
📝 Test:    omnibox search → card opens (event sequence)
📂 File:    golden-path.spec.ts
🔄 Retry:   0
🌐 URL:     http://127.0.0.1:5173/
⏱️  Time:     2025-12-27T20:12:30.000Z
📋 Reason:   Timeout after 5000ms waiting for event: SEARCH_QUERY

📊 Last Events:
   1. [SEARCH_QUERY] {"type":"SEARCH_QUERY","query":"spectral","flowId":"flow-123"}
   2. [CARD_SELECTED] {"type":"CARD_SELECTED","cardId":"card-1","flowId":"flow-123"}
   3. [CARD_OPENED] {"type":"CARD_OPENED","cardId":"card-1","mode":"Run","flowId":"flow-123"}

🚨 Console Logs:
   [ERROR] TypeError: Cannot read property 'fill' of null
   [LOG] Rendering card with id: card-1
   [WARNING] Performance warning: 2 operations took > 100ms

================================================================================
```

## Configuration Details

### playwright.config.ts

- **`fullyParallel: false`** — Single worker for readable logs during debug
- **`workers: 1`** — No interleaved output
- **`retries: 0`** — See first failure immediately
- **`maxFailures: 1`** — Stop on first failure
- **`screenshot: 'only-on-failure'`** — Visual evidence
- **`video: 'retain-on-failure'`** — Replay the failure
- **`trace: 'on-first-retry'`** — Detailed trace on retry

### tests/e2e/test-setup.ts

- **`beforeEach`** — Health check + event reset
- **`afterEach`** — Failure header with:
  - Last 5 events from `window.__zetacard__`
  - Last 3 console messages
  - Page URL and retry count

## Stabilization Steps

Once tests pass consistently:

1. Enable parallelism in playwright.config.ts:
   ```typescript
   fullyParallel: true,
   workers: process.env.CI ? 1 : undefined,
   ```

2. Enable retries:
   ```typescript
   retries: process.env.CI ? 2 : 0,
   ```

3. Enable other browsers:
   ```typescript
   // Uncomment firefox and webkit in projects[]
   ```

## Reading Test Output

### ✓ Pass
```
✓ [chromium] › tests/e2e/golden-path.spec.ts:20:1 › loads home without console errors
```

### ✕ Fail
```
✕ [chromium] › tests/e2e/golden-path.spec.ts:35:1 › omnibox search → card opens (event sequence)
```

Failed tests will also print the full `❌ TEST FAILED` header above with:
- Which test failed
- When (retry #)
- Why (error message)
- What state it was in (last events + console logs)

## Debugging a Specific Test

```bash
# Run one test, single worker, no retries
npx playwright test golden-path.spec.ts -g "omnibox search" --workers=1 --retries=0

# If it fails, run again with trace (will re-run with trace on)
npx playwright test golden-path.spec.ts -g "omnibox search" --workers=1

# Open the trace viewer
npx playwright show-trace playwright-report/trace.zip
```

## Key Signals

- **BOOTSTRAP**: App didn't load or `window.__zetacard__` missing
- **TIMEOUT**: Event never fired (check last events and console logs)
- **ASSERTION**: Assertion failed (value mismatch)
- **NAVIGATION**: Page navigated unexpectedly

All of these will print with context so you immediately know what went wrong.
