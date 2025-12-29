/**
 * Example usage of the Contract Physics Engine
 * 
 * This demonstrates:
 * 1. Basic potential and force computation
 * 2. Trajectory analysis with agent scoring
 * 3. Orbit classification (planet vs comet)
 * 4. Sun contract safety (bounded force)
 */

import {
  phi_c,
  grad_phi_c,
  force_c,
  boundedForce,
  scoreAgent,
  classifyOrbit,
  DEFAULT_PHI_PARAMS,
  DEFAULT_AGENT_PARAMS,
  EMERGENCY_AGENT_PARAMS,
  SMALL_TEAM_AGENT_PARAMS,
  type Vec,
  type PhiParams,
  type AgentParams,
} from './contractPhysics';

// ============================================================================
// Example 1: Basic Potential and Force Computation
// ============================================================================

console.log('='.repeat(80));
console.log('Example 1: Basic Potential and Force Computation');
console.log('='.repeat(80));

// Define a state vector (8 dimensions representing contract state)
// x = [money, time, outcomes, quality, pace, legal_risk, uncertainty, cognitive_load]
const state: Vec = [0.6, 0.5, 0.7, 0.8, 0.5, 0.3, 0.4, 0.6];

// Compute potential energy
const potential = phi_c(state, DEFAULT_PHI_PARAMS);
console.log('\nState vector:', state);
console.log('Potential Φ(x):', potential.toFixed(4));

// Compute gradient (which direction increases potential)
const gradient = grad_phi_c(state, DEFAULT_PHI_PARAMS);
console.log('Gradient ∇Φ(x):', gradient.map(g => g.toFixed(4)));

// Compute force (opposite of gradient, pushes toward lower potential)
const force = force_c(state, DEFAULT_PHI_PARAMS);
console.log('Force F(x):', force.map(f => f.toFixed(4)));

// ============================================================================
// Example 2: Trajectory Analysis - Steady Growth
// ============================================================================

console.log('\n' + '='.repeat(80));
console.log('Example 2: Trajectory Analysis - Steady Growth');
console.log('='.repeat(80));

// Simulate a project with steady, sustainable growth over 10 time units
const steadyTimes = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
const steadyTrajectory: Vec[] = steadyTimes.map(t => {
  const progress = t / 10;
  return [
    0.5 + 0.3 * progress,  // money increases
    0.5 + 0.2 * progress,  // time invested
    0.5 + 0.3 * progress,  // outcomes improve
    0.7 + 0.1 * progress,  // quality maintained
    0.5 + 0.1 * progress,  // pace steady
    0.2,                    // legal risk low and stable
    0.4 - 0.1 * progress,  // uncertainty decreases
    0.5 + 0.1 * progress,  // cognitive load increases slightly
  ];
});

const steadyScore = scoreAgent(
  steadyTimes,
  steadyTrajectory,
  undefined,
  DEFAULT_PHI_PARAMS,
  DEFAULT_AGENT_PARAMS
);

console.log('\nSteady Growth Results:');
console.log('  Cumulative Harm (H):', steadyScore.H.toFixed(4));
console.log('  Peak G-force (Gpeak):', steadyScore.Gpeak.toFixed(4));
console.log('  Exposure (E):', steadyScore.E.toFixed(4));
console.log('  Zeta Score (ζ):', steadyScore.zeta.toFixed(4));

const steadyOrbit = classifyOrbit(steadyScore.E, steadyScore.Gpeak, 50, 150);
console.log('  Orbit Type:', steadyOrbit);

// ============================================================================
// Example 3: Trajectory Analysis - Crisis Mode (High Acceleration)
// ============================================================================

console.log('\n' + '='.repeat(80));
console.log('Example 3: Trajectory Analysis - Crisis Mode');
console.log('='.repeat(80));

// Simulate a crisis: sudden changes, high acceleration
const crisisTimes = [0, 1, 2, 3, 4, 5];
const crisisTrajectory: Vec[] = [
  [0.6, 0.5, 0.6, 0.7, 0.5, 0.2, 0.3, 0.5],  // stable start
  [0.6, 0.5, 0.6, 0.7, 0.5, 0.2, 0.3, 0.5],  // still stable
  [0.3, 0.8, 0.4, 0.5, 0.9, 0.6, 0.7, 0.8],  // CRISIS! everything changes
  [0.4, 0.7, 0.5, 0.6, 0.7, 0.5, 0.6, 0.7],  // recovering
  [0.5, 0.6, 0.6, 0.7, 0.6, 0.4, 0.5, 0.6],  // stabilizing
  [0.55, 0.55, 0.65, 0.75, 0.55, 0.3, 0.4, 0.55], // recovered
];

const crisisScore = scoreAgent(
  crisisTimes,
  crisisTrajectory,
  undefined,
  DEFAULT_PHI_PARAMS,
  EMERGENCY_AGENT_PARAMS // Use emergency parameters for crisis
);

console.log('\nCrisis Mode Results:');
console.log('  Cumulative Harm (H):', crisisScore.H.toFixed(4));
console.log('  Peak G-force (Gpeak):', crisisScore.Gpeak.toFixed(4));
console.log('  Exposure (E):', crisisScore.E.toFixed(4));
console.log('  Zeta Score (ζ):', crisisScore.zeta.toFixed(4));

const crisisOrbit = classifyOrbit(crisisScore.E, crisisScore.Gpeak, 50, 150);
console.log('  Orbit Type:', crisisOrbit);

// ============================================================================
// Example 4: Legal Risk Crossing Threshold
// ============================================================================

console.log('\n' + '='.repeat(80));
console.log('Example 4: Legal Risk Crossing Threshold');
console.log('='.repeat(80));

// Compare two similar trajectories, one with high legal risk
const legalTimes = [0, 1, 2, 3];

const safeLegalTrajectory: Vec[] = [
  [0.5, 0.5, 0.5, 0.5, 0.5, 0.3, 0.5, 0.5], // legal_risk = 0.3 (safe)
  [0.5, 0.5, 0.5, 0.5, 0.5, 0.3, 0.5, 0.5],
  [0.55, 0.55, 0.55, 0.55, 0.55, 0.35, 0.5, 0.5],
  [0.6, 0.6, 0.6, 0.6, 0.6, 0.4, 0.5, 0.5],
];

const riskyLegalTrajectory: Vec[] = [
  [0.5, 0.5, 0.5, 0.5, 0.5, 0.3, 0.5, 0.5],  // legal_risk = 0.3 (safe)
  [0.5, 0.5, 0.5, 0.5, 0.5, 0.3, 0.5, 0.5],
  [0.55, 0.55, 0.55, 0.55, 0.55, 0.85, 0.5, 0.5], // legal_risk = 0.85 (DANGER!)
  [0.6, 0.6, 0.6, 0.6, 0.6, 0.9, 0.5, 0.5],       // legal_risk = 0.9 (CRITICAL!)
];

const safeScore = scoreAgent(
  legalTimes,
  safeLegalTrajectory,
  undefined,
  DEFAULT_PHI_PARAMS,
  DEFAULT_AGENT_PARAMS
);

const riskyScore = scoreAgent(
  legalTimes,
  riskyLegalTrajectory,
  undefined,
  DEFAULT_PHI_PARAMS,
  DEFAULT_AGENT_PARAMS
);

console.log('\nSafe Legal Risk Results:');
console.log('  Harm:', safeScore.H.toFixed(4));
console.log('  Zeta:', safeScore.zeta.toFixed(4));

console.log('\nRisky Legal Risk Results (crosses threshold at 0.8):');
console.log('  Harm:', riskyScore.H.toFixed(4));
console.log('  Zeta:', riskyScore.zeta.toFixed(4));
console.log('  Harm Increase:', ((riskyScore.H / safeScore.H - 1) * 100).toFixed(1) + '%');
console.log('  Zeta Decrease:', ((1 - riskyScore.zeta / safeScore.zeta) * 100).toFixed(1) + '%');

// ============================================================================
// Example 5: Sun Contract with Bounded Force
// ============================================================================

console.log('\n' + '='.repeat(80));
console.log('Example 5: Sun Contract with Bounded Force');
console.log('='.repeat(80));

// Create a high-energy state that would normally produce huge forces
const sunState: Vec = [0.95, 0.95, 0.95, 0.95, 0.95, 0.95, 0.95, 0.95];

const unboundedForce = force_c(sunState, DEFAULT_PHI_PARAMS);
const boundedForceResult = boundedForce(unboundedForce, 10); // Cap at magnitude 10

console.log('\nHigh-energy state (sun contract):');
console.log('State:', sunState);

// Compute magnitude
const unboundedMag = Math.sqrt(unboundedForce.reduce((s, f) => s + f * f, 0));
const boundedMag = Math.sqrt(boundedForceResult.reduce((s, f) => s + f * f, 0));

console.log('Unbounded force magnitude:', unboundedMag.toFixed(4));
console.log('Bounded force magnitude:', boundedMag.toFixed(4));
console.log('Reduction factor:', (unboundedMag / boundedMag).toFixed(2) + 'x');

// Verify direction is preserved
const dotProduct = unboundedForce.reduce((s, f, i) => s + f * boundedForceResult[i], 0);
const cosTheta = dotProduct / (unboundedMag * boundedMag);
console.log('Direction preserved (cos θ):', cosTheta.toFixed(6), '(1.0 = perfect)');

// ============================================================================
// Example 6: Different Agent Capacities
// ============================================================================

console.log('\n' + '='.repeat(80));
console.log('Example 6: Agent Capacity Comparison');
console.log('='.repeat(80));

// Same trajectory, different agent capacities
const times = [0, 1, 2, 3, 4];
const trajectory: Vec[] = [
  [0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5],
  [0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5],
  [0.7, 0.7, 0.7, 0.7, 0.7, 0.5, 0.5, 0.5],
  [0.75, 0.75, 0.75, 0.75, 0.75, 0.5, 0.5, 0.5],
  [0.8, 0.8, 0.8, 0.8, 0.8, 0.5, 0.5, 0.5],
];

const orgScore = scoreAgent(times, trajectory, undefined, DEFAULT_PHI_PARAMS, DEFAULT_AGENT_PARAMS);
const smallTeamScore = scoreAgent(times, trajectory, undefined, DEFAULT_PHI_PARAMS, SMALL_TEAM_AGENT_PARAMS);
const emergencyScore = scoreAgent(times, trajectory, undefined, DEFAULT_PHI_PARAMS, EMERGENCY_AGENT_PARAMS);

console.log('\nSame trajectory, different agent capacities:');
console.log('\nOrg-level capacity (τ=7 days):');
console.log('  Gpeak:', orgScore.Gpeak.toFixed(4));
console.log('  Harm:', orgScore.H.toFixed(4));
console.log('  Zeta:', orgScore.zeta.toFixed(4));

console.log('\nSmall team capacity (τ=1 day):');
console.log('  Gpeak:', smallTeamScore.Gpeak.toFixed(4));
console.log('  Harm:', smallTeamScore.H.toFixed(4));
console.log('  Zeta:', smallTeamScore.zeta.toFixed(4));

console.log('\nEmergency capacity (τ=0.25 days):');
console.log('  Gpeak:', emergencyScore.Gpeak.toFixed(4));
console.log('  Harm:', emergencyScore.H.toFixed(4));
console.log('  Zeta:', emergencyScore.zeta.toFixed(4));

// ============================================================================
// Example 7: Custom Parameters for Specific Contract Type
// ============================================================================

console.log('\n' + '='.repeat(80));
console.log('Example 7: Custom Parameters for Specific Contract');
console.log('='.repeat(80));

// Example: high-risk, high-reward contract
// More weight on money and outcomes, higher cliff for legal risk
const customPhiParams: PhiParams = {
  ...DEFAULT_PHI_PARAMS,
  w: [3.0, 1.0, 2.5, 0.8, 1.2, 5.0, 0.8, 0.9], // Higher weight on money and outcomes
  C_cliff: 10.0, // Steeper legal cliff
  theta_legal: 0.7, // Lower legal threshold
};

const testState: Vec = [0.8, 0.6, 0.7, 0.6, 0.7, 0.75, 0.5, 0.6];
const customPhi = phi_c(testState, customPhiParams);
const defaultPhi = phi_c(testState, DEFAULT_PHI_PARAMS);

console.log('\nCustom vs Default Parameters:');
console.log('State:', testState);
console.log('Custom potential:', customPhi.toFixed(4));
console.log('Default potential:', defaultPhi.toFixed(4));
console.log('Difference:', (customPhi - defaultPhi).toFixed(4));

console.log('\n' + '='.repeat(80));
console.log('Examples Complete!');
console.log('='.repeat(80));
