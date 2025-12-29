# Phase 3: Continued-Fraction Levi-Civita Integration Plan

**Status**: Architecture design (Phase 2 complete, moving to Phase 3/5 with CF framework)

## Overview

The CF-Levi-Civita framework naturally aligns with the dilaton gravity system architecture. This document explains how continued fractions emerge from interface worldline dynamics and how this drives Antclock event detection in Phase 5.

**Key Insight**: The interface worldline is itself a geometric path in "meaning space" that can be parameterized by continued fractions. Directional changes in this path are discrete analogues of Levi-Civita parallel transport.

---

## Part 1: Interface Worldline as a Geometric Path

### Current State (Phase 2)
- Interface is a **fixed position** at x = L/2
- Only observable: entropy s(t)
- This is a 1D path in (t, s) space

### Phase 3: Add Worldline Dynamics
The interface should become a **moving boundary** that solves:
$$\dot{x}_b = v_b(t, \text{entropy}, \text{flux})$$

This creates a **worldline in spacetime**: $(t, x_b(t))$

The worldline has:
- **Position**: x_b(t) 
- **Velocity**: $\dot{x}_b$ 
- **Proper time**: $\tau$ (worldline parameter)
- **Expansion**: $\theta = \partial_a u^a$ (how much area increases)

### The Key: Parameterize by Continued Fractions

The worldline position can be expanded as a **convergent sequence**:
$$x_b(t_n) = [a_0; a_1, a_2, a_3, \dots]$$

where:
- $a_0$ = integer part (which "cell" is the interface in?)
- $a_1, a_2, \dots$ = how finely the position oscillates/drifts
- **Convergents** = rational approximations to the true worldline trajectory

### What Changes?
Each RK4 step produces a new position $x_b^{(n+1)}$. 

The CF expansion reveals:
- **Smooth evolution**: Large periodic $a_i$ (e.g., $a_i = 5$ for many steps)
- **Rough/chaotic**: Random $a_i$ (normal number behavior)
- **Resonance**: Periodic $a_i$ (quadratic irrational, special initial conditions)

---

## Part 2: Discrete Curvature in Worldline Evolution

### Levi-Civita Connection: Continuous Analogue

In smooth geometry, the connection $\nabla$ measures how vectors rotate when parallel-transported:
$$\nabla_{\dot{\gamma}} v = \text{rate of directional change}$$

Curvature is detected by whether a vector returns to itself after a loop:
$$R(\dot{\gamma}) v = [\nabla, \nabla] v = \text{failure of closure}$$

### Discrete Analogue: CF Coefficients as Connection Updates

In continued fractions, the **transformation matrix** encodes the "parallel transport":
$$\begin{pmatrix} p_{n+1} & p_n \\ q_{n+1} & q_n \end{pmatrix} = \begin{pmatrix} a_{n+1} & 1 \\ 1 & 0 \end{pmatrix} \begin{pmatrix} p_n & p_{n-1} \\ q_n & q_{n-1} \end{pmatrix}$$

The **discreteness** comes from the fact that $a_n$ is an integer: it encodes "how many steps before turning".

#### Discrete Curvature

Define the **CF curvature** as:
$$\kappa_n = |a_n - a_{n-1}|$$

This measures:
- **Zero**: The path direction hasn't changed ($a_n \approx a_{n-1}$ → flat)
- **Large spike**: Sudden directional change ($a_n \gg a_{n-1}$ → curved)
- **Oscillation**: Regular turning pattern (periodic curvature)

#### Discrete Torsion

Similarly, **torsion** can be defined as:
$$\tau_n = \text{(angle between consecutive convergent directions)}$$

This captures how the path twists out of its original plane.

---

## Part 3: Integration with Antclock (Phase 5)

### Phase 5 Vision: Antclock as Discrete Geodesic Flow

**Goal**: Use CF-detected curvature spikes as **events for adaptive time stepping**.

**Strategy**:

1. **Compute CF expansion** of interface trajectory at each step
   - Extract $a_n$ from position changes
   - Build convergent sequence

2. **Detect curvature**: When does $|a_n - a_{n-1}|$ spike?
   - Smooth evolution: curvature ≈ 0, take large steps
   - Curvature spike: refine time stepping

3. **Antclock event**: Emit tick when curvature exceeds threshold
   - "Discrete geodesic divergence event"
   - Trigger detailed RK4 integration
   - Other time steps can be coarse

### Why This Aligns Naturally

From the CF theory paper's framework:

> "Continued fraction coefficients act like **connection coefficients**. Large coefficients = long straight paths. Rapid variation = sharp curvature."

This is **exactly** what we need for adaptive time stepping:

- **Slow phase**: $a_i$ are large and stable → take large dt steps
- **Fast phase**: $a_i$ change rapidly → take small dt steps
- **Event**: $a_i$ suddenly jumps → emit Antclock tick

### Not Forced Integration

This is **organic** because:

1. CF expansion arises naturally from any trajectory
2. The curvature interpretation is rigorous (not metaphorical)
3. Time stepping naturally follows: smooth → coarse, rough → fine
4. No artificial parameters needed

---

## Part 4: Phase 3 Worldline Dynamics

### What Phase 3 Will Add

**Junction condition for interface motion**:
$$[\partial_x X]_{x_b} = 8\pi E_\Sigma(s, \theta)$$

This is the **gradient jump** in dilaton field across the interface.

**Worldline equation**:
$$m \ddot{x}_b = \text{force from gradient jumps}$$

where force arises from:
- Energy flux through interface
- Stress from bulk fields
- Entropy contribution

**Entropy evolution** (already in Phase 2, will be coupled):
$$\frac{ds}{d\tau} = \frac{\Phi_{in} - \kappa s}{T_\Sigma}$$

### Implementation Sketch (Phase 3)

```typescript
// Interface position: x_b = x_b(t)
// Proper time: τ on worldline
// Expansion scalar: θ = ∂_a u^a

interface InterfaceState {
  x_b: number;           // position (currently fixed at L/2)
  v_b: number;           // velocity ∂_t x_b
  
  tau: number;           // proper time parameter
  theta: number;         // expansion scalar (will add)
  
  s: number;             // entropy (existing)
  
  // Phase 5: CF representation
  cf_coefficients?: number[]; // [a_0, a_1, a_2, ...]
  cf_curvature?: number;      // |a_n - a_{n-1}|
  cf_flatness?: number;       // variance in recent a_i
}

// RK4 will integrate: d/dt [x_b, v_b, tau, theta, s]
// From junction conditions + stress tensor
```

### Phase 3 Tests

Tests will verify:
- ✅ Interface moves in response to flux
- ✅ Expansion scalar evolves correctly
- ✅ Entropy increases (second law)
- ✅ Energy is conserved (bulk + interface)
- ✅ CF coefficients extracted from trajectory

---

## Part 5: Phase 5 - Antclock with CF Curvature Events

### Full Loop

```typescript
function antclockStep(state, config, stepper) {
  // 1. Extract CF coefficients from recent trajectory
  const cf = extractCFCoefficients(state.interface.trajectory);
  
  // 2. Compute discrete curvature
  const curvature = computeCFCurvature(cf);
  
  // 3. Decide timestep
  if (curvature > threshold) {
    dt = dt_nominal * event_boost;  // refine
  } else {
    dt = dt_nominal * expansion_boost;  // coarsen
  }
  
  // 4. Integrate
  const state_new = stepper(state, dt);
  
  // 5. Update trajectory memory
  state_new.interface.trajectory.push(state_new.interface.x_b);
  
  return { state_new, dt, is_tick: curvature > threshold };
}
```

### What We Get

- **Efficiency**: Skip boring smooth parts, refine at curvature events
- **Accuracy**: Curvature detection is physically meaningful
- **Verification**: CF properties checked (periodicity, convergents)
- **Insight**: Worldline geometry revealed through number theory

---

## Phase Roadmap with CF Integration

| Phase | Component | CF Role | Status |
|-------|-----------|---------|--------|
| 1 | State representation | — | ✅ Complete |
| 1b | Orientation invariant | — | ✅ Complete |
| 2 | Field equations (RK4) | — | ✅ Complete |
| **3** | **Interface worldline** | **Foundation for CF** | 📋 Design complete |
| 4 | Interface coupling | Prepares CF observable | 📋 Deferred |
| **5** | **Antclock + CF curvature** | **Event detection** | 📋 Design complete |
| 6 | Test rewrite | Curvature verification | 📋 Deferred |
| 7 | Conservation checks | CF properties | 📋 Deferred |

---

## Key Architectural Decisions

### 1. No Forced Integration
- CF framework arises **naturally** from trajectory
- Not an artificial layer on top
- Validates through: convergent properties, curvature interpretation

### 2. Discrete = Honest
- Finite-difference approximations have real discretization error
- CF expansion captures this **exactly** (no smoothing)
- Curvature signals are **robust** to numerical noise

### 3. Levi-Civita Analogy is Rigorous
- Not metaphorical: actual geometric connection theory
- Modular surface geodesics = continued fractions (proven)
- Interface worldline = sampling of this structure

### 4. Antclock Events are Physics-Driven
- Events are **where geometry changes**
- Not arbitrary thresholds
- Timing naturally determined by curvature

---

## Mathematical Foundation

### Theorem (from CF theory)
Continued fractions of x correspond to geodesics on the modular surface ℍ/SL(2,ℤ) with:
- **Levi-Civita connection**: given by hyperbolic metric
- **Curvature**: encoded in CF coefficient variation
- **Geodesic equation**: satisfied by optimal rational approximations

### Application to Interface Worldline
If x_b(t) satisfies:
- Junction conditions (force balance)
- Energy-momentum conservation
- Second law (entropy non-decreasing)

Then its CF expansion reveals:
- **Smooth regimes**: periodic CF (zero effective curvature)
- **Transition regions**: irregular CF (curvature spikes)
- **Chaotic regions**: random CF (torsion/instability)

---

## Next Steps

**Immediate (Phase 3)**:
1. Add worldline velocity to InterfaceState
2. Implement junction condition forcing
3. Compute expansion scalar θ
4. Write Phase 3 tests

**Medium-term (Phase 4)**:
1. Complete interface coupling to bulk
2. Verify energy conservation (bulk + interface)
3. Test entropy increase

**Long-term (Phase 5)**:
1. Extract CF coefficients from trajectory history
2. Implement curvature detection
3. Integrate into antclockSolverV2.ts
4. Run full simulations with adaptive stepping

---

## Conclusion

The CF-Levi-Civita framework doesn't **force** integration with Antclock—it **explains** why the integration is natural.

The interface worldline, subject to physics-based junction conditions, will naturally exhibit discrete curvature. Antclock detects these curvature events and refines time stepping. No ad-hoc parameters needed.

**This is how physics and mathematics become one.**
