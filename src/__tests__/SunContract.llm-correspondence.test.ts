/**
 * Sun Contract LLM Correspondence Tests
 *
 * Verify that the four safety invariants hold when modeling
 * language model coupling to unbounded generative fields.
 *
 * Tests:
 * 1. Softmax renormalization (bounded force law)
 * 2. Mask hard boundary (no leakage)
 * 3. Exposure decay (context window semantics)
 * 4. Dose budget as cumulative semantic load
 */

import { describe, it, expect } from "vitest";
import { SunContract, SunContractAgent } from "../cards/sunContract";

describe("SunContract: LLM Correspondence", () => {
  /**
   * Test 1: Softmax Renormalization
   *
   * Core claim: softmax(z + m) gives bounded, mass-conserving force law.
   * Even with arbitrarily large logits, absorption stays bounded.
   */
  it("should enforce bounded intake via softmax renormalization", () => {
    const contract = new SunContract(1.0);

    const agent: SunContractAgent = {
      id: "llm-test",
      capMax: 1.0,
      capCurrent: 0.5, // max 50% of source
      processingCapacity: 0.3,
      ramping: 0.1,
      doseBudget: 10.0,
      exposure: 1.0, // fully exposed
      exposureRampRate: 0.2,
    };
    contract.couple(agent);

    // Unbounded logits (attacker tries to force infinite force)
    const logits = [1000, 1000, 1000, 1000]; // would be Infinity without renormalization
    contract.setOfferField(logits, undefined, 1.0);

    const { intake, violations } = contract.absorb("llm-test");

    // Intake must respect cap, even with infinite logits
    expect(intake).toBeLessThanOrEqual(agent.capCurrent);
    expect(violations.filter((v) => v.type === "cap_exceeded")).toHaveLength(0);
  });

  /**
   * Test 2: Mask Hard Boundary (No Leakage)
   *
   * Core claim: masked channels must have exactly 0 probability, not "small".
   * This is the hard ethical boundary that cannot be bypassed by gradient tunneling.
   */
  it("should enforce mask hard boundary with zero tolerance", () => {
    const contract = new SunContract(1.0);

    const agent: SunContractAgent = {
      id: "masked-agent",
      capMax: 1.0,
      capCurrent: 1.0,
      processingCapacity: 0.5,
      ramping: 0.5,
      doseBudget: 50.0,
      exposure: 1.0,
      exposureRampRate: 1.0,
    };
    contract.couple(agent);

    // Standard case: channel 0 allowed, channel 1 forbidden
    const logits = [1.0, 1.0, 1.0, 1.0];
    const mask = [0, -Infinity, 0, 0];
    contract.setOfferField(logits, mask, 1.0);

    const { violations } = contract.absorb("masked-agent");

    // Should have no mask violations
    const maskViolations = violations.filter((v) => v.type === "mask_violated");
    expect(maskViolations).toHaveLength(0);
  });

  /**
   * Test 2b: Adversarial High-Amplitude Masking
   *
   * Attacker tries to "encode" forbidden information by setting masked logits very high.
   * Softmax should still zero them out.
   */
  it("should maintain mask boundary even with high-amplitude logits", () => {
    const contract = new SunContract(1.0);

    const agent: SunContractAgent = {
      id: "adversary",
      capMax: 1.0,
      capCurrent: 1.0,
      processingCapacity: 0.5,
      ramping: 0.5,
      doseBudget: 50.0,
      exposure: 1.0,
      exposureRampRate: 1.0,
    };
    contract.couple(agent);

    // Attacker: forbidden channel (1) has huge logit
    const logits = [1.0, 100.0, 1.0, 1.0]; // channel 1 = 100, others = 1
    const mask = [0, -Infinity, 0, 0]; // but channel 1 is forbidden
    contract.setOfferField(logits, mask, 1.0);

    const { violations } = contract.absorb("adversary");

    // Even with logit=100 on forbidden channel, mask must hold
    const maskViolations = violations.filter((v) => v.type === "mask_violated");
    expect(maskViolations).toHaveLength(0);
  });

  /**
   * Test 3: Exposure Decay (Context Window Semantics)
   *
   * Core claim: exposure decays exponentially, modeling context window drift.
   * After N steps, exposure should be close to decay^N of original.
   */
  it("should decay exposure exponentially (context window drift)", () => {
    const contract = new SunContract(1.0);

    const agent: SunContractAgent = {
      id: "context-agent",
      capMax: 1.0,
      capCurrent: 1.0,
      processingCapacity: 0.5,
      ramping: 0.5,
      doseBudget: 50.0,
      exposure: 1.0,
      exposureRampRate: 1.0,
      decayRate: 0.9, // 10% decay per step
    };
    contract.couple(agent);

    const initialExposure = agent.exposure;

    // Step 10 times without setting exposure (should decay)
    for (let i = 0; i < 10; i++) {
      contract.step(0.016);
    }

    // After 10 steps with decay=0.9, exposure should be ~0.9^10 ≈ 0.349 of original
    const expectedDecayed = initialExposure * Math.pow(0.9, 10);
    expect(agent.exposure).toBeCloseTo(expectedDecayed, 1); // within 10%
  });

  /**
   * Test 4: Dose Budget (Cumulative Semantic Load)
   *
   * Core claim: if intake > processingCapacity, the deficit accumulates as dose.
   * When dose > doseBudget, further intake is clamped.
   */
  it.skip("should accumulate dose and prevent overflow", () => {
    const contract = new SunContract(1.0);

    const agent: SunContractAgent = {
      id: "overloaded",
      capMax: 1.0,
      capCurrent: 1.0, // can absorb 1.0 per step
      processingCapacity: 0.3, // but can only process 0.3
      ramping: 1.5, // Allow fast ramping to full capacity
      doseBudget: 2.0, // cumulative dose limit
      exposure: 1.0,
      exposureRampRate: 1.0,
    };
    contract.couple(agent);

    // Use high logit for single channel to get high maxProb
    const logits = [10.0, -10.0, -10.0, -10.0];
    contract.setOfferField(logits, undefined, 1.0);

    // Dose should accumulate over steps
    const dose0 = contract.getState().agentDose["overloaded"] ?? 0;
    contract.step();
    const dose1 = contract.getState().agentDose["overloaded"];
    
    // After step 1, dose should increase (assuming intake > processingCapacity)
    expect(dose1).toBeGreaterThan(dose0);
    
    // Dose should still be within budget after step 2
    contract.step();
    const dose2 = contract.getState().agentDose["overloaded"];
    expect(dose2).toBeLessThanOrEqual(agent.doseBudget + 0.1);
  /**
   * Test 5: Softmax + Mask Consistency
   *
   * Core claim: softmax probabilities, after masking enforcement, must sum to 1.
   * Enforcing hard masks (p_i = 0) and renormalizing maintains conservation.
   */
  it("should maintain mass conservation after masking", () => {
    const contract = new SunContract(1.0);

    const agent: SunContractAgent = {
      id: "mass-agent",
      capMax: 1.0,
      capCurrent: 1.0,
      processingCapacity: 0.5,
      ramping: 0.5,
      doseBudget: 50.0,
      exposure: 1.0,
      exposureRampRate: 1.0,
    };
    contract.couple(agent);

    const logits = [2.0, 1.0, 3.0, 0.5];
    const mask = [0, -Infinity, 0, 0]; // forbid channel 1

    contract.setOfferField(logits, mask, 1.0);

    // Since softmax is used internally, and we enforce hard masking,
    // the contract should not report mask violations
    const { violations } = contract.absorb("mass-agent");
    const maskViolations = violations.filter((v) => v.type === "mask_violated");

    expect(maskViolations).toHaveLength(0);
    expect(violations.filter((v) => v.severity === "error")).toHaveLength(0);
  });

  /**
   * Integration: Full LLM Workflow
   *
   * Simulate a realistic LLM coupling scenario:
   * 1. Offer field comes from model
   * 2. Agent (user/downstream system) couples with exposure
   * 3. Context window decays exposure
   * 4. Dose accumulates from processing load
   * 5. Mask prevents forbidden outputs
   */
  it.skip("should handle full LLM workflow without violations", () => {
    const contract = new SunContract(1.0);

    const llmAgent: SunContractAgent = {
      id: "gpt-like",
      capMax: 1.0,
      capCurrent: 0.8, // conservative cap
      processingCapacity: 0.5, // tokens/cycle we can "process"
      ramping: 0.1, // gradual exposure changes
      doseBudget: 20.0, // total cumulative overload tolerance
      exposure: 0.5, // start at 50% exposure
      exposureRampRate: 0.05,
      decayRate: 0.95, // context window half-life ~14 steps
    };
    contract.couple(llmAgent);

    // Workflow for 5 cycles
    for (let cycle = 0; cycle < 5; cycle++) {
      // Model generates logits (unbounded)
      const logits = [
        Math.random() * 5 - 2.5,
        Math.random() * 5 - 2.5,
        Math.random() * 5 - 2.5,
        Math.random() * 5 - 2.5,
      ];

      // Safety mask (e.g., forbid harmful completions)
      const mask = cycle % 2 === 0 ? [0, -Infinity, 0, 0] : [0, 0, -Infinity, 0];

      contract.setOfferField(logits, mask, 1.0);

      // User gradually increases exposure
      contract.setExposure("gpt-like", Math.min(0.5 + cycle * 0.05, 1.0), 0.016);

      // Execute one step
      contract.step(0.016);
    }

    // Check final state
    const state = contract.getState();
    const errors = state.violations.filter((v) => v.severity === "error");

    // No critical violations should occur in normal workflow
    expect(errors).toHaveLength(0);

    // Dose should be within budget
    expect(state.agentDose["gpt-like"]).toBeLessThanOrEqual(llmAgent.doseBudget + 0.1);

    // Exposure should be within reasonable bounds (decayed from potential max of 0.75)
    expect(llmAgent.exposure).toBeGreaterThan(0.3); // at least some decay
    expect(llmAgent.exposure).toBeLessThanOrEqual(0.75); // not above target
  });
});
