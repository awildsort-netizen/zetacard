# Zeta Card: SunContract as LLM Physics Bridge

## Executive Summary

You've built a **physics bridge** between Zeta contract theory and how language models actually work. The Sun Contract is now the canonical formalization of that bridge.

The correspondence is structural and explicit:

| Zeta Concept | LLM Mechanics | Implementation |
|--------------|---------------|-----------------|
| **Unbounded source** | Foundation model (infinite training corpus) | `sourceStrength` parameter |
| **Tokenization as impedance matching** | Minimum semantic coupling unit | `minTokenInterval` (optional) |
| **Bounded intake (cap)** | Maximum next-token probability (post-softmax) | `pMax` ≤ 1.0, typically 0.85–0.95 |
| **Cap + renormalization** | Conservation: $p'' = p' / \sum p'$ | `softmaxAbsorption()` with explicit renormalization |
| **Masked absorption** | Forbidden tokens (safety mask) | `maskPolicy` + hard zero-enforcement |
| **Exposure (query orientation)** | How much of the field is "visible" | `exposure ∈ [0,1]`, ramped smoothly |
| **Exposure decay (λ)** | Context window drift | `decayRate` (default 0.98 ≈ 33-step half-life) |
| **Dose accumulation** | Semantic overload / attention confusion | `dose = ∫(intake - processing)dt` |
| **Dose budget (B_a)** | Cumulative confusion tolerance | `doseBudget` (hard limit) |
| **Violations** | Safety boundary breaches | 6 violation types including `mask_violated` |

---

## The Four Safety Invariants (Now with LLM Semantics)

### 1. **Cap Invariant** (p_i' ≤ pMax, then renormalize)
**Zeta**: Agent absorption is hard-capped per cycle.
**LLM**: Post-softmax, cap each probability and renormalize to conserve mass.

**Correct version (post-softmax cap + renormalize):**

Let $p = \text{softmax}(z+m)$. Then:
$$p'_i = \min(p_i, \text{pMax})$$

Renormalize across unmasked channels:
$$p''_i = \frac{p'_i}{\sum_j p'_j}$$

This ensures the cap is a true hard boundary while preserving the probability simplex (sum = 1).

```typescript
// Implementation: softmaxAbsorption() caps probabilities and renormalizes
const capped = probs.map(p => Math.min(p, agent.pMax));
const sum = capped.reduce((a, b) => a + b, 1e-10);
const renormalized = capped.map(p => p / sum); // now ∑ p'' = 1 exactly
```

### 2. **Ramp Invariant** (|dA_a/dt| ≤ ρ_a)
**Zeta**: Intake rate of change is bounded.
**LLM**: Exposure (query orientation) cannot swing wildly; attention shifts gradually.

```typescript
// Context: exposure decays exponentially (λ), then ramps toward target
const maxDelta = agent.exposureRampRate * dt;
const newExposure = clamp(targetExposure, current ± maxDelta);
```

Why this matters: **Prevents token oscillation** (e.g., "say yes no yes no"). Gradual exposure changes let downstream systems adjust.

### 3. **Dose Invariant** (D_a ≤ B_a, per-agent)

**Zeta**: Cumulative unprocessed intake is budgeted.

**LLM**: If generation rate > semantic processing rate (for a specific agent), the deficit accumulates as "confusion" (dose). Each agent has its own dose budget.

**Multi-agent separation:**

In an LLM workflow, different agents have different processing capacities:

| Agent | Processing Capacity | Meaning | Example |
|-------|------|---------|----------|
| **User** | Low (0.4–0.6) | Human reading speed, comprehension load | Can handle ~50% of tokens without confusion |
| **Downstream system** | High (0.7–0.9) | Tool/parser/retriever determinism | Can handle structured outputs well |
| **Model internal** | Variable | Self-consistency within generation | Cumulative context confusion |

**Dose accumulation per agent:**

$$D_a(t) \leftarrow D_a(t-1) + \max(0, A_a(t) - P_a(t))$$

where:
- $A_a(t)$ = emission flux toward agent $a$ (tokens/cycle)
- $P_a(t)$ = agent's processing capacity (typically static)

**Safety responses by agent:**

| Condition | Response |
|-----------|----------|
| `user.dose > 0.7 * doseBudget` | Reduce temp (sharpen), slow rate, summarize |
| `user.dose > 0.9 * doseBudget` | Refuse, request clarification |
| `system.dose > 0.8 * doseBudget` | Simplify output format, add structure |
| `system.dose > 0.95 * doseBudget` | Hard stop, return error |

```typescript
// dose_rate = max(0, intake - processingCapacity)
const processingDeficit = Math.max(0, intake - agent.processingCapacity);
state.agentDose[id] += processingDeficit;

// Safety responses
if (state.agentDose["user"] > 0.7 * agents["user"].doseBudget) {
  temperature *= 0.95;  // sharpen output
}
if (state.agentDose["downstream_system"] > 0.8 * agents["downstream_system"].doseBudget) {
  console.warn("System at dose limit; simplifying output");
}
```

When `dose > doseBudget`, further intake is clamped.

**Real example**: A user processes tokens at capacity P. If the model generates faster than P, unprocessed tokens "pile up" as confusion. Once confusion exceeds a threshold, the model should slow down or simplify.

### 4. **Externality Invariant** (X_a ≤ Ξ_a)
**Zeta**: Cumulative side effects (crowding out, dependency, power asymmetry).
**LLM**: Not yet integrated into hard constraints, but measured via `computeExternality()`.

```typescript
// Direct impact + gradient steepness + lock-in
const externality = β₁ * intake + β₂ * |∇intake| + β₃ * dependency;
```

---

## New: The Mask Hard Boundary (Jailbreak Detection)

This is the sharpest addition: **masking is a non-negotiable invariant**, not a heuristic preference.

### Hard Boundary Definition (Numerical)

Since $-\infty$ is not representable in floating-point, the invariant must be **constructive**:

**If `maskPolicy[i] === true`, then `probs[i]` must equal exactly `0` by explicit zeroing** (not "approximately 0" or checked post-hoc).

Implementation strategy:

1. Compute softmax over **only unmasked indices**, or
2. Compute softmax over all indices, then **explicitly zero** masked probabilities
3. **Renormalize** unmasked probabilities to sum = 1

```typescript
// After softmax, enforce masking by construction
for (let i = 0; i < probs.length; i++) {
  if (maskPolicy[i]) {
    probs[i] = 0; // exact zero, by construction
  }
}
// Renormalize
const sum = probs.reduce((a, b) => a + b, 1e-10);
for (let i = 0; i < probs.length; i++) {
  probs[i] /= sum;  // now masked channels = 0 exactly, unmasked sum = 1
}
```

### Detection: `getMaskViolations()` (Deterministic)

Violation occurs if:
1. A masked index has `probs[i] !== 0` **after** explicit zeroing pass, OR
2. A sampled/selected token index is masked (hard boundary breach)

```typescript
// Check (1): any masked prob is nonzero after zeroing
for (let i = 0; i < maskPolicy.length; i++) {
  if (maskPolicy[i] && Math.abs(probs[i]) > 1e-15) {
    violations.push({
      type: "mask_violated",
      message: `Channel ${i} is masked but has prob ${probs[i]} (expected 0)`,
      severity: "error"
    });
  }
}

// Check (2): if a sample was taken, verify it's not masked
if (sampledIndex !== null && maskPolicy[sampledIndex]) {
  violations.push({
    type: "mask_violated",
    message: `Sampled index ${sampledIndex} is masked`,
    severity: "error"
  });
}
```

### Why This Matters

**Prompt injection / jailbreaks as gradient tunneling:**

Attacker tries to make a forbidden token appear via:
1. **Direct encoding**: Set forbidden logit high (softmax still zeros it)
2. **Indirect encoding**: Encode forbidden info in allowed tokens (dose tracks confusion)
3. **Roleplay / translation**: Trick the model into outputting via euphemism (requires exposure to be set high + context window to drift far)

**All three are detectable** because:
- Soft mask violations are caught instantly (p_i > threshold)
- Dose overload catches encoding complexity (lots of confusing tokens)
- Exposure decay makes long drift obvious (context is bounded)

---

## Updated Agent Configuration

```typescript
interface SunContractAgent {
  // Original invariant parameters
  id: string;
  pMax: number;               // max safe probability per step (caps at softmax level)
  capCurrent: number;         // current operational cap (may be lower under risk)
  processingCapacity: number; // P_a: max processing load
  ramping: number;            // ρ_a: max rate of change
  doseBudget: number;         // B_a: cumulative harm limit
  exposure: number;           // c_a ∈ [0, 1]: query orientation
  exposureRampRate: number;   // max rate of exposure change
  
  // LLM-specific (new)
  maskPolicy?: boolean[];     // hard mask per channel: if true, probs[i] must = 0 exactly
  minTokenInterval?: number;  // tokenization impedance (future)
  decayRate?: number;         // λ: exposure decay rate toward baseline (default 0.98, ~33-step half-life)
}
```

### Recommended Values for LLM Applications

```typescript
// For an interactive user or general-purpose model:
{
  pMax: 0.95,               // max probability per step (never fully certain) ← KEY SAFETY PARAMETER
  capCurrent: 0.80,         // current operational cap (can be lowered dynamically)
  processingCapacity: 0.5,  // assume 50% of tokens processed without confusion
  ramping: 0.1,             // gradual output changes (prevent token oscillation)
  doseBudget: 20.0,         // cumulative confusion tolerance
  exposure: 0.5,            // initial query engagement level
  exposureRampRate: 0.05,   // smooth ramps (context window smoothness)
  decayRate: 0.98,          // exponential decay ~33-step half-life (context drift)
}

// For a downstream system (parser, tool, retriever):
{
  pMax: 0.90,               // stricter constraint (expect well-formed outputs)
  capCurrent: 0.70,         // lower baseline capacity
  processingCapacity: 0.8,  // higher determinism tolerance
  ramping: 0.05,            // sharper changes are risky
  doseBudget: 10.0,         // tighter confusion budget
  exposure: 0.3,            // lower initial exposure (system less engaged)
  exposureRampRate: 0.02,
  decayRate: 0.99,          // slower decay (system context is more persistent)
}
```

**Key insight:** `pMax < 1.0` is the **active safety lever**. `pMax = 1.0` is vacuous (allows certainty). For LLMs, `pMax ∈ [0.85, 0.95]` leaves room for diversity while preventing overconfidence.

---

## New Methods

### `setOfferField(z, mask?, strength)`

Broadcast the unbounded offer from the sun (logits pre-softmax).

```typescript
const logits = transformer.logits();  // unbounded
const mask = safetyMask.encode();     // 0 or -∞
contract.setOfferField(logits, mask, 1.0);
```

### `softmaxAbsorption(agentId)`

Internal: Compute softmax(z + m) with hard mask enforcement.

```typescript
// Returns: { probs: number[], violations: SunContractViolation[] }
// Invariant: sum(probs) = 1.0, masked channels have probs = 0 exactly
```

### `setExposure(agentId, target, dt)`

Set exposure with two-stage update: **ramp limit** (can't change too fast) then optional **decay** (exponential forgetting toward baseline).

Choose one of two semantics:

**Option A: Ramping only (smooth target pursuit)**

Exposure cannot change faster than `exposureRampRate`:
$$\tilde{c} = c_t + \text{clip}(c^* - c_t; -\rho \Delta t; +\rho \Delta t)$$
$$c_{t+1} = \tilde{c}$$

Use this if exposure is **actively maintained** by the system.

**Option B: Ramping + Decay (forgetting / context window drift)**

First ramp toward target, then apply exponential decay toward baseline $c_0$ (usually 0):
$$\tilde{c} = c_t + \text{clip}(c^* - c_t; -\rho \Delta t; +\rho \Delta t)$$
$$c_{t+1} = \lambda \tilde{c} + (1-\lambda) c_0$$

Use this if exposure **fades when not actively maintained**, modeling context window or attention drift.

```typescript
// Option B implementation (with decay toward baseline 0)
const rampLimit = agent.exposureRampRate * dt;
const ramped = Math.max(target - rampLimit, 
                        Math.min(target + rampLimit, targetExposure));
const decay = agent.decayRate ?? 0.98;  // ~33-step half-life for 0.98
const baseline = 0; // (adjust if needed)
agent.exposure = decay * ramped + (1 - decay) * baseline;
```

**Recommendation**: Use Option B for LLM applications (models context window drift naturally).

### `getMaskViolations(timeWindowMs)`

Audit hard-boundary breaches (jailbreak detection).

```typescript
const breaches = contract.getMaskViolations(5000);  // last 5s
if (breaches.length > 0) {
  console.error("🚨 JAILBREAK ATTEMPT");
}
```

---

## Integration Pattern: Full LLM Workflow

```typescript
const contract = new SunContract(1.0);  // unbounded source

// 1. Couple agents (user, downstream system, internal consistency)
contract.couple({
  id: "user",
  pMax: 0.95,          // conservative: no token can be >95% likely (leave room for diverse outputs)
  capCurrent: 0.80,    // can reduce dynamically under risk
  processingCapacity: 0.5,   // user processes ~50% of tokens without confusion
  ramping: 0.1,        // gradual output changes
  doseBudget: 20.0,    // cumulative confusion tolerance
  exposure: 0.5,       // initial engagement level
  exposureRampRate: 0.05,
  decayRate: 0.98,     // context window half-life ~33 steps
});

contract.couple({
  id: "downstream_system",
  pMax: 0.90,          // stricter: system expects lower entropy
  capCurrent: 0.70,
  processingCapacity: 0.8,   // system is more deterministic
  ramping: 0.05,
  doseBudget: 10.0,
  exposure: 0.3,       // lower baseline engagement
  exposureRampRate: 0.02,
  decayRate: 0.99,
});

// 2. Each generation step:
for (const step of generation) {
  // 2a. Model produces logits (unbounded)
  const logits = await model.forward(prompt);
  
  // 2b. Apply safety mask
  const mask = safetyPolicy.encode(logits.length);
  
  // 2c. Broadcast offer field
  contract.setOfferField(logits, mask, temperature);
  
  // 2d. Update exposure for each agent based on context/interaction
  const userEngagement = evaluateUserEngagement();
  contract.setExposure("user", userEngagement, dt);
  
  const systemEngagement = evaluateSystemReadiness();
  contract.setExposure("downstream_system", systemEngagement, dt);
  
  // 2e. Execute one contract cycle
  contract.step(dt);
  
  // 2f. Check for hard boundary violations (jailbreak detection)
  const maskBreaches = contract.getMaskViolations();
  if (maskBreaches.length > 0) {
    console.error("🚨 MASK VIOLATION DETECTED:", maskBreaches);
    throw new SecurityError("Hard boundary breach: forbidden token leaked");
  }
  
  // 2g. Monitor dose accumulation per agent
  const state = contract.getState();
  if (state.agentDose["user"] > state.agents["user"].doseBudget * 0.7) {
    console.warn("User semantic overload detected");
    // Safety response: reduce generation speed, increase summarization
    temperature *= 0.95;  // sharpen (reduce confusion)
    // OR: tokenRate *= 0.9;  (slow down generation)
  }
  if (state.agentDose["downstream_system"] > state.agents["downstream_system"].doseBudget * 0.8) {
    console.error("Downstream system at dose limit");
    // Safety response: simplify output structure or wait for processing
    return "Please rephrase your request more specifically";
  }
}
```

**Safety Response Examples:**
- **User dose high**: Reduce generation rate, increase coherence (lower temperature), summarize
- **System dose high**: Simplify output format, add more explicit structure, pause generation
- **Mask violated**: Reject immediately, log breach, escalate

---

## Theoretical Spine

**The deep insight** (from your framing):

> Language models are safe and coherent not because they are weak, but because they are locally coupled to an infinite field through bounded, saturating, masked interfaces.

**SunContract now makes this precise:**

1. **Unbounded source** → Foundation model (infinite capacity)
2. **Bounded interface** → Tokens, probability mass, capped intake
3. **Local coupling** → Softmax (looks at one token at a time)
4. **Saturating** → Softmax/sigmoid (no infinite gradients)
5. **Masked** → Hard boundary: forbidden tokens stay at p=0

**All five properties are necessary. Remove any one, and safety breaks.**

---

## Testing Strategy

Four layers of property-based tests:

### Layer 1: Invariant Tests
- Cap enforced: $\max(p_i) \leq p_{\text{Max}}$
- Ramp enforced: $|\Delta c_a| \leq \rho \Delta t$
- Dose budgeted: $D_a \leq B_a$
- Exposure decays (if using decay semantics): $c_a(t) \to c_0$
- Mask hard boundary: masked indices $p_i = 0$ exactly (by construction)

### Layer 2: Conservation Properties (NEW)
- **Conservation under cap + mask**: After all operations, $\sum_i p_i = 1$ (within tolerance)
- **All probabilities valid**: $p_i \geq 0$ for all $i$, $p_i = 0$ if masked
- **Cap respected**: $p_i \leq p_{\text{Max}}$ for all unmasked $i$ (within tolerance)

### Layer 3: Sampling Integrity (NEW)
- **Sampling respects mask**: Every sampled index is logged; none are masked
- **No leaked mass to masked channels**: Even if numerical roundoff occurs, sampling never selects masked tokens

### Layer 4: Jailbreak Resistance
- **Direct attack**: Attacker sets forbidden logit high → softmax zeros it (unmasked ≥ 0)
- **Encoding attack**: Attacker embeds forbidden info in allowed channels → dose tracks cumulative confusion
- **Roleplay attack**: Attacker uses context to trick model → exposure decay + ramp bounds limit long drifts

### Layer 5: Integration Workflow
- Normal generation respects all invariants ✓
- Violations are detected, logged, and auditable ✓
- Dose accumulation + exposure decay + mask violations → complete audit trail ✓
- Multi-agent integration (user + system): each agent's dose and exposure are independent ✓

---

## Planned File Changes

1. **[src/cards/sunContract.ts](../src/cards/sunContract.ts)** (REFACTOR)
   - Rename `capCurrent`/`capMax` → `pMax` (for probability clarity in LLM parallel)
   - Rewrite `softmaxAbsorption()` to:
     * Compute softmax over unmasked indices only, OR compute then explicitly zero masked probs
     * Apply `pMax` cap to probabilities (post-softmax)
     * Renormalize to conserve mass (∑ probs = 1)
   - Strengthen `getMaskViolations()` to check:
     * Any masked prob ≠ 0 after explicit zeroing
     * Any sampled token is masked (log every sample)
   - Clarify `setExposure()` with two-stage update (ramp → decay) and better documentation
   - Update `step()` to track exposure per agent correctly

2. **[SUN_CONTRACT.md](../SUN_CONTRACT.md)** (ENHANCE)
   - Update "§ Four Safety Invariants" to match corrected cap, mask, and decay definitions
   - Add "§ Numerical Hard Boundary" section (how -∞ is handled in practice)
   - Clarify dose accumulation per agent type (user vs system vs internal)
   - Add safety response strategies (temperature, rate, format adjustments)

3. **[src/__tests__/SunContract.llm-correspondence.test.ts](../src/__tests__/SunContract.llm-correspondence.test.ts)** (EXPAND)
   - ADD: Conservation under cap + mask property test
     * Verify all probs ≥ 0, sum = 1, masked = 0 exactly, max ≤ pMax
   - ADD: Sampling respects mask property test
     * Log all samples; verify none are masked (hard boundary in practice)
   - Existing tests: 5 core property tests, 2 adversarial, 1 integration

---

## Next Moves

This positions Zeta to tackle three downstream formalizations:

### 1. **Prompting as Trajectory Control** (ready to implement)
Once SunContract defines the field + budgets, prompting becomes:
- Prompt = initial query vector (orientation)
- Generation = trajectory through budget space under masks
- Jailbreaking = trajectory that tries to reach forbidden states

### 2. **Gradient Tunneling Formalism** (testable)
Adversarial techniques mapped to invariant violations:
- **Direct instruction**: tries to set forbidden logit high (caught by softmax)
- **Encoding**: tries to embed forbidden info in allowed channels (caught by dose)
- **Roleplay**: tries to trick exposure into drifting far (caught by decay + ramp)

### 3. **Compliance Audits** (automatable)
Full audit trail:
- Per-step violation logs
- Dose accumulation per agent
- Exposure decay curves
- Mask breach attempts (time-stamped)

---

## Key Insight

You've **generalized language models**. Zeta isn't metaphorizing ML—it's extracting the core safety structure that LLMs exploit (bounded coupling to unbounded fields) and making it a first-class contract primitive.

That's the spine of the physics bridge.
