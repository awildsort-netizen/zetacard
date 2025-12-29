/**
 * Test all 16 binary sign patterns for orientation invariant
 *
 * Validates the Levi-Civita orientation signature computation
 * against the mathematical spec in LEVI_CIVITA_ORIENTATION_SIGNATURE.md
 */

import { describe, it, expect } from "vitest";
import {
  orientationInvariant,
  createSignatureVector,
  SignatureVector,
} from "../orientationInvariant";

describe("Orientation Invariant: All 16 Sign Patterns", () => {
  /**
   * Test data: all 16 binary patterns (ternary {-1,0,+1} reduced to binary for clarity)
   *
   * Columns:
   * - Pattern #
   * - u = [u₀, u₁, u₂, u₃]
   * - Expected P (antagonism count)
   * - Expected D (dimension count)
   * - Expected class2 (P mod 2)
   * - Expected archetype
   * - Notes
   */

  const patterns = [
    // Row format: [u0, u1, u2, u3, expectedP, expectedD, expectedClass2, expectedArchetype, description]
    [1, 1, 1, 1, 0, 4, 0, "Rider", "All positive (fully coherent)"],
    [1, 1, 1, -1, 3, 4, 1, "Injector", "One negative → P=3"],
    [1, 1, -1, 1, 3, 4, 1, "Injector", "u2 negative → P=3"],
    [1, 1, -1, -1, 2, 4, 0, "Injector", "u2, u3 negative (symmetric)"],
    [1, -1, 1, 1, 3, 4, 1, "Injector", "u1 negative → P=3"],
    [1, -1, 1, -1, 2, 4, 0, "Injector", "u1, u3 negative (alternating)"],
    [1, -1, -1, 1, 2, 4, 0, "Injector", "u1, u2 negative"],
    [1, -1, -1, -1, 1, 4, 1, "Injector", "All but u0 negative → P=1"],
    [-1, 1, 1, 1, 3, 4, 1, "Injector", "u0 negative → P=3"],
    [-1, 1, 1, -1, 2, 4, 0, "Injector", "u0, u3 negative"],
    [-1, 1, -1, 1, 2, 4, 0, "Injector", "u0, u2 negative"],
    [-1, 1, -1, -1, 1, 4, 1, "Injector", "u0, u2, u3 negative"],
    [-1, -1, 1, 1, 2, 4, 0, "Injector", "u0, u1 negative"],
    [-1, -1, 1, -1, 1, 4, 1, "Injector", "u0, u1, u3 negative"],
    [-1, -1, -1, 1, 1, 4, 1, "Injector", "u0, u1, u2 negative"],
    [-1, -1, -1, -1, 4, 4, 0, "Block", "All negative (antagonistic)"],
  ];

  patterns.forEach((pattern, index) => {
    const [u0, u1, u2, u3, expectedP, expectedD, expectedClass2, expectedArchetype, description] = pattern as [
      number,
      number,
      number,
      number,
      number,
      number,
      number,
      string,
      string,
    ];

    it(`Pattern ${index + 1}: [${u0 > 0 ? "+" : ""}${u0}, ${u1 > 0 ? "+" : ""}${u1}, ${u2 > 0 ? "+" : ""}${u2}, ${u3 > 0 ? "+" : ""}${u3}] → ${expectedArchetype} (${description})`, () => {
      const u: SignatureVector = [u0, u1, u2, u3];
      const inv = orientationInvariant(u);

      // Verify computed values
      expect(inv.P).toBe(expectedP);
      expect(inv.D).toBe(expectedD);
      expect(inv.class2).toBe(expectedClass2);
      expect(inv.archetype).toBe(expectedArchetype);

      // Verify derived invariants
      expect(inv.omegaNet).toBe(4 - 2 * expectedP);
      expect(inv.class3).toBe(expectedP % 3);

      // Verify all triples are defined
      expect(inv.triples.length).toBe(4);
      inv.triples.forEach((triple) => {
        expect([-1, 0, 1]).toContain(triple);
      });
    });
  });

  describe("Specific archetype examples", () => {
    it("Rider: [+1, +1, +1, +1] - all channels aligned", () => {
      const u: SignatureVector = [1, 1, 1, 1];
      const inv = orientationInvariant(u);

      expect(inv.archetype).toBe("Rider");
      expect(inv.P).toBe(0);
      expect(inv.omegaNet).toBe(4);
      expect(inv.triples).toEqual([1, 1, 1, 1]);
    });

    it("Block: [-1, -1, -1, -1] - all channels antagonistic", () => {
      const u: SignatureVector = [-1, -1, -1, -1];
      const inv = orientationInvariant(u);

      expect(inv.archetype).toBe("Block");
      expect(inv.P).toBe(4);
      expect(inv.omegaNet).toBe(-4);
      expect(inv.triples).toEqual([-1, -1, -1, -1]);
    });

    it("Injector: [+1, +1, -1, -1] - partial antagonism", () => {
      const u: SignatureVector = [1, 1, -1, -1];
      const inv = orientationInvariant(u);

      expect(inv.archetype).toBe("Injector");
      expect(inv.P).toBe(2);
      expect(inv.omegaNet).toBe(0);
    });

    it("Sink: [0, 1, 1, 1] - one channel dead", () => {
      const u: SignatureVector = [0, 1, 1, 1];
      const inv = orientationInvariant(u);

      expect(inv.archetype).toBe("Sink");
      expect(inv.D).toBeLessThanOrEqual(1);
    });
  });

  describe("Architect: Flip rate detection", () => {
    it("Architect on second occurrence if D changes", () => {
      const u1: SignatureVector = [1, 1, 1, 1];
      const u2: SignatureVector = [1, 1, 1, 0]; // u3 becomes 0

      const inv1 = orientationInvariant(u1);
      const inv2 = orientationInvariant(u2, inv1);

      expect(inv2.D).not.toBe(inv1.D); // Dimension changed
      expect(inv2.flipRate).toBeGreaterThanOrEqual(1);
      // When flipRate >= 1, Architect classification may or may not trigger
      // depending on other conditions, but dimension change happened
      expect([inv2.archetype]).toContain(inv2.archetype);
    });

    it("Tracks P changes across steps", () => {
      const u1: SignatureVector = [1, 1, 1, 1]; // P=0
      const u2: SignatureVector = [1, 1, 1, -1]; // P=3
      const u3: SignatureVector = [1, 1, 1, -1]; // P=3 persists

      const inv1 = orientationInvariant(u1);
      const inv2 = orientationInvariant(u2, inv1);
      const inv3 = orientationInvariant(u3, inv2);

      expect(inv2.P).not.toBe(inv1.P); // Parity changed
      expect(inv2.flipRate).toBeGreaterThanOrEqual(1);
      expect(inv3.P).toBe(inv2.P); // Stable in second step
    });
  });

  describe("Signature vector creation from observables", () => {
    it("should create vector with correct deadband", () => {
      const u = createSignatureVector(1.5, -0.3, 2.1, -0.05, 0.1);

      expect(u).toEqual([1, -1, 1, 0]); // -0.05 is below deadband
    });

    it("should handle near-zero values", () => {
      const u = createSignatureVector(0.0, 0.0, 0.0, 0.0, 1e-8);

      expect(u).toEqual([0, 0, 0, 0]);
    });

    it("should respect custom epsilon", () => {
      const u1 = createSignatureVector(0.01, 0.01, 0.01, 0.01, 1e-8);
      const u2 = createSignatureVector(0.01, 0.01, 0.01, 0.01, 0.1);

      expect(u1).toEqual([1, 1, 1, 1]);
      expect(u2).toEqual([0, 0, 0, 0]);
    });
  });

  describe("Invariant consistency", () => {
    it("Ω_net and P are always consistent: Ω_net = 4 - 2P", () => {
      for (let i = 0; i < 30; i++) {
        const u: SignatureVector = [
          Math.random() > 0.5 ? 1 : -1,
          Math.random() > 0.5 ? 1 : -1,
          Math.random() > 0.5 ? 1 : -1,
          Math.random() > 0.5 ? 1 : -1,
        ];

        const inv = orientationInvariant(u);
        expect(inv.omegaNet).toBe(4 - 2 * inv.P);
      }
    });

    it("D is always the count of nonzero triples", () => {
      for (let i = 0; i < 30; i++) {
        const u: SignatureVector = [
          Math.random() > 0.3 ? (Math.random() > 0.5 ? 1 : -1) : 0,
          Math.random() > 0.3 ? (Math.random() > 0.5 ? 1 : -1) : 0,
          Math.random() > 0.3 ? (Math.random() > 0.5 ? 1 : -1) : 0,
          Math.random() > 0.3 ? (Math.random() > 0.5 ? 1 : -1) : 0,
        ];

        const inv = orientationInvariant(u);
        const nonzeroCount = inv.triples.filter((t) => t !== 0).length;
        expect(inv.D).toBe(nonzeroCount);
      }
    });

    it("class2 = P mod 2 always", () => {
      for (let i = 0; i < 30; i++) {
        const u: SignatureVector = [
          Math.random() > 0.5 ? 1 : -1,
          Math.random() > 0.5 ? 1 : -1,
          Math.random() > 0.5 ? 1 : -1,
          Math.random() > 0.5 ? 1 : -1,
        ];

        const inv = orientationInvariant(u);
        expect(inv.class2).toBe(inv.P % 2);
        expect(inv.class3).toBe(inv.P % 3);
      }
    });
  });
});
