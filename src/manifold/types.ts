/**
 * ζ-Card: Two-Manifold Structure Types (ζ.card.manifold.types)
 *
 * Type definitions for the two-manifold system:
 * - Physical manifold M (agent state, observable motion)
 * - Shadow manifold M̃ (institutional configuration, field structure)
 * - Interface membrane Σ (3D boundary coupling both manifolds)
 *
 * Mathematical framework based on:
 * - Riemannian geometry (metrics, curvature)
 * - Israel junction conditions (jump conditions at boundaries)
 * - Dissipative membrane dynamics (entropy, viscosity)
 */

/**
 * Vector in N-dimensional space
 */
export type Vec = number[];

/**
 * Metric tensor g_μν as a symmetric matrix
 * For n-dimensional space, this is an n×n matrix
 */
export type Metric = number[][];

/**
 * Coordinates in spacetime or space
 */
export type Coordinates = number[];

/**
 * Tensor of rank (p,q) represented as nested arrays
 * Rank-2 tensor: T^μ_ν is a 2D array
 */
export type Tensor = number[][] | number[][][] | number[][][][];

/**
 * Stress-energy tensor T^μν
 */
export type StressEnergyTensor = number[][];

/**
 * Extrinsic curvature tensor K_ab on a hypersurface
 */
export type ExtrinsicCurvature = number[][];

/**
 * Physical manifold state (M)
 * Represents actual agent state and observable motion
 */
export interface PhysicalManifold {
  /** Spacetime metric g_μν */
  metric: Metric;
  
  /** Current coordinates x^μ */
  coords: Coordinates;
  
  /** Matter/field content (stress-energy) */
  matter: StressEnergyTensor;
  
  /** Dimensionality (e.g., 4 for 3+1D spacetime) */
  dimension: number;
}

/**
 * Shadow manifold state (M̃)
 * Represents institutional configuration and field structure
 */
export interface ShadowManifold {
  /** Shadow metric g̃_μν */
  metric: Metric;
  
  /** Shadow coordinates */
  coords: Coordinates;
  
  /** Shadow field content */
  matter: StressEnergyTensor;
  
  /** Dimensionality (same as physical) */
  dimension: number;
  
  /** Institutional potential field Φ(n) */
  potential?: (coords: Coordinates) => number;
  
  /** Field stiffness κ = |∇²Φ| */
  stiffness?: number;
}

/**
 * Interface membrane state (Σ)
 * 3D hypersurface coupling physical and shadow manifolds
 */
export interface InterfaceMembraneState {
  /** Induced metric h_ab on the membrane */
  inducedMetric: Metric;
  
  /** Extrinsic curvature K_ab from physical side */
  extrinsicCurvature: ExtrinsicCurvature;
  
  /** Extrinsic curvature K̃_ab from shadow side */
  shadowExtrinsicCurvature: ExtrinsicCurvature;
  
  /** Entropy density s on membrane */
  entropy: number;
  
  /** Temperature T_Σ of membrane */
  temperature: number;
  
  /** Timelike unit tangent u^a (flow direction) */
  flowVector: Vec;
  
  /** Surface stress-energy S_ab */
  surfaceStress: Tensor;
  
  /** Embedding coordinates (position in spacetime) */
  embedding: Coordinates;
  
  /** Dimensionality (3 for 3D membrane) */
  dimension: number;
}

/**
 * Shear rate tensor σ_ab = D_a u_b + D_b u_a - h_ab D_c u^c
 */
export interface ShearRate {
  tensor: Tensor;
  magnitude: number; // σ^ab σ_ab
}

/**
 * Transport coefficients for viscosity
 */
export interface ViscosityCoefficients {
  /** Bulk viscosity η */
  eta: number;
  
  /** Shear viscosity ζ */
  zeta: number;
}

/**
 * Energy fluxes at the membrane
 */
export interface EnergyFlux {
  /** Incoming flux from physical side Φ_in */
  incoming: number;
  
  /** Outgoing flux (radiation) Φ_out */
  outgoing: number;
  
  /** Net flux into membrane */
  net: number;
}

/**
 * Parameters for interface Lagrangian L_Σ
 */
export interface InterfaceLagrangianParams {
  /** Surface tension σ */
  surfaceTension: number;
  
  /** Viscosity coefficients */
  viscosity: ViscosityCoefficients;
}

/**
 * Complete two-manifold system state
 */
export interface TwoManifoldSystem {
  /** Physical manifold M */
  physical: PhysicalManifold;
  
  /** Shadow manifold M̃ */
  shadow: ShadowManifold;
  
  /** Interface membrane Σ */
  interface: InterfaceMembraneState;
  
  /** Lagrangian parameters */
  params: InterfaceLagrangianParams;
  
  /** Current time coordinate */
  time: number;
}

/**
 * Normal vector to the membrane (pointing from physical to shadow)
 */
export interface NormalVector {
  /** Normal vector n^μ from physical side */
  physical: Vec;
  
  /** Normal vector ñ^μ from shadow side */
  shadow: Vec;
  
  /** Whether these are unit normals */
  normalized: boolean;
}

/**
 * Tangent basis vectors on the membrane
 */
export interface TangentBasis {
  /** Tangent vectors e_a^μ (a = 0,1,2 for 3D membrane) */
  vectors: Vec[];
  
  /** Whether the basis is orthonormal */
  orthonormal: boolean;
}

/**
 * Jump conditions at the interface (Israel junction conditions)
 */
export interface JumpConditions {
  /** [K_ab] = K_ab - K̃_ab = 8π S_ab */
  curvatureJump: Tensor;
  
  /** Trace: K - K̃ = 8π S */
  traceJump: number;
  
  /** Validity check */
  satisfied: boolean;
}

/**
 * Conservation check (Bianchi identity)
 */
export interface ConservationCheck {
  /** ∇_μ T^μν from physical bulk */
  physicalDivergence: Vec;
  
  /** ∇̃_μ T̃^μν from shadow bulk */
  shadowDivergence: Vec;
  
  /** D_a S^aν from interface */
  interfaceDivergence: Vec;
  
  /** Total sum (should be zero) */
  total: Vec;
  
  /** Whether conservation is satisfied (|total| < ε) */
  conserved: boolean;
  
  /** Tolerance for conservation check */
  epsilon: number;
}

/**
 * Orbit classification for spectral signature
 */
export type OrbitType = 'comet' | 'planet' | 'spiky_planet' | 'drift';

/**
 * Spectral signature from curvature analysis
 */
export interface SpectralSignature {
  /** FFT of log(K_ab K^ab(t)) */
  spectrum: number[];
  
  /** Frequencies */
  frequencies: number[];
  
  /** Peak frequency (dominant mode) */
  peakFrequency: number;
  
  /** Orbit classification */
  orbitType: OrbitType;
  
  /** Coercion indicator (high frequency spikes) */
  coercionScore: number;
}
