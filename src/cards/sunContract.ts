/**
 * ζ-Card: Sun Contract
 *
 * A contract with an unbounded source term (infinite demand, unlimited opportunity)
 * made safe through bounded couplings, ramping limits, dose tracking, and externality audits.
 *
 * Core principle: You may model the source as unbounded only if every interface is
 * bounded and audited.
 *
 * Energy interpretation: legal/operational capacity. The "sun" is unlimited demand.
 * Safety is enforced by capping intake, ramping, cumulative dose, and side effects.
 *
 * ═══════════════════════════════════════════════════════════════
 * LLM CORRESPONDENCE
 * ═══════════════════════════════════════════════════════════════
 *
 * This card models how bounded agents safely couple to unbounded generative fields.
 * The structural homology with language models is explicit:
 *
 *   Foundation Model (LLM) ≈ Sun (unbounded source)
 *   Tokenization ≈ Impedance matching / field discretization
 *   Softmax ≈ Bounded force law (renormalization)
 *   Masked language modeling ≈ Safe local absorption
 *   Context window ≈ Exposure budget / dose limit
 *   Attention weights ≈ Anisotropic gravity (directional force)
 *
 * The safety axiom works the same way in both contexts:
 *   Unbounded source + bounded interface = provable safety
 *
 * See SUN_CONTRACT.md § LLM Correspondence for detailed mappings.
 */

import {
  ZetaCardContract,
  CardMeta,
  CardFailure,
  CardActivationContext,
  CardFailureRegistry,
} from "../cardContract";

/**
 * Agent coupled to the sun contract.
 * Each agent has bounded intake, ramping, processing capacity, and dose budget.
 *
 * LLM mapping:
 *   - exposure: how much of the attention field is "visible" to this agent (query orientation)
 *   - pMax: maximum probability per step (post-softmax cap); LLM: prevents overconfidence
 *   - processingCapacity: how many tokens/cycle the agent can semantically "process" before incurring dose
 *   - doseBudget: cumulative semantic overload tolerance (context window drift, gradient confusion)
 */
export interface SunContractAgent {
  id: string;
  pMax?: number; // max probability per step (post-softmax); default 1.0 (no cap); recommend 0.85-0.95 for safety
  capCurrent: number; // current operational cap (may be lower under risk)
  processingCapacity: number; // P_a: max processing load (reviews/cycle); LLM: tokens/cycle processed before dose
  ramping: number; // ρ_a: max rate of change of intake (gradual only)
  doseBudget: number; // B_a: cumulative harm limit
  exposure: number; // c_a ∈ [0, 1]: how exposed to sun; LLM: query orientation magnitude
  exposureRampRate: number; // max rate of exposure change
  
  // LLM-specific parameters
  maskPolicy?: boolean[]; // hard masks: if true, probs[i] must be 0 exactly (by explicit zeroing)
  minTokenInterval?: number; // minimum semantic coupling unit (tokenization impedance)
  decayRate?: number; // λ: exposure decay rate toward baseline (default 0.98 ~33-step half-life)
}


/**
 * Field state for the sun contract.
 */
export interface SunContractState {
  // Unbounded source (the "sun")
  sourceStrength: number; // S: how much the sun "offers" per cycle

  // Field energy (bounded)
  fieldEnergy: number; // E(t): cumulative available capacity

  // Current offer field (LLM correspondence: logits before softmax)
  currentOffer: OfferField;

  // Per-agent tracking
  agents: Record<string, SunContractAgent>;
  agentIntake: Record<string, number>; // A_a(t): what each agent absorbed this cycle
  agentDose: Record<string, number>; // D_a: cumulative dose for each agent
  agentExternality: Record<string, number>; // X_a(t): harm/dependency metric
  agentExposure: Record<string, number>; // c_a(t): current exposure (for decay tracking)

  // Audit log
  violations: SunContractViolation[];
  lastStepTime: number;
}

/**
 * Detected violation of safety invariant.
 */
export interface SunContractViolation {
  time: number;
  agentId: string;
  type: "cap_exceeded" | "ramp_exceeded" | "dose_exceeded" | "externality_exceeded" | "exposure_violated" | "mask_violated";
  message: string;
  severity: "warn" | "error";
}

/**
 * Offer field: what the sun "broadcasts" at a given moment.
 * Analogous to the logits distribution before softmax in an LLM.
 *
 * LLM correspondence:
 *   - z: raw logits for next-token prediction
 *   - m: mask (0 for allowed channels, -∞ for forbidden)
 *   - strength: how "confident" the model is (temperature proxy)
 */
export interface OfferField {
  z: number[]; // raw logits (unbounded)
  m: number[]; // mask (0 or -∞)
  strength: number; // temperature/confidence (∈ [0, ∞))
}


export class SunContract implements ZetaCardContract<SunContractState> {
  readonly id = "ζ.card.sun-contract";
  readonly meta: CardMeta = {
    title: "Sun Contract",
    description:
      "Unbounded source with bounded couplings: models capacity + demand with safety invariants",
    tags: ["contract", "safety", "capacity", "asymmetric"],
  };

  readonly zeta: number[] = [1, 0, 0]; // contract health: starts at identity

  private state: SunContractState;
  private _isActive: boolean = false;

  constructor(sourceStrength: number = 1.0) {
    this.state = {
      sourceStrength,
      fieldEnergy: 0,
      currentOffer: {
        z: [],
        m: [],
        strength: 1.0,
      },
      agents: {},
      agentIntake: {},
      agentDose: {},
      agentExternality: {},
      agentExposure: {},
      violations: [],
      lastStepTime: 0,
    };
  }

  /**
   * Couple a new agent to the sun contract.
   * Defines their intake caps, ramping, processing, and dose budgets.
   */
  couple(agent: SunContractAgent): void {
    this.state.agents[agent.id] = agent;
    this.state.agentIntake[agent.id] = 0;
    this.state.agentDose[agent.id] = 0;
    this.state.agentExternality[agent.id] = 0;
  }

  /**
   * Unbounded source availability at a given point.
   * Even though S is large, agents can only absorb cap_a(t) * σ(ψ).
   */
  offer(): number {
    // ψ(t) = source strength (normalized 0..1, but unbounded in principle)
    // Clamped to [0, 1] for safety.
    return Math.min(1, Math.max(0, this.state.sourceStrength));
  }

  /**
   * Set the offer field (LLM logits correspondence).
   *
   * This represents what the sun "broadcasts" to all agents.
   * In LLM terms: the raw logits before softmax/masking.
   *
   * @param z - logits (unbounded real values)
   * @param mask - hard mask (0 = allowed, -∞ = forbidden)
   * @param strength - temperature-like scaling (1.0 = normal, >1 = sharper, <1 = softer)
   */
  setOfferField(z: number[], mask?: number[], strength: number = 1.0): void {
    if (!mask) {
      // Default: no masking
      mask = z.map(() => 0);
    }

    if (mask.length !== z.length) {
      throw new Error(
        `Offer field dimension mismatch: z has ${z.length} dims, mask has ${mask.length}`
      );
    }

    this.state.currentOffer = { z, m: mask, strength };
  }

  /**
   * Compute softmax absorption from the current offer field.
   * This is the core LLM correspondence: softmax(z + m) → hard boundaries (cap + mask).
   *
   * Process:
   * 1. Compute softmax(z + mask), where mask is 0 or -Infinity
   * 2. EXPLICITLY ZERO masked channels (hard boundary by construction)
   * 3. CAP unmasked probabilities to pMax (if set)
   * 4. RENORMALIZE across unmasked channels to conserve sum = 1
   *
   * @param agentId - agent requesting absorption
   * @returns probability distribution (softmax) for this agent, respecting caps & masks
   */
  private softmaxAbsorption(agentId: string): { probs: number[]; violations: SunContractViolation[] } {
    const agent = this.state.agents[agentId];
    const { z, m, strength } = this.state.currentOffer;
    const violations: SunContractViolation[] = [];

    if (z.length === 0) {
      return { probs: [], violations };
    }

    // Step 1: Compute softmax over masked logits
    const scaled = z.map((zi) => (zi * strength) / Math.max(strength, 1e-6));
    const maskedLogits = scaled.map((zi, i) => zi + (m[i] !== undefined ? m[i] : 0));

    // Prevent overflow
    const maxLogit = Math.max(...maskedLogits.filter((x) => x > -1e6));
    const safe = maskedLogits.map((x) => x - maxLogit);
    const exps = safe.map((x) => Math.exp(Math.max(x, -100)));
    const sum = exps.reduce((a, b) => a + b, 1e-10);
    let probs = exps.map((e) => e / sum);

    // Step 2: EXPLICITLY ZERO masked channels (hard boundary by construction)
    if (agent.maskPolicy) {
      for (let i = 0; i < agent.maskPolicy.length && i < probs.length; i++) {
        if (agent.maskPolicy[i]) {
          probs[i] = 0; // exact zero
        }
      }
    }

    // Renormalize after masking to restore sum = 1
    const sumAfterMask = probs.reduce((a, b) => a + b, 1e-10);
    probs = probs.map((p) => p / sumAfterMask);

    // Step 3: CAP probabilities to pMax (post-softmax), if pMax is set
    const pMax = agent.pMax ?? 1.0; // default: no cap (allows certainty)
    if (pMax < 1.0) {
      const capped = probs.map((p) => Math.min(p, pMax));

      // Step 4: RENORMALIZE after capping to conserve sum = 1
      const sumAfterCap = capped.reduce((a, b) => a + b, 1e-10);
      probs = capped.map((p) => p / sumAfterCap);
    }

    // AUDIT: Check for violations (post-zeroing)
    if (agent.maskPolicy) {
      for (let i = 0; i < agent.maskPolicy.length && i < probs.length; i++) {
        if (agent.maskPolicy[i] && Math.abs(probs[i]) > 1e-15) {
          violations.push({
            time: performance.now(),
            agentId,
            type: "mask_violated",
            message: `Channel ${i} is masked but has probability ${probs[i].toExponential(2)} (expected 0)`,
            severity: "error",
          });
        }
      }
    }

    return { probs, violations };
  }


  /**
   * Absorption attempt for an agent.
   * Returns actual intake, checking all safety invariants.
   *
   * Uses softmax absorption from the offer field (LLM correspondence).
   * pMax (probability cap) is already enforced in softmaxAbsorption().
   */
  absorb(agentId: string): { intake: number; violations: SunContractViolation[] } {
    const agent = this.state.agents[agentId];
    if (!agent) return { intake: 0, violations: [] };

    const violations: SunContractViolation[] = [];

    // Get softmax probabilities (softmax + explicit masking zero + cap + renormalize)
    const { probs, violations: maskViolations } = this.softmaxAbsorption(agentId);
    violations.push(...maskViolations);

    // Compute maximum desired intake from softmax probabilities
    // Intake = cap_a * exposure * Σ(softmax) for full field coupling
    // Sum of probs is always 1.0 after normalization, representing full field availability
    // If no offer field is set, default to 1.0 (full availability) for backwards compatibility
    const probSum = probs.length > 0 ? probs.reduce((a, b) => a + b, 0) : 1.0;
    const psi = this.offer();
    const maxDesired = agent.capCurrent * agent.exposure * psi * probSum;

    let intake = maxDesired;

    // Check 1: Cap invariant (A_a ≤ cap_a)
    // Note: pMax is already enforced in softmaxAbsorption()
    if (intake > agent.capCurrent) {
      violations.push({
        time: performance.now(),
        agentId,
        type: "cap_exceeded",
        message: `Intake ${intake.toFixed(3)} exceeds cap ${agent.capCurrent.toFixed(3)}`,
        severity: "error",
      });
      intake = agent.capCurrent;
    }

    // Check 2: Ramp invariant (|dA_a| ≤ ρ_a)
    const prevIntake = this.state.agentIntake[agentId] ?? 0;
    const rampDelta = intake - prevIntake;
    if (Math.abs(rampDelta) > agent.ramping) {
      violations.push({
        time: performance.now(),
        agentId,
        type: "ramp_exceeded",
        message: `Intake ramp ${rampDelta.toFixed(3)} exceeds limit ${agent.ramping.toFixed(3)}`,
        severity: "warn",
      });
      intake = prevIntake + Math.sign(rampDelta) * agent.ramping;
    }

    // Dose calculation: d_a = max(0, A_a - P_a)
    const processingDeficit = Math.max(0, intake - agent.processingCapacity);

    // Check 3: Dose invariant (D_a ≤ B_a)
    const newDose = (this.state.agentDose[agentId] ?? 0) + processingDeficit;
    if (newDose > agent.doseBudget) {
      violations.push({
        time: performance.now(),
        agentId,
        type: "dose_exceeded",
        message: `Cumulative dose ${newDose.toFixed(3)} exceeds budget ${agent.doseBudget.toFixed(3)}`,
        severity: "error",
      });
      // Clamp intake to stay within dose budget
      const maxSafeIntake = agent.processingCapacity + (agent.doseBudget - this.state.agentDose[agentId]);
      intake = Math.min(intake, maxSafeIntake);
    }

    return { intake, violations };
  }

  /**
   * Exposure ramping with optional decay: two-stage update for context window drift.
   *
   * Stage 1: Ramp toward target (cannot change faster than exposureRampRate * dt)
   * Stage 2: Apply decay toward baseline (optional; if decayRate is set)
   *
   * Combined: c_a(t+1) = λ * (ramped) + (1-λ) * baseline
   *
   * This models how attention fades over a sliding context window.
   * Use baseline = 0 to model forgetting when not actively maintained.
   */
  setExposure(agentId: string, targetExposure: number, dt: number = 0.016): void {
    const agent = this.state.agents[agentId];
    if (!agent) return;

    const currentExposure = agent.exposure;
    const decay = agent.decayRate ?? 0.98; // exponential decay (half-life ~33 steps)
    const baseline = 0; // exposure decays toward 0 (baseline)

    // Stage 1: Ramp limit (exposure cannot change faster than ρ_exposure * dt)
    const maxDelta = agent.exposureRampRate * dt;
    const delta = targetExposure - currentExposure;
    const clampedDelta = Math.max(-maxDelta, Math.min(maxDelta, delta));
    const ramped = Math.max(0, Math.min(1, currentExposure + clampedDelta));

    // Stage 2: Apply decay toward baseline
    agent.exposure = decay * ramped + (1 - decay) * baseline;

    // Track exposure in state for auditing
    this.state.agentExposure[agentId] = agent.exposure;

    // Check exposure violation
    if (Math.abs(targetExposure - ramped) > 1e-4) {
      this.state.violations.push({
        time: performance.now(),
        agentId,
        type: "exposure_violated",
        message: `Exposure ramped from ${currentExposure.toFixed(3)} to ${agent.exposure.toFixed(3)}; target was ${targetExposure.toFixed(3)}`,
        severity: "warn",
      });
    }
  }

  /**
   * Externality calculation: crowding out, dependency, power asymmetry.
   * X_a(t) = β₁ A_a + β₂ |∇A_a| + β₃ dependency_a
   */
  computeExternality(agentId: string, dt: number = 0.016): number {
    const agent = this.state.agents[agentId];
    if (!agent) return 0;

    const intake = this.state.agentIntake[agentId] ?? 0;
    const prevIntake = (this.state.agentIntake[agentId] ?? 0) - (dt > 0 ? 0.01 : 0);
    const intakeGradient = Math.abs(intake - prevIntake) / Math.max(dt, 1e-6);

    // Dependency proxy: how much of agent's capacity is occupied by sun
    const dependency = Math.min(1, intake / (agent.processingCapacity + 1e-6));

    // Weights (tune these for your interpretation)
    const β1 = 0.3;
    const β2 = 0.2;
    const β3 = 0.5;

    const externality = β1 * intake + β2 * intakeGradient + β3 * dependency;
    this.state.agentExternality[agentId] = externality;

    return externality;
  }

  /**
   * Step the sun contract (each cycle).
   * - Agents absorb (respecting caps & ramps)
   * - Field evolves
   * - Dose accumulates
   * - Violations logged
   * - Zeta health updated
   */
  step(dt: number = 0.016): void {
    const now = performance.now();
    this.state.lastStepTime = now;

    for (const agentId in this.state.agents) {
      const { intake, violations } = this.absorb(agentId);
      this.state.agentIntake[agentId] = intake;
      this.state.violations.push(...violations);

      // Accumulate dose
      const agent = this.state.agents[agentId];
      const processingDeficit = Math.max(0, intake - agent.processingCapacity);
      this.state.agentDose[agentId] = (this.state.agentDose[agentId] ?? 0) + processingDeficit;

      // Compute externality
      this.computeExternality(agentId, dt);

      // Decay exposure (context window semantics)
      const decay = agent.decayRate ?? 0.98;
      agent.exposure *= decay;
      this.state.agentExposure[agentId] = agent.exposure;
    }

    // Field evolves: E(t+1) = S - sum(A_a) - dissipation
    const totalAbsorbed = Object.values(this.state.agentIntake).reduce((a, b) => a + b, 0);
    const dissipation = Math.max(0, this.state.fieldEnergy * 0.1); // 10% decay
    this.state.fieldEnergy =
      this.state.fieldEnergy + this.state.sourceStrength - totalAbsorbed - dissipation;

    // Update zeta (contract health)
    const maxDose = Math.max(...Object.values(this.state.agentDose), 0.1);
    const healthFromDose = Math.exp(-maxDose / 10); // decay exponentially with dose
    const recentErrors = this.state.violations.filter(
      (v) => v.time > now - 1000 && v.severity === "error"
    ).length;
    const healthFromViolations = Math.exp(-recentErrors / 2);

    this.zeta = [
      healthFromDose * healthFromViolations,
      totalAbsorbed / (this.state.sourceStrength + 1),
      0.5,
    ];
  }

  /**
   * Card contract: state management
   */
  getState(): SunContractState {
    return JSON.parse(JSON.stringify(this.state));
  }

  setState(next: SunContractState): void {
    this.state = JSON.parse(JSON.stringify(next));
  }

  /**
   * Card contract: activation
   */
  activate(ctx?: CardActivationContext): void {
    this._isActive = true;
    if (ctx?.reason) {
      console.log(`[${this.id}] activated: ${ctx.reason}`);
    }
  }

  isActive(): boolean {
    return this._isActive;
  }

  /**
   * Card contract: introspection
   */
  getFailures?(): CardFailure[] {
    const failures: CardFailure[] = [];

    // Report recent errors
    const recentErrors = this.state.violations.filter(
      (v) => v.time > performance.now() - 2000 && v.severity === "error"
    );
    if (recentErrors.length > 0) {
      failures.push({
        code: "sun_contract_violation",
        message: `${recentErrors.length} safety violation(s) in last 2s`,
        severity: "error",
      });
    }

    // Report mask violations separately (hard boundary violations)
    const maskViolations = recentErrors.filter((v) => v.type === "mask_violated");
    if (maskViolations.length > 0) {
      failures.push({
        code: "mask_hard_boundary_violated",
        message: `${maskViolations.length} masked channel(s) leaked (hard boundary violation)`,
        severity: "error",
      });
    }

    // Report if any agent's dose is >70% of budget
    for (const agentId in this.state.agents) {
      const agent = this.state.agents[agentId];
      const doseRatio = this.state.agentDose[agentId] / agent.doseBudget;
      if (doseRatio > 0.7) {
        failures.push({
          code: "dose_budget_warning",
          message: `Agent ${agentId} at ${(doseRatio * 100).toFixed(0)}% of dose budget`,
          severity: "warn",
        });
      }
    }

    return failures;
  }

  /**
   * Get all recent mask violations (hard boundary breaches).
   * 
   * A violation occurs if:
   * 1. After explicit zeroing, a masked channel has nonzero probability, OR
   * 2. A sampled token was masked (hard boundary breach in practice)
   * 
   * This is deterministic: if softmaxAbsorption() truly zeros masked channels,
   * any later nonzero probability is a logic error or bit corruption.
   */
  getMaskViolations(timeWindowMs: number = 2000): SunContractViolation[] {
    const now = performance.now();
    return this.state.violations.filter(
      (v) => v.type === "mask_violated" && v.time > now - timeWindowMs
    );
  }
}

/**
 * Helper: sigmoid for saturating behavior
 */
function sigmoid(x: number): number {
  return 1 / (1 + Math.exp(-x));
}
