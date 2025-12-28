import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, test, expect, vi } from 'vitest'
import App from '../App'

// Mock Three.js Canvas for testing
vi.mock('@react-three/fiber', () => ({
  Canvas: ({ children }: any) => <div data-testid="3d-canvas">{children}</div>,
  useFrame: vi.fn(),
  useThree: vi.fn(() => ({ camera: {}, scene: {}, gl: {} })),
}))

vi.mock('@react-three/drei', () => ({
  OrbitControls: () => <div data-testid="orbit-controls" />,
  Text: () => null,
}))

describe('Omnibox Card Flow', () => {
  test('omnibox displays search input', () => {
    render(<App />)
    const input = screen.getByPlaceholderText(/Type or paste to find cards/i)
    expect(input).toBeTruthy()
  })

  test('omnibox search shows results', async () => {
    render(<App />)
    const input = screen.getByPlaceholderText(/Type or paste to find cards/i)
    
    fireEvent.change(input, { target: { value: 'heartbeat' } })
    
    await waitFor(() => {
      expect(document.body.innerHTML).toMatch(/match:/i)
    })
  })

  test('Run button invokes card', async () => {
    render(<App />)
    const input = screen.getByPlaceholderText(/Type or paste to find cards/i)
    
    fireEvent.change(input, { target: { value: 'spectral' } })
    
    await waitFor(() => {
      expect(document.body.innerHTML).toMatch(/match:/i)
    })
    
    const runButton = screen.getByRole('button', { name: /Run/i })
    fireEvent.click(runButton)
    
    // Should show card in full screen
    await waitFor(() => {
      expect(screen.getByText(/Close \(Esc\)/i)).toBeTruthy()
    })
  })
})
