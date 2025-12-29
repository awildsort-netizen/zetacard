/**
 * Antclock as Event-Driven Integrator for Two-Manifold Coupled System
 *
 * Instead of fixed timesteps in coordinate time t, we advance in **semantic time τ**
 * where each "tick" corresponds to a meaningful structural/physical event:
 *
 * - Flux novelty at interface Σ
 * - Constraint violation spikes
 * - Regime flips (horizon formation, evaporation threshold, etc.)
 * - Entropy production events
 *
 * The key: most of coordinate time is "boring" (smooth evolution).
 * Antclock skips the boring and ticks on the interesting.
 *
 * Reference: Two-Manifold Coupled System (TWOMANIFOLD_1PLUS1D_SPEC.md)
 */

import type { TwoManifoldState } from "./twoManifoldCoupled";
import { dot, l2 } from "./contractPhysics";

// ============================================================================
// Residual Stack: Objective for the Solver
// ============================================================================

/**
 * Constraint residuals: how badly the state violates the Einstein/junction equations.
 */
export interface ConstraintResiduals {
  // Hamiltonian constraint: G + 8πT ≈ 0
  H_phys: number; // |Hamiltonian constraint| on physical side
  H_shadow: number; // |Hamiltonian constraint| on shadow side

  // Momentum constraint: D·T ≈ 0
  M_phys: number;
  M_shadow: number;

  // Junction condition: [K] = 8πS
  junction: number; // |(K - K̃) - 8πS|

  // Interface conservation: D_a S^ab = (flux difference)
  conservation_parallel: number;
  conservation_normal: number; // energy flux balance
}

/**
 * Flux novelty: how much has the interface energy/momentum flux changed?
 */
export interface FluxNovelty {
  energy_flux_change: number; // |Φ_in - Φ_in_predicted|
  momentum_flux_change: number; // |J_a - J_a_predicted|
  entropy_production_rate: number; // dS/dτ
}

/**
 * Regime detectors: has something structurally changed?
 */
export interface RegimeDetectors {
  marginally_trapped: boolean; // θ_out → 0?
  evaporation_onset: boolean; // surface gravity / temperature threshold?
  topology_change: boolean; // (Future: genus change, bifurcation)
  curvature_spike: boolean; // Kretschmann jumped?
  junction_sign_flip: boolean; // junction residual changed sign?
}

/**
 * Total solver residual: weighted sum of constraint violations + event indicators.
 */
export interface SolverResidual {
  constraint_residual: number; // ℜ_bulk + ℜ_Σ + ℜ_cons
  flux_novelty: number; // Δℱ
  regime_indicator: number; // 1.0 if any regime flip detected, 0 otherwise
  total: number; // weighted sum

  // Breakdown
  constraints: ConstraintResiduals;
  flux: FluxNovelty;
  regimes: RegimeDetectors;
}

// ============================================================================
// Compute Constraint Residuals
// ============================================================================

export function computeConstraintResiduals(
  state: TwoManifoldState,
  prevState?: TwoManifoldState
): ConstraintResiduals {
  const { phys, shadow, interface: iface, dx } = state;

  // Simplified: compute approximate Hamiltonian constraint
  // H = π_X^2 - (1/2)(X')^2 + X * T_00 ≈ 0

  // Physical side Hamiltonian
  const X_grad_phys = (phys.X[1] - phys.X[0]) / dx; // rough derivative
  const H_phys_val = Math.abs(
    phys.K[0] * phys.K[0] - 0.5 * X_grad_phys * X_grad_phys + 
    Math.max(phys.X[0], 0.01) * (phys.energy_density?.[0] ?? 0)
  );

  // Shadow side
  const X_grad_shadow = (shadow.X[1] - shadow.X[0]) / dx;
  const H_shadow_val = Math.abs(
    shadow.K[0] * shadow.K[0] - 0.5 * X_grad_shadow * X_grad_shadow + 
    Math.max(shadow.X[0], 0.01) * (shadow.energy_density?.[0] ?? 0)
  );

  // Junction condition: [K] = 8π S
  // where S is interface stress
  const K_jump = (phys.K[Math.floor(phys.K.length / 2)] || 0) - 
                 (shadow.K[Math.floor(shadow.K.length / 2)] || 0);
  const expected_jump = 8 * Math.PI * (iface.sigma * iface.s);
  const junction_residual = Math.abs(K_jump - expected_jump);

  // Energy conservation: flux balance at interface
  const energy_flux_phys = phys.energy_density?.[Math.floor(phys.energy_density.length / 2)] ?? 0;
  const energy_flux_shadow = shadow.energy_density?.[Math.floor(shadow.energy_density.length / 2)] ?? 0;
  const energy_balance = Math.abs((energy_flux_phys - energy_flux_shadow) - iface.s * iface.sigma);

  // Momentum constraint: D_i π^i ≈ 0
  // For 1+1D: ∂_x π_X = surface term
  // Approximate using finite differences
  const pi_X_grad_phys = phys.K.length > 1 
    ? Math.abs((phys.K[1] - phys.K[0]) / dx)
    : 0;
  const pi_X_grad_shadow = shadow.K.length > 1
    ? Math.abs((shadow.K[1] - shadow.K[0]) / dx)
    : 0;

  return {
    H_phys: H_phys_val,
    H_shadow: H_shadow_val,
    M_phys: pi_X_grad_phys,
    M_shadow: pi_X_grad_shadow,
    junction: junction_residual,
    conservation_parallel: Math.abs(pi_X_grad_phys - pi_X_grad_shadow), // tangential momentum conservation
    conservation_normal: energy_balance,
  };
}

// ============================================================================
// Compute Flux Novelty
// ============================================================================

export function computeFluxNovelty(
  state: TwoManifoldState,
  prevState?: TwoManifoldState
): FluxNovelty {
  const { interface: iface } = state;

  let energy_flux_change = 0;
  let momentum_flux_change = 0;

  if (prevState) {
    // Compare current flux with previous (predicted if available)
    const curr_flux = iface.s; // simplified
    const prev_flux = prevState.interface.s;
    energy_flux_change = Math.abs(curr_flux - prev_flux);
    
    momentum_flux_change = Math.abs(iface.theta - prevState.interface.theta);
  }

  // Entropy production rate (directly available)
  const entropy_rate = iface.s > 0 ? iface.eta * iface.theta * iface.theta / iface.s : 0;

  return {
    energy_flux_change,
    momentum_flux_change,
    entropy_production_rate: entropy_rate,
  };
}

// ============================================================================
// Regime Detectors: Semantic Events
// ============================================================================

export function detectRegimes(
  state: TwoManifoldState,
  prevState?: TwoManifoldState
): RegimeDetectors {
  const { interface: iface, phys, shadow } = state;

  // 1. Marginally trapped surface: θ_out → 0
  // (Simplified: check if expansion is near zero and decreasing)
  const marginally_trapped =
    Math.abs(iface.theta) < 0.01 &&
    prevState !== undefined &&
    Math.abs(iface.theta) < Math.abs(prevState.interface.theta);

  // 2. Evaporation onset: entropy production crosses threshold
  // (Simplified: entropy production rate spikes)
  const entropy_rate_now = iface.eta * iface.theta * iface.theta;
  const entropy_rate_prev = prevState
    ? prevState.interface.eta * prevState.interface.theta * prevState.interface.theta
    : 0;
  const evaporation_onset = entropy_rate_now > 0.1 && entropy_rate_now > 2 * entropy_rate_prev;

  // 3. Topology change: (Future) would detect genus change, etc.
  const topology_change = false;

  // 4. Curvature spike: Kretschmann scalar jumps
  // (Simplified: check if average K changes abruptly)
  const K_avg_now = phys.K.reduce((s, k) => s + k, 0) / phys.K.length;
  const K_avg_prev = prevState
    ? prevState.phys.K.reduce((s, k) => s + k, 0) / prevState.phys.K.length
    : K_avg_now;
  const curvature_spike = Math.abs(K_avg_now - K_avg_prev) > 0.1;

  // 5. Junction sign flip: residual changes sign
  const constraints_now = computeConstraintResiduals(state, prevState);
  const constraints_prev = prevState ? computeConstraintResiduals(prevState) : constraints_now;
  const junction_sign_flip =
    Math.sign(constraints_now.junction) !== Math.sign(constraints_prev.junction) &&
    constraints_now.junction > 1e-6;

  return {
    marginally_trapped,
    evaporation_onset,
    topology_change,
    curvature_spike,
    junction_sign_flip,
  };
}

// ============================================================================
// Total Solver Residual
// ============================================================================

export function computeSolverResidual(
  state: TwoManifoldState,
  prevState?: TwoManifoldState,
  weights: {
    w_constraint?: number;
    w_flux?: number;
    w_regime?: number;
  } = {}
): SolverResidual {
  const w_c = weights.w_constraint ?? 1.0;
  const w_f = weights.w_flux ?? 0.5;
  const w_r = weights.w_regime ?? 2.0;

  const constraints = computeConstraintResiduals(state, prevState);
  const flux = computeFluxNovelty(state, prevState);
  const regimes = detectRegimes(state, prevState);

  // Combine constraint violations
  const constraint_residual =
    w_c *
    (Math.abs(constraints.H_phys) +
      Math.abs(constraints.H_shadow) +
      constraints.junction +
      constraints.conservation_normal);

  // Flux novelty
  const flux_novelty = w_f * (flux.energy_flux_change + flux.momentum_flux_change);

  // Regime indicator: 1.0 if any regime flipped
  const regime_indicator = w_r *
    (regimes.marginally_trapped ||
    regimes.evaporation_onset ||
    regimes.topology_change ||
    regimes.curvature_spike ||
    regimes.junction_sign_flip
      ? 1.0
      : 0.0);

  const total = constraint_residual + flux_novelty + regime_indicator;

  return {
    constraint_residual,
    flux_novelty,
    regime_indicator,
    total,
    constraints,
    flux,
    regimes,
  };
}

// ============================================================================
// Antclock Tick Functional: dτ/dt
// ============================================================================

/**
 * The tick rate: how fast does semantic time advance?
 *
 * Inversely proportional to residual: high residual → slow semantic time → small coordinate dt
 * Directly proportional to regime events: regime flip → fast semantic time → refine
 */
export interface AntclockConfig {
  epsilon: number; // target residual
  tau_min: number; // minimum semantic timestep
  tau_max: number; // maximum semantic timestep
  regime_boost: number; // multiply dτ by this on regime flip
}

export function computeSemanticTimestep(
  residual: SolverResidual,
  config: AntclockConfig
): number {
  const base_tau =
    (config.epsilon + 1e-10) / (residual.total + 1e-10);

  // Regime flip detected? Boost the tick
  const regime_mult = residual.regime_indicator > 0 ? config.regime_boost : 1.0;

  const tau = regime_mult * base_tau;

  return Math.max(config.tau_min, Math.min(config.tau_max, tau));
}

/**
 * Convert semantic timestep to coordinate timestep.
 *
 * Clock field: dτ/dt = α|ℜ| + β|Δℱ| + γ·1_{regime flip}
 *
 * Then dt = dτ / (dτ/dt)
 */
export function semanticToCoordinateTime(
  semantic_tau: number,
  tick_rate: number
): number {
  // If tick_rate → 0, dt → ∞ (system is in equilibrium, can take large steps)
  // If tick_rate → ∞, dt → 0 (system is stiff, need small steps)
  const dt = semantic_tau / Math.max(tick_rate, 0.01);
  return dt;
}

// ============================================================================
// Corrector Step: Enforce Monotonicity Constraints
// ============================================================================

/**
 * Hard constraints for the corrector:
 *
 * 1. No coherent work extraction: Φ_out,coh = 0
 * 2. Entropy non-decreasing: dS/dτ ≥ 0
 * 3. Junction condition satisfied to tolerance
 */
export interface MonotonicityConstraints {
  no_coherent_work: number; // Φ_out,coh should be ≈ 0
  entropy_monotone: boolean; // dS/dτ ≥ 0?
  junction_satisfied: boolean; // |[K] - 8πS| < tolerance?
}

export function checkMonotonicity(
  state: TwoManifoldState,
  prevState: TwoManifoldState,
  tolerance: number = 1e-3
): MonotonicityConstraints {
  const { interface: iface } = state;

  // 1. Coherent work extraction
  // (Simplified: enforce by construction in interface dynamics)
  const no_coherent_work = 0; // Built into interface Lagrangian

  // 2. Entropy non-decreasing
  const dS = iface.s - prevState.interface.s;
  const entropy_monotone = dS >= -tolerance;

  // 3. Junction condition
  const K_diff = Math.abs(
    (state.phys.K[0] || 0) - (state.shadow.K[0] || 0)
  );
  const expected_diff = 8 * Math.PI * iface.sigma * iface.s;
  const junction_satisfied = Math.abs(K_diff - expected_diff) < tolerance;

  return {
    no_coherent_work,
    entropy_monotone,
    junction_satisfied,
  };
}

// ============================================================================
// Antclock Solver Loop (Pseudocode + one step)
// ============================================================================

/**
 * One step of the Antclock solver.
 *
 * 1. Predict: RK4 in coordinate time (or another method)
 * 2. Compute residual at prediction
 * 3. Determine semantic timestep (dτ)
 * 4. Convert to coordinate timestep (dt)
 * 5. Correct: enforce constraints if needed
 * 6. Emit tick event if regime flip
 */
export interface AntclockStep {
  tau_step: number; // semantic timestep taken
  t_step: number; // coordinate timestep taken
  residual_before: number;
  residual_after: number;
  tick_event?: string; // "horizon_formation", "evaporation_onset", etc.
  monotonicity: MonotonicityConstraints;
}

export function antclockStep(
  state: TwoManifoldState,
  config: AntclockConfig,
  predict_fn: (s: TwoManifoldState, dt: number) => TwoManifoldState
): { state_new: TwoManifoldState; step_info: AntclockStep } {
  // 1. Compute residual at current state
  const residual_before = computeSolverResidual(state);

  // 2. Determine semantic timestep
  const tau = computeSemanticTimestep(residual_before, config);

  // 3. Convert to coordinate timestep (approximate: use mean tick rate)
  const mean_tick_rate =
    residual_before.constraint_residual +
    residual_before.flux_novelty +
    0.5 * residual_before.regime_indicator;
  const dt = semanticToCoordinateTime(tau, mean_tick_rate);

  // 4. Predict with a standard integrator
  const state_pred = predict_fn(state, dt);

  // 5. Compute residual at prediction
  const residual_after = computeSolverResidual(state_pred, state);

  // 6. Check monotonicity
  const monotonicity = checkMonotonicity(state_pred, state);

  // 7. Detect regime flip for event emission
  let tick_event: string | undefined;
  if (residual_after.regimes.marginally_trapped) {
    tick_event = "marginally_trapped_surface_formed";
  } else if (residual_after.regimes.evaporation_onset) {
    tick_event = "evaporation_threshold_crossed";
  } else if (residual_after.regimes.curvature_spike) {
    tick_event = "curvature_spike";
  } else if (residual_after.regimes.junction_sign_flip) {
    tick_event = "junction_sign_flip";
  }

  return {
    state_new: state_pred,
    step_info: {
      tau_step: tau,
      t_step: dt,
      residual_before: residual_before.total,
      residual_after: residual_after.total,
      tick_event,
      monotonicity,
    },
  };
}

// ============================================================================
// Full Antclock Simulation
// ============================================================================

export interface AntclockSimConfig {
  max_semantic_time: number; // how long to run in τ
  config: AntclockConfig;
}

export interface AntclockSimResult {
  states: TwoManifoldState[];
  steps: AntclockStep[];
  tick_events: string[];
  total_semantic_time: number;
  total_coordinate_time: number;
}

export function antclockSimulate(
  initialState: TwoManifoldState,
  simConfig: AntclockSimConfig,
  predict_fn: (s: TwoManifoldState, dt: number) => TwoManifoldState
): AntclockSimResult {
  const states: TwoManifoldState[] = [initialState];
  const steps: AntclockStep[] = [];
  const tick_events: string[] = [];

  let state = initialState;
  let semantic_time = 0;
  let coordinate_time = state.t;

  while (semantic_time < simConfig.max_semantic_time) {
    const { state_new, step_info } = antclockStep(state, simConfig.config, predict_fn);

    states.push(state_new);
    steps.push(step_info);

    if (step_info.tick_event) {
      tick_events.push(step_info.tick_event);
    }

    semantic_time += step_info.tau_step;
    coordinate_time += step_info.t_step;
    state = state_new;
  }

  return {
    states,
    steps,
    tick_events,
    total_semantic_time: semantic_time,
    total_coordinate_time: coordinate_time,
  };
}

// ============================================================================
// Observable: Semantic vs Coordinate Time
// ============================================================================

export function analyzeAdaptivity(result: AntclockSimResult) {
  const avg_tau = result.total_semantic_time / result.steps.length;
  const avg_t = result.total_coordinate_time / result.steps.length;

  const semantic_efficiency = avg_tau / (avg_t + 1e-10); // τ per unit coordinate time

  const residual_before = result.steps.map((s) => s.residual_before);
  const residual_after = result.steps.map((s) => s.residual_after);

  const residual_improvement = residual_before
    .reduce((sum, rb, i) => sum + (rb - residual_after[i]), 0) /
    (residual_before.reduce((s, x) => s + x, 0) + 1e-10);

  return {
    n_steps: result.steps.length,
    n_ticks: result.tick_events.length,
    avg_semantic_step: avg_tau,
    avg_coordinate_step: avg_t,
    semantic_efficiency,
    total_semantic_time: result.total_semantic_time,
    total_coordinate_time: result.total_coordinate_time,
    residual_improvement_fraction: residual_improvement,
    tick_events: result.tick_events,
  };
}
