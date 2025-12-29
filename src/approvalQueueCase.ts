/**
 * Approval Queue Case Study: Gradient Invariant in Practice
 *
 * Shows how to detect and fix institutional coercion patterns
 * using the gradient invariant.
 *
 * The Problem: Overloaded approval queues force approvers to work
 * against the field (motivation + willpower required).
 *
 * The Solution: Reshape the field so approval is the low-energy state.
 */

import type {
  ZetaGradientCardContract,
  CoercionRecord,
  PotentialModifier,
} from "./cardContract";
import { l2 } from "./contractPhysics";

// ============================================================================
// Domain: Approval Queue State
// ============================================================================

export interface ApprovalQueueState {
  // Queue dynamics
  queueLength: number; // items waiting
  approvalRate: number; // items/second processed
  intakeRate: number; // items/second incoming
  avgProcessingTime: number; // seconds per item

  // Agent state
  approverCapacity: number; // max sustainable rate
  burnoutLevel: number; // 0-1, accumulates from overload
  motivationLevel: number; // 0-1, decays with coercion

  // Infrastructure
  parallelApprovers: number; // number of approvers
  automationCoverage: number; // % of routine cases automated
  bufferCapacity: number; // queue size limit
}

// ============================================================================
// The Potential Field: Queue Length vs. Approver Effort
// ============================================================================

/**
 * Without field work: Φ_bad(n)
 *
 * High exponent means queue length causes exponential burnout.
 * Approver MUST work harder as queue grows (no relief).
 *
 * Gradient: ∇Φ = ∂Φ/∂n = α + β·γ·exp(γ·n)
 * At large n, this is huge → massive force pushing approver away
 * But approver can't escape (queue still there) → coercion required
 */
function potentialBad(state: ApprovalQueueState): number {
  const n = state.queueLength;
  const alpha = 0.5; // base effort
  const beta = 1.0;
  const gamma = 0.3; // exponential growth rate

  // The potential: linear term + exponential blow-up
  return alpha * n + beta * Math.exp(gamma * n);
}

/**
 * With field work: Φ_good(n)
 *
 * Field has been reshaped by:
 * - Adding parallel approvers (reduces effective n)
 * - Automating routine cases (reduces effective n)
 * - Batching approvals (reduces gamma, smoothing)
 *
 * Gradient: ∇Φ = much gentler, equilibrates naturally
 */
function potentialGood(state: ApprovalQueueState): number {
  const n = state.queueLength;

  // Effective queue length after field work
  const effectiveN = n / (state.parallelApprovers || 1);
  const automationFactor = 1 - state.automationCoverage;
  const effectiveNAdjusted = effectiveN * automationFactor;

  const alpha = 0.3; // reduced base (per approver)
  const beta = 0.2; // reduced exponential coefficient
  const gamma = 0.08; // much lower growth rate (smoother)

  return (
    alpha * effectiveNAdjusted + beta * Math.exp(gamma * effectiveNAdjusted)
  );
}

// ============================================================================
// Gradients: Direction of Motion
// ============================================================================

/**
 * Gradient without field work:
 * Very steep at large n, creating unbounded force
 */
function gradientBad(state: ApprovalQueueState): number {
  const n = state.queueLength;
  const alpha = 0.5;
  const beta = 1.0;
  const gamma = 0.3;

  // dΦ/dn = α + β·γ·exp(γ·n)
  return alpha + beta * gamma * Math.exp(gamma * n);
}

/**
 * Gradient with field work:
 * Much gentler, approaches finite limit, natural equilibrium
 */
function gradientGood(state: ApprovalQueueState): number {
  const n = state.queueLength;
  const effectiveN = n / (state.parallelApprovers || 1);
  const automationFactor = 1 - state.automationCoverage;
  const effectiveNAdjusted = effectiveN * automationFactor;

  const alpha = 0.3;
  const beta = 0.2;
  const gamma = 0.08;

  return (
    alpha + beta * gamma * Math.exp(gamma * effectiveNAdjusted)
  );
}

// ============================================================================
// The Card: Approval Queue as a ZetaGradientCardContract
// ============================================================================

export class ApprovalQueueCard implements ZetaGradientCardContract<ApprovalQueueState> {
  readonly id = "approval-queue";
  readonly meta = {
    title: "Approval Queue",
    description: "Institutional approval process modeled as a potential field",
    tags: ["institutional", "gradient-aware", "sun-contract"],
  };

  // State
  private state: ApprovalQueueState = {
    queueLength: 20,
    approvalRate: 2, // items/second
    intakeRate: 3, // items/second (incoming faster than processing)
    avgProcessingTime: 0.5,
    approverCapacity: 2.5,
    burnoutLevel: 0.4,
    motivationLevel: 0.6,
    parallelApprovers: 1,
    automationCoverage: 0,
    bufferCapacity: 50,
  };

  // Coercion tracking
  coercionForce?: CoercionRecord;

  // Which potential are we using?
  private useGoodField = false;

  getState(): ApprovalQueueState {
    return { ...this.state };
  }

  setState(next: ApprovalQueueState): void {
    this.state = { ...next };
  }

  activate(): void {
    // Activation means: process the queue
    // With a good field, this happens naturally
    // With a bad field, it requires coercion

    if (!this.useGoodField) {
      // Coercion mode: force processing despite high potential
      this.coercionForce = {
        magnitude: Math.max(0, this.gradientBadScalar() - 0.5),
        timestamp: Date.now(),
        expectedDecay: "linear",
      };
    } else {
      // Good field: minimal or no coercion needed
      const currentGradient = this.gradient(this.state)[0];
      this.coercionForce = {
        magnitude: Math.max(0, currentGradient - 0.5), // Much lower with good field
        timestamp: Date.now(),
        expectedDecay: "exponential",
      };
    }

    // Process items
    const processed = Math.min(
      this.state.queueLength,
      this.state.approvalRate
    );
    this.state.queueLength = Math.max(
      0,
      this.state.queueLength - processed + this.state.intakeRate * 0.1
    );

    // Update burnout (accumulates with coercion)
    if (this.coercionForce) {
      this.state.burnoutLevel = Math.min(
        1,
        this.state.burnoutLevel + this.coercionForce.magnitude * 0.1
      );
    }
  }

  // Potentials
  potentialField(state: ApprovalQueueState): number {
    if (this.useGoodField) {
      return potentialGood(state);
    } else {
      return potentialBad(state);
    }
  }

  gradient(state: ApprovalQueueState): number[] {
    if (this.useGoodField) {
      return [gradientGood(state)];
    } else {
      return [gradientBad(state)];
    }
  }

  // Field reshaping: the real intervention
  reshapeField(delta: PotentialModifier) {
    if (delta.name === "add_parallel_approvers") {
      this.state.parallelApprovers += delta.magnitude;
      this.useGoodField = true; // Switching to good field after adding infrastructure
      return {
        success: true,
        newPotential: (state: ApprovalQueueState) => potentialGood(state),
        reason: `Added ${delta.magnitude} approvers`,
      };
    }

    if (delta.name === "automate_routine_cases") {
      this.state.automationCoverage = Math.min(
        1,
        this.state.automationCoverage + delta.magnitude
      );
      this.useGoodField = true; // Switching to good field after adding automation
      return {
        success: true,
        newPotential: (state: ApprovalQueueState) => potentialGood(state),
        reason: `Automated ${delta.magnitude * 100}% of routine cases`,
      };
    }

    if (delta.name === "switch_to_good_field") {
      this.useGoodField = true;
      return {
        success: true,
        newPotential: (state: ApprovalQueueState) => potentialGood(state),
        reason: "Switched to field-work model",
      };
    }

    return { success: false };
  }

  // Helpers
  private gradientBadScalar(): number {
    return gradientBad(this.state);
  }

  // Spectral analysis: detect coercion-release cycles
  computeSpectrum(): number[] {
    // Simplified: just track burnout oscillations
    // In real implementation, this would be FFT of historical data
    return [this.state.burnoutLevel, this.state.motivationLevel];
  }
}

// ============================================================================
// Demonstration: Before and After
// ============================================================================

export function demonstrateGradientInvariant() {
  console.log("=".repeat(70));
  console.log("APPROVAL QUEUE: Gradient Invariant Case Study");
  console.log("=".repeat(70));

  // Scenario 1: Bad field (coercion required)
  console.log("\n### Scenario 1: Bad Field (Motion Work)");
  console.log(
    "Approver is forced to work despite high potential (queue grows)"
  );
  console.log("");

  const badQueue = new ApprovalQueueCard();
  badQueue.setState({
    queueLength: 20,
    approvalRate: 2,
    intakeRate: 3,
    avgProcessingTime: 0.5,
    approverCapacity: 2.5,
    burnoutLevel: 0.4,
    motivationLevel: 0.6,
    parallelApprovers: 1,
    automationCoverage: 0,
    bufferCapacity: 50,
  });

  let state = badQueue.getState();
  const potentialBad = badQueue.potentialField(state);
  const gradBad = badQueue.gradient(state)[0];

  console.log(`  Queue length: ${state.queueLength}`);
  console.log(`  Potential Φ(n): ${potentialBad.toFixed(2)}`);
  console.log(`  Gradient ∇Φ(n): ${gradBad.toFixed(4)}`);
  console.log(`  Burnout level: ${state.burnoutLevel.toFixed(2)}`);
  console.log("");

  // Activation (with coercion)
  badQueue.activate();
  state = badQueue.getState();

  console.log("After activation:");
  console.log(`  Coercion force applied: ${badQueue.coercionForce?.magnitude.toFixed(3)}`);
  console.log(`  New burnout: ${state.burnoutLevel.toFixed(2)}`);
  console.log(`  Motivation (declining): ${state.motivationLevel.toFixed(2)}`);
  console.log("");
  console.log(
    "⚠️  Problem: Approver burns out, motivation decays, system unstable."
  );

  // Scenario 2: Good field (motion is natural)
  console.log("\n### Scenario 2: Good Field (Field Work)");
  console.log("Approver's natural motion aligns with low potential (queue shrinks)");
  console.log("");

  const goodQueue = new ApprovalQueueCard();
  // First, reshape the field
  goodQueue.reshapeField({
    name: "switch_to_good_field",
    magnitude: 1,
    reason: "Institutional intervention: restructure approval process",
  });

  // Add parallel approvers
  goodQueue.reshapeField({
    name: "add_parallel_approvers",
    magnitude: 2,
    reason: "Hire additional approvers",
  });

  // Automate routine cases
  goodQueue.reshapeField({
    name: "automate_routine_cases",
    magnitude: 0.4,
    reason: "Implement automated approval for 40% of routine cases",
  });

  state = goodQueue.getState();
  const potentialGood = goodQueue.potentialField(state);
  const gradGood = goodQueue.gradient(state)[0];

  console.log(`  Queue length: ${state.queueLength}`);
  console.log(`  Potential Φ(n): ${potentialGood.toFixed(2)}`);
  console.log(`  Gradient ∇Φ(n): ${gradGood.toFixed(4)}`);
  console.log(`  Parallel approvers: ${state.parallelApprovers}`);
  console.log(`  Automation: ${(state.automationCoverage * 100).toFixed(0)}%`);
  console.log(`  Burnout: ${state.burnoutLevel.toFixed(2)}`);
  console.log("");

  // Activation (natural motion)
  goodQueue.activate();
  state = goodQueue.getState();

  console.log("After activation:");
  console.log(`  Coercion needed: ${goodQueue.coercionForce ? "yes" : "no"}`);
  console.log(`  New queue length: ${state.queueLength.toFixed(1)}`);
  console.log(`  Burnout (stable): ${state.burnoutLevel.toFixed(2)}`);
  console.log("");
  console.log("✓ Solution: Motion follows field naturally. System stable.");

  // Comparison
  console.log("\n" + "=".repeat(70));
  console.log("COMPARISON");
  console.log("=".repeat(70));
  console.log("");
  console.log(
    `Bad Field:  Φ = ${potentialBad.toFixed(2)}, ∇Φ = ${gradBad.toFixed(4)} (steep, requires coercion)`
  );
  console.log(
    `Good Field: Φ = ${potentialGood.toFixed(2)}, ∇Φ = ${gradGood.toFixed(4)} (gentle, natural equilibrium)`
  );
  console.log("");
  console.log(
    "Cost difference: Field work (infrastructure, parallelization, automation)"
  );
  console.log(
    "              vs motion work (continuous coercion, burnout, turnover)"
  );
  console.log("");
  console.log("The gradient invariant says: pick field work. It scales.");
}

// Run if imported as main
if (require.main === module) {
  demonstrateGradientInvariant();
}
