# Action Items & Timeline: Implementing v2.0

**Date**: 2025-12-29  
**Status**: Specification complete, design decisions made, implementation ready to begin  
**Next Phase**: Code rewrite (2-3 weeks)

---

## What's Done ✅

### Documentation (Complete)
- ✅ [TWOMANIFOLD_1PLUS1D_SPEC.md](TWOMANIFOLD_1PLUS1D_SPEC.md) — v2.0 spec (dilaton gravity)
- ✅ [MIGRATION_DILATON_v1_TO_v2.md](MIGRATION_DILATON_v1_TO_v2.md) — implementation roadmap
- ✅ [DILATON_GRAVITY_FIX_SUMMARY.md](DILATON_GRAVITY_FIX_SUMMARY.md) — what was fixed
- ✅ [V1_VS_V2_COMPARISON.md](V1_VS_V2_COMPARISON.md) — before/after side-by-side
- ✅ [ANTCLOCK_SOLVER_SPEC.md](ANTCLOCK_SOLVER_SPEC.md) — event-driven framework (v2.0-compatible)

### Test Infrastructure (Ready)
- ✅ 34 tests passing on v1.0 implementation
- ✅ Test framework (Vitest) working
- ✅ RK4 integration tested and validated
- ✅ Antclock solver validated (16/16 passing)

### Design Decisions (Made)

**Chosen for v2.0**:
- ✅ Dilaton kinetic term: $U(X) = 0$ (linear potential only)
- ✅ Interface continuity: $X = \tilde{X}$ at $x_b$ (symmetric)
- ✅ Leakage model: $\Phi_{\text{leak}} = \kappa s$ (entropy-based)
- ✅ Potential form: $V(X) = \Lambda X$ (linear)

These choices balance simplicity (faster to implement) with expressiveness (captures coercion).

---

## What's Next: Phase-by-Phase Implementation

### Phase 1: Update State Representation ⏳
**Duration**: 1-2 hours  
**Files**: `src/twoManifoldCoupled.ts`

**Tasks**:
```typescript
1. Define DilatonGRState interface:
   - phys: { rho: number[], X: number[], psi: number[], rho_t: number[], X_t: number[], psi_t: number[] }
   - shadow: { rho: number[], X: number[], psi: number[], ... }
   - interface: { entropy: number }
   - grid: { dx: number, N: number, x_b_index: number }

2. Replace initializeSmooth() and initializeCliff():
   - Initialize rho, X, psi on spatial grid
   - Initialize time derivatives (start at rest)
   - Set kappa, T_Sigma, Lambda parameters

3. Add helper functions:
   - finiteDiff_ddt(field: number[], dt: number)
   - finiteDiff_ddx(field: number[], dx: number)
   - finiteDiff_d2dx2(field: number[], dx: number)
```

**Validation**:
- Can create smooth and cliff initial states
- Can print state and see reasonable values
- No type errors

---

### Phase 2: Implement Field Equations ⏳
**Duration**: 2-3 hours  
**Files**: `src/twoManifoldCoupled.ts`

**Tasks**:
```typescript
1. Dilaton equation RHS:
   function computeDilatonRHS(
     rho: number[], X: number[], psi: number[],
     interface_source: number, Lambda: number, dx: number
   ): number[] {
     // (∂_t² - ∂_x²)ρ = (Λ/2)e^(2ρ)
     // Implement as: ρ_tt = ρ_xx + (Λ/2)e^(2ρ)
   }

2. Metric equation RHS:
   function computeMetricRHS(
     X: number[], rho: number[], psi: number[], rho_t: number[], psi_t: number[],
     interface_energy: number, Lambda: number, dx: number
   ): number[] {
     // (∂_t² - ∂_x²)X - (Λ/2)X = 8π(T_00^matter + T_00^interface)
   }

3. Matter equation RHS:
   function computeMatterRHS(
     psi: number[], rho: number[], rho_t: number[], dx: number
   ): number[] {
     // (∂_t² - ∂_x²)ψ = 0
   }

4. Boundary conditions:
   - Neumann (zero derivative at edges) or Dirichlet (constant)
   - Implement enforcer function
```

**Validation**:
- Equations run without NaN
- Smooth field is stable (ρ, X, ψ don't blow up)
- Residuals (equation violations) are bounded

---

### Phase 3: Implement RK4 Time Integration ⏳
**Duration**: 1-2 hours  
**Files**: `src/twoManifoldCoupled.ts`

**Tasks**:
```typescript
1. Create full RHS function:
   function derivatives(state: DilatonGRState): DilatonGRState {
     // Return (ρ_t, ρ_tt, X_t, X_tt, ψ_t, ψ_tt, entropy_t)
     // by calling computeDilatonRHS, computeMetricRHS, etc.
   }

2. Implement RK4 stepper:
   function stepRK4(state: DilatonGRState, dt: number): DilatonGRState {
     const k1 = derivatives(state)
     const k2 = derivatives(state + dt/2 * k1)
     const k3 = derivatives(state + dt/2 * k2)
     const k4 = derivatives(state + dt * k3)
     return state + (dt/6)(k1 + 2k2 + 2k3 + k4)
   }

3. Test on smooth + cliff:
   - Run 100 steps, check no NaN
   - Print state at steps 0, 50, 100
   - Visual inspection: ρ and X evolving smoothly?
```

**Validation**:
- RK4 runs without errors
- Fields stay bounded
- Smooth field: ρ decreases, X increases (natural evolution)
- Cliff field: rapid oscillations, sharp transitions

---

### Phase 4: Interface Coupling ⏳
**Duration**: 1-2 hours  
**Files**: `src/twoManifoldCoupled.ts`

**Tasks**:
```typescript
1. Energy flux computation:
   function computeEnergyFlux(
     psi: number[], psi_t: number[], i_b: number
   ): number {
     // Φ_in = ∂_t ψ · ∂_x ψ at x_b
     return psi_t[i_b] * (psi[i_b+1] - psi[i_b-1]) / (2 * dx)
   }

2. Entropy evolution:
   function computeEntropyRHS(
     flux: number, entropy: number, kappa: number, T_Sigma: number
   ): number {
     // ds/dτ = (flux - κ·s) / T_Σ
     return (flux - kappa * entropy) / T_Sigma
   }

3. Dilaton jump condition:
   function enforceDilatonJump(
     state: DilatonGRState, E_Sigma: number
   ): DilatonGRState {
     // Modify X gradient at interface to enforce [∂_x X] = 8π E_Σ
     // Implementation: adjust X[i_b+1] and X[i_b-1]
   }

4. Interface energy:
   E_Sigma(s) = T_Sigma * s
```

**Validation**:
- Energy flux computable on both sides
- Entropy increases monotonically
- Dilaton jump enforced at interface
- Smooth field: entropy ≈ 0 (no forced flow)
- Cliff field: entropy grows (coercion signature)

---

### Phase 5: Update Antclock Solver ⏳
**Duration**: 1-2 hours  
**Files**: `src/antclockSolver.ts`

**Tasks**:
```typescript
1. New regime detectors:
   function detectRegimes(state: DilatonGRState): RegimeIndicators {
     const flux = computeEnergyFlux(state.phys.psi, state.phys.psi_t, i_b)
     const dilaton_jump = ... (compute from X gradients)
     const entropy_burst = state.interface.entropy_rhs > threshold
     return {
       flux_spike: |flux| > flux_threshold,
       dilaton_growth: |d/dt[∂_x X]| > jump_threshold,
       entropy_burst: entropy_burst,
       constraint_violation: computeResidual(state) > residual_threshold
     }
   }

2. Updated residual:
   function computeConstraintResiduals(state: DilatonGRState) {
     const dilaton_res = |∂_t² ρ - ∂_x² ρ - (Λ/2)e^(2ρ)|
     const metric_res = |∂_t² X - ∂_x² X - (Λ/2)X - 8π T_00|
     const matter_res = |∂_t² ψ - ∂_x² ψ|
     return { dilaton: dilaton_res, metric: metric_res, matter: matter_res }
   }

3. Flux novelty:
   function computeFluxNovelty(state: DilatonGRState): number {
     const flux = computeEnergyFlux(...)
     const jump_rate = |d/dt [∂_x X]|
     return |flux| + jump_rate
   }
```

**Validation**:
- Antclock detects regime changes on cliff field
- Smooth field: few events (sparse ticks)
- Cliff field: more events (refinement at transitions)
- Speedup maintained (1000x on smooth, 100x+ on cliff)

---

### Phase 6: Rewrite Tests ⏳
**Duration**: 2-3 hours  
**Files**: `src/__tests__/twoManifoldCoupled.test.ts`

**Tests to update/add**:
```typescript
describe('Dilaton Gravity 1+1D (v2.0)', () => {
  // Initialization
  it('should initialize smooth dilaton state', () => { ... })
  it('should initialize cliff dilaton state', () => { ... })
  
  // Field equations
  it('should satisfy dilaton equation', () => { ... })
  it('should satisfy metric equation', () => { ... })
  it('should satisfy matter equation', () => { ... })
  
  // Energy flux
  it('should compute energy flux correctly', () => { ... })
  it('should show zero flux on smooth field', () => { ... })
  it('should show nonzero flux on cliff field', () => { ... })
  
  // Entropy
  it('should produce entropy from flux', () => { ... })
  it('should enforce entropy monotonicity', () => { ... })
  it('should show higher entropy on cliff', () => { ... })
  
  // Dilaton jump
  it('should enforce dilaton jump at interface', () => { ... })
  it('should relate jump to interface energy', () => { ... })
  
  // Energy conservation
  it('should conserve total energy (or account for dissipation)', () => { ... })
  
  // Coercion signatures
  it('should show coercion signatures on cliff field', () => { ... })
  
  // RK4 stability
  it('should integrate smoothly without NaN', () => { ... })
})
```

**Validation**:
- All new tests pass
- Energy conservation: <1% drift (smooth), <3% (cliff)
- Entropy: monotonically increasing
- Dilaton jump: enforced and growing on cliff
- Spectral signature: cliff > smooth by 30x+

---

### Phase 7: Regression & Full Validation ⏳
**Duration**: 1-2 hours  
**Files**: All solver files

**Tasks**:
```typescript
1. Compare v1.0 and v2.0 on same problem:
   - Initialize smooth and cliff
   - Run both systems for same coord time
   - Check that cliff still shows coercion
   - Check that smooth is efficient

2. Run full Antclock test suite:
   npm test -- src/__tests__/antclockSolver.test.ts
   (should still pass, with new regime detectors)

3. Run full two-manifold test suite:
   npm test -- src/__tests__/twoManifoldCoupled.test.ts
   (all v2.0 tests should pass)

4. Integration test:
   - Initialize with smooth + cliff
   - Run Antclock simulation
   - Check that Antclock adapts correctly
   - Verify speedup is maintained (1000x on smooth)

5. Performance benchmark:
   - Time 1000 coordinate time units
   - Count steps for Antclock vs fixed RK4
   - Report speedup factor
```

**Validation Criteria**:
- ✅ All 34+ tests passing
- ✅ Smooth field: 1000x speedup
- ✅ Cliff field: 100x+ speedup
- ✅ Coercion detected (entropy + flux + dilaton jump)
- ✅ Energy conserved / entropy monotone
- ✅ No NaN / infinity in 10000+ step runs
- ✅ Antclock events sparse and meaningful

---

## Timeline & Effort Estimate

| Phase | Task | Hours | Timeline |
|-------|------|-------|----------|
| 1 | State representation | 1-2 | Day 1 |
| 2 | Field equations | 2-3 | Day 1-2 |
| 3 | RK4 integration | 1-2 | Day 2 |
| 4 | Interface coupling | 1-2 | Day 2-3 |
| 5 | Antclock update | 1-2 | Day 3 |
| 6 | Rewrite tests | 2-3 | Day 3-4 |
| 7 | Validation | 1-2 | Day 4 |
| **Total** | | **11-16** | **4-5 days** |

With distractions / debugging: **1-2 weeks realistic**

---

## Risk Mitigation

### Risk 1: RK4 instability on dilaton equation
**Mitigation**: Use smaller dt initially, increase once stable. Consider IMEX scheme if needed.

### Risk 2: Boundary conditions cause reflections
**Mitigation**: Use absorbing BC (e.g., outgoing wave BC) at domain edges.

### Risk 3: Dilaton jump enforcement breaks convergence
**Mitigation**: Implement as weak constraint (penalty method) instead of hard boundary condition.

### Risk 4: Antclock regime detectors fire too often
**Mitigation**: Tune thresholds (flux_threshold, jump_threshold) based on initial runs.

### Risk 5: Tests fail due to unforeseen bugs
**Mitigation**: Implement debug logging; run individual tests in isolation; use print statements.

---

## Success Criteria (Definition of Done)

**v2.0 Implementation is complete when**:

1. ✅ All 7 phases implemented
2. ✅ All tests passing (v2.0 suite)
3. ✅ Antclock still works (16/16 passing)
4. ✅ Energy conserved or accounted for
5. ✅ Entropy monotonically increasing
6. ✅ Coercion signatures visible (smooth < cliff)
7. ✅ No NaN/infinity in long runs (10000 steps)
8. ✅ Antclock speedup ≥ 100x on cliff, ≥ 1000x on smooth
9. ✅ Documention updated (spec + code comments)
10. ✅ Ready for higher-dimensional extension

---

## Getting Started

**Week 1 (This week)**:
- [ ] Review all documentation (this document + 4 others)
- [ ] Agree on design choices (already done: U=0, continuous X, entropy-based leak, linear V)
- [ ] Set up git branch (`git checkout -b dilaton-gravity-v2`)
- [ ] Begin Phase 1

**Week 2**:
- [ ] Complete Phases 1-4 (state, equations, RK4, interface)
- [ ] First successful RK4 run (no NaN)
- [ ] Implement energy flux correctly

**Week 3**:
- [ ] Complete Phase 5 (Antclock update)
- [ ] Complete Phase 6-7 (tests + validation)
- [ ] All tests passing
- [ ] Speedup validated

---

## Questions Before Starting?

1. Should U(X) stay 0, or add kinetic term for richer dynamics?
2. Should interface match dilaton (X = X̃) or allow slip?
3. Should we add code comments for each new equation, or just docstrings?
4. Should we keep v1.0 code in git history, or replace it?
5. Any other design preferences?

---

**Status**: Ready to implement  
**Next**: Agree on questions above, then begin Phase 1  
**Expected Duration**: 1-2 weeks  
**Confidence**: High (all theory solid, roadmap clear)

This is the critical path to production. Let's get it done. 🚀
