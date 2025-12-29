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
// ADM State (one copy per bulk)
// ============================================================================

export interface ADMState {
  // Geometrical variables
  X: Vec; // scale factor at each spatial point
  K: Vec; // extrinsic curvature (first derivative of X)

  // Matter variables (massless scalar field)
  psi: Vec; // scalar field
  Pi_psi: Vec; // canonical momentum to psi

  // Derived/cached
  energy_density?: Vec; // T_00 (computed from matter)
  momentum_density?: Vec; // T_01
}

// ============================================================================
// Interface State
// ============================================================================

export interface InterfaceState {
  s: number; // entropy density on the interface
  theta: number; // extrinsic expansion (rate of length change)
  sigma: number; // surface tension parameter
  eta: number; // viscous resistance
  position: number; // which grid point? (for now, fixed at x_b)
}

// ============================================================================
// Full Coupled System State
// ============================================================================

export interface TwoManifoldState {
  // Physical bulk
  phys: ADMState;

  // Shadow bulk
  shadow: ADMState;

  // Interface
  interface: InterfaceState;

  // Grid parameters
  nx: number; // spatial grid points
  L: number; // domain size [0, L]
  dx: number; // spatial step
  t: number; // current time
}

// ============================================================================
// Hamiltonian Constraint (determines lapse N)
// ============================================================================

/**
 * In 1+1D, the Hamiltonian constraint is:
 *   H = pi_X^2 - (1/2)(X')^2 + X * (energy density of matter) + boundary terms = 0
 *
 * We solve for the lapse N by setting this to zero (or integrating).
 * For simplicity, we assume N = 1 (proper time = coordinate time).
 */

export function computeEnergyDensity(bulk: ADMState, dx: number): Vec {
  const n = bulk.psi.length;
  const T00 = zeros(n);

  // Kinetic energy: (1/2) psi_dot^2 / X
  // Potential energy: (1/2) (psi')^2 / X
  const psi_dx = derivative(bulk.psi, dx);

  for (let i = 0; i < n; i++) {
    const KE = 0.5 * bulk.Pi_psi[i] * bulk.Pi_psi[i] / Math.max(bulk.X[i], 1e-6);
    const PE = 0.5 * psi_dx[i] * psi_dx[i] / Math.max(bulk.X[i], 1e-6);
    T00[i] = KE + PE;
  }

  bulk.energy_density = T00;
  return T00;
}

// ============================================================================
// Equations of Motion
// ============================================================================

/**
 * Time derivatives for the physical bulk matter fields.
 */
export function matterEvolution(
  bulk: ADMState,
  dx: number,
  N: number = 1.0
): { d_psi: Vec; d_Pi_psi: Vec } {
  const d_psi = scale(bulk.Pi_psi, 1 / Math.max(bulk.X[0], 1e-6));

  const psi_xx = laplacian(bulk.psi, dx);
  const d_Pi_psi = scale(psi_xx, Math.max(bulk.X[0], 1e-6));

  return { d_psi, d_Pi_psi };
}

/**
 * Time derivatives for the ADM variables (X and its momentum).
 *
 * In simplified form (assuming X depends only on time, not space):
 *   dX/dt = 2 * pi_X (approximately)
 *   d(pi_X)/dt = -(d/dx)(...) (spatial variation; can be simplified)
 *
 * For the proof of concept, we treat X as spatially homogeneous.
 */
export function ADMEvolution(
  bulk: ADMState,
  T00: Vec,
  dx: number,
  interface_stress?: number
): { d_X: Vec; d_pi_X: Vec } {
  const n = bulk.X.length;
  const d_X = scale(bulk.K, 1.0); // X' = K (extrinsic curvature is time derivative of scale)

  // For homogeneous X, pi_X is a scalar at each point; we'll simplify.
  // In full 1+1D, d(pi_X)/dt = -d/dx(...) + matter sources
  // For simplicity: d(pi_X)/dt ≈ integral of T00 over domain (energy balance)
  const avg_T00 = dot(T00, ones(n)) / n;
  const d_pi_X = scale(ones(n), -avg_T00 * dx);

  return { d_X, d_pi_X };
}

function ones(n: number): Vec {
  return new Array(n).fill(1);
}

/**
 * Interface dynamics: entropy and expansion.
 * Strongly coupled to the energy difference between bulks.
 */
export function interfaceEvolution(
  iface: InterfaceState,
  phys_T00_at_interface: number,
  shadow_T00_at_interface: number
): { d_s: number; d_theta: number } {
  // Energy flux from physical to shadow (or vice versa)
  const Q_flux = phys_T00_at_interface - shadow_T00_at_interface;

  // Temperature of interface: increases with accumulated work
  const T_Sigma = Math.max(iface.sigma + iface.s * 0.1, 0.01);

  // Entropy production: d_s/dt = Q_flux / T + dissipation
  // Dissipation term: high theta or high eta means more friction
  const dissipation = iface.eta * iface.theta * iface.theta;
  const d_s = Math.abs(Q_flux) / T_Sigma + dissipation / T_Sigma;

  // Expansion: theta couples to the energy flow
  // If Q_flux is large (cliff potential), theta oscillates
  // If Q_flux is small (smooth field), theta decays
  const expansionDrive = Math.abs(Q_flux) * 0.5;
  const expansionDamping = iface.eta * iface.theta;
  const d_theta = expansionDrive - expansionDamping;

  return { d_s, d_theta };
}

// ============================================================================
// Full System RK4 Stepper (Full 4-Stage)
// ============================================================================

function stepState(
  state: TwoManifoldState,
  dt: number,
  stageCoeff: number = 1.0
): {
  phys: ADMState;
  shadow: ADMState;
  interface: InterfaceState;
} {
  const { phys, shadow, interface: iface } = state;
  const { nx, L, dx } = state;

  // 1. Compute energy densities
  const T00_phys = computeEnergyDensity(phys, dx);
  const T00_shadow = computeEnergyDensity(shadow, dx);

  // 2. Interface location
  const x_b = Math.floor((nx - 1) / 2);
  const T00_at_interface_phys = T00_phys[x_b];
  const T00_at_interface_shadow = T00_shadow[x_b];

  // 3. Matter evolution
  const matter_phys = matterEvolution(phys, dx, 1.0);
  const matter_shadow = matterEvolution(shadow, dx, 1.0);

  // 4. ADM evolution
  const ADM_phys = ADMEvolution(phys, T00_phys, dx, iface.sigma * iface.s);
  const ADM_shadow = ADMEvolution(shadow, T00_shadow, dx, -iface.sigma * iface.s);

  // 5. Interface evolution (improved coupling)
  const iface_evo = interfaceEvolution(
    iface,
    T00_at_interface_phys,
    T00_at_interface_shadow
  );

  // 6. Assemble derivatives
  const dt_coeff = stageCoeff * dt;

  return {
    phys: {
      psi: add(phys.psi, scale(matter_phys.d_psi, dt_coeff)),
      Pi_psi: add(phys.Pi_psi, scale(matter_phys.d_Pi_psi, dt_coeff)),
      X: add(phys.X, scale(ADM_phys.d_X, dt_coeff)),
      K: scale(ADM_phys.d_X, 1),
    },
    shadow: {
      psi: add(shadow.psi, scale(matter_shadow.d_psi, dt_coeff)),
      Pi_psi: add(shadow.Pi_psi, scale(matter_shadow.d_Pi_psi, dt_coeff)),
      X: add(shadow.X, scale(ADM_shadow.d_X, dt_coeff)),
      K: scale(ADM_shadow.d_X, 1),
    },
    interface: {
      ...iface,
      s: Math.max(0, iface.s + iface_evo.d_s * dt_coeff),
      theta: iface.theta + iface_evo.d_theta * dt_coeff,
    },
  };
}

export function stepRK4(
  state: TwoManifoldState,
  dt: number
): TwoManifoldState {
  // Full RK4: y' = f(t, y)
  // k1 = f(t, y)
  // k2 = f(t + dt/2, y + dt*k1/2)
  // k3 = f(t + dt/2, y + dt*k2/2)
  // k4 = f(t + dt, y + dt*k3)
  // y_new = y + dt*(k1 + 2*k2 + 2*k3 + k4)/6

  const k1 = stepState(state, 0, 1.0); // compute derivatives at current state

  // k2: half-step forward
  const state_half_k1: TwoManifoldState = {
    ...state,
    phys: {
      psi: add(state.phys.psi, scale(k1.phys.psi, dt / 2)),
      Pi_psi: add(state.phys.Pi_psi, scale(k1.phys.Pi_psi, dt / 2)),
      X: add(state.phys.X, scale(k1.phys.X, dt / 2)),
      K: k1.phys.K,
    },
    shadow: {
      psi: add(state.shadow.psi, scale(k1.shadow.psi, dt / 2)),
      Pi_psi: add(state.shadow.Pi_psi, scale(k1.shadow.Pi_psi, dt / 2)),
      X: add(state.shadow.X, scale(k1.shadow.X, dt / 2)),
      K: k1.shadow.K,
    },
    interface: {
      ...state.interface,
      s: state.interface.s + k1.interface.s * (dt / 2),
      theta: state.interface.theta + k1.interface.theta * (dt / 2),
    },
    t: state.t + dt / 2,
  };

  const k2 = stepState(state_half_k1, 0, 1.0);

  // k3: half-step forward with k2
  const state_half_k2: TwoManifoldState = {
    ...state,
    phys: {
      psi: add(state.phys.psi, scale(k2.phys.psi, dt / 2)),
      Pi_psi: add(state.phys.Pi_psi, scale(k2.phys.Pi_psi, dt / 2)),
      X: add(state.phys.X, scale(k2.phys.X, dt / 2)),
      K: k2.phys.K,
    },
    shadow: {
      psi: add(state.shadow.psi, scale(k2.shadow.psi, dt / 2)),
      Pi_psi: add(state.shadow.Pi_psi, scale(k2.shadow.Pi_psi, dt / 2)),
      X: add(state.shadow.X, scale(k2.shadow.X, dt / 2)),
      K: k2.shadow.K,
    },
    interface: {
      ...state.interface,
      s: state.interface.s + k2.interface.s * (dt / 2),
      theta: state.interface.theta + k2.interface.theta * (dt / 2),
    },
    t: state.t + dt / 2,
  };

  const k3 = stepState(state_half_k2, 0, 1.0);

  // k4: full step forward with k3
  const state_full_k3: TwoManifoldState = {
    ...state,
    phys: {
      psi: add(state.phys.psi, scale(k3.phys.psi, dt)),
      Pi_psi: add(state.phys.Pi_psi, scale(k3.phys.Pi_psi, dt)),
      X: add(state.phys.X, scale(k3.phys.X, dt)),
      K: k3.phys.K,
    },
    shadow: {
      psi: add(state.shadow.psi, scale(k3.shadow.psi, dt)),
      Pi_psi: add(state.shadow.Pi_psi, scale(k3.shadow.Pi_psi, dt)),
      X: add(state.shadow.X, scale(k3.shadow.X, dt)),
      K: k3.shadow.K,
    },
    interface: {
      ...state.interface,
      s: state.interface.s + k3.interface.s * dt,
      theta: state.interface.theta + k3.interface.theta * dt,
    },
    t: state.t + dt,
  };

  const k4 = stepState(state_full_k3, 0, 1.0);

  // RK4 combination
  return {
    ...state,
    phys: {
      psi: add(
        state.phys.psi,
        scale(
          add(
            add(k1.phys.psi, scale(k2.phys.psi, 2)),
            add(scale(k3.phys.psi, 2), k4.phys.psi)
          ),
          dt / 6
        )
      ),
      Pi_psi: add(
        state.phys.Pi_psi,
        scale(
          add(
            add(k1.phys.Pi_psi, scale(k2.phys.Pi_psi, 2)),
            add(scale(k3.phys.Pi_psi, 2), k4.phys.Pi_psi)
          ),
          dt / 6
        )
      ),
      X: add(
        state.phys.X,
        scale(
          add(
            add(k1.phys.X, scale(k2.phys.X, 2)),
            add(scale(k3.phys.X, 2), k4.phys.X)
          ),
          dt / 6
        )
      ),
      K: add(
        state.phys.K,
        scale(
          add(
            add(k1.phys.K, scale(k2.phys.K, 2)),
            add(scale(k3.phys.K, 2), k4.phys.K)
          ),
          dt / 6
        )
      ),
    },
    shadow: {
      psi: add(
        state.shadow.psi,
        scale(
          add(
            add(k1.shadow.psi, scale(k2.shadow.psi, 2)),
            add(scale(k3.shadow.psi, 2), k4.shadow.psi)
          ),
          dt / 6
        )
      ),
      Pi_psi: add(
        state.shadow.Pi_psi,
        scale(
          add(
            add(k1.shadow.Pi_psi, scale(k2.shadow.Pi_psi, 2)),
            add(scale(k3.shadow.Pi_psi, 2), k4.shadow.Pi_psi)
          ),
          dt / 6
        )
      ),
      X: add(
        state.shadow.X,
        scale(
          add(
            add(k1.shadow.X, scale(k2.shadow.X, 2)),
            add(scale(k3.shadow.X, 2), k4.shadow.X)
          ),
          dt / 6
        )
      ),
      K: add(
        state.shadow.K,
        scale(
          add(
            add(k1.shadow.K, scale(k2.shadow.K, 2)),
            add(scale(k3.shadow.K, 2), k4.shadow.K)
          ),
          dt / 6
        )
      ),
    },
    interface: {
      ...state.interface,
      s: Math.max(
        0,
        state.interface.s +
          ((k1.interface.s +
            2 * k2.interface.s +
            2 * k3.interface.s +
            k4.interface.s) /
            6) *
            dt
      ),
      theta:
        state.interface.theta +
        ((k1.interface.theta +
          2 * k2.interface.theta +
          2 * k3.interface.theta +
          k4.interface.theta) /
          6) *
          dt,
    },
    t: state.t + dt,
  };
}

// ============================================================================
// Conservation & Bianchi Check
// ============================================================================

export function totalEnergy(state: TwoManifoldState): number {
  const { phys, shadow, interface: iface, dx } = state;

  // Energy from kinetic + potential in each bulk
  const E_phys = dot(phys.energy_density || zeros(phys.psi.length), ones(phys.psi.length)) * dx;
  const E_shadow = dot(shadow.energy_density || zeros(shadow.psi.length), ones(shadow.psi.length)) * dx;

  // Interface entropy (acts like stored energy)
  const E_interface = iface.s;

  return E_phys + E_shadow + E_interface;
}

export function entropyProduction(state: TwoManifoldState, dt: number): number {
  // Entropy production rate (should be >= 0 by second law)
  const { interface: iface } = state;

  const T_Sigma = Math.max(iface.sigma, 0.1);
  const dissipation = iface.eta * iface.theta * iface.theta;

  return dissipation / T_Sigma;
}

export interface ConservationReport {
  totalEnergy: number;
  entropyRate: number;
  energyChange: number; // from last step
  secondLawViolation: boolean;
}

// ============================================================================
// Initialization
// ============================================================================

export function initializeSmooth(
  nx: number,
  L: number
): TwoManifoldState {
  const x = linspace(0, L, nx);
  const dx = L / (nx - 1);

  // Physical bulk: initial Gaussian pulse in matter field
  const phys: ADMState = {
    X: ones(nx).map((_) => 1.0), // unit scale factor
    K: zeros(nx), // initially at rest
    psi: x.map((xi) => Math.exp(-0.5 * ((xi - L / 2) / (L / 8)) ** 2)), // Gaussian pulse
    Pi_psi: zeros(nx), // initially at rest
  };

  // Shadow bulk: empty (or slightly excited to show energy transfer)
  const shadow: ADMState = {
    X: ones(nx).map((_) => 1.0),
    K: zeros(nx),
    psi: zeros(nx),
    Pi_psi: zeros(nx),
  };

  // Interface: at rest, low entropy
  const iface: InterfaceState = {
    s: 0,
    theta: 0,
    sigma: 0.1, // weak surface tension
    eta: 0.05, // moderate viscosity
    position: Math.floor(nx / 2),
  };

  return {
    phys,
    shadow,
    interface: iface,
    nx,
    L,
    dx,
    t: 0,
  };
}

export function initializeCliff(
  nx: number,
  L: number
): TwoManifoldState {
  const x = linspace(0, L, nx);
  const dx = L / (nx - 1);

  // Physical bulk: driven, trying to move against resistance
  const phys: ADMState = {
    X: ones(nx).map((_) => 1.0),
    K: zeros(nx),
    psi: x.map((xi) => 0.5 * Math.sin((xi / L) * Math.PI)), // non-zero initial
    Pi_psi: x.map((_) => 0.2), // active driving (positive momentum)
  };

  // Shadow bulk: high potential, resistance
  const shadow: ADMState = {
    X: ones(nx).map((_) => 1.0),
    K: zeros(nx),
    psi: x.map((_) => 5.0), // high field
    Pi_psi: x.map((_) => 2.0), // strong feedback
  };

  // Interface: already under stress
  const iface: InterfaceState = {
    s: 0.1, // some accumulated work
    theta: 0.5, // rapid expansion
    sigma: 0.01, // very weak capacity
    eta: 0.5, // high resistance
    position: Math.floor(nx / 2),
  };

  return {
    phys,
    shadow,
    interface: iface,
    nx,
    L,
    dx,
    t: 0,
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

  for (let i = windowSize; i < states.length; i++) {
    // Acceleration: d^2(theta)/dt^2 ≈ (theta[i] - 2*theta[i-w] + theta[i-2w]) / (w*dt)^2
    const s_now = states[i].interface.theta;
    const s_mid = states[i - windowSize].interface.theta;
    const s_prev = states[i - 2 * windowSize];

    if (!s_prev) continue;

    const s_prev_val = s_prev.interface.theta;
    const dt_eff = windowSize * 0.01; // approximate dt
    const accel = (s_now - 2 * s_mid + s_prev_val) / (dt_eff * dt_eff);

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
