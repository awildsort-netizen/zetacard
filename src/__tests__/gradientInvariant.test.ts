/**
 * Tests for Zeta Gradient Invariant
 *
 * Verifies that:
 * 1. Motion follows field reshaping
 * 2. Coercion is detected and time-bounded
 * 3. Hidden basins trap agents
 * 4. Smooth fields enable natural equilibrium
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  ZetaGradientCardContract,
  validateGradientInvariant,
  GradientFailureRegistry,
} from "../cardContract";
import { ApprovalQueueCard } from "../approvalQueueCase";

describe("Zeta Gradient Invariant", () => {
  let approvalQueue: ApprovalQueueCard;

  beforeEach(() => {
    approvalQueue = new ApprovalQueueCard();
  });

  // =========================================================================
  // Test 1: Basic gradient field exists
  // =========================================================================

  it("should compute potential field correctly", () => {
    const state = approvalQueue.getState();
    const potential = approvalQueue.potentialField(state);

    expect(potential).toBeGreaterThan(0);
    expect(typeof potential).toBe("number");
  });

  it("should compute gradient correctly", () => {
    const state = approvalQueue.getState();
    const grad = approvalQueue.gradient(state);

    expect(Array.isArray(grad)).toBe(true);
    expect(grad.length).toBeGreaterThan(0);
    expect(grad[0]).toBeGreaterThan(0); // positive slope for growing queue
  });

  // =========================================================================
  // Test 2: Bad field creates high gradient
  // =========================================================================

  it("should show high gradient with bad field (no field work)", () => {
    const state = approvalQueue.getState();

    // Default (bad field)
    const gradBad = approvalQueue.gradient(state)[0];
    expect(gradBad).toBeGreaterThan(0.5); // steep
  });

  it("should show reduced gradient after field reshaping", () => {
    let state = approvalQueue.getState();
    const gradInitial = approvalQueue.gradient(state)[0];

    // Apply field work
    approvalQueue.reshapeField({
      name: "add_parallel_approvers",
      magnitude: 2,
      reason: "Hire approvers",
    });

    state = approvalQueue.getState();
    const gradAfter = approvalQueue.gradient(state)[0];

    // Gradient should be lower (gentler field)
    expect(gradAfter).toBeLessThan(gradInitial);
  });

  // =========================================================================
  // Test 3: Coercion is detected
  // =========================================================================

  it("should track coercion force when activated without field work", () => {
    // Use bad field (default)
    approvalQueue.activate();

    // Should have coercion recorded
    expect(approvalQueue.coercionForce).toBeDefined();
    expect(approvalQueue.coercionForce?.magnitude).toBeGreaterThan(0);
    expect(approvalQueue.coercionForce?.timestamp).toBeGreaterThan(0);
  });

  it("should decay coercion after field reshaping", () => {
    // Activate with bad field (apply coercion)
    approvalQueue.activate();
    const forceBefore = approvalQueue.coercionForce?.magnitude || 0;

    // Reshape field
    approvalQueue.reshapeField({
      name: "add_parallel_approvers",
      magnitude: 3,
      reason: "Reduce load",
    });

    // Activate again (with good field)
    approvalQueue.activate();
    const forceAfter = approvalQueue.coercionForce?.magnitude || 0;

    // Force should decrease (field work reduces need for coercion)
    expect(forceAfter).toBeLessThan(forceBefore);
  });

  // =========================================================================
  // Test 4: Burnout accumulates with sustained coercion
  // =========================================================================

  it("should accumulate burnout with sustained coercion", () => {
    const state1 = approvalQueue.getState();
    const burnoutInitial = state1.burnoutLevel;

    // Activate multiple times without field work (sustained coercion)
    for (let i = 0; i < 5; i++) {
      approvalQueue.activate();
    }

    const state2 = approvalQueue.getState();
    const burnoutFinal = state2.burnoutLevel;

    // Burnout should increase
    expect(burnoutFinal).toBeGreaterThan(burnoutInitial);
  });

  it("should stabilize burnout after field work", () => {
    // First, create burnout with coercion
    for (let i = 0; i < 5; i++) {
      approvalQueue.activate();
    }
    const burnoutWithCoercion = approvalQueue.getState().burnoutLevel;

    // Now reshape field
    approvalQueue.reshapeField({
      name: "add_parallel_approvers",
      magnitude: 3,
      reason: "Reduce load",
    });

    // Activate with good field
    for (let i = 0; i < 5; i++) {
      approvalQueue.activate();
    }
    const burnoutAfterFieldWork = approvalQueue.getState().burnoutLevel;

    // Burnout should stabilize or decrease (field work alleviates stress)
    expect(burnoutAfterFieldWork).toBeLessThanOrEqual(burnoutWithCoercion + 0.1);
  });

  // =========================================================================
  // Test 5: Automation reduces effective queue
  // =========================================================================

  it("should reduce gradient via automation", () => {
    let state = approvalQueue.getState();
    const gradBefore = approvalQueue.gradient(state)[0];

    approvalQueue.reshapeField({
      name: "automate_routine_cases",
      magnitude: 0.5,
      reason: "Automate 50% of cases",
    });

    state = approvalQueue.getState();
    const gradAfter = approvalQueue.gradient(state)[0];

    expect(gradAfter).toBeLessThan(gradBefore);
  });

  // =========================================================================
  // Test 6: Validation catches violations
  // =========================================================================

  it("should pass validation when gradient is reasonable", () => {
    // With good field
    approvalQueue.reshapeField({
      name: "switch_to_good_field",
      magnitude: 1,
      reason: "Use good field",
    });

    const failures = validateGradientInvariant(approvalQueue);

    // Should not have critical failures
    const criticalFailures = failures.filter((f) => f.severity === "error");
    expect(criticalFailures.length).toBe(0);
  });

  // =========================================================================
  // Test 7: Queue equilibrium with proper field
  // =========================================================================

  it("should approach stable queue length with proper field", () => {
    // Set up good field
    approvalQueue.reshapeField({
      name: "switch_to_good_field",
      magnitude: 1,
      reason: "Use good field",
    });

    approvalQueue.reshapeField({
      name: "add_parallel_approvers",
      magnitude: 2,
      reason: "Hire approvers",
    });

    let state = approvalQueue.getState();
    const intakeRate = state.intakeRate;
    const approvalRate = state.approvalRate * (state.parallelApprovers || 1);

    // Process multiple cycles
    for (let i = 0; i < 20; i++) {
      approvalQueue.activate();
    }

    state = approvalQueue.getState();

    // If approval rate > intake rate, queue should shrink
    if (approvalRate > intakeRate) {
      expect(state.queueLength).toBeLessThan(50);
    }
  });

  // =========================================================================
  // Test 8: Motion follows gradient (no motion against gradient)
  // =========================================================================

  it("should not force motion against gradient", () => {
    const state = approvalQueue.getState();
    const grad = approvalQueue.gradient(state)[0];

    // Gradient points in direction of steepest ascent
    // Motion should be in opposite direction (steepest descent)
    // i.e., reducing queue length

    expect(grad).toBeGreaterThan(0); // high queue = high gradient

    // After activation, queue should attempt to reduce
    // (unless input exceeds processing capacity)
    const queueBefore = state.queueLength;
    approvalQueue.activate();
    const queueAfter = approvalQueue.getState().queueLength;

    // With good field, queue should not grow unboundedly
    expect(queueAfter).toBeLessThanOrEqual(queueBefore + 5); // small growth OK
  });

  // =========================================================================
  // Test 9: Spectral analysis (future)
  // =========================================================================

  it("should compute spectral signature", () => {
    const spectrum = approvalQueue.computeSpectrum();

    expect(Array.isArray(spectrum)).toBe(true);
    expect(spectrum.length).toBeGreaterThan(0);
  });
});

describe("Gradient Invariant as Contract Law", () => {
  it("should enforce that field modification is tracked", () => {
    const queue = new ApprovalQueueCard();

    const result = queue.reshapeField({
      name: "add_parallel_approvers",
      magnitude: 1,
      reason: "Test",
    });

    expect(result.success).toBe(true);
    expect(result.newPotential).toBeDefined();
    expect(result.reason).toBeDefined();
  });

  it("should reject invalid field modifications", () => {
    const queue = new ApprovalQueueCard();

    const result = queue.reshapeField({
      name: "invalid_modification",
      magnitude: 1,
      reason: "Test",
    });

    expect(result.success).toBe(false);
  });

  it("should state the key principle", () => {
    // This is not a technical test, but a reminder of the core law:
    const principle =
      "You do not fix motion by commanding it. You fix motion by reshaping the field.";

    expect(principle).toContain("motion");
    expect(principle).toContain("field");
    expect(principle).toContain("not");
  });
});
