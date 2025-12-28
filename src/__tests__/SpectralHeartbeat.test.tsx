import React from 'react';
import { render, screen } from '@testing-library/react';
import { test, expect } from 'vitest';
import SpectralHeartbeat from '../components/SpectralHeartbeat';

test('renders dot and no tick for small change', () => {
  render(<SpectralHeartbeat vector={[1, 0]} prevVector={[0.9999, 0.01]} tickEpsilon={0.2} />);
  expect(screen.getByTestId('heartbeat-dot')).toBeTruthy();
  expect(screen.queryByTestId('heartbeat-tick')).toBeNull();
});

test('renders tick for large change', () => {
  render(<SpectralHeartbeat vector={[1, 0]} prevVector={[0, -1]} tickEpsilon={0.5} />);
  expect(screen.getByTestId('heartbeat-tick')).toBeTruthy();
});

test('flat spectrum shows flat message', () => {
  render(<SpectralHeartbeat vector={[0, 0]} />);
  expect(screen.getByTestId('heartbeat-flat')).toBeTruthy();
});
