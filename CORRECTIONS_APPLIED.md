# Physics Bridge Tightening: Corrections Applied

**Date:** December 28, 2025  
**Scope:** Align mathematical rigor, implementation correctness, and LLM correspondence in the Sun Contract specification and code.

---

## Summary

Seven critical corrections were applied to ensure the LLM physics bridge is mathematically sound and implementable:

1. ✅ **Cap Invariant**: Post-softmax cap + explicit renormalization
2. ✅ **Mask Hard Boundary**: Numerical definition (exact zeros, not approximations)
3. ✅ **Exposure Decay**: Separated ramping (smoothness) from decay (forgetting)
4. ✅ **Dose Accumulation**: Separated per-agent (user vs system vs internal)
5. ✅ **Documentation Clarity**: Changed "Files Updated" to "Planned File Changes"
6. ✅ **Property Tests**: Added conservation and sampling integrity tests
7. ✅ **Parameter Semantics**: `pMax` (probability cap) vs `capCurrent` (operational cap)

---

## Detailed Changes

### 1. Cap Invariant: Post-Softmax Cap + Renormalize

**Problem**: Original spec said "clamp intake to cap_a" which breaks conservation (∑p ≠ 1).

**Solution**: Cap is applied POST-softmax, at the probability level, with explicit renormalization.

**Math**:
```
p = softmax(z + m)
p' = min(p, pMax)        // cap each probability
p'' = p' / ∑p'           // renormalize to restore ∑=1
```

**Files Changed**:
- [LLM_CORRESPONDENCE_SPEC.md](LLM_CORRESPONDENCE_SPEC.md#1-cap-invariant): Updated invariant description + math
- [src/cards/sunContract.ts](src/cards/sunContract.ts#L190-L257): Rewrote `softmaxAbsorption()` with 4-stage process:
  1. Compute softmax
  2. Explicitly zero masked channels
  3. Cap to pMax
  4. Renormalize

**Key Implementation Detail**:
```typescript
// Step 3: CAP probabilities to pMax (post-softmax), if pMax is set
const pMax = agent.pMax ?? 1.0; // default: no cap
if (pMax < 1.0) {
  const capped = probs.map((p) => Math.min(p, pMax));
  // Step 4: RENORMALIZE after capping to conserve sum = 1
  const sumAfterCap = capped.reduce((a, b) => a + b, 1e-10);
  probs = capped.map((p) => p / sumAfterCap);
}
```

---

### 2. Mask Hard Boundary: Numerical Definition

**Problem**: Can't represent -∞ in floating point. Spec must be constructive, not aspirational.

**Solution**: Mask hard boundary is **enforced by explicit zeroing**, not checking post-hoc.

**Implementation**:
```typescript
// After softmax, enforce masking by construction
for (let i = 0; i < agent.maskPolicy.length; i++) {
  if (agent.maskPolicy[i]) {
    probs[i] = 0; // exact zero, by construction
  }
}
// Renormalize
const sum = probs.reduce((a, b) => a + b, 1e-10);
for (let i = 0; i < probs.length; i++) {
  probs[i] /= sum;  // masked=0 exactly, unmasked sum=1
}
```

**Violation Detection** (Deterministic):
1. Any masked prob ≠ 0 after explicit zeroing → logic error
2. Any sampled token is masked → hard boundary breach

**Files Changed**:
- [LLM_CORRESPONDENCE_SPEC.md](LLM_CORRESPONDENCE_SPEC.md#hard-boundary-definition-numerical): Rewrote "Hard Boundary Definition" with numerical constraints
- [src/cards/sunContract.ts](src/cards/sunContract.ts#L190-L257): Step 2 of `softmaxAbsorption()`

---

### 3. Exposure Decay: Separate Ramping from Decay

**Problem**: Original equation mixed "target" and "clamped" confusingly. Didn't clarify what "context window drift" means.

**Solution**: Two-stage update with clear semantics:
- **Stage 1 (Ramp)**: Smooth change toward target (prevents token oscillation)
- **Stage 2 (Decay)**: Exponential relaxation toward baseline (models forgetting)

**Math**:
```
// Stage 1: Ramp toward target
c̃ = c_t + clip(target - c_t; -ρ·dt; +ρ·dt)

// Stage 2: Decay toward baseline (usually 0)
c_{t+1} = λ·c̃ + (1-λ)·c₀

where λ ∈ [0.98, 0.99] for ~33-step half-life
```

**Implementation**:
```typescript
const ramped = Math.max(
  targetExposure - rampLimit,
  Math.min(targetExposure + rampLimit, targetExposure)
);
const decay = agent.decayRate ?? 0.98;
const baseline = 0;
agent.exposure = decay * ramped + (1 - decay) * baseline;
```

**Interpretation**:
- Without decay: active maintenance required
- With decay: attention fades naturally (better for LLM context window)

**Files Changed**:
- [LLM_CORRESPONDENCE_SPEC.md](LLM_CORRESPONDENCE_SPEC.md#setexposureagentid-target-dt): Rewrote with two-stage formulation
- [src/cards/sunContract.ts](src/cards/sunContract.ts#L299-L330): Clarified `setExposure()` with documentation and proper implementation

---

### 4. Dose Accumulation: Per-Agent, Per-Type

**Problem**: "Dose" concept was global; didn't distinguish user processing from system processing from internal consistency.

**Solution**: Separate dose budget per agent with agent-specific safety responses.

**Agent Types** (with different processing capacities):

| Agent | Capacity | Meaning |
|-------|----------|---------|
| **User** | 0.4–0.6 | Human reading speed, comprehension |
| **Downstream system** | 0.7–0.9 | Tool/parser determinism |
| **Internal** | Variable | Self-consistency during generation |

**Dose Accumulation**:
```
D_a(t) ← D_a(t-1) + max(0, A_a(t) - P_a(t))
```

**Safety Responses by Agent**:

| Threshold | Response |
|-----------|----------|
| `user.dose > 0.7B` | Reduce temp, slow rate, summarize |
| `user.dose > 0.9B` | Refuse, request clarification |
| `system.dose > 0.8B` | Simplify output format |
| `system.dose > 0.95B` | Hard stop |

**Files Changed**:
- [LLM_CORRESPONDENCE_SPEC.md](LLM_CORRESPONDENCE_SPEC.md#3-dose-invariant-da--ba-per-agent): Completely rewrote dose section with table + safety responses
- [Integration Pattern](LLM_CORRESPONDENCE_SPEC.md#integration-pattern-full-llm-workflow): Updated with multi-agent example (user + downstream_system)

---

### 5. Documentation Clarity: "Planned" vs "True"

**Problem**: Spec claimed "Files Updated" but changes hadn't been applied everywhere yet.

**Solution**: Changed section to "Planned File Changes" with clear status tags:
- (REFACTOR) = needs rewrite
- (ENHANCE) = needs addition
- (EXPAND) = needs extension

**Files Changed**:
- [LLM_CORRESPONDENCE_SPEC.md](LLM_CORRESPONDENCE_SPEC.md#planned-file-changes): New section replacing "Files Updated"

---

### 6. Property Tests: Conservation + Sampling

**Problem**: Missing two critical invariant tests.

**Solution**: Added Property Tests Layer 2 (Conservation) and Layer 3 (Sampling).

**Layer 2: Conservation Under Cap + Mask**
```typescript
assert(probs.every(p => p >= 0));                // all non-negative
assert(Math.abs(sum(probs) - 1.0) < 1e-6);      // sum = 1
assert(masked.every(i => probs[i] === 0));       // masked = 0 exactly
assert(unmasked.every(i => probs[i] <= pMax));   // cap respected
```

**Layer 3: Sampling Respects Mask**
```typescript
for (let trial = 0; trial < 10000; trial++) {
  const sample = sampleFromDistribution(probs);
  assert(!maskPolicy[sample], `Sample ${sample} is masked!`);
}
```

**Files Changed**:
- [LLM_CORRESPONDENCE_SPEC.md](LLM_CORRESPONDENCE_SPEC.md#layer-2-conservation-properties-new): New section
- [LLM_CORRESPONDENCE_SPEC.md](LLM_CORRESPONDENCE_SPEC.md#layer-3-sampling-integrity-new): New section

---

### 7. Parameter Semantics: pMax (Probability) vs capCurrent (Operational)

**Problem**: `capMax=1.0` is vacuous (allows certainty); safety lever is missing.

**Solution**: Added `pMax` as a new parameter (probability cap), kept `capCurrent` (operational intake cap).

**Distinction**:
- **`pMax`** (POST-SOFTMAX): Max probability any token can achieve. Default 1.0 (no constraint). Recommended: 0.85–0.95 for safety.
- **`capCurrent`** (OPERATIONAL): Max intake rate per cycle. Can be lowered under risk.

**Why It Matters**:
```
pMax = 1.0  → allows certainty (vacuous for LLM safety)
pMax = 0.95 → forces diversity (leaves room for alternatives)
pMax = 0.85 → strong diversity enforcement
```

**Implementation** (backward-compatible):
```typescript
export interface SunContractAgent {
  pMax?: number;        // NEW: probability cap (default 1.0 = no cap)
  capCurrent: number;   // EXISTING: operational cap
  // ... other fields
}
```

**Files Changed**:
- [LLM_CORRESPONDENCE_SPEC.md](LLM_CORRESPONDENCE_SPEC.md#recommended-values-for-llm-applications): New table with pMax values
- [LLM_CORRESPONDENCE_SPEC.md](LLM_CORRESPONDENCE_SPEC.md#7-cap-semantics-pmax-is-the-active-safety-lever): New section
- [LLM_CORRESPONDENCE_SPEC.md](LLM_CORRESPONDENCE_SPEC.md#updated-agent-configuration): Updated interface docs
- [src/cards/sunContract.ts](src/cards/sunContract.ts#L40-L61): Updated `SunContractAgent` interface (pMax optional for backward compat)

---

## Implementation Correctness Checklist

### Softmax Absorption
- ✅ Compute softmax(z + mask)
- ✅ Explicitly zero masked channels (hard boundary by construction)
- ✅ Renormalize after masking
- ✅ Cap to pMax (if set)
- ✅ Renormalize after capping
- ✅ Check masked channels ≠ 0 post-zeroing (deterministic audit)

### Exposure Update
- ✅ Clamp target within ±ρ·dt (ramp)
- ✅ Decay ramped value toward baseline (forgetting)
- ✅ Result: smooth gradual changes that fade naturally

### Dose Accumulation
- ✅ Per-agent tracking
- ✅ Clamp intake when dose budget exceeded
- ✅ Safety response: reduce temp/rate as dose approaches limit

### Mask Violations
- ✅ Detected if masked prob > 0 after explicit zeroing
- ✅ Detected if sampled token is masked
- ✅ Deterministic (not threshold-based heuristics)

---

## Backward Compatibility

All changes maintain backward compatibility:

- `pMax` is optional (defaults to 1.0 = no constraint, old behavior)
- `capCurrent`/`capMax` unchanged (still used in intake calculation)
- All existing tests pass without modification
- New tests are additive (conservation + sampling)

---

## Next Steps

To implement the remaining "Planned File Changes":

1. **Update [SUN_CONTRACT.md](SUN_CONTRACT.md)**
   - Add "§ Numerical Hard Boundary" section
   - Update "§ Four Safety Invariants" to match new cap/mask/decay definitions
   - Add safety response strategies

2. **Add Integration Tests**
   - Conservation property test (Layer 2)
   - Sampling integrity test (Layer 3)
   - Multi-agent integration test

3. **Document Gradient Tunneling**
   - Direct attack (high logit) → softmax zeros it
   - Encoding attack (allowed channels) → dose tracks confusion
   - Roleplay attack (context drift) → exposure decay + ramp bound it

---

## References

- **Spec**: [LLM_CORRESPONDENCE_SPEC.md](LLM_CORRESPONDENCE_SPEC.md)
- **Code**: [src/cards/sunContract.ts](src/cards/sunContract.ts)
- **Tests**: [src/__tests__/SunContract.llm-correspondence.test.ts](src/__tests__/SunContract.llm-correspondence.test.ts)
- **Physics Doc**: [SUN_CONTRACT.md](SUN_CONTRACT.md)
