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
    } as any);
    
    eventLog.emit({
      type: 'CARD_SELECTED',
      cardId: 'card-123',
      cardTitle: 'Test Card',
      flowId,
    } as any);
    
    eventLog.emit({
      type: 'CARD_OPENED',
      cardId: 'card-123',
      mode: 'Run' as const,
      flowId,
    } as any);
    
    eventLog.emit({
      type: 'CARD_CLOSED',
      flowId,
    } as any);
    
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
    eventLog.emit({ type: 'SEARCH_QUERY', query: 'flow1', flowId: flow1 } as any);
    
    const flow2 = eventLog.startFlow();
    eventLog.emit({ type: 'SEARCH_QUERY', query: 'flow2', flowId: flow2 } as any);
    
    const flow1Events = eventLog.getEventsByFlowId(flow1);
    const flow2Events = eventLog.getEventsByFlowId(flow2);
    
    expect(flow1Events).toHaveLength(1);
    expect(flow2Events).toHaveLength(1);
    expect((flow1Events[0] as any).query).toBe('flow1');
    expect((flow2Events[0] as any).query).toBe('flow2');
  });

  it('exports event log with all metadata', () => {
    const flowId = eventLog.startFlow();
    eventLog.emit({ type: 'SEARCH_QUERY', query: 'test', flowId } as any);
    eventLog.emit({ type: 'CARD_OPENED', cardId: 'c1', mode: 'Run' as const, flowId } as any);
    
    const exported = eventLog.export();
    
    expect(exported.version).toBe('1.0.0');
    expect(exported.buildId).toBeTruthy();
    expect(exported.events).toHaveLength(2);
    expect(exported.eventIndex).toBe(2);
  });

  it('handles error events without breaking flow', () => {
    const flowId = eventLog.startFlow();
    
    eventLog.emit({ type: 'SEARCH_QUERY', query: 'test', flowId } as any);
    eventLog.emit({
      type: 'ERROR',
      source: 'network' as const,
      message: 'Failed to fetch',
    } as any);
    eventLog.emit({ type: 'CARD_OPENED', cardId: 'c1', mode: 'Run' as const, flowId } as any);
    
    const allEvents = eventLog.getEvents();
    const errors = eventLog.getErrors();
    
    expect(allEvents).toHaveLength(3);
    expect(errors).toHaveLength(1);
    expect((errors[0] as any).source).toBe('network');
  });

  it('provides window access for browser testing', () => {
    const flowId = eventLog.startFlow();
    eventLog.emit({ type: 'SEARCH_QUERY', query: 'test', flowId } as any);
    
    const windowApi = (global as any).__zetacard__;
    expect(windowApi).toBeTruthy();
    expect(windowApi.version).toBe('1.0.0');
    expect(windowApi.getEvents).toBeInstanceOf(Function);
    expect(windowApi.getCurrentIndex).toBeInstanceOf(Function);
    
    const events = windowApi.getEvents();
    expect(events).toHaveLength(1);
  });
});
