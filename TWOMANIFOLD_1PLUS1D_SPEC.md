# 1+1D Two-Manifold Coupled System: Minimal Implementation

**Version**: 1.0  
**Date**: 2025-12-29  
**Goal**: Implement the full coupled field equations for two spacetimes + interface in 1 space + 1 time dimension

---

## Mathematical Setup (1+1D)

### Geometries

**Physical manifold** $(\mathcal{M}, g_{\mu\nu})$ where $\mu, \nu \in \{0, 1\}$ (time, space).

Metric (assuming lapse + shift):
$$ds^2 = -N^2 dt^2 + (X')^2 dx^2$$

where $N = N(t,x)$ is lapse, $X(t,x)$ is a scalar field (playing the role of spatial extent).

**Shadow manifold** $(\widetilde{\mathcal{M}}, \tilde{g}_{\mu\nu})$ with analogous form:
$$d\tilde{s}^2 = -\tilde{N}^2 dt^2 + (\tilde{X}')^2 dx^2$$

**Interface $\Sigma$**: In 1+1D, this is a **timelike 1D curve** (a worldline at a fixed spatial location, say $x = x_b$).

---

## Canonical Variables

### Bulk Variables

For each manifold, work in ADM formalism:

**Physical side**:
- $N(t)$ = lapse (we set this by choice; for simplicity, $N=1$)
- $X(t)$ = scale factor (plays role of spatial metric component)
- $\Pi_X(t) = \frac{\partial L}{\partial \dot{X}}$ = conjugate momentum to $X$

Simplified Einstein equation in 1+1D (Hamiltonian constraint, no evolution of $N$):
$$\mathcal{H} = \pi_X^2 - \frac{1}{2}(X')^2 + X T_{00}^{\text{matter}} = 0$$

For a massless scalar matter field $\psi$:
$$T_{00}^{\text{matter}} = \frac{1}{2}(\dot{\psi}^2 + (\psi')^2)$$

**Shadow side**: Identical structure, tilde'd.

---

### Interface Variables

The membrane $\Sigma$ is a worldline. Its state is:
$$\psi_\Sigma(t) = (s(t), \theta(t))$$

where:
- $s(t)$ = entropy (accumulates dissipation)
- $\theta(t)$ = extrinsic expansion (rate of motion)

The position of $\Sigma$ in each bulk is $X|_\Sigma$ and $\tilde{X}|_\Sigma$.

---

## Conservation Laws (1+1D Version)

### Bulk Energy Conservation with Interface Source

**Physical**:
$$\frac{d}{dt}\int_0^L \rho(t, x)\, dx = -\text{(flux out at boundaries)} + Q_\Sigma$$

where $Q_\Sigma$ is energy injected/removed by the interface.

**Shadow**:
$$\frac{d}{dt}\int_0^L \tilde{\rho}(t, x)\, dx = +Q_\Sigma$$

(Shadow gains what physical loses, assuming no external work on shadow.)

### Entropy Second Law on $\Sigma$

$$\dot{s} = \frac{Q_{\text{in}}}{T_\Sigma} - \frac{\text{(viscous dissipation)}}{T_\Sigma} \geq 0$$

---

## Minimal Interface Action (1+1D)

On the worldline $\Sigma$:

$$S_\Sigma = \int dt\, \left[\sigma s + \eta \theta^2 - \lambda(X|_\Sigma - \tilde{X}|_\Sigma)\right]$$

where:
- $\sigma$ = surface tension (or entropy coupling)
- $\eta$ = viscous resistance
- $\lambda$ = Lagrange multiplier enforcing metric matching (optional; can drop if you allow slipping)

Vary w.r.t. $s$:
$$\frac{\delta S_\Sigma}{\delta s} = \sigma \quad \Rightarrow \quad S^{(s)} = \sigma$$

Vary w.r.t. $\theta$:
$$\frac{\delta S_\Sigma}{\delta \theta} = 2\eta\theta \quad \Rightarrow \quad \text{(couples to expansion rate)}$$

The stress on the interface:
$$T_\Sigma^{(s)} = \sigma \quad \text{(intrinsic stress)}$$
$$T_\Sigma^{(\theta)} = \eta\theta \quad \text{(dissipative coupling to expansion)}$$

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
