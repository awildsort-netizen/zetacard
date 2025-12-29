# Contract Physics Engine

A deterministic, executable framework for analyzing contract dynamics using physical modeling. This implementation provides exact gradients, stable finite differences, and per-agent capacity modeling.

## Overview

The Contract Physics Engine models contracts as physical systems with:
- **Potential fields** that capture multi-dimensional contract state
- **Forces** derived from exact gradients
- **Kinematics** computed from discrete-time trajectories
- **Agent capacity** and harm metrics
- **Zeta scores** for overall health assessment

## Mathematical Foundation

### State Vector (8 dimensions)

Contracts are represented as 8-dimensional state vectors:

```typescript
type Vec = [
  money,         // x1: financial resources
  time,          // x2: time invested
  outcomes,      // x3: deliverable quality
  quality,       // x4: process quality
  pace,          // x5: velocity of progress
  legal_risk,    // x6: compliance/legal exposure
  uncertainty,   // x7: ambiguity level
  cognitive_load // x8: mental burden
]
```

### Total Potential Φ_c(x)

The total potential combines three terms:

```
Φ_c(x) = Φ_base(x) + Φ_int(x) + Φ_cliff(x)
```

1. **Base term** (softplus-smoothed):
   ```
   Φ_base(x) = Σ w_i * softplus(α_i(x_i - μ_i))
   ```

2. **Interaction terms** (coupling effects):
   ```
   Φ_int(x) = w_mp * x1*x5 + w_to * x2*x3
   ```
   - `x1*x5`: money × pace (resource-velocity coupling)
   - `x2*x3`: time × outcomes (investment-return coupling)

3. **Cliff term** (legal risk):
   ```
   Φ_cliff(x) = C_cliff * ReLU(x6 - θ)^q
   ```

### Force Field F_c(x)

Forces are the negative gradient of the potential:

```
F_c(x) = -∇Φ_c(x)
```

With exact derivatives:
- Base: `∂/∂x_i = w_i * α_i * σ(α_i(x_i - μ_i))` where σ is sigmoid
- Interactions: `∂/∂x1 = w_mp*x5`, `∂/∂x5 = w_mp*x1`, etc.
- Cliff: `∂/∂x6 = C_cliff * q * (x6-θ)^(q-1)` if x6 > θ, else 0

### Kinematics

From discrete-time logs with timestamps `t[k]` and states `x[k]`:

```
v[k] = (x[k] - x[k-1]) / dt
a[k] = (v[k] - v[k-1]) / dt
```

With stability: `dt = max(t[k] - t[k-1], dt_min)` where `dt_min = 1e-6`

### Agent Metrics

1. **Capacity**: `g_a = C_a / τ_a` where `C_a = c0 + c1*x1 + c2*(1-x8)`

2. **G-force**: `G_a = |a| / g_a`

3. **Instantaneous harm**:
   ```
   h_a = α*[max(0, G-G0)]^p + β*[max(0, x6-θ6)]^r
   ```

4. **Cumulative harm**: `H_a = Σ h_a * dt`

5. **Exposure**: `E_a = Σ w_a * |F| * dt`

6. **Zeta score**:
   ```
   ζ_a = exp(-λ1*H_a - λ2*[max(0, Gpeak-G0)]^s)
   ```

### Orbit Classification

Contracts are classified based on exposure (E) and peak G-force (Gpeak):

- **Comet**: High Gpeak (≥3), low E — sudden bursts
- **Planet**: High E, low Gpeak (≤2) — sustained effort
- **Spiky Planet**: Both high — intense sustained work
- **Drift**: Both low — minimal activity

## Usage

### Basic Potential and Force

```typescript
import { phi_c, grad_phi_c, force_c, DEFAULT_PHI_PARAMS } from './contractPhysics';

const state = [0.6, 0.5, 0.7, 0.8, 0.5, 0.3, 0.4, 0.6];

const potential = phi_c(state, DEFAULT_PHI_PARAMS);
const gradient = grad_phi_c(state, DEFAULT_PHI_PARAMS);
const force = force_c(state, DEFAULT_PHI_PARAMS);
```

### Agent Scoring

```typescript
import { scoreAgent, DEFAULT_PHI_PARAMS, DEFAULT_AGENT_PARAMS } from './contractPhysics';

const times = [0, 1, 2, 3, 4];
const trajectory = [
  [0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5],
  [0.55, 0.55, 0.55, 0.55, 0.55, 0.55, 0.55, 0.55],
  [0.6, 0.6, 0.6, 0.6, 0.6, 0.6, 0.6, 0.6],
  [0.65, 0.65, 0.65, 0.65, 0.65, 0.65, 0.65, 0.65],
  [0.7, 0.7, 0.7, 0.7, 0.7, 0.7, 0.7, 0.7],
];

const result = scoreAgent(times, trajectory, undefined, DEFAULT_PHI_PARAMS, DEFAULT_AGENT_PARAMS);
console.log('Harm:', result.H);
console.log('Peak G:', result.Gpeak);
console.log('Exposure:', result.E);
console.log('Zeta:', result.zeta);
```

### Orbit Classification

```typescript
import { classifyOrbit } from './contractPhysics';

const orbit = classifyOrbit(
  result.E,      // exposure
  result.Gpeak,  // peak G-force
  50,            // E_low (30th percentile)
  150            // E_high (70th percentile)
);

console.log('Orbit type:', orbit); // 'comet' | 'planet' | 'spiky_planet' | 'drift'
```

### Sun Contracts (Bounded Force)

For contracts with unbounded potential (e.g., open-ended funding), use bounded force:

```typescript
import { force_c, boundedForce, DEFAULT_PHI_PARAMS } from './contractPhysics';

const state = [0.95, 0.95, 0.95, 0.95, 0.95, 0.95, 0.95, 0.95];
const unboundedForce = force_c(state, DEFAULT_PHI_PARAMS);
const safeForceSun = boundedForce(unboundedForce, 10); // Cap at magnitude 10
```

This prevents runaway acceleration while preserving direction.

### Custom Parameters

```typescript
import { type PhiParams, type AgentParams, DEFAULT_PHI_PARAMS, DEFAULT_AGENT_PARAMS } from './contractPhysics';

// Customize potential parameters
const customPhiParams: PhiParams = {
  ...DEFAULT_PHI_PARAMS,
  w: [3.0, 1.0, 2.5, 0.8, 1.2, 5.0, 0.8, 0.9], // Higher weight on money
  C_cliff: 10.0,    // Steeper legal cliff
  theta_legal: 0.7, // Lower legal threshold
};

// Customize agent parameters
const customAgentParams: AgentParams = {
  ...DEFAULT_AGENT_PARAMS,
  tau: 1,      // Small team (1-day response)
  G0: 0.8,     // Lower tolerance
  beta: 10.0,  // Higher legal penalty
};

const result = scoreAgent(times, trajectory, undefined, customPhiParams, customAgentParams);
```

## Parameter Presets

### Default Phi Parameters

Stable, non-extreme values for general use:

```typescript
const DEFAULT_PHI_PARAMS: PhiParams = {
  w: [1.0, 1.2, 1.1, 0.8, 1.5, 2.0, 0.8, 0.9],
  alpha: [5, 5, 5, 5, 5, 5, 5, 5],
  mu: [0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5],
  w_mp: 2.0,
  w_to: 1.5,
  C_cliff: 5.0,
  theta_legal: 0.8,
  q: 2,
};
```

### Agent Capacity Presets

**Organization-level** (default):
```typescript
tau: 7 days    // Week-long response time
G0: 1.0        // Standard tolerance
```

**Small team**:
```typescript
tau: 1 day     // Daily response
G0: 1.0
```

**Emergency mode**:
```typescript
tau: 0.25 days // Quarter-day response
G0: 0.5        // Lower threshold
alpha: 2.0     // Higher sensitivity
```

## Key Features

### 1. Numerical Stability

- Stable softplus implementation for large positive/negative values
- Minimum time step clamping (`dt_min = 1e-6`)
- Zero-division protection in capacity and G-force calculations

### 2. Exact Gradients

Gradients are computed analytically (not via finite differences) for:
- Correctness
- Speed
- Numerical precision

Finite difference validation is provided in tests.

### 3. Deterministic

Given the same inputs, the engine always produces identical outputs. No randomness.

### 4. Type-Safe

Full TypeScript type definitions for all parameters, state vectors, and return values.

### 5. Tested

Comprehensive test suite covering:
- Mathematical functions
- Gradient correctness (finite difference validation)
- Agent scoring
- Edge cases (zero acceleration, small time steps, extreme values)
- Orbit classification

## Examples

Run the examples file for detailed demonstrations:

```bash
npx tsx src/contractPhysicsExample.ts
```

This shows:
1. Basic potential and force computation
2. Steady growth trajectory
3. Crisis mode (high acceleration)
4. Legal risk threshold crossing
5. Sun contracts with bounded force
6. Different agent capacities
7. Custom parameters

## Theory

### Why Physical Modeling?

Physical modeling provides:
- **Interpretability**: Forces, accelerations, and energy are intuitive
- **Composability**: Potentials combine naturally
- **Conservation laws**: Energy-based analysis
- **Predictability**: Trajectories follow physical laws

### Softplus vs ReLU

Softplus is used for base terms because:
- It's differentiable everywhere (no kink at 0)
- It approximates ReLU for large |x|
- It provides smooth gradients for optimization

ReLU is used for cliff terms because:
- Sharp threshold behavior is desired
- Gradient is explicitly handled (zero below threshold)

### Zeta Score Interpretation

- `ζ ≈ 1.0`: Healthy, low harm
- `ζ ≈ 0.6-0.8`: Moderate stress
- `ζ < 0.5`: High harm, intervention needed
- `ζ < 0.1`: Critical, severe damage

## Implementation Notes

- All vectors are length 8 by default
- Time units are arbitrary but must be consistent (e.g., days)
- State values typically normalized to [0, 1] range
- Force/gradient magnitudes depend on parameter scaling

## Integration with ZetaCard

This module is self-contained and can be used:
- Standalone for contract analysis
- As part of ZetaCard semantic VM
- With external logging systems
- For real-time monitoring

## References

- Mathematical specification from problem statement
- Spectral-dynamical modeling (ZetaCard core)
- Physical potential field theory
- Discrete-time kinematics

## License

Same as parent project (zetacard).
