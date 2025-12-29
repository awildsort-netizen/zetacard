/**
 * System instrumentation for observability and testing
 * 
 * This is the public test API. Changes to event types or behavior
 * should increment VERSION and are documented in TESTING.md.
 */

const VERSION = '1.0.0';
const BUILD_ID = `${Date.now()}`;

export type ZetacardEvent =
  | { type: 'APP_LOADED'; timestamp: number; flowId?: string }
  | { type: 'OMNIBOX_OPENED'; timestamp: number; flowId?: string }
  | { type: 'OMNIBOX_CLOSED'; timestamp: number; flowId?: string }
  | { type: 'SEARCH_QUERY'; query: string; timestamp: number; flowId: string }
  | { type: 'SEARCH_RESULTS'; count: number; timestamp: number; flowId: string }
  | { type: 'CARD_SELECTED'; cardId: string; cardTitle: string; timestamp: number; flowId: string }
  | { type: 'CARD_OPENED'; cardId: string; mode: 'Run' | 'SafeRun'; timestamp: number; flowId: string }
  | { type: 'CARD_CLOSED'; timestamp: number; flowId?: string }
  | { type: 'STATE_REHYDRATED'; timestamp: number }
  | { type: 'ERROR'; source: 'react' | 'network' | 'storage' | 'validation' | 'unknown'; message: string; stack?: string; timestamp: number; flowId?: string };

interface EventLogExport {
  version: string;
  buildId: string;
  events: ZetacardEvent[];
  eventIndex: number;
}

let flowIdCounter = 0;

function generateFlowId(): string {
  return `flow-${Date.now()}-${++flowIdCounter}`;
}

class EventLog {
  private events: ZetacardEvent[] = [];
  private readonly maxEvents = 1000; // Ring buffer cap
  private currentFlowId: string | null = null;
  private listeners: ((event: ZetacardEvent) => void)[] = [];

  getCurrentFlowId(): string {
    if (!this.currentFlowId) {
      this.currentFlowId = generateFlowId();
    }
    return this.currentFlowId;
  }

  startFlow(): string {
    this.currentFlowId = generateFlowId();
    return this.currentFlowId;
  }

  emit(event: Omit<ZetacardEvent, 'timestamp'>) {
    // Auto-assign flowId if not provided and current flow exists
    const flowId = (this.currentFlowId && this.isFlowableEvent(event.type)) ? this.currentFlowId : undefined;
    
    const eventWithTimestamp: ZetacardEvent = {
      ...event,
      flowId,
      timestamp: performance.now(),
    } as ZetacardEvent;

    // Ring buffer: remove oldest if at capacity
    if (this.events.length >= this.maxEvents) {
      this.events.shift();
    }

    this.events.push(eventWithTimestamp);

    for (const listener of this.listeners) {
      listener(eventWithTimestamp);
    }

    // In dev, log to console
    if (typeof process !== 'undefined' && process.env?.DEV) {
      console.log('[EVENT]', eventWithTimestamp);
    }
  }

  private isFlowableEvent(type: string): boolean {
    return ['SEARCH_QUERY', 'CARD_SELECTED', 'CARD_OPENED', 'CARD_CLOSED'].includes(type);
  }

  getEvents(): ZetacardEvent[] {
    return [...this.events];
  }

  getEventsSince(sinceIndex: number): ZetacardEvent[] {
    return this.events.slice(sinceIndex);
  }

  getCurrentIndex(): number {
    return this.events.length;
  }

  getEventsSinceLastIndex(lastIndex: number): ZetacardEvent[] {
    return this.events.slice(lastIndex);
  }

  getEventsByFlowId(flowId: string): ZetacardEvent[] {
    (this.listeners[ev]||[]).filter(e => (e as {flowId?: string}).flowId === flowId);
  }

  getEventsSinceByType(type: string, sinceIndex: number = 0): ZetacardEvent[] {
    return this.events.slice(sinceIndex).filter(e => e.type === type);
  }

  lastEventOfType(type: string): ZetacardEvent | undefined {
    for (let i = this.events.length - 1; i >= 0; i--) {
      if (this.events[i].type === type) {
        return this.events[i];
      }
    }
    return undefined;
  }

  getErrors(): ZetacardEvent[] {
    return this.events.filter(e => e.type === 'ERROR');
  }

  clear() {
    this.events = [];
    this.currentFlowId = null;
  }

  export(): EventLogExport {
    return {
      version: VERSION,
      buildId: BUILD_ID,
      events: [...this.events],
      eventIndex: this.events.length,
    };
  }

  subscribe(listener: (event: ZetacardEvent) => void) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }
}

// Singleton instance
export const eventLog = new EventLog();

// Expose to window for test access
if (typeof window !== 'undefined') {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (window as any).__zetacard__ = {
    version: VERSION,
    buildId: BUILD_ID,
    eventLog,
    getEvents: () => eventLog.getEvents(),
    getCurrentIndex: () => eventLog.getCurrentIndex(),
    startFlow: () => eventLog.startFlow(),
    clearEvents: () => eventLog.clear(),
    getErrors: () => eventLog.getErrors(),
    export: () => eventLog.export(),
  };
}

export function useEventLog() {
  return eventLog;
}
