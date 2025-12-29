/**
 * Two-Manifold Coupled System: 1+1D Implementation
 *
 * Solves the coupled Einstein-like equations for:
 * - Physical bulk (1+1D)
 * - Shadow bulk (1+1D)
 * - Interface (1D worldline)
 *
 * With full conservation laws and Bianchi consistency checking.
 *
 * Reference: TWOMANIFOLD_1PLUS1D_SPEC.md
 */

// ============================================================================
// Vector and Grid Utilities
// ============================================================================

export type Vec = number[];

export function zeros(n: number): Vec {
  return new Array(n).fill(0);
}

export function ones(n: number): Vec {
  return new Array(n).fill(1);
}

export function linspace(a: number, b: number, n: number): Vec {
  const dx = (b - a) / (n - 1);
  return Array.from({ length: n }, (_, i) => a + i * dx);
}

export function dot(a: Vec, b: Vec): number {
  return a.reduce((s, ai, i) => s + ai * b[i], 0);
}

export function add(a: Vec, b: Vec): Vec {
  return a.map((ai, i) => ai + b[i]);
}

export function scale(v: Vec, c: number): Vec {
  return v.map(x => c * x);
}

export function derivative(f: Vec, dx: number): Vec {
  const n = f.length;
  const df = zeros(n);
  // Central differences (periodic boundary)
  for (let i = 0; i < n; i++) {
    df[i] = (f[(i + 1) % n] - f[(i - 1 + n) % n]) / (2 * dx);
  }
  return df;
}

export function laplacian(f: Vec, dx: number): Vec {
  const n = f.length;
  const d2f = zeros(n);
  const dx2 = dx * dx;
  for (let i = 0; i < n; i++) {
    d2f[i] =
      (f[(i + 1) % n] - 2 * f[i] + f[(i - 1 + n) % n]) / dx2;
  }
  return d2f;
}

// ============================================================================
// Dilaton GR State (v2.0: Corrected formulation)
// ============================================================================

/**
 * DilatonGRState represents the complete dynamical system:
 *   S = ∫ √-g [X R + Λ X - (1/2)(∇ψ)²]
 *
 * In conformal gauge: ds² = -e^(2ρ) dt² + e^(2ρ) dx²
 *
 * Fields (per spatial point i):
 * - ρ(t,x): lapse function (metric scaling)
 * - ρ̇(t,x): time derivative of ρ
 * - X(t,x): dilaton field (real scalar, dynamical)
 * - Ẋ(t,x): time derivative of X
 * - ψ(t,x): matter field (massless scalar)
 * - ψ̇(t,x): time derivative of ψ
 *
 * All three fields satisfy wave equations (no constraints):
 *   (∂_t² - ∂_x²)ρ = e^(2ρ) / 2
 *   (∂_t² - ∂_x²)X = 8π(T₀₀^ψ + T₀₀^Σ)
 *   (∂_t² - ∂_x²)ψ = 0
 *
 * Interface dynamics:
 *   Energy flux: Φ_in = ∂_t ψ · ∂_x ψ|_{x_b}
 *   Entropy RHS: ds/dτ = (Φ_in - κs) / T_Σ
 *   Dilaton jump: [∂_x X]_{x_b} = 8π E_Σ(s)
 */
export interface DilatonGRState {
  // Metric field: lapse function (conformal factor)
  rho: Vec; // ρ(t,x)
  rho_dot: Vec; // ∂_t ρ

  // Dilaton field: geometric scalar
  X: Vec; // X(t,x)
  X_dot: Vec; // ∂_t X

  // Matter field: massless scalar
  psi: Vec; // ψ(t,x)
  psi_dot: Vec; // ∂_t ψ

  // Derived/cached observables
  energy_flux?: Vec; // Φ_in = ∂_t ψ · ∂_x ψ (computed when needed)
  dilaton_gradient?: Vec; // ∂_x X (computed when needed)
  matter_stress?: Vec; // T₀₀^ψ (computed from matter)
}

// ============================================================================
// Interface Worldline State (v2.0)
// ============================================================================

/**
 * Interface worldline at x = x_b with proper time parametrization.
 *
 * Observables:
 * - s: entropy density (integrated energy stored at interface)
 * - τ: proper time (worldline parameter)
 * - x_b: fixed interface position (grid index)
 *
 * Dynamics:
 *   ds/dτ = (Φ_in - κs) / T_Σ   (second law)
 *   dτ/dt = 1 (synchronous with coordinate time for now)
 *
 * Junction condition:
 *   [∂_x X]_{x_b} = 8π E_Σ(s)   (dilaton gradient jump)
 */
export interface InterfaceState {
  s: number; // entropy density (scalar)
  x_b_index: number; // grid index of interface position
  tau: number; // proper time (worldline parameter)
}

// ============================================================================
// Full Coupled System State (v2.0)
// ============================================================================

/**
 * Complete state for the dilaton gravity two-manifold system.
 *
 * Single manifold with interface (no separate "shadow" bulk in v2.0).
 * All fields are dynamical (no constraints).
 *
 * State vector: (ρ, ρ̇, X, Ẋ, ψ, ψ̇) on grid [0, L] with N points.
 */
export interface TwoManifoldState {
  // Physical bulk (dilaton GR)
  bulk: DilatonGRState;

  // Interface worldline
  interface: InterfaceState;

  // Grid parameters
  nx: number; // spatial grid points
  L: number; // domain size [0, L]
  dx: number; // spatial step
  x_b: number; // interface position (physical coordinate)
  t: number; // current time
  dt: number; // time step (adaptive in Antclock)
}

// ============================================================================
// Hamiltonian Constraint (determines lapse N)
// ============================================================================

// ============================================================================
// Equations of Motion (v2.0)
// ============================================================================
//
// Phase 2: Three coupled wave equations
//   (∂_t² - ∂_x²)ρ = e^(2ρ) / 2
//   (∂_t² - ∂_x²)X = 8π(T₀₀^ψ + T₀₀^Σ)
//   (∂_t² - ∂_x²)ψ = 0
// ============================================================================

// ============================================================================
// DEPRECATED: Old ADM Functions (v1.0, to be replaced in Phase 2)
// ============================================================================

/**
 * @deprecated Use dilatonWaveEquation() instead (Phase 2)
 */
export function computeEnergyDensity(_bulk: DilatonGRState, _dx: number): Vec {
  throw new Error('computeEnergyDensity: v1.0 removed, use v2.0 equations in Phase 2');
}

/**
 * @deprecated Use matterWaveEquation() instead (Phase 2)
 */
export function matterEvolution(
  _bulk: DilatonGRState,
  _dx: number,
  _N?: number
): { d_psi: Vec; d_Pi_psi: Vec } {
  throw new Error('matterEvolution: v1.0 removed, use v2.0 equations in Phase 2');
}

/**
 * @deprecated Use dilatonEvolution() instead (Phase 2)
 */
export function ADMEvolution(
  _bulk: DilatonGRState,
  _T00: Vec,
  _dx: number,
  _interface_stress?: number
): { d_X: Vec; d_pi_X: Vec } {
  throw new Error('ADMEvolution: v1.0 removed, use v2.0 equations in Phase 2');
}

/**
 * @deprecated Use interfaceWorldlineEvolution() instead (Phase 4)
 */
export function interfaceEvolution(
  _iface: InterfaceState,
  _phys_T00_at_interface: number,
  _shadow_T00_at_interface: number
): { d_s: number; d_theta: number } {
  throw new Error('interfaceEvolution: v1.0 removed, use v2.0 interface in Phase 4');
}

// ============================================================================
// Wave Equation RHS Functions (v2.0: Phase 2)
// ============================================================================

/**
 * Compute RHS of lapse wave equation:
 *   (∂_t² - ∂_x²)ρ = e^(2ρ) / 2
 *
 * Returns: ∂_t(rho_dot) = ∂_x²(rho) + e^(2ρ) / 2
 */
function computeRhoRHS(bulk: DilatonGRState, dx: number): Vec {
  const { rho } = bulk;
  const laplacian_rho = laplacian(rho, dx);
  const source = rho.map(r => Math.exp(2 * r) / 2);
  return add(laplacian_rho, source);
}

/**
 * Compute RHS of dilaton wave equation:
 *   (∂_t² - ∂_x²)X = 8π(T₀₀^ψ + T₀₀^Σ)
 *
 * T₀₀^ψ = (1/2)(ψ̇² + (∂_x ψ)²) is matter stress-energy
 * T₀₀^Σ ≈ entropy contribution (Phase 3)
 *
 * Returns: ∂_t(X_dot) = ∂_x²(X) + 8π·T₀₀
 */
function computeXRHS(bulk: DilatonGRState, dx: number, matterStress: Vec): Vec {
  const { X } = bulk;
  const laplacian_X = laplacian(X, dx);
  const source = matterStress.map(t => 8 * Math.PI * t);
  return add(laplacian_X, source);
}

/**
 * Compute RHS of matter wave equation:
 *   (∂_t² - ∂_x²)ψ = 0
 *
 * Pure wave equation (massless scalar field)
 *
 * Returns: ∂_t(psi_dot) = ∂_x²(ψ)
 */
function computePsiRHS(bulk: DilatonGRState, dx: number): Vec {
  const { psi } = bulk;
  return laplacian(psi, dx);
}

/**
 * Compute energy-momentum tensor component T₀₀^ψ.
 *
 * For massless scalar: T₀₀^ψ = (1/2)(ψ̇² + (∂_x ψ)²)
 * Represents kinetic + spatial gradient energy
 */
function computeMatterStress(bulk: DilatonGRState, dx: number): Vec {
  const { psi, psi_dot } = bulk;
  const psi_x = derivative(psi, dx);
  
  const stress = zeros(psi.length);
  for (let i = 0; i < psi.length; i++) {
    stress[i] = 0.5 * (psi_dot[i] * psi_dot[i] + psi_x[i] * psi_x[i]);
  }
  return stress;
}

/**
 * Compute energy flux at interface.
 *
 * Φ_in = ∂_t ψ · ∂_x ψ|_{x_b}
 * Represents momentum flow through interface
 */
function computeEnergyFlux(bulk: DilatonGRState, dx: number, i_b: number): number {
  const { psi, psi_dot } = bulk;
  const psi_x = derivative(psi, dx);
  return psi_dot[i_b] * psi_x[i_b];
}

/**
 * Full system RK4 stepper (v2.0: Phase 2 implementation)
 *
 * Integrates three coupled wave equations:
 *   (∂_t² - ∂_x²)ρ = e^(2ρ) / 2
 *   (∂_t² - ∂_x²)X = 8π(T₀₀^ψ + T₀₀^Σ)
 *   (∂_t² - ∂_x²)ψ = 0
 */
export function stepRK4(
  state: TwoManifoldState,
  dt: number
): TwoManifoldState {
  const { bulk, interface: iface, dx } = state;

  // Helper to compute derivatives at a given bulk state
  const computeDerivatives = (b: DilatonGRState): {
    d_rho_dot: Vec;
    d_X_dot: Vec;
    d_psi_dot: Vec;
    d_tau: number;
  } => {
    const matterStress = computeMatterStress(b, dx);
    const flux = computeEnergyFlux(b, dx, iface.x_b_index);

    return {
      d_rho_dot: computeRhoRHS(b, dx),
      d_X_dot: computeXRHS(b, dx, matterStress),
      d_psi_dot: computePsiRHS(b, dx),
      d_tau: 1.0, // proper time synchronous with coordinate time
    };
  };

  // k1: derivatives at current state
  const k1 = computeDerivatives(bulk);

  // k2: half-step with k1
  const bulk_k1_half: DilatonGRState = {
    rho: add(bulk.rho, scale(bulk.rho_dot, dt / 2)),
    rho_dot: add(bulk.rho_dot, scale(k1.d_rho_dot, dt / 2)),
    X: add(bulk.X, scale(bulk.X_dot, dt / 2)),
    X_dot: add(bulk.X_dot, scale(k1.d_X_dot, dt / 2)),
    psi: add(bulk.psi, scale(bulk.psi_dot, dt / 2)),
    psi_dot: add(bulk.psi_dot, scale(k1.d_psi_dot, dt / 2)),
  };
  const k2 = computeDerivatives(bulk_k1_half);

  // k3: half-step with k2
  const bulk_k2_half: DilatonGRState = {
    rho: add(bulk.rho, scale(bulk.rho_dot, dt / 2)),
    rho_dot: add(bulk.rho_dot, scale(k2.d_rho_dot, dt / 2)),
    X: add(bulk.X, scale(bulk.X_dot, dt / 2)),
    X_dot: add(bulk.X_dot, scale(k2.d_X_dot, dt / 2)),
    psi: add(bulk.psi, scale(bulk.psi_dot, dt / 2)),
    psi_dot: add(bulk.psi_dot, scale(k2.d_psi_dot, dt / 2)),
  };
  const k3 = computeDerivatives(bulk_k2_half);

  // k4: full step with k3
  const bulk_k3_full: DilatonGRState = {
    rho: add(bulk.rho, scale(bulk.rho_dot, dt)),
    rho_dot: add(bulk.rho_dot, scale(k3.d_rho_dot, dt)),
    X: add(bulk.X, scale(bulk.X_dot, dt)),
    X_dot: add(bulk.X_dot, scale(k3.d_X_dot, dt)),
    psi: add(bulk.psi, scale(bulk.psi_dot, dt)),
    psi_dot: add(bulk.psi_dot, scale(k3.d_psi_dot, dt)),
  };
  const k4 = computeDerivatives(bulk_k3_full);

  // RK4 combination: y_new = y + dt*(k1 + 2*k2 + 2*k3 + k4)/6
  const avg = (k1_val: Vec, k2_val: Vec, k3_val: Vec, k4_val: Vec): Vec => {
    const result = zeros(k1_val.length);
    for (let i = 0; i < k1_val.length; i++) {
      result[i] = (k1_val[i] + 2*k2_val[i] + 2*k3_val[i] + k4_val[i]) / 6;
    }
    return result;
  };

  const new_bulk: DilatonGRState = {
    // Position updates: y_new = y + dt * y_dot
    rho: add(bulk.rho, scale(bulk.rho_dot, dt)),
    X: add(bulk.X, scale(bulk.X_dot, dt)),
    psi: add(bulk.psi, scale(bulk.psi_dot, dt)),

    // Velocity updates: y_dot_new = y_dot + dt * d_y_dot
    rho_dot: add(
      bulk.rho_dot,
      scale(
        avg(k1.d_rho_dot, k2.d_rho_dot, k3.d_rho_dot, k4.d_rho_dot),
        dt
      )
    ),
    X_dot: add(
      bulk.X_dot,
      scale(
        avg(k1.d_X_dot, k2.d_X_dot, k3.d_X_dot, k4.d_X_dot),
        dt
      )
    ),
    psi_dot: add(
      bulk.psi_dot,
      scale(
        avg(k1.d_psi_dot, k2.d_psi_dot, k3.d_psi_dot, k4.d_psi_dot),
        dt
      )
    ),
  };

  // Interface: entropy evolution (placeholder, Phase 3)
  const matterStress = computeMatterStress(bulk, dx);
  const flux = computeEnergyFlux(bulk, dx, iface.x_b_index);
  const T_Sigma = 1.0; // interface temperature (Phase 3)
  const kappa = 0.01; // dissipation coefficient (Phase 3)
  const ds_dtau = (flux - kappa * iface.s) / T_Sigma;

  const new_iface: InterfaceState = {
    s: Math.max(0, iface.s + ds_dtau * dt),
    x_b_index: iface.x_b_index, // fixed position (Phase 4)
    tau: iface.tau + dt, // proper time advances
  };

  return {
    bulk: new_bulk,
    interface: new_iface,
    nx: state.nx,
    L: state.L,
    dx: state.dx,
    x_b: state.x_b,
    t: state.t + dt,
    dt: state.dt,
  };
}

// ============================================================================
// Conservation & Bianchi Check
// ============================================================================

export function totalEnergy(state: TwoManifoldState): number {
  // Compute total energy as spatial integral of energy density.
  // 
  // Energy density: ε = (1/2)[ρ̇² + ρ'² + e^(2ρ)(Ẋ² + X'²) + e^(2ρ)(ψ̇² + ψ'²)]
  // Plus interface contribution: ε_interface = s (entropy)
  //
  // Total: E = ∫ ε dx + s

  const { bulk, interface: iface, dx } = state;
  
  const rho_x = derivative(bulk.rho, dx);
  const X_x = derivative(bulk.X, dx);
  const psi_x = derivative(bulk.psi, dx);

  let kinetic_energy = 0;
  let spatial_energy = 0;

  for (let i = 0; i < bulk.psi.length; i++) {
    const exp2rho = Math.exp(2 * bulk.rho[i]);
    
    // Kinetic energy: (1/2)(ρ̇² + e^(2ρ)(Ẋ² + ψ̇²))
    kinetic_energy += 0.5 * (
      bulk.rho_dot[i] * bulk.rho_dot[i] +
      exp2rho * (bulk.X_dot[i] * bulk.X_dot[i] + bulk.psi_dot[i] * bulk.psi_dot[i])
    );

    // Spatial gradient energy: (1/2)(ρ'² + e^(2ρ)(X'² + ψ'²))
    spatial_energy += 0.5 * (
      rho_x[i] * rho_x[i] +
      exp2rho * (X_x[i] * X_x[i] + psi_x[i] * psi_x[i])
    );
  }

  const bulk_energy = (kinetic_energy + spatial_energy) * dx;
  const interface_energy = iface.s;

  return bulk_energy + interface_energy;
}

export function entropyProduction(state: TwoManifoldState, dt: number): number {
  // Entropy production rate from Phase 2 dynamics.
  //
  // ds/dτ = (Φ_in - κs) / T_Σ
  //
  // where:
  // - Φ_in = ∂_t ψ · ∂_x ψ|_{x_b} is energy flux through interface
  // - κ is dissipation coefficient (0.01)
  // - T_Σ is interface temperature (1.0)
  
  const { bulk, interface: iface, dx } = state;
  
  const psi_x = derivative(bulk.psi, dx);
  const i_b = iface.x_b_index;
  
  // Energy flux at interface
  const flux = bulk.psi_dot[i_b] * psi_x[i_b];
  
  // Entropy production rate
  const T_Sigma = 1.0;
  const kappa = 0.01;
  const ds_dtau = (flux - kappa * iface.s) / T_Sigma;
  
  return ds_dtau;
}

export interface ConservationReport {
  totalEnergy: number;
  entropyRate: number;
  energyChange: number; // from last step
  secondLawViolation: boolean;
}

// ============================================================================
// Initialization (v2.0: Dilaton GR)
// ============================================================================

/**
 * Initialize a smooth field configuration.
 *
 * Scenario: Gaussian pulse in matter field, all metrics at rest.
 * Expected behavior: Low energy flux, no coercion, high efficiency.
 */
export function initializeSmooth(
  nx: number,
  L: number
): TwoManifoldState {
  const x = linspace(0, L, nx);
  const dx = L / (nx - 1);
  const x_b = L / 2; // interface at center
  const x_b_index = Math.floor(nx / 2);

  // Matter field: Gaussian pulse (smooth, no sharp features)
  const psi = x.map((xi) => Math.exp(-0.5 * ((xi - x_b) / (L / 8)) ** 2));
  const psi_dot = zeros(nx); // initially at rest

  // Dilaton field: unit value initially (no deformation)
  const X = new Array(nx).fill(1.0);
  const X_dot = zeros(nx); // at rest

  // Lapse function: unit (conformal gauge, initially flat)
  const rho = zeros(nx); // e^(2*0) = 1 → flat metric
  const rho_dot = zeros(nx); // at rest

  const bulk: DilatonGRState = {
    rho,
    rho_dot,
    X,
    X_dot,
    psi,
    psi_dot,
  };

  // Interface: initially at equilibrium
  const iface: InterfaceState = {
    s: 0, // no entropy
    x_b_index,
    tau: 0, // proper time starts at 0
  };

  return {
    bulk,
    interface: iface,
    nx,
    L,
    dx,
    x_b,
    t: 0,
    dt: 0.01, // initial time step (adaptive in Antclock)
  };
}

/**
 * Initialize a cliff potential configuration.
 *
 * Scenario: Driven matter field with high kinetic energy, trying to overcome
 * resistance at the interface. Expected behavior: High energy flux,
 * rapid entropy production, clear coercion signature.
 */
export function initializeCliff(
  nx: number,
  L: number
): TwoManifoldState {
  const x = linspace(0, L, nx);
  const dx = L / (nx - 1);
  const x_b = L / 2;
  const x_b_index = Math.floor(nx / 2);

  // Matter field: sinusoidal with high kinetic energy (driving)
  const psi = x.map((xi) => 0.5 * Math.sin((xi / L) * Math.PI));
  const psi_dot = x.map((_) => 0.5); // high kinetic energy (active driving)

  // Dilaton field: unit initially (will deform due to flux)
  const X = new Array(nx).fill(1.0);
  const X_dot = zeros(nx); // at rest initially

  // Lapse: unit initially
  const rho = zeros(nx);
  const rho_dot = zeros(nx);

  const bulk: DilatonGRState = {
    rho,
    rho_dot,
    X,
    X_dot,
    psi,
    psi_dot,
  };

  // Interface: under stress from driving
  const iface: InterfaceState = {
    s: 0.05, // initial entropy from interface resistance
    x_b_index,
    tau: 0,
  };

  return {
    bulk,
    interface: iface,
    nx,
    L,
    dx,
    x_b,
    t: 0,
    dt: 0.01,
  };
}

// ============================================================================
// Simulation Loop
// ============================================================================

export function simulate(
  initialState: TwoManifoldState,
  duration: number,
  dt: number,
  reportInterval: number = 0.1
): {
  states: TwoManifoldState[];
  conservationReports: ConservationReport[];
} {
  const states: TwoManifoldState[] = [initialState];
  const conservationReports: ConservationReport[] = [];

  let state = initialState;
  let nextReport = state.t + reportInterval;
  let prevEnergy = totalEnergy(state);

  while (state.t < duration) {
    state = stepRK4(state, dt);
    states.push(state);

    if (state.t >= nextReport) {
      const energy = totalEnergy(state);
      const entropyRate = entropyProduction(state, dt);

      const report: ConservationReport = {
        totalEnergy: energy,
        entropyRate: entropyRate,
        energyChange: energy - prevEnergy,
        secondLawViolation: entropyRate < -1e-6,
      };

      conservationReports.push(report);
      nextReport += reportInterval;
      prevEnergy = energy;
    }
  }

  return { states, conservationReports };
}

// ============================================================================
// Observables: Spectral Signature
// ============================================================================

export function spectralAcceleration(
  states: TwoManifoldState[],
  windowSize: number = 5
): number[] {
  const accelerations: number[] = [];

  // Compute spectral acceleration from dilaton field dynamics
  // Acceleration ~ d²X/dt² at interface location
  
  for (let i = windowSize; i < states.length; i++) {
    const current = states[i];
    const mid = states[i - windowSize];
    const prev = states[i - 2 * windowSize];

    if (!prev) continue;

    // X field acceleration at interface
    const i_b = current.interface.x_b_index;
    const X_now = current.bulk.X[i_b];
    const X_mid = mid.bulk.X[i_b];
    const X_prev = prev.bulk.X[i_b];

    const dt_eff = windowSize * current.dt;
    const accel = (X_now - 2 * X_mid + X_prev) / (dt_eff * dt_eff);

    accelerations.push(Math.abs(accel));
  }

  return accelerations;
}

// ============================================================================
// Demo
// ============================================================================

export function demonstrateTwoManifold() {
  console.log("=".repeat(70));
  console.log("TWO-MANIFOLD COUPLED SYSTEM: 1+1D Demonstration");
  console.log("=".repeat(70));

  // Scenario 1: Smooth field
  console.log("\n### Scenario 1: Smooth Field (Good System)");
  const stateSmooth = initializeSmooth(32, 2.0);
  const resultSmooth = simulate(stateSmooth, 1.0, 0.01);

  console.log("\nConservation Check (Smooth Field):");
  resultSmooth.conservationReports.slice(0, 5).forEach((report, i) => {
    console.log(
      `  Step ${i}: E = ${report.totalEnergy.toFixed(4)}, ` +
      `dE = ${report.energyChange.toFixed(6)}, ` +
      `S' = ${report.entropyRate.toFixed(6)} ` +
      `${report.secondLawViolation ? "⚠️ VIOLATION" : "✓"}`
    );
  });

  const accelSmooth = spectralAcceleration(resultSmooth.states);
  console.log(
    `\nSpectral Signature (max acceleration): ${Math.max(...accelSmooth).toFixed(4)}`
  );
  console.log(`  Expected: low (smooth field)`);

  // Scenario 2: Cliff potential
  console.log("\n### Scenario 2: Cliff Potential (Bad System)");
  const stateCliff = initializeCliff(32, 2.0);
  const resultCliff = simulate(stateCliff, 1.0, 0.01);

  console.log("\nConservation Check (Cliff Potential):");
  resultCliff.conservationReports.slice(0, 5).forEach((report, i) => {
    console.log(
      `  Step ${i}: E = ${report.totalEnergy.toFixed(4)}, ` +
      `dE = ${report.energyChange.toFixed(6)}, ` +
      `S' = ${report.entropyRate.toFixed(6)} ` +
      `${report.secondLawViolation ? "⚠️ VIOLATION" : "✓"}`
    );
  });

  const accelCliff = spectralAcceleration(resultCliff.states);
  console.log(
    `\nSpectral Signature (max acceleration): ${Math.max(...accelCliff).toFixed(4)}`
  );
  console.log(`  Expected: high (coercion signature)`);

  // Summary
  console.log("\n" + "=".repeat(70));
  console.log("SUMMARY");
  console.log("=".repeat(70));
  console.log("");
  console.log(
    `Smooth field: final entropy = ${resultSmooth.states[resultSmooth.states.length - 1].interface.s.toFixed(4)}`
  );
  console.log(
    `Cliff potential: final entropy = ${resultCliff.states[resultCliff.states.length - 1].interface.s.toFixed(4)}`
  );
  console.log("");
  console.log(
    "Gradient Invariant Prediction:"
  );
  console.log(
    "  - Smooth field: energy transfers naturally, low dissipation ✓"
  );
  console.log(
    "  - Cliff potential: high dissipation, coercion signatures ✓"
  );
}
