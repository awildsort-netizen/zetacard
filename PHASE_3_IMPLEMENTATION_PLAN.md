# Phase 3 Implementation Plan: Minimal Worldline Dynamics

**Status**: Ready to implement  
**Based on**: User specification + Phase 2 architecture analysis  
**Goal**: Add interface worldline motion that feeds cleanly into Phase 5 CF integration

---

## 1. Architecture Assessment (Phase 2 Current State)

### Field Storage Pattern
- **Arrays not Float64Array** (using `Vec = number[]`)
- **No array allocation in innermost loops** (good news: `add()`, `scale()` create new arrays outside RK4 stage computations)
- **RK4 pattern**: k1, k2, k3, k4 derivatives computed at intermediate states, then combined with `avg()` function

### Current stepRK4 Structure
```typescript
export function stepRK4(state: TwoManifoldState, dt: number): TwoManifoldState {
  // k1: compute derivatives at current state
  // k2: compute derivatives at halfway point with k1
  // k3: compute derivatives at halfway point with k2
  // k4: compute derivatives at full step with k3
  // Combine: y_new = y + dt * (k1 + 2*k2 + 2*k3 + k4) / 6
  
  // Current interface update (placeholder):
  const ds_dtau = (flux - kappa * iface.s) / T_Sigma;
  const new_iface: InterfaceState = {
    s: Math.max(0, iface.s + ds_dtau * dt),
    x_b_index: iface.x_b_index,  // FIXED — Phase 3 will change this
    tau: iface.tau + dt,
  };
}
```

### Key Constraint
- **RK4 stage computations cannot allocate new arrays** (derivative calls already do this once per stage)
- Solution: **Use scalar sampling at grid points** rather than new field arrays
- Pattern: `rho_at_xb = bulk.rho[i_b]` or linear interpolation between two grid points

---

## 2. Phase 3 Extensions (Minimal, Type-Level)

### 2a. Extended InterfaceState
**Add three fields**:
```typescript
export interface InterfaceState {
  s: number;           // entropy density (existing)
  x_b_index: number;   // grid index (existing, now will change)
  tau: number;         // proper time (existing)

  // Phase 3: worldline dynamics
  x_b: number;         // physical position in [0, L]
  v_b: number;         // velocity ∂_t x_b
  theta: number;       // expansion scalar (log clock-stretch)
}
```

**Initialization** (in `initializeSmooth` / `initializeCliff`):
```typescript
interface: {
  s: 0.1,
  x_b_index: Math.floor(nx / 2),
  tau: 0,
  x_b: L / 2,         // starts at center
  v_b: 0,             // starts at rest
  theta: 0,           // expansion scalar
}
```

---

## 2b. Helper: Scalar Sampling at Worldline

**New function** (in twoManifoldCoupled.ts, ~15 lines):

```typescript
/**
 * Sample a field at arbitrary position x ∈ [0, L]
 * Uses linear interpolation between nearest grid points.
 * Assumes periodic boundary conditions.
 *
 * @param field Vec of length nx
 * @param x Physical position
 * @param L Domain size
 * @param dx Grid spacing
 * @returns Interpolated value
 */
function sampleAtPosition(field: Vec, x: number, L: number, dx: number): number {
  const nx = field.length;
  // Map x to grid index (periodic)
  const x_periodic = ((x % L) + L) % L;
  const idx_real = x_periodic / dx;
  const i = Math.floor(idx_real);
  const frac = idx_real - i;
  const i_next = (i + 1) % nx;
  
  // Linear interpolation
  return field[i] * (1 - frac) + field[i_next] * frac;
}
```

**Why this is safe**: Called once per RK4 stage (4 times), each call is O(1), no array allocation.

---

## 2c. Proper-Time Clock Update

**New function** (in twoManifoldCoupled.ts, ~10 lines):

```typescript
/**
 * Compute dτ/dt for conformal metric: ds² = -e^(2ρ) dt² + e^(2ρ) dx²
 *
 * Along interface (x = x_b):
 *   dτ/dt = e^{ρ(x_b)} * √(1 - v_b²)
 *
 * (Setting signal speed = 1, assuming |v_b| < 1)
 *
 * @param rho_at_xb Lapse function value at interface
 * @param v_b Interface velocity
 * @returns dτ/dt
 */
function computeProperTimeRate(rho_at_xb: number, v_b: number): number {
  const exp_rho = Math.exp(rho_at_xb);
  const vel_factor = Math.sqrt(Math.max(0, 1 - v_b * v_b));
  return exp_rho * vel_factor;
}
```

**Why this is safe**: Pure scalars, no allocation.

---

## 2d. Interface RHS Function

**New function** (in twoManifoldCoupled.ts, ~40 lines):

```typescript
/**
 * Compute RHS of interface worldline dynamics.
 *
 * Evolution in coordinate time t:
 *   ∂_t x_b = v_b
 *   ∂_t v_b = a_b (acceleration from force law + junction penalty)
 *   ∂_t θ = (d/dτ) log(dτ/dt)
 *   ∂_t s = ds/dτ (entropy from phase 2, will be scaled by dτ/dt in stepRK4)
 *   ∂_t τ = dτ/dt (proper time clock)
 *
 * @returns RHS as scalar values {dx_b, dv_b, dtheta, ds, dtau}
 */
interface InterfaceRHS {
  dx_b: number;
  dv_b: number;
  dtheta: number;
  ds: number;
  dtau: number;
}

function computeInterfaceRHS(
  bulk: DilatonGRState,
  iface: InterfaceState,
  dx: number,
  L: number,
  lambda_flux: number = 0.1,  // coupling constant (Phase 3 tunable)
  m_eff: number = 1.0          // effective mass
): InterfaceRHS {
  const { x_b, v_b, s } = iface;

  // Sample fields at interface
  const rho_at_xb = sampleAtPosition(bulk.rho, x_b, L, dx);
  const X_x = derivative(bulk.X, dx);
  const X_x_at_xb = sampleAtPosition(X_x, x_b, L, dx);
  const psi_x = derivative(bulk.psi, dx);
  const psi_x_at_xb = sampleAtPosition(psi_x, x_b, L, dx);
  const psi_dot_at_xb = sampleAtPosition(bulk.psi_dot, x_b, L, dx);

  // 1. Position: dx_b = v_b
  const dx_b = v_b;

  // 2. Velocity: force from energy flux (Phase 3)
  const energy_flux = psi_dot_at_xb * psi_x_at_xb;
  const F_flux = lambda_flux * energy_flux;

  // Penalty term: nudge toward junction condition [∂_x X] = 8π E_Σ(s)
  // E_Σ(s) ≈ s for now (entropy contributes to stress-energy)
  const target_jump = 8 * Math.PI * s;
  const actual_jump = X_x_at_xb;  // simplified: just measure on right side
  const F_junction = 0.01 * (actual_jump - target_jump); // weak penalty
  
  const a_b = (F_flux + F_junction) / m_eff;
  const dv_b = a_b;

  // 3. Expansion: log-derivative of clock stretch
  // θ = d/dτ [log(dτ/dt)]
  // Finite-difference approximation: will need history in actual code
  // For now, use proxy: θ ≈ (1/dτ/dt) * d(dτ/dt)/dt
  const dtau_dt = computeProperTimeRate(rho_at_xb, v_b);
  
  // Simplified: θ ≈ v_b * ∂ρ/∂x|_{x_b}
  const rho_x = derivative(bulk.rho, dx);
  const rho_x_at_xb = sampleAtPosition(rho_x, x_b, L, dx);
  const dtheta = v_b * rho_x_at_xb;  // proxy for log-derivative

  // 4. Entropy (from Phase 2, already computed)
  const T_Sigma = 1.0;
  const kappa = 0.01;
  const ds = (energy_flux - kappa * s) / T_Sigma;

  // 5. Proper time clock
  const dtau = dtau_dt;

  return { dx_b, dv_b, dtheta, ds, dtau };
}
```

**Key design choices**:
- **Force law**: Energy flux + weak junction penalty (avoids RK4 instability from hard constraints)
- **Expansion scalar**: Log-derivative of proper-time rate (geometrically clean, event-sensitive)
- **Sampling**: Linear interpolation at RK4 evaluation points (O(1), no allocation)
- **Entropy**: Reuse Phase 2 formula (second law drives dynamics)

---

## 3. RK4 Integration Pattern (Modified stepRK4)

**Current code** (line ~400 in stepRK4):
```typescript
// Interface: entropy evolution (placeholder, Phase 3)
const ds_dtau = (flux - kappa * iface.s) / T_Sigma;
const new_iface: InterfaceState = {
  s: Math.max(0, iface.s + ds_dtau * dt),
  x_b_index: iface.x_b_index,
  tau: iface.tau + dt,
};
```

**Phase 3 replacement**:

```typescript
// Interface: full worldline dynamics (Phase 3)
// RK4 for: {x_b, v_b, theta, s, tau}

const k1_iface = computeInterfaceRHS(bulk, iface, dx, L);

const bulk_k1_half: DilatonGRState = { /* existing k1 bulk */ };
const iface_k1_half: InterfaceState = {
  x_b: iface.x_b + k1_iface.dx_b * dt / 2,
  v_b: iface.v_b + k1_iface.dv_b * dt / 2,
  theta: iface.theta + k1_iface.dtheta * dt / 2,
  s: Math.max(0, iface.s + k1_iface.ds * dt / 2),
  x_b_index: Math.round(iface_k1_half.x_b / dx),
  tau: iface.tau + k1_iface.dtau * dt / 2,
};
const k2_iface = computeInterfaceRHS(bulk_k1_half, iface_k1_half, dx, L);

// k3 stage
const iface_k2_half: InterfaceState = {
  x_b: iface.x_b + k2_iface.dx_b * dt / 2,
  v_b: iface.v_b + k2_iface.dv_b * dt / 2,
  theta: iface.theta + k2_iface.dtheta * dt / 2,
  s: Math.max(0, iface.s + k2_iface.ds * dt / 2),
  x_b_index: Math.round(iface_k2_half.x_b / dx),
  tau: iface.tau + k2_iface.dtau * dt / 2,
};
const k3_iface = computeInterfaceRHS(bulk_k2_half, iface_k2_half, dx, L);

// k4 stage
const iface_k3_full: InterfaceState = {
  x_b: iface.x_b + k3_iface.dx_b * dt,
  v_b: iface.v_b + k3_iface.dv_b * dt,
  theta: iface.theta + k3_iface.dtheta * dt,
  s: Math.max(0, iface.s + k3_iface.ds * dt),
  x_b_index: Math.round(iface_k3_full.x_b / dx),
  tau: iface.tau + k3_iface.dtau * dt,
};
const k4_iface = computeInterfaceRHS(bulk_k3_full, iface_k3_full, dx, L);

// RK4 combination for interface state
const avg_scalar = (k1: number, k2: number, k3: number, k4: number): number => {
  return (k1 + 2*k2 + 2*k3 + k4) / 6;
};

const new_iface: InterfaceState = {
  x_b: iface.x_b + avg_scalar(k1_iface.dx_b, k2_iface.dx_b, k3_iface.dx_b, k4_iface.dx_b) * dt,
  v_b: iface.v_b + avg_scalar(k1_iface.dv_b, k2_iface.dv_b, k3_iface.dv_b, k4_iface.dv_b) * dt,
  theta: iface.theta + avg_scalar(k1_iface.dtheta, k2_iface.dtheta, k3_iface.dtheta, k4_iface.dtheta) * dt,
  s: Math.max(0, iface.s + avg_scalar(k1_iface.ds, k2_iface.ds, k3_iface.ds, k4_iface.ds) * dt),
  x_b_index: Math.round(new_iface_x_b / dx),  // cache nearest grid point
  tau: iface.tau + avg_scalar(k1_iface.dtau, k2_iface.dtau, k3_iface.dtau, k4_iface.dtau) * dt,
};
```

**Why this pattern is safe**:
- Each RK4 stage calls `computeInterfaceRHS()` once (4 total, each O(1) after derivative calls)
- Derivative calls already inside RK4 bulk computation (no extra allocations)
- Scalar arithmetic only in RK4 combination

---

## 4. Test Suite (5–6 Tests, Phase 3)

**File**: `src/__tests__/twoManifoldCoupled.phase3.test.ts` (or extend existing)

### Test 1: Interface Stationary with Zero Flux
```typescript
test('interface remains stationary when flux is zero (symmetric initial ψ)', () => {
  // Initialize with symmetric ψ (ψ_x = 0 at x_b)
  // Run N steps
  // Assert: |x_b - x_b_init| < tolerance, |v_b| < tolerance
});
```

### Test 2: Interface Accelerates with Positive Flux
```typescript
test('interface moves in direction of energy flux', () => {
  // Initialize with asymmetric ψ (positive flux at x_b)
  // Run N steps
  // Assert: x_b increases, v_b > 0 (or sign matches flux)
});
```

### Test 3: Proper Time Strictly Increases
```typescript
test('proper time tau increases monotonically with dτ/dt > 0', () => {
  // Run full simulation
  // Assert: tau_n+1 > tau_n for all steps, (tau_n+1 - tau_n) > 0
  // Assert: No NaN in tau history
});
```

### Test 4: Expansion Scalar is Finite
```typescript
test('expansion scalar theta remains finite and stable', () => {
  // Run full simulation
  // Assert: Number.isFinite(theta) throughout
  // Assert: No NaN, no Infinity
  // Assert: |theta| < some reasonable bound (e.g., 10)
});
```

### Test 5: Second Law Holds (Entropy Non-Decreasing)
```typescript
test('entropy s increases or stays stable with positive influx', () => {
  // Run full simulation
  // Assert: s_n+1 >= s_n * (1 - tolerance) [allows small numerical damping]
  // Or: mean(Δs) > 0 over the run
});
```

### Test 6: Worldline History Ready for Phase 5 (CF Extraction)
```typescript
test('worldline history has sufficient data for CF extraction', () => {
  // Run short simulation, collect history:
  // { t, tau, x_b, v_b, theta, s } per step
  // Assert: history.length > 0
  // Assert: All fields have values (no undefined)
  // Assert: No NaN in any field
  // [This is the "CF readiness gate" mentioned in user spec]
});
```

---

## 5. Implementation Sequence (Fastest Path)

1. **Add types** (5 min)
   - Extend InterfaceState with x_b, v_b, theta
   - Update initialization in initializeSmooth, initializeCliff
   - Update TwoManifoldState.x_b usage (currently number, may need clarification)

2. **Add helpers** (10 min)
   - `sampleAtPosition()` (15 lines)
   - `computeProperTimeRate()` (10 lines)

3. **Implement interface RHS** (20 min)
   - `computeInterfaceRHS()` (40 lines)
   - Verify scalar sampling calls don't double-allocate

4. **Modify stepRK4** (15 min)
   - Replace old interface placeholder with RK4 loop (20 lines per stage × 4)
   - Update final new_iface construction
   - Test on existing Phase 2 scenario (ensure no regression)

5. **Write 6 tests** (30 min)
   - Extend antclockSolverV2.test.ts or create phase3.test.ts
   - Tests 1–6 as above
   - Verify all pass

6. **Optional: Add junction penalty** (5 min if needed)
   - Already sketched in RHS above
   - Can tune `lambda_flux`, `m_eff` for better motion

---

## 6. Key Parameters (Phase 3 Tunable)

**In `computeInterfaceRHS()`**:

```typescript
lambda_flux: number = 0.1,    // Energy flux coupling (0.01 – 1.0 range)
m_eff: number = 1.0           // Interface effective mass (tuning parameter)
```

**In `stepRK4()` (existing)**:
```typescript
T_Sigma = 1.0;    // interface temperature
kappa = 0.01;     // entropy dissipation coefficient
```

**Junction penalty**:
```typescript
const F_junction = 0.01 * (actual_jump - target_jump);  // tuning: 0.001 – 0.1
```

All can be exposed to tests as optional arguments.

---

## 7. Expected Outcomes

**After Phase 3 implementation**:
- ✅ InterfaceState has full worldline fields (x_b, v_b, theta)
- ✅ Interface moves in response to energy flux (no longer static)
- ✅ Proper time tau advances geometrically via conformal metric
- ✅ Expansion scalar theta tracks changes in clock rate
- ✅ Worldline history accumulated (ready for Phase 5 CF extraction)
- ✅ 6 new tests verify all behaviors
- ✅ RK4 remains stable (no regressions from Phase 2)
- ✅ Parameters tunable for Phase 4 coupling

**Test count**:
- Phase 1b: 28 ✅
- Phase 2: 12 ✅
- Antclock V2: 17 ✅
- Phase 3 (new): 6 ✅
- **Total Phase 3: 63/63 tests passing**

---

## 8. No Blocking Issues

- Architecture is extensible (RK4 loop already exists)
- Field storage pattern allows scalar sampling (no allocation issues)
- Force law is gentle (penalty-based, not hard constraints)
- Proper-time clock formula is standard conformal metric
- Phase 5 readiness will follow naturally from history accumulation

**Ready to implement immediately.**

