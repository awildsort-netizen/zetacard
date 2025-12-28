import { describe, it, expect, beforeEach } from 'vitest';
import { eventLog } from '../instrumentation';

describe('Instrumentation System', () => {
  beforeEach(() => {
    eventLog.clear();
  });

  it('emits and retrieves events', () => {
    eventLog.emit({ type: 'SEARCH_QUERY', query: 'test', flowId: 'flow-1' } as any);
    
    const events = eventLog.getEvents();
    expect(events).toHaveLength(1);
    expect(events[0].type).toBe('SEARCH_QUERY');
    expect((events[0] as any).query).toBe('test');
  });

  it('assigns flowIds to flowable events', () => {
    const flowId = eventLog.startFlow();
    eventLog.emit({ type: 'SEARCH_QUERY', query: 'test', flowId } as any);
    
    const events = eventLog.getEvents();
    expect((events[0] as any).flowId).toBe(flowId);
  });

  it('groups related events by flowId', () => {
    const flowId = eventLog.startFlow();
    eventLog.emit({ type: 'SEARCH_QUERY', query: 'spectral', flowId } as any);
    eventLog.emit({ type: 'CARD_SELECTED', cardId: 'card-1', cardTitle: 'Card 1', flowId } as any);
    eventLog.emit({ type: 'CARD_OPENED', cardId: 'card-1', mode: 'Run' as const, flowId } as any);
    
    const flowEvents = eventLog.getEventsByFlowId(flowId);
    expect(flowEvents).toHaveLength(3);
    expect(flowEvents.every(e => (e as any).flowId === flowId)).toBe(true);
  });

  it('tracks event index for cursor-based queries', () => {
    eventLog.emit({ type: 'SEARCH_QUERY', query: 'a', flowId: 'f1' } as any);
    const index = eventLog.getCurrentIndex();
    expect(index).toBe(1);
    
    eventLog.emit({ type: 'SEARCH_QUERY', query: 'b', flowId: 'f1' } as any);
    const newIndex = eventLog.getCurrentIndex();
    expect(newIndex).toBe(2);
    
    const eventsSince = eventLog.getEventsSince(index);
    expect(eventsSince).toHaveLength(1);
    expect((eventsSince[0] as any).query).toBe('b');
  });

  it('enforces ring buffer cap', () => {
    // Emit 1001 events (cap is 1000)
    for (let i = 0; i < 1001; i++) {
      eventLog.emit({ type: 'SEARCH_QUERY', query: `query-${i}`, flowId: `f-${i}` } as any);
    }
    
    const events = eventLog.getEvents();
    expect(events.length).toBe(1000);
    // Oldest event should be dropped
    expect((events[0] as any).query).toBe('query-1');
  });

  it('finds events of a specific type since an index', () => {
    eventLog.emit({ type: 'SEARCH_QUERY', query: 'a', flowId: 'f1' } as any);
    eventLog.emit({ type: 'CARD_OPENED', cardId: 'c1', mode: 'Run' as const, flowId: 'f1' } as any);
    const cursor = eventLog.getCurrentIndex();
    
    eventLog.emit({ type: 'SEARCH_QUERY', query: 'b', flowId: 'f2' } as any);
    eventLog.emit({ type: 'CARD_OPENED', cardId: 'c2', mode: 'Run' as const, flowId: 'f2' } as any);
    
    const recentSearches = eventLog.getEventsSinceByType('SEARCH_QUERY', cursor);
    expect(recentSearches).toHaveLength(1);
    expect((recentSearches[0] as any).query).toBe('b');
  });

  it('clears all events and resets flow', () => {
    const fid1 = eventLog.startFlow();
    eventLog.emit({ type: 'SEARCH_QUERY', query: 'test', flowId: fid1 } as any);
    
    expect(eventLog.getEvents()).toHaveLength(1);
    
    eventLog.clear();
    expect(eventLog.getEvents()).toHaveLength(0);
    
    // New flow starts fresh
    const fid2 = eventLog.startFlow();
    const fid3 = eventLog.startFlow();
    expect(fid2).not.toEqual(fid3);
  });

  it('exports event log with metadata', () => {
    eventLog.emit({ type: 'SEARCH_QUERY', query: 'test', flowId: 'f1' } as any);
    
    const exported = eventLog.export();
    expect(exported.version).toBe('1.0.0');
    expect(exported.buildId).toBeTruthy();
    expect(exported.events).toHaveLength(1);
    expect(exported.eventIndex).toBe(1);
  });

  it('provides ERROR events separately', () => {
    eventLog.emit({ type: 'SEARCH_QUERY', query: 'test', flowId: 'f1' } as any);
    eventLog.emit({ 
      type: 'ERROR', 
      source: 'storage' as any, 
      message: 'Storage failed' 
    } as any);
    eventLog.emit({ type: 'CARD_OPENED', cardId: 'c1', mode: 'Run' as const, flowId: 'f1' } as any);
    
    const errors = eventLog.getErrors();
    expect(errors).toHaveLength(1);
    expect(errors[0].type).toBe('ERROR');
    expect((errors[0] as any).source).toBe('storage');
  });

  it('finds last event of a type', () => {
    eventLog.emit({ type: 'SEARCH_QUERY', query: 'a', flowId: 'f1' } as any);
    eventLog.emit({ type: 'SEARCH_QUERY', query: 'b', flowId: 'f1' } as any);
    eventLog.emit({ type: 'SEARCH_QUERY', query: 'c', flowId: 'f1' } as any);
    
    const last = eventLog.lastEventOfType('SEARCH_QUERY');
    expect((last as any).query).toBe('c');
  });
});
