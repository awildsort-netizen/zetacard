import { describe, it, expect } from 'vitest';
import { Card, stabilizeMany } from '../meaning';

describe('meaning accumulation', () => {
  it('stabilizes nearby cards (similarity increases)', () => {
    const a = new Card('a', 'red apple');
    const b = new Card('b', 'apple pie');
    const before = a.similarity(b);
    stabilizeMany([a, b], 5, 0.2);
    const after = a.similarity(b);
    expect(after).toBeGreaterThanOrEqual(before);
  });

  it('absorbs partial text without throwing', () => {
    const c = new Card('c');
    expect(c.isUndefined).toBe(true);
    c.mergePartial('draft idea about runtime');
    expect(c.isUndefined).toBe(false);
    expect(Array.from(c.meaning.keys()).length).toBeGreaterThan(0);
  });
});
