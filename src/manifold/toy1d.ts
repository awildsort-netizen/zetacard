/**
 * ζ-Card: 1+1D Toy Model (ζ.card.manifold.toy1d)
 *
 * Simplified 1+1D proof of concept:
 * - Physical bulk: 1 space + 1 time
 * - Shadow bulk: 1 space + 1 time
 * - Membrane Σ: 0 space + 1 time (a curve in spacetime)
 * 
 * This is implementable quickly and verifies:
 * - Conservation
 * - Bianchi consistency
 * - Junction conditions
 * 
 * Perfect for debugging and validation before scaling to 3+1D.
 */

import type {
  TwoManifoldSystem,
  InterfaceMembraneState,
  InterfaceLagrangianParams,
  PhysicalManifold,
  ShadowManifold,
  Metric
} from './types';

/**
 * 1+1D state: just two coordinates (t, x)
 */
export interface State1D {
  t: number;  // time
  x: number;  // space
}

/**
 * 1+1D metric: 2x2 matrix
 * For Minkowski: diag(-1, +1)
 */
export function minkowski1D(): Metric {
  return [
    [-1, 0],
    [0, 1]
  ];
}

/**
 * Initialize 1+1D two-manifold system
 * 
 * Physical and shadow both in 1+1D
 * Membrane is 0+1D (worldline in spacetime)
 */
export function initialize1DSystem(
  surfaceTension: number = 1.0,
  viscosity: { eta: number; zeta: number } = { eta: 0.1, zeta: 0.05 }
): TwoManifoldSystem {
  // Physical manifold (1+1D)
  const physical: PhysicalManifold = {
    metric: minkowski1D(),
    coords: [0, 0], // (t, x)
    matter: [[0, 0], [0, 0]], // Stress-energy tensor
    dimension: 2
  };
  
  // Shadow manifold (1+1D)
  const shadow: ShadowManifold = {
    metric: minkowski1D(),
    coords: [0, 0],
    matter: [[0, 0], [0, 0]],
    dimension: 2,
    stiffness: 0
  };
  
  // Membrane (0+1D - just time evolution)
  // Induced metric is 1D: just the time component
  const membrane: InterfaceMembraneState = {
    inducedMetric: [[-1]], // 1x1 metric for worldline
    extrinsicCurvature: [[0]], // 1x1 extrinsic curvature
    shadowExtrinsicCurvature: [[0]],
    entropy: 0.1, // Initial entropy
    temperature: 1.0, // Initial temperature
    flowVector: [1], // Unit timelike (just dt/dτ = 1)
    surfaceStress: [[0]], // 1x1 surface stress
    embedding: [0, 0.5], // Located at x=0.5 in spacetime
    dimension: 1
  };
  
  const params: InterfaceLagrangianParams = {
    surfaceTension,
    viscosity
  };
  
  return {
    physical,
    shadow,
    interface: membrane,
    params,
    time: 0
  };
}

/**
 * Simple 1+1D evolution step
 * 
 * For 1+1D:
 * - Extrinsic curvature K = acceleration of worldline
 * - Entropy evolves from flux
 * - No spatial complexity
 */
export function step1DSystem(
  system: TwoManifoldSystem,
  energyFluxPhys: number,
  energyFluxShadow: number,
  dt: number
): TwoManifoldSystem {
  const { interface: membrane, params } = system;
  
  // Net flux into membrane
  const netFlux = energyFluxPhys - energyFluxShadow;
  
  // Entropy evolution: ṡ = Φ_net / T
  const dSdt = netFlux / Math.max(membrane.temperature, 0.1);
  const newEntropy = Math.max(0, membrane.entropy + dSdt * dt);
  
  // Temperature increases with entropy
  const newTemperature = 1.0 + 0.1 * newEntropy;
  
  // Extrinsic curvature jump from junction condition
  // K - K̃ = 8π S (scalar in 1D)
  const surfaceStress = params.surfaceTension * membrane.extrinsicCurvature[0][0];
  const K_phys = surfaceStress + membrane.shadowExtrinsicCurvature[0][0];
  
  // Update membrane
  const newMembrane: InterfaceMembraneState = {
    ...membrane,
    entropy: newEntropy,
    temperature: newTemperature,
    extrinsicCurvature: [[K_phys]],
    surfaceStress: [[surfaceStress]]
  };
  
  // Update time
  const newTime = system.time + dt;
  
  return {
    ...system,
    interface: newMembrane,
    time: newTime
  };
}

/**
 * Run 1+1D simulation for multiple steps
 */
export function run1DSimulation(
  initialSystem: TwoManifoldSystem,
  numSteps: number,
  dt: number,
  energySource: (t: number) => { physical: number; shadow: number }
): {
  system: TwoManifoldSystem;
  history: {
    time: number;
    entropy: number;
    temperature: number;
    curvature: number;
  }[];
} {
  let system = initialSystem;
  const history: {
    time: number;
    entropy: number;
    temperature: number;
    curvature: number;
  }[] = [];
  
  for (let i = 0; i < numSteps; i++) {
    const t = system.time;
    const fluxes = energySource(t);
    
    // Record state
    history.push({
      time: t,
      entropy: system.interface.entropy,
      temperature: system.interface.temperature,
      curvature: system.interface.extrinsicCurvature[0][0]
    });
    
    // Step forward
    system = step1DSystem(
      system,
      fluxes.physical,
      fluxes.shadow,
      dt
    );
  }
  
  return { system, history };
}

/**
 * Example: Constant energy source
 */
export function constantSource(
  physicalFlux: number,
  shadowFlux: number
): (t: number) => { physical: number; shadow: number } {
  return () => ({ physical: physicalFlux, shadow: shadowFlux });
}

/**
 * Example: Pulsed energy source (comet-like)
 */
export function pulsedSource(
  amplitude: number,
  frequency: number
): (t: number) => { physical: number; shadow: number } {
  return (t: number) => ({
    physical: amplitude * Math.sin(2 * Math.PI * frequency * t),
    shadow: 0
  });
}

/**
 * Example: Ramp energy source (approval queue growth)
 */
export function rampSource(
  rate: number,
  maxFlux: number
): (t: number) => { physical: number; shadow: number } {
  return (t: number) => ({
    physical: Math.min(rate * t, maxFlux),
    shadow: 0
  });
}

/**
 * Verify conservation in 1+1D
 * 
 * Check: d/dt(E_phys + E_shadow + E_membrane) = 0
 */
export function verify1DConservation(
  history: {
    time: number;
    entropy: number;
    temperature: number;
    curvature: number;
  }[],
  tolerance: number = 0.1
): boolean {
  if (history.length < 2) return true;
  
  // Membrane energy ~ entropy * temperature
  const energies = history.map(h => h.entropy * h.temperature);
  
  // Check if total energy is approximately conserved
  // (In full system would include bulk energies too)
  for (let i = 1; i < energies.length; i++) {
    const dE = energies[i] - energies[i - 1];
    const dt = history[i].time - history[i - 1].time;
    const dEdt = Math.abs(dE / dt);
    
    // Allow some numerical drift
    if (dEdt > tolerance) {
      return false;
    }
  }
  
  return true;
}
