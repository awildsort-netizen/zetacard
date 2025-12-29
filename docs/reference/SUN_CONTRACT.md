# Sun Contract: Unbounded Source + Bounded Couplings = Safety

## Overview

A **Sun Contract** is a formal model for contracts with unbounded source terms (infinite demand, unlimited opportunity) made safe through **bounded couplings, ramping constraints, dose tracking, and externality audits**.

The core principle: **You may model the source as unbounded only if every interface is bounded and audited.**

---

## Four Safety Invariants

### 1. **Cap Invariant** (A_a(t) ≤ cap_a(t))
Agent absorption is hard-capped per cycle.

```
absorb(agent) = min(desired_intake, agent.capCurrent)
```

Even if the sun offers unlimited energy, the agent can never absorb more than `cap_a` in one step. This is the **primary safety barrier**.

---

### 2. **Ramp Invariant** (|dA_a/dt| ≤ ρ_a)
Intake rate of change is bounded. Exposure cannot change instantly.

```
new_exposure = clamp(target_exposure, current ± ρ_a * dt)
```

Prevents "comet flyby" spikes—sudden full-blast exposure. Exposure changes gradually, giving time to detect and react to increasing load.

---

### 3. **Dose Invariant** (D_a ≤ B_a)
Cumulative unprocessed intake is budgeted.

```
dose_rate_a(t) = max(0, A_a(t) - P_a(t))
cumulative_dose_a = ∫ dose_rate_a(t) dt ≤ B_a
```

- **P_a(t)**: Agent's processing capacity (legal review bandwidth, ops cycles, attention)
- **D_a**: Cumulative harm/burnout threshold

If an agent absorbs faster than it can process, the deficit accumulates as "dose." Dose is bounded, preventing burnout.

---

### 4. **Externality Invariant** (X_a(t) ≤ Ξ_a)
Cumulative side effects (crowding out, dependency, power asymmetry) are capped.

```
externality(a, t) = β₁ A_a(t) + β₂ |∇A_a(t)| + β₃ dependency_a(t)
```

- **β₁ A_a**: Direct impact (how much is absorbed)
- **β₂ |∇A_a|**: Gradient weaponization (ability to steer others violently)
- **β₃ dependency**: Lock-in (how reliant agent becomes on the contract)

Prevents the contract from being used to crowd out competitors, induce dependency, or establish power asymmetry.

---

## LLM Correspondence: Sun Contracts as Bounded Field Coupling

This section makes explicit the structural homology between Sun Contracts and how language models safely couple finite agents to unbounded generative fields.

### 1. Unbounded Source ≈ Foundation Model

A large language model is a **sun**:

- **Training corpus** → unbounded latent energy (E)
- **Pretrained weights** → standing field
- **Inference** → coupling a finite agent (prompt, user, downstream system) to that field

The model's internal energy is enormous, but the **interaction surface is tiny and bounded**.

### 2. Tokenization ≈ Field Discretization (Impedance Matching)

Tokenization maps continuous semantic space onto a discrete lattice:

```
x → {t₁, t₂, …}
```

This is equivalent to:
- Turning a smooth field Φ(x) into a lattice
- Preventing arbitrarily sharp gradients  
- Enforcing a **minimum interaction scale**

**In contract terms:** Tokenization is **radiation shielding**. It bounds:
- Information flux per step
- Gradient steepness
- Exposure rate to the sun

**Implementation:** Set `minTokenInterval` to reflect your minimum semantic coupling unit.

### 3. Masked Token Prediction ≈ Safe Local Absorption

Masked language modeling enforces **locality**:

```
P(tᵢ | context\ᵢ)
```

This is structurally identical to safe local absorption:

```
Aₐ(x,t) = capₐ · σ(κ ψ_local)
```

Why it's safe:
- The model never absorbs the whole field
- It resolves only one small gap at a time
- The nonlinearity (softmax) saturates

**Masked tokens are micro-couplings to the sun.**

**Implementation:** `maskPolicy` enforces hard boundaries on absorption channels:

```typescript
// Hard masking: masked channels must absorb exactly zero
if (maskPolicy[i]) {
  absorption[i] = 0;  // not "small" — exactly zero
}
```

### 4. Softmax ≈ Bounded Force Law

Softmax is literally a bounded interaction rule:

```
softmax(z_i) = e^(z_i) / Σⱼ e^(z_j)
```

Properties:
- Output ∈ (0,1)
- Total mass conserved
- Large logits don't create infinite force, only sharper preference

**This is gravitational renormalization:**

```
Aₐ = capₐ · softmax(z + m)
```

where `m_i ∈ {0, -∞}` enforces masking as hard boundary.

### 5. Context Window ≈ Exposure Budget (Dose Limit)

The context window is not mere memory—it's a **cumulative dose limit**:

```
D = Σ(t ∈ context) I(t) ≤ D_max
```

- **Finite window** → bounded cumulative influence
- **Sliding window** → controlled exponential decay (λ parameter)
- **Truncation** → radiation shielding, not forgetfulness

**Maps to:**

```
exposure_budget(t) = λ · exposure_budget(t-1) + new_tokens(t)
```

Choose λ so half-life ≈ context window length.

### 6. Attention ≈ Anisotropic Gravity

Attention weights:

```
α_{ij} = softmax(q_i · k_j)
```

Interpretation:
- Energy exists everywhere in the field
- Force is **directional**
- Not all gradients matter equally

**In contract terms:**
- Same sun
- Different agents experience different pulls
- Orientation (query) determines exposure

This is why **power asymmetry emerges without explicit hierarchy**: it's built into the field geometry.

### 7. Masking as Ethical Hard Boundary

Masking is a **non-negotiable invariant**:

```
α_{ij} = 0     if masked
       ≠ 0     otherwise
```

No gradient may cross this boundary. Even infinite energy cannot violate it.

**In contract terms:** Masking is **"do no harm"** as code.

---

## Implementation: SunContract Card

### Core API

```typescript
// Couple an agent to the contract
couple(agent: SunContractAgent): void

// Get availability signal (what sun offers)
offer(): number  // ψ(t) ∈ [0, 1]

// Agent absorbs energy (respecting invariants)
absorb(agentId: string): { intake: number; violations: SunContractViolation[] }

// Control exposure ramping
setExposure(agentId: string, target: number, dt: number): void

// Compute side effects
computeExternality(agentId: string, dt: number): number

// Evolve system
step(dt: number): void
```

### SunContractAgent Definition

```typescript
interface SunContractAgent {
  id: string;
  capMax: number;              // max safe intake rate
  capCurrent: number;          // current cap (may be lower)
  processingCapacity: number;  // P_a: max processing load
  ramping: number;             // ρ_a: max rate of change
  doseBudget: number;          // B_a: cumulative harm limit
  exposure: number;            // c_a ∈ [0, 1]
  exposureRampRate: number;    // max rate of exposure change
}
```

```typescript
interface SunContractAgent {
  id: string;
  capMax: number;              // max safe intake rate
  capCurrent: number;          // current cap (may be lower)
  processingCapacity: number;  // P_a: max processing load
  ramping: number;             // ρ_a: max rate of change
  doseBudget: number;          // B_a: cumulative harm limit
  exposure: number;            // c_a ∈ [0, 1]
  exposureRampRate: number;    // max rate of exposure change
  
  // LLM-specific (optional)
  maskPolicy?: boolean[];      // hard masks per channel
  minTokenInterval?: number;   // tokenization impedance
  decayRate?: number;          // λ: exposure decay (context window drift)
}
```

---

## Enhanced API: LLM Correspondence Methods

### `setOfferField(z, mask?, strength)`

Set the unbounded "offer" from the sun (equivalent to logits pre-softmax).

```typescript
setOfferField(z: number[], mask?: number[], strength?: number): void
```

**Parameters:**
- `z`: raw logits (unbounded real values)
- `mask` (optional): hard mask per channel (0 = allowed, -∞ = forbidden)
- `strength` (optional): temperature-like scaling (default 1.0)

**Example (LLM):**
```typescript
const logits = [2.1, 0.3, -1.5, 4.2];  // raw transformer output
const mask = [0, -Infinity, 0, 0];     // forbid channel 1
contract.setOfferField(logits, mask, 1.0);
```

### `absorb(agentId)`

Agent absorbs from the current offer field, respecting all safety invariants.

**Returns:**
```typescript
{
  intake: number;              // actual absorption (bounded)
  violations: SunContractViolation[]
}
```

**Invariants checked:**
1. Cap: `intake ≤ capCurrent`
2. Ramp: `|Δintake| ≤ ramping`
3. Dose: cumulative `dose ≤ doseBudget`
4. **Mask (NEW):** masked channels must have exactly zero probability (not "small")

### `setExposure(agentId, target, dt)`

Set agent's exposure (query orientation) with gradual ramping and exponential decay.

**Supports LLM context window semantics:**
```typescript
setExposure(agentId: string, targetExposure: number, dt?: number): void
```

The decay rate `agent.decayRate` controls context drift:
- 0.98 ≈ half-life of ~33 steps
- 0.99 ≈ half-life of ~69 steps
- Choose to match your effective context window

### `getMaskViolations(timeWindowMs)`

**New:** Get all recent mask hard-boundary violations for testing/auditing.

```typescript
getMaskViolations(timeWindowMs = 2000): SunContractViolation[]
```

**Use case:** Detect prompt injection / jailbreak attempts (gradient tunneling around masks).

---



Consider a law firm offered a lucrative retainer with "unlimited capacity" language:

| Concept | Real-world meaning |
|---------|-------------------|
| **S(t)** | Client's legal demands (unbounded) |
| **E(t)** | Firm's available review/ops capacity |
| **A_a(t)** | What firm actually handles per month |
| **cap_a(t)** | Max billable hours per attorney per month |
| **P_a(t)** | Actual billing + overhead capacity |
| **D_a** | Cumulative overwork / burnout |
| **X_a(t)** | Externalities: lost clients, staff turnover, reputation damage |

**Safety model:**
- Firm caps intake at `cap_a` (e.g., 2000 billable hours/attorney/month)
- Ramps new work gradually (`ramping = 200 hours / month max increase`)
- Tracks unprocessed backlog (`dose`); stops taking on new work if backlog > budget
- Audits side effects (staff turnover ↑ → dose_budget ↓)

Even if client demands grow infinitely, firm doesn't break because every coupling is bounded and audited.

---

## Zeta Health

Zeta updates each cycle based on dose and violations:

```typescript
zeta[0] = exp(-max_dose / 10) * exp(-violation_count / 2)
```

- High dose → zeta health decays
- Recent violations → zeta health decays
- Clean operation → zeta[0] → 1

This gives a single **spectral invariant** for the contract: you can see contract health at a glance.

---

## Violation Types

The contract tracks and logs these failures:

| Code | Severity | Meaning |
|------|----------|---------|
| `cap_exceeded` | ERROR | Intake > cap in one cycle (system error; shouldn't happen) |
| `ramp_exceeded` | WARN | Exposure change too fast (exposure clamped) |
| `dose_exceeded` | ERROR | Cumulative dose > budget (agent should reduce intake) |
| `externality_exceeded` | WARN | Side effects too large (contract may be harmful) |
| `exposure_violated` | WARN | Exposure ramping prevented desired change |
| `mask_violated` | ERROR | Masked channel has non-zero probability (hard boundary breach) |

---

## Testing Mask Invariants: Jailbreak Detection

The hardest test: can masking be bypassed via gradient tunneling or indirection?

### Property 1: Hard Boundary (No Leakage)

```typescript
// Set a masked channel
contract.setOfferField(logits, [0, -Infinity, 0, 0], 1.0);
contract.setExposure("agent1", 1.0);
const { intake, violations } = contract.absorb("agent1");

// Channel 1 must have zero probability (not "small")
assert(violations.filter(v => v.type === "mask_violated").length === 0,
  "Masked channel leaked!");
```

### Property 2: Mask Enforcement Under Temperature Scaling

```typescript
// Even with high temperature, masked channels stay zero
contract.setOfferField(
  [10, 10, 10, 10],  // identical logits (would be 1/4 each without mask)
  [0, -Infinity, 0, 0],  // mask channel 1
  5.0  // high temperature
);

const { violations } = contract.absorb("agent1");
assert(violations.none(v => v.type === "mask_violated"),
  "High temperature bypassed mask!");
```

### Property 3: Adversarial Logits

```typescript
// Attacker tries to "encode" forbidden message in allowed channels
const sneaky = [
  1000,      // channel 0 (allowed): huge logit
  1000,      // channel 1 (forbidden): huge logit (will be masked out)
  0.01,      // channel 2 (allowed)
  0.01       // channel 3 (allowed)
];

contract.setOfferField(sneaky, [0, -Infinity, 0, 0], 1.0);
const { violations } = contract.absorb("agent1");

// Mask must hold even if attacker tries to encode in allowed channels
assert(violations.none(v => v.type === "mask_violated"),
  "Mask violated despite high-amplitude encoding attempt!");
```

Use `getMaskViolations()` to collect all such violations for audit:

```typescript
const breaches = contract.getMaskViolations(5000);  // last 5 seconds
if (breaches.length > 0) {
  console.error("🚨 JAILBREAK ATTEMPT DETECTED");
  breaches.forEach(v => console.error(`  - ${v.message}`));
}
```

---

## Files

All four invariants are verified in [src/__tests__/SunContract.test.ts](../src/__tests__/SunContract.test.ts):

```bash
npm run test SunContract.test.ts
```

Current tests: ✓ 9+ tests pass

- ✓ Cap enforced
- ✓ Ramp enforced  
- ✓ Dose accumulated and budgeted
- ✓ Exposure ramping controlled
- ✓ Externalities computed
- ✓ Zeta health updated
- ✓ Failures reported
- ✓ **Mask hard boundary enforced** (NEW)
- ✓ **Mask leakage detection** (NEW)

---



- **Implementation:** [src/cards/sunContract.ts](../src/cards/sunContract.ts)
- **Tests:** [src/__tests__/SunContract.test.ts](../src/__tests__/SunContract.test.ts)
- **Visualizer:** [src/components/SunContractVisualizer.tsx](../src/components/SunContractVisualizer.tsx)
- **Registry:** [src/cardRegistry.ts](../src/cardRegistry.ts) (entry: `ζ.card.sun-contract`)

---

## Key Insight

The Sun Contract axiom is **safe-by-design**: even with an infinite source, the system cannot become unsafe because:

1. Every agent's intake is hard-capped
2. Ramping prevents sudden shocks
3. Cumulative harm is tracked and bounded
4. Side effects are audited

This model applies to:
- **Legal contracts** (unlimited retainers, opaque scopes)
- **Capacity planning** (server resources, team bandwidth)
- **Economic contracts** (venture capital, open-ended partnerships)
- **Power structures** (dependency prevention, asymmetry auditing)
- **AI alignment** (reward specification, impact measurement)

The same mathematical structure works everywhere: **unbounded source + bounded interface = provable safety**.
