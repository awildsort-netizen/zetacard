/**
 * Tests for interface Lagrangian and membrane dynamics
 */

import { describe, test, expect } from 'vitest';
import {
  expansionScalar,
  shearRateTensor,
  surfaceTensionTerm,
  bulkViscosityTerm,
  shearViscosityTerm,
  entropyEvolution,
  membraneTemperature,
  updateMembraneState
} from '../manifold/interface';
import type { Metric, InterfaceMembraneState, InterfaceLagrangianParams, EnergyFlux } from '../manifold/types';

describe('Interface Lagrangian Terms', () => {
  test('expansionScalar for uniform expansion', () => {
    const h: Metric = [[1, 0], [0, 1]];
    const flowVector = [1, 0];
    const flowDerivative = [[1, 0], [0, 1]]; // Uniform expansion
    
    const theta = expansionScalar(flowVector, flowDerivative, h);
    expect(theta).toBeCloseTo(2, 5); // Trace of identity
  });

  test('shearRateTensor vanishes for pure expansion', () => {
    const h: Metric = [[1, 0], [0, 1]];
    const flowVector = [1, 0];
    const flowDerivative = [[1, 0], [0, 1]]; // Uniform expansion (no shear)
    
    const shear = shearRateTensor(flowVector, flowDerivative, h);
    
    // Shear should be small (traceless part vanishes)
    expect(shear.magnitude).toBeLessThan(1e-10);
  });

  test('surfaceTensionTerm scales with curvature', () => {
    const sigma = 2.0;
    const K: number[][] = [[1, 0], [0, 1]];
    const h: Metric = [[1, 0], [0, 1]];
    
    const term = surfaceTensionTerm(sigma, K, h);
    expect(term).toBeCloseTo(4.0, 5); // σ * Tr(K) = 2 * 2 = 4
  });

  test('bulkViscosityTerm quadratic in expansion', () => {
    const eta = 0.5;
    const theta = 3.0;
    
    const term = bulkViscosityTerm(eta, theta);
    expect(term).toBeCloseTo(4.5, 5); // 0.5 * 9 = 4.5
  });

  test('shearViscosityTerm scales with shear magnitude', () => {
    const zeta = 0.3;
    const shearMag = 2.0;
    
    const term = shearViscosityTerm(zeta, shearMag);
    expect(term).toBeCloseTo(0.6, 5); // 0.3 * 2 = 0.6
  });
});

describe('Entropy Dynamics', () => {
  test('entropyEvolution increases with positive flux', () => {
    const flux: EnergyFlux = {
      incoming: 2.0,
      outgoing: 1.0,
      net: 1.0
    };
    const temperature = 1.0;
    const entropyGradient = [0, 0, 0];
    const h: Metric = [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
    
    const dSdt = entropyEvolution(flux, temperature, entropyGradient, h);
    expect(dSdt).toBeCloseTo(1.0, 5); // net/T = 1/1 = 1
  });

  test('entropyEvolution decreases with negative flux', () => {
    const flux: EnergyFlux = {
      incoming: 0.5,
      outgoing: 1.5,
      net: -1.0
    };
    const temperature = 2.0;
    const entropyGradient = [0, 0, 0];
    const h: Metric = [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
    
    const dSdt = entropyEvolution(flux, temperature, entropyGradient, h);
    expect(dSdt).toBeCloseTo(-0.5, 5); // -1/2 = -0.5
  });

  test('membraneTemperature increases with entropy', () => {
    const entropy = 2.0;
    const curvatureTrace = 0.5;
    
    const T1 = membraneTemperature(entropy, curvatureTrace, 1.0, 0.1, 0.05);
    const T0 = membraneTemperature(0, curvatureTrace, 1.0, 0.1, 0.05);
    
    expect(T1).toBeGreaterThan(T0);
  });
});

describe('Membrane State Update', () => {
  test('updateMembraneState with positive flux increases entropy', () => {
    const state: InterfaceMembraneState = {
      inducedMetric: [[1, 0, 0], [0, 1, 0], [0, 0, 1]],
      extrinsicCurvature: [[0, 0, 0], [0, 0, 0], [0, 0, 0]],
      shadowExtrinsicCurvature: [[0, 0, 0], [0, 0, 0], [0, 0, 0]],
      entropy: 1.0,
      temperature: 1.0,
      flowVector: [1, 0, 0],
      surfaceStress: [[0, 0, 0], [0, 0, 0], [0, 0, 0]],
      embedding: [0, 0, 0, 0],
      dimension: 3
    };
    
    const params: InterfaceLagrangianParams = {
      surfaceTension: 1.0,
      viscosity: { eta: 0.1, zeta: 0.05 }
    };
    
    const flux: EnergyFlux = {
      incoming: 2.0,
      outgoing: 0.5,
      net: 1.5
    };
    
    const newState = updateMembraneState(state, params, flux, 0.1);
    
    expect(newState.entropy).toBeGreaterThan(state.entropy);
    expect(newState.temperature).toBeGreaterThan(state.temperature);
  });

  test('updateMembraneState enforces non-negative entropy', () => {
    const state: InterfaceMembraneState = {
      inducedMetric: [[1, 0, 0], [0, 1, 0], [0, 0, 1]],
      extrinsicCurvature: [[0, 0, 0], [0, 0, 0], [0, 0, 0]],
      shadowExtrinsicCurvature: [[0, 0, 0], [0, 0, 0], [0, 0, 0]],
      entropy: 0.1,
      temperature: 1.0,
      flowVector: [1, 0, 0],
      surfaceStress: [[0, 0, 0], [0, 0, 0], [0, 0, 0]],
      embedding: [0, 0, 0, 0],
      dimension: 3
    };
    
    const params: InterfaceLagrangianParams = {
      surfaceTension: 1.0,
      viscosity: { eta: 0.1, zeta: 0.05 }
    };
    
    const flux: EnergyFlux = {
      incoming: 0,
      outgoing: 10.0, // Large outgoing flux
      net: -10.0
    };
    
    const newState = updateMembraneState(state, params, flux, 0.1);
    
    expect(newState.entropy).toBeGreaterThanOrEqual(0);
  });
});
