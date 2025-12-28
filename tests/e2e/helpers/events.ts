import { Page, expect } from '@playwright/test';
import type { ZetacardEvent } from '../../../src/instrumentation';

/**
 * E2E test helpers for event-driven assertions
 * 
 * These wrap the __zetacard__ test API to provide a clean, stable
 * interface for Playwright tests.
 */

export interface EventMatcher {
  type?: string;
  flowId?: string;
  [key: string]: any;
}

/**
 * Wait for a single event of a specific type
 */
export async function waitForEvent(
  page: Page,
  type: string,
  options?: {
    predicate?: (event: ZetacardEvent) => boolean;
    sinceIndex?: number;
    timeout?: number;
  }
): Promise<ZetacardEvent> {
  const timeout = options?.timeout ?? 5000;
  const sinceIndex = options?.sinceIndex ?? 0;
  const predicate = options?.predicate ?? (() => true);

  return page.waitForFunction(
    ({ type: eventType, sinceIndex: since, predicate: pred }) => {
      const events = (window as any).__zetacard__.getEvents();
      const recentEvents = events.slice(since);
      return recentEvents.find((e: any) => e.type === eventType && pred(e));
    },
    { type, sinceIndex, predicate },
    { timeout }
  ).then(() => {
    // Return the actual event
    return page.evaluate(({ type: eventType, since }) => {
      const events = (window as any).__zetacard__.getEvents();
      return events.slice(since).find((e: any) => e.type === eventType);
    }, { type, since: sinceIndex });
  });
}

/**
 * Wait for a sequence of events to occur in order
 */
export async function waitForEventSequence(
  page: Page,
  matchers: EventMatcher[],
  options?: { sinceIndex?: number; timeout?: number }
): Promise<ZetacardEvent[]> {
  const timeout = options?.timeout ?? 10000;
  const sinceIndex = options?.sinceIndex ?? 0;

  const foundEvents: ZetacardEvent[] = [];

  return page.waitForFunction(
    ({ matchers: mats, since }) => {
      const events = (window as any).__zetacard__.getEvents();
      const recentEvents = events.slice(since);

      let matchIndex = 0;
      const matched = [];

      for (const event of recentEvents) {
        if (matchIndex >= mats.length) break;

        const matcher = mats[matchIndex];
        if (matchesEvent(event, matcher)) {
          matched.push(event);
          matchIndex++;
        }
      }

      return matchIndex === mats.length ? matched : false;
    },
    { matchers, since: sinceIndex },
    { timeout }
  ).then(() => {
    // Return the actual sequence
    return page.evaluate(({ matchers: mats, since }) => {
      const events = (window as any).__zetacard__.getEvents();
      const recentEvents = events.slice(since);

      let matchIndex = 0;
      const matched = [];

      for (const event of recentEvents) {
        if (matchIndex >= mats.length) break;

        const matcher = mats[matchIndex];
        if (matchesEventFn(event, matcher)) {
          matched.push(event);
          matchIndex++;
        }
      }

      return matched;
    }, { matchers, since: sinceIndex });
  });
}

/**
 * Assert no errors occurred since a point
 */
export async function assertNoErrors(
  page: Page,
  options?: { sinceIndex?: number }
): Promise<void> {
  const sinceIndex = options?.sinceIndex ?? 0;

  const errors = await page.evaluate(({ since }) => {
    const events = (window as any).__zetacard__.getEvents();
    return events.slice(since).filter((e: any) => e.type === 'ERROR');
  }, { since: sinceIndex });

  expect(errors).toHaveLength(0);
}

/**
 * Get the current event log cursor (for capturing state before an action)
 */
export async function getEventCursor(page: Page): Promise<number> {
  return page.evaluate(() => (window as any).__zetacard__.getCurrentIndex());
}

/**
 * Get all events emitted since a cursor position
 */
export async function getEventsSince(page: Page, sinceIndex: number): Promise<ZetacardEvent[]> {
  return page.evaluate(({ since }) => {
    const events = (window as any).__zetacard__.getEvents();
    return events.slice(since);
  }, { since: sinceIndex });
}

/**
 * Get events for a specific flow
 */
export async function getFlowEvents(page: Page, flowId: string): Promise<ZetacardEvent[]> {
  return page.evaluate(({ fid }) => {
    const events = (window as any).__zetacard__.getEvents();
    return events.filter((e: any) => e.flowId === fid);
  }, { fid: flowId });
}

/**
 * Start a new flow (returns the flow ID)
 */
export async function startFlow(page: Page): Promise<string> {
  return page.evaluate(() => (window as any).__zetacard__.startFlow());
}

/**
 * Clear events (between test scenarios)
 */
export async function clearEvents(page: Page): Promise<void> {
  await page.evaluate(() => (window as any).__zetacard__.clearEvents());
}

/**
 * Get version and build info
 */
export async function getInstrumentationInfo(page: Page): Promise<{ version: string; buildId: string }> {
  return page.evaluate(() => ({
    version: (window as any).__zetacard__.version,
    buildId: (window as any).__zetacard__.buildId,
  }));
}

// ============ Helper functions (not exported) ============

function matchesEvent(event: any, matcher: EventMatcher): boolean {
  for (const [key, value] of Object.entries(matcher)) {
    if (event[key] !== value) {
      return false;
    }
  }
  return true;
}

// Same function for in-page eval context
const matchesEventFn = `
  (event, matcher) => {
    for (const [key, value] of Object.entries(matcher)) {
      if (event[key] !== value) return false;
    }
    return true;
  }
`;
