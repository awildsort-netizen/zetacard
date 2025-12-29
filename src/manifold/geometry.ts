/**
 * ζ-Card: Manifold Geometry Operations (ζ.card.manifold.geometry)
 *
 * Core geometric operations for Riemannian manifolds:
 * - Metric operations (inverse, determinant, signature)
 * - Christoffel symbols and covariant derivatives
 * - Curvature tensors (Riemann, Ricci, scalar curvature)
 * - Extrinsic curvature for embedded hypersurfaces
 */

import type { Metric, Tensor, Vec, ExtrinsicCurvature } from './types';

/**
 * Compute determinant of a metric tensor
 * Uses LU decomposition for numerical stability
 */
export function metricDeterminant(g: Metric): number {
  const n = g.length;
  if (n === 0) return 1;
  
  // Create copy for LU decomposition
  const A = g.map(row => [...row]);
  let det = 1;
  
  for (let i = 0; i < n; i++) {
    // Partial pivoting
    let maxRow = i;
    for (let k = i + 1; k < n; k++) {
      if (Math.abs(A[k][i]) > Math.abs(A[maxRow][i])) {
        maxRow = k;
      }
    }
    
    if (maxRow !== i) {
      [A[i], A[maxRow]] = [A[maxRow], A[i]];
      det *= -1;
    }
    
    if (Math.abs(A[i][i]) < 1e-12) {
      return 0; // Singular matrix
    }
    
    det *= A[i][i];
    
    // Eliminate below
    for (let k = i + 1; k < n; k++) {
      const factor = A[k][i] / A[i][i];
      for (let j = i; j < n; j++) {
        A[k][j] -= factor * A[i][j];
      }
    }
  }
  
  return det;
}

/**
 * Compute inverse of a metric tensor g^μν from g_μν
 * Uses Gauss-Jordan elimination
 */
export function metricInverse(g: Metric): Metric {
  const n = g.length;
  const A = g.map((row, i) => [...row, ...Array(n).fill(0).map((_, j) => i === j ? 1 : 0)]);
  
  // Forward elimination with partial pivoting
  for (let i = 0; i < n; i++) {
    // Find pivot
    let maxRow = i;
    for (let k = i + 1; k < n; k++) {
      if (Math.abs(A[k][i]) > Math.abs(A[maxRow][i])) {
        maxRow = k;
      }
    }
    
    [A[i], A[maxRow]] = [A[maxRow], A[i]];
    
    if (Math.abs(A[i][i]) < 1e-12) {
      throw new Error('Metric is singular and cannot be inverted');
    }
    
    // Scale pivot row
    const pivot = A[i][i];
    for (let j = 0; j < 2 * n; j++) {
      A[i][j] /= pivot;
    }
    
    // Eliminate column
    for (let k = 0; k < n; k++) {
      if (k !== i) {
        const factor = A[k][i];
        for (let j = 0; j < 2 * n; j++) {
          A[k][j] -= factor * A[i][j];
        }
      }
    }
  }
  
  // Extract inverse from augmented matrix
  return A.map(row => row.slice(n));
}

/**
 * Raise index using metric: v^μ = g^μν v_ν
 */
export function raiseIndex(v: Vec, gInv: Metric): Vec {
  const n = v.length;
  const result = Array(n).fill(0);
  
  for (let mu = 0; mu < n; mu++) {
    for (let nu = 0; nu < n; nu++) {
      result[mu] += gInv[mu][nu] * v[nu];
    }
  }
  
  return result;
}

/**
 * Lower index using metric: v_μ = g_μν v^ν
 */
export function lowerIndex(v: Vec, g: Metric): Vec {
  const n = v.length;
  const result = Array(n).fill(0);
  
  for (let mu = 0; mu < n; mu++) {
    for (let nu = 0; nu < n; nu++) {
      result[mu] += g[mu][nu] * v[nu];
    }
  }
  
  return result;
}

/**
 * Contract two indices: T^μ_μ = g^μν T_μν
 */
export function contractIndices(T: Tensor, g: Metric): number {
  if (!Array.isArray(T) || !Array.isArray(T[0])) {
    throw new Error('Tensor must be at least rank 2 for contraction');
  }
  
  const n = g.length;
  const gInv = metricInverse(g);
  let trace = 0;
  
  for (let mu = 0; mu < n; mu++) {
    for (let nu = 0; nu < n; nu++) {
      trace += gInv[mu][nu] * (T as number[][])[mu][nu];
    }
  }
  
  return trace;
}

/**
 * Compute Christoffel symbols Γ^λ_μν = (1/2) g^λσ (∂_μ g_νσ + ∂_ν g_μσ - ∂_σ g_μν)
 * 
 * @param g - Metric tensor g_μν
 * @param dg - Partial derivatives ∂_μ g_νσ (3D array: [μ][ν][σ])
 * @returns Christoffel symbols as 3D array Γ^λ_μν
 */
export function christoffelSymbols(g: Metric, dg: number[][][]): number[][][] {
  const n = g.length;
  const gInv = metricInverse(g);
  const Gamma: number[][][] = Array(n).fill(0).map(() => 
    Array(n).fill(0).map(() => Array(n).fill(0))
  );
  
  for (let lambda = 0; lambda < n; lambda++) {
    for (let mu = 0; mu < n; mu++) {
      for (let nu = 0; nu < n; nu++) {
        let sum = 0;
        for (let sigma = 0; sigma < n; sigma++) {
          sum += gInv[lambda][sigma] * (
            dg[mu][nu][sigma] + dg[nu][mu][sigma] - dg[sigma][mu][nu]
          );
        }
        Gamma[lambda][mu][nu] = 0.5 * sum;
      }
    }
  }
  
  return Gamma;
}

/**
 * Compute Ricci tensor R_μν from Christoffel symbols
 * R_μν = ∂_λ Γ^λ_μν - ∂_ν Γ^λ_μλ + Γ^λ_μν Γ^σ_λσ - Γ^λ_μσ Γ^σ_νλ
 * 
 * Simplified computation assuming small scale approximation
 */
export function ricciTensor(
  Gamma: number[][][],
  dGamma: number[][][][]
): Tensor {
  const n = Gamma.length;
  const R: number[][] = Array(n).fill(0).map(() => Array(n).fill(0));
  
  for (let mu = 0; mu < n; mu++) {
    for (let nu = 0; nu < n; nu++) {
      let sum = 0;
      
      // ∂_λ Γ^λ_μν
      for (let lambda = 0; lambda < n; lambda++) {
        sum += dGamma[lambda][lambda][mu][nu];
      }
      
      // -∂_ν Γ^λ_μλ
      for (let lambda = 0; lambda < n; lambda++) {
        sum -= dGamma[nu][lambda][mu][lambda];
      }
      
      // Γ^λ_μν Γ^σ_λσ
      for (let lambda = 0; lambda < n; lambda++) {
        for (let sigma = 0; sigma < n; sigma++) {
          sum += Gamma[lambda][mu][nu] * Gamma[sigma][lambda][sigma];
        }
      }
      
      // -Γ^λ_μσ Γ^σ_νλ
      for (let lambda = 0; lambda < n; lambda++) {
        for (let sigma = 0; sigma < n; sigma++) {
          sum -= Gamma[lambda][mu][sigma] * Gamma[sigma][nu][lambda];
        }
      }
      
      R[mu][nu] = sum;
    }
  }
  
  return R;
}

/**
 * Compute scalar curvature R = g^μν R_μν
 */
export function scalarCurvature(R: Tensor, g: Metric): number {
  return contractIndices(R, g);
}

/**
 * Compute Einstein tensor G_μν = R_μν - (1/2) g_μν R
 */
export function einsteinTensor(R: Tensor, g: Metric): Tensor {
  const n = g.length;
  const Rscalar = scalarCurvature(R, g);
  const G: number[][] = Array(n).fill(0).map(() => Array(n).fill(0));
  
  for (let mu = 0; mu < n; mu++) {
    for (let nu = 0; nu < n; nu++) {
      G[mu][nu] = (R as number[][])[mu][nu] - 0.5 * g[mu][nu] * Rscalar;
    }
  }
  
  return G;
}

/**
 * Compute extrinsic curvature K_ab = -n_μ;ν e^μ_a e^ν_b
 * 
 * For a hypersurface embedded in spacetime:
 * - n^μ is the unit normal
 * - e^μ_a are tangent vectors
 * - ; denotes covariant derivative
 * 
 * Simplified: K_ab ≈ (1/2) £_n h_ab where £ is Lie derivative
 * 
 * @param normal - Unit normal vector n^μ
 * @param tangents - Tangent basis vectors e^μ_a
 * @param inducedMetric - Induced metric h_ab on hypersurface
 * @param normalDerivative - Time derivative of normal dn^μ/dτ
 * @returns Extrinsic curvature K_ab
 */
export function extrinsicCurvatureFromNormal(
  normal: Vec,
  tangents: Vec[],
  inducedMetric: Metric,
  normalDerivative: Vec
): ExtrinsicCurvature {
  const dim = tangents.length;
  const K: number[][] = Array(dim).fill(0).map(() => Array(dim).fill(0));
  
  // Simplified computation: K_ab ≈ -(dn^μ/dτ) e_aμ e_bν g_μν
  for (let a = 0; a < dim; a++) {
    for (let b = 0; b < dim; b++) {
      let sum = 0;
      for (let mu = 0; mu < normal.length; mu++) {
        sum += normalDerivative[mu] * tangents[a][mu] * tangents[b][mu];
      }
      K[a][b] = -sum;
    }
  }
  
  return K;
}

/**
 * Compute trace of extrinsic curvature K = h^ab K_ab
 */
export function extrinsicCurvatureTrace(K: ExtrinsicCurvature, h: Metric): number {
  return contractIndices(K, h);
}

/**
 * Compute squared magnitude K^ab K_ab
 */
export function extrinsicCurvatureSquared(K: ExtrinsicCurvature, h: Metric): number {
  const hInv = metricInverse(h);
  const dim = K.length;
  let sum = 0;
  
  for (let a = 0; a < dim; a++) {
    for (let b = 0; b < dim; b++) {
      for (let c = 0; c < dim; c++) {
        for (let d = 0; d < dim; d++) {
          sum += hInv[a][c] * hInv[b][d] * K[a][b] * K[c][d];
        }
      }
    }
  }
  
  return sum;
}

/**
 * Compute induced metric h_ab on a hypersurface
 * h_ab = g_μν e^μ_a e^ν_b
 */
export function inducedMetric(g: Metric, tangents: Vec[]): Metric {
  const dim = tangents.length;
  const h: number[][] = Array(dim).fill(0).map(() => Array(dim).fill(0));
  
  for (let a = 0; a < dim; a++) {
    for (let b = 0; b < dim; b++) {
      let sum = 0;
      for (let mu = 0; mu < g.length; mu++) {
        for (let nu = 0; nu < g.length; nu++) {
          sum += g[mu][nu] * tangents[a][mu] * tangents[b][nu];
        }
      }
      h[a][b] = sum;
    }
  }
  
  return h;
}

/**
 * Normalize a vector to unit length with respect to a metric
 */
export function normalizeVector(v: Vec, g: Metric): Vec {
  const norm2 = lowerIndex(v, g).reduce((sum, vi, i) => sum + vi * v[i], 0);
  const norm = Math.sqrt(Math.abs(norm2));
  
  if (norm < 1e-12) {
    throw new Error('Cannot normalize zero vector');
  }
  
  return v.map(vi => vi / norm);
}

/**
 * Check if a vector is timelike, spacelike, or null
 */
export function vectorType(v: Vec, g: Metric): 'timelike' | 'spacelike' | 'null' {
  const norm2 = lowerIndex(v, g).reduce((sum, vi, i) => sum + vi * v[i], 0);
  
  if (Math.abs(norm2) < 1e-12) return 'null';
  if (norm2 < 0) return 'timelike'; // Minkowski signature (-,+,+,+)
  return 'spacelike';
}
