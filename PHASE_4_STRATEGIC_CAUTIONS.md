# Phase 4 Planning: Strategic Cautions & Energy Accounting

**Status**: Pre-implementation guidance  
**Purpose**: Establish Phase 4 approach that builds on Phase 3 architecture without numerical regressions

---

## Phase 4 Context (Why These Cautions Matter)

Phase 3 established:
- ✅ Weakly-coupled interface (λ_jump = 0.01)
- ✅ Stable RK4 integration (no stiffness)
- ✅ Separate x_b (physical) from x_b_index (cache)
- ✅ Worldline history accumulating
- ✅ Soft junction enforcement (non-constraining)

Phase 4 needs to strengthen coupling without destabilizing. **The two cautions below are how.**

---

## ⚠️ CAUTION 1: Never Strengthen Both Couplings Simultaneously

### The Temptation
You might think:
> "I'll increase λ_jump AND add bulk feedback in one commit. Faster, right?"

**Result**: Stiffness, strange energy drifts, tests failing for mysterious reasons.

### Why It Breaks
- λ_jump alone: weak penalty, RK4 handles easily
- Bulk feedback alone: local reaction, RK4 stable
- **Both together**: coupling becomes stiff (implicit-like behavior)
- RK4 can't resolve the interaction without tiny timesteps

### The Correct Sequence

**Phase 4a (First 30 minutes)**:
1. Increase λ_jump from 0.01 to 0.1 (10× stronger)
2. Keep bulk equations **unchanged**
3. Run full test suite → should still pass
4. Assert: Interface motion is ~10× more responsive
5. Assert: Energy conservation still holds
6. Assert: No new NaN/Infinity

**Phase 4b (Next 2 hours)**:
1. Add bulk stress-energy from interface
2. Modify bulk RHS to include interface contribution
3. Keep λ_jump at 0.1 (don't change)
4. Run full test suite → should pass (or simple fixes)
5. Assert: Bulk fields respond to interface motion
6. Assert: Total energy conserved *relationally*

### Why This Order
- Separating the cautions lets you test each in isolation
- If Phase 4a passes, any Phase 4b failures are from bulk feedback (not penalty stiffness)
- You can tune each independently without coupled complexity

---

## ⚠️ CAUTION 2: Test Energy Conservation Relationally, Not Absolutely

### The Problem
With moving boundaries and interpolation, this **WILL fail**:

```typescript
const dE = E_final - E_initial;
expect(dE).toBeLessThan(1e-10);  // ❌ TOO STRICT
```

**Why**: Interpolation at x_b, RK4 staging, periodic boundaries — all introduce tiny drifts.
With interface coupling, small errors accumulate. This is **not a physics bug**; it's numerical noise.

### The Solution: Balanced Exchange Test

Instead, test that energy flows *between* bulk and interface correctly:

```typescript
interface EnergyFlowReport {
  E_bulk_lost: number;       // Energy transferred out of bulk fields
  E_interface_gained: number; // Energy transferred into interface
  E_difference: number;       // should be ≈ 0
  flux_integral: number;      // total flux × dt
}

function energyFlowAudit(
  stateBefore: TwoManifoldState,
  stateAfter: TwoManifoldState,
  dt: number
): EnergyFlowReport {
  const E_bulk_before = totalEnergy_bulk(stateBefore);
  const E_bulk_after = totalEnergy_bulk(stateAfter);
  const E_bulk_lost = E_bulk_before - E_bulk_after;
  
  const E_iface_before = stateBefore.interface.s;
  const E_iface_after = stateAfter.interface.s;
  const E_interface_gained = E_iface_after - E_iface_before;
  
  const flux = computeEnergyFlux(stateBefore.bulk, stateBefore.dx, stateBefore.interface.x_b_index);
  const flux_integral = flux * dt;
  
  return {
    E_bulk_lost,
    E_interface_gained,
    E_difference: E_bulk_lost - E_interface_gained,
    flux_integral,
  };
}
```

### The Test
```typescript
it('energy flows from bulk to interface (balanced exchange)', () => {
  const state = initializeCliff(32, 2.0);
  let current = state;
  
  for (let i = 0; i < 50; i++) {
    const audit = energyFlowAudit(current, stepRK4(current, 0.01), 0.01);
    
    // Energy difference should be small (< 1% of flux)
    expect(Math.abs(audit.E_difference)).toBeLessThan(
      0.01 * Math.abs(audit.flux_integral) + 1e-4
    );
  }
});
```

### Why This Works
- Tests the **relationship** between bulk and interface energy
- Allows for small numerical drift
- Catches real coupling bugs (energy disappearing into void)
- Tolerates reasonable interpolation error
- Scales with system energy (not brittle)

---

## Implementation Sequence (Phase 4 Safe Path)

### 4a: Strengthen Junction Penalty (No Bulk Changes)

**File**: `src/twoManifoldCoupled.ts`

**In `computeInterfaceRHS()`**:
```typescript
// Change from:
const F_junction = 0.01 * (actual_jump - target_jump);

// To:
const F_junction = 0.1 * (actual_jump - target_jump);  // 10× stronger
```

**Tests to verify**:
1. Existing Phase 3 tests still pass (8/8) ✅
2. Interface motion ~10× larger (diagnostic)
3. Energy conservation still valid
4. No NaN/Infinity

**Expected outcome**: Interface follows junction condition more closely, but bulk unchanged.

---

### 4b: Add Bulk↔Interface Feedback

**File**: `src/twoManifoldCoupled.ts`

**Modify `computeXRHS()` (dilaton wave equation)**:

Add interface stress-energy term:
```typescript
// Current (Phase 2):
function computeXRHS(bulk: DilatonGRState, dx: number): Vec {
  const laplacian_X = laplacian(bulk.X, dx);
  const T00 = computeMatterStress(bulk, dx);
  const source = T00.map(t => 8 * Math.PI * t);
  return add(laplacian_X, source);
}

// Phase 4 (with interface):
function computeXRHS(
  bulk: DilatonGRState,
  iface: InterfaceState,
  dx: number
): Vec {
  const laplacian_X = laplacian(bulk.X, dx);
  const T00 = computeMatterStress(bulk, dx);
  
  // Add interface stress-energy (entropy as scalar stress)
  const T00_iface = zeros(bulk.X.length);
  const i_b = iface.x_b_index;
  T00_iface[i_b] += iface.s;  // entropy contributes to stress
  
  const source_bulk = T00.map(t => 8 * Math.PI * t);
  const source_iface = T00_iface.map(t => 8 * Math.PI * t);
  const source = add(source_bulk, source_iface);
  
  return add(laplacian_X, source);
}
```

**Update stepRK4() to pass interface to bulk RHS**:
```typescript
// Current pattern:
const k1 = computeDerivatives(bulk);

// Phase 4 pattern:
const k1 = computeDerivatives(bulk, iface);
```

**Tests to verify**:
1. Phase 3 tests still pass (8/8) ✅
2. Bulk field (X) responds to interface entropy
3. Energy balanced exchange (Caution 2 audit)
4. No regressions

---

## Phase 4 Test Suite (Recommended New Tests)

### Test 1: Penalty Strengthening (Phase 4a validation)
```typescript
it('stronger penalty (λ=0.1) enforces junction condition better', () => {
  // Run cliff scenario
  // Assert: [∂_x X]_{x_b} closer to target (8π*s)
  // Assert: energy still conserved
});
```

### Test 2: Bulk Feedback (Phase 4b validation)
```typescript
it('interface entropy feeds back to bulk via stress-energy', () => {
  // Run cliff scenario with Phase 4b coupling
  // Assert: bulk X field deforms in response to s
  // Assert: deformation scales with interface.s
  // Assert: energy balanced
});
```

### Test 3: Total Energy Conservation (Relational)
```typescript
it('energy flows relationally between bulk and interface', () => {
  // Run simulation
  // For each step: audit energy flow
  // Assert: E_bulk_lost ≈ E_interface_gained (within tolerance)
  // Assert: no energy disappears
});
```

### Test 4: Second Law Still Holds
```typescript
it('entropy non-decreasing with full Phase 4 coupling', () => {
  // Run with Phase 4 coupling
  // Assert: s monotonically non-decreasing
  // Assert: flux drives entropy production
});
```

---

## Red Flags (What to Watch For)

### 🚩 If Phase 4a fails (penalty strengthening alone)
- → RK4 stiffness, oscillations, or NaN
- → Solution: Reduce λ_jump (try 0.05 instead of 0.1)
- → Root cause: Junction condition too stiff for this metric

### 🚩 If Phase 4b fails (bulk feedback)
- → Energy doesn't balance, drifts rapidly
- → Solution: Check that stress is applied at correct index
- → Check that bulk RHS receives interface term correctly

### 🚩 If energy drifts >1% per step
- → Interpolation error, not a physics bug (probably)
- → Solution: Relax tolerance, don't chase "perfect" conservation
- → Verify using energy flow audit (Caution 2)

---

## When to Stop Enforcing "Physics"

A subtle point: At some stage, you'll face a choice:

> Should I implement the *exact* GR junction condition?  
> Or is the penalty-based proxy sufficient?

**My recommendation**: Stop at "penalty-based soft enforcement."

**Why**: 
- Hard constraints ≈ Lagrange multipliers ≈ implicit methods
- Implicit RK4 is possible but expensive and subtle
- Penalty methods are proven numerically stable here
- Phase 5 doesn't need exact junctions; it needs stable worldlines

**The principle**: Let geometry guide you, but don't let formalism trap you.
When a soft approximation is numerically sound and conceptually clear, take it.

---

## Summary: Phase 4 Approach

| Phase | Focus | Change | Caution |
|-------|-------|--------|---------|
| 4a | Strengthen λ_jump | λ: 0.01 → 0.1 | Solo change (don't add bulk feedback yet) |
| 4b | Add bulk feedback | Include iface.s in T00 source | Relational energy, not absolute |
| 4c | Verify integration | Full test suite | Red flags above → tune parameters |

**Total estimated time**: 2-3 hours (4a: 30 min, 4b: 2 hours, 4c: 30 min)

**Expected outcome**: Full bidirectional bulk↔interface coupling, energy conserved, ready for Phase 5.

---

## Sanity Check Points (Before You Code)

1. **Do you have the energy audit function sketched?** (Caution 2)
2. **Can you increase λ_jump alone without touching bulk RHS?** (Caution 1)
3. **Do you understand why relational conservation matters?** (Caution 2)
4. **Are your Phase 4 tests designed before coding?** (TDD)

If "yes" to all → Phase 4 will be smooth.  
If "no" to any → ask before coding.

---

## Signal & Next Steps

You've built Phase 3 correctly. These cautions aren't pessimism; they're just **avoiding the known failure modes** of coupled systems.

When you're ready to code Phase 4:
- Start with 4a (penalty strengthening)
- Get tests green
- Then add 4b (bulk feedback)
- Use energy audit to validate
- Phase 5 will feel nearly automatic

I'm here for:
- Sanity-checking the energy accounting before you write it
- Reviewing Phase 4 RHS modifications
- Helping debug any stiffness issues that emerge
- Deciding when "good enough" is actually complete

This is solid ground. Phase 4 is within reach.

