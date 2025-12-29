import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, test, expect, vi } from 'vitest'
import App from '../App'

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

describe('Omnibox User Flows', () => {
test('omnibox search -> click Run -> card displays full screen', async () => {
  render(<App />)

  // omnibox input should be present
  const input = screen.getByPlaceholderText(/Type card ID or name/i)
  expect(input).toBeTruthy()

  // type a query that should match a card
  fireEvent.change(input, { target: { value: 'heartbeat' } })
  
  // the results list should render with card results
  await waitFor(() => {
    expect(document.body.innerHTML).toMatch(/Spectral Heartbeat/i)
  }, { timeout: 2000 })

  // click Activate button to invoke the selected card
  const activateButton = screen.getByRole('button', { name: /Activate/i })
  fireEvent.click(activateButton)

  // card should display with title and tagline
  await waitFor(() => {
    expect(screen.getByText(/Close \(Esc\)/i)).toBeTruthy()
  }, { timeout: 2000 })
})

test('omnibox Enter key -> card displays full screen', async () => {
  render(<App />)

  const input = screen.getByPlaceholderText(/Type card ID or name/i)
  
  // type a query
  fireEvent.change(input, { target: { value: 'spectral' } })
  
  // wait for results
  await waitFor(() => {
    expect(document.body.innerHTML).toMatch(/Spectral Heartbeat/i)
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

  const input = screen.getByPlaceholderText(/Type card ID or name/i)
  fireEvent.change(input, { target: { value: 'heartbeat' } })
  
  await waitFor(() => {
    expect(document.body.innerHTML).toMatch(/Spectral Heartbeat/i)
  }, { timeout: 2000 })

  const activateButton = screen.getByRole('button', { name: /Activate/i })
  fireEvent.click(activateButton)

  // card should be displayed
  await waitFor(() => {
    expect(screen.getByText(/Close \(Esc\)/i)).toBeTruthy()
  }, { timeout: 2000 })

  // click Close button
  const closeButton = screen.getByRole('button', { name: /Close \(Esc\)/i })
  fireEvent.click(closeButton)

  // should return to main view (canvas visible)
  await waitFor(() => {
    const mainView = screen.getByTestId('main-view')
    expect(mainView).toBeTruthy()
  }, { timeout: 2000 })
})
})
