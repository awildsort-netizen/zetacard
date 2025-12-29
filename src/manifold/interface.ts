/**
 * ζ-Card: Interface Lagrangian (ζ.card.manifold.interface)
 *
 * Implements the "Uncharged Dissipative Battery" interface Lagrangian:
 * 
 * L_Σ = σ h_ab K_ab + η(D_a u^a)² + ζ σ_ab σ^ab + T_Σ s D_a(su^a)
 * 
 * Components:
 * - Surface tension: σ h_ab K_ab (geometric term)
 * - Bulk viscosity: η(D_a u^a)² (expansion damping)
 * - Shear viscosity: ζ σ_ab σ^ab (shear damping)
 * - Entropy production: T_Σ s D_a(su^a) (dissipation)
 * 
 * Key feature: No gauge field, no coherent work channel.
 * Energy enters as heat, increases entropy, leaves only as thermal radiation.
 */

import type {
  Metric,
  Vec,
  Tensor,
  ExtrinsicCurvature,
  ShearRate,
  ViscosityCoefficients,
  EnergyFlux,
  InterfaceLagrangianParams,
  InterfaceMembraneState
} from './types';
import {
  metricInverse,
  contractIndices,
  extrinsicCurvatureTrace,
  lowerIndex,
  raiseIndex
} from './geometry';

/**
 * Compute expansion scalar θ = D_a u^a (divergence of flow)
 * 
 * For a discrete approximation, θ ≈ ∂_a u^a
 * In practice, computed from velocity field divergence
 */
export function expansionScalar(
  flowVector: Vec,
  flowDerivative: number[][],
  h: Metric
): number {
  const hInv = metricInverse(h);
  let theta = 0;
  
  const dim = flowVector.length;
  for (let a = 0; a < dim; a++) {
    for (let b = 0; b < dim; b++) {
      theta += hInv[a][b] * flowDerivative[a][b];
    }
  }
  
  return theta;
}

/**
 * Compute shear rate tensor σ_ab = D_a u_b + D_b u_a - h_ab D_c u^c
 * 
 * This is the traceless part of the strain rate
 */
export function shearRateTensor(
  flowVector: Vec,
  flowDerivative: number[][],
  h: Metric
): ShearRate {
  const dim = h.length;
  const hInv = metricInverse(h);
  
  // Compute expansion θ = D_c u^c
  const theta = expansionScalar(flowVector, flowDerivative, h);
  
  // Lower flow indices
  const flowLower = lowerIndex(flowVector, h);
  
  // Compute σ_ab
  const sigma: number[][] = Array(dim).fill(0).map(() => Array(dim).fill(0));
  
  for (let a = 0; a < dim; a++) {
    for (let b = 0; b < dim; b++) {
      // D_a u_b + D_b u_a
      sigma[a][b] = flowDerivative[a][b] + flowDerivative[b][a];
      
      // Subtract trace part: -h_ab θ
      sigma[a][b] -= h[a][b] * theta;
    }
  }
  
  // Compute magnitude σ^ab σ_ab
  let magnitude = 0;
  for (let a = 0; a < dim; a++) {
    for (let b = 0; b < dim; b++) {
      for (let c = 0; c < dim; c++) {
        for (let d = 0; d < dim; d++) {
          magnitude += hInv[a][c] * hInv[b][d] * sigma[a][b] * sigma[c][d];
        }
      }
    }
  }
  
  return {
    tensor: sigma,
    magnitude
  };
}

/**
 * Surface tension term: σ h_ab K_ab
 * 
 * This is the mean curvature coupling
 */
export function surfaceTensionTerm(
  sigma: number,
  K: ExtrinsicCurvature,
  h: Metric
): number {
  const trace = contractIndices(K, h);
  return sigma * trace;
}

/**
 * Bulk viscosity term: η(D_a u^a)²
 * 
 * Damps expansion/compression of the membrane
 */
export function bulkViscosityTerm(
  eta: number,
  theta: number
): number {
  return eta * theta * theta;
}

/**
 * Shear viscosity term: ζ σ_ab σ^ab
 * 
 * Damps shear flows on the membrane
 */
export function shearViscosityTerm(
  zeta: number,
  shearMagnitude: number
): number {
  return zeta * shearMagnitude;
}

/**
 * Entropy production term: T_Σ s D_a(su^a)
 * 
 * Represents irreversible entropy generation
 */
export function entropyProductionTerm(
  temperature: number,
  entropy: number,
  entropyFluxDivergence: number
): number {
  return temperature * entropy * entropyFluxDivergence;
}

/**
 * Total interface Lagrangian L_Σ
 * 
 * L_Σ = σ h_ab K_ab + η(D_a u^a)² + ζ σ_ab σ^ab + T_Σ s D_a(su^a)
 */
export function interfaceLagrangian(
  params: InterfaceLagrangianParams,
  state: InterfaceMembraneState,
  theta: number,
  shear: ShearRate,
  entropyFluxDiv: number
): number {
  const surfaceTerm = surfaceTensionTerm(
    params.surfaceTension,
    state.extrinsicCurvature,
    state.inducedMetric
  );
  
  const bulkVisc = bulkViscosityTerm(params.viscosity.eta, theta);
  const shearVisc = shearViscosityTerm(params.viscosity.zeta, shear.magnitude);
  const entropyProd = entropyProductionTerm(
    state.temperature,
    state.entropy,
    entropyFluxDiv
  );
  
  return surfaceTerm + bulkVisc + shearVisc + entropyProd;
}

/**
 * Surface stress tensor S_ab from interface Lagrangian
 * 
 * S_ab = ∂L_Σ/∂h^ab
 * 
 * For the given Lagrangian:
 * S_ab = σ K_ab + (viscous contributions) + (entropy contributions)
 */
export function surfaceStressTensor(
  params: InterfaceLagrangianParams,
  state: InterfaceMembraneState,
  theta: number,
  shear: ShearRate
): Tensor {
  const dim = state.inducedMetric.length;
  const S: number[][] = Array(dim).fill(0).map(() => Array(dim).fill(0));
  const h = state.inducedMetric;
  const K = state.extrinsicCurvature;
  
  for (let a = 0; a < dim; a++) {
    for (let b = 0; b < dim; b++) {
      // Surface tension contribution: σ K_ab
      S[a][b] = params.surfaceTension * K[a][b];
      
      // Viscosity contributions (pressure-like terms)
      S[a][b] += (params.viscosity.eta * theta * theta 
                 + params.viscosity.zeta * shear.magnitude) * h[a][b];
    }
  }
  
  return S;
}

/**
 * Constitutive relation for membrane temperature
 * 
 * T_Σ = T_Σ(s, K, ρ_Σ)
 * 
 * Entropy generates temperature; curvature acts as "pressure"
 * 
 * Simple model: T_Σ = T_0 (1 + α s) (1 + β |K|)
 */
export function membraneTemperature(
  entropy: number,
  curvatureTrace: number,
  baseTemp: number = 1.0,
  entropyCoeff: number = 0.1,
  curvatureCoeff: number = 0.05
): number {
  return baseTemp * (1 + entropyCoeff * entropy) * (1 + curvatureCoeff * Math.abs(curvatureTrace));
}

/**
 * Entropy evolution equation (first law)
 * 
 * ṡ = (Φ_in - Φ_out)/T_Σ - |∇s|²/T_Σ²
 * 
 * Entropy increases from flux, dissipated by gradients
 * 
 * @param flux - Energy flux {incoming, outgoing, net}
 * @param temperature - Membrane temperature T_Σ
 * @param entropyGradient - Spatial gradient of entropy ∇s
 * @param h - Induced metric on membrane
 * @returns Rate of entropy change ṡ
 */
export function entropyEvolution(
  flux: EnergyFlux,
  temperature: number,
  entropyGradient: Vec,
  h: Metric
): number {
  if (temperature < 1e-12) {
    throw new Error('Temperature too close to zero for entropy evolution');
  }
  
  // First term: (Φ_in - Φ_out)/T_Σ
  const fluxTerm = flux.net / temperature;
  
  // Second term: -|∇s|²/T_Σ²
  const entropyGradLower = lowerIndex(entropyGradient, h);
  const gradSquared = entropyGradient.reduce(
    (sum, val, i) => sum + val * entropyGradLower[i], 
    0
  );
  const dissipationTerm = -gradSquared / (temperature * temperature);
  
  return fluxTerm + dissipationTerm;
}

/**
 * Compute energy flux from stress-energy tensor
 * 
 * Φ = T_μν n^μ u^ν
 * 
 * where n^μ is normal to membrane, u^ν is flow direction
 */
export function energyFluxFromStress(
  T: Tensor,
  normal: Vec,
  flow: Vec
): number {
  const n = normal.length;
  let flux = 0;
  
  for (let mu = 0; mu < n; mu++) {
    for (let nu = 0; nu < n; nu++) {
      flux += (T as number[][])[mu][nu] * normal[mu] * flow[nu];
    }
  }
  
  return flux;
}

/**
 * Compute Hawking-like thermal radiation from membrane
 * 
 * Φ_out = A T_Σ^4 (Stefan-Boltzmann-like)
 * 
 * @param temperature - Membrane temperature
 * @param area - Effective area element
 * @param coefficient - Radiation coefficient (like Stefan-Boltzmann constant)
 */
export function thermalRadiation(
  temperature: number,
  area: number,
  coefficient: number = 1.0
): number {
  return coefficient * area * Math.pow(temperature, 4);
}

/**
 * Update membrane state by one timestep using interface dynamics
 * 
 * Semi-implicit integration of:
 * - Entropy evolution
 * - Temperature update
 * - Flow field (simplified)
 */
export function updateMembraneState(
  state: InterfaceMembraneState,
  params: InterfaceLagrangianParams,
  flux: EnergyFlux,
  dt: number,
  entropyGradient?: Vec
): InterfaceMembraneState {
  // Default zero gradient if not provided
  const gradS = entropyGradient || Array(state.dimension).fill(0);
  
  // Compute entropy evolution
  const dSdt = entropyEvolution(flux, state.temperature, gradS, state.inducedMetric);
  
  // Update entropy
  const newEntropy = state.entropy + dSdt * dt;
  
  // Update temperature based on new entropy
  const K_trace = contractIndices(state.extrinsicCurvature, state.inducedMetric);
  const newTemperature = membraneTemperature(newEntropy, K_trace);
  
  // Return updated state
  return {
    ...state,
    entropy: Math.max(0, newEntropy), // Entropy cannot be negative
    temperature: newTemperature
  };
}
