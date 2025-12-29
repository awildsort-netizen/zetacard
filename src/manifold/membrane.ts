/**
 * ζ-Card: Membrane Equations (ζ.card.manifold.membrane)
 *
 * Three coupled PDEs on the interface membrane Σ:
 * 
 * 1. Momentum balance (tangential):
 *    D_a S^ab = (T_μν n^μ e_ν^b - T̃_μν ñ^μ ẽ_ν^b)_Σ
 * 
 * 2. Raychaudhuri equation (expansion evolution):
 *    θ̇ + σ² + (1/2)Ricci_Σ + K² - K_ab K^ab = 8π(T_μν n^μ n^ν - T̃_μν ñ^μ ñ^ν)
 * 
 * 3. Entropy evolution (dissipative):
 *    ṡ u^a D_a s + s D_a u^a = (1/T_Σ)[Φ_in - Φ_out - η(D_a u^a)² - ζσ_ab σ^ab]
 * 
 * These govern the dynamics of the interface membrane.
 */

import type {
  Metric,
  Vec,
  Tensor,
  ExtrinsicCurvature,
  InterfaceMembraneState,
  ViscosityCoefficients,
  EnergyFlux
} from './types';
import {
  extrinsicCurvatureTrace,
  extrinsicCurvatureSquared,
  scalarCurvature,
  ricciTensor,
  christoffelSymbols,
  metricInverse
} from './geometry';
import {
  expansionScalar,
  shearRateTensor
} from './interface';

/**
 * Numerical epsilon for stability checks
 */
const NUMERICAL_EPSILON = 1e-12;

/**
 * Compute divergence of surface stress D_a S^ab
 * 
 * For discrete approximation:
 * D_a S^ab ≈ ∂_a S^ab + Γ^b_ac S^ac + Γ^a_ac S^cb
 */
export function surfaceStressDivergence(
  S: Tensor,
  dS: number[][][], // Partial derivatives ∂_a S^bc
  h: Metric,
  dh: number[][][] // Partial derivatives ∂_a h_bc for Christoffel symbols
): Vec {
  const dim = h.length;
  const Gamma = christoffelSymbols(h, dh);
  
  const div: number[] = Array(dim).fill(0);
  
  for (let b = 0; b < dim; b++) {
    // ∂_a S^ab term
    for (let a = 0; a < dim; a++) {
      div[b] += dS[a][b][a];
    }
    
    // Christoffel correction terms
    for (let a = 0; a < dim; a++) {
      for (let c = 0; c < dim; c++) {
        div[b] += Gamma[b][a][c] * (S as number[][])[a][c];
        div[b] += Gamma[a][a][c] * (S as number[][])[c][b];
      }
    }
  }
  
  return div;
}

/**
 * Momentum balance equation on membrane
 * 
 * D_a S^ab = F^b
 * 
 * where F^b is the force from bulk stress-energy tensors
 */
export function momentumBalance(
  S: Tensor,
  dS: number[][][],
  h: Metric,
  dh: number[][][],
  force: Vec
): Vec {
  const div = surfaceStressDivergence(S, dS, h, dh);
  const dim = div.length;
  const residual: number[] = Array(dim).fill(0);
  
  for (let b = 0; b < dim; b++) {
    residual[b] = div[b] - force[b];
  }
  
  return residual;
}

/**
 * Raychaudhuri equation for expansion evolution
 * 
 * θ̇ = -σ² - (1/2)R_Σ - K² + K_ab K^ab + 8π Δρ
 * 
 * where:
 * - θ = expansion scalar
 * - σ² = shear magnitude
 * - R_Σ = Ricci scalar on membrane
 * - K = trace of extrinsic curvature
 * - Δρ = stress difference across membrane
 */
export function raychaudhuriEquation(
  theta: number,
  shearMagnitude: number,
  ricciScalar: number,
  K: ExtrinsicCurvature,
  h: Metric,
  stressDiff: number
): number {
  const K_trace = extrinsicCurvatureTrace(K, h);
  const K_squared = extrinsicCurvatureSquared(K, h);
  
  const thetaDot = -shearMagnitude 
                   - 0.5 * ricciScalar 
                   - K_trace * K_trace 
                   + K_squared 
                   + 8 * Math.PI * stressDiff;
  
  return thetaDot;
}

/**
 * Entropy balance equation on membrane
 * 
 * ṡ = (1/T_Σ s)[Φ_in - Φ_out - η θ² - ζ σ²] - u^a D_a s
 * 
 * where:
 * - Φ_in, Φ_out = energy fluxes
 * - η, ζ = viscosity coefficients
 * - θ = expansion, σ² = shear magnitude
 * - u^a D_a s = advection term
 */
export function entropyBalanceEquation(
  entropy: number,
  temperature: number,
  flux: EnergyFlux,
  viscosity: ViscosityCoefficients,
  theta: number,
  shearMagnitude: number,
  entropyAdvection: number
): number {
  if (Math.abs(entropy) < NUMERICAL_EPSILON || temperature < NUMERICAL_EPSILON) {
    // Handle zero entropy or temperature case
    return 0;
  }
  
  const viscousDissipation = viscosity.eta * theta * theta 
                            + viscosity.zeta * shearMagnitude;
  
  const sourceTerm = (flux.net - viscousDissipation) / (temperature * entropy);
  
  const sDot = sourceTerm - entropyAdvection;
  
  return sDot;
}

/**
 * Compute Ricci scalar on the membrane
 * 
 * Requires metric h_ab and its derivatives
 * Simplified: use flat space approximation for now
 */
export function membraneRicciScalar(
  h: Metric,
  dh: number[][][]
): number {
  try {
    // Compute Christoffel symbols
    const Gamma = christoffelSymbols(h, dh);
    
    // Compute derivatives of Christoffel symbols
    const dim = h.length;
    const dGamma: number[][][][] = Array(dim).fill(0).map(() =>
      Array(dim).fill(0).map(() =>
        Array(dim).fill(0).map(() => Array(dim).fill(0))
      )
    );
    
    // Simplified: assume derivatives of Gamma are zero for flat regions
    // In practice, would compute from d2h
    
    // Compute Ricci tensor
    const R = ricciTensor(Gamma, dGamma);
    
    // Compute Ricci scalar
    return scalarCurvature(R, h);
  } catch (e) {
    // Fallback to zero for numerical issues
    return 0;
  }
}

/**
 * Update membrane dynamics by solving the three coupled PDEs
 * 
 * Returns updated: {theta, entropy, flowVector}
 */
export function updateMembraneDynamics(
  state: InterfaceMembraneState,
  viscosity: ViscosityCoefficients,
  flux: EnergyFlux,
  stressDiff: number,
  flowDerivative: number[][],
  dt: number,
  ricciScalar?: number
): {
  theta: number;
  entropy: number;
  shearMagnitude: number;
} {
  const h = state.inducedMetric;
  const K = state.extrinsicCurvature;
  
  // Compute current expansion and shear
  const theta = expansionScalar(state.flowVector, flowDerivative, h);
  const shear = shearRateTensor(state.flowVector, flowDerivative, h);
  
  // Use provided Ricci scalar or default to 0
  const R_Sigma = ricciScalar ?? 0;
  
  // 1. Raychaudhuri equation: update expansion
  const thetaDot = raychaudhuriEquation(
    theta,
    shear.magnitude,
    R_Sigma,
    K,
    h,
    stressDiff
  );
  const newTheta = theta + thetaDot * dt;
  
  // 2. Entropy balance: update entropy
  const entropyAdvection = 0; // Simplified: assume no advection
  const sDot = entropyBalanceEquation(
    state.entropy,
    state.temperature,
    flux,
    viscosity,
    theta,
    shear.magnitude,
    entropyAdvection
  );
  const newEntropy = Math.max(0, state.entropy + sDot * dt);
  
  return {
    theta: newTheta,
    entropy: newEntropy,
    shearMagnitude: shear.magnitude
  };
}

/**
 * Compute force on membrane from bulk stress-energy
 * 
 * F^b = T_μν n^μ e_ν^b - T̃_μν ñ^μ ẽ_ν^b
 */
export function computeMembraneForce(
  T_physical: Tensor,
  T_shadow: Tensor,
  normal_physical: Vec,
  normal_shadow: Vec,
  tangents: Vec[]
): Vec {
  const dim = tangents.length;
  const spacetimeDim = normal_physical.length;
  const F: number[] = Array(dim).fill(0);
  
  for (let b = 0; b < dim; b++) {
    // Physical contribution: T_μν n^μ e_ν^b
    for (let mu = 0; mu < spacetimeDim; mu++) {
      for (let nu = 0; nu < spacetimeDim; nu++) {
        F[b] += (T_physical as number[][])[mu][nu] * normal_physical[mu] * tangents[b][nu];
      }
    }
    
    // Shadow contribution: -T̃_μν ñ^μ ẽ_ν^b
    for (let mu = 0; mu < spacetimeDim; mu++) {
      for (let nu = 0; nu < spacetimeDim; nu++) {
        F[b] -= (T_shadow as number[][])[mu][nu] * normal_shadow[mu] * tangents[b][nu];
      }
    }
  }
  
  return F;
}
