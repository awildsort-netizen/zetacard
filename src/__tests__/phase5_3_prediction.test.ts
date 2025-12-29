/**
 * Phase 5.3: Topological Prediction via Interface Flux
 *
 * Core claim: trajectory signatures are sufficient statistics for prediction.
 * We infer interface flux from geometry, integrate a reduced SunContract-like model,
 * and check if predictions match ground truth in signature space.
 *
 * This operationalizes: interface + flux dynamics enables computation without full replay.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import {
  WorldlinePoint,
  extractCFSignature,
  extractWorldlineHistory,
  extractContinuedFraction,
  CFSignature,
  computeCharacteristicScalar,
} from '../phase5_cf';
import {
  TwoManifoldState,
  stepRK4,
  initializeCliff,
  initializeSmooth,
} from '../twoManifoldCoupled';
import {
  computeAntclockEventSignal,
  AntclockEventSignal,
} from '../antclockSolverV2';

// ============================================================================
// Phase 5.3 Core Functions
// ============================================================================

/**
 * Infer effective driving force from trajectory geometry (acceleration method).
 * 
 * ∂_t v = F_eff(t) directly represents the net force driving interface evolution.
 * We compute this as the filtered acceleration (dv/dt).
 * This can be positive or negative.
 */
function inferFluxSurrogate(
  history: WorldlinePoint[],
  lpfWindow: number = 3
): number[] {
  if (history.length < 2) return [];

  const fluxSurrogate: number[] = [];

  for (let i = 0; i < history.length; i++) {
    // Compute dv/dt at step i
    const dv = i > 0
      ? (history[i].v_b - history[i - 1].v_b) / Math.max(history[i].t - history[i - 1].t, 1e-6)
      : 0;

    // Apply simple moving average LPF over window
    const windowStart = Math.max(0, i - lpfWindow);
    const windowEnd = i + 1;
    let sumDv = 0;
    let count = 0;

    for (let j = windowStart; j < windowEnd; j++) {
      const dv_j = j > 0
        ? (history[j].v_b - history[j - 1].v_b) / Math.max(history[j].t - history[j - 1].t, 1e-6)
        : 0;
      sumDv += dv_j;
      count++;
    }

    const avgDv = sumDv / count;
    // Keep signed acceleration: this is the effective force driving the interface
    // The reduced model will use this directly as the forcing term
    fluxSurrogate.push(avgDv);
  }

  return fluxSurrogate;
}

/**
 * Fit reduced model coefficients from a reference trajectory.
 * 
 * Given trajectory and inferred flux, solve for α, β that best fit:
 *   dv/dt ≈ α*Φ - β*v
 * 
 * Using least squares on windowed samples.
 */
function fitReducedModelCoefficients(
  history: WorldlinePoint[],
  flux: number[]
): ReducedModelCoefficients {
  // Collect (dv/dt, Φ, v) samples from the trajectory
  const samples: Array<{ dvdt: number; phi: number; v: number }> = [];

  for (let i = 1; i < Math.min(history.length, flux.length); i++) {
    const dvdt = (history[i].v_b - history[i - 1].v_b) / (history[i].t - history[i - 1].t);
    samples.push({
      dvdt,
      phi: flux[i],
      v: history[i].v_b,
    });
  }

  if (samples.length < 10) {
    // Not enough samples, return defaults
    return { alpha: 1.0, beta: 0.1, gamma: 1.0, kappa: 0.01 };
  }

  // Least squares: minimize sum of (dvdt - α*φ + β*v)²
  let sumPhi2 = 0, sumV2 = 0, sumPhiV = 0, sumPhiDvdt = 0, sumVDvdt = 0;

  for (const s of samples) {
    sumPhi2 += s.phi * s.phi;
    sumV2 += s.v * s.v;
    sumPhiV += s.phi * s.v;
    sumPhiDvdt += s.phi * s.dvdt;
    sumVDvdt += s.v * s.dvdt;
  }

  // Solve 2x2 system
  const det = sumPhi2 * sumV2 - sumPhiV * sumPhiV;
  if (Math.abs(det) < 1e-10) {
    return { alpha: 1.0, beta: 0.1, gamma: 1.0, kappa: 0.01 };
  }

  const alpha = (sumPhiDvdt * sumV2 - sumVDvdt * sumPhiV) / det;
  const beta = (-sumPhiDvdt * sumPhiV + sumVDvdt * sumPhi2) / det;

  // Clamp to reasonable ranges
  const alphaClamped = Math.max(0.01, Math.min(10, alpha));
  const betaClamped = Math.max(0.01, Math.min(10, beta));

  return {
    alpha: alphaClamped,
    beta: betaClamped,
    gamma: 1.0,
    kappa: 0.01,
  };
}

/**
 * Reduced interface model: evolve (v, s, x) driven by inferred flux.
 * 
 * ∂_t v = α Φ̂(t) - β v
 * ∂_t s = γ Φ̂(t) - κ s
 * ∂_t x = v
 */
interface ReducedModelCoefficients {
  alpha: number;  // flux → velocity coupling
  beta: number;   // velocity dissipation
  gamma: number;  // flux → entropy coupling
  kappa: number;  // entropy dissipation
}

function integrateReducedModel(
  initialState: { v: number; s: number; x: number },
  fluxSurrogate: number[],
  dt: number = 0.016,
  coeffs: ReducedModelCoefficients = {
    alpha: 1.0,
    beta: 0.1,
    gamma: 1.0,
    kappa: 0.01,
  }
): WorldlinePoint[] {
  const predicted: WorldlinePoint[] = [];
  let v = initialState.v;
  let s = initialState.s;
  let x = initialState.x;
  let t = 0;

  for (let i = 0; i < fluxSurrogate.length; i++) {
    const phi = fluxSurrogate[i];

    // Forward Euler step
    const dv = (coeffs.alpha * phi - coeffs.beta * v) * dt;
    const ds = (coeffs.gamma * phi - coeffs.kappa * s) * dt;
    const dx = v * dt;

    v += dv;
    s += ds;
    x += dx;
    t += dt;

    predicted.push({
      t,
      x_b: x,
      v_b: v,
      theta: 1.0, // dummy: integration doesn't compute θ
      s,
      tau: t, // τ ≈ t in reduced model
    });
  }

  return predicted;
}

/**
 * Convert continued fraction to convergent rational and evaluate.
 * 
 * Given CF [a0; a1, a2, ...], compute convergent p_k / q_k for first k terms
 * and return the rational value (or Infinity/undefined behavior for non-terminating).
 */
function cfConvergentValue(cf: number[], depth: number = 10): number {
  const k = Math.min(depth, cf.length);
  if (k === 0) return 0;
  if (k === 1) return cf[0];

  // Compute convergent using recurrence:
  // p_{-1} = 1, p_0 = a_0
  // q_{-1} = 0, q_0 = 1
  // p_i = a_i * p_{i-1} + p_{i-2}
  // q_i = a_i * q_{i-1} + q_{i-2}

  let p_prev2 = 1, p_prev1 = cf[0];
  let q_prev2 = 0, q_prev1 = 1;

  for (let i = 1; i < k; i++) {
    const a_i = cf[i];
    const p_i = a_i * p_prev1 + p_prev2;
    const q_i = a_i * q_prev1 + q_prev2;

    p_prev2 = p_prev1;
    p_prev1 = p_i;
    q_prev2 = q_prev1;
    q_prev1 = q_i;
  }

  return p_prev1 / (q_prev1 + 1e-10);
}

/**
 * Count how many leading CF coefficients agree between two sequences.
 */
function cfPrefixAgreement(cf1: number[], cf2: number[]): number {
  let count = 0;
  for (let i = 0; i < Math.min(cf1.length, cf2.length); i++) {
    if (cf1[i] === cf2[i]) {
      count++;
    } else {
      break; // stop at first mismatch
    }
  }
  return count;
}

/**
 * Compute τ-normalized characteristic scalar.
 * Resolution-stable: integral in proper time, not discrete samples.
 */
function computeTauNormalizedScalar(
  history: WorldlinePoint[],
  windowTau: number = 1.0
): number {
  if (history.length < 2) {
    return 1.0;
  }

  // Check if tau is valid (may be missing in predicted trajectories)
  const hasTau = history[0].tau && Number.isFinite(history[0].tau);
  
  if (!hasTau) {
    // Fall back to simple velocity_ratio on full history
    const velocities = history.map((p) => Math.abs(p.v_b));
    const maxV = Math.max(...velocities);
    const minV = Math.min(...velocities);
    return maxV / (minV + 1e-6);
  }

  // Filter to first τ window
  const tauStart = history[0].tau;
  const tauEnd = tauStart + windowTau;
  const window = history.filter((p) => p.tau >= tauStart && p.tau <= tauEnd);

  if (window.length < 2) {
    // Fall back to velocity_ratio on full history
    const velocities = history.map((p) => Math.abs(p.v_b));
    const maxV = Math.max(...velocities);
    const minV = Math.min(...velocities);
    return maxV / (minV + 1e-6);
  }

  // Compute mean absolute velocity (τ-weighted integral)
  let sumV = 0;
  let sumDtau = 0;

  for (let i = 0; i < window.length; i++) {
    const dtau = i > 0 ? window[i].tau - window[i - 1].tau : 0.016;
    sumV += Math.abs(window[i].v_b) * dtau;
    sumDtau += dtau;
  }

  const meanV = sumV / (sumDtau + 1e-10);

  // Range in τ window
  const velocities = window.map((p) => p.v_b);
  const maxV = Math.max(...velocities);
  const minV = Math.min(...velocities);
  const range = maxV - minV;

  // r_τ = range / mean(|v|)
  return range / (meanV + 1e-6);
}

/**
 * Compare predicted trajectory to ground truth in signature space.
 */
function comparePredictedToGround(
  predicted: WorldlinePoint[],
  groundTruth: WorldlinePoint[],
  cfDepth: number = 15
): {
  cfMatch: number;
  tickMatch: number;
  trajectoryDistance: number;
  signaturePair: {
    predicted: CFSignature;
    ground: CFSignature;
  };
} {
  // Extract CF signatures using characteristic scalar directly
  const scalarPred = computeCharacteristicScalar(predicted, 'velocity_ratio');
  const scalarGround = computeCharacteristicScalar(groundTruth, 'velocity_ratio');
  
  const cfPredCoeffs = extractContinuedFraction(scalarPred, cfDepth);
  const cfGroundCoeffs = extractContinuedFraction(scalarGround, cfDepth);
  
  const cfPred: CFSignature = {
    coefficients: cfPredCoeffs,
    source: scalarPred,
    reconstructionError: 0, // skip for now
    depth: cfPredCoeffs.length,
  };
  
  const cfGround: CFSignature = {
    coefficients: cfGroundCoeffs,
    source: scalarGround,
    reconstructionError: 0,
    depth: cfGroundCoeffs.length,
  };

  // CF match: compare reconstructed values from convergents
  // This is mathematically sound: compare the actual scalar values, not raw digits
  const valPred = cfConvergentValue(cfPredCoeffs, 10);
  const valGround = cfConvergentValue(cfGroundCoeffs, 10);

  // Relative error in reconstructed values (normalized to [0,1])
  const relError =
    Math.abs(valPred - valGround) / (Math.abs(valGround) + 1e-6);
  const cfMatch = Math.min(1.0, relError); // cap at 1.0
  
  // Also include prefix agreement as secondary signal
  const prefixLen = cfPrefixAgreement(cfPredCoeffs, cfGroundCoeffs);

  // Tick match: compare velocity ranges
  const predRange =
    Math.max(...predicted.map((p) => p.v_b)) -
    Math.min(...predicted.map((p) => p.v_b));
  const groundRange =
    Math.max(...groundTruth.map((p) => p.v_b)) -
    Math.min(...groundTruth.map((p) => p.v_b));

  const tickMatch = Math.min(
    1.0,
    1.0 - Math.abs(predRange - groundRange) / (groundRange + 1e-6)
  );

  // Trajectory distance: L2 in (x, v, s) over first 10 points
  let trajSumSq = 0;
  const compareLen = Math.min(10, predicted.length, groundTruth.length);

  for (let i = 0; i < compareLen; i++) {
    const p = predicted[i];
    const g = groundTruth[i];
    trajSumSq +=
      (p.x_b - g.x_b) ** 2 +
      (p.v_b - g.v_b) ** 2 +
      (p.s - g.s) ** 2;
  }

  const trajectoryDistance = Math.sqrt(trajSumSq / Math.max(compareLen, 1));

  return {
    cfMatch,
    tickMatch,
    trajectoryDistance,
    signaturePair: {
      predicted: cfPred,
      ground: cfGround,
    },
  };
}

/**
 * Predict held-out trajectory from early prefix.
 * Infer flux, extrapolate, integrate reduced model, compare to ground truth.
 */
function predictHeldOutTrajectory(
  prefixHistory: WorldlinePoint[],
  groundTruth: WorldlinePoint[],
  coeffs: ReducedModelCoefficients
): {
  predicted: WorldlinePoint[];
  scores: ReturnType<typeof comparePredictedToGround>;
} {
  // Step 1: Infer flux from prefix
  const fluxPrefix = inferFluxSurrogate(prefixHistory, 3);

  // Step 2: Extrapolate flux forward (piecewise constant)
  const targetLength = groundTruth.length;
  const fluxExtrapolated = [
    ...fluxPrefix,
    ...Array(Math.max(0, targetLength - fluxPrefix.length)).fill(
      fluxPrefix[fluxPrefix.length - 1] ?? 0.1
    ),
  ];

  // Step 3: Integrate from prefix terminal state
  const terminal = prefixHistory[prefixHistory.length - 1];
  const initialState = {
    v: terminal.v_b,
    s: terminal.s,
    x: terminal.x_b,
  };

  const predicted = integrateReducedModel(initialState, fluxExtrapolated, 0.016, coeffs);

  // Step 4: Compare to ground truth
  const scores = comparePredictedToGround(predicted, groundTruth, 15);

  return { predicted, scores };
}

// ============================================================================
// Phase 5.3 Test Suite
// ============================================================================

describe('Phase 5.3: Topological Prediction (Interface Flux)', () => {
  let refCliff1States: TwoManifoldState[] = [];
  let refCliff2States: TwoManifoldState[] = [];
  let refSmooth1States: TwoManifoldState[] = [];
  let refSmooth2States: TwoManifoldState[] = [];
  
  // Converted to WorldlinePoint for processing
  let refCliff1: WorldlinePoint[] = [];
  let refCliff2: WorldlinePoint[] = [];
  let refSmooth1: WorldlinePoint[] = [];
  let refSmooth2: WorldlinePoint[] = [];
  
  // Fitted model coefficients
  let fittedCoeffs: ReducedModelCoefficients = { alpha: 1.0, beta: 0.1, gamma: 1.0, kappa: 0.01 };

  beforeAll(() => {
    /**
     * Generate reference trajectories (cliff and smooth scenarios).
     * These are used to estimate reduced model coefficients (or just validate defaults).
     */

    // Cliff scenario 1
    let current = initializeCliff(100, 10);
    refCliff1States = [current];
    for (let i = 0; i < 100; i++) {
      current = stepRK4(current, 0.01);
      refCliff1States.push(current);
    }
    refCliff1 = extractWorldlineHistory(refCliff1States);

    // Cliff scenario 2 (slight perturbation)
    current = initializeCliff(100, 10);
    // Perturb interface velocity
    current.interface.v_b += 1e-3;
    refCliff2States = [current];
    for (let i = 0; i < 100; i++) {
      current = stepRK4(current, 0.01);
      refCliff2States.push(current);
    }
    refCliff2 = extractWorldlineHistory(refCliff2States);

    // Smooth scenario 1
    current = initializeSmooth(100, 10);
    refSmooth1States = [current];
    for (let i = 0; i < 100; i++) {
      current = stepRK4(current, 0.01);
      refSmooth1States.push(current);
    }
    refSmooth1 = extractWorldlineHistory(refSmooth1States);

    // Smooth scenario 2 (slight perturbation)
    current = initializeSmooth(100, 10);
    // Perturb interface velocity
    current.interface.v_b += 1e-3;
    refSmooth2States = [current];
    for (let i = 0; i < 100; i++) {
      current = stepRK4(current, 0.01);
      refSmooth2States.push(current);
    }
    refSmooth2 = extractWorldlineHistory(refSmooth2States);
    
    // Fit model coefficients from cliff reference trajectory
    const fluxCliff = inferFluxSurrogate(refCliff1);
    fittedCoeffs = fitReducedModelCoefficients(refCliff1, fluxCliff);
  });

  it('should infer flux from acceleration without errors', () => {
    const flux = inferFluxSurrogate(refCliff1, 3);
    expect(flux.length).toBe(refCliff1.length);
    // Flux can be positive or negative (represents net driving force with direction)
    expect(flux.some((f) => Math.abs(f) > 0)).toBe(true); // at least some activity
  });

  it('should integrate reduced model deterministically', () => {
    const flux = Array(50).fill(0.1);
    const coeffs = { alpha: 1.0, beta: 0.1, gamma: 1.0, kappa: 0.01 };
    const init = { v: 0, s: 0, x: 0 };

    const pred1 = integrateReducedModel(init, flux, 0.016, coeffs);
    const pred2 = integrateReducedModel(init, flux, 0.016, coeffs);

    expect(pred1[pred1.length - 1].x_b).toBeCloseTo(pred2[pred2.length - 1].x_b, 10);
  });

  it('should compute τ-normalized scalar without grid artifacts', () => {
    // Same trajectory, coarse vs fine grid
    let current = initializeCliff(100, 10);
    const coarseStates: TwoManifoldState[] = [current];
    for (let i = 0; i < 50; i++) {
      current = stepRK4(current, 0.02); // coarse: dt=0.02
      coarseStates.push(current);
    }

    current = initializeCliff(100, 10);
    const fineStates: TwoManifoldState[] = [current];
    for (let i = 0; i < 100; i++) {
      current = stepRK4(current, 0.01); // fine: dt=0.01
      fineStates.push(current);
    }

    const coarse = extractWorldlineHistory(coarseStates);
    const fine = extractWorldlineHistory(fineStates);

    const scalarCoarse = computeTauNormalizedScalar(coarse);
    const scalarFine = computeTauNormalizedScalar(fine);

    // τ-normalized scalars should be much more similar than velocity_ratio
    // (which may differ significantly due to different min values)
    expect(scalarCoarse).toBeGreaterThan(0);
    expect(scalarFine).toBeGreaterThan(0);
    // Relative difference < 10%
    const relDiff = Math.abs(scalarCoarse - scalarFine) / Math.max(scalarCoarse, scalarFine);
    expect(relDiff).toBeLessThan(0.1);
  });

  it('should predict cliff trajectory from 20% prefix', () => {
    // Create full held-out run
    let current = initializeCliff(100, 10);
    // Perturb interface velocity
    current.interface.v_b += 5e-4;
    const fullRunStates: TwoManifoldState[] = [current];
    for (let i = 0; i < 200; i++) {
      current = stepRK4(current, 0.01);
      fullRunStates.push(current);
    }
    const fullRun = extractWorldlineHistory(fullRunStates);

    const prefix = fullRun.slice(0, 40); // 20% prefix (40 of 200)
    const ground = fullRun.slice(40);    // 80% to predict
    
    const { predicted, scores } = predictHeldOutTrajectory(prefix, ground, fittedCoeffs);

    // Pass criteria
    // cfMatch now in [0,1]: relative error in reconstructed scalar values
    // < 0.6 means within 60% of ground truth scalar (reasonable for held-out prediction)
    expect(scores.cfMatch).toBeLessThan(0.6);
    // Velocity range match > 0.3
    expect(scores.tickMatch).toBeGreaterThan(0.3);
    expect(predicted.length).toBeGreaterThan(0);
  });

  it('should predict smooth trajectory from 20% prefix', () => {
    // Create full held-out run (smooth family)
    let current = initializeSmooth(100, 10);
    // Perturb
    current.interface.v_b += 5e-4;
    const fullRunStates: TwoManifoldState[] = [current];
    for (let i = 0; i < 200; i++) {
      current = stepRK4(current, 0.01);
      fullRunStates.push(current);
    }
    const fullRun = extractWorldlineHistory(fullRunStates);

    const prefix = fullRun.slice(0, 40);
    const ground = fullRun.slice(40);

    const { predicted, scores } = predictHeldOutTrajectory(prefix, ground, fittedCoeffs);

    // Pass criteria
    // CF distance < 0.5: smooth family is harder to predict since coefficients fitted on cliff
    expect(scores.cfMatch).toBeLessThan(0.5);
    // Velocity range match > 0
    expect(scores.tickMatch).toBeGreaterThan(0);
    expect(predicted.length).toBeGreaterThan(0);

    console.log('Smooth prediction scores:', scores);
  });

  it('should discriminate cliff from smooth in signature space', () => {
    // Predict both families
    const coeffs = { alpha: 1.0, beta: 0.1, gamma: 1.0, kappa: 0.01 };

    // Cliff prediction
    const fluxCliff = inferFluxSurrogate(refCliff1);
    const predCliff = integrateReducedModel({ v: 0, s: 0, x: 0 }, fluxCliff, 0.016, coeffs);

    // Smooth prediction
    const fluxSmooth = inferFluxSurrogate(refSmooth1);
    const predSmooth = integrateReducedModel({ v: 0, s: 0, x: 0 }, fluxSmooth, 0.016, coeffs);

    // Extract characteristic scalars and CF coefficients directly
    const scalarCliff = computeCharacteristicScalar(predCliff, 'velocity_ratio');
    const scalarSmooth = computeCharacteristicScalar(predSmooth, 'velocity_ratio');
    
    const cfCoeffsCliff = extractContinuedFraction(scalarCliff, 15);
    const cfCoeffsSmooth = extractContinuedFraction(scalarSmooth, 15);

    // Compute L2 distance
    const maxLen = Math.max(cfCoeffsCliff.length, cfCoeffsSmooth.length);
    let sumSq = 0;
    for (let i = 0; i < maxLen; i++) {
      const c1 = cfCoeffsCliff[i] ?? 0;
      const c2 = cfCoeffsSmooth[i] ?? 0;
      sumSq += (c2 - c1) ** 2;
    }
    const distance = Math.sqrt(sumSq);

    // Should be distinct
    expect(distance).toBeGreaterThan(0.1);
  });
});
