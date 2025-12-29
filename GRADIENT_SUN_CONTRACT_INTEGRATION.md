# Integrating Gradient Invariant with Sun Contract

**Date**: 2025-12-29  
**Purpose**: Show how the gradient invariant strengthens Sun Contract safety guarantees

---

## Overview

The **Sun Contract** provides bounded safety for unbounded sources through caps, ramps, dose limits, and externality audits.

The **Gradient Invariant** explains *why* those bounds work and what happens when institutions try to force compliance without reshaping the field.

Together, they form a complete safety and stability framework.

---

## Core Insight: Why Sun Contract Works

A Sun Contract succeeds because it **respects the gradient invariant**.

### Cap Invariant ↔ Reshape the Field

**Sun Contract states**: Agent absorption capped at $A_a(t) \leq \text{cap}_a(t)$.

**Gradient interpretation**:

The cap is NOT a command ("process slower!"). It's a field modification:

$$\Phi_{\text{with\_cap}}(x) = \begin{cases}
\Phi_0(x) & \text{if } A(x) \leq \text{cap} \\
\Phi_0(x) + \lambda(A(x) - \text{cap})^2 & \text{if } A(x) > \text{cap}
\end{cases}$$

Where:
- Below cap: normal potential
- Above cap: steep penalty (infinite gradient)

**Result**: Natural equilibrium forms at the cap. No coercion required.

Compare to an institution that just says "work slower!":
- Without field work: agents burn out or ignore the directive
- With field work (cap): motion naturally stops at the boundary

### Ramp Invariant ↔ Smooth the Field

**Sun Contract states**: Exposure rate of change bounded: $|\frac{dA_a}{dt}| \leq \rho_a$.

**Gradient interpretation**:

Exposure changes are ramped (gradual), not abrupt. This ensures:

$$\frac{d}{dt}(\nabla\Phi) = \text{bounded}$$

If $\nabla\Phi$ changes suddenly, agents far from equilibrium get shocked:
- Old equilibrium no longer valid
- New equilibrium might be far away
- Forced transition requires coercion
- Rebound when pressure releases

By ramping, you keep agents in quasi-equilibrium throughout.

### Dose Invariant ↔ Cumulative Cost Awareness

**Sun Contract states**: Cumulative unprocessed intake bounded: $D_a = \int_0^t \max(0, A_a(\tau) - P_a(\tau)) d\tau \leq B_a$.

**Gradient interpretation**:

This is tracking **work against the gradient**. 

If an agent absorbs faster than they can process, the "excess" is dose—accumulated unresolved potential. This represents:
- Stress accumulating
- Decisions deferred
- Cognition stolen by backlog
- Burnout building up

The dose limit ensures this hidden cost doesn't grow unbounded.

$$\text{Dose} = \text{Integral of motion-against-gradient over time}$$

When dose hits the bound, intake must drop (field work). This prevents hidden coercion.

### Externality Invariant ↔ System Integrity

**Sun Contract states**: Side effects (harms to others) bounded: $X_a(t) \leq \Xi_a$.

**Gradient interpretation**:

Externalities are the result of **agents pushed far from safe basins**.

When an agent is in a bad state (due to coercion), they hurt others. The externality bound prevents cascade failures.

$$\text{Externalities} \propto \text{Distance from safe basin}$$

With proper field work (good basin placement), externalities stay low naturally.

---

## The Integration: Sun Contract + Gradient Invariant

### 1. Diagnosis: Is the contract being violated?

Check the **gradient**:

| Symptom | Cause | Fix |
|---------|-------|-----|
| High coercion force | Steep gradient | Field work (restructure) |
| Increasing burnout despite caps | Hidden coercion in ramp | Slower ramp, more support |
| Dose accumulating despite limit | Backlog building up | Increase processing capacity |
| High externalities | Agents far from safe basin | Better field design |

### 2. Prevention: Design contracts that respect gradients

Every Sun Contract should declare:

```
FIELD DECLARATION
-----------------
Potential function: Φ(x) = ...
Gradient at cap: ∇Φ(x) → ∞ as x → cap ✓
Gradient at ramp boundary: smooth, predictable ✓
Dose accumulation rate: [calculation] ✓
Externality sources: [identification] ✓
```

### 3. Monitoring: Detect when coercion starts

```
COERCION DETECTION
------------------
If coercion_force.magnitude > 0 for continuous time T:
  Alert: Institution is doing motion work instead of field work
  Likely cause: Cap/ramp too tight for actual intake
  Fix: Increase capacity (field work)
```

### 4. Adjustment: When bounds need changing

If a Sun Contract bound needs to be tightened:

1. **Do NOT just tighten the bound** (causes coercion)
2. **Reshape the field**:
   - Reduce intake at source
   - Increase processing capacity
   - Automate routine cases
   - Add parallel workers
3. **Then tighten the bound** (now agents can naturally stay within it)

---

## Example: Overloaded Help Desk

### Scenario

Help desk receives 100 requests/day but can process 80/day.

**Bad approach**: Cap intake at 80, force queue discipline.
- Creates coercion (agents ignore cap)
- Customers get angry (externality)
- Dose accumulates (backlog grows)
- Contract "fails"

**Good approach**: Reshape field first.

1. **Reduce incoming rate** (field work):
   - Improve FAQ, self-service
   - Better routing rules
   - Reduce customer confusion

2. **Increase processing capacity** (field work):
   - Better tools
   - Better training
   - Parallelization

3. **Smooth the ramp**:
   - Phase in higher intake gradually
   - Monitor dose accumulation

4. **Set bounds** (now realistic):
   - Cap at 95 (achievable naturally)
   - Ramp at 10/day (smooth, predictable)
   - Dose limit protects against sudden spikes

**Result**: Help desk stays in good basin. No coercion. Stable.

---

## Mathematical Integration

### Sun Contract Formal Addition

Extend Sun Contract with gradient declarations:

$$\text{Contract} = (\text{Cap}, \text{Ramp}, \text{Dose}, \text{Externality}) + (\Phi, \nabla\Phi, \rho_{\text{coercion}})$$

Where:
- $(\Phi, \nabla\Phi)$ = the potential field being designed
- $\rho_{\text{coercion}}$ = coercion force (should be near zero)

**Safety condition**:

$$\rho_{\text{coercion}}(t) \to 0 \quad \text{as } t \to \infty$$

If this fails, the contract is broken (institution doing motion work).

### Spectral Monitor

Monitor the FFT of coercion over time:

$$\hat{\rho}_k = \text{FFT}(\rho_{\text{coercion}}(t))$$

**Healthy spectrum**:
- Dominated by $k=0$ (constant, decaying average)
- Exponential decay in higher modes
- No spikes or oscillations

**Unhealthy spectrum**:
- Spiking modes (coercion-release cycles)
- Persistent high-frequency (constant struggles)
- Indicates hidden field problems

---

## Governance: Gradient Invariant as Contract Law

### Declaration Requirement

Every institution using Sun Contracts must declare:

```
GRADIENT INVARIANT COMPLIANCE
------------------------------

We commit to:

1. ✓ Explicit field design (Φ declared)
2. ✓ Gradient visibility (agents see ∇Φ)
3. ✓ Minimal coercion (ρ_coercion → 0)
4. ✓ Field work budgeted (resources allocated to reshape Φ)
5. ✓ Spectral monitoring (watch for coercion cycles)

Violations trigger immediate audit.
Sustained violations = contract breach.
```

### Audit Procedure

When a Sun Contract is suspected of violating the gradient invariant:

1. **Measure coercion force**: Is $\rho_{\text{coercion}}(t) \not\to 0$?
2. **Compute spectrum**: Are there spiking modes?
3. **Trace to field**: Which part of $\Phi$ needs reshaping?
4. **Mandate field work**: Allocate resources to reshape it
5. **Monitor gradient**: Verify $\nabla\Phi$ improves

---

## Why This Matters

### Before Gradient Invariant Integration

Sun Contracts provide bounds, but institutions could still:
- Coerce within the bounds
- Hide burnout as "personal issues"
- Call motion work "motivation"
- Claim caps are tight because "standards are high"

### After Integration

Sun Contracts + Gradient Invariant means:
- **Coercion is measurable** (it shows up in $\rho_{\text{coercion}}$)
- **Burnout is a system problem**, not personal failure
- **Motivation is replaced by field design**
- **Caps are achievable**, not heroic

Institutions that respect both are stable, predictable, and ethical—not because they're good, but because the math forbids alternatives.

---

## Implementation Checklist

- [ ] Declare $\Phi$ for each critical process
- [ ] Compute $\nabla\Phi$ at current operating point
- [ ] Set Sun Contract caps at natural equilibrium
- [ ] Budget field work (separate from motion work)
- [ ] Implement spectral monitoring
- [ ] Create gradient violation audit procedure
- [ ] Train leadership on field vs. motion distinction
- [ ] Update contracts to include gradient declarations

---

## Reference

- **Gradient Invariant**: ZETA_GRADIENT_INVARIANT.md
- **Sun Contract**: SUN_CONTRACT.md
- **Case Study**: src/approvalQueueCase.ts
- **Tests**: src/__tests__/gradientInvariant.test.ts
