# Phase 4 Readiness: Architecture & Approach

**Status**: Ready to begin (after Phase 3 consolidation)  
**Key Principle**: Decouple changes. Strengthen one thing at a time.  
**Expected Duration**: 2-3 hours  
**Success Metric**: Energy conserved relationally. All tests green. No regressions.

---

## Phase 4 Goal (Clear Statement)

Add bidirectional energy flow between bulk fields and interface while maintaining:
- ✅ RK4 numerical stability
- ✅ Energy conservation (relational, not absolute)
- ✅ All Phase 3 tests still passing
- ✅ No new types or architecture changes

---

## Why Phase 4 Is Safe

Because Phase 3 was built right:

| Aspect | Why Safe |
|--------|----------|
| **λ_jump strengthening** | Penalty methods are modular. Increase λ, same RK4 loop. |
| **Bulk feedback** | Interface contribution to T00 is additive. No restructuring needed. |
| **Energy testing** | Relational audit decouples from absolute precision. |
| **RK4 integration** | Already handles 5 interface scalars. Bulk RHS just takes iface parameter. |
| **Type system** | No new fields. Existing InterfaceState sufficient. |

**Result**: Each change is orthogonal. No tangled refactoring.

---

## Phase 4 Two-Step Sequence

### Step 1: Strengthen Junction (λ_jump Increase)

**Duration**: 30 minutes  
**Change**: One number, one parameter function

**In `computeInterfaceRHS()`**:
```typescript
// Line ~395 in twoManifoldCoupled.ts
const F_junction = 0.1 * (actual_jump - target_jump);  // was: 0.01
```

**Why first**: 
- Isolated change (no bulk code affected)
- If it passes → penalty framework is solid
- If it fails → stiffness is penalty-related, easy to diagnose
- Establishes baseline for Phase 4b comparison

**Tests**:
- Run Phase 3 suite (8/8 should pass)
- Run Phase 2 suite (12/12 should pass)
- Observe: Interface motion is ~10× more responsive to junction target

---

### Step 2: Add Bulk Feedback (Interface Stress-Energy)

**Duration**: 2 hours  
**Changes**: RHS function signature, energy source term

**In `computeXRHS()`**:
```typescript
// Add iface parameter
function computeXRHS(
  bulk: DilatonGRState,
  iface: InterfaceState,  // NEW
  dx: number
): Vec {
  const laplacian_X = laplacian(bulk.X, dx);
  const T00 = computeMatterStress(bulk, dx);
  
  // Add interface stress-energy
  const T00_iface = zeros(bulk.X.length);
  const i_b = iface.x_b_index;
  T00_iface[i_b] += iface.s;  // entropy as scalar stress
  
  const source = add(
    T00.map(t => 8 * Math.PI * t),
    T00_iface.map(t => 8 * Math.PI * t)
  );
  
  return add(laplacian_X, source);
}
```

**In `stepRK4()` RHS calls**:
```typescript
// Change from:
const k1 = computeDerivatives(bulk);

// To:
const k1 = computeDerivatives(bulk, iface);  // pass iface to all RHS functions
```

**Why second**: 
- Depends on Phase 4a (λ_jump) being tuned correctly
- Bulk feedback is new coupling; isolate it from penalty tuning
- If Phase 4b breaks, you know it's feedback-related

**Tests**:
- Run Phase 3 suite (8/8 should pass)
- Run Phase 2 suite (12/12 should pass, though bulk RHS changed)
- Run new Phase 4 tests (3-4 new tests)
- Energy audit: E_bulk_lost ≈ E_interface_gained

---

## Phase 4 Test Suite (Minimal, Focused)

### Test 1: Junction Stronger (Phase 4a validation)
```typescript
it('λ_jump=0.1 enforces junction condition better than 0.01', () => {
  const state = initializeCliff(32, 2.0);
  let current = state;
  
  // Run 50 steps
  for (let i = 0; i < 50; i++) {
    current = stepRK4(current, 0.01);
  }
  
  // Assert: interface closer to junction target
  const X_x = derivative(current.bulk.X, current.dx);
  const jump_at_xb = sampleAtPosition(X_x, current.interface.x_b, current.L, current.dx);
  const target = 8 * Math.PI * current.interface.s;
  
  // With stronger penalty, error should be < 0.1 * target (10%)
  expect(Math.abs(jump_at_xb - target)).toBeLessThan(0.1 * Math.abs(target) + 0.1);
});
```

### Test 2: Bulk Responds to Interface (Phase 4b validation)
```typescript
it('bulk X field responds to interface entropy via stress-energy', () => {
  const state = initializeCliff(32, 2.0);
  let current = state;
  
  const X_before = current.bulk.X[current.interface.x_b_index];
  
  for (let i = 0; i < 50; i++) {
    current = stepRK4(current, 0.01);
  }
  
  const X_after = current.bulk.X[current.interface.x_b_index];
  
  // X should deform in response to interface entropy (s > 0 initially)
  expect(Math.abs(X_after - X_before)).toBeGreaterThan(1e-3);
  // (X deforms when interface stress acts on it)
});
```

### Test 3: Energy Conserved Relationally (Core Phase 4 validation)
```typescript
it('energy flows from bulk to interface (balanced exchange)', () => {
  const state = initializeCliff(32, 2.0);
  let current = state;
  
  for (let i = 0; i < 50; i++) {
    const before = {
      E_bulk: totalEnergy_bulk(current),
      s: current.interface.s,
    };
    
    current = stepRK4(current, 0.01);
    
    const after = {
      E_bulk: totalEnergy_bulk(current),
      s: current.interface.s,
    };
    
    const E_lost_bulk = before.E_bulk - after.E_bulk;
    const s_gained = after.s - before.s;
    
    // Energy should flow: bulk loses ≈ interface gains
    // Allow 5% tolerance for interpolation error
    const tolerance = 0.05 * Math.max(Math.abs(E_lost_bulk), Math.abs(s_gained)) + 1e-4;
    expect(Math.abs(E_lost_bulk - s_gained)).toBeLessThan(tolerance);
  }
});
```

### Test 4: Second Law Still Holds
```typescript
it('entropy non-decreasing with full Phase 4 coupling', () => {
  const state = initializeCliff(32, 2.0);
  let current = state;
  
  const s_history: number[] = [current.interface.s];
  
  for (let i = 0; i < 50; i++) {
    current = stepRK4(current, 0.01);
    s_history.push(current.interface.s);
  }
  
  // Entropy should not decrease on average (allow small noise)
  let violations = 0;
  for (let i = 1; i < s_history.length; i++) {
    if (s_history[i] < s_history[i - 1] * 0.99) {  // 1% tolerance
      violations++;
    }
  }
  
  // Max 5 steps can violate (numerical noise)
  expect(violations).toBeLessThan(5);
});
```

---

## Diagnostic Tools (Build Before Coding)

Before you start Phase 4, create these helpers:

### EnergyAudit Function
```typescript
interface EnergyAudit {
  E_bulk_lost: number;
  E_iface_gained: number;
  difference: number;
  flux_integral: number;
}

function auditEnergyFlow(
  before: TwoManifoldState,
  after: TwoManifoldState,
  dt: number
): EnergyAudit {
  const E_bulk_before = totalEnergy_bulk(before);
  const E_bulk_after = totalEnergy_bulk(after);
  const E_lost = E_bulk_before - E_bulk_after;
  
  const s_before = before.interface.s;
  const s_after = after.interface.s;
  const s_gained = s_after - s_before;
  
  const flux = computeEnergyFlux(before.bulk, before.dx, before.interface.x_b_index);
  
  return {
    E_bulk_lost: E_lost,
    E_iface_gained: s_gained,
    difference: E_lost - s_gained,
    flux_integral: flux * dt,
  };
}
```

**Use in debugging**:
```typescript
// If energy audit shows large difference:
const audit = auditEnergyFlow(stateBefore, stateAfter, 0.01);
console.log(`Bulk lost: ${audit.E_bulk_lost.toFixed(6)}`);
console.log(`Iface gained: ${audit.E_iface_gained.toFixed(6)}`);
console.log(`Difference: ${audit.difference.toFixed(6)}`);
console.log(`Flux integral: ${audit.flux_integral.toFixed(6)}`);
```

### Diagnostic Logging
```typescript
function diagnosticStep(state: TwoManifoldState, dt: number) {
  const before = {
    s: state.interface.s,
    x_b: state.interface.x_b,
    E: totalEnergy_bulk(state),
  };
  
  const next = stepRK4(state, dt);
  
  const after = {
    s: next.interface.s,
    x_b: next.interface.x_b,
    E: totalEnergy_bulk(next),
  };
  
  const audit = auditEnergyFlow(state, next, dt);
  
  console.log({
    step: `E=${after.E.toFixed(4)} (Δ=${(after.E - before.E).toFixed(6)})`,
    s_flow: `lost=${audit.E_bulk_lost.toFixed(6)} gained=${audit.E_iface_gained.toFixed(6)}`,
    interface: `x_b=${after.x_b.toFixed(4)} s=${after.s.toFixed(6)}`,
  });
  
  return next;
}
```

---

## Checklist Before Phase 4 Coding

- [ ] Read PHASE_4_STRATEGIC_CAUTIONS.md (understand the two cautions)
- [ ] Sketch the energy audit function
- [ ] Write Phase 4 tests before coding (TDD)
- [ ] Plan which file edits come in which commit
- [ ] Know what "successful Phase 4a" means (8/8 tests still pass, ~10× more junction enforcement)
- [ ] Know what "successful Phase 4b" means (energy balanced, no regressions, new tests pass)
- [ ] Have Phase 3 documentation open (reference, don't break)

---

## If Something Goes Wrong

### Stiffness / NaN in Phase 4a
→ λ_jump = 0.1 is too strong for this metric  
→ Try λ_jump = 0.05 instead  
→ Or keep λ = 0.01, skip 4a, move to 4b

### Energy Drift in Phase 4b
→ Check that bulk RHS receives iface parameter  
→ Check that i_b is computed correctly (should be x_b_index)  
→ Run energy audit to see if bulk→iface or iface→void

### Tests Fail on Phase 2
→ You modified bulk RHS; check that iface parameter is passed  
→ Verify computeXRHS(bulk, iface, dx) is called everywhere  
→ Check type signatures match

### "Phase 4 introduces more problems than it solves"
→ Stop. Go back to Phase 3.  
→ Phase 3 is solid; Phase 4 is optional enhancement.  
→ Phase 5 doesn't require Phase 4 to work.  
→ (Though Phase 4 makes the integration cleaner.)

---

## Success Criteria

**Phase 4a complete**:
- ✅ 8/8 Phase 3 tests pass
- ✅ 12/12 Phase 2 tests pass
- ✅ Interface junction enforcement stronger
- ✅ No new NaN/Infinity

**Phase 4b complete**:
- ✅ All Phase 3 tests pass
- ✅ All Phase 2 tests pass
- ✅ 3-4 new Phase 4 tests pass
- ✅ Energy audit shows balanced exchange
- ✅ Entropy non-decreasing
- ✅ No regressions

**Phase 4 total**: 41-45 tests passing (Phase 1b + 2 + 3 + 4 + Antclock)

---

## Then What?

Once Phase 4 is green:

1. **Document Phase 4 completion** (same depth as Phase 3)
2. **Review Phase 5 requirements** (CF extraction, curvature detection, Antclock integration)
3. **Sketch Phase 5 tests** (before coding)
4. **Implement Phase 5** (should be 3-4 hours given Phase 3/4 foundation)

Phase 5 will likely be the smoothest phase because the hard geometric work is done.

---

## Readiness Signal

You're ready for Phase 4 when:
- [ ] Phase 3 documentation reviewed and understood
- [ ] Two cautions (Caution 1 & 2) internalized
- [ ] Phase 4 tests sketched (not coded, just planned)
- [ ] Energy audit function design done
- [ ] File edits listed (stepRK4, computeInterfaceRHS, computeXRHS)

**Go slow. Phase 4 is short but pivotal. Quality > speed.**

