import { describe, it, expect, beforeEach } from 'vitest';
import { eventLog } from '../instrumentation';

/**
 * Integration tests for the instrumentation system
 * These tests verify that the event log properly coordinates with the app lifecycle
 */

describe('Instrumentation Integration', () => {
  beforeEach(() => {
    eventLog.clear();
  });

  it('maintains event log across multiple operations', () => {
    // Simulate a user flow: search -> select -> open -> close
    const flowId = eventLog.startFlow();
    
    eventLog.emit({
      type: 'SEARCH_QUERY',
      query: 'test',
      flowId,
    });
    
    eventLog.emit({
      type: 'CARD_SELECTED',
      cardId: 'card-123',
      cardTitle: 'Test Card',
      flowId,
    });
    
    eventLog.emit({
      type: 'CARD_OPENED',
      cardId: 'card-123',
      mode: 'Run',
      flowId,
    });
    
    eventLog.emit({
      type: 'CARD_CLOSED',
      flowId,
    });
    
    // Verify the full sequence
    const flowEvents = eventLog.getEventsByFlowId(flowId);
    expect(flowEvents).toHaveLength(4);
    
    // Verify types in sequence
    expect(flowEvents[0].type).toBe('SEARCH_QUERY');
    expect(flowEvents[1].type).toBe('CARD_SELECTED');
    expect(flowEvents[2].type).toBe('CARD_OPENED');
    expect(flowEvents[3].type).toBe('CARD_CLOSED');
  });

  it('tracks multiple concurrent flows', () => {
    const flow1 = eventLog.startFlow();
    eventLog.emit({ type: 'SEARCH_QUERY', query: 'flow1', flowId: flow1 });
    
    const flow2 = eventLog.startFlow();
    eventLog.emit({ type: 'SEARCH_QUERY', query: 'flow2', flowId: flow2 });
    
    const flow1Events = eventLog.getEventsByFlowId(flow1);
    const flow2Events = eventLog.getEventsByFlowId(flow2);
    
    expect(flow1Events).toHaveLength(1);
    expect(flow2Events).toHaveLength(1);
    if (flow1Events[0].type === 'SEARCH_QUERY') {
      expect(flow1Events[0].query).toBe('flow1');
    }
    if (flow2Events[0].type === 'SEARCH_QUERY') {
      expect(flow2Events[0].query).toBe('flow2');
    }
  });

  it('exports event log with all metadata', () => {
    const flowId = eventLog.startFlow();
    eventLog.emit({ type: 'SEARCH_QUERY', query: 'test', flowId });
    eventLog.emit({ type: 'CARD_OPENED', cardId: 'c1', mode: 'Run', flowId });
    
    const exported = eventLog.export();
    
    expect(exported.version).toBe('1.0.0');
    expect(exported.buildId).toBeTruthy();
    expect(exported.events).toHaveLength(2);
    expect(exported.eventIndex).toBe(2);
  });

  it('handles error events without breaking flow', () => {
    const flowId = eventLog.startFlow();
    
    eventLog.emit({ type: 'SEARCH_QUERY', query: 'test', flowId });
    eventLog.emit({
      type: 'ERROR',
      source: 'network',
      message: 'Failed to fetch',
    });
    eventLog.emit({ type: 'CARD_OPENED', cardId: 'c1', mode: 'Run', flowId });
    
    const allEvents = eventLog.getEvents();
    const errors = eventLog.getErrors();
    
    expect(allEvents).toHaveLength(3);
    expect(errors).toHaveLength(1);
    if (errors[0].type === 'ERROR') {
      expect(errors[0].source).toBe('network');
    }
  });

  it('provides window access for browser testing', () => {
    const flowId = eventLog.startFlow();
    eventLog.emit({ type: 'SEARCH_QUERY', query: 'test', flowId });
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const windowApi = (global as any).__zetacard__;
    expect(windowApi).toBeTruthy();
    expect(windowApi.version).toBe('1.0.0');
    expect(typeof windowApi.getEvents).toBe('function');
    expect(typeof windowApi.getCurrentIndex).toBe('function');
    
    const events = windowApi.getEvents();
    expect(events).toHaveLength(1);
  });
});
