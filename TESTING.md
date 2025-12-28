# Zetacard Testing Guide

## Overview

Zetacard uses **system instrumentation** as its testing strategy. Instead of brittle UI tests, the app emits **structured events** that describe what happened. Tests assert on these events.

This approach provides:
- **Low maintenance** - tests don't break when UI is refactored
- **High visibility** - when something fails, you see exactly what the app did
- **Determinism** - no arbitrary timeouts; wait for events instead

## Public Test API

All test helpers and event definitions are stable. Breaking changes increment the `VERSION` in `src/instrumentation.ts`.

### Window API: `window.__zetacard__`

Available in all environments (tests + dev).

```typescript
window.__zetacard__ = {
  version: string;      // Instrumentation version (e.g., "1.0.0")
  buildId: string;      // Build timestamp
  
  getEvents(): ZetacardEvent[];          // All events since clear
  getCurrentIndex(): number;              // Current event count (for cursors)
  startFlow(): string;                    // Start a new flow, return flowId
  clearEvents(): void;                    // Clear all events (between tests)
  getErrors(): ZetacardEvent[];          // All ERROR events
  export(): EventLogExport;              // Export full log (for debugging)
}
```

### Event Types

All events have `timestamp: number` and optional `flowId: string`.

**Flow-tracking events** (auto-grouped by user interaction):

- `SEARCH_QUERY { query: string; flowId: string }`
- `CARD_SELECTED { cardId: string; cardTitle: string; flowId: string }`
- `CARD_OPENED { cardId: string; mode: 'Run' | 'SafeRun'; flowId: string }`
- `CARD_CLOSED { flowId?: string }`

**State events**:

- `STATE_REHYDRATED` (when storage is loaded on startup)

**Diagnostics**:

- `ERROR { source: 'react' | 'network' | 'storage' | 'validation' | 'unknown'; message: string; stack?: string; flowId?: string }`

### Playwright Test Helpers

Located in `tests/e2e/helpers/events.ts`.

#### `waitForEvent(page, type, options?)`

Wait for a single event of a specific type.

```typescript
const event = await waitForEvent(page, 'CARD_OPENED', {
  predicate: (e) => e.cardId === 'my-card',
  sinceIndex: 0,        // Start searching from this index
  timeout: 5000,
});
```

#### `waitForEventSequence(page, matchers, options?)`

Wait for a sequence of events in order.

```typescript
const events = await waitForEventSequence(page, [
  { type: 'SEARCH_QUERY' },
  { type: 'CARD_SELECTED' },
  { type: 'CARD_OPENED', mode: 'Run' },
], { timeout: 10000 });
```

#### `assertNoErrors(page, options?)`

Assert no ERROR events have been emitted.

```typescript
await assertNoErrors(page, { sinceIndex: cursorBefore });
```

#### `getEventCursor(page)`

Get the current event count (for "capture state before action").

```typescript
const before = await getEventCursor(page);
// ... perform action ...
const after = await getEventCursor(page);
const eventsSinceAction = await getEventsSince(page, before);
```

#### `getEventsSince(page, sinceIndex)`

Get all events emitted since a cursor.

#### `getFlowEvents(page, flowId)`

Get all events in a specific flow (useful for verifying coherence).

```typescript
const flowEvents = await getFlowEvents(page, flowId);
expect(flowEvents.every(e => e.flowId === flowId)).toBe(true);
```

#### `clearEvents(page)`

Clear all events (call at start of test if needed).

```typescript
await clearEvents(page);
```

#### `startFlow(page)`

Manually start a new flow (usually not needed; flows auto-start with SEARCH_QUERY).

#### `getInstrumentationInfo(page)`

Get version and build info (for sanity checks).

```typescript
const { version, buildId } = await getInstrumentationInfo(page);
expect(version).toBe('1.0.0');
```

## Test Structure

### Unit Tests (Vitest)

Place in `src/__tests__/*.test.ts`. Test pure logic (parsers, reducers, math).

```typescript
// src/__tests__/zetacard.test.ts
import { Card } from '../zetacard';

test('card initializes with correct zeta dimension', () => {
  const card = new Card(64);
  expect(card.zeta).toHaveLength(64);
});
```

### E2E Tests (Playwright)

Place in `tests/e2e/*.spec.ts`. Test user flows using event assertions.

```typescript
// tests/e2e/golden-path.spec.ts
import { waitForEvent, assertNoErrors, getEventCursor } from './helpers/events';

test('search workflow', async ({ page }) => {
  const cursor = await getEventCursor(page);
  
  await page.fill('input[placeholder*="search"]', 'query');
  const event = await waitForEvent(page, 'SEARCH_QUERY', { sinceIndex: cursor });
  expect(event.query).toBe('query');
  
  await assertNoErrors(page, { sinceIndex: cursor });
});
```

### Running Tests

```bash
# Unit tests (fast, continuous)
pnpm test              # Run once
pnpm test:watch       # Watch mode

# E2E tests (real browser)
pnpm test:e2e         # Run once (starts dev server)
pnpm test:e2e:ui      # Interactive UI for debugging

# All tests
pnpm test:all         # Run unit + E2E
```

## Stability Guarantees

The following are stable and will not change without a VERSION bump:

- Event type names and structure
- `window.__zetacard__` API surface
- Playwright helper function signatures

If the app is refactored:
- Events should still fire with the same meaning
- New events can be added (backward compatible)
- Events can be deprecated (marked `@deprecated` in code, removed in next major version)

## Debugging Failed Tests

When a test fails:

1. **Check the event log**: `page.evaluate(() => (window as any).__zetacard__.export())`
2. **Look for ERROR events**: If any `type: 'ERROR'` is present, that's your culprit
3. **Check flow coherence**: All events from a user action should have the same `flowId`
4. **Replay in UI mode**: `pnpm test:e2e:ui` shows a visual timeline

## Adding New Instrumentation

When you add a new feature:

1. Add event type(s) to `ZetacardEvent` in `src/instrumentation.ts`
2. Emit events from the component/module
3. Write a test that asserts the event fires
4. Update this document

Example:

```typescript
// src/instrumentation.ts
export type ZetacardEvent = 
  | ...existing...
  | { type: 'MY_FEATURE_DID_THING'; data: string; timestamp: number; flowId?: string };

// src/components/MyComponent.tsx
import { eventLog } from '../instrumentation';
eventLog.emit({ type: 'MY_FEATURE_DID_THING', data: 'value' });

// tests/e2e/my-feature.spec.ts
const event = await waitForEvent(page, 'MY_FEATURE_DID_THING');
expect(event.data).toBe('value');
```

---

**Last updated**: 2025-12-27  
**Version**: 1.0.0
