/**
 * Phase 6 Integration: Connect Galois Theory to Your Existing CF Workflow
 * 
 * This module shows how to:
 * 1. Extract CF signature from trajectory (existing Phase 5.1 code)
 * 2. Identify which algebraic constant the trajectory might match
 * 3. Verify the match against Galois group predictions
 * 4. Use the result for trajectory classification and prediction
 */

import { TwoManifoldState } from './twoManifoldCoupled';
import {
  extractWorldlineHistory,
  computeCharacteristicScalar,
  extractContinuedFraction,
  CFSignature,
} from './phase5_cf';
import {
  createGaloisCFAnalyzer,
  ALGEBRAIC_GALOIS_DATA,
  GaloisCFAnalyzer,
} from './galoisCFInvariants';

// ============================================================================
// Phase 6 Integration: Complete Workflow
// ============================================================================

/**
 * Enhanced trajectory signature that includes Galois-based classification.
 */
export interface EnhancedTrajectorySignature {
  // Existing Phase 5 data
  cfSignature: CFSignature;
  characteristicScalar: number;

  // Phase 6 additions: Galois classification
  matchedAlgebraicConstant: string | null; // 'phi', 'sqrt2', 'plastic', etc.
  galoisMatchScore: number; // 0-1, how well does the CF match known algebraic constant?
  galoisGroupPrediction: string; // e.g., 'C_2', 'S_3'
  approximationDifficulty: 'easy' | 'moderate' | 'hard' | 'very-hard';
  isTheoryConsistent: boolean; // does observed CF match Galois predictions?

  // Trajectory classification info
  trajectoryClass: string; // e.g., "φ-like periodic", "√2-like convergent", "chaotic-like"
  confidenceLevel: number; // how confident in this classification?
}

/**
 * Main entry point: analyze a trajectory using both CF and Galois theory.
 *
 * @param states Sequence of simulation states from trajectory
 * @param analyzer Optional pre-created GaloisCFAnalyzer instance
 * @returns Enhanced signature with Galois classification
 */
export function analyzeTrajectoryWithGaloisTheory(
  states: TwoManifoldState[],
  analyzer?: GaloisCFAnalyzer
): EnhancedTrajectorySignature {
  // Use provided analyzer or create new one
  const gca = analyzer || createGaloisCFAnalyzer();

  // Phase 5 extraction (existing code)
  const history = extractWorldlineHistory(states);
  const scalar = computeCharacteristicScalar(history, 'velocity_ratio');
  const cfCoeffs = extractContinuedFraction(scalar, 15);
  const cfSignature: CFSignature = {
    coefficients: cfCoeffs,
    source: scalar,
    reconstructionError: 0, // would be computed by phase5_cf.ts
    depth: cfCoeffs.length,
  };

  // Phase 6 addition: Try to match against known algebraic constants
  const availableConstants = gca.listAvailableConstants();
  let bestMatch: string | null = null;
  let bestScore = 0;

  for (const constantName of availableConstants) {
    const analysis = gca.analyzeComplete(constantName, cfCoeffs);

    if ('error' in analysis) {
      continue;
    }

    // Score based on alignment
    const score = analysis.summary.alignmentScore;
    if (score > bestScore) {
      bestScore = score;
      bestMatch = constantName;
    }
  }

  // Get details for best match
  let galoisAnalysis: ReturnType<typeof gca.analyzeComplete> | null = null;
  if (bestMatch) {
    const result = gca.analyzeComplete(bestMatch, cfCoeffs);
    if (!('error' in result)) {
      galoisAnalysis = result;
    }
  }

  // Construct enhanced signature
  const enhanced: EnhancedTrajectorySignature = {
    cfSignature,
    characteristicScalar: scalar,
    matchedAlgebraicConstant: bestMatch,
    galoisMatchScore: bestScore,
    galoisGroupPrediction: galoisAnalysis?.galoisGroup || 'unknown',
    approximationDifficulty: galoisAnalysis?.hardness.difficulty || 'moderate',
    isTheoryConsistent: galoisAnalysis?.summary.theoryMatch || false,
    trajectoryClass: classifyTrajectory(bestMatch, bestScore, cfCoeffs),
    confidenceLevel: computeConfidence(bestMatch, bestScore, galoisAnalysis),
  };

  return enhanced;
}

/**
 * Classify trajectory based on matched algebraic constant.
 * 
 * Returns a human-readable description of the trajectory's behavior.
 */
function classifyTrajectory(
  constant: string | null,
  score: number,
  cfCoeffs: number[]
): string {
  if (!constant || score < 0.3) {
    return 'unclassified or chaotic-like';
  }

  if (constant === 'phi') {
    return 'φ-periodic: slowest convergence, golden ratio dynamics';
  } else if (constant === 'sqrt2') {
    return '√2-convergent: rapid reduction, binary symmetry';
  } else if (constant === 'sqrt3') {
    return '√3-convergent: moderate reduction, ternary pattern';
  } else if (constant === 'plastic') {
    return 'plastic-like: cubic algebraic, solvable but irreducible';
  } else if (constant === 'tribonacci') {
    return 'tribonacci-like: cubic growth, third-order reduction';
  } else {
    return `${constant}-like behavior`;
  }
}

/**
 * Compute confidence level for the classification.
 */
function computeConfidence(
  constant: string | null,
  score: number,
  analysis: ReturnType<typeof createGaloisCFAnalyzer.analyzeComplete> | null
): number {
  if (!constant) {
    return 0;
  }

  let confidence = score * 0.6; // alignment is 60% of confidence

  if (analysis && !('error' in analysis)) {
    // Add 40% from consistency with theory
    if (analysis.summary.confidence === 'high') {
      confidence += 0.3;
    } else if (analysis.summary.confidence === 'moderate') {
      confidence += 0.15;
    }

    // Small boost for exact period match
    if (analysis.verification.predictedVsObserved.predictedPeriodic === 
        analysis.verification.predictedVsObserved.observedPeriodic) {
      confidence += 0.1;
    }
  }

  return Math.min(1, confidence);
}

// ============================================================================
// Phase 6 Utilities: Additional Analysis Tools
// ============================================================================

/**
 * Compare two trajectory signatures using Galois classification.
 * 
 * Returns how similar they are based on:
 * - CF signature matching (existing)
 * - Matched algebraic constant (new)
 * - Galois group similarity (new)
 */
export function compareTrajectoriesWithGaloisClasses(
  sig1: EnhancedTrajectorySignature,
  sig2: EnhancedTrajectorySignature
): {
  similarityScore: number; // 0-1
  reasoning: string;
  sameAlgebraicClass: boolean;
  sameDifficulty: boolean;
} {
  let similarityScore = 0;
  const reasons: string[] = [];

  // Check algebraic constant match
  if (sig1.matchedAlgebraicConstant === sig2.matchedAlgebraicConstant) {
    similarityScore += 0.5;
    reasons.push(`Both match ${sig1.matchedAlgebraicConstant}`);
  } else if (sig1.matchedAlgebraicConstant && sig2.matchedAlgebraicConstant) {
    // Partial credit if same Galois group
    const data1 = ALGEBRAIC_GALOIS_DATA[sig1.matchedAlgebraicConstant];
    const data2 = ALGEBRAIC_GALOIS_DATA[sig2.matchedAlgebraicConstant];
    if (data1?.galoisGroupSymbol === data2?.galoisGroupSymbol) {
      similarityScore += 0.25;
      reasons.push(`Same Galois group: ${data1.galoisGroupSymbol}`);
    }
  }

  // Check difficulty
  if (sig1.approximationDifficulty === sig2.approximationDifficulty) {
    similarityScore += 0.3;
    reasons.push(`Same difficulty level: ${sig1.approximationDifficulty}`);
  }

  // Check theory consistency
  if (sig1.isTheoryConsistent === sig2.isTheoryConsistent) {
    similarityScore += 0.2;
  }

  return {
    similarityScore: Math.min(1, similarityScore),
    reasoning: reasons.join('; '),
    sameAlgebraicClass: sig1.matchedAlgebraicConstant === sig2.matchedAlgebraicConstant,
    sameDifficulty: sig1.approximationDifficulty === sig2.approximationDifficulty,
  };
}

/**
 * Predict approximation performance based on matched algebraic constant.
 * 
 * Returns expected error bounds and convergence rate.
 */
export function predictApproximationPerformance(
  signature: EnhancedTrajectorySignature
): {
  expectedDiophantineExponent: number;
  lyapunovExponent: number | null;
  estimatedConvergenceDepth: number;
  hardnessDescription: string;
} {
  if (!signature.matchedAlgebraicConstant) {
    return {
      expectedDiophantineExponent: 2, // generic worst case
      lyapunovExponent: null,
      estimatedConvergenceDepth: 50,
      hardnessDescription: 'Unknown — assume worst case',
    };
  }

  const algebraicData = ALGEBRAIC_GALOIS_DATA[signature.matchedAlgebraicConstant];
  if (!algebraicData) {
    return {
      expectedDiophantineExponent: 2,
      lyapunovExponent: null,
      estimatedConvergenceDepth: 50,
      hardnessDescription: 'Unknown algebraic constant',
    };
  }

  const analyzer = createGaloisCFAnalyzer();
  const hardness = analyzer.estimateApproximationHardness(algebraicData);

  // Description based on difficulty
  const descriptions: Record<string, string> = {
    'very-hard': 'Extremely hard to approximate — expect slow convergence (φ regime)',
    'hard': 'Hard to approximate — standard quadratic irrational convergence',
    'moderate': 'Moderate difficulty — cubic algebraic constant',
    'easy': 'Relatively easy — higher degree polynomial',
  };

  return {
    expectedDiophantineExponent: hardness.diophantineExponent,
    lyapunovExponent: hardness.lyapunovExponent,
    estimatedConvergenceDepth: hardness.expectedConvergenceCFDepth,
    hardnessDescription: descriptions[hardness.difficulty] || 'Unknown difficulty',
  };
}

// ============================================================================
// Phase 6 Export Interface
// ============================================================================

/**
 * Complete Phase 6 API for Galois-CF integration.
 */
export const Phase6GaloisIntegration = {
  /** Analyze single trajectory with Galois classification */
  analyzeTrajectory: analyzeTrajectoryWithGaloisTheory,

  /** Compare two trajectories using Galois classes */
  compareTrajectories: compareTrajectoriesWithGaloisClasses,

  /** Predict approximation performance from algebraic class */
  predictApproximationPerformance,

  /** Create analyzer instance for batch analysis */
  createAnalyzer: createGaloisCFAnalyzer,

  /** List all available algebraic constants in the system */
  listAlgebraicConstants: () => Object.keys(ALGEBRAIC_GALOIS_DATA),

  /** Get Galois data for a specific constant */
  getGaloisData: (name: string) => ALGEBRAIC_GALOIS_DATA[name],
};
