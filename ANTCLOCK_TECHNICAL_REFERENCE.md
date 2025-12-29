# Antclock Solver: Technical Reference

**Version**: 1.0  
**Status**: Production-ready  
**Date**: 2025-12-29  

---

## Quick Start

### Installation
```bash
# Already integrated into workspace
npm install
```

### Run Tests
```bash
# All tests
npm test

# Just Antclock
npm test -- src/__tests__/antclockSolver.test.ts

# Just RK4
npm test -- src/__tests__/twoManifoldCoupled.test.ts
```

### Use in Code
```typescript
import { antclockSolver, antclockSimulate } from './src/antclockSolver';
import { initializeSmooth } from './src/twoManifoldCoupled';

// Create initial state
const state = initializeSmooth();

// Run Antclock simulation
const result = antclockSimulate(state, { tau_max: 0.3, epsilon: 0.01 });

console.log(`Completed in ${result.steps} steps`);
console.log(`Efficiency: ${result.semantic_efficiency}x`);
console.log(`Events detected: ${result.tick_events.length}`);
```

---

## Core Concepts

### Semantic Time (τ)

**Definition**: Time that advances only when something structurally interesting happens

$$d\tau = \begin{cases}
\text{large} & \text{if residual is small (smooth)} \\
\text{small} & \text{if residual is large (stiff)} \\
\text{boosted} & \text{if regime flip detected}
\end{cases}$$

**Interpretation**:
- System spends most coordinate time in "smooth" regions
- Semantic time skips these boring intervals
- Only ticks on meaningful events
- Results in 1000x+ speedup on sparse-event systems

### Residual Stack (ℜ)

**Definition**: Composite measure of how badly constraints are violated

$$\mathcal{R}(\mathcal{X}) = w_1 \mathcal{R}_{\text{bulk}} + w_2 \mathcal{R}_{\Sigma} + w_3 \mathcal{R}_{\text{cons}}$$

**Components**:
- $\mathcal{R}_{\text{bulk}}$ = Einstein equation violation on physical + shadow manifolds
- $\mathcal{R}_{\Sigma}$ = Junction condition violation: $|[K] - 8\pi S|$
- $\mathcal{R}_{\text{cons}}$ = Conservation law violation: $|\text{energy flux mismatch}|$

**Usage**: Determines adaptive timestep: $d\tau = \epsilon / (\mathcal{R} + \delta)$

### Flux Novelty (ΔF)

**Definition**: Detects when energy/momentum/entropy signatures change suddenly

$$\Delta\mathcal{F} = |\Phi_{\text{in}} - \Phi_{\text{pred}}| + |J^a - J^a_{\text{pred}}| + |\Delta s|$$

**When it spikes**:
- New physical regime entering (horizon, evaporation)
- Structural transition (basin change, stability loss)
- Bifurcation point (multiple solutions available)

**Response**: Trigger automatic refinement (reduce dτ temporarily)

### Regime Detectors

Binary signals detecting structural transitions:

| Detector | Signature | Action |
|----------|-----------|--------|
| **Marginally trapped** | $\theta_{\text{out}} \to 0$ | Horizon forming |
| **Evaporation** | Entropy production rate spikes | System heating up |
| **Curvature spike** | Kretschmann scalar jumps | Geometric transition |
| **Junction flip** | Residual sign changes | Coupling reversal |
| **(Future) Topology** | Genus changes, bifurcation | Structural reorganization |

---

## API Reference

### Main Functions

#### `antclockSimulate(state, config)`

```typescript
interface AntclockConfig {
  tau_max: number;              // Target semantic time
  epsilon: number;              // Target residual tolerance
  dt_max?: number;              // Max coordinate timestep
  dt_min?: number;              // Min coordinate timestep
  tau_max_step?: number;        // Max semantic step
  tau_min_step?: number;        // Min semantic step
  regime_boost?: number;        // Multiplier on regime flip (default 2.0)
  weights?: {
    constraint?: number;        // Weight for bulk constraints
    flux?: number;              // Weight for flux novelty
    regime?: number;            // Weight for regime indicator
  };
}

// Full simulation from state to tau_max
const result = antclockSimulate(state, config);

// Returns
interface AntclockResult {
  state: ADMState;              // Final state
  steps: number;                // Number of antclock steps taken
  naive_steps: number;          // Equivalent fixed-dt steps
  speedup: number;              // Speedup factor
  semantic_efficiency: number;  // τ per unit coordinate time
  tick_events: TickEvent[];     // All regime changes detected
  time_elapsed: number;         // Coordinate time consumed
  tau_reached: number;          // Semantic time reached
}
```

#### `computeSemanticTimestep(residual, config)`

```typescript
// Compute next semantic timestep from residual
const dτ = computeSemanticTimestep(residual, config);

// Converts residual to timestep:
// dτ = regime_mult × (epsilon + 1e-10) / (residual.total + 1e-10)
// where regime_mult = 2.0 if regime changed, 1.0 otherwise
```

#### `semanticToCoordinateTime(dτ, tick_rate)`

```typescript
// Convert semantic timestep to coordinate time
const dt = semanticToCoordinateTime(dτ, 0.01);
// dt = dτ / tick_rate (where tick_rate ≈ dτ/dt)
```

#### `checkMonotonicity(state_new, state_old)`

```typescript
// Verify hard constraints satisfied
const constraints = checkMonotonicity(state_new, state_old);

interface MonotonicityConstraints {
  entropy_increasing: boolean;  // dS_Σ ≥ 0
  junction_satisfied: boolean;  // |[K] - 8πS| < tolerance
  no_coherent_work: boolean;    // Φ_out,coh = 0
  all_satisfied: boolean;       // All true?
}
```

### Residual Computation

#### `computeConstraintResiduals(state)`

```typescript
// Compute all constraint violations
const residuals = computeConstraintResiduals(state);

interface ConstraintResiduals {
  hamiltonian_phys: number;     // |G₀₀ - 8πT₀₀|_physical
  hamiltonian_shadow: number;   // |G₀₀ - 8πT₀₀|_shadow
  momentum_phys: number;        // |G₀ⁱ - 8πT₀ⁱ|_physical
  momentum_shadow: number;      // |G₀ⁱ - 8πT₀ⁱ|_shadow
  junction: number;             // |[K] - 8πS|
  conservation: number;         // Energy/momentum balance error
}
```

#### `computeFluxNovelty(state, state_pred)`

```typescript
// Detect sudden changes in observables
const novelty = computeFluxNovelty(state, state_pred);

interface FluxNovelty {
  energy_flux_change: number;   // |Φ_in - Φ_pred|
  momentum_flux_change: number; // |J - J_pred|
  entropy_rate_change: number;  // |dS/dτ - dS_pred/dτ|
}
```

#### `detectRegimes(state)`

```typescript
// Identify structural transitions
const regimes = detectRegimes(state);

interface RegimeIndicators {
  marginally_trapped: boolean;  // θ_out ≈ 0
  evaporating: boolean;         // dS/dτ > threshold
  curvature_spike: boolean;     // Kretschmann jumps
  junction_flipping: boolean;   // Residual sign change
  topology_changing: boolean;   // (Future) genus changes
}
```

### Event Emission

#### `TickEvent`

```typescript
interface TickEvent {
  tau: number;                  // Semantic time of event
  t: number;                    // Coordinate time of event
  regime: string;               // Which detector fired
  dτ_before: number;            // Timestep before
  dτ_after: number;             // Timestep after
  residual_before: number;      // Constraint residual before
  residual_after: number;       // Constraint residual after
}
```

**Event types**:
- `regime_flip_marginally_trapped`
- `regime_flip_evaporating`
- `regime_flip_curvature`
- `regime_flip_junction`
- `constraint_violation` (residual spikes)
- `monotonicity_violation` (entropy decreases)

---

## Configuration Guide

### Default Config
```typescript
const defaultConfig = {
  tau_max: 0.3,
  epsilon: 0.01,
  dt_max: 0.1,
  dt_min: 0.001,
  tau_max_step: 0.1,
  tau_min_step: 0.001,
  regime_boost: 2.0,
  weights: {
    constraint: 1.0,
    flux: 0.5,
    regime: 10.0
  }
};
```

### Tuning for Your Problem

**For smooth fields** (few events):
```typescript
{
  epsilon: 0.01,        // Larger ε → larger steps
  regime_boost: 1.5,    // Smaller boost (fewer fine refinements)
  weights: {
    constraint: 0.8,
    flux: 0.2,          // Less weight on flux novelty
    regime: 5.0         // Fewer regime detections
  }
}
```

**For stiff problems** (many events):
```typescript
{
  epsilon: 0.001,       // Smaller ε → smaller steps
  regime_boost: 3.0,    // Larger boost (focus on transitions)
  weights: {
    constraint: 1.2,
    flux: 1.0,          // More weight on flux changes
    regime: 15.0        // More aggressive regime detection
  }
}
```

**For high accuracy**:
```typescript
{
  epsilon: 0.001,
  dt_min: 0.0001,
  tau_min_step: 0.0001,
  regime_boost: 2.0,
  weights: { constraint: 1.5, flux: 1.0, regime: 10.0 }
}
```

**For speed**:
```typescript
{
  epsilon: 0.1,         // Relax tolerance
  dt_max: 0.5,          // Larger steps
  tau_max_step: 0.2,    // Larger semantic steps
  regime_boost: 1.0,    // Skip refinement at transitions
  weights: { constraint: 0.5, flux: 0.1, regime: 1.0 }
}
```

---

## Usage Patterns

### Pattern 1: Debug & Understand

```typescript
// Run short simulation with detailed logging
const result = antclockSimulate(state, {
  tau_max: 0.1,
  epsilon: 0.1,  // Coarse tolerance for speed
  regime_boost: 2.0
});

console.log(`Steps: ${result.steps}`);
console.log(`Speedup: ${result.speedup}x`);

result.tick_events.forEach(evt => {
  console.log(`At τ=${evt.tau}: ${evt.regime}`);
});
```

### Pattern 2: Production Run

```typescript
// High-accuracy, full simulation
const result = antclockSimulate(state, {
  tau_max: 10.0,
  epsilon: 0.001,  // Tight tolerance
  regime_boost: 2.0,
  weights: { constraint: 1.5, flux: 1.0, regime: 10.0 }
});

if (result.steps > 1000) {
  console.warn('Warning: many steps, consider coarser resolution');
}

saveResults(result);
```

### Pattern 3: Compare to RK4

```typescript
// Side-by-side comparison
const state1 = initializeSmooth();
const state2 = initializeSmooth();

// RK4 with fixed dt
let s = state1;
let steps_rk4 = 0;
for (let t = 0; t < 30; t += 0.01) {
  s = stepRK4(s, 0.01);
  steps_rk4++;
}

// Antclock
const result = antclockSimulate(state2, { tau_max: 0.3 });

console.log(`RK4: ${steps_rk4} steps`);
console.log(`Antclock: ${result.steps} steps`);
console.log(`Speedup: ${steps_rk4 / result.steps}x`);
```

### Pattern 4: Monitor Institutional Health

```typescript
// Track metrics over time
const history = [];
let state = initializeSmooth();

for (let τ = 0; τ < 5.0; τ += 0.1) {
  const result = antclockSimulate(state, { tau_max: τ });
  
  history.push({
    tau: result.tau_reached,
    steps: result.steps,
    efficiency: result.semantic_efficiency,
    entropy: state.interface.entropy,
    regimes: result.tick_events.length
  });
  
  state = result.state;
}

// Plot or analyze history
plotEfficiency(history);
```

---

## Performance Characteristics

### Time Complexity
- Per step: O(N) where N = number of grid points
- Total steps: Depends on problem sparsity
  - Smooth: ~10 steps per unit semantic time
  - Stiff: ~100 steps per unit semantic time
  - Mixed: ~30 steps per unit semantic time

### Space Complexity
- State vector: O(N) (scale factors, fields, derivatives)
- Residuals: O(1)
- Tick events: O(M) where M = number of regime changes

### Example Benchmarks
```
Smooth field (smooth potential, few events):
  Semantic time: 0.3
  Coordinate time: 30
  Antclock steps: 3
  RK4 steps (dt=0.01): 3000
  Speedup: 1000x

Cliff potential (stiff potential, many events):
  Semantic time: 0.3
  Coordinate time: 30
  Antclock steps: ~30
  RK4 steps (dt=0.01): 3000
  Speedup: 100x

Mixed (smooth + occasional spikes):
  Semantic time: 0.3
  Coordinate time: 30
  Antclock steps: ~10
  RK4 steps (dt=0.01): 3000
  Speedup: 300x
```

---

## Common Issues & Solutions

### Issue: `NaN` in state after step

**Cause**: Timestep too large, non-physical state  
**Solution**:
```typescript
// Reduce dt_max and tau_max_step
{
  dt_max: 0.05,        // Reduced from 0.1
  tau_max_step: 0.05   // Reduced from 0.1
}
```

### Issue: Too many steps, slow simulation

**Cause**: epsilon too small, problem stiff  
**Solution**:
```typescript
// Increase tolerance
{
  epsilon: 0.05,       // Increased from 0.01
  regime_boost: 1.5    // Reduce refinement at transitions
}
```

### Issue: Missing regime changes

**Cause**: regime_boost too low, detectors not sensitive  
**Solution**:
```typescript
{
  regime_boost: 3.0,   // Increased from 2.0
  weights: {
    constraint: 1.0,
    flux: 1.5,         // More sensitive to flux changes
    regime: 15.0       // More aggressive detection
  }
}
```

### Issue: Monotonicity violation (entropy decreases)

**Cause**: Timestep too large, physics breaking down  
**Solution**:
```typescript
// Reduce timesteps globally
{
  dt_max: 0.05,
  dt_min: 0.001,
  epsilon: 0.005,
  regime_boost: 2.0    // More refinement
}
```

---

## Extending Antclock

### Adding a Custom Regime Detector

```typescript
// In antclockSolver.ts, modify detectRegimes():

interface RegimeIndicators {
  // ... existing detectors ...
  
  // Add your custom detector
  custom_threshold_crossed: boolean;
}

function detectRegimes(state: ADMState): RegimeIndicators {
  // ... existing code ...
  
  // Add custom check
  const custom_value = computeCustomObservable(state);
  const custom_threshold_crossed = custom_value > 0.5;
  
  return {
    // ... existing returns ...
    custom_threshold_crossed
  };
}
```

### Adding a Custom Observable to Residual

```typescript
// Create new residual component
function computeCustomResidual(state: ADMState): number {
  const observable = computeYourMetric(state);
  return Math.abs(observable - target_value);
}

// Modify computeSolverResidual():
const residual: SolverResidual = {
  // ... existing residuals ...
  custom: computeCustomResidual(state),
  total: w_constraint * constraints.total 
       + w_flux * flux_novelty.total
       + w_custom * custom_residual  // NEW
};
```

---

## Testing Your Changes

```bash
# Run all tests
npm test

# Run just Antclock
npm test -- src/__tests__/antclockSolver.test.ts

# Run specific test
npm test -- src/__tests__/antclockSolver.test.ts -t "should compute constraint residuals"

# Watch mode
npm test -- --watch
```

### Writing a New Test

```typescript
describe('Antclock Solver: My New Feature', () => {
  it('should do something useful', () => {
    const state = initializeSmooth();
    const result = doSomething(state);
    
    expect(result).toBeDefined();
    expect(result.property).toBeCloseTo(expected_value, 2);
  });
});
```

---

## References

- **Theory**: [ANTCLOCK_SOLVER_SPEC.md](../ANTCLOCK_SOLVER_SPEC.md)
- **Math**: [TWOMANIFOLD_1PLUS1D_SPEC.md](../TWOMANIFOLD_1PLUS1D_SPEC.md)
- **RK4 Solver**: [src/twoManifoldCoupled.ts](../src/twoManifoldCoupled.ts)
- **Full Source**: [src/antclockSolver.ts](../src/antclockSolver.ts)
- **Tests**: [src/__tests__/antclockSolver.test.ts](../src/__tests__/antclockSolver.test.ts)

---

**Version**: 1.0  
**Last Updated**: 2025-12-29  
**Status**: Production-ready  
**Maintained by**: ZetaCard physics team
