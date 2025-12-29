import { test, expect } from 'vitest'
import { Quadtree } from '../quadtree'

interface MockCard {
  size: number;
  surface: Float32Array;
  bandEnergy: number[];
}

test('Quadtree delivers event to card when resonance matches', () => {
  const qt = new Quadtree(0,0,1,1)
  // simple mock card
  const card: MockCard = { size: 10, surface: new Float32Array(100).fill(0), bandEnergy: [1,0,0] }
  // rect occupying full screen
  const rect = { x:0,y:0,w:100,h:100 }
  // insert an event at center (0.5,0.5) with matching bandEnergy
  qt.insert({ x:0.5, y:0.5, energy:0.4, bandEnergy:[1,0,0] })
  // deliver with low threshold so resonance passes
  qt.queryAndDeliver(card, rect, 0.1, 100, 100)
  // check that some surface cell is increased
  const any = Array.from(card.surface).some(v => v > 0)
  expect(any).toBeTruthy()
})
