import { test, expect } from 'vitest'
import { Card } from '../zetacard'

test('Card step updates surface and computes bands/zeta', () => {
  const c = new Card(16)
  // snapshot initial
  const before = Float32Array.from(c.surface)
  c.step()
  // surface mutated
  let changed = false
  for(let i=0;i<c.surface.length;i++) if(c.surface[i] !== before[i]) { changed = true; break }
  expect(changed).toBeTruthy()
  // bandEnergy and zeta populated
  expect(c.bandEnergy.length).toBe(3)
  expect(c.zeta.length).toBe(3)
  for(const v of c.bandEnergy) expect(Number.isFinite(v)).toBeTruthy()
  for(const z of c.zeta) expect(Number.isFinite(z)).toBeTruthy()
  // set attractor toggles params
  const p1 = {...c.params}
  c.setAttractor(true)
  expect(c.params.diffusion).not.toBe(p1.diffusion)
})
