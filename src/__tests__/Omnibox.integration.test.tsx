import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, test, expect, vi } from 'vitest'
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

describe('Omnibox User Flows', () => {
test('omnibox search -> click Run -> card displays full screen', async () => {
  render(<App />)

  // omnibox input should be present
  const input = screen.getByPlaceholderText(/Type or paste to find cards/i)
  expect(input).toBeTruthy()

  // type a query that should match a card
  fireEvent.change(input, { target: { value: 'heartbeat' } })
  
  // the results list should render (each result shows a 'match:' line)
  await waitFor(() => {
    expect(document.body.innerHTML).toMatch(/match:/i)
  }, { timeout: 2000 })

  // click Run button to invoke the selected card
  const runButtons = screen.getAllByRole('button', { name: /Run/i })
  // First Run button is in the Omnibox header
  fireEvent.click(runButtons[0])

  // card should display with title and tagline
  await waitFor(() => {
    expect(screen.getByText(/Close \(Esc\)/i)).toBeTruthy()
  }, { timeout: 2000 })
})

test('omnibox Enter key -> card displays full screen', async () => {
  render(<App />)

  const input = screen.getByPlaceholderText(/Type or paste to find cards/i)
  
  // type a query
  fireEvent.change(input, { target: { value: 'spectral' } })
  
  // wait for results
  await waitFor(() => {
    expect(document.body.innerHTML).toMatch(/match:/i)
  }, { timeout: 2000 })

  // press Enter to invoke selected card
  fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' })

  // card full screen should be visible with Close button
  await waitFor(() => {
    expect(screen.getByText(/Close \(Esc\)/i)).toBeTruthy()
  }, { timeout: 2000 })
})

test('click Close button -> returns to main view', async () => {
  render(<App />)

  const input = screen.getByPlaceholderText(/Type or paste to find cards/i)
  fireEvent.change(input, { target: { value: 'heartbeat' } })
  
  await waitFor(() => {
    expect(document.body.innerHTML).toMatch(/match:/i)
  }, { timeout: 2000 })

  const runButtons = screen.getAllByRole('button', { name: /Run/i })
  fireEvent.click(runButtons[0])

  // card should be displayed
  await waitFor(() => {
    expect(screen.getByText(/Close \(Esc\)/i)).toBeTruthy()
  }, { timeout: 2000 })

  // click Close button
  const closeButton = screen.getByRole('button', { name: /Close \(Esc\)/i })
  fireEvent.click(closeButton)

  // should return to main view with omnibox visible
  await waitFor(() => {
    const inputs = screen.getAllByPlaceholderText(/Type or paste to find cards/i)
    expect(inputs.length > 0).toBeTruthy()
  }, { timeout: 2000 })
})
})
