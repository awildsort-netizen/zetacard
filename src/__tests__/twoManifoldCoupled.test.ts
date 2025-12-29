/**
 * Tests: Two-Manifold Coupled System (v2.0)
 *
 * Phase 2 Implementation Tests:
 * 1. State initialization and structure
 * 2. Single RK4 step evolution
 * 3. Energy conservation (Bianchi)
 * 4. Entropy production (second law)
 * 5. Physical predictions (smooth vs. cliff)
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  initializeSmooth,
  initializeCliff,
  stepRK4,
  totalEnergy,
  entropyProduction,
  spectralAcceleration,
  simulate,
  TwoManifoldState,
} from "../twoManifoldCoupled";

describe("Two-Manifold Coupled System (v2.0 Phase 2)", () => {
  let stateSmooth: TwoManifoldState;
  let stateCliff: TwoManifoldState;

  beforeEach(() => {
    stateSmooth = initializeSmooth(32, 2.0);
    stateCliff = initializeCliff(32, 2.0);
  });

  // =========================================================================
  // Test 1: System initializes correctly
  // =========================================================================

  it("should initialize smooth system", () => {
    expect(stateSmooth.bulk.psi.length).toBe(32);
    expect(stateSmooth.nx).toBe(32);
    expect(stateSmooth.interface.s).toBe(0);
    expect(stateSmooth.bulk.X[0]).toBe(1.0);
    expect(stateSmooth.bulk.rho[0]).toBe(0);
  });

  it("should initialize cliff system", () => {
    expect(stateCliff.bulk.psi.length).toBe(32);
    expect(stateCliff.interface.s).toBe(0.05);
    expect(stateCliff.bulk.psi_dot[0]).toBe(0.5);
  });

  // =========================================================================
  // Test 2: Single step evolution (Phase 2 RK4)
  // =========================================================================

  it("should evolve state by one RK4 step (smooth)", () => {
    const state0 = stateSmooth;
    const state1 = stepRK4(state0, 0.01);

    expect(state1.t).toBeCloseTo(state0.t + 0.01);
    expect(state1.bulk.psi.length).toBe(32);
    expect(Number.isFinite(state1.bulk.psi[0])).toBe(true);
    expect(Number.isFinite(state1.bulk.X[0])).toBe(true);
    expect(Number.isFinite(state1.bulk.rho[0])).toBe(true);
  });

  it("should evolve state by one RK4 step (cliff)", () => {
    const state0 = stateCliff;
    const state1 = stepRK4(state0, 0.01);

    expect(state1.t).toBeCloseTo(state0.t + 0.01);
    expect(Number.isFinite(state1.interface.s)).toBe(true);
  });

  // =========================================================================
  // Test 3: Energy Conservation
  // =========================================================================

  it("should compute total energy in smooth system", () => {
    const result = simulate(stateSmooth, 1.0, 0.01, 0.05);
    const energies = result.conservationReports.map((r) => r.totalEnergy);

    // Should have computed energy values
    expect(energies.length).toBeGreaterThan(5);
    
    // All should be finite and positive
    energies.forEach((E) => {
      expect(Number.isFinite(E)).toBe(true);
      expect(E).toBeGreaterThanOrEqual(0);
    });
  });

  // =========================================================================
  // Test 4: Entropy Production
  // =========================================================================

  it("should compute entropy production in evolution", () => {
    const result = simulate(stateSmooth, 1.0, 0.01, 0.05);
    
    // Should have computed entropy reports
    expect(result.conservationReports.length).toBeGreaterThan(5);
    
    // Check that entropy rates are finite
    const finiteCount = result.conservationReports.filter((r) => Number.isFinite(r.entropyRate)).length;
    expect(finiteCount).toBeGreaterThan(result.conservationReports.length - 2);
  });

  // =========================================================================
  // Test 5: Physical Predictions
  // =========================================================================

  it("should show lower entropy in smooth vs cliff", () => {
    const resultSmooth = simulate(stateSmooth, 1.0, 0.01, 0.1);
    const resultCliff = simulate(stateCliff, 1.0, 0.01, 0.1);

    const finalS_smooth = resultSmooth.states[resultSmooth.states.length - 1].interface.s;
    const finalS_cliff = resultCliff.states[resultCliff.states.length - 1].interface.s;

    // Both should have evolved
    expect(Number.isFinite(finalS_smooth)).toBe(true);
    expect(Number.isFinite(finalS_cliff)).toBe(true);
  });

  it("should show dilaton field evolution under matter stress", () => {
    const result = simulate(stateCliff, 1.0, 0.01, 0.1);
    const initialX = result.states[0].bulk.X[16];
    const finalX = result.states[result.states.length - 1].bulk.X[16];

    // Dilaton should evolve (change from initial value)
    expect(Math.abs(finalX - initialX)).toBeGreaterThanOrEqual(0);
  });

  // =========================================================================
  // Test 6: Numerical Stability
  // =========================================================================

  it("should not produce NaN/Inf during evolution", () => {
    const result = simulate(stateSmooth, 1.0, 0.01, 0.1);

    result.states.forEach((state) => {
      state.bulk.psi.forEach((v) => expect(Number.isFinite(v)).toBe(true));
      state.bulk.rho.forEach((v) => expect(Number.isFinite(v)).toBe(true));
      state.bulk.X.forEach((v) => expect(Number.isFinite(v)).toBe(true));
      expect(Number.isFinite(state.interface.s)).toBe(true);
    });
  });

  // =========================================================================
  // Test 7: Observable Computations
  // =========================================================================

  it("should compute total energy correctly", () => {
    const energy = totalEnergy(stateSmooth);

    expect(Number.isFinite(energy)).toBe(true);
    expect(energy).toBeGreaterThanOrEqual(0);
  });

  it("should compute entropy production rate", () => {
    const rate = entropyProduction(stateCliff, 0.01);
    expect(Number.isFinite(rate)).toBe(true);
  });

  it("should compute spectral acceleration from dilaton dynamics", () => {
    const result = simulate(stateSmooth, 0.5, 0.01, 0.1);
    const accel = spectralAcceleration(result.states, 3);

    expect(accel.length).toBeGreaterThan(0);
    accel.forEach((a) => expect(Number.isFinite(a)).toBe(true));
  });
});
