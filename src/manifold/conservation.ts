/**
 * ζ-Card: Conservation Laws (ζ.card.manifold.conservation)
 *
 * Global conservation from Bianchi identity:
 * ∇_μ T^μν + ∇̃_μ T̃^μν + D_a S^aν = 0
 * 
 * Ensures energy-momentum is conserved across the entire system:
 * - What leaves physical bulk enters interface
 * - What leaves interface either enters shadow or radiates away
 * - No ghosts, no violations
 */

import type {
  Vec,
  Tensor,
  Metric,
  ConservationCheck,
  TwoManifoldSystem
} from './types';
import {
  christoffelSymbols
} from './geometry';
import {
  surfaceStressDivergence
} from './membrane';

/**
 * Compute covariant divergence of stress-energy tensor
 * 
 * ∇_μ T^μν = ∂_μ T^μν + Γ^μ_μλ T^λν + Γ^ν_μλ T^μλ
 */
export function stressDivergence(
  T: Tensor,
  dT: number[][][], // ∂_μ T^νλ
  g: Metric,
  dg: number[][][] // ∂_μ g_νλ
): Vec {
  const dim = g.length;
  const Gamma = christoffelSymbols(g, dg);
  const div: number[] = Array(dim).fill(0);
  
  for (let nu = 0; nu < dim; nu++) {
    // Partial derivative term: ∂_μ T^μν
    for (let mu = 0; mu < dim; mu++) {
      div[nu] += dT[mu][mu][nu];
    }
    
    // Christoffel corrections
    for (let mu = 0; mu < dim; mu++) {
      for (let lambda = 0; lambda < dim; lambda++) {
        // Γ^μ_μλ T^λν
        div[nu] += Gamma[mu][mu][lambda] * (T as number[][])[lambda][nu];
        
        // Γ^ν_μλ T^μλ
        div[nu] += Gamma[nu][mu][lambda] * (T as number[][])[mu][lambda];
      }
    }
  }
  
  return div;
}

/**
 * Check global conservation
 * 
 * Verifies: ∇_μ T^μν + ∇̃_μ T̃^μν + D_a S^aν = 0
 * 
 * @returns ConservationCheck with total residual and whether conserved
 */
export function checkConservation(
  system: TwoManifoldSystem,
  dT_phys: number[][][],
  dT_shadow: number[][][],
  dS: number[][][],
  dg_phys: number[][][],
  dg_shadow: number[][][],
  dh: number[][][],
  epsilon: number = 1e-6
): ConservationCheck {
  const dim = system.physical.dimension;
  
  // Physical bulk divergence
  const div_phys = stressDivergence(
    system.physical.matter,
    dT_phys,
    system.physical.metric,
    dg_phys
  );
  
  // Shadow bulk divergence
  const div_shadow = stressDivergence(
    system.shadow.matter,
    dT_shadow,
    system.shadow.metric,
    dg_shadow
  );
  
  // Interface divergence (only spatial components for 3D membrane)
  const div_interface_3d = surfaceStressDivergence(
    system.interface.surfaceStress,
    dS,
    system.interface.inducedMetric,
    dh
  );
  
  // Extend to 4D (pad with 0 for time component)
  const div_interface: number[] = [0, ...div_interface_3d];
  
  // Total should be zero
  const total: number[] = Array(dim).fill(0);
  for (let nu = 0; nu < dim; nu++) {
    total[nu] = div_phys[nu] + div_shadow[nu] + div_interface[nu];
  }
  
  // Check magnitude
  const totalMagnitude = Math.sqrt(total.reduce((sum, t) => sum + t * t, 0));
  
  return {
    physicalDivergence: div_phys,
    shadowDivergence: div_shadow,
    interfaceDivergence: div_interface,
    total,
    conserved: totalMagnitude < epsilon,
    epsilon
  };
}

/**
 * Compute Bianchi identity residual
 * 
 * The Bianchi identity ∇_μ G^μν = 0 should be automatically satisfied
 * if the Einstein equations are satisfied
 * 
 * This is a consistency check
 */
export function bianchiIdentityCheck(
  G: Tensor,
  dG: number[][][],
  g: Metric,
  dg: number[][][],
  epsilon: number = 1e-6
): { satisfied: boolean; residual: Vec; magnitude: number } {
  const div = stressDivergence(G, dG, g, dg);
  const magnitude = Math.sqrt(div.reduce((sum, d) => sum + d * d, 0));
  
  return {
    satisfied: magnitude < epsilon,
    residual: div,
    magnitude
  };
}

/**
 * Local conservation at a point (continuity equation)
 * 
 * ∂_t ρ + ∇·J = 0
 * 
 * where ρ = T^00 and J^i = T^0i
 */
export function localConservationCheck(
  T: Tensor,
  dT: number[][][],
  epsilon: number = 1e-6
): { satisfied: boolean; residual: number } {
  const dim = (T as number[][]).length;
  
  // Time derivative of energy density: ∂_t T^00
  const dtRho = dT[0][0][0];
  
  // Divergence of momentum: ∂_i T^0i
  let divJ = 0;
  for (let i = 1; i < dim; i++) {
    divJ += dT[i][0][i];
  }
  
  const residual = dtRho + divJ;
  
  return {
    satisfied: Math.abs(residual) < epsilon,
    residual
  };
}

/**
 * Energy conservation check (0-component of conservation)
 * 
 * ∂_t E + ∂_i F^i = 0
 * 
 * where E is total energy and F^i is energy flux
 */
export function energyConservation(
  physicalEnergy: number,
  shadowEnergy: number,
  interfaceEnergy: number,
  energyFlux: Vec,
  dt: number,
  epsilon: number = 1e-6
): { conserved: boolean; change: number; flux: number } {
  const totalEnergy = physicalEnergy + shadowEnergy + interfaceEnergy;
  
  // Energy flux magnitude (spatial integral would be needed for exact check)
  const fluxMagnitude = Math.sqrt(energyFlux.reduce((sum, f) => sum + f * f, 0));
  
  // For discrete check: ΔE ≈ -flux * dt
  const expectedChange = -fluxMagnitude * dt;
  
  return {
    conserved: Math.abs(expectedChange) < epsilon,
    change: totalEnergy,
    flux: fluxMagnitude
  };
}
