/**
 * PHASE 6 Tests: Galois Group Invariants ↔ Continued Fraction Verification
 * 
 * Three test suites:
 * 1. CF periodicity detection (verify the algorithm works)
 * 2. Galois predictions (verify theory-based predictions)
 * 3. Integration: Extract CF from trajectory, verify against Galois data
 */

import { describe, it, expect } from 'vitest';
import {
  createGaloisCFAnalyzer,
  ALGEBRAIC_GALOIS_DATA,
  detectCFPeriodicity,
  approximationHardnessFromGaloisData,
  predictCFPeriodicityFromGaloisGroup,
} from '../galoisCFInvariants';

describe('PHASE 6: Galois-CF Invariants', () => {
  // ==========================================================================
  // TEST SUITE 1: CF Periodicity Detection
  // ==========================================================================

  describe('Suite 1: CF Periodicity Detection', () => {
    it('should detect periodic CF [1, 1, 1, 1, ...]', () => {
      const coeffs = [1, 1, 1, 1, 1, 1];
      const result = detectCFPeriodicity(coeffs);

      expect(result.isPeriodic).toBe(true);
      expect(result.periodLength).toBe(1);
      expect(result.period).toEqual([1]);
    });

    it('should detect periodic CF [1, 2, 1, 2, 1, 2, ...]', () => {
      const coeffs = [1, 2, 1, 2, 1, 2, 1, 2];
      const result = detectCFPeriodicity(coeffs);

      expect(result.isPeriodic).toBe(true);
      expect(result.periodLength).toBe(2);
      expect(result.period).toEqual([1, 2]);
    });

    it('should detect eventually periodic CF [2, 3, 1, 1, 1, 1, ...]', () => {
      const coeffs = [2, 3, 1, 1, 1, 1, 1];
      const result = detectCFPeriodicity(coeffs);

      // Period [1] starts at index 2
      expect(result.isPeriodic).toBe(true);
      expect(result.periodLength).toBe(1);
      expect(result.period).toEqual([1]);
      expect(result.startIndex).toBe(2);
    });

    it('should detect non-periodic CF [2, 3, 5, 7, 11, 13, ...]', () => {
      const coeffs = [2, 3, 5, 7, 11, 13, 17, 19]; // primes, no pattern
      const result = detectCFPeriodicity(coeffs);

      expect(result.isPeriodic).toBe(false);
    });

    it('should handle short sequences gracefully', () => {
      const coeffs = [1, 2];
      const result = detectCFPeriodicity(coeffs);

      expect(result.isPeriodic).toBe(false);
    });
  });

  // ==========================================================================
  // TEST SUITE 2: Galois Theory Predictions
  // ==========================================================================

  describe('Suite 2: Galois Theory Predictions', () => {
    it('should predict periodic CF for φ (golden ratio)', () => {
      const phiData = ALGEBRAIC_GALOIS_DATA.phi;
      const prediction = predictCFPeriodicityFromGaloisGroup(phiData);

      expect(prediction.isEventuallyPeriodic).toBe(true);
      expect(prediction.confidenceLevel).toBe(1.0);
    });

    it('should predict periodic CF for √2', () => {
      const sqrt2Data = ALGEBRAIC_GALOIS_DATA.sqrt2;
      const prediction = predictCFPeriodicityFromGaloisGroup(sqrt2Data);

      expect(prediction.isEventuallyPeriodic).toBe(true);
      expect(prediction.confidenceLevel).toBe(1.0);
    });

    it('should predict periodic CF for √3', () => {
      const sqrt3Data = ALGEBRAIC_GALOIS_DATA.sqrt3;
      const prediction = predictCFPeriodicityFromGaloisGroup(sqrt3Data);

      expect(prediction.isEventuallyPeriodic).toBe(true);
      expect(prediction.confidenceLevel).toBe(1.0);
    });

    it('should predict periodic CF for plastic constant (cubic solvable)', () => {
      const plasticData = ALGEBRAIC_GALOIS_DATA.plastic;
      const prediction = predictCFPeriodicityFromGaloisGroup(plasticData);

      expect(prediction.isEventuallyPeriodic).toBe(true);
      expect(prediction.confidenceLevel).toBeGreaterThanOrEqual(0.9);
    });
  });

  // ==========================================================================
  // TEST SUITE 3: Approximation Hardness Estimation
  // ==========================================================================

  describe('Suite 3: Approximation Hardness Estimation', () => {
    it('should identify φ as very hard to approximate', () => {
      const phiData = ALGEBRAIC_GALOIS_DATA.phi;
      const hardness = approximationHardnessFromGaloisData(phiData);

      expect(hardness.difficulty).toBe('very-hard');
      expect(hardness.diophantineExponent).toBe(3); // degree 2 → exponent ≤ 3
    });

    it('should identify √2 as hard to approximate', () => {
      const sqrt2Data = ALGEBRAIC_GALOIS_DATA.sqrt2;
      const hardness = approximationHardnessFromGaloisData(sqrt2Data);

      expect(hardness.difficulty).toBe('hard');
      expect(hardness.diophantineExponent).toBe(3);
    });

    it('should identify cubic (plastic) as moderate difficulty', () => {
      const plasticData = ALGEBRAIC_GALOIS_DATA.plastic;
      const hardness = approximationHardnessFromGaloisData(plasticData);

      expect(hardness.difficulty).toBe('moderate');
      expect(hardness.diophantineExponent).toBe(4); // degree 3 → exponent ≤ 4
    });

    it('should compute Lyapunov exponent for quadratic irrationals', () => {
      const phiData = ALGEBRAIC_GALOIS_DATA.phi;
      const hardness = approximationHardnessFromGaloisData(phiData);

      expect(hardness.lyapunovExponent).toBeDefined();
      expect(hardness.lyapunovExponent).toBeCloseTo(
        Math.log((1 + Math.sqrt(5)) / 2),
        5
      );
    });

    it('should predict convergence depth for high precision', () => {
      const phiData = ALGEBRAIC_GALOIS_DATA.phi;
      const hardness = approximationHardnessFromGaloisData(phiData);

      // Should need at least 20 terms for 1e-10 accuracy
      expect(hardness.expectedConvergenceCFDepth).toBeGreaterThanOrEqual(20);
    });
  });

  // ==========================================================================
  // TEST SUITE 4: Integration — Verify CF Signatures Against Galois
  // ==========================================================================

  describe('Suite 4: CF Signature Verification Against Galois', () => {
    it('should verify φ CF [1,1,1,1,...] against Galois prediction', () => {
      const analyzer = createGaloisCFAnalyzer();

      // φ has CF = [1; 1, 1, 1, ...]
      const observed = [1, 1, 1, 1, 1, 1, 1, 1];
      const result = analyzer.verifyCFSignature('phi', observed);

      expect(result.matchesTheory).toBe(true);
      expect(result.alignmentScore).toBeGreaterThan(0.7);
      expect(result.predictedVsObserved.predictedPeriodic).toBe(true);
      expect(result.predictedVsObserved.observedPeriodic).toBe(true);
    });

    it('should verify √2 CF [1; 2, 2, 2, ...] against Galois prediction', () => {
      const analyzer = createGaloisCFAnalyzer();

      // √2 has CF = [1; 2, 2, 2, ...]
      const observed = [1, 2, 2, 2, 2, 2, 2];
      const result = analyzer.verifyCFSignature('sqrt2', observed);

      expect(result.matchesTheory).toBe(true);
      expect(result.alignmentScore).toBeGreaterThan(0.7);
    });

    it('should verify √3 CF [1; 1, 2, 1, 2, 1, 2, ...] against Galois', () => {
      const analyzer = createGaloisCFAnalyzer();

      // √3 has CF = [1; 1, 2, 1, 2, 1, 2, ...]
      const observed = [1, 1, 2, 1, 2, 1, 2, 1, 2];
      const result = analyzer.verifyCFSignature('sqrt3', observed);

      expect(result.matchesTheory).toBe(true);
      expect(result.alignmentScore).toBeGreaterThan(0.7);
    });

    it('should reject non-periodic CF for quadratic irrational', () => {
      const analyzer = createGaloisCFAnalyzer();

      // Claim a non-periodic CF for φ — should not match theory
      const observed = [1, 2, 3, 4, 5, 6, 7, 8, 9]; // clearly non-periodic
      const result = analyzer.verifyCFSignature('phi', observed);

      expect(result.matchesTheory).toBe(false);
      expect(result.alignmentScore).toBeLessThan(0.5);
    });

    it('should handle unknown algebraic constant gracefully', () => {
      const analyzer = createGaloisCFAnalyzer();
      const observed = [1, 2, 3];
      const result = analyzer.verifyCFSignature('unknown', observed);

      expect(result.matchesTheory).toBe(false);
      expect(result.diagnosticMessage).toContain('Unknown');
    });
  });

  // ==========================================================================
  // TEST SUITE 5: Complete Galois-CF Analysis
  // ==========================================================================

  describe('Suite 5: Complete Galois-CF Analysis', () => {
    it('should run full analysis for φ with matching CF', () => {
      const analyzer = createGaloisCFAnalyzer();
      const observed = [1, 1, 1, 1, 1];

      const analysis = analyzer.analyzeComplete('phi', observed);

      if ('error' in analysis) {
        throw new Error(analysis.error);
      }

      expect(analysis.algebraicConstant).toBe('phi');
      expect(analysis.galoisGroup).toBe('C_2');
      expect(analysis.fieldDegree).toBe(2);
      expect(analysis.summary.theoryMatch).toBe(true);
      expect(analysis.summary.confidence).toBe('high');
    });

    it('should run full analysis for √2 with matching CF', () => {
      const analyzer = createGaloisCFAnalyzer();
      const observed = [1, 2, 2, 2, 2];

      const analysis = analyzer.analyzeComplete('sqrt2', observed);

      if ('error' in analysis) {
        throw new Error(analysis.error);
      }

      expect(analysis.algebraicConstant).toBe('sqrt2');
      expect(analysis.galoisGroup).toBe('C_2');
      expect(analysis.fieldDegree).toBe(2);
      expect(analysis.summary.theoryMatch).toBe(true);
    });

    it('should identify all available algebraic constants', () => {
      const analyzer = createGaloisCFAnalyzer();
      const available = analyzer.listAvailableConstants();

      expect(available).toContain('phi');
      expect(available).toContain('sqrt2');
      expect(available).toContain('sqrt3');
      expect(available).toContain('plastic');
      expect(available.length).toBeGreaterThanOrEqual(4);
    });
  });

  // ==========================================================================
  // TEST SUITE 6: Galois Data Consistency
  // ==========================================================================

  describe('Suite 6: Galois Data Consistency', () => {
    it('should have consistent Galois data for all constants', () => {
      Object.entries(ALGEBRAIC_GALOIS_DATA).forEach(([name, data]) => {
        // Check that field degree matches polynomial degree
        expect(data.minimalPolynomial.length).toBe(data.fieldDegree + 1);

        // Check that Galois group order matches degree (for degree-n extensions)
        if (data.fieldDegree <= 3) {
          // For simple cases, group order should match field degree
          expect(data.galoisGroupOrder).toBeGreaterThanOrEqual(data.fieldDegree);
        }

        // Check that numeric value is positive
        expect(data.numericValue).toBeGreaterThan(0);

        // Check that approximation hardness is reasonable
        expect(data.approximationHardness).toBeGreaterThan(0);
      });
    });

    it('should have correct minimal polynomials for quadratic irrationals', () => {
      // φ: x² - x - 1 = 0 → x ≈ 1.618
      const phi = ALGEBRAIC_GALOIS_DATA.phi;
      const phiValue = phi.numericValue;
      const [a0, a1, a2] = phi.minimalPolynomial;
      const result = a2 * phiValue ** 2 + a1 * phiValue + a0;
      expect(Math.abs(result)).toBeLessThan(1e-6);

      // √2: x² - 2 = 0 → x ≈ 1.414
      const sqrt2 = ALGEBRAIC_GALOIS_DATA.sqrt2;
      const sqrt2Value = sqrt2.numericValue;
      const [b0, b1, b2] = sqrt2.minimalPolynomial;
      const result2 = b2 * sqrt2Value ** 2 + b1 * sqrt2Value + b0;
      expect(Math.abs(result2)).toBeLessThan(1e-6);
    });
  });

  // ==========================================================================
  // TEST SUITE 7: Practical Integration with Trajectory Data
  // ==========================================================================

  describe('Suite 7: Practical Integration with Trajectory CF', () => {
    it('should analyze real trajectory CF that happens to match φ period', () => {
      const analyzer = createGaloisCFAnalyzer();

      // Simulate trajectory extraction that reveals golden ratio structure
      const trajectoryExtractedCF = [1, 1, 1, 1, 1, 1]; // matches φ

      const analysis = analyzer.analyzeComplete('phi', trajectoryExtractedCF);

      if ('error' in analysis) {
        throw new Error(analysis.error);
      }

      expect(analysis.summary.theoryMatch).toBe(true);
      console.log('✓ Trajectory CF matches Galois prediction for φ');
    });

    it('should flag mismatches when trajectory CF contradicts theory', () => {
      const analyzer = createGaloisCFAnalyzer();

      // Claim φ has a non-periodic CF (should fail)
      const contradictoryCF = [1, 2, 3, 4, 5, 6];

      const analysis = analyzer.analyzeComplete('phi', contradictoryCF);

      if ('error' in analysis) {
        throw new Error(analysis.error);
      }

      expect(analysis.summary.theoryMatch).toBe(false);
      console.log('✓ Correctly flagged mismatch between theory and observation');
    });
  });
});
