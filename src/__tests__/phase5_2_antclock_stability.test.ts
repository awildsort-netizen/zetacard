/**
 * Phase 5.2: Antclock Stability Test
 *
 * Tests whether Antclock event signals and their topological signatures
 * are stable under small deformations of trajectory space.
 *
 * Core question: Can Antclock + CF together classify trajectories?
 * (i.e., are they invariants of trajectory equivalence class, not artifacts?)
 *
 * Approach: 
 * - Test 1: Event signal magnitude is deterministic
 * - Test 2: Event signal is stable under small perturbations (topological invariant)
 * - Test 3: CF signatures remain similar across trajectory pairs with same topology
 * - Test 4: Cliff and smooth trajectories have distinct event + CF signatures
 */

import { describe, it, expect } from 'vitest';
import {
  initializeSmooth,
  initializeCliff,
  stepRK4,
  TwoManifoldState,
} from '../twoManifoldCoupled';
import {
  computeAntclockEventSignal,
} from '../antclockSolverV2';
import {
  extractCFSignature,
} from '../phase5_cf';

/**
 * Event signal profile: array of event magnitudes over time.
 * Used to test stability and similarity.
 */
interface EventSignalProfile {
  times: number[];
  magnitudes: number[];
  avgMagnitude: number;
  maxMagnitude: number;
}

/**
 * Helper 1: Extract event signal profile over a simulation.
 *
 * Runs simulation and collects event signals at each step,
 * returning them as a profile for comparison.
 */
export function extractEventSignalProfile(
  states: TwoManifoldState[]
): EventSignalProfile {
  const times: number[] = [];
  const magnitudes: number[] = [];

  for (let i = 0; i < states.length; i++) {
    const state = states[i];
    const prevState = i > 0 ? states[i - 1] : undefined;

    const signal = computeAntclockEventSignal(state, prevState, 0.01);

    times.push(state.interface.tau);
    magnitudes.push(signal.total_event_magnitude);
  }

  const avgMagnitude = magnitudes.length > 0
    ? magnitudes.reduce((a, b) => a + b, 0) / magnitudes.length
    : 0;
  const maxMagnitude = magnitudes.length > 0 ? Math.max(...magnitudes) : 0;

  return { times, magnitudes, avgMagnitude, maxMagnitude };
}

/**
 * Helper 2: Compare two event signal profiles.
 *
 * Computes RMS difference and relative peak difference.
 */
export function compareEventSignalProfiles(
  ref: EventSignalProfile,
  test: EventSignalProfile
): {
  peakDifferenceRel: number;
  rmsDifference: number;
} {
  // Align by time (assume same length and time points for simplicity)
  if (ref.magnitudes.length === 0 || test.magnitudes.length === 0) {
    return {
      peakDifferenceRel: 1.0,
      rmsDifference: 1.0,
    };
  }

  const n = Math.min(ref.magnitudes.length, test.magnitudes.length);

  let sumSqDiff = 0;
  for (let i = 0; i < n; i++) {
    const diff = ref.magnitudes[i] - test.magnitudes[i];
    sumSqDiff += diff * diff;
  }

  const rmsDifference = Math.sqrt(sumSqDiff / n);

  const peakDifferenceRel =
    Math.abs(ref.maxMagnitude - test.maxMagnitude) /
    Math.max(ref.maxMagnitude, 0.01);

  return {
    peakDifferenceRel,
    rmsDifference,
  };
}

/**
 * Helper 3: Classify trajectories by CF + event magnitude.
 *
 * Uses CF signature + peak event magnitude as a simple classifier.
 */
export function getTrajectorySignature(states: TwoManifoldState[]): {
  cfCoefficients: number[];
  peakEventMagnitude: number;
  avgEventMagnitude: number;
} {
  const cf = extractCFSignature(states, 'velocity_ratio', 10);
  const events = extractEventSignalProfile(states);

  return {
    cfCoefficients: cf.coefficients,
    peakEventMagnitude: events.maxMagnitude,
    avgEventMagnitude: events.avgMagnitude,
  };
}

/**
 * Helper 4: Compute signature distance (for classification).
 */
export function signatureDistance(
  sig1: ReturnType<typeof getTrajectorySignature>,
  sig2: ReturnType<typeof getTrajectorySignature>
): number {
  // Weighted distance: CF difference + event magnitude difference
  const cfDepth = Math.min(sig1.cfCoefficients.length, sig2.cfCoefficients.length);

  let cfDist = 0;
  for (let i = 0; i < cfDepth; i++) {
    cfDist += Math.abs(sig1.cfCoefficients[i] - sig2.cfCoefficients[i]);
  }
  cfDist /= cfDepth;

  const eventDist =
    Math.abs(sig1.peakEventMagnitude - sig2.peakEventMagnitude) /
    Math.max(sig1.peakEventMagnitude, sig2.peakEventMagnitude, 0.01);

  // Combine: CF is primary (70%), events are secondary (30%)
  return 0.7 * (cfDist / 1000) + 0.3 * eventDist;
}

// ============================================================================
// Tests: Phase 5.2
// ============================================================================

describe('Phase 5.2: Antclock Stability (Event Invariance)', () => {
  /**
   * Test 1: Event signal determinism
   *
   * Same run twice should produce identical event signals.
   * (Tests that computation is deterministic.)
   */
  it('Test 1: event signal magnitude is deterministic', () => {
    const run1 = [];
    {
      let current = initializeCliff(32, 2.0);
      run1.push(current);
      for (let i = 0; i < 30; i++) {
        current = stepRK4(current, 0.01);
        run1.push(current);
      }
    }

    const run2 = [];
    {
      let current = initializeCliff(32, 2.0);
      run2.push(current);
      for (let i = 0; i < 30; i++) {
        current = stepRK4(current, 0.01);
        run2.push(current);
      }
    }

    const profile1 = extractEventSignalProfile(run1);
    const profile2 = extractEventSignalProfile(run2);

    // Should be identical
    expect(profile1.avgMagnitude).toBe(profile2.avgMagnitude);
    expect(profile1.maxMagnitude).toBe(profile2.maxMagnitude);
  });

  /**
   * Test 2: Small perturbation preserves event signal structure
   *
   * Add tiny noise to cliff initial condition.
   * Event signal should remain similar (peak magnitude stable).
   */
  it('Test 2: small perturbation preserves event signal structure', () => {
    // Reference: clean cliff
    const refStates = [];
    {
      let current = initializeCliff(32, 2.0);
      refStates.push(current);
      for (let i = 0; i < 30; i++) {
        current = stepRK4(current, 0.01);
        refStates.push(current);
      }
    }

    // Perturbed: cliff + noise
    const pertStates = [];
    {
      let current = initializeCliff(32, 2.0);
      current.interface.x_b += (Math.random() - 0.5) * 1e-3;
      current.interface.v_b += (Math.random() - 0.5) * 1e-3;

      pertStates.push(current);
      for (let i = 0; i < 30; i++) {
        current = stepRK4(current, 0.01);
        pertStates.push(current);
      }
    }

    const refProfile = extractEventSignalProfile(refStates);
    const pertProfile = extractEventSignalProfile(pertStates);

    const comparison = compareEventSignalProfiles(refProfile, pertProfile);

    // Peak magnitude should be similar (within 20% relative)
    expect(comparison.peakDifferenceRel).toBeLessThan(0.20);

    // RMS difference should be moderate
    expect(comparison.rmsDifference).toBeLessThan(0.5);
  });

  /**
   * Test 3: CF + Event signature discriminates classes
   *
   * Cliff and smooth should have different CF + event profiles.
   */
  it('Test 3: CF + event signatures discriminate trajectory classes', () => {
    // Cliff
    const cliffStates = [];
    {
      let current = initializeCliff(32, 2.0);
      cliffStates.push(current);
      for (let i = 0; i < 30; i++) {
        current = stepRK4(current, 0.01);
        cliffStates.push(current);
      }
    }

    // Smooth
    const smoothStates = [];
    {
      let current = initializeSmooth(32, 2.0);
      smoothStates.push(current);
      for (let i = 0; i < 30; i++) {
        current = stepRK4(current, 0.01);
        smoothStates.push(current);
      }
    }

    const cliffSig = getTrajectorySignature(cliffStates);
    const smoothSig = getTrajectorySignature(smoothStates);

    // CF first term should be different (captures velocity range)
    expect(cliffSig.cfCoefficients[0]).not.toBe(smoothSig.cfCoefficients[0]);

    // Event magnitudes should be different
    expect(cliffSig.peakEventMagnitude).not.toBe(smoothSig.peakEventMagnitude);

    // Distance should be measurable
    const dist = signatureDistance(cliffSig, smoothSig);
    expect(dist).toBeGreaterThan(0.01);
  });

  /**
   * Test 4: Same-class trajectories cluster in signature space
   *
   * Two perturbations of cliff should be closer than cliff vs smooth.
   */
  it('Test 4: same-class trajectories cluster in signature space', () => {
    // Cliff baseline
    const cliffBase = [];
    {
      let current = initializeCliff(32, 2.0);
      cliffBase.push(current);
      for (let i = 0; i < 30; i++) {
        current = stepRK4(current, 0.01);
        cliffBase.push(current);
      }
    }

    // Cliff perturbation 1
    const cliffPert1 = [];
    {
      let current = initializeCliff(32, 2.0);
      current.interface.x_b += (Math.random() - 0.5) * 1e-3;
      cliffPert1.push(current);
      for (let i = 0; i < 30; i++) {
        current = stepRK4(current, 0.01);
        cliffPert1.push(current);
      }
    }

    // Smooth baseline (different class)
    const smoothBase = [];
    {
      let current = initializeSmooth(32, 2.0);
      smoothBase.push(current);
      for (let i = 0; i < 30; i++) {
        current = stepRK4(current, 0.01);
        smoothBase.push(current);
      }
    }

    const sig1 = getTrajectorySignature(cliffBase);
    const sig2 = getTrajectorySignature(cliffPert1);
    const sig3 = getTrajectorySignature(smoothBase);

    const distWithinClass = signatureDistance(sig1, sig2);
    const distBetweenClass = signatureDistance(sig1, sig3);

    // Same class should be closer than different classes
    expect(distWithinClass).toBeLessThan(distBetweenClass);
  });
});
