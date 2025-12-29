/**
 * ζ-Card: Junction Conditions (ζ.card.manifold.junction)
 *
 * Implements Israel junction conditions at the interface Σ:
 * 
 * K_ab - K h_ab = 8π S_ab  (from physical side)
 * K̃_ab - K̃ h_ab = -8π S_ab (from shadow side, sign flip)
 * 
 * These ensure:
 * - Continuity of induced metric h_ab
 * - Jump in extrinsic curvature related to surface stress
 * - Energy-momentum conservation across the boundary
 */

import type {
  Metric,
  Tensor,
  ExtrinsicCurvature,
  JumpConditions,
  InterfaceMembraneState
} from './types';
import {
  extrinsicCurvatureTrace
} from './geometry';

/**
 * Compute jump in extrinsic curvature: [K_ab] = K_ab - K̃_ab
 */
export function curvatureJump(
  K_physical: ExtrinsicCurvature,
  K_shadow: ExtrinsicCurvature
): Tensor {
  const dim = K_physical.length;
  const jump: number[][] = Array(dim).fill(0).map(() => Array(dim).fill(0));
  
  for (let a = 0; a < dim; a++) {
    for (let b = 0; b < dim; b++) {
      jump[a][b] = K_physical[a][b] - K_shadow[a][b];
    }
  }
  
  return jump;
}

/**
 * Verify Israel junction condition
 * 
 * K_ab - K h_ab = 8π S_ab
 * 
 * @returns True if condition satisfied within tolerance
 */
export function verifyJunctionCondition(
  K: ExtrinsicCurvature,
  S: Tensor,
  h: Metric,
  tolerance: number = 1e-6
): boolean {
  const dim = K.length;
  const K_trace = extrinsicCurvatureTrace(K, h);
  
  for (let a = 0; a < dim; a++) {
    for (let b = 0; b < dim; b++) {
      const lhs = K[a][b] - K_trace * h[a][b];
      const rhs = 8 * Math.PI * (S as number[][])[a][b];
      
      if (Math.abs(lhs - rhs) > tolerance) {
        return false;
      }
    }
  }
  
  return true;
}

/**
 * Compute required surface stress from junction condition
 * 
 * Given K_ab and h_ab, solve for S_ab from:
 * K_ab - K h_ab = 8π S_ab
 * 
 * S_ab = (1/8π) [K_ab - K h_ab]
 */
export function surfaceStressFromJunction(
  K: ExtrinsicCurvature,
  h: Metric
): Tensor {
  const dim = K.length;
  const K_trace = extrinsicCurvatureTrace(K, h);
  const S: number[][] = Array(dim).fill(0).map(() => Array(dim).fill(0));
  
  for (let a = 0; a < dim; a++) {
    for (let b = 0; b < dim; b++) {
      S[a][b] = (K[a][b] - K_trace * h[a][b]) / (8 * Math.PI);
    }
  }
  
  return S;
}

/**
 * Compute jump conditions for both sides
 * 
 * Physical: K_ab - K h_ab = 8π S_ab
 * Shadow: K̃_ab - K̃ h_ab = -8π S_ab (note sign flip)
 * 
 * This ensures energy flows from physical to shadow
 */
export function computeJumpConditions(
  state: InterfaceMembraneState,
  tolerance: number = 1e-6
): JumpConditions {
  const h = state.inducedMetric;
  const K_phys = state.extrinsicCurvature;
  const K_shadow = state.shadowExtrinsicCurvature;
  const S = state.surfaceStress;
  
  // Compute jumps
  const jump = curvatureJump(K_phys, K_shadow);
  const K_phys_trace = extrinsicCurvatureTrace(K_phys, h);
  const K_shadow_trace = extrinsicCurvatureTrace(K_shadow, h);
  const traceJump = K_phys_trace - K_shadow_trace;
  
  // Verify both conditions
  const physicalSatisfied = verifyJunctionCondition(K_phys, S, h, tolerance);
  
  // For shadow side, check K̃_ab - K̃ h_ab = -8π S_ab
  const dim = K_shadow.length;
  let shadowSatisfied = true;
  for (let a = 0; a < dim; a++) {
    for (let b = 0; b < dim; b++) {
      const lhs = K_shadow[a][b] - K_shadow_trace * h[a][b];
      const rhs = -8 * Math.PI * (S as number[][])[a][b];
      
      if (Math.abs(lhs - rhs) > tolerance) {
        shadowSatisfied = false;
        break;
      }
    }
    if (!shadowSatisfied) break;
  }
  
  return {
    curvatureJump: jump,
    traceJump,
    satisfied: physicalSatisfied && shadowSatisfied
  };
}

/**
 * Project stress tensor onto membrane
 * 
 * S^a_b = T^μ_ν e^a_μ e_b^ν
 * 
 * where e^a_μ are tangent vectors to Σ
 */
export function projectStressToMembrane(
  T: Tensor,
  tangents: number[][]
): Tensor {
  const dim = tangents.length;
  const spacetimeDim = tangents[0].length;
  const S: number[][] = Array(dim).fill(0).map(() => Array(dim).fill(0));
  
  for (let a = 0; a < dim; a++) {
    for (let b = 0; b < dim; b++) {
      let sum = 0;
      for (let mu = 0; mu < spacetimeDim; mu++) {
        for (let nu = 0; nu < spacetimeDim; nu++) {
          sum += (T as number[][])[mu][nu] * tangents[a][mu] * tangents[b][nu];
        }
      }
      S[a][b] = sum;
    }
  }
  
  return S;
}

/**
 * Compute normal stress (energy density seen by membrane)
 * 
 * ρ_Σ = T_μν n^μ n^ν
 */
export function normalStress(
  T: Tensor,
  normal: number[]
): number {
  const n = normal.length;
  let rho = 0;
  
  for (let mu = 0; mu < n; mu++) {
    for (let nu = 0; nu < n; nu++) {
      rho += (T as number[][])[mu][nu] * normal[mu] * normal[nu];
    }
  }
  
  return rho;
}

/**
 * Compute stress difference across membrane
 * 
 * Δρ = T_μν n^μ n^ν - T̃_μν ñ^μ ñ^ν
 * 
 * This drives the Raychaudhuri equation for expansion
 */
export function stressDifference(
  T_physical: Tensor,
  T_shadow: Tensor,
  normal_physical: number[],
  normal_shadow: number[]
): number {
  const rho_phys = normalStress(T_physical, normal_physical);
  const rho_shadow = normalStress(T_shadow, normal_shadow);
  
  return rho_phys - rho_shadow;
}
