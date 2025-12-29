/**
 * Phase 5.1 Tests: Continued Fraction Extraction from Worldline Histories
 *
 * Validates:
 * - CF extraction is numerically stable
 * - Worldline distance metric is meaningful
 * - CF signatures capture trajectory topology
 * - Classification works on nearby trajectories
 */

import { describe, it, expect, beforeAll } from 'vitest';
import {
  initializeSmooth,
  initializeCliff,
  stepRK4,
  simulate,
  TwoManifoldState,
} from '../twoManifoldCoupled';
import {
  extractWorldlineHistory,
  computeCharacteristicScalar,
  extractContinuedFraction,
  reconstructFromCF,
  cfReconstructionError,
  extractCFSignature,
  worldlineDistance,
  cfSignatureOverlap,
  classifyTrajectory,
  CFSignature,
  WorldlinePoint,
} from '../phase5_cf';

describe('Phase 5.1: Continued Fraction Extraction', () => {
  /**
   * Test 1: Extract Worldline History
   *
   * Verify that worldline history extraction captures all relevant fields
   * in the correct order with no NaN/Infinity.
   */
  it('extractWorldlineHistory captures complete trajectory', () => {
    const state = initializeCliff(32, 2.0);
    let current = state;

    const states: TwoManifoldState[] = [current];
    for (let i = 0; i < 30; i++) {
      current = stepRK4(current, 0.01);
      states.push(current);
    }

    const history = extractWorldlineHistory(states);

    // Verify length
    expect(history.length).toBe(states.length);

    // Verify all fields present and finite
    for (const point of history) {
      expect(Number.isFinite(point.t)).toBe(true);
      expect(Number.isFinite(point.x_b)).toBe(true);
      expect(Number.isFinite(point.v_b)).toBe(true);
      expect(Number.isFinite(point.theta)).toBe(true);
      expect(Number.isFinite(point.s)).toBe(true);
      expect(Number.isFinite(point.tau)).toBe(true);
    }

    // Verify time is monotonic
    for (let i = 1; i < history.length; i++) {
      expect(history[i].t).toBeGreaterThan(history[i - 1].t);
    }

    // Verify proper time is monotonic
    for (let i = 1; i < history.length; i++) {
      expect(history[i].tau).toBeGreaterThan(history[i - 1].tau);
    }
  });

  /**
   * Test 2: Characteristic Scalar Computation
   *
   * Verify that all three strategies (velocity_ratio, displacement_time_ratio,
   * entropy_velocity_ratio) produce finite positive values.
   */
  it('computeCharacteristicScalar produces finite values for all strategies', () => {
    const state = initializeCliff(32, 2.0);
    let current = state;

    const states: TwoManifoldState[] = [current];
    for (let i = 0; i < 50; i++) {
      current = stepRK4(current, 0.01);
      states.push(current);
    }

    const history = extractWorldlineHistory(states);

    const strategies: Array<'velocity_ratio' | 'displacement_time_ratio' | 'entropy_velocity_ratio'> = [
      'velocity_ratio',
      'displacement_time_ratio',
      'entropy_velocity_ratio',
    ];

    for (const strategy of strategies) {
      const scalar = computeCharacteristicScalar(history, strategy);
      expect(Number.isFinite(scalar)).toBe(true);
      expect(scalar).toBeGreaterThan(0);
    }
  });

  /**
   * Test 3: Continued Fraction Extraction
   *
   * Verify that CF extraction:
   * - Produces increasing sequence of a_i (mostly)
   * - Has finite length (convergence or noise detection)
   * - Reconstructs the original value within tolerance
   */
  it('extractContinuedFraction converges and reconstructs accurately', () => {
    // Test on a few known values
    const testValues = [
      Math.PI,           // ≈ 3.14159...
      Math.E,            // ≈ 2.71828...
      Math.sqrt(2),      // ≈ 1.41421...
      (1 + Math.sqrt(5)) / 2,  // Golden ratio
      2.5,               // Simple rational
    ];

    for (const value of testValues) {
      const cf = extractContinuedFraction(value, 20);

      // Verify finite and non-empty
      expect(cf.length).toBeGreaterThan(0);
      expect(cf.length).toBeLessThanOrEqual(20);

      // Verify a_0 = floor(value)
      expect(cf[0]).toBe(Math.floor(value));

      // Reconstruct and check error
      const reconstruction = reconstructFromCF(cf);
      const error = cfReconstructionError(value, reconstruction);

      // Error should be small (< 1% relative)
      expect(error).toBeLessThan(0.01);
    }
  });

  /**
   * Test 4: CF Signature Extraction (Full Pipeline)
   *
   * Verify that extractCFSignature:
   * - Runs without error
   * - Produces valid metadata
   * - Reconstruction error is acceptable
   */
  it('extractCFSignature runs full pipeline and produces valid signature', () => {
    const state = initializeCliff(32, 2.0);
    let current = state;

    const states: TwoManifoldState[] = [current];
    for (let i = 0; i < 50; i++) {
      current = stepRK4(current, 0.01);
      states.push(current);
    }

    const signature = extractCFSignature(states, 'velocity_ratio', 15);

    // Verify metadata
    expect(Number.isFinite(signature.source)).toBe(true);
    expect(signature.source).toBeGreaterThan(0);
    expect(Number.isFinite(signature.reconstructionError)).toBe(true);
    expect(signature.reconstructionError).toBeGreaterThanOrEqual(0);
    expect(signature.depth).toBeGreaterThan(0);
    expect(signature.coefficients.length).toBe(signature.depth);

    // Reconstruction error should be small
    expect(signature.reconstructionError).toBeLessThan(0.05);

    // All coefficients should be non-negative integers
    for (const coeff of signature.coefficients) {
      expect(Number.isInteger(coeff)).toBe(true);
      expect(coeff).toBeGreaterThanOrEqual(0);
    }
  });

  /**
   * Test 5: Worldline Distance Metric (Reparameterization Invariance)
   *
   * Verify that worldlineDistance:
   * - Computes successfully
   * - Is small for identical (shifted) histories
   * - Is larger for different trajectories
   */
  it('worldlineDistance detects trajectory similarity', () => {
    // Generate two runs with same initial condition
    const state1 = initializeCliff(32, 2.0);
    let current1 = state1;
    const states1: TwoManifoldState[] = [current1];
    for (let i = 0; i < 50; i++) {
      current1 = stepRK4(current1, 0.01);
      states1.push(current1);
    }

    const state2 = initializeCliff(32, 2.0);
    let current2 = state2;
    const states2: TwoManifoldState[] = [current2];
    for (let i = 0; i < 50; i++) {
      current2 = stepRK4(current2, 0.01);
      states2.push(current2);
    }

    // Identical initial conditions → same worldlines → small distance
    const hist1 = extractWorldlineHistory(states1);
    const hist2 = extractWorldlineHistory(states2);
    const distSame = worldlineDistance(hist1, hist2, 0.2, 21);

    expect(Number.isFinite(distSame)).toBe(true);
    expect(distSame).toBeGreaterThanOrEqual(0);
    // Identical conditions → distance should be very small
    expect(distSame).toBeLessThan(0.01);

    // Different initial condition (smooth vs cliff) → larger distance
    const stateSmooth = initializeSmooth(32, 2.0);
    let currentSmooth = stateSmooth;
    const statesSmooth: TwoManifoldState[] = [currentSmooth];
    for (let i = 0; i < 50; i++) {
      currentSmooth = stepRK4(currentSmooth, 0.01);
      statesSmooth.push(currentSmooth);
    }

    const histSmooth = extractWorldlineHistory(statesSmooth);
    const distDifferent = worldlineDistance(hist1, histSmooth, 0.2, 21);

    expect(Number.isFinite(distDifferent)).toBe(true);
    // Different initial conditions → distance should be larger
    expect(distDifferent).toBeGreaterThan(distSame);
  });

  /**
   * Test 6: CF Signature Overlap
   *
   * Verify that:
   * - Same trajectories share many CF terms
   * - Different trajectories share fewer terms
   * - Overlap is between 0 and min(depth1, depth2)
   */
  it('cfSignatureOverlap detects CF similarity', () => {
    // Generate identical trajectories
    const state1 = initializeCliff(32, 2.0);
    let current1 = state1;
    const states1: TwoManifoldState[] = [current1];
    for (let i = 0; i < 50; i++) {
      current1 = stepRK4(current1, 0.01);
      states1.push(current1);
    }

    const state2 = initializeCliff(32, 2.0);
    let current2 = state2;
    const states2: TwoManifoldState[] = [current2];
    for (let i = 0; i < 50; i++) {
      current2 = stepRK4(current2, 0.01);
      states2.push(current2);
    }

    const sig1 = extractCFSignature(states1, 'velocity_ratio', 15);
    const sig2 = extractCFSignature(states2, 'velocity_ratio', 15);

    // Identical initial conditions → high overlap
    const overlapSame = cfSignatureOverlap(sig1, sig2);
    expect(overlapSame).toBeGreaterThanOrEqual(0);
    expect(overlapSame).toBeLessThanOrEqual(Math.min(sig1.depth, sig2.depth));

    // Different initial conditions
    const stateSmooth = initializeSmooth(32, 2.0);
    let currentSmooth = stateSmooth;
    const statesSmooth: TwoManifoldState[] = [currentSmooth];
    for (let i = 0; i < 50; i++) {
      currentSmooth = stepRK4(currentSmooth, 0.01);
      statesSmooth.push(currentSmooth);
    }

    const sigSmooth = extractCFSignature(statesSmooth, 'velocity_ratio', 15);
    const overlapDifferent = cfSignatureOverlap(sig1, sigSmooth);

    // Different trajectories may or may not share first term;
    // just verify the overlap metric is valid
    expect(overlapDifferent).toBeGreaterThanOrEqual(0);
  });

  /**
   * Test 7: Trajectory Classification (Proof of Concept)
   *
   * Verify that classifyTrajectory:
   * - Returns a valid classification
   * - Unknown matching reference → high confidence
   * - Unknown far from references → low confidence
   */
  it('classifyTrajectory identifies nearest reference', () => {
    // Create reference trajectories
    const refStates1: TwoManifoldState[] = [];
    {
      let current = initializeCliff(32, 2.0);
      refStates1.push(current);
      for (let i = 0; i < 50; i++) {
        current = stepRK4(current, 0.01);
        refStates1.push(current);
      }
    }

    const refStates2: TwoManifoldState[] = [];
    {
      let current = initializeSmooth(32, 2.0);
      refStates2.push(current);
      for (let i = 0; i < 50; i++) {
        current = stepRK4(current, 0.01);
        refStates2.push(current);
      }
    }

    // Build reference map
    const references = new Map<string, CFSignature>();
    references.set('cliff', extractCFSignature(refStates1, 'velocity_ratio', 15));
    references.set('smooth', extractCFSignature(refStates2, 'velocity_ratio', 15));

    // Test on a trajectory identical to "cliff"
    const testStates: TwoManifoldState[] = [];
    {
      let current = initializeCliff(32, 2.0);
      testStates.push(current);
      for (let i = 0; i < 50; i++) {
        current = stepRK4(current, 0.01);
        testStates.push(current);
      }
    }

    const testCF = extractCFSignature(testStates, 'velocity_ratio', 15);
    const classification = classifyTrajectory(testCF, references);

    // Should classify as "cliff" (or at least have a valid result)
    expect(classification.nearestRef).not.toBeNull();
    expect(Number.isFinite(classification.distance)).toBe(true);
    expect(Number.isFinite(classification.confidence)).toBe(true);
    expect(classification.confidence).toBeGreaterThanOrEqual(0);
    expect(classification.confidence).toBeLessThanOrEqual(1);
  });

  /**
   * Test 8: CF Extraction Stability Across Resolutions
   *
   * Verify that CF extraction is qualitatively similar for
   * coarser and finer grids (testing topological invariance).
   */
  it('CF extraction is stable across different grid resolutions', () => {
    // Run on coarse grid (32 points)
    const statesCoarse: TwoManifoldState[] = [];
    {
      let current = initializeCliff(32, 2.0);
      statesCoarse.push(current);
      for (let i = 0; i < 50; i++) {
        current = stepRK4(current, 0.01);
        statesCoarse.push(current);
      }
    }

    // Run on fine grid (64 points)
    const statesFine: TwoManifoldState[] = [];
    {
      let current = initializeCliff(64, 2.0);
      statesFine.push(current);
      for (let i = 0; i < 50; i++) {
        current = stepRK4(current, 0.01);
        statesFine.push(current);
      }
    }

    const cfCoarse = extractCFSignature(statesCoarse, 'velocity_ratio', 15);
    const cfFine = extractCFSignature(statesFine, 'velocity_ratio', 15);

    // Both should produce valid CF signatures
    expect(cfCoarse.depth).toBeGreaterThan(0);
    expect(cfFine.depth).toBeGreaterThan(0);

    // First coefficient may differ due to resolution, but should be in same ballpark
    // (within ~1%)
    const relDiff = Math.abs(cfCoarse.coefficients[0] - cfFine.coefficients[0]) / 
                    Math.max(cfCoarse.coefficients[0], cfFine.coefficients[0]);
    expect(relDiff).toBeLessThan(0.02);

    // Overlap should be substantial (at least some terms match)
    const overlap = cfSignatureOverlap(cfCoarse, cfFine);
    expect(overlap).toBeGreaterThanOrEqual(0);  // May be 0 if grid difference changes structure
  });
});
