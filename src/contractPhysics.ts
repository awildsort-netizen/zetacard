/**
 * ζ-Card: Contract Physics Engine (ζ.card.contract.physics)
 *
 * Mathematical framework for contract dynamics:
 * - Physical potential/force model (softplus-based with interactions and cliffs)
 * - Discrete-time kinematics (velocity, acceleration from logs)
 * - Agent capacity, G-force, harm, exposure, and zeta scoring
 * - Deterministic normalization with exact gradients
 *
 * Based on spectral-dynamical modeling for contract health and agent safety.
 */

// Import existing math utilities for consistency
import { EPS, sigmoid as sigmoidBase, dot as dotBase } from './math';

export type Vec = number[]; // length 8 by default

// ============================================================================
// Core Mathematical Functions
// ============================================================================

/**
 * Numerically stable softplus: log(1 + exp(z))
 * Uses the identity: softplus(z) = log(1 + exp(-|z|)) + max(z, 0)
 */
export const softplus = (z: number): number => {
  return Math.log1p(Math.exp(-Math.abs(z))) + Math.max(z, 0);
};

/**
 * Sigmoid: 1 / (1 + exp(-z))
 * Re-exported from math.ts for convenience
 */
export const sigmoid = sigmoidBase;

/**
 * ReLU: max(0, z)
 */
export const relu = (z: number): number => {
  return z > 0 ? z : 0;
};

// ============================================================================
// Vector Operations
// ============================================================================

/**
 * Dot product of two vectors
 * Re-exported from math.ts for convenience
 */
export const dot = dotBase;

/**
 * L2 norm (Euclidean length) of a vector
 * Similar to norm() in math.ts but without EPS addition,
 * as we handle zero-protection explicitly where needed.
 */
export const l2 = (v: Vec): number => {
  return Math.sqrt(dot(v, v));
};

/**
 * Vector addition: a + b
 */
export const add = (a: Vec, b: Vec): Vec => {
  return a.map((ai, i) => ai + b[i]);
};

/**
 * Vector subtraction: a - b
 */
export const sub = (a: Vec, b: Vec): Vec => {
  return a.map((ai, i) => ai - b[i]);
};

/**
 * Scalar multiplication: c * a
 */
export const scale = (a: Vec, c: number): Vec => {
  return a.map(ai => ai * c);
};

// ============================================================================
// Potential and Force Model
// ============================================================================

/**
 * Parameters for the total potential Φ_c(x)
 */
export type PhiParams = {
  // Base softplus terms: Σ w_i * softplus(α_i(x_i - μ_i))
  w: Vec;           // weights for each dimension
  alpha: Vec;       // steepness parameters
  mu: Vec;          // center points
  
  // Interaction terms
  w_mp: number;     // weight for x1*x5 interaction (money × pace)
  w_to: number;     // weight for x2*x3 interaction (time × outcomes)
  
  // Cliff term (legal risk)
  C_cliff: number;  // cliff amplitude
  theta_legal: number; // cliff threshold
  q: number;        // cliff exponent
};

/**
 * Total potential Φ_c(x)
 * 
 * Φ_c(x) = Φ_base(x) + Φ_int(x) + Φ_cliff(x)
 * 
 * where:
 * - Φ_base(x) = Σ w_i * softplus(α_i(x_i - μ_i))
 * - Φ_int(x) = w_mp * x1*x5 + w_to * x2*x3
 * - Φ_cliff(x) = C_cliff * ReLU(x6 - θ)^q
 */
export function phi_c(x: Vec, p: PhiParams): number {
  // Base term: sum of weighted softplus functions
  let base = 0;
  for (let i = 0; i < 8; i++) {
    const z = p.alpha[i] * (x[i] - p.mu[i]);
    base += p.w[i] * softplus(z);
  }
  
  // Interaction terms: x1*x5 and x2*x3
  const inter = p.w_mp * x[0] * x[4] + p.w_to * x[1] * x[2];
  
  // Cliff term: legal risk (x6 is index 5 in 0-based)
  const cliff = p.C_cliff * Math.pow(relu(x[5] - p.theta_legal), p.q);
  
  return base + inter + cliff;
}

/**
 * Gradient of Φ_c(x) with respect to x
 * 
 * Returns ∇Φ_c(x), the 8-dimensional gradient vector.
 * 
 * Derivatives:
 * - Base: ∂/∂x_i Φ_base = w_i * α_i * σ(α_i(x_i - μ_i))
 * - Interaction x1*x5: ∂/∂x1 = w_mp*x5, ∂/∂x5 = w_mp*x1
 * - Interaction x2*x3: ∂/∂x2 = w_to*x3, ∂/∂x3 = w_to*x2
 * - Cliff: ∂/∂x6 = C_cliff * q * (x6-θ)^(q-1) if x6 > θ, else 0
 */
export function grad_phi_c(x: Vec, p: PhiParams): Vec {
  const g: Vec = Array(8).fill(0);
  
  // Base term derivatives
  for (let i = 0; i < 8; i++) {
    const z = p.alpha[i] * (x[i] - p.mu[i]);
    g[i] += p.w[i] * p.alpha[i] * sigmoid(z);
  }
  
  // Interaction term derivatives
  g[0] += p.w_mp * x[4]; // ∂/∂x1 of x1*x5
  g[4] += p.w_mp * x[0]; // ∂/∂x5 of x1*x5
  g[1] += p.w_to * x[2]; // ∂/∂x2 of x2*x3
  g[2] += p.w_to * x[1]; // ∂/∂x3 of x2*x3
  
  // Cliff term derivative (x6 is index 5)
  const d = x[5] - p.theta_legal;
  if (d > 0) {
    g[5] += p.C_cliff * p.q * Math.pow(d, p.q - 1);
  }
  
  return g;
}

/**
 * Force field F_c(x) = -∇Φ_c(x)
 * 
 * The force points in the direction of steepest descent of the potential.
 */
export function force_c(x: Vec, p: PhiParams): Vec {
  return scale(grad_phi_c(x, p), -1);
}

/**
 * Bounded force for "sun contracts" (infinite energy, finite field)
 * 
 * Prevents unbounded acceleration by saturating force magnitude:
 * F_sun(x) = -∇Φ(x) / (1 + |∇Φ(x)|/F_max)
 * 
 * As ||∇Φ|| → ∞, force magnitude → F_max while direction is preserved.
 */
export function boundedForce(F: Vec, Fmax: number): Vec {
  const mag = l2(F);
  if (mag <= 1e-12) return F;
  const scaleFactor = 1 / (1 + mag / Fmax);
  return scale(F, scaleFactor);
}

// ============================================================================
// Agent Capacity and Scoring
// ============================================================================

/**
 * Agent-specific parameters for capacity, harm, and zeta scoring
 */
export type AgentParams = {
  // Capacity model: C_a = c0 + c1*x1 + c2*(1-x8)
  c0: number;       // base capacity
  c1: number;       // money slack coefficient (x1)
  c2: number;       // cognitive load coefficient (1-x8)
  tau: number;      // response timescale (in same units as dt)
  
  // Harm model: h_a = α*[max(0,G-G0)]^p + β*[max(0,x6-θ6)]^r
  G0: number;       // G-force threshold
  p: number;        // G-force harm exponent
  alpha: number;    // G-force harm coefficient
  beta: number;     // legal cliff harm coefficient
  theta6: number;   // legal risk threshold
  r: number;        // legal harm exponent
  
  // Zeta score: ζ = exp(-λ1*H - λ2*[max(0,Gpeak-G0)]^s)
  lambda1: number;  // cumulative harm weight
  lambda2: number;  // peak G weight
  s: number;        // peak G exponent
  
  // Optional acceleration scaling (for normalized |a|)
  sigmaA?: Vec;     // per-dimension normalization factors
};

/**
 * Compute scaled acceleration magnitude
 * 
 * If sigmaA is provided, uses weighted norm: |a| = sqrt(Σ(a_i/σ_i)²)
 * Otherwise uses standard L2 norm.
 */
export function accelMagnitude(a: Vec, sigmaA?: Vec): number {
  if (!sigmaA) return l2(a);
  
  let sum = 0;
  for (let i = 0; i < 8; i++) {
    sum += Math.pow(a[i] / (sigmaA[i] || 1), 2);
  }
  return Math.sqrt(sum);
}

/**
 * Score agent across a trajectory
 * 
 * Computes:
 * - H: Cumulative harm (integrated instantaneous harm)
 * - Gpeak: Peak G-force experienced
 * - E: Exposure (integrated force magnitude when involved)
 * - zeta: Overall health score ∈ [0,1]
 * 
 * @param times - timestamps for each state
 * @param xs - state vectors (8-dimensional) at each time
 * @param involved - optional weight function w_a(k) ∈ [0,1] indicating involvement
 * @param phiParams - potential field parameters
 * @param agent - agent-specific parameters
 * @returns {H, Gpeak, E, zeta}
 */
export function scoreAgent(
  times: number[],
  xs: Vec[],
  involved?: (k: number) => number,
  phiParams?: PhiParams,
  agent?: AgentParams
): { H: number; Gpeak: number; E: number; zeta: number } {
  if (!agent || !phiParams) {
    throw new Error("Missing agent or phi parameters");
  }
  
  // Minimum time step for numerical stability (same as EPS from math.ts)
  const dtMin = EPS;
  
  // Compute velocity and acceleration via finite differences
  const v: Vec[] = xs.map(() => Array(8).fill(0));
  const a: Vec[] = xs.map(() => Array(8).fill(0));
  
  // Velocity: v[k] = (x[k] - x[k-1]) / dt
  for (let k = 1; k < xs.length; k++) {
    const dt = Math.max(times[k] - times[k - 1], dtMin);
    v[k] = scale(sub(xs[k], xs[k - 1]), 1 / dt);
  }
  
  // Acceleration: a[k] = (v[k] - v[k-1]) / dt
  for (let k = 2; k < xs.length; k++) {
    const dt = Math.max(times[k] - times[k - 1], dtMin);
    a[k] = scale(sub(v[k], v[k - 1]), 1 / dt);
  }
  
  // Accumulate metrics
  let H = 0;      // cumulative harm
  let Gpeak = 0;  // peak G-force
  let E = 0;      // exposure
  
  for (let k = 2; k < xs.length; k++) {
    const dt = Math.max(times[k] - times[k - 1], dtMin);
    const x = xs[k];
    
    // Capacity: C_a = c0 + c1*x1 + c2*(1-x8)
    const C = agent.c0 + agent.c1 * x[0] + agent.c2 * (1 - x[7]);
    const g = C / agent.tau;
    
    // G-force: G_a = |a| / g_a
    const amag = accelMagnitude(a[k], agent.sigmaA);
    const G = amag / Math.max(g, 1e-9); // avoid division by zero
    if (G > Gpeak) Gpeak = G;
    
    // Instantaneous harm: h_a = α*[G-G0]_+^p + β*[x6-θ6]_+^r
    const riskCliff = Math.pow(relu(x[5] - agent.theta6), agent.r);
    const harm = agent.alpha * Math.pow(relu(G - agent.G0), agent.p) 
               + agent.beta * riskCliff;
    H += harm * dt;
    
    // Exposure: E_a = Σ w_a * |F| * dt
    const w = involved ? involved(k) : 1;
    const F = force_c(x, phiParams);
    E += w * l2(F) * dt;
  }
  
  // Zeta score: ζ_a = exp(-λ1*H - λ2*[Gpeak-G0]_+^s)
  const zeta = Math.exp(
    -agent.lambda1 * H 
    - agent.lambda2 * Math.pow(relu(Gpeak - agent.G0), agent.s)
  );
  
  return { H, Gpeak, E, zeta };
}

// ============================================================================
// Orbit Classification (Planet vs Comet)
// ============================================================================

export type OrbitType = 'comet' | 'planet' | 'spiky_planet' | 'drift';

/**
 * Classify orbit based on exposure and peak G-force
 * 
 * - Comet: high Gpeak (≥3), low E
 * - Planet: high E, low Gpeak (≤2)
 * - Spiky planet: both high
 * - Drift: both low
 * 
 * @param E - exposure
 * @param Gpeak - peak G-force
 * @param E_low - low exposure threshold (e.g., 30th percentile)
 * @param E_high - high exposure threshold (e.g., 70th percentile)
 */
export function classifyOrbit(
  E: number,
  Gpeak: number,
  E_low: number,
  E_high: number
): OrbitType {
  const isHighG = Gpeak >= 3;
  const isLowG = Gpeak <= 2;
  const isHighE = E >= E_high;
  const isLowE = E <= E_low;
  
  if (isHighG && isLowE) return 'comet';
  if (isHighE && isLowG) return 'planet';
  if (isHighE && isHighG) return 'spiky_planet';
  return 'drift';
}

// ============================================================================
// Default Parameter Presets
// ============================================================================

/**
 * Default potential parameters (stable, non-extreme values)
 */
export const DEFAULT_PHI_PARAMS: PhiParams = {
  w: [1.0, 1.2, 1.1, 0.8, 1.5, 2.0, 0.8, 0.9],
  alpha: [5, 5, 5, 5, 5, 5, 5, 5],
  mu: [0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5],
  w_mp: 2.0,
  w_to: 1.5,
  C_cliff: 5.0,
  theta_legal: 0.8,
  q: 2,
};

/**
 * Default agent parameters for standard organization
 */
export const DEFAULT_AGENT_PARAMS: AgentParams = {
  // Capacity
  c0: 0.25,
  c1: 1.0,
  c2: 0.5,
  tau: 7, // days (org-default); use tau=1 for small team, tau=0.25 for emergency
  
  // Harm
  G0: 1.0,
  p: 2.0,
  alpha: 1.0,
  beta: 5.0,
  theta6: 0.8,
  r: 3,
  
  // Zeta
  lambda1: 0.2,
  lambda2: 0.5,
  s: 2,
};

/**
 * Emergency mode agent parameters (faster response, lower tolerance)
 */
export const EMERGENCY_AGENT_PARAMS: AgentParams = {
  ...DEFAULT_AGENT_PARAMS,
  tau: 0.25, // quarter-day response time
  G0: 0.5,   // lower threshold for harm
  alpha: 2.0, // higher harm sensitivity
};

/**
 * Small team agent parameters (faster response than org default)
 */
export const SMALL_TEAM_AGENT_PARAMS: AgentParams = {
  ...DEFAULT_AGENT_PARAMS,
  tau: 1, // one-day response time
};
