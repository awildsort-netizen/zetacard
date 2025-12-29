/**
 * Antclock as Event-Driven Integrator for Two-Manifold Coupled System (v2.0)
 *
 * Event detection strategy:
 * - PHASE 3: Interface worldline dynamics (entropy-flux coupling)
 * - PHASE 5: Continued-fraction curvature signals (discrete Levi-Civita)
 *
 * Key insight: Most coordinate time is "boring" (smooth RK4 evolution).
 * Antclock detects meaningful events (curvature spikes, entropy jumps) and
 * refines time stepping only when the system is "interesting".
 *
 * Reference: Phase 2 complete, v2.0 schema (twoManifoldCoupled.ts)
 */

import type { TwoManifoldState } from "./twoManifoldCoupled";
import { derivative } from "./twoManifoldCoupled";

// ============================================================================
// Event Detection: v2.0 Observables (Phase 3/5)
// ============================================================================

/**
 * Phase 3 will add interface worldline dynamics.
 * Until then, we detect events from bulk field evolution.
 */
export interface BulkEventSignals {
  // Energy flux at interface: Φ_in = ∂_t ψ · ∂_x ψ|_{x_b}
  energy_flux: number;

  // Dilaton acceleration: d²X/dt² at interface
  dilaton_acceleration: number;

  // Matter field amplitude (scalar field kinetic energy density)
  matter_activity: number;

  // Field variation (spatial gradient energy)
  spatial_roughness: number;
}

/**
 * Phase 5: Continued-fraction curvature signals
 * (These will be computed from interface worldline in Phase 4)
 */
export interface CFCurvatureSignals {
  // Discrete curvature from convergent path changes
  // (Phase 5: computed from interface parameter evolution)
  cf_curvature: number; // |a_n - a_{n-1}| in CF expansion

  // Torsion: how much direction changes per step
  // (Phase 5: from worldline angle changes)
  cf_torsion: number;

  // Flatness metric: how stable are the CF coefficients?
  cf_flatness: number; // variance in recent a_n
}

/**
 * Total event signal for Antclock ticking.
 */
export interface AntclockEventSignal {
  // Bulk observables (Phase 2-3)
  bulk: BulkEventSignals;

  // CF curvature events (Phase 5 integration)
  // For now, these are zero placeholders
  cf: CFCurvatureSignals;

  // Combined metric for event significance
  total_event_magnitude: number;

  // Is this event significant enough to tick?
  should_tick: boolean;
}

// ============================================================================
// Compute Event Signals (v2.0: Phase 2/3 observables)
// ============================================================================

/**
 * Extract bulk event signals from current state.
 * (Placeholder for Phase 4: will integrate interface worldline)
 */
export function computeBulkEventSignals(
  state: TwoManifoldState,
  prevState?: TwoManifoldState
): BulkEventSignals {
  const { bulk, interface: iface, dx } = state;

  // Energy flux at interface
  const psi_x = derivative(bulk.psi, dx);
  const i_b = iface.x_b_index;
  const energy_flux = bulk.psi_dot[i_b] * psi_x[i_b];

  // Dilaton acceleration (finite difference)
  let dilaton_acceleration = 0;
  if (prevState) {
    // d²X/dt² ≈ (X_now - 2·X_mid + X_prev) / dt²
    // Using interface location
    const X_now = state.bulk.X[i_b];
    const X_prev = prevState.bulk.X[i_b];
    const X_dot_now = state.bulk.X_dot[i_b];
    const X_dot_prev = prevState.bulk.X_dot[i_b];
    
    dilaton_acceleration = Math.abs((X_dot_now - X_dot_prev) / state.dt);
  }

  // Matter field activity (kinetic energy density at interface)
  const matter_activity = 0.5 * (
    bulk.psi_dot[i_b] * bulk.psi_dot[i_b] +
    psi_x[i_b] * psi_x[i_b]
  );

  // Spatial roughness (how much gradient energy overall)
  let spatial_roughness = 0;
  const rho_x = derivative(bulk.rho, dx);
  const X_x = derivative(bulk.X, dx);
  for (let i = 0; i < bulk.psi.length; i++) {
    spatial_roughness += 0.5 * (
      rho_x[i] * rho_x[i] +
      X_x[i] * X_x[i] +
      psi_x[i] * psi_x[i]
    );
  }
  spatial_roughness *= dx;

  return {
    energy_flux,
    dilaton_acceleration,
    matter_activity,
    spatial_roughness,
  };
}

/**
 * Placeholder for Phase 5 CF curvature detection.
 * (Will be populated when interface worldline is parameterized by continued fractions)
 */
export function computeCFCurvatureSignals(
  state: TwoManifoldState,
  prevState?: TwoManifoldState
): CFCurvatureSignals {
  // Phase 5: Extract from interface worldline CF expansion
  // For now, all zeros (no CF structure yet)
  return {
    cf_curvature: 0,
    cf_torsion: 0,
    cf_flatness: 0,
  };
}

/**
 * Combine all event signals into total magnitude.
 */
export function computeAntclockEventSignal(
  state: TwoManifoldState,
  prevState?: TwoManifoldState,
  threshold: number = 0.05
): AntclockEventSignal {
  const bulk = computeBulkEventSignals(state, prevState);
  const cf = computeCFCurvatureSignals(state, prevState);

  // Weighted combination of signals
  const total_event_magnitude =
    Math.abs(bulk.energy_flux) * 0.4 +
    Math.abs(bulk.dilaton_acceleration) * 0.3 +
    Math.abs(bulk.matter_activity) * 0.2 +
    Math.abs(cf.cf_curvature) * 0.1; // CF weight (currently zero)

  const should_tick = total_event_magnitude > threshold;

  return {
    bulk,
    cf,
    total_event_magnitude,
    should_tick,
  };
}

// ============================================================================
// Residual Computation (v2.0: Single Bulk)
// ============================================================================

/**
 * Estimate constraint violations in the bulk.
 * (Simplified for Phase 2: no explicit constraints yet)
 */
export function computeConstraintResidual(
  state: TwoManifoldState,
  prevState?: TwoManifoldState
): number {
  // Phase 2: The wave equations are explicitly solved, no constraints.
  // Phase 3+: Will add junction conditions and energy balance.
  
  // For now, use event signal magnitude as proxy for residual
  const event = computeAntclockEventSignal(state, prevState);
  return event.total_event_magnitude;
}

// ============================================================================
// Antclock Configuration
// ============================================================================

export interface AntclockConfig {
  // Event detection
  event_threshold: number; // magnitude above which to consider an event
  event_boost: number; // dt multiplier when event detected

  // Time stepping
  dt_nominal: number; // default coordinate timestep
  dt_min: number; // minimum timestep
  dt_max: number; // maximum timestep

  // Semantic time
  max_semantic_ticks: number; // maximum number of events
  max_coordinate_time: number; // maximum wall-clock time
}

/**
 * Default Antclock configuration optimized for Phase 2 dynamics.
 */
export function defaultAntclockConfig(): AntclockConfig {
  return {
    event_threshold: 0.05, // events when flux or acceleration > 0.05
    event_boost: 0.5, // reduce dt on event (refine time stepping)
    dt_nominal: 0.01, // default RK4 step
    dt_min: 0.001,
    dt_max: 0.1,
    max_semantic_ticks: 100,
    max_coordinate_time: 10.0,
  };
}

// ============================================================================
// Antclock Step
// ============================================================================

export interface AntclockStepResult {
  state_new: TwoManifoldState;
  dt_used: number; // coordinate timestep taken
  event_signal: AntclockEventSignal;
  is_tick: boolean; // did an event occur?
  tick_description?: string;
}

/**
 * One step of Antclock integration.
 *
 * Strategy:
 * 1. Detect if current state has an event
 * 2. Adjust timestep (smaller on events)
 * 3. Integrate using provided stepper function
 * 4. Return state + tick info
 */
export function antclockStep(
  state: TwoManifoldState,
  config: AntclockConfig,
  stepper: (s: TwoManifoldState, dt: number) => TwoManifoldState,
  prevState?: TwoManifoldState
): AntclockStepResult {
  // 1. Detect event
  const event_signal = computeAntclockEventSignal(state, prevState, config.event_threshold);
  const is_tick = event_signal.should_tick;

  // 2. Adjust timestep
  let dt = config.dt_nominal;
  if (is_tick) {
    dt *= config.event_boost; // reduce on event
  }
  dt = Math.max(config.dt_min, Math.min(config.dt_max, dt));

  // 3. Integrate
  const state_new = stepper(state, dt);

  // 4. Generate tick description
  let tick_description: string | undefined;
  if (is_tick) {
    if (Math.abs(event_signal.bulk.energy_flux) > 0.05) {
      tick_description = "energy_flux_spike";
    } else if (Math.abs(event_signal.bulk.dilaton_acceleration) > 0.05) {
      tick_description = "dilaton_acceleration_spike";
    } else if (Math.abs(event_signal.bulk.matter_activity) > 0.05) {
      tick_description = "matter_activity_spike";
    }
  }

  return {
    state_new,
    dt_used: dt,
    event_signal,
    is_tick,
    tick_description,
  };
}

// ============================================================================
// Full Antclock Simulation
// ============================================================================

export interface AntclockSimulationResult {
  states: TwoManifoldState[];
  steps: AntclockStepResult[];
  total_ticks: number;
  total_coordinate_time: number;
  tick_events: string[];
}

/**
 * Run full Antclock simulation.
 */
export function antclockSimulate(
  initialState: TwoManifoldState,
  config: AntclockConfig,
  stepper: (s: TwoManifoldState, dt: number) => TwoManifoldState
): AntclockSimulationResult {
  const states: TwoManifoldState[] = [initialState];
  const steps: AntclockStepResult[] = [];
  const tick_events: string[] = [];

  let state = initialState;
  let n_ticks = 0;
  let coordinate_time = state.t;

  while (
    n_ticks < config.max_semantic_ticks &&
    coordinate_time < config.max_coordinate_time
  ) {
    const result = antclockStep(state, config, stepper, states[states.length - 2]);

    states.push(result.state_new);
    steps.push(result);

    if (result.is_tick) {
      n_ticks++;
      if (result.tick_description) {
        tick_events.push(result.tick_description);
      }
    }

    coordinate_time += result.dt_used;
    state = result.state_new;
  }

  return {
    states,
    steps,
    total_ticks: n_ticks,
    total_coordinate_time: coordinate_time,
    tick_events,
  };
}

// ============================================================================
// Analysis: Antclock Efficiency
// ============================================================================

export interface AntclockAnalysis {
  n_steps: number;
  n_ticks: number;
  tick_fraction: number; // n_ticks / n_steps

  avg_dt: number;
  min_dt: number;
  max_dt: number;

  dominant_events: Map<string, number>; // event type → count

  // Phase 5 placeholder: will show CF curvature statistics
  cf_statistics?: {
    avg_curvature: number;
    max_curvature: number;
  };
}

export function analyzeAntclockResult(result: AntclockSimulationResult): AntclockAnalysis {
  const dts = result.steps.map((s) => s.dt_used);
  const avg_dt = dts.reduce((a, b) => a + b, 0) / dts.length;
  const min_dt = Math.min(...dts);
  const max_dt = Math.max(...dts);

  // Count event types
  const dominant_events = new Map<string, number>();
  for (const event of result.tick_events) {
    dominant_events.set(event, (dominant_events.get(event) ?? 0) + 1);
  }

  return {
    n_steps: result.steps.length,
    n_ticks: result.total_ticks,
    tick_fraction: result.total_ticks / result.steps.length,
    avg_dt,
    min_dt,
    max_dt,
    dominant_events,
  };
}
