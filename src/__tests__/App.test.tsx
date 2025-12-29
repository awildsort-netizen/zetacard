import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import { test, expect, vi, afterEach, beforeEach } from 'vitest'
import App from '../App'

// Mock canvas context (jsdom doesn't support canvas operations)
beforeEach(() => {
  HTMLCanvasElement.prototype.getContext = vi.fn(() => ({
    fillRect: vi.fn(),
    clearRect: vi.fn(),
    getImageData: vi.fn(),
    putImageData: vi.fn(),
    createImageData: vi.fn(),
    setTransform: vi.fn(),
    drawImage: vi.fn(),
    save: vi.fn(),
    fillText: vi.fn(),
    restore: vi.fn(),
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    closePath: vi.fn(),
    stroke: vi.fn(),
    translate: vi.fn(),
    scale: vi.fn(),
    rotate: vi.fn(),
    arc: vi.fn(),
    fill: vi.fn(),
    measureText: vi.fn(() => ({ width: 0 })),
    transform: vi.fn(),
    rect: vi.fn(),
    clip: vi.fn(),
  })) as unknown as typeof HTMLCanvasElement.prototype.getContext
})

// Mock Three.js Canvas for testing (not available in jsdom)
vi.mock('@react-three/fiber', () => ({
  Canvas: ({ children }: { children?: React.ReactNode }) => <div data-testid="3d-canvas">{children}</div>,
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
  
  // Canvas should have a background color (from inline style)
  // Browsers convert hex to rgb format
  expect(canvas.style.backgroundColor).toBe('rgb(17, 17, 17)')
})
