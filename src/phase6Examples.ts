/**
 * Phase 6 Usage Examples
 * 
 * Concrete code samples showing how to integrate Galois-CF theory
 * with your trajectory analysis and event detection.
 */

import { TwoManifoldState } from './twoManifoldCoupled';
import {
  analyzeTrajectoryWithGaloisTheory,
  compareTrajectoriesWithGaloisClasses,
  predictApproximationPerformance,
  Phase6GaloisIntegration,
} from './phase6Integration';
import { createGaloisCFAnalyzer } from './galoisCFInvariants';

// ============================================================================
// Example 1: Basic Trajectory Classification
// ============================================================================

/**
 * Classify a single trajectory to identify which algebraic constant it matches.
 */
export function example1_classifySingleTrajectory(
  states: TwoManifoldState[]
): void {
  console.log('\n=== Example 1: Classify Single Trajectory ===\n');

  // Analyze trajectory using Galois theory
  const signature = analyzeTrajectoryWithGaloisTheory(states);

  // Display results
  console.log(`Characteristic Scalar: ${signature.characteristicScalar.toFixed(6)}`);
  console.log(`CF Coefficients: [${signature.cfSignature.coefficients.slice(0, 8).join(', ')}, ...]`);
  console.log();
  console.log(`Matched Algebraic Constant: ${signature.matchedAlgebraicConstant || 'None'}`);
  console.log(`Match Score: ${(signature.galoisMatchScore * 100).toFixed(1)}%`);
  console.log(`Galois Group: ${signature.galoisGroupPrediction}`);
  console.log(`Theory Consistent: ${signature.isTheoryConsistent ? '✓ Yes' : '✗ No'}`);
  console.log();
  console.log(`Trajectory Class: ${signature.trajectoryClass}`);
  console.log(`Confidence: ${(signature.confidenceLevel * 100).toFixed(1)}%`);
  console.log(`Difficulty: ${signature.approximationDifficulty}`);
}

// ============================================================================
// Example 2: Compare Two Trajectories Using Galois Structure
// ============================================================================

/**
 * Determine if two trajectories belong to the same algebraic equivalence class.
 */
export function example2_compareTrajectories(
  states1: TwoManifoldState[],
  states2: TwoManifoldState[]
): void {
  console.log('\n=== Example 2: Compare Two Trajectories ===\n');

  const sig1 = analyzeTrajectoryWithGaloisTheory(states1);
  const sig2 = analyzeTrajectoryWithGaloisTheory(states2);

  const comparison = compareTrajectoriesWithGaloisClasses(sig1, sig2);

  console.log(`Trajectory 1: ${sig1.matchedAlgebraicConstant}`);
  console.log(`Trajectory 2: ${sig2.matchedAlgebraicConstant}`);
  console.log();
  console.log(`Similarity Score: ${(comparison.similarityScore * 100).toFixed(1)}%`);
  console.log(`Same Algebraic Class: ${comparison.sameAlgebraicClass ? '✓ Yes' : '✗ No'}`);
  console.log(`Same Difficulty: ${comparison.sameDifficulty ? '✓ Yes' : '✗ No'}`);
  console.log();
  console.log(`Analysis: ${comparison.reasoning}`);
}

// ============================================================================
// Example 3: Predict Approximation Hardness & Convergence
// ============================================================================

/**
 * Use Galois theory to predict how hard a trajectory will be to approximate.
 */
export function example3_predictConvergence(
  states: TwoManifoldState[]
): void {
  console.log('\n=== Example 3: Predict Approximation Performance ===\n');

  const signature = analyzeTrajectoryWithGaloisTheory(states);
  const performance = predictApproximationPerformance(signature);

  console.log(`Matched Constant: ${signature.matchedAlgebraicConstant || 'Unknown'}`);
  console.log();
  console.log('Approximation Theory Predictions:');
  console.log(`- Diophantine Exponent: ≤ ${performance.expectedDiophantineExponent}`);
  if (performance.lyapunovExponent !== null) {
    console.log(`- Lyapunov Exponent: ${performance.lyapunovExponent.toFixed(6)}`);
  }
  console.log(`- Est. Convergence Depth: ${performance.estimatedConvergenceDepth} CF terms`);
  console.log();
  console.log(`Description: ${performance.hardnessDescription}`);

  // Practical implications
  console.log();
  console.log('Practical Implications:');
  if (
    performance.hardnessDescription.includes('Very')
  ) {
    console.log(
      '  → Use high-precision arithmetic or very deep CF expansion'
    );
    console.log('  → Expect slow convergence; trajectory is "sticky"');
  } else if (performance.hardnessDescription.includes('Hard')) {
    console.log('  → Standard precision should suffice');
    console.log('  → Moderate convergence rate');
  } else {
    console.log('  → Fast convergence expected');
    console.log('  → Lower precision needs acceptable');
  }
}

// ============================================================================
// Example 4: Batch Classification of Multiple Trajectories
// ============================================================================

/**
 * Classify a collection of trajectories and group by algebraic class.
 */
export function example4_batchClassification(
  trajectories: Map<string, TwoManifoldState[]>
): void {
  console.log('\n=== Example 4: Batch Classification ===\n');

  const analyzer = createGaloisCFAnalyzer();
  const groupedByConstant: Record<string, string[]> = {};

  // Classify each trajectory
  for (const [name, states] of trajectories) {
    const sig = analyzeTrajectoryWithGaloisTheory(states, analyzer);
    const constant = sig.matchedAlgebraicConstant || 'unclassified';

    if (!groupedByConstant[constant]) {
      groupedByConstant[constant] = [];
    }
    groupedByConstant[constant].push(name);
  }

  // Display grouping
  console.log(`Total trajectories analyzed: ${trajectories.size}`);
  console.log();
  console.log('Grouped by Algebraic Constant:');
  for (const [constant, names] of Object.entries(groupedByConstant)) {
    console.log(`\n  ${constant} (${names.length} trajectories)`);
    names.forEach((name) => {
      console.log(`    - ${name}`);
    });
  }

  // Summary statistics
  const classified = Object.values(groupedByConstant)
    .reduce((sum, arr) => sum + arr.length, 0) - (groupedByConstant['unclassified']?.length || 0);
  console.log();
  console.log(`Summary: ${classified}/${trajectories.size} classified`);
}

// ============================================================================
// Example 5: Integration with Antclock Event Detection
// ============================================================================

/**
 * Emit Galois-aware events when trajectory crosses algebraic boundaries.
 */
export function example5_galoisAwareEvents(
  currentState: TwoManifoldState,
  prevState: TwoManifoldState | null,
  eventLog: Array<{ type: string; constant: string; timestamp: number }>
): void {
  console.log('\n=== Example 5: Galois-Aware Event Detection ===\n');

  if (!prevState) {
    return; // Can't compare without previous state
  }

  // Analyze both states (in practice, you'd accumulate a window)
  // For this example, we'll simulate trajectory states
  const prevStates: TwoManifoldState[] = [prevState];
  const currStates: TwoManifoldState[] = [currentState];

  const prevSig = analyzeTrajectoryWithGaloisTheory(prevStates);
  const currSig = analyzeTrajectoryWithGaloisTheory(currStates);

  console.log(`Previous Algebraic Class: ${prevSig.matchedAlgebraicConstant}`);
  console.log(`Current Algebraic Class: ${currSig.matchedAlgebraicConstant}`);
  console.log();

  // Event: Algebraic class transition
  if (prevSig.matchedAlgebraicConstant !== currSig.matchedAlgebraicConstant) {
    const event = {
      type: 'ALGEBRAIC_CLASS_TRANSITION',
      from: prevSig.matchedAlgebraicConstant || 'unknown',
      to: currSig.matchedAlgebraicConstant || 'unknown',
      timestamp: currentState.t,
    };
    console.log(`📢 Event: Transition from ${event.from} to ${event.to}`);
    eventLog.push({
      type: event.type,
      constant: event.to,
      timestamp: event.timestamp,
    });
  }

  // Event: Enter φ-periodic regime (very special)
  if (
    currSig.matchedAlgebraicConstant === 'phi' &&
    prevSig.matchedAlgebraicConstant !== 'phi'
  ) {
    console.log('🌟 Event: Entering φ-periodic (golden ratio) regime!');
    eventLog.push({
      type: 'ENTER_PHI_PERIODIC',
      constant: 'phi',
      timestamp: currentState.t,
    });
  }

  // Event: Lose algebraic structure (enter chaos?)
  if (
    prevSig.matchedAlgebraicConstant &&
    !currSig.matchedAlgebraicConstant
  ) {
    console.log('⚠️ Event: Lost algebraic structure (possibly chaotic)');
    eventLog.push({
      type: 'LOSE_ALGEBRAIC_STRUCTURE',
      constant: 'unclassified',
      timestamp: currentState.t,
    });
  }
}

// ============================================================================
// Example 6: Custom Analysis — Detect "Hidden" Algebraic Constants
// ============================================================================

/**
 * Advanced: Try to identify algebraic constants beyond the built-in database.
 * 
 * This shows how to extend the system with new constants.
 */
export function example6_extendWithCustomConstants(): void {
  console.log('\n=== Example 6: Extending with Custom Constants ===\n');

  console.log('To add a new algebraic constant (e.g., (1+√2)/2):');
  console.log();
  console.log('1. Find its minimal polynomial (monic, irreducible)');
  console.log('   Example: x² - x - 1 = 0 for φ');
  console.log();
  console.log('2. Compute its Galois group');
  console.log('   For degree 2: always C₂ (cyclic)');
  console.log('   For degree 3: usually S₃ (symmetric)');
  console.log();
  console.log('3. Compute the CF expansion (manually or numerically)');
  console.log('   Example: φ = [1; 1, 1, 1, ...]');
  console.log();
  console.log('4. Add to ALGEBRAIC_GALOIS_DATA in galoisCFInvariants.ts');
  console.log();
  console.log('Example entry:');
  console.log(`
  mysConstant: {
    name: 'My algebraic constant',
    minimalPolynomial: [-1, -1, 1],  // x² - x - 1
    fieldDegree: 2,
    galoisGroupSymbol: 'C_2',
    galoisGroupOrder: 2,
    isSolvable: true,
    numericValue: 1.618033988749895,
    cfPeriodLength: 1,
    cfPeriod: [1],
    approximationHardness: 1.0,
  },
  `);

  console.log('Then tests automatically verify against theory!');
}

// ============================================================================
// Example 7: Full Workflow Example
// ============================================================================

/**
 * Complete example showing the full Phase 6 workflow.
 */
export function example7_fullWorkflow(
  simulationStates: TwoManifoldState[]
): void {
  console.log('\n=== Example 7: Complete Phase 6 Workflow ===\n');

  console.log('Step 1: Extract CF from trajectory');
  const sig = analyzeTrajectoryWithGaloisTheory(simulationStates);
  console.log(`  ✓ CF: [${sig.cfSignature.coefficients.slice(0, 5).join(', ')}, ...]`);

  console.log('\nStep 2: Identify algebraic constant');
  console.log(`  ✓ Matched: ${sig.matchedAlgebraicConstant}`);
  console.log(`  ✓ Galois group: ${sig.galoisGroupPrediction}`);

  console.log('\nStep 3: Verify against Galois predictions');
  console.log(`  ✓ Theory consistent: ${sig.isTheoryConsistent}`);
  console.log(`  ✓ Match score: ${(sig.galoisMatchScore * 100).toFixed(1)}%`);

  console.log('\nStep 4: Predict approximation behavior');
  const perf = predictApproximationPerformance(sig);
  console.log(`  ✓ Difficulty: ${sig.approximationDifficulty}`);
  console.log(`  ✓ Convergence depth: ${perf.estimatedConvergenceDepth}`);

  console.log('\nStep 5: Classify trajectory');
  console.log(`  ✓ Class: ${sig.trajectoryClass}`);
  console.log(`  ✓ Confidence: ${(sig.confidenceLevel * 100).toFixed(1)}%`);

  console.log('\n✓ Complete classification achieved via Galois theory!');
}

// ============================================================================
// Example Export
// ============================================================================

export const Phase6Examples = {
  classifySingleTrajectory: example1_classifySingleTrajectory,
  compareTrajectories: example2_compareTrajectories,
  predictConvergence: example3_predictConvergence,
  batchClassification: example4_batchClassification,
  galoisAwareEvents: example5_galoisAwareEvents,
  extendWithCustomConstants: example6_extendWithCustomConstants,
  fullWorkflow: example7_fullWorkflow,
};
