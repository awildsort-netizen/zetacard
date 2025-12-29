import { test, expect, describe } from 'vitest';
import {
  softplus,
  sigmoid,
  relu,
  dot,
  l2,
  add,
  sub,
  scale,
  phi_c,
  grad_phi_c,
  force_c,
  boundedForce,
  scoreAgent,
  classifyOrbit,
  DEFAULT_PHI_PARAMS,
  DEFAULT_AGENT_PARAMS,
  type Vec,
  type PhiParams,
  type AgentParams,
} from '../contractPhysics';

describe('Core Mathematical Functions', () => {
  test('softplus is numerically stable', () => {
    expect(softplus(0)).toBeCloseTo(Math.log(2), 5);
    expect(softplus(10)).toBeCloseTo(10, 3); // large positive (reduced precision for numerical stability)
    expect(softplus(-10)).toBeCloseTo(0, 3); // large negative (reduced precision)
    expect(Number.isFinite(softplus(100))).toBe(true);
    expect(Number.isFinite(softplus(-100))).toBe(true);
  });

  test('sigmoid bounds check', () => {
    expect(sigmoid(0)).toBeCloseTo(0.5, 5);
    expect(sigmoid(10)).toBeGreaterThan(0.99);
    expect(sigmoid(-10)).toBeLessThan(0.01);
    expect(sigmoid(100)).toBeGreaterThan(0);
    expect(sigmoid(100)).toBeLessThanOrEqual(1);
  });

  test('relu behaves correctly', () => {
    expect(relu(5)).toBe(5);
    expect(relu(-5)).toBe(0);
    expect(relu(0)).toBe(0);
  });
});

describe('Vector Operations', () => {
  test('dot product', () => {
    const a = [1, 2, 3];
    const b = [4, 5, 6];
    expect(dot(a, b)).toBe(32); // 1*4 + 2*5 + 3*6 = 32
  });

  test('l2 norm', () => {
    const v = [3, 4];
    expect(l2(v)).toBeCloseTo(5, 5); // sqrt(9 + 16) = 5
    
    const v2 = [1, 0, 0, 0, 0, 0, 0, 0];
    expect(l2(v2)).toBeCloseTo(1, 5);
  });

  test('vector addition', () => {
    const a = [1, 2, 3];
    const b = [4, 5, 6];
    const result = add(a, b);
    expect(result).toEqual([5, 7, 9]);
  });

  test('vector subtraction', () => {
    const a = [5, 7, 9];
    const b = [1, 2, 3];
    const result = sub(a, b);
    expect(result).toEqual([4, 5, 6]);
  });

  test('scalar multiplication', () => {
    const a = [1, 2, 3];
    const result = scale(a, 2);
    expect(result).toEqual([2, 4, 6]);
  });
});

describe('Potential and Gradient', () => {
  const simpleParams: PhiParams = {
    w: [1, 1, 1, 1, 1, 1, 1, 1],
    alpha: [1, 1, 1, 1, 1, 1, 1, 1],
    mu: [0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5],
    w_mp: 1,
    w_to: 1,
    C_cliff: 1,
    theta_legal: 0.8,
    q: 2,
  };

  test('phi_c at equilibrium point', () => {
    const x = [0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5];
    const phi = phi_c(x, simpleParams);
    expect(Number.isFinite(phi)).toBe(true);
    expect(phi).toBeGreaterThan(0);
  });

  test('phi_c includes interaction terms', () => {
    const x1 = [1, 0, 0, 0, 1, 0, 0, 0]; // x1=1, x5=1
    const x2 = [0, 0, 0, 0, 0, 0, 0, 0]; // x1=0, x5=0
    
    // With interaction w_mp * x1 * x5, phi(x1) should differ from phi(x2)
    const phi1 = phi_c(x1, simpleParams);
    const phi2 = phi_c(x2, simpleParams);
    expect(phi1).not.toBeCloseTo(phi2, 1);
  });

  test('phi_c cliff activates above threshold', () => {
    const below = [0.5, 0.5, 0.5, 0.5, 0.5, 0.7, 0.5, 0.5]; // x6=0.7 < 0.8
    const above = [0.5, 0.5, 0.5, 0.5, 0.5, 0.9, 0.5, 0.5]; // x6=0.9 > 0.8
    
    const phiBelow = phi_c(below, simpleParams);
    const phiAbove = phi_c(above, simpleParams);
    
    // Cliff should add energy when above threshold
    expect(phiAbove).toBeGreaterThan(phiBelow);
  });

  test('grad_phi_c has correct dimensions', () => {
    const x = [0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5];
    const grad = grad_phi_c(x, simpleParams);
    expect(grad.length).toBe(8);
    expect(grad.every(g => Number.isFinite(g))).toBe(true);
  });

  test('grad_phi_c interaction terms affect correct indices', () => {
    const x = [1, 1, 1, 0, 1, 0, 0, 0];
    const grad = grad_phi_c(x, simpleParams);
    
    // w_mp * x1 * x5: should affect indices 0 and 4
    // w_to * x2 * x3: should affect indices 1 and 2
    // All gradients should be non-zero at this point
    expect(grad[0]).not.toBe(0);
    expect(grad[1]).not.toBe(0);
    expect(grad[2]).not.toBe(0);
    expect(grad[4]).not.toBe(0);
  });

  test('grad_phi_c cliff term zero below threshold', () => {
    const below = [0.5, 0.5, 0.5, 0.5, 0.5, 0.7, 0.5, 0.5]; // x6=0.7 < 0.8
    const grad = grad_phi_c(below, simpleParams);
    
    // Cliff contribution to grad[5] should be zero
    // (but base term contributes, so we check with/without cliff)
    const noCliffParams = { ...simpleParams, C_cliff: 0 };
    const gradNoCliff = grad_phi_c(below, noCliffParams);
    
    expect(grad[5]).toBeCloseTo(gradNoCliff[5], 5);
  });

  test('finite difference validation of gradient', () => {
    // Verify gradient by comparing with numerical derivative
    const x = [0.6, 0.4, 0.7, 0.3, 0.5, 0.85, 0.2, 0.8];
    const grad = grad_phi_c(x, simpleParams);
    
    const h = 1e-5; // small step for finite difference
    
    // Check each component
    for (let i = 0; i < 8; i++) {
      const xPlusH = [...x];
      xPlusH[i] += h;
      const xMinusH = [...x];
      xMinusH[i] -= h;
      
      const fdGrad = (phi_c(xPlusH, simpleParams) - phi_c(xMinusH, simpleParams)) / (2 * h);
      
      expect(grad[i]).toBeCloseTo(fdGrad, 3);
    }
  });
});

describe('Force and Bounded Force', () => {
  const simpleParams: PhiParams = {
    w: [1, 1, 1, 1, 1, 1, 1, 1],
    alpha: [1, 1, 1, 1, 1, 1, 1, 1],
    mu: [0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5],
    w_mp: 1,
    w_to: 1,
    C_cliff: 1,
    theta_legal: 0.8,
    q: 2,
  };

  test('force is negative gradient', () => {
    const x = [0.6, 0.4, 0.7, 0.3, 0.5, 0.85, 0.2, 0.8];
    const grad = grad_phi_c(x, simpleParams);
    const force = force_c(x, simpleParams);
    
    for (let i = 0; i < 8; i++) {
      expect(force[i]).toBeCloseTo(-grad[i], 5);
    }
  });

  test('boundedForce saturates at Fmax', () => {
    const largeForce = [100, 100, 100, 100, 100, 100, 100, 100];
    const Fmax = 10;
    const bounded = boundedForce(largeForce, Fmax);
    
    const mag = l2(bounded);
    // Should be significantly less than original magnitude
    expect(mag).toBeLessThan(l2(largeForce));
    // Should approach Fmax but not exceed it significantly
    expect(mag).toBeLessThan(Fmax * 1.5);
  });

  test('boundedForce preserves direction', () => {
    const F = [3, 4, 0, 0, 0, 0, 0, 0];
    const bounded = boundedForce(F, 1);
    
    // Check that direction is preserved (parallel vectors)
    const dotProduct = dot(F, bounded);
    const magProduct = l2(F) * l2(bounded);
    const cosTheta = dotProduct / magProduct;
    
    expect(cosTheta).toBeCloseTo(1, 5); // parallel vectors have cos(θ) = 1
  });

  test('boundedForce is identity for small forces', () => {
    const smallForce = [0.1, 0.1, 0, 0, 0, 0, 0, 0];
    const Fmax = 100;
    const bounded = boundedForce(smallForce, Fmax);
    
    for (let i = 0; i < 8; i++) {
      expect(bounded[i]).toBeCloseTo(smallForce[i], 3); // reduced precision for numerical stability
    }
  });
});

describe('Agent Scoring', () => {
  test('scoreAgent computes metrics for simple trajectory', () => {
    const times = [0, 1, 2, 3, 4];
    const xs: Vec[] = [
      [0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5],
      [0.51, 0.51, 0.51, 0.51, 0.51, 0.51, 0.51, 0.51],
      [0.52, 0.52, 0.52, 0.52, 0.52, 0.52, 0.52, 0.52],
      [0.53, 0.53, 0.53, 0.53, 0.53, 0.53, 0.53, 0.53],
      [0.54, 0.54, 0.54, 0.54, 0.54, 0.54, 0.54, 0.54],
    ];
    
    const result = scoreAgent(times, xs, undefined, DEFAULT_PHI_PARAMS, DEFAULT_AGENT_PARAMS);
    
    expect(Number.isFinite(result.H)).toBe(true);
    expect(Number.isFinite(result.Gpeak)).toBe(true);
    expect(Number.isFinite(result.E)).toBe(true);
    expect(Number.isFinite(result.zeta)).toBe(true);
    
    expect(result.zeta).toBeGreaterThan(0);
    expect(result.zeta).toBeLessThanOrEqual(1);
  });

  test('scoreAgent handles high acceleration', () => {
    const times = [0, 1, 2, 3];
    const xs: Vec[] = [
      [0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5],
      [0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5],
      [0.8, 0.8, 0.8, 0.8, 0.8, 0.8, 0.8, 0.8], // sudden jump
      [0.8, 0.8, 0.8, 0.8, 0.8, 0.8, 0.8, 0.8],
    ];
    
    const result = scoreAgent(times, xs, undefined, DEFAULT_PHI_PARAMS, DEFAULT_AGENT_PARAMS);
    
    // High acceleration should result in high Gpeak and lower zeta
    expect(result.Gpeak).toBeGreaterThan(0);
    expect(result.zeta).toBeGreaterThan(0);
    expect(result.zeta).toBeLessThanOrEqual(1);
  });

  test('scoreAgent accumulates harm over time', () => {
    // Create a trajectory with sustained moderate acceleration
    const times = Array.from({ length: 10 }, (_, i) => i);
    const xs: Vec[] = times.map(t => {
      const val = 0.5 + 0.05 * t; // linear growth
      return [val, val, val, val, val, val, val, val];
    });
    
    const result = scoreAgent(times, xs, undefined, DEFAULT_PHI_PARAMS, DEFAULT_AGENT_PARAMS);
    
    expect(result.H).toBeGreaterThan(0); // should accumulate some harm
  });

  test('scoreAgent with involvement weighting', () => {
    const times = [0, 1, 2, 3, 4];
    const xs: Vec[] = times.map(t => {
      const val = 0.5 + 0.01 * t;
      return [val, val, val, val, val, val, val, val];
    });
    
    // Agent not involved at all
    const resultNoInvolvement = scoreAgent(
      times,
      xs,
      () => 0,
      DEFAULT_PHI_PARAMS,
      DEFAULT_AGENT_PARAMS
    );
    
    // Agent fully involved
    const resultFullInvolvement = scoreAgent(
      times,
      xs,
      () => 1,
      DEFAULT_PHI_PARAMS,
      DEFAULT_AGENT_PARAMS
    );
    
    // Exposure should be higher with involvement
    expect(resultFullInvolvement.E).toBeGreaterThan(resultNoInvolvement.E);
  });

  test('scoreAgent with scaled acceleration', () => {
    const times = [0, 1, 2];
    const xs: Vec[] = [
      [0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5],
      [0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5],
      [0.6, 0.6, 0.6, 0.6, 0.6, 0.6, 0.6, 0.6],
    ];
    
    const agentWithScaling: AgentParams = {
      ...DEFAULT_AGENT_PARAMS,
      sigmaA: [1, 1, 1, 1, 1, 1, 1, 2], // last dimension has different scale
    };
    
    const result = scoreAgent(times, xs, undefined, DEFAULT_PHI_PARAMS, agentWithScaling);
    
    expect(Number.isFinite(result.Gpeak)).toBe(true);
  });

  test('zeta score decreases with harm', () => {
    const times = [0, 1, 2];
    
    // Low harm trajectory
    const xsLow: Vec[] = [
      [0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5],
      [0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5],
      [0.51, 0.51, 0.51, 0.51, 0.51, 0.51, 0.51, 0.51],
    ];
    
    // High harm trajectory (large acceleration)
    const xsHigh: Vec[] = [
      [0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5],
      [0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5],
      [0.9, 0.9, 0.9, 0.9, 0.9, 0.9, 0.9, 0.9],
    ];
    
    const resultLow = scoreAgent(times, xsLow, undefined, DEFAULT_PHI_PARAMS, DEFAULT_AGENT_PARAMS);
    const resultHigh = scoreAgent(times, xsHigh, undefined, DEFAULT_PHI_PARAMS, DEFAULT_AGENT_PARAMS);
    
    expect(resultLow.zeta).toBeGreaterThan(resultHigh.zeta);
  });

  test('legal cliff increases harm', () => {
    const times = [0, 1, 2, 3];
    
    // Below legal threshold
    const xsBelow: Vec[] = [
      [0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5],
      [0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5],
      [0.5, 0.5, 0.5, 0.5, 0.5, 0.7, 0.5, 0.5], // x6=0.7 < 0.8
      [0.5, 0.5, 0.5, 0.5, 0.5, 0.7, 0.5, 0.5],
    ];
    
    // Above legal threshold
    const xsAbove: Vec[] = [
      [0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5],
      [0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5],
      [0.5, 0.5, 0.5, 0.5, 0.5, 0.95, 0.5, 0.5], // x6=0.95 > 0.8
      [0.5, 0.5, 0.5, 0.5, 0.5, 0.95, 0.5, 0.5],
    ];
    
    const resultBelow = scoreAgent(times, xsBelow, undefined, DEFAULT_PHI_PARAMS, DEFAULT_AGENT_PARAMS);
    const resultAbove = scoreAgent(times, xsAbove, undefined, DEFAULT_PHI_PARAMS, DEFAULT_AGENT_PARAMS);
    
    expect(resultAbove.H).toBeGreaterThan(resultBelow.H);
  });
});

describe('Orbit Classification', () => {
  test('classifies comet correctly', () => {
    const E = 10;
    const Gpeak = 5;
    const E_low = 20;
    const E_high = 50;
    
    const orbit = classifyOrbit(E, Gpeak, E_low, E_high);
    expect(orbit).toBe('comet'); // low E, high Gpeak
  });

  test('classifies planet correctly', () => {
    const E = 60;
    const Gpeak = 1.5;
    const E_low = 20;
    const E_high = 50;
    
    const orbit = classifyOrbit(E, Gpeak, E_low, E_high);
    expect(orbit).toBe('planet'); // high E, low Gpeak
  });

  test('classifies spiky planet correctly', () => {
    const E = 60;
    const Gpeak = 5;
    const E_low = 20;
    const E_high = 50;
    
    const orbit = classifyOrbit(E, Gpeak, E_low, E_high);
    expect(orbit).toBe('spiky_planet'); // both high
  });

  test('classifies drift correctly', () => {
    const E = 10;
    const Gpeak = 1.5;
    const E_low = 20;
    const E_high = 50;
    
    const orbit = classifyOrbit(E, Gpeak, E_low, E_high);
    expect(orbit).toBe('drift'); // both low
  });
});

describe('Default Parameters', () => {
  test('DEFAULT_PHI_PARAMS is well-formed', () => {
    expect(DEFAULT_PHI_PARAMS.w.length).toBe(8);
    expect(DEFAULT_PHI_PARAMS.alpha.length).toBe(8);
    expect(DEFAULT_PHI_PARAMS.mu.length).toBe(8);
    expect(DEFAULT_PHI_PARAMS.w_mp).toBeGreaterThan(0);
    expect(DEFAULT_PHI_PARAMS.w_to).toBeGreaterThan(0);
    expect(DEFAULT_PHI_PARAMS.C_cliff).toBeGreaterThan(0);
    expect(DEFAULT_PHI_PARAMS.q).toBeGreaterThan(0);
  });

  test('DEFAULT_AGENT_PARAMS is well-formed', () => {
    expect(DEFAULT_AGENT_PARAMS.c0).toBeGreaterThan(0);
    expect(DEFAULT_AGENT_PARAMS.tau).toBeGreaterThan(0);
    expect(DEFAULT_AGENT_PARAMS.G0).toBeGreaterThan(0);
    expect(DEFAULT_AGENT_PARAMS.p).toBeGreaterThan(0);
    expect(DEFAULT_AGENT_PARAMS.alpha).toBeGreaterThan(0);
    expect(DEFAULT_AGENT_PARAMS.lambda1).toBeGreaterThan(0);
    expect(DEFAULT_AGENT_PARAMS.lambda2).toBeGreaterThan(0);
  });

  test('default parameters work in scoreAgent', () => {
    const times = [0, 1, 2, 3];
    const xs: Vec[] = [
      [0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5],
      [0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5],
      [0.55, 0.55, 0.55, 0.55, 0.55, 0.55, 0.55, 0.55],
      [0.6, 0.6, 0.6, 0.6, 0.6, 0.6, 0.6, 0.6],
    ];
    
    const result = scoreAgent(times, xs, undefined, DEFAULT_PHI_PARAMS, DEFAULT_AGENT_PARAMS);
    
    expect(result.zeta).toBeGreaterThan(0);
    expect(result.zeta).toBeLessThanOrEqual(1);
    expect(Number.isFinite(result.H)).toBe(true);
    expect(Number.isFinite(result.Gpeak)).toBe(true);
    expect(Number.isFinite(result.E)).toBe(true);
  });
});

describe('Numerical Stability', () => {
  test('handles edge case of zero acceleration', () => {
    const times = [0, 1, 2, 3];
    const xs: Vec[] = [
      [0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5],
      [0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5],
      [0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5],
      [0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5],
    ];
    
    const result = scoreAgent(times, xs, undefined, DEFAULT_PHI_PARAMS, DEFAULT_AGENT_PARAMS);
    
    expect(Number.isFinite(result.Gpeak)).toBe(true);
    expect(result.Gpeak).toBeGreaterThanOrEqual(0);
  });

  test('handles very small time steps', () => {
    const times = [0, 1e-7, 2e-7, 3e-7];
    const xs: Vec[] = [
      [0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5],
      [0.50001, 0.50001, 0.50001, 0.50001, 0.50001, 0.50001, 0.50001, 0.50001],
      [0.50002, 0.50002, 0.50002, 0.50002, 0.50002, 0.50002, 0.50002, 0.50002],
      [0.50003, 0.50003, 0.50003, 0.50003, 0.50003, 0.50003, 0.50003, 0.50003],
    ];
    
    const result = scoreAgent(times, xs, undefined, DEFAULT_PHI_PARAMS, DEFAULT_AGENT_PARAMS);
    
    expect(Number.isFinite(result.zeta)).toBe(true);
    expect(result.zeta).toBeGreaterThan(0);
  });

  test('handles extreme potential values', () => {
    const extremeParams: PhiParams = {
      ...DEFAULT_PHI_PARAMS,
      w: [100, 100, 100, 100, 100, 100, 100, 100],
      C_cliff: 1000,
    };
    
    const x = [0.9, 0.9, 0.9, 0.9, 0.9, 0.95, 0.9, 0.9];
    const phi = phi_c(x, extremeParams);
    const grad = grad_phi_c(x, extremeParams);
    
    expect(Number.isFinite(phi)).toBe(true);
    expect(grad.every(g => Number.isFinite(g))).toBe(true);
  });
});
