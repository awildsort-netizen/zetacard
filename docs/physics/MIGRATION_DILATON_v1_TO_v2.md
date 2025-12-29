# Migration Guide: From GR (v1.0) to Dilaton Gravity (v2.0)

**Date**: 2025-12-29  
**Status**: Implementation update required  
**Scope**: twoManifoldCoupled.ts + antclockSolver.ts

---

## Key Changes

### 1. Field Content

| v1.0 | v2.0 | Change |
|------|------|--------|
| $(X, K, \psi, \Pi_\psi)$ | $(\rho, X, \psi)$ | Switch to conformal gauge + dilaton |
| Extrinsic curvature $K$ | Conformal factor $\rho$ | Simplifies 1+1D evolution |
| Expansion $\theta$ | Dilaton jump $[\partial_x X]$ | Non-circular, observable |
| Scale factor evolution | Dilaton equation | Real local DOF |

### 2. Equations

| v1.0 | v2.0 | Reason |
|------|------|--------|
| ADM + constraints | Dilaton + Einstein-like + matter | Closed system, no topological freeze |
| Hamiltonian constraint | Dilaton equation: $(\partial_t^2 - \partial_x^2)\rho = \frac{\Lambda}{2}e^{2\rho}$ | Direct evolution of conformal factor |
| Junction on $[K]$ | Jump in $[\partial_x X]$: $8\pi E_\Sigma$ | Well-defined, non-degenerate |
| Interface "expansion dynamics" | Entropy law: $\frac{ds}{d\tau} = \frac{\Phi_{\text{in}} - \kappa s}{T_\Sigma}$ | Computable from flux |

### 3. Observables

| v1.0 | v2.0 | Advantage |
|------|------|-----------|
| Spectral acceleration of $\theta$ | Dilaton jump rate: $\left\|\frac{d}{dt}[\partial_x X]\right\|$ | Less ambiguous, more direct |
| Entropy from "dissipation coupling" | Entropy from energy flux: $\Phi_{\text{in}} = \partial_t\psi \cdot \partial_x\psi$ | Follows matter, not geometric trick |
| Residual mixing energy + constraints | Residual from Einstein equations + flux + dilaton jump | Clear physical meaning |

---

## Implementation Checklist

### Phase 1: Update State Representation

**File**: `src/twoManifoldCoupled.ts`

**Old**:
```typescript
interface ADMState {
  phys: { X: number; K: number; psi: number[]; pi_psi: number[] }
  shadow: { X: number; K: number; psi: number[]; pi_psi: number[] }
  interface: { theta: number; entropy: number }
}
```

**New**:
```typescript
interface DilatonGRState {
  phys: { rho: number[]; X: number[]; psi: number[]; }  // spatial arrays
  shadow: { rho: number[]; X: number[]; psi: number[]; }
  interface: { entropy: number; }
  time: { t: number; tau: number; }
}
```

**Steps**:
- [ ] Replace ADMState with DilatonGRState
- [ ] Add grid information (dx, N_x)
- [ ] Remove conjugate momenta (use RK4 directly on fields, not Hamiltonian formalism)

### Phase 2: Update Field Equations

**Old equations** (ADM + constraints):
```typescript
computeHamiltonianConstraint(state)   // R = 0 equation
computeMomentumConstraint(state)      // momentum conservation
computeADMEvolution(state, dt)        // K evolution
```

**New equations**:
```typescript
// Dilaton equation: (∂_t² - ∂_x²)ρ = (Λ/2)e^(2ρ)
computeDilatonRHS(rho: number[], interface_source: number, Lambda: number): number[]

// Metric equation: (∂_t² - ∂_x²)X - (Λ/2)X = 8π(T_00^matter + T_00^interface)
computeMetricRHS(X: number[], rho: number[], psi: number[], interface_energy: number): number[]

// Matter equation: (∂_t² - ∂_x²)ψ = 0
computeMatterRHS(psi: number[], rho: number[]): number[]

// Energy flux at interface
computeEnergyFlux(psi: number[], t_derivatives: number[], x_b: number): number

// Entropy evolution
computeEntropyRHS(flux: number, entropy: number, kappa: number, T_Sigma: number): number
```

**Steps**:
- [ ] Replace ADM constraint computation with dilaton equation
- [ ] Implement finite-difference operators for $\partial_t, \partial_x, \partial_{tt}, \partial_{xx}$
- [ ] Implement energy flux computation at interface
- [ ] Implement entropy evolution from flux

### Phase 3: Update Time Integration

**Old**: RK4 on ADM variables (lapse, shift, K, X, ψ)  
**New**: RK4 on fields in conformal gauge (ρ, X, ψ and their time derivatives)

**Implementation**:
```typescript
// Before time integration, need time derivatives as state variables
interface DilatonGRState {
  // ... fields above ...
  rho_t: number[];    // ∂_t ρ
  X_t: number[];      // ∂_t X
  psi_t: number[];    // ∂_t ψ
}

// RK4 step now has 9 fields instead of 8
function stepRK4(state: DilatonGRState, dt: number): DilatonGRState {
  // k1 at current state
  const drho_dt = state.rho_t;
  const drho_t_dt = computeDilatonRHS(state.rho, state.X, ...);
  // ... similarly for X and ψ
  
  // k2, k3, k4 as before
  // ... combine with weights ...
}
```

**Steps**:
- [ ] Add time derivatives to state
- [ ] Compute RHS for all 9 evolution equations
- [ ] Verify RK4 combines them correctly
- [ ] Test on smooth + cliff potentials

### Phase 4: Update Interface Coupling

**Old**:
```typescript
interfaceEvolution(state) {
  // Scale expansion θ
  // Compute dissipation from θ̇
  // Update entropy from dissipation
}
```

**New**:
```typescript
interfaceEvolution(state: DilatonGRState): { entropy_rhs: number, dilaton_jump: number } {
  // Compute energy flux at x_b
  const flux = state.psi_t[i_b] * state.psi_x[i_b];
  
  // Entropy production
  const entropy_rhs = (flux - kappa * state.interface.entropy) / T_Sigma;
  
  // Interface energy (from stored entropy)
  const E_Sigma = T_Sigma * state.interface.entropy;
  
  // Dilaton jump
  const dilaton_jump = 8 * Math.PI * E_Sigma;
  
  return { entropy_rhs, dilaton_jump };
}
```

**Steps**:
- [ ] Replace θ dynamics with flux-based entropy
- [ ] Implement dilaton jump boundary condition
- [ ] Modify finite-difference stencil at interface to enforce jump
- [ ] Test on both smooth and cliff scenarios

### Phase 5: Update Antclock

**Old observables**:
```typescript
// Spectral acceleration of θ
// Expansion dynamics
// Mixing of coercion signatures
```

**New observables** (all cleaner):
```typescript
function computeConstraintResiduals(state: DilatonGRState) {
  // Einstein equation residual (metric equation)
  const einstein_residual = measureEinsteinViolation(state);
  
  // Dilaton equation residual
  const dilaton_residual = measureDilatonViolation(state);
  
  // Matter equation residual
  const matter_residual = measureMatterViolation(state);
  
  return {
    einstein: einstein_residual,
    dilaton: dilaton_residual,
    matter: matter_residual,
    total: (einstein_residual + dilaton_residual + matter_residual) / 3
  };
}

function computeFluxNovelty(state: DilatonGRState): number {
  const flux = state.psi_t[i_b] * state.psi_x[i_b];
  const dilaton_jump_rate = Math.abs(state.dX_dx[i_b] - state.dX_dx[i_b-1]);
  return Math.abs(flux) + dilaton_jump_rate;
}

function detectRegimes(state: DilatonGRState): RegimeIndicators {
  return {
    flux_spike: Math.abs(computeEnergyFlux(state)) > flux_threshold,
    dilaton_jump_growth: computeFluxNovelty(state) > jump_threshold,
    entropy_burst: state.interface.entropy_rhs > entropy_threshold,
    constraint_violation: computeConstraintResiduals(state).total > constraint_threshold
  };
}
```

**Steps**:
- [ ] Replace θ-based regime detectors with flux + dilaton jump detectors
- [ ] Update residual computation to use new equations
- [ ] Verify all 4 regime detectors fire correctly
- [ ] Test on smooth + cliff + mixed scenarios

### Phase 6: Update Tests

**File**: `src/__tests__/twoManifoldCoupled.test.ts`

**Changes**:
```typescript
// Old: test ADM state
// New: test DilatonGR state

// Old: verify K evolution
// New: verify ρ evolution

// Old: check expansion θ
// New: check dilaton jump [∂_x X]

// Old: entropy from dissipation coefficient
// New: entropy from energy flux
```

**Specific tests to update**:
- [ ] Initialization: ensure ρ, X, ψ are initialized correctly
- [ ] Evolution: verify RK4 runs without NaN on ρ equation
- [ ] Dilaton equation: verify $R + \Lambda = 0$ is satisfied
- [ ] Energy flux: verify $\Phi_{\text{in}} = \partial_t\psi \cdot \partial_x\psi$
- [ ] Entropy law: verify $ds/d\tau = (\Phi_{\text{in}} - \kappa s) / T_\Sigma$
- [ ] Dilaton jump: verify boundary condition $[\partial_x X] = 8\pi E_\Sigma$
- [ ] Energy conservation: verify $E_{\text{total}}$ constant (or decreasing due to interface dissipation)
- [ ] Spectral signature: verify dilaton jump rate spikes on cliff

### Phase 7: Validate Against Old Tests

**Regression test**:
```typescript
it('should produce similar smooth vs cliff behavior as v1.0', () => {
  const smooth = initializeSmooth_v2();
  const cliff = initializeCliff_v2();
  
  // Run both for same coordinate time
  const smooth_result = simulate(smooth, t_max=30);
  const cliff_result = simulate(cliff, t_max=30);
  
  // Cliff should show:
  // - Higher entropy production
  // - Larger dilaton jump rate
  // - More constraint violations
  
  expect(cliff_result.entropy).toBeGreaterThan(smooth_result.entropy);
  expect(cliff_result.dilaton_jump_rate).toBeGreaterThan(smooth_result.dilaton_jump_rate);
});
```

---

## Expected Improvements in v2.0

### Mathematical
✅ No topological freeze (dilaton X has real evolution)  
✅ Non-degenerate junction (dilaton jump is observable and computable)  
✅ Closed conservation laws (Bianchi identity works exactly)  

### Numerical
✅ Fewer fields (6 instead of 8, no conjugate momenta)  
✅ Simpler RHS (wave equations + source terms, no constraint equations)  
✅ Better condition number (conformal gauge avoids lapse/shift instabilities)  

### Observables
✅ Energy flux directly from matter field (not indirect)  
✅ Dilaton jump uniquely defined (not ambiguous like θ)  
✅ Spectral signature sharper (rate of jump change is local)  

### Antclock
✅ Regime detectors cleaner (4 physical events, not fuzzy thresholds)  
✅ Tick functional more meaningful (advances on real structural changes)  
✅ Speedup potentially larger (fewer ambiguous near-threshold oscillations)  

---

## Estimated Effort

- **Phase 1** (state): 1-2 hours
- **Phase 2** (equations): 2-3 hours  
- **Phase 3** (RK4): 1-2 hours
- **Phase 4** (interface): 1-2 hours
- **Phase 5** (Antclock): 1-2 hours
- **Phase 6** (tests): 2-3 hours
- **Phase 7** (validation): 1-2 hours

**Total**: ~11-16 hours of implementation + testing

## Rollback Plan

If v2.0 reveals unexpected issues:
- Keep v1.0 code in `twoManifoldCoupled.v1.ts` (backup)
- Use git branches for parallel development
- Run comprehensive regression tests at each phase

---

## Next Steps

1. **Review this migration guide** — ensure all changes make sense
2. **Implement Phase 1-2** — update state and equations
3. **Test Phase 3** — verify RK4 runs correctly
4. **Validate Phase 4-5** — check interface + Antclock work
5. **Full regression Phase 6-7** — ensure v2.0 still shows coercion signatures

The payoff: a **non-degenerate, well-defined, production-ready** dilaton GR solver that doesn't hide circular dependencies.

---

**Questions to discuss**:
- Should $U(X) = 0$ stay, or add kinetic term for richer dynamics?
- Should interface match dilaton ($X = \tilde{X}$ at boundary) or allow slip?
- Should leakage be $\Phi_{\text{leak}} = \kappa(T_\Sigma - T_{\text{env}})$ or $\kappa s$?
- Should we add a potential $V(X)$ beyond linear?
