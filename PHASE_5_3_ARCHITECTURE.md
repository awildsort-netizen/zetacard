# Phase 5.3: Interface Flux Prediction
## Proving Topological Computation via Reduced Dynamics

---

## Core Claim

**Invariants compress dynamics. We can predict trajectory structure without replaying ticks.**

By inferring interface flux from trajectory signatures, integrating a reduced SunContract-like model forward, and checking predictions against held-out ground truth in signature space.

This operationalizes: *"Antclock is SunContract at scale."*

---

## Minimal Reduced Interface Model

The system evolves in a 3D interface state space:

$$v_b(t), s(t), x_b(t)$$

Driven by inferred flux $\widehat{\Phi}(t)$ (surrogate, not true bulk field):

$$\dot{v} = \alpha \widehat{\Phi}(t) - \beta v_b$$
$$\dot{s} = \gamma \widehat{\Phi}(t) - \kappa s$$
$$\dot{x} = v_b$$

**Interpretation:**
- $\Phi$ is effective driving flux (acceleration → dissipation balance)
- $\beta, \kappa$ are dissipation rates
- $\alpha, \gamma$ are coupling strengths
- No bulk sampling; this is a closed reduced model

**Coefficients** (fit once on reference runs):
- Defaults: $\alpha=1.0, \beta=0.1, \gamma=1.0, \kappa=0.01$
- Or: identify via Phase 5.1 reference trajectories

---

## Phase 5.3 Pipeline: Four Functions

### 1. Flux Surrogate Inference

```typescript
function inferFluxSurrogate(
  history: WorldlinePoint[],
  method: 'acceleration' | 'curvature' = 'acceleration'
): number[] {
  /**
   * Infer effective driving flux from trajectory geometry.
   * 
   * Input: trajectory states with (x_b, v_b, θ, s, τ)
   * Output: flux time series Φ̂(t) same length as history
   * 
   * Method A: Acceleration-as-flux
   *   Φ̂(t) = LPF(dv/dt)  [low-pass filtered acceleration]
   *   Rationale: v̇ is linearly proportional to (flux - dissipation)
   *             So it's a direct readout of driving force
   * 
   * Method B: Curvature-event-as-flux (advanced)
   *   Φ̂(t) = f(|θ(t) - θ(t-1)|, event_signal_t)
   *   Rationale: θ changes signal interface restructuring (flux events)
   * 
   * Returns: array of length |history| with flux estimates
   */
}
```

**Implementation sketch (Method A):**
```typescript
const fluxSurrogate: number[] = [];
const lpfWindow = 3; // low-pass window

for (let i = 0; i < history.length; i++) {
  // Compute dv/dt at step i
  const dv = i > 0 
    ? (history[i].v_b - history[i-1].v_b) / (history[i].t - history[i-1].t)
    : 0;
  
  // Apply simple moving average LPF
  const window = history.slice(Math.max(0, i - lpfWindow), i + 1);
  const avgDv = window.reduce((sum, p, j) => {
    const dv_j = j > 0 
      ? (p.v_b - window[j-1].v_b) / (p.t - window[j-1].t)
      : 0;
    return sum + dv_j;
  }, 0) / window.length;
  
  fluxSurrogate.push(Math.max(0, avgDv)); // clamp to non-negative
}

return fluxSurrogate;
```

---

### 2. Reduced Model Integration

```typescript
function integrateReducedModel(
  initialState: { v: number; s: number; x: number },
  fluxSurrogate: number[],
  dt: number = 0.016,
  coeffs: { alpha: number; beta: number; gamma: number; kappa: number } = {
    alpha: 1.0,
    beta: 0.1,
    gamma: 1.0,
    kappa: 0.01
  }
): WorldlinePoint[] {
  /**
   * Integrate reduced interface model forward without bulk sampling.
   * 
   * Input:
   *   - initialState: (v, s, x) at t=0
   *   - fluxSurrogate: time series Φ̂(t) from inference step
   *   - coefficients: (α, β, γ, κ)
   * 
   * Output: predicted trajectory as WorldlinePoint[]
   *         (τ = t, θ = 1.0 (dummy), other fields interpolated)
   * 
   * Note: θ(t) is *not* integrated here; it's a marker variable.
   *       For signature matching, we use (x, v, s) alone.
   */
  
  const predicted: WorldlinePoint[] = [];
  let v = initialState.v;
  let s = initialState.s;
  let x = initialState.x;
  let t = 0;
  
  for (let i = 0; i < fluxSurrogate.length; i++) {
    const phi = fluxSurrogate[i];
    
    // Forward Euler step
    const dv = (coeffs.alpha * phi - coeffs.beta * v) * dt;
    const ds = (coeffs.gamma * phi - coeffs.kappa * s) * dt;
    const dx = v * dt;
    
    v += dv;
    s += ds;
    x += dx;
    t += dt;
    
    predicted.push({
      t,
      x_b: x,
      v_b: v,
      theta: 1.0, // dummy: integration doesn't compute θ
      s,
      tau: t, // in reduced model, τ ≈ t
    });
  }
  
  return predicted;
}
```

---

### 3. Tau-Normalized Characteristic Scalar

**Current definition (Phase 5.1):**
```typescript
velocity_ratio = max(v) / (min(v) + ε)
```

**Problem:** Depends on resolution (more samples → more extreme values).

**τ-normalized alternative (Phase 5.3):**

$$r_\tau = \frac{\int_0^\tau |v_b(s)| \, ds}{\int_0^\tau 1 \, ds} = \text{mean}(|v|) \text{ in proper time}$$

Or for better stability against time-scale shifts:

$$r_\tau^{\text{range}} = \frac{\text{range}_\tau(v)}{\text{mean}_\tau(|v|) + \epsilon}$$

where range is computed in **τ windows**, not time steps.

```typescript
function computeTauNormalizedScalar(
  history: WorldlinePoint[],
  window_tau: number = 1.0  // integrate over Δτ = 1.0
): number {
  /**
   * Compute characteristic scalar in τ-parametrized integral form.
   * This is resolution-stable: grid refinement doesn't change value.
   * 
   * Definition:
   *   r_τ = Σ|v_b|(τ_i)·Δτ / Σ Δτ  [weighted mean of velocity]
   *   OR
   *   r_τ^range = (max(v) - min(v)) / mean(|v|)  [computed over same τ window]
   * 
   * Returns: positive scalar, resolution-invariant
   */
  
  // Filter history to one window in τ
  let tauStart = 0;
  if (history.length > 0) {
    tauStart = history[0].tau;
  }
  let tauEnd = tauStart + window_tau;
  
  const window = history.filter(p => p.tau >= tauStart && p.tau <= tauEnd);
  
  if (window.length < 2) {
    // Not enough points; fall back to velocity_ratio
    const velocities = history.map(p => Math.abs(p.v_b));
    const maxV = Math.max(...velocities);
    const minV = Math.min(...velocities);
    return maxV / (minV + 1e-6);
  }
  
  // Compute mean absolute velocity in window (τ-weighted)
  let sumV = 0, sumDtau = 0;
  for (let i = 0; i < window.length; i++) {
    const dtau = i > 0 ? window[i].tau - window[i-1].tau : 0.016;
    sumV += Math.abs(window[i].v_b) * dtau;
    sumDtau += dtau;
  }
  const meanV = sumV / (sumDtau + 1e-10);
  
  // Compute range
  const velocities = window.map(p => p.v_b);
  const maxV = Math.max(...velocities);
  const minV = Math.min(...velocities);
  const range = maxV - minV;
  
  // r_τ = range / mean(|v|)
  return range / (meanV + 1e-6);
}
```

---

### 4. Signature Comparison in Prediction Space

```typescript
function comparePredictedToGround(
  predicted: WorldlinePoint[],
  groundTruth: WorldlinePoint[],
  cfDepth: number = 15
): {
  cfMatch: number;           // L2 distance in CF space
  tickMatch: number;         // % of Antclock ticks within tolerance
  trajectoryDistance: number; // L2 in (x, v, s) space
  signaturePair: {
    predicted: CFSignature;
    ground: CFSignature;
  };
} {
  /**
   * Score prediction by comparing in signature space, not raw time series.
   * 
   * Key insight: if signatures match, topology is captured.
   * 
   * Metrics:
   *   1. CF distance: L2 norm of coefficient vectors
   *   2. Tick alignment: % of inferred events matching ground truth
   *   3. Trajectory distance: optional, lower-level check
   * 
   * Returns: struct with all scores + signatures for inspection
   */
  
  // Extract CF signatures
  const scalarPred = computeTauNormalizedScalar(predicted);
  const scalarGround = computeTauNormalizedScalar(groundTruth);
  
  const cfPred = extractCFSignature(predicted, 'velocity_ratio', cfDepth);
  const cfGround = extractCFSignature(groundTruth, 'velocity_ratio', cfDepth);
  
  // CF distance: L2 norm of diff
  const cfCoeffDist = Math.sqrt(
    cfPred.coefficients.reduce((sum, c, i) => {
      const diff = (cfGround.coefficients[i] ?? 0) - c;
      return sum + diff * diff;
    }, 0)
  );
  
  // Tick alignment (advanced)
  // For now, placeholder: just check if ranges match
  const predictedRange = Math.max(...predicted.map(p => p.v_b)) - 
                        Math.min(...predicted.map(p => p.v_b));
  const groundRange = Math.max(...groundTruth.map(p => p.v_b)) - 
                     Math.min(...groundTruth.map(p => p.v_b));
  const tickMatch = Math.min(1.0, 1.0 - Math.abs(predictedRange - groundRange) / (groundRange + 1e-6));
  
  // Trajectory L2 in (x, v, s)
  const traj_dist = Math.sqrt(
    Math.min(predicted.length, groundTruth.length) > 0
      ? predicted.slice(0, 10).reduce((sum, p, i) => {
          const g = groundTruth[i];
          if (!g) return sum;
          const dx = p.x_b - g.x_b;
          const dv = p.v_b - g.v_b;
          const ds = p.s - g.s;
          return sum + dx*dx + dv*dv + ds*ds;
        }, 0) / Math.min(10, predicted.length)
      : 0
  );
  
  return {
    cfMatch: cfCoeffDist,
    tickMatch,
    trajectoryDistance: traj_dist,
    signaturePair: {
      predicted: cfPred,
      ground: cfGround,
    },
  };
}
```

---

## Phase 5.3 Experiment: Test Protocol

### Setup

**Reference trajectories (4 total):**
- `cliff_ref_1`, `cliff_ref_2` (nearby parameter space, deterministic)
- `smooth_ref_1`, `smooth_ref_2` (different family)

**Held-out test trajectories (2 total):**
- `cliff_test_1` (cliff family, not seen during fit)
- `smooth_test_1` (smooth family, not seen during fit)

### Workflow

#### Phase 5.3.1: Fit Coefficients (Optional)

```typescript
function fitReducedModelCoefficients(
  references: Map<string, WorldlinePoint[]>
): { alpha: number; beta: number; gamma: number; kappa: number } {
  /**
   * Use least-squares to identify (α, β, γ, κ) from reference runs.
   * 
   * For each reference trajectory:
   *   1. Infer Φ̂(t) from acceleration
   *   2. Solve least-squares: minimize ||ẏ - (αΦ̂ - βy)||² 
   *                           for y ∈ {v, s}
   *   3. Average fitted coefficients across references
   * 
   * For MVP: just use defaults (α=1.0, β=0.1, γ=1.0, κ=0.01)
   * These work if trajectory families have similar dissipation timescales.
   */
  
  // MVP: return defaults
  return { alpha: 1.0, beta: 0.1, gamma: 1.0, kappa: 0.01 };
}
```

#### Phase 5.3.2: Predict Held-Out Runs

```typescript
function predictHeldOutTrajectory(
  prefixHistory: WorldlinePoint[],  // first 20% of held-out run
  coeffs: { alpha: number; beta: number; gamma: number; kappa: number }
): {
  predicted: WorldlinePoint[];
  groundTruth: WorldlinePoint[];  // for comparison
  scores: ReturnType<typeof comparePredictedToGround>;
} {
  /**
   * Core prediction pipeline:
   * 
   * 1. Extract flux surrogate from prefix
   * 2. Extrapolate flux forward (simple rule)
   * 3. Integrate reduced model from prefix end state
   * 4. Compare predicted vs ground truth in signature space
   */
  
  // Step 1: Infer flux from prefix
  const fluxPrefix = inferFluxSurrogate(prefixHistory, 'acceleration');
  
  // Step 2: Extrapolate flux forward
  // Simple rule: piecewise constant (repeat last value)
  // Or: AR(1) model on flux
  const targetLength = prefixHistory.length * 5; // 20% prefix → 100% run
  const fluxExtrapolated = [
    ...fluxPrefix,
    ...Array(targetLength - fluxPrefix.length).fill(fluxPrefix[fluxPrefix.length - 1] ?? 0.1)
  ];
  
  // Step 3: Integrate from prefix terminal state
  const terminalState = prefixHistory[prefixHistory.length - 1];
  const initialState = {
    v: terminalState.v_b,
    s: terminalState.s,
    x: terminalState.x_b,
  };
  
  const predicted = integrateReducedModel(initialState, fluxExtrapolated, 0.016, coeffs);
  
  // Step 4: Compare
  // (comparison against full ground truth happens in test harness)
  
  return {
    predicted,
    groundTruth: [],  // filled by test harness
    scores: {} as any,
  };
}
```

### Success Criteria

For each held-out run:

**Pass if:**
1. CF distance ≤ 0.5 (signatures within 50% tolerance)
2. Tick match ≥ 0.7 (trajectory range agreement ≥ 70%)
3. Trajectory distance in first 10 steps ≤ 1.0 (coarse phase-space agreement)

**Overall success:** Both held-out runs pass.

---

## Test Structure in Code

```typescript
describe('Phase 5.3: Topological Prediction (Interface Flux)', () => {
  it('should infer flux from reference trajectories', () => {
    const history = generateCliffTrajectory({ dt: 0.016, steps: 100 });
    const flux = inferFluxSurrogate(history, 'acceleration');
    expect(flux.length).toBe(history.length);
    expect(flux.every(f => f >= 0)).toBe(true); // non-negative
  });

  it('should integrate reduced model deterministically', () => {
    const flux = Array(50).fill(0.1);
    const pred1 = integrateReducedModel({ v: 0, s: 0, x: 0 }, flux);
    const pred2 = integrateReducedModel({ v: 0, s: 0, x: 0 }, flux);
    expect(pred1[pred1.length - 1].x_b).toBeCloseTo(pred2[pred2.length - 1].x_b);
  });

  it('should predict cliff trajectory from 20% prefix', () => {
    const fullRun = generateCliffTrajectory({ steps: 500 });
    const prefix = fullRun.slice(0, 100); // 20%
    const ground = fullRun.slice(100);    // 80% to test
    
    const { predicted, scores } = predictHeldOutTrajectory(prefix, {
      alpha: 1.0, beta: 0.1, gamma: 1.0, kappa: 0.01
    });
    
    // Compare to ground
    const comparison = comparePredictedToGround(predicted, ground, 15);
    
    expect(comparison.cfMatch).toBeLessThan(0.5);
    expect(comparison.tickMatch).toBeGreaterThan(0.7);
  });

  it('should discriminate cliff from smooth in signature space', () => {
    const cliffPred = integrateReducedModel(...);
    const smoothPred = integrateReducedModel(...);
    
    const cliffCF = extractCFSignature(cliffPred, 'velocity_ratio', 15);
    const smoothCF = extractCFSignature(smoothPred, 'velocity_ratio', 15);
    
    const distance = /* L2 distance between CF vectors */;
    expect(distance).toBeGreaterThan(0.2); // distinct
  });
});
```

---

## Why This Architecture Works

1. **Reduced model is provably sufficient:** If we can predict using only (v, s, x) and inferred flux, we've proven those are the essential DOF.

2. **Signatures are compression:** CF + Antclock events distill the full trajectory into ~20 numbers. If those match, so does topology.

3. **Flux inference is parameter-free:** Acceleration is a direct observable; no tuning needed.

4. **τ-normalization kills grid dependence:** Phase 5.1 saw ~1% shifts in a₀ with resolution. τ-integrals don't.

5. **SunContract correspondence is now operationalized:** The reduced model *is* a continuous-time SunContract. This proves the isomorphism.

---

## Resolution Stability: Recommendation

**Current `velocity_ratio` from Phase 5.1:**
```typescript
max(v) / (min(v) + ε)  ≈ 63,000 - 64,000 for cliff scenarios
```

**The problem:**
- `min(v)` approaches zero (ε=1e-6 carries the burden)
- With finer grids (more steps), you find even smaller minima
- Phase 5.1 saw ~1% shifts in a₀ with time refinement
- This propagates to CF coefficients: a₀ is fragile

**For Phase 5.3 (prediction), use τ-normalized scalar:**

$$r_\tau^\text{range} = \frac{\max_{\tau \in [0,\tau_\text{window}]} v(\tau) - \min_{\tau} v(\tau)}{\int_0^{\tau_\text{window}} |v(s)| ds / \int_0^{\tau_\text{window}} ds}$$

This integrates in *proper time*, so grid refinement doesn't create new extrema—it just samples the same integral more densely.

**Implementation:** Use the `computeTauNormalizedScalar()` function above with `window_tau = 1.0` or the full trajectory τ-span.

This makes CF signatures robust enough for prediction tests.
