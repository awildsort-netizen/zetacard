/**
 * Sun Contract: demonstration and tests
 *
 * Shows the four key safety invariants in action:
 * 1. Cap: A_a(t) ≤ cap_a(t)
 * 2. Ramp: |dA_a/dt| ≤ ρ_a
 * 3. Dose: D_a ≤ B_a (cumulative)
 * 4. Externality: X_a ≤ Ξ_a (harm budget)
 */

import { describe, it, expect } from "vitest";
import { SunContract, SunContractAgent } from "../cards/sunContract";

describe("Sun Contract", () => {
  it("creates a sun contract with unbounded source", () => {
    const contract = new SunContract(10); // huge source
    expect(contract.id).toBe("ζ.card.sun-contract");
    expect(contract.zeta.length).toBe(3);
    expect(contract.offer()).toBeLessThanOrEqual(1); // but clamped in offer()
  });

  it("enforces cap invariant: A_a(t) ≤ cap_a(t)", () => {
    const contract = new SunContract(100); // unlimited demand

    const agent: SunContractAgent = {
      id: "agent-1",
      capMax: 0.5,
      capCurrent: 0.5,
      processingCapacity: 1.0,
      ramping: 0.2,
      doseBudget: 10,
      exposure: 1.0,
      exposureRampRate: 0.5,
    };

    contract.couple(agent);

    // Even though sun offers unlimited, agent can only absorb up to cap
    const { intake, violations } = contract.absorb("agent-1");
    expect(intake).toBeLessThanOrEqual(agent.capCurrent);
    expect(violations.filter((v) => v.type === "cap_exceeded")).toHaveLength(0);
  });

  it("enforces ramp invariant: |dA_a/dt| ≤ ρ_a", () => {
    const contract = new SunContract(10);

    const agent: SunContractAgent = {
      id: "agent-2",
      capMax: 1.0,
      capCurrent: 1.0,
      processingCapacity: 0.5,
      ramping: 0.1, // small ramp limit
      doseBudget: 50,
      exposure: 0.5,
      exposureRampRate: 0.1,
    };

    contract.couple(agent);

    // First step: establish baseline
    let { intake: intake1 } = contract.absorb("agent-2");
    contract.state.agentIntake["agent-2"] = intake1;

    // Manually set up a huge jump in demand
    agent.capCurrent = 0.9; // try to jump up
    const { intake: intake2, violations } = contract.absorb("agent-2");

    // Check if ramp was enforced
    const rampViolations = violations.filter((v) => v.type === "ramp_exceeded");
    if (Math.abs(intake2 - intake1) > agent.ramping + 1e-3) {
      // If ramp violated, system caught it
      expect(rampViolations.length).toBeGreaterThan(0);
    }
  });

  it("accumulates dose: D_a = ∫ max(0, A_a - P_a) dt", () => {
    const contract = new SunContract(5);

    const agent: SunContractAgent = {
      id: "agent-3",
      capMax: 0.6,
      capCurrent: 0.6,
      processingCapacity: 0.3, // processing < intake = dose accumulation
      ramping: 0.5,
      doseBudget: 5,
      exposure: 1.0,
      exposureRampRate: 0.5,
    };

    contract.couple(agent);

    // Step multiple times; each step accumulates dose
    for (let i = 0; i < 20; i++) {
      contract.step(0.016);
    }

    const accumulatedDose = contract.state.agentDose["agent-3"] ?? 0;
    expect(accumulatedDose).toBeGreaterThan(0); // dose should accumulate
    expect(accumulatedDose).toBeLessThanOrEqual(agent.doseBudget + 0.01); // but capped
  });

  it("detects dose budget exceeded", () => {
    const contract = new SunContract(100);

    const agent: SunContractAgent = {
      id: "agent-4",
      capMax: 1.0,
      capCurrent: 1.0,
      processingCapacity: 0.1, // very low processing
      ramping: 0.5,
      doseBudget: 0.5, // tiny dose budget
      exposure: 1.0,
      exposureRampRate: 0.5,
    };

    contract.couple(agent);

    // Force many steps to accumulate dose beyond budget
    for (let i = 0; i < 50; i++) {
      contract.step(0.016);
    }

    // Check if dose exceeded was recorded
    const violations = contract.state.violations.filter((v) => v.type === "dose_exceeded");
    expect(violations.length).toBeGreaterThan(0);
  });

  it("controls exposure ramping: dc_a/dt ≤ r_a", () => {
    const contract = new SunContract(5);

    const agent: SunContractAgent = {
      id: "agent-5",
      capMax: 0.5,
      capCurrent: 0.5,
      processingCapacity: 0.5,
      ramping: 0.2,
      doseBudget: 100,
      exposure: 0,
      exposureRampRate: 0.05, // very slow ramp
    };

    contract.couple(agent);

    // Try to jump exposure to 1.0 instantly
    contract.setExposure("agent-5", 1.0, 0.016);

    // Should be clamped to ramping limit
    const finalExposure = agent.exposure;
    expect(finalExposure).toBeLessThan(0.2); // max ramp in one step: 0.05 * 0.016 ≈ 0.0008, or over time...
    // Actually, setExposure applies dt scaling, so it should be clamped
    expect(finalExposure).toBeLessThanOrEqual(0.05 * 0.016 + 0.01); // some slack for dt scaling
  });

  it("computes externalities (crowding out, dependency, power asymmetry)", () => {
    const contract = new SunContract(5);

    const agent: SunContractAgent = {
      id: "agent-6",
      capMax: 0.7,
      capCurrent: 0.7,
      processingCapacity: 0.2,
      ramping: 0.3,
      doseBudget: 100,
      exposure: 1.0,
      exposureRampRate: 0.5,
    };

    contract.couple(agent);
    contract.state.agentIntake["agent-6"] = 0.5; // heavy intake

    const externality = contract.computeExternality("agent-6", 0.016);
    expect(externality).toBeGreaterThan(0);
    expect(contract.state.agentExternality["agent-6"]).toBe(externality);
  });

  it("updates zeta health based on dose and violations", () => {
    const contract = new SunContract(50);

    const agent: SunContractAgent = {
      id: "agent-7",
      capMax: 0.8,
      capCurrent: 0.8,
      processingCapacity: 0.1,
      ramping: 0.4,
      doseBudget: 2, // very small budget
      exposure: 1.0,
      exposureRampRate: 0.5,
    };

    contract.couple(agent);

    const initialZeta = contract.zeta[0];

    // Accumulate violations and dose
    for (let i = 0; i < 30; i++) {
      contract.step(0.016);
    }

    const finalZeta = contract.zeta[0];
    // With violations and high dose, zeta health should degrade
    expect(finalZeta).toBeLessThan(initialZeta);
  });

  it("reports failures via getFailures()", () => {
    const contract = new SunContract(100);

    const agent: SunContractAgent = {
      id: "agent-8",
      capMax: 0.5,
      capCurrent: 0.5,
      processingCapacity: 0.05,
      ramping: 0.3,
      doseBudget: 1,
      exposure: 1.0,
      exposureRampRate: 0.5,
    };

    contract.couple(agent);

    // Accumulate dose past 70% of budget
    for (let i = 0; i < 100; i++) {
      contract.step(0.016);
    }

    const failures = contract.getFailures() ?? [];
    // Should report dose budget warning or violation
    const doseWarnings = failures.filter((f) => f.code.includes("dose"));
    expect(doseWarnings.length).toBeGreaterThan(0);
  });
});
