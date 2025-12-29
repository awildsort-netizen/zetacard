/**
 * Tests for two-manifold geometry operations
 */

import { describe, test, expect } from 'vitest';
import {
  metricDeterminant,
  metricInverse,
  raiseIndex,
  lowerIndex,
  contractIndices,
  christoffelSymbols,
  extrinsicCurvatureTrace,
  extrinsicCurvatureSquared,
  inducedMetric,
  normalizeVector,
  vectorType,
  minkowskiMetric
} from '../geometry';
import type { Metric, Vec } from '../types';

describe('Metric Operations', () => {
  test('metricDeterminant for Minkowski metric', () => {
    const eta = minkowskiMetric(4);
    const det = metricDeterminant(eta);
    expect(det).toBeCloseTo(-1, 5); // det(diag(-1,1,1,1)) = -1
  });

  test('metricInverse for diagonal metric', () => {
    const g: Metric = [
      [2, 0],
      [0, 3]
    ];
    const gInv = metricInverse(g);
    
    expect(gInv[0][0]).toBeCloseTo(0.5, 5);
    expect(gInv[1][1]).toBeCloseTo(1/3, 5);
    expect(gInv[0][1]).toBeCloseTo(0, 5);
    expect(gInv[1][0]).toBeCloseTo(0, 5);
  });

  test('raiseIndex and lowerIndex are inverses', () => {
    const g: Metric = [[2, 0], [0, 3]];
    const gInv = metricInverse(g);
    const v: Vec = [1, 2];
    
    const vLower = lowerIndex(v, g);
    const vRaised = raiseIndex(vLower, gInv);
    
    expect(vRaised[0]).toBeCloseTo(v[0], 5);
    expect(vRaised[1]).toBeCloseTo(v[1], 5);
  });

  test('contractIndices for identity matrix', () => {
    const I: Metric = [[1, 0], [0, 1]];
    const trace = contractIndices(I, I);
    expect(trace).toBeCloseTo(2, 5); // Tr(I) = 2
  });
});

describe('Christoffel Symbols', () => {
  test('Christoffel symbols vanish for flat metric', () => {
    const eta = minkowskiMetric(2);
    const deta: number[][][] = Array(2).fill(0).map(() =>
      Array(2).fill(0).map(() => Array(2).fill(0))
    );
    
    const Gamma = christoffelSymbols(eta, deta);
    
    // All components should be zero for flat space
    for (let i = 0; i < 2; i++) {
      for (let j = 0; j < 2; j++) {
        for (let k = 0; k < 2; k++) {
          expect(Math.abs(Gamma[i][j][k])).toBeLessThan(1e-10);
        }
      }
    }
  });
});

describe('Extrinsic Curvature', () => {
  test('extrinsicCurvatureTrace for simple case', () => {
    const K: number[][] = [[1, 0], [0, 2]];
    const h: Metric = [[1, 0], [0, 1]];
    
    const trace = extrinsicCurvatureTrace(K, h);
    expect(trace).toBeCloseTo(3, 5); // Tr(K) = 1 + 2 = 3
  });

  test('extrinsicCurvatureSquared for diagonal case', () => {
    const K: number[][] = [[1, 0], [0, 2]];
    const h: Metric = [[1, 0], [0, 1]];
    
    const K2 = extrinsicCurvatureSquared(K, h);
    expect(K2).toBeCloseTo(5, 5); // K^2 = 1^2 + 2^2 = 5
  });
});

describe('Induced Metric', () => {
  test('induced metric from tangent vectors', () => {
    const g: Metric = [
      [-1, 0, 0],
      [0, 1, 0],
      [0, 0, 1]
    ];
    
    // Tangent vectors in xy-plane
    const tangents: Vec[] = [
      [0, 1, 0], // x-direction
      [0, 0, 1]  // y-direction
    ];
    
    const h = inducedMetric(g, tangents);
    
    // Should be 2x2 identity (spatial metric)
    expect(h[0][0]).toBeCloseTo(1, 5);
    expect(h[1][1]).toBeCloseTo(1, 5);
    expect(h[0][1]).toBeCloseTo(0, 5);
  });
});

describe('Vector Classification', () => {
  test('vectorType for timelike vector', () => {
    const eta = minkowskiMetric(4);
    const v: Vec = [1, 0, 0, 0]; // Timelike
    
    const type = vectorType(v, eta);
    expect(type).toBe('timelike');
  });

  test('vectorType for spacelike vector', () => {
    const eta = minkowskiMetric(4);
    const v: Vec = [0, 1, 0, 0]; // Spacelike
    
    const type = vectorType(v, eta);
    expect(type).toBe('spacelike');
  });

  test('normalizeVector preserves direction', () => {
    const g: Metric = [[1, 0], [0, 1]];
    const v: Vec = [3, 4];
    
    const vNorm = normalizeVector(v, g);
    const length = Math.sqrt(vNorm[0]**2 + vNorm[1]**2);
    
    expect(length).toBeCloseTo(1, 5);
    expect(vNorm[0] / vNorm[1]).toBeCloseTo(v[0] / v[1], 5);
  });
});
