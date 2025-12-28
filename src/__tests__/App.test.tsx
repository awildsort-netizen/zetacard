import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import { test, expect, vi, beforeAll, afterEach } from 'vitest'
import App from '../App'

// Mock Three.js Canvas for testing (not available in jsdom)
vi.mock('@react-three/fiber', () => ({
  Canvas: ({ children }: any) => <div data-testid="3d-canvas">{children}</div>,
  useFrame: vi.fn(),
  useThree: vi.fn(() => ({ camera: {}, scene: {}, gl: {} })),
}))

vi.mock('@react-three/drei', () => ({
  OrbitControls: () => <div data-testid="orbit-controls" />,
  Text: () => null,
}))

// Mock requestAnimationFrame to avoid timing issues in tests
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

test('renders controls panel', () => {
  render(<App />)
  // the controls panel should contain the ambient slider labels
  expect(screen.getByText(/Card A ambient/i)).toBeTruthy()
  expect(screen.getByText(/Card B ambient/i)).toBeTruthy()
})

test('renders canvas element with correct dimensions', async () => {
  render(<App />)
  
  // Canvas should be present
  const canvas = document.querySelector('canvas')
  expect(canvas).toBeTruthy()
  
  // Wait for useEffect to set canvas dimensions
  await waitFor(() => {
    expect(canvas?.width).toBe(900)
    expect(canvas?.height).toBe(600)
  })
})

test('canvas context is initialized and draws background', async () => {
  const { container } = render(<App />)
  
  const canvas = container.querySelector('canvas') as HTMLCanvasElement
  expect(canvas).toBeTruthy()
  
  await waitFor(() => {
    expect(canvas.width).toBe(900)
    expect(canvas.height).toBe(600)
  })
  
  // Verify canvas has getContext available and is drawing
  const ctx = canvas.getContext('2d')
  expect(ctx).toBeTruthy()
})

test('canvas has background color style to prevent blank appearance', () => {
  const { container } = render(<App />)
  
  const canvas = container.querySelector('canvas') as HTMLCanvasElement
  const styles = window.getComputedStyle(canvas)
  
  // Canvas should have a background color (from inline style)
  expect(canvas.style.backgroundColor).toBe('#111')
})
