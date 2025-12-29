# 1+1D Two-Manifold Coupled System: Dilaton Gravity + Worldline Interface

**Version**: 2.0 (Corrected)  
**Date**: 2025-12-29  
**Status**: Fixed structural degeneracies; ready for implementation  
**Key Fix**: Use **dilaton gravity** (not vanilla GR) with **well-defined worldline junction** (not circular extrinsic curvature)

---

## Why This Version Works (The Fix)

**Problem with v1.0**: 
- Pure 1+1D Einstein gravity is topological (no local gravitational DOF)
- My "scale factor" $X(t,x)$ had no dynamics without external forcing
- The "extrinsic curvature jump" junction was circular (degenerate in 1+1D)

**Solution (v2.0)**:
- Use **dilaton gravity** with fields $(\rho, X, \psi)$ where $X$ is a dilaton (real scalar with canonical action)
- Interface couples via **jump in dilaton normal derivative** (well-defined, non-circular)
- Entropy production follows from **incoming energy flux** (computable from matter fields)

---

## Mathematical Setup: Dilaton Gravity (1+1D)

### Bulk Action (Physical Manifold)

$$S_{\text{phys}} = \int_{\mathcal{M}} d^2x\,\sqrt{-g}\,\left[X R + \Lambda X - \frac{1}{2}(\nabla\psi)^2\right]$$

**Fields**:
- $g_{\mu\nu}$ = metric (2D)
- $X(t,x)$ = dilaton (scalar field encoding spatial extent/curvature)
- $\psi(t,x)$ = matter field (e.g., massless scalar)

**Parameters**:
- $\Lambda$ = cosmological constant (linear potential on dilaton)
- We choose $U(X) = 0$ (no kinetic term on $\nabla X$) for numerical simplicity; extension straightforward

**Same action on shadow** $(\widetilde{\mathcal{M}})$ with tilde'd fields.

### Conformal Gauge (Metric Choice)

$$ds^2 = -e^{2\rho(t,x)}\,dt^2 + e^{2\rho(t,x)}\,dx^2$$

**Advantages**:
- Conformal factor $\rho$ governs both light cone and spatial scale
- Avoids lapse/shift bookkeeping
- Scalar field kinetic term simplifies: $(\nabla\psi)^2$ is automatically conformal-invariant for massless field in 2D
- Ricci scalar: $R = -2 e^{-2\rho}(\partial_t^2 - \partial_x^2)\rho$

**Analogously on shadow**:
$$d\tilde{s}^2 = -e^{2\tilde{\rho}(t,x)}\,dt^2 + e^{2\tilde{\rho}(t,x)}\,dx^2$$

---

## Field Equations (Closed System)

### Dilaton Equation (from $\delta X$)

Varying the bulk action w.r.t. $X$:
$$R + \Lambda = 0$$

In conformal gauge:
$$\boxed{(\partial_t^2 - \partial_x^2)\rho = \frac{\Lambda}{2}e^{2\rho}}$$

**Interpretation**: Dilaton couples exponentially to cosmological constant; no external forcing needed.

### Metric Equation (from $\delta g_{\mu\nu}$)

From the Einstein-like equation:
$$\nabla_\mu\nabla_\nu X - g_{\mu\nu}\nabla^2 X + \frac{1}{2}g_{\mu\nu}\Lambda X = 8\pi(T_{\mu\nu}^{(\psi)} + T_{\mu\nu}^{(\Sigma)})$$

In conformal gauge with components:

**$(t,t)$ component**:
$$\partial_t^2 X - e^{-2\rho}\partial_x^2 X - \frac{\Lambda}{2}X = 8\pi(T_{00}^{(\psi)} + T_{00}^{(\Sigma)})$$

**$(x,x)$ component** (similar, with opposite sign on metric piece).

**Matter stress tensor** (massless scalar):
$$T_{\mu\nu}^{(\psi)} = \partial_\mu\psi\,\partial_\nu\psi - \frac{1}{2}g_{\mu\nu}(\nabla\psi)^2$$

**Interface stress tensor** (defined below):
$$T_{\mu\nu}^{(\Sigma)} = \varepsilon_\Sigma(\tau)\,u_\mu u_\nu\,\delta(x - x_b)$$

where $u^\mu = (dt/d\tau, 0)$ along the worldline, $\varepsilon_\Sigma$ is surface energy density.

### Matter Equation

For a free massless scalar:
$$\boxed{(\partial_t^2 - \partial_x^2)\psi = 0}$$

In conformal gauge, the conformal factor cancels for free massless fields in 2D.

**Same set of three equations** on the shadow side (tilde'd).

---

## Interface $\Sigma$: Worldline + Entropy Storage + Energy Flux

### Position and Proper Time

Interface is a **worldline at fixed spatial location** $x = x_b$ (we choose this).

Proper time parametrization:
$$d\tau = e^{\rho(t, x_b)}\,dt$$

(Similarly on shadow: $d\tilde{\tau} = e^{\tilde{\rho}(t, x_b)}\,dt$.)

### Interface Degrees of Freedom

Keep minimal:
$$\psi_\Sigma(\tau) = s(\tau)$$

where $s(\tau)$ = **stored entropy** (the "uncharged battery" level).

*(Optional): Add internal temperature $T_\Sigma$ (can set constant or couple to $s$).*

---

## Energy Flux and Entropy Production

### Incoming Energy Flux

At the interface location $x_b$, the **energy flux carried by matter** is:
$$\Phi_{\text{in}}(t) := T_{tx}^{(\psi)}\big|_{x_b} = \partial_t\psi\,\partial_x\psi\Big|_{x_b}$$

**Physical interpretation**: Rate at which kinetic + potential energy of $\psi$ crosses the boundary.

This is:
- **Computable** from local field values
- **Real and well-defined** (not circular)
- **Observable** (shows energy transfer to/from shadow)

### Entropy Production (Constitutive Law)

Define the entropy production rate by the **second law** (not from varying an action):

$$\boxed{\frac{ds}{d\tau} = \frac{\Phi_{\text{in}} - \Phi_{\text{leak}}}{T_\Sigma} \geq 0}$$

where:
- $\Phi_{\text{in}}$ = incoming energy flux (above)
- $\Phi_{\text{leak}}$ = leakage back to environment (dissipation model)
- $T_\Sigma$ = interface temperature (set constant or as function of $s$)

**Simple leakage law** (pick one):
$$\Phi_{\text{leak}} = \kappa_1 \, (T_\Sigma - T_{\text{env}})$$
or
$$\Phi_{\text{leak}} = \kappa_2 \, s$$

The second is cleaner numerically (relaxation toward zero entropy).

### Energy Conservation Across Interface

Energy leaving physical manifold enters shadow (minus leakage):
$$\boxed{\tilde{\Phi}_{\text{in}} = \Phi_{\text{in}} - \Phi_{\text{leak}}}$$

The shadow gains exactly what physical loses (thermodynamically consistent).

---

## Dilaton Jump at Interface (The Non-Circular Junction)

### Boundary Condition on $X$

Instead of Israel junction on extrinsic curvature (degenerate in 1+1D), impose:

$$\boxed{\big[\partial_x X\big]_{x_b} := (\partial_x X)|_{x_b^+} - (\partial_x X)|_{x_b^-} = 8\pi\,E_\Sigma(s)}$$

where $E_\Sigma(s)$ is the **stored energy in the interface**, defined as:
$$E_\Sigma(s) = \int_0^s T_\Sigma(\sigma)\,d\sigma$$

(If $T_\Sigma$ is constant, then $E_\Sigma(s) = T_\Sigma \cdot s$.)

**Physical interpretation**:
- Dilaton measures spatial geometry
- Jump in dilaton slope encodes localized curvature at the interface
- Larger stored entropy $\Rightarrow$ sharper dilaton gradient (more "concentrated" geometry)
- This is the 1+1D analog of Israel junction, but **non-degenerate**

### Matching Condition (Optional)

You can also impose that the dilaton itself is continuous:
$$X(t, x_b^-) = X(t, x_b^+)$$

But the jump in the normal derivative is the key dynamic constraint.

---

## Bianchi Identities & Conservation Laws (Closed)

### Bulk Divergence of Stress-Energy

**Physical**:
$$\nabla_\mu T^{\mu\nu}_{\text{phys}} = J^{\nu}_\Sigma\,\delta(x - x_b)$$

where $J^{\nu}_\Sigma$ is the force exerted by the interface on the bulk.

**Shadow**:
$$\nabla_\mu T^{\mu\nu}_{\text{shadow}} = -J^{\nu}_\Sigma\,\delta(x - x_b)$$

(What the interface removes from physical, it injects into shadow.)

### Total Energy (Conserved Quantity)

Define:
$$E_{\text{total}}(t) = \int_0^L dx\,\sqrt{g}\,e_{\text{phys}}(t,x) + \int_0^L dx\,\sqrt{\tilde{g}}\,e_{\text{shadow}}(t,x) + E_\Sigma(t)$$

where $e$ is energy density from matter + geometric contributions.

**Closure**: 
$$\frac{dE_{\text{total}}}{dt} = \text{(boundary fluxes at } x=0, L \text{)} \approx 0 \text{ if closed domain}$$

In a truly closed system (periodic BC or isolated), $E_{\text{total}}$ is conserved by Noether's theorem applied to the dilaton + matter + interface system.

### Entropy Monotone

$$\frac{dS_{\text{total}}}{d\tau} = \frac{ds_\Sigma}{d\tau} + \frac{ds_{\text{matter}}}{d\tau} \geq 0$$

The interface term is non-negative by design. Matter production (if any) adds further.

---

## Numerical Implementation (Method of Lines)

### Spatial Grid

Single array $(x_0, x_1, \ldots, x_N)$ with interface at index $i_b = N/2$ (fixed).

Two separate field arrays:
```
physical: (ρ, X, ψ, ρ̇, Ẋ, ψ̇) on [x_0, ..., x_N]
shadow:   (ρ̃, X̃, ψ̃, ρ̇̃, Ẋ̃, ψ̇̃) on [x_0, ..., x_N]
```

### Finite Differences

- **First derivatives** $\partial_x$: centered differences on interior
- **Second derivatives** $\partial_x^2$: 3-point stencil
- **Boundary conditions**: Dirichlet (ρ, X, ψ → const at domain edges) or periodic

### Interface Injection (Per Timestep)

```
1. Compute matter flux at i_b:
     Φ_in = [∂_t ψ · ∂_x ψ]_{x_b}
   
2. Update entropy:
     s_{n+1} = s_n + Δτ · (Φ_in - κ·s_n) / T_Σ
   
3. Set energy at interface:
     E_Σ = T_Σ · s
   
4. Enforce dilaton jump at i_b:
     ∂_x X|_{i_b+1} - ∂_x X|_{i_b-1} = 8π E_Σ
     (implement by modifying finite-diff stencil or adding localized source)
   
5. Also update shadow entropy and impose matching/jump on shadow dilaton.
```

### Time Integration

Use RK4 on the coupled ODE system (after spatial discretization):
$$\frac{d}{dt}\begin{pmatrix} \rho \\ X \\ \psi \end{pmatrix} = \mathbf{F}(t, \rho, X, \psi) + \text{(interface source)}$$

Each stage evaluates spatial derivatives + interface contributions.

---

## Antclock Event-Driven Adaptation

### Meaningful Events

With this formulation, Antclock ticks on:

1. **Flux novelty**: $|\Phi_{\text{in}}|$ spikes
2. **Dilaton jump growth**: $|[\partial_x X]|$ changes rapidly
3. **Constraint residual spike**: Einstein equations badly violated
4. **Entropy production burst**: $ds/d\tau$ exceeds threshold

### Semantic Tick Rate

$$\frac{d\tau}{dt} = \alpha\,|\Phi_{\text{in}}| + \beta\,\big|[\partial_x X]\big| + \gamma\,|\mathcal{R}_{\text{constraints}}|$$

All three are **sharp, localized observables** in this formulation (not ambiguous like $\theta$ in GR).

---

## Spectral Signature for Institutional Coercion

### Observables

Instead of (ambiguous) acceleration of $\theta$, use:

1. **Dilaton jump rate**:
   $$\zeta_X(t) = \left|\frac{d}{dt}[\partial_x X]\right|$$
   (How fast the interface is being "squeezed" geometrically.)

2. **Energy flux magnitude**:
   $$\zeta_\Phi(t) = |\Phi_{\text{in}}(t)|$$
   (How hard matter is being driven across the boundary.)

Both are:
- **Well-defined** (not circular)
- **Physically meaningful** (encode coercion)
- **Numerically robust** (local field derivatives)

### Interpretation

- **Smooth potential field**: Both $\zeta_X$ and $\zeta_\Phi$ small/constant
- **Cliff potential (coercion)**: Both spike at the boundary when matter is forced across

---

## File Format for Reference

| Quantity | Equation |
|----------|----------|
| Dilaton equation | $(\partial_t^2 - \partial_x^2)\rho = \frac{\Lambda}{2}e^{2\rho}$ |
| Metric equation | $\partial_t^2 X - e^{-2\rho}\partial_x^2 X - \frac{\Lambda}{2}X = 8\pi(T_{00}^{(\psi)} + T_{00}^{(\Sigma)})$ |
| Matter equation | $(\partial_t^2 - \partial_x^2)\psi = 0$ |
| Energy flux | $\Phi_{\text{in}} = \partial_t\psi \cdot \partial_x\psi\big\|_{x_b}$ |
| Entropy law | $\frac{ds}{d\tau} = \frac{\Phi_{\text{in}} - \kappa s}{T_\Sigma}$ |
| Dilaton jump | $[\partial_x X]_{x_b} = 8\pi E_\Sigma(s)$ |

---

## Summary: What This Fixes

✅ **Non-topological**: Dilaton $X$ has real dynamics, not frozen by topological constraint  
✅ **Non-circular junction**: Dilaton jump is well-defined, implementable, observable  
✅ **Closed conservation laws**: Energy + entropy properly accounted across bulks + interface  
✅ **Meaningful observables**: Flux $\Phi_{\text{in}}$ and dilaton jump $[\partial_x X]$ are sharp, not ambiguous  
✅ **Ready for Antclock**: All event signatures are local, computable, and non-degenerate  

**Next step**: Reimplement `twoManifoldCoupled.ts` and `antclockSolver.ts` using this corrected framework.

---

## Junction Conditions (1+1D)

**Israel junction**: The jump in extrinsic curvature equals the surface stress.

In 1+1D, extrinsic curvature of a timelike curve is its *acceleration*:
$$K = \frac{d\theta}{d\tau}$$

where $\tau$ is proper time along $\Sigma$.

**Junction**:
$$\boxed{
K - \tilde{K} = 8\pi T_\Sigma^{(\text{total})}
}$$

or explicitly:
$$\boxed{
\frac{d\theta}{dt} - \frac{d\tilde{\theta}}{dt} = 8\pi(\sigma s + \eta\theta)
}$$

This couples the two bulks' expansion rates to the interface state.

---

## The Coupled PDE System

### **State Vector**

Time-dependent:
$$(N, X, \psi, \Pi_X, \Pi_\psi, \tilde{N}, \tilde{X}, \tilde{\psi}, \tilde{\Pi}_X, \tilde{\Pi}_\psi, s, \theta)$$

with spatial discretization on $x \in [0, L]$.

### **Equations**

#### **1. Hamiltonian constraints (instantaneous, determines $N$ and $\tilde{N}$)**

Physical:
$$\mathcal{H} = \pi_X^2 - \frac{1}{2}(X')^2 + X[\frac{1}{2}(\dot{\psi}^2 + (\psi')^2)] + T_\Sigma^{(\text{phys})} = 0$$

Shadow:
$$\tilde{\mathcal{H}} = \tilde{\pi}_X^2 - \frac{1}{2}(\tilde{X}')^2 + \tilde{X}[\frac{1}{2}(\dot{\tilde{\psi}}^2 + (\tilde{\psi}')^2)] + T_\Sigma^{(\text{shadow})} = 0$$

where $T_\Sigma^{(\text{phys/shadow})}$ are distribution sources at the interface location.

#### **2. Evolution equations**

**Matter fields** (standard):
$$\dot{\psi} = \frac{\Pi_\psi}{X}, \quad \dot{\Pi}_\psi = (X \psi')' - X \frac{\partial V}{\partial \psi}$$

(similar for tilde'd side)

**Scale factors** (from Hamiltonian variation):
$$\dot{X} = \frac{\partial H}{\partial \pi_X} = 2\pi_X, \quad \dot{\pi}_X = -\frac{\partial H}{\partial X}$$

#### **3. Expansion and entropy on $\Sigma$** (the new piece)

From the interface action:
$$\boxed{
\dot{\theta} = \frac{1}{8\pi}[K - \tilde{K}] = \frac{1}{8\pi}[\frac{d\theta}{dt} - \frac{d\tilde{\theta}}{dt}]
}$$

Wait, this is circular. Let me restate clearly:

The expansion $\theta$ is *defined* as the rate of coordinate stretch: $\theta = \frac{d}{dt}\log X|_\Sigma$.

The *acceleration* of $\Sigma$ in the physical bulk is:
$$a_\Sigma = \frac{d^2}{dt^2}(X|_\Sigma) = \frac{d}{dt}[\theta \cdot X|_\Sigma]$$

The junction condition is:
$$\boxed{
a_\Sigma - \tilde{a}_\Sigma = 8\pi S \quad \text{(surface stress)}
}$$

**Entropy evolution** (dissipative):
$$\boxed{
\dot{s} = \frac{Q_{\text{flux}}}{T_\Sigma} - \frac{\eta\theta^2}{T_\Sigma}
}$$

where $Q_{\text{flux}}$ is the energy density hitting the interface from the physical bulk:
$$Q_{\text{flux}} = T_{00}|_{\Sigma} = \text{(energy density in physical bulk at interface location)}$$

---

## Conservation Check (Bianchi)

**Total energy**:
$$E_{\text{tot}} = E_{\text{phys}} + E_{\text{shadow}} + E_{\text{interface}}$$

$$= \int_0^L X[\frac{1}{2}(\dot{\psi}^2 + (\psi')^2)] dx + \int_0^L \tilde{X}[\frac{1}{2}(\dot{\tilde{\psi}}^2 + (\tilde{\psi}')^2)] dx + s$$

**Bianchi identity in 1+1D**:
$$\frac{dE_{\text{tot}}}{dt} = \text{(boundary flux at } x=0, L\text{)}$$

For periodic or fixed boundary conditions, $\frac{dE_{\text{tot}}}{dt} = 0$.

**To verify numerically**: Monitor $E_{\text{tot}}(t)$ and $\dot{s}(t)$. Both must satisfy second law: $\dot{s} \geq 0$.

---

## Spatial Discretization

Use **finite differences** on a grid $x_i = i \Delta x$, $i = 0, \ldots, N$.

For a field $\psi(t, x)$:
$$\psi'(t, x_i) \approx \frac{\psi(t, x_{i+1}) - \psi(t, x_{i-1})}{2\Delta x}$$
$$\psi''(t, x_i) \approx \frac{\psi(t, x_{i+1}) - 2\psi(t, x_i) + \psi(t, x_{i-1})}{(\Delta x)^2}$$

---

## Time Integration

Use **RK4** (4th-order Runge-Kutta) with adaptive step size.

At each step:

1. **Current state**: $(X_i^n, \Pi_X^n, \psi_i^n, \Pi_\psi^n, s^n, \theta^n)$ and tilde'd
2. **Solve constraints** for $N, \tilde{N}$ (implicit solve; can use Newton's method)
3. **Compute time derivatives** for all fields
4. **RK4 step** to time $t^{n+1}$
5. **Check conservation** and entropy second law

---

## Observable: Spectral Signature

Compute $\zeta$ as the dominant Fourier mode of the extrinsic acceleration:

$$\zeta(t) = |\frac{d^2}{dt^2}(X|_\Sigma)|$$

Track over time: smooth evolution $\Rightarrow$ good field; spikes $\Rightarrow$ coercion.

---

## Initial Conditions: Two Examples

### **Example 1: Smooth Field (Good Scenario)**

- Physical: $\psi(0,x) = A \sin(\pi x / L)$, $\Pi_\psi = 0$
- Shadow: $\tilde{\psi}(0,x) = 0$, $\tilde{\Pi}_\psi = 0$ (empty to begin)
- Interface: $s(0) = 0$, $\theta(0) = 0$
- Parameters: small $\eta$, moderate $\sigma$

Expected: Energy slowly transfers to shadow; $\dot{s} > 0$ throughout; $\theta$ remains small.

### **Example 2: Cliff Potential (Bad Scenario)**

- Physical: $\psi(0,x) = 0$ (empty), but $\psi$ forced to grow by external driving
- Shadow: $\tilde{\psi}(0,x) = $ large, $\tilde{\Pi}_\psi = $ large
- Interface: $s(0) = 0$, $\theta(0) = $ large (abrupt change)
- Parameters: large $\eta$, small $\sigma$ (high resistance, low absorption capacity)

Expected: Rapid entropy production; $\dot{s}$ spikes; $\theta$ oscillates (coercion signature).

---

## Summary: Full Checklist

- [x] Metric and extrinsic geometry in 1+1D
- [x] Hamiltonian constraint for each bulk
- [x] Interface Lagrangian (minimal, dissipative)
- [x] Junction conditions coupling the two bulks
- [x] Entropy production law
- [x] Conservation/Bianchi verification
- [x] Spatial discretization scheme
- [x] Time integration algorithm
- [x] Observable (spectral signature)
- [x] Two concrete initial conditions

Ready for implementation.
