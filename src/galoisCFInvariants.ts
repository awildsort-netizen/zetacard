/**
 * PHASE 6: Galois Group Invariants for Continued Fraction Theory
 * 
 * Core Hypothesis:
 * ================
 * Continued fraction signatures encode Galois group structure.
 * 
 * Mapping:
 * - Periodic CF ↔ Cyclic Galois group (quadratic irrationals)
 * - Eventually periodic CF ↔ Solvable extensions
 * - Non-periodic CF ↔ Unsolvable/transcendental
 * 
 * Implementation Goal:
 * ====================
 * For algebraic constants in your system (φ, √2, etc.):
 * 1. Compute predicted CF periodicity from Galois structure
 * 2. Verify against actual CF extraction
 * 3. Predict approximation hardness from period length
 * 4. Use as invariant for trajectory classification
 */

// ============================================================================
// Part 1: Galois Invariants for Common Algebraic Numbers
// ============================================================================

/**
 * Minimal polynomial and Galois group data for algebraic numbers.
 * 
 * For a number α with minimal polynomial p(x) over ℚ, we store:
 * - The polynomial itself
 * - Its Galois group (as a symbol/string for common cases)
 * - The degree [ℚ(α):ℚ]
 * - Key structural properties
 */
export interface AlgebraicNumberGaloisData {
  /** Common name (e.g., "golden ratio") */
  name: string;
  
  /** Minimal polynomial coefficients [a₀, a₁, ..., aₙ] where p(x) = aₙxⁿ + ... + a₀ */
  minimalPolynomial: number[];
  
  /** Field degree [ℚ(α):ℚ] = degree of minimal polynomial */
  fieldDegree: number;
  
  /** Galois group identifier (C_n = cyclic, D_n = dihedral, A_n = alternating, etc.) */
  galoisGroupSymbol: string;
  
  /** Order of Galois group (should equal fieldDegree for simple extensions) */
  galoisGroupOrder: number;
  
  /** Is the Galois group solvable? (determines if polynomial is solvable by radicals) */
  isSolvable: boolean;
  
  /** Actual numeric value of the root */
  numericValue: number;
  
  /** For quadratic irrationals: expected CF period */
  cfPeriodLength?: number;
  
  /** For quadratic irrationals: the periodic part of the CF */
  cfPeriod?: number[];
  
  /** Predicted approximation hardness (higher = harder to approximate) */
  approximationHardness: number;
}

/**
 * Database of Galois invariants for common algebraic constants used in dynamics.
 */
export const ALGEBRAIC_GALOIS_DATA: Record<string, AlgebraicNumberGaloisData> = {
  // Golden ratio φ = (1 + √5) / 2
  // Minimal polynomial: x² - x - 1 = 0
  // Galois group: C₂ (cyclic of order 2, since extension is quadratic)
  phi: {
    name: 'golden ratio φ = (1 + √5) / 2',
    minimalPolynomial: [-1, -1, 1], // x² - x - 1
    fieldDegree: 2,
    galoisGroupSymbol: 'C_2',
    galoisGroupOrder: 2,
    isSolvable: true,
    numericValue: (1 + Math.sqrt(5)) / 2,
    cfPeriodLength: 1,
    cfPeriod: [1],
    approximationHardness: 1.0, // baseline: hardest to approximate with rationals
  },

  // Square root of 2: √2
  // Minimal polynomial: x² - 2 = 0
  // Galois group: C₂
  sqrt2: {
    name: 'square root of 2: √2',
    minimalPolynomial: [-2, 0, 1], // x² - 2
    fieldDegree: 2,
    galoisGroupSymbol: 'C_2',
    galoisGroupOrder: 2,
    isSolvable: true,
    numericValue: Math.sqrt(2),
    cfPeriodLength: 1,
    cfPeriod: [2],
    approximationHardness: 0.5, // easier than φ
  },

  // Square root of 3: √3
  // Minimal polynomial: x² - 3 = 0
  // Galois group: C₂
  sqrt3: {
    name: 'square root of 3: √3',
    minimalPolynomial: [-3, 0, 1], // x² - 3
    fieldDegree: 2,
    galoisGroupSymbol: 'C_2',
    galoisGroupOrder: 2,
    isSolvable: true,
    numericValue: Math.sqrt(3),
    cfPeriodLength: 1,
    cfPeriod: [1, 2],
    approximationHardness: 0.6,
  },

  // Square root of 5: √5
  // Minimal polynomial: x² - 5 = 0
  // Galois group: C₂
  sqrt5: {
    name: 'square root of 5: √5',
    minimalPolynomial: [-5, 0, 1], // x² - 5
    fieldDegree: 2,
    galoisGroupSymbol: 'C_2',
    galoisGroupOrder: 2,
    isSolvable: true,
    numericValue: Math.sqrt(5),
    cfPeriodLength: 1,
    cfPeriod: [2, 4],
    approximationHardness: 0.55,
  },

  // Plastic constant (real root of x³ - x - 1 = 0)
  // Minimal polynomial: x³ - x - 1 = 0
  // Galois group: S₃ (full symmetric group, solvable but not abelian)
  plastic: {
    name: 'plastic constant (real root of x³ - x - 1)',
    minimalPolynomial: [-1, -1, 0, 1], // x³ - x - 1
    fieldDegree: 3,
    galoisGroupSymbol: 'S_3',
    galoisGroupOrder: 6,
    isSolvable: true,
    numericValue: 1.32471795724474602596, // computed numerically
    cfPeriodLength: undefined, // not eventually periodic (not a quadratic irrational)
    approximationHardness: 2.0, // harder than quadratic irrationals
  },

  // Tribonacci constant (real root of x³ - x² - x - 1 = 0)
  // Minimal polynomial: x³ - x² - x - 1 = 0
  // Galois group: S₃
  tribonacci: {
    name: 'tribonacci constant (real root of x³ - x² - x - 1)',
    minimalPolynomial: [-1, -1, -1, 1], // x³ - x² - x - 1
    fieldDegree: 3,
    galoisGroupSymbol: 'S_3',
    galoisGroupOrder: 6,
    isSolvable: true,
    numericValue: 1.8393751622127649,
    cfPeriodLength: undefined,
    approximationHardness: 2.1,
  },
};

// ============================================================================
// Part 2: CF Periodicity Predictions from Galois Theory
// ============================================================================

/**
 * Predict CF properties from Galois group structure.
 * 
 * Theory:
 * =======
 * For a quadratic irrational α = (P + √D) / Q:
 * - The CF is always eventually periodic
 * - Period length ≤ (log D) / log 2 roughly
 * - Actual period found by tracking (P_n, Q_n) in the algorithm
 * 
 * For higher-degree algebraic numbers:
 * - If solvable by radicals (Galois group is solvable): still eventually periodic
 * - If NOT solvable (Galois group contains A₅): CF is non-periodic (rare for algebraic)
 */
export function predictCFPeriodicityFromGaloisGroup(
  galoisData: AlgebraicNumberGaloisData
): {
  isEventuallyPeriodic: boolean;
  predictedPeriodLength: number | null;
  confidenceLevel: number; // 0-1, higher = more certain
  explanation: string;
} {
  const { galoisGroupSymbol, fieldDegree, isSolvable, cfPeriodLength } = galoisData;

  // Quadratic case: always eventually periodic
  if (fieldDegree === 2) {
    return {
      isEventuallyPeriodic: true,
      predictedPeriodLength: cfPeriodLength || null,
      confidenceLevel: 1.0,
      explanation: 'Quadratic irrational: CF is always eventually periodic by Galois theory.',
    };
  }

  // Cubic solvable (S₃ or C₃): eventually periodic
  if (fieldDegree === 3 && isSolvable) {
    return {
      isEventuallyPeriodic: true,
      predictedPeriodLength: null, // prediction harder for cubic
      confidenceLevel: 0.95,
      explanation: 'Cubic solvable extension: CF is eventually periodic, period unpredicted.',
    };
  }

  // Higher degree unsolvable: non-periodic
  if (!isSolvable) {
    return {
      isEventuallyPeriodic: false,
      predictedPeriodLength: null,
      confidenceLevel: 0.9,
      explanation: `Galois group ${galoisGroupSymbol} is unsolvable: CF cannot be periodic.`,
    };
  }

  // Default: unknown
  return {
    isEventuallyPeriodic: true,
    predictedPeriodLength: null,
    confidenceLevel: 0.5,
    explanation: `Uncertain for degree ${fieldDegree} with group ${galoisGroupSymbol}.`,
  };
}

// ============================================================================
// Part 3: Approximation Hardness from Galois Invariants
// ============================================================================

/**
 * Diophantine approximation exponent μ(α) for algebraic number α:
 * 
 * A number α is said to have exponent μ if:
 *   |α - p/q| < C/q^μ for infinitely many rationals p/q
 * 
 * For algebraic numbers, Thue-Siegel-Roth theorem gives μ ≤ d + 1,
 * where d = degree of minimal polynomial.
 * 
 * For quadratic irrationals, the Lyapunov exponent of the CF algorithm
 * equals log φ = log((1+√5)/2) ≈ 0.481.
 * 
 * The period length of the CF affects how quickly convergents approach α.
 */
export function approximationHardnessFromGaloisData(
  galoisData: AlgebraicNumberGaloisData
): {
  diophantineExponent: number; // upper bound for approximation quality
  lyapunovExponent: number | null; // for periodic CF
  expectedConvergenceCFDepth: number; // how deep to go to get ε accuracy
  difficulty: 'easy' | 'moderate' | 'hard' | 'very-hard';
} {
  const { fieldDegree, cfPeriodLength, cfPeriod, numericValue } = galoisData;

  // Diophantine exponent (Thue-Siegel-Roth): bounded by fieldDegree + 1
  const diophantineExponent = fieldDegree + 1;

  // For quadratic irrationals with periodic CF:
  let lyapunovExponent: number | null = null;
  if (fieldDegree === 2 && cfPeriodLength !== undefined) {
    // Average growth of CF denominators
    // φ (the golden ratio itself, not to be confused with the number):
    // has log(denominant growth) = log φ ≈ 0.481
    // Harder to approximate → lower Lyapunov exponent
    lyapunovExponent = Math.log((1 + Math.sqrt(5)) / 2);
  }

  // Expected CF depth for ε = 1e-10 accuracy
  // Rule of thumb: |α - p_n/q_n| ≈ 1/q_{n+1}
  // q_n grows exponentially at rate determined by CF coefficients
  let expectedConvergenceCFDepth = 15;
  if (fieldDegree === 2) {
    // Quadratic: typically 10-15 terms for high precision
    expectedConvergenceCFDepth = Math.ceil(10 + 5 * Math.log(1 / 1e-10) / Math.log(10));
  } else if (fieldDegree === 3) {
    // Cubic: slower convergence
    expectedConvergenceCFDepth = Math.ceil(15 + 10 * Math.log(1 / 1e-10) / Math.log(10));
  } else {
    // Higher degree: much slower
    expectedConvergenceCFDepth = 50;
  }

  // Difficulty classification
  // φ (golden ratio) is uniquely hardest because its CF is [1; 1, 1, 1, ...]
  // Other quadratic irrationals with longer periods are easier to approximate
  let difficulty: 'easy' | 'moderate' | 'hard' | 'very-hard';
  if (fieldDegree === 2 && cfPeriod && cfPeriod.length === 1 && cfPeriod[0] === 1) {
    difficulty = 'very-hard'; // φ specifically: [1; 1, 1, 1, ...]
  } else if (fieldDegree === 2) {
    difficulty = 'hard'; // other quadratic irrationals
  } else if (fieldDegree === 3) {
    difficulty = 'moderate';
  } else {
    difficulty = 'easy'; // higher degree = easier paradoxically due to Liouville
  }

  return {
    diophantineExponent,
    lyapunovExponent,
    expectedConvergenceCFDepth,
    difficulty,
  };
}

// ============================================================================
// Part 4: Verification Function
// ============================================================================

/**
 * Given an actual CF signature from trajectory, verify it against Galois predictions.
 * 
 * Returns alignment score: how well does the observed CF match theory?
 */
export function verifyCFSignatureAgainstGaloisPrediction(
  algebraicName: string,
  observedCFCoefficients: number[]
): {
  matchesTheory: boolean;
  alignmentScore: number; // 0-1, higher = better match
  predictedVsObserved: {
    predictedPeriodic: boolean;
    observedPeriodic: boolean;
    predictedPeriodLength: number | null;
    observedPeriodLength: number | null;
  };
  diagnosticMessage: string;
} {
  const galoisData = ALGEBRAIC_GALOIS_DATA[algebraicName];
  if (!galoisData) {
    return {
      matchesTheory: false,
      alignmentScore: 0,
      predictedVsObserved: {
        predictedPeriodic: false,
        observedPeriodic: false,
        predictedPeriodLength: null,
        observedPeriodLength: null,
      },
      diagnosticMessage: `Unknown algebraic constant: ${algebraicName}`,
    };
  }

  // Detect periodicity in observed CF
  const observedPeriod = detectCFPeriodicity(observedCFCoefficients);

  // Predict from Galois
  const galoisPrediction = predictCFPeriodicityFromGaloisGroup(galoisData);

  // Compare
  const predictedPeriodic = galoisPrediction.isEventuallyPeriodic;
  const observedPeriodic = observedPeriod.isPeriodic;

  let alignmentScore = 0;
  let diagnosticMessage = '';

  if (predictedPeriodic === observedPeriodic) {
    alignmentScore = 0.5; // Match on periodicity
    diagnosticMessage = `Periodicity matches theory (both ${predictedPeriodic ? 'periodic' : 'non-periodic'}).`;

    // Bonus if period lengths match
    if (
      predictedPeriodic &&
      galoisData.cfPeriodLength &&
      observedPeriod.periodLength &&
      Math.abs(galoisData.cfPeriodLength - observedPeriod.periodLength) <= 1
    ) {
      alignmentScore += 0.4;
      diagnosticMessage += ` Period length also matches (predicted: ${galoisData.cfPeriodLength}, observed: ${observedPeriod.periodLength}).`;
    }

    // Bonus if actual period pattern matches
    if (
      predictedPeriodic &&
      galoisData.cfPeriod &&
      observedPeriod.period &&
      cfPeriodsMatch(galoisData.cfPeriod, observedPeriod.period)
    ) {
      alignmentScore += 0.1; // small bonus
      diagnosticMessage += ` Period pattern matches exactly!`;
    }
  } else {
    alignmentScore = 0.1; // Mismatch is bad
    diagnosticMessage = `Periodicity mismatch: theory predicts ${predictedPeriodic ? 'periodic' : 'non-periodic'}, observed ${observedPeriodic ? 'periodic' : 'non-periodic'}.`;
  }

  return {
    matchesTheory: alignmentScore > 0.7,
    alignmentScore: Math.min(1, alignmentScore),
    predictedVsObserved: {
      predictedPeriodic,
      observedPeriodic,
      predictedPeriodLength: galoisData.cfPeriodLength || null,
      observedPeriodLength: observedPeriod.periodLength || null,
    },
    diagnosticMessage,
  };
}

// ============================================================================
// Part 5: Helper Functions
// ============================================================================

/**
 * Detect periodicity in a CF coefficient sequence.
 * 
 * Looks for repeating patterns at the tail.
 */
export function detectCFPeriodicity(coefficients: number[]): {
  isPeriodic: boolean;
  periodLength: number | null;
  period: number[] | null;
  startIndex: number | null; // where periodicity begins
} {
  if (coefficients.length < 3) {
    return {
      isPeriodic: false,
      periodLength: null,
      period: null,
      startIndex: null,
    };
  }

  // Try period lengths 1 to (length / 2)
  for (let periodLen = 1; periodLen <= coefficients.length / 2; periodLen++) {
    // Try starting positions
    for (let start = 0; start <= coefficients.length - 2 * periodLen; start++) {
      const period = coefficients.slice(start, start + periodLen);
      const remaining = coefficients.slice(start + periodLen);

      // Check if remaining is made of complete (or partial) repetitions of period
      let matches = true;
      for (let i = 0; i < remaining.length; i++) {
        if (remaining[i] !== period[i % periodLen]) {
          matches = false;
          break;
        }
      }

      // Accept if at least 2 full periods observed, or 1.5+ periods
      const repetitions = remaining.length / periodLen;
      if (matches && repetitions >= 1.5) {
        return {
          isPeriodic: true,
          periodLength: periodLen,
          period,
          startIndex: start,
        };
      }
    }
  }

  return {
    isPeriodic: false,
    periodLength: null,
    period: null,
    startIndex: null,
  };
}

/**
 * Check if two CF period patterns match (allowing for minor variations).
 */
function cfPeriodsMatch(predicted: number[], observed: number[]): boolean {
  if (predicted.length !== observed.length) {
    return false;
  }
  return predicted.every((val, idx) => val === observed[idx]);
}

// ============================================================================
// Part 6: Integration Interface
// ============================================================================

/**
 * Main export: Galois-CF verification system.
 * 
 * Usage:
 *   const result = verifyCFSignatureAgainstGaloisPrediction('phi', [1, 1, 1, 1, ...]);
 *   if (result.matchesTheory) {
 *     console.log("CF signature matches Galois prediction!");
 *   }
 */
export function createGaloisCFAnalyzer() {
  return {
    /** Get Galois invariants for an algebraic constant */
    getGaloisData: (name: string) => ALGEBRAIC_GALOIS_DATA[name],

    /** Predict CF properties from Galois theory */
    predictFromGalois: predictCFPeriodicityFromGaloisGroup,

    /** Estimate approximation difficulty */
    estimateApproximationHardness: approximationHardnessFromGaloisData,

    /** Verify actual CF against theory */
    verifyCFSignature: verifyCFSignatureAgainstGaloisPrediction,

    /** Detect periodicity in observed CF */
    detectPeriodicity: detectCFPeriodicity,

    /** List all available algebraic constants */
    listAvailableConstants: () => Object.keys(ALGEBRAIC_GALOIS_DATA),

    /** Full analysis: predict + verify + summarize */
    analyzeComplete: (name: string, observedCF: number[]) => {
      const galoisData = ALGEBRAIC_GALOIS_DATA[name];
      if (!galoisData) {
        return { error: `Unknown constant: ${name}` };
      }

      const prediction = predictCFPeriodicityFromGaloisGroup(galoisData);
      const hardness = approximationHardnessFromGaloisData(galoisData);
      const verification = verifyCFSignatureAgainstGaloisPrediction(name, observedCF);

      return {
        algebraicConstant: name,
        galoisGroup: galoisData.galoisGroupSymbol,
        fieldDegree: galoisData.fieldDegree,
        prediction,
        hardness,
        verification,
        summary: {
          theoryMatch: verification.matchesTheory,
          alignmentScore: verification.alignmentScore,
          confidence: verification.alignmentScore >= 0.8 ? 'high' : 
                      verification.alignmentScore >= 0.5 ? 'moderate' : 'low',
        },
      };
    },
  };
}

export type GaloisCFAnalyzer = ReturnType<typeof createGaloisCFAnalyzer>;
