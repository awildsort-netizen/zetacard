import React from 'react'
import { render, waitFor } from '@testing-library/react'
import { test, expect, vi, afterEach } from 'vitest'
import App from '../App'

// Mock Three.js Canvas for testing
vi.mock('@react-three/fiber', () => ({
  Canvas: ({ children }: { children?: React.ReactNode }) => <div data-testid="3d-canvas">{children}</div>,
  useFrame: vi.fn(),
  useThree: vi.fn(() => ({ camera: {}, scene: {}, gl: {} })),
}))

vi.mock('@react-three/drei', () => ({
  OrbitControls: () => <div data-testid="orbit-controls" />,
  Text: () => null,
}))

// Mock requestAnimationFrame to prevent timing issues
let rafCallbacks: FrameRequestCallback[] = []
vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
  rafCallbacks.push(cb)
  return rafCallbacks.length - 1
})
vi.stubGlobal('cancelAnimationFrame', (id: number) => {
  rafCallbacks.splice(id, 1)
})

afterEach(() => {
  rafCallbacks = []
})

test('App renders without crashing', () => {
  const { container } = render(<App />)
  expect(container).toBeTruthy()
  expect(container.querySelector('canvas')).toBeTruthy()
})

test('App initializes canvas with correct dimensions on mount', async () => {
  const { container } = render(<App />)
  
  const canvas = container.querySelector('canvas') as HTMLCanvasElement
  expect(canvas).toBeTruthy()
  
  await waitFor(() => {
    expect(canvas.width).toBe(900)
    expect(canvas.height).toBe(600)
  }, { timeout: 1000 })
})

test('Canvas context is available for rendering', async () => {
  const { container } = render(<App />)
  
  const canvas = container.querySelector('canvas') as HTMLCanvasElement
  expect(canvas).toBeTruthy()
  
  await waitFor(() => {
    const ctx = canvas.getContext('2d')
    expect(ctx).toBeTruthy()
  }, { timeout: 1000 })
})

test('Controls are rendered and functional', () => {
  const { container } = render(<App />)
  
  // Check for control sliders
  const sliders = container.querySelectorAll('input[type="range"]')
  expect(sliders.length).toBeGreaterThan(0)
  
  // Check for labels
  expect(container.textContent).toContain('Card A ambient')
  expect(container.textContent).toContain('Card B ambient')
})
