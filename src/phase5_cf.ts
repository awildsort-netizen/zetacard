/**
 * Phase 5.1: Continued Fraction (CF) Extraction from Worldline Histories
 *
 * Extracts topological invariants (CF signatures) from interface worldlines,
 * enabling trajectory classification and prediction.
 *
 * Key insight: A worldline x_b(t) with its velocity v_b(t) can be reduced to
 * a dimensionless quantity whose continued fraction expansion captures the
 * trajectory's topological essence.
 */

import { TwoManifoldState } from './twoManifoldCoupled';

/**
 * Worldline snapshot extracted from simulation state.
 * Captures position, velocity, and acceleration at a point in time.
 */
export interface WorldlinePoint {
  t: number;
  x_b: number;
  v_b: number;
  theta: number;    // expansion scalar
  s: number;        // entropy
  tau: number;      // proper time
}

/**
 * CF signature metadata for a trajectory.
 */
export interface CFSignature {
  /** Continued fraction coefficients [a₀, a₁, a₂, ...] */
  coefficients: number[];
  /** Characteristic scalar from which CF was extracted */
  source: number;
  /** Quality metric (how well CF reconstructs source) */
  reconstructionError: number;
  /** Number of terms computed */
  depth: number;
}

// ============================================================================
// Phase 5.1.1: Extract Worldline History from States
// ============================================================================

/**
 * Extract worldline history from a sequence of simulation states.
 *
 * @param states Array of TwoManifoldState snapshots
 * @returns Ordered array of worldline points
 */
export function extractWorldlineHistory(
  states: TwoManifoldState[]
): WorldlinePoint[] {
  return states.map((state) => ({
    t: state.t,
    x_b: state.interface.x_b,
    v_b: state.interface.v_b,
    theta: state.interface.theta,
    s: state.interface.s,
    tau: state.interface.tau,
  }));
}

// ============================================================================
// Phase 5.1.2: Reduce Worldline to Characteristic Scalar
// ============================================================================

/**
 * Compute characteristic scalar from worldline history.
 *
 * Three strategies, each capturing different topological aspects:
 *
 * 1. "velocity_ratio": max(v_b) / (min(v_b) + ε)
 *    → Captures expansion/contraction dynamics
 *
 * 2. "displacement_time_ratio": total_displacement / total_time
 *    → Captures overall drift vs. local oscillation
 *
 * 3. "entropy_velocity_ratio": final_s / mean(|v_b|)
 *    → Captures coupling between thermodynamics and motion
 *
 * For Phase 5.1, we use strategy 1 (velocity_ratio) as the primary signature.
 * This is sensitive to the trajectory's extremal structure.
 */
export function computeCharacteristicScalar(
  history: WorldlinePoint[],
  strategy: 'velocity_ratio' | 'displacement_time_ratio' | 'entropy_velocity_ratio' = 'velocity_ratio'
): number {
  if (history.length < 2) return 1.0;

  switch (strategy) {
    case 'velocity_ratio': {
      // Max / (min + eps) captures range of velocity magnitudes
      const velocities = history.map((p) => Math.abs(p.v_b));
      const maxV = Math.max(...velocities);
      const minV = Math.min(...velocities);
      const eps = 1e-6;
      return maxV / (minV + eps);
    }

    case 'displacement_time_ratio': {
      // Total displacement / elapsed time
      const totalDisplacement = Math.abs(
        history[history.length - 1].x_b - history[0].x_b
      );
      const totalTime = history[history.length - 1].t - history[0].t;
      if (totalTime < 1e-10) return 1.0;
      return totalDisplacement / totalTime;
    }

    case 'entropy_velocity_ratio': {
      // Final entropy / mean velocity
      const meanVelocity =
        history.reduce((sum, p) => sum + Math.abs(p.v_b), 0) / history.length;
      const finalS = history[history.length - 1].s;
      if (meanVelocity < 1e-6) return finalS > 0 ? 10.0 : 1.0;
      return finalS / meanVelocity;
    }
  }
}

// ============================================================================
// Phase 5.1.3: Continued Fraction Extraction
// ============================================================================

/**
 * Extract continued fraction [a₀, a₁, a₂, ...] from a positive scalar.
 *
 * Standard algorithm:
 *   a₀ = floor(x)
 *   x₁ = 1 / (x - a₀)
 *   a₁ = floor(x₁)
 *   ...repeat
 *
 * Stops when:
 * - Remainder is very small (< 1e-10)
 * - Max depth reached
 * - Coefficient becomes too large (> 1e6, suggests numerical noise)
 *
 * @param scalar The number to expand
 * @param maxDepth Maximum number of CF terms to compute
 * @returns CF coefficients array
 */
export function extractContinuedFraction(
  scalar: number,
  maxDepth: number = 15
): number[] {
  const coefficients: number[] = [];
  let x = Math.abs(scalar);

  if (x < 1e-10) {
    coefficients.push(0);
    return coefficients;
  }

  for (let i = 0; i < maxDepth; i++) {
    const a_i = Math.floor(x);

    // Sanity check: very large coefficient suggests numerical breakdown
    if (a_i > 1e6) {
      break;
    }

    coefficients.push(a_i);

    // Compute remainder
    const remainder = x - a_i;

    // Convergence check: if remainder is negligible, stop
    if (Math.abs(remainder) < 1e-10) {
      break;
    }

    // Prepare for next iteration: x ← 1 / (x - a_i)
    x = 1.0 / remainder;
  }

  return coefficients;
}

/**
 * Reconstruct a rational approximation from CF coefficients.
 *
 * Uses convergents: p_n / q_n computed recursively from [a₀, a₁, ...]
 *
 * @param coefficients CF coefficient array
 * @returns Best rational approximation (as decimal)
 */
export function reconstructFromCF(coefficients: number[]): number {
  if (coefficients.length === 0) return 0;

  let p_prev = 1, p_curr = coefficients[0];
  let q_prev = 0, q_curr = 1;

  for (let i = 1; i < coefficients.length; i++) {
    const a_i = coefficients[i];
    const p_next = a_i * p_curr + p_prev;
    const q_next = a_i * q_curr + q_prev;

    p_prev = p_curr;
    p_curr = p_next;
    q_prev = q_curr;
    q_curr = q_next;
  }

  return p_curr / q_curr;
}

/**
 * Compute reconstruction error: |original - reconstructed|
 *
 * @param original The original scalar
 * @param reconstruction The reconstructed value from CF
 * @returns L∞ error
 */
export function cfReconstructionError(
  original: number,
  reconstruction: number
): number {
  if (original === 0) return Math.abs(reconstruction);
  return Math.abs((original - reconstruction) / original);
}

// ============================================================================
// Phase 5.1.4: Full CF Signature Extraction
// ============================================================================

/**
 * Extract complete CF signature from worldline history.
 *
 * This is the core Phase 5.1 computation:
 *   1. Extract history from states
 *   2. Reduce to characteristic scalar
 *   3. Compute CF expansion
 *   4. Reconstruct and measure error
 *   5. Return metadata
 *
 * @param states Simulation states
 * @param strategy Which characteristic scalar to use
 * @param cfDepth Maximum CF terms
 * @returns CF signature with metadata
 */
export function extractCFSignature(
  states: TwoManifoldState[],
  strategy: 'velocity_ratio' | 'displacement_time_ratio' | 'entropy_velocity_ratio' = 'velocity_ratio',
  cfDepth: number = 15
): CFSignature {
  // Step 1: Extract worldline history
  const history = extractWorldlineHistory(states);

  // Step 2: Reduce to characteristic scalar
  const source = computeCharacteristicScalar(history, strategy);

  // Step 3: Extract CF coefficients
  const coefficients = extractContinuedFraction(source, cfDepth);

  // Step 4: Reconstruct and measure error
  const reconstruction = reconstructFromCF(coefficients);
  const error = cfReconstructionError(source, reconstruction);

  return {
    coefficients,
    source,
    reconstructionError: error,
    depth: coefficients.length,
  };
}

// ============================================================================
// Phase 5.1.5: Worldline Distance (Topological Metric)
// ============================================================================

/**
 * Compute worldline L² distance allowing time shift.
 *
 * Two worldlines can be "topologically equivalent" even if they occur at
 * different times. This metric allows a small time shift to find better alignment.
 *
 * Distance = min over time shifts τ ∈ [-maxShift, +maxShift] of:
 *   L² norm of (v_b^(1)(t+τ) - v_b^(2)(t))
 *
 * @param hist1 First worldline history
 * @param hist2 Second worldline history
 * @param maxShift Maximum time shift to test (in units of simulation time)
 * @param numShifts Number of shift values to test
 * @returns Optimal L² distance
 */
export function worldlineDistance(
  hist1: WorldlinePoint[],
  hist2: WorldlinePoint[],
  maxShift: number = 0.1,
  numShifts: number = 21
): number {
  if (hist1.length < 2 || hist2.length < 2) return Infinity;

  // Normalize both histories to [0, 1] in time for comparison
  const T1 = hist1[hist1.length - 1].t - hist1[0].t;
  const T2 = hist2[hist2.length - 1].t - hist2[0].t;

  if (T1 < 1e-10 || T2 < 1e-10) return Infinity;

  // Test a range of time shifts
  let minDistance = Infinity;

  for (let shiftIdx = 0; shiftIdx < numShifts; shiftIdx++) {
    const shift = -maxShift + (2 * maxShift * shiftIdx) / (numShifts - 1);

    // Compute L² velocity distance with this shift
    let distSquared = 0;
    let count = 0;

    for (const p1 of hist1) {
      // Find corresponding time in hist2 (with shift applied)
      const t2_target = p1.t + shift;

      // Linear interpolation in hist2 at t2_target
      let v2_interp = 0;
      let found = false;

      for (let i = 0; i < hist2.length - 1; i++) {
        const t2_i = hist2[i].t;
        const t2_next = hist2[i + 1].t;

        if (t2_i <= t2_target && t2_target <= t2_next) {
          // Interpolate
          const frac = (t2_target - t2_i) / (t2_next - t2_i);
          v2_interp =
            (1 - frac) * hist2[i].v_b + frac * hist2[i + 1].v_b;
          found = true;
          break;
        }
      }

      if (found) {
        const dv = p1.v_b - v2_interp;
        distSquared += dv * dv;
        count++;
      }
    }

    if (count > 0) {
      const distance = Math.sqrt(distSquared / count);
      minDistance = Math.min(minDistance, distance);
    }
  }

  return minDistance;
}

/**
 * Compute CF signature overlap: how many leading coefficients agree?
 *
 * Returns: length of longest common prefix of CF coefficients.
 * This measures how "topologically close" two trajectories are.
 *
 * @param cf1 First CF signature
 * @param cf2 Second CF signature
 * @returns Number of matching leading terms
 */
export function cfSignatureOverlap(cf1: CFSignature, cf2: CFSignature): number {
  let overlap = 0;
  const maxLen = Math.min(cf1.coefficients.length, cf2.coefficients.length);

  for (let i = 0; i < maxLen; i++) {
    if (cf1.coefficients[i] === cf2.coefficients[i]) {
      overlap++;
    } else {
      break;
    }
  }

  return overlap;
}

// ============================================================================
// Phase 5.1.6: Trajectory Classification (Proof of Concept)
// ============================================================================

/**
 * Classify a trajectory by finding its nearest reference.
 *
 * This is a simple nearest-neighbor classifier in CF signature space.
 * Phase 5.2+ will expand this to prediction and homotopy classification.
 *
 * @param unknownCF The CF signature of the unknown trajectory
 * @param references Map of reference name -> CF signature
 * @returns Classification result with confidence
 */
export function classifyTrajectory(
  unknownCF: CFSignature,
  references: Map<string, CFSignature>
): {
  nearestRef: string | null;
  distance: number;
  overlap: number;
  confidence: number;
} {
  let nearestRef: string | null = null;
  let minDistance = Infinity;
  let maxOverlap = -1;

  for (const [name, refCF] of references) {
    // Use overlap as primary metric, distance as tiebreaker
    const overlap = cfSignatureOverlap(unknownCF, refCF);

    // Distance in CF space: L² norm of coefficient differences
    let cfDistance = 0;
    const maxLen = Math.max(
      unknownCF.coefficients.length,
      refCF.coefficients.length
    );
    for (let i = 0; i < maxLen; i++) {
      const a1 = i < unknownCF.coefficients.length ? unknownCF.coefficients[i] : 0;
      const a2 = i < refCF.coefficients.length ? refCF.coefficients[i] : 0;
      cfDistance += (a1 - a2) * (a1 - a2);
    }
    cfDistance = Math.sqrt(cfDistance);

    // Prefer longer overlap; use distance as tiebreaker
    if (overlap > maxOverlap || (overlap === maxOverlap && cfDistance < minDistance)) {
      nearestRef = name;
      maxOverlap = overlap;
      minDistance = cfDistance;
    }
  }

  // Confidence: how many leading terms matched
  const confidence =
    maxOverlap > 0 ? maxOverlap / Math.max(unknownCF.depth, 3) : 0;

  return {
    nearestRef,
    distance: minDistance,
    overlap: maxOverlap,
    confidence: Math.min(1, confidence),
  };
}
