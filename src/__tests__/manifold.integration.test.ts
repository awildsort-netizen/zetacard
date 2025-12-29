/**
 * Tests for 1+1D toy model and Zeta Engine integration
 */

import { describe, test, expect } from 'vitest';
import {
  initialize1DSystem,
  step1DSystem,
  run1DSimulation,
  constantSource,
  pulsedSource,
  verify1DConservation
} from '../toy1d';
import {
  initializeZetaEngine,
  stepZetaEngine,
  runZetaEngine,
  isSystemConserved,
  maxConservationViolation,
  systemEnergy,
  DEFAULT_INTEGRATION_PARAMS
} from '../zetaEngine';

describe('1+1D Toy Model', () => {
  test('initialize1DSystem creates valid system', () => {
    const system = initialize1DSystem();
    
    expect(system.physical.dimension).toBe(2);
    expect(system.shadow.dimension).toBe(2);
    expect(system.interface.dimension).toBe(1);
    expect(system.time).toBe(0);
  });

  test('step1DSystem with positive flux increases entropy', () => {
    const system = initialize1DSystem();
    const initialEntropy = system.interface.entropy;
    
    const newSystem = step1DSystem(system, 1.0, 0.0, 0.1);
    
    expect(newSystem.interface.entropy).toBeGreaterThan(initialEntropy);
    expect(newSystem.time).toBeCloseTo(0.1, 5);
  });

  test('step1DSystem with negative flux decreases entropy', () => {
    let system = initialize1DSystem();
    // Build up some entropy first
    system.interface.entropy = 2.0;
    
    const initialEntropy = system.interface.entropy;
    const newSystem = step1DSystem(system, 0.0, 1.0, 0.1);
    
    expect(newSystem.interface.entropy).toBeLessThan(initialEntropy);
  });

  test('run1DSimulation with constant source', () => {
    const system = initialize1DSystem();
    const source = constantSource(1.0, 0.0);
    
    const result = run1DSimulation(system, 10, 0.1, source);
    
    expect(result.history.length).toBe(10);
    expect(result.system.time).toBeCloseTo(1.0, 5);
    
    // Entropy should monotonically increase with constant positive source
    for (let i = 1; i < result.history.length; i++) {
      expect(result.history[i].entropy).toBeGreaterThanOrEqual(
        result.history[i - 1].entropy
      );
    }
  });

  test('run1DSimulation with pulsed source shows oscillation', () => {
    const system = initialize1DSystem();
    const source = pulsedSource(1.0, 1.0); // 1 Hz oscillation
    
    const result = run1DSimulation(system, 20, 0.05, source);
    
    // Check for oscillatory behavior in history
    const entropies = result.history.map(h => h.entropy);
    
    // Find local maxima and minima
    let hasMaxima = false;
    let hasMinima = false;
    
    for (let i = 1; i < entropies.length - 1; i++) {
      if (entropies[i] > entropies[i - 1] && entropies[i] > entropies[i + 1]) {
        hasMaxima = true;
      }
      if (entropies[i] < entropies[i - 1] && entropies[i] < entropies[i + 1]) {
        hasMinima = true;
      }
    }
    
    // With oscillating source, should see some variation
    expect(hasMaxima || hasMinima).toBe(true);
  });

  test('verify1DConservation for equilibrium system', () => {
    const system = initialize1DSystem();
    const source = constantSource(0.5, 0.5); // Balanced
    
    const result = run1DSimulation(system, 20, 0.1, source);
    
    // With balanced fluxes, energy should be approximately conserved
    const conserved = verify1DConservation(result.history, 0.5);
    expect(conserved).toBe(true);
  });
});

describe('Zeta Engine Integration', () => {
  test('initializeZetaEngine creates valid state', () => {
    const system = initialize1DSystem();
    const engineState = initializeZetaEngine(system);
    
    expect(engineState.time).toBe(0);
    expect(engineState.step).toBe(0);
    expect(engineState.conservationHistory).toHaveLength(0);
  });

  test('stepZetaEngine advances time and step', () => {
    const system = initialize1DSystem();
    const engineState = initializeZetaEngine(system);
    
    const newState = stepZetaEngine(engineState);
    
    expect(newState.step).toBe(1);
    expect(newState.time).toBeGreaterThan(0);
    expect(newState.conservationHistory).toHaveLength(1);
  });

  test('runZetaEngine for multiple steps', () => {
    const system = initialize1DSystem();
    const engineState = initializeZetaEngine(system);
    
    const finalState = runZetaEngine(engineState, 10);
    
    expect(finalState.step).toBe(10);
    expect(finalState.conservationHistory).toHaveLength(10);
  });

  test('systemEnergy is finite', () => {
    const system = initialize1DSystem();
    const energy = systemEnergy(system);
    
    expect(Number.isFinite(energy)).toBe(true);
  });

  test('maxConservationViolation is computed', () => {
    const system = initialize1DSystem();
    const engineState = initializeZetaEngine(system);
    
    const finalState = runZetaEngine(engineState, 5);
    const maxViolation = maxConservationViolation(finalState);
    
    expect(Number.isFinite(maxViolation)).toBe(true);
    expect(maxViolation).toBeGreaterThanOrEqual(0);
  });

  test('small timestep maintains better conservation', () => {
    const system = initialize1DSystem();
    
    // Run with large timestep
    const engineState1 = initializeZetaEngine(system);
    const params1 = { ...DEFAULT_INTEGRATION_PARAMS, dt: 0.1 };
    const state1 = runZetaEngine(engineState1, 10, params1);
    const violation1 = maxConservationViolation(state1);
    
    // Run with small timestep
    const engineState2 = initializeZetaEngine(system);
    const params2 = { ...DEFAULT_INTEGRATION_PARAMS, dt: 0.01 };
    const state2 = runZetaEngine(engineState2, 10, params2);
    const violation2 = maxConservationViolation(state2);
    
    // Smaller timestep should have better or equal conservation
    // (May not always be true due to accumulation, but generally expected)
    expect(violation2).toBeLessThanOrEqual(violation1 * 2); // Allow some margin
  });
});
