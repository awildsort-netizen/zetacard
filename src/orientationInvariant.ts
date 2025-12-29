/**
 * Levi-Civita Dynamic Orientation Signature
 *
 * Computes orientation invariants from a 4-channel sign vector.
 * Mathematically rigorous extension of Levi-Civita to temporal flows.
 *
 * Reference: LEVI_CIVITA_ORIENTATION_SIGNATURE.md
 */

/**
 * Signature vector: signs of four meaning-carrying channels
 *
 * - u[0] = sign(Φ)           energy flux
 * - u[1] = sign(Φ̇)           flux acceleration
 * - u[2] = sign([∂_x X])     dilaton gradient jump (geometry)
 * - u[3] = sign(ṡ)           entropy production rate
 */
export type SignatureVector = readonly [number, number, number, number];

/**
 * Computed orientation invariants
 */
export interface OrientationInvariant {
  /** Dimension count: # of triples where all three channels nonzero */
  D: number;

  /** Antagonism count: # of triples with negative product (reversed orientation) */
  P: number;

  /** Net orientation: sum of all triple products. Derived: Ω_net = 4 - 2P */
  omegaNet: number;

  /** Net handedness (P mod 2): determines overall parity */
  class2: number;

  /** Cyclic phase (P mod 3): rotational/oscillation phase */
  class3: number;

  /** Flip rate indicator: count of recent (D, P) changes */
  flipRate: number;

  /** GI archetype classification */
  archetype: "Rider" | "Injector" | "Block" | "Architect" | "Sink";

  /** Raw triple products for debugging */
  triples: readonly [number, number, number, number];
}

/**
 * Compute all four triple-orientation products.
 *
 * For signature vector u = [u₀, u₁, u₂, u₃]:
 * - Triple (0,1,2): u₀·u₁·u₂  (energy flux × acceleration × geometry)
 * - Triple (0,1,3): u₀·u₁·u₃  (energy flux × acceleration × entropy)
 * - Triple (0,2,3): u₀·u₂·u₃  (energy flux × geometry × entropy)
 * - Triple (1,2,3): u₁·u₂·u₃  (acceleration × geometry × entropy)
 *
 * Each product is in {-1, 0, +1}:
 * - +1: coherent orientation
 * - -1: reversed/antagonistic orientation
 * - 0: dimension collapse (at least one channel is 0)
 */
function computeTriples(u: SignatureVector): [number, number, number, number] {
  return [
    u[0] * u[1] * u[2], // (0,1,2)
    u[0] * u[1] * u[3], // (0,1,3)
    u[0] * u[2] * u[3], // (0,2,3)
    u[1] * u[2] * u[3], // (1,2,3)
  ];
}

/**
 * Main invariant computation
 */
export function orientationInvariant(
  u: SignatureVector,
  previousState?: OrientationInvariant
): OrientationInvariant {
  const triples = computeTriples(u);

  // D: count triples with nonzero product (dimension count)
  const D = triples.filter((t) => t !== 0).length;

  // P: count reversed triples (antagonism count)
  const P = triples.filter((t) => t === -1).length;

  // Ω_net: signed sum (derived from P)
  const omegaNet = 4 - 2 * P;

  // Modular classes
  const class2 = P % 2;
  const class3 = P % 3;

  // Flip rate: changes in (D, P) since last step
  let flipRate = 0;
  if (previousState) {
    if (D !== previousState.D) flipRate++;
    if (P !== previousState.P) flipRate++;
  }

  // GI archetype classification
  let archetype: OrientationInvariant["archetype"];

  if (D <= 1) {
    // Dimension collapse
    archetype = "Sink";
  } else if (D >= 3) {
    // Full or near-full dimension
    if (P === 0) {
      archetype = "Rider";
    } else if (P === 4) {
      archetype = "Block";
    } else if (P >= 1 && P <= 3) {
      archetype = "Injector";
    } else {
      archetype = "Injector"; // fallback
    }
  } else {
    // D == 2: partial dimension
    archetype = "Injector";
  }

  // If flip rate is high (active regime transitions), classify as Architect
  if (flipRate >= 2) {
    archetype = "Architect";
  }

  return {
    D,
    P,
    omegaNet,
    class2,
    class3,
    flipRate,
    archetype,
    triples: triples as readonly [number, number, number, number],
  };
}

/**
 * Create a sign vector from observable values with deadband.
 *
 * @param phi Energy flux value
 * @param phiDot Flux acceleration value
 * @param dilatorGradientJump Dilaton gradient jump [∂_x X]
 * @param entropyRate Entropy production rate ṡ
 * @param epsilon Deadband threshold (default 1e-8)
 * @returns SignatureVector with each component in {-1, 0, +1}
 */
export function createSignatureVector(
  phi: number,
  phiDot: number,
  dilatorGradientJump: number,
  entropyRate: number,
  epsilon: number = 1e-8
): SignatureVector {
  const sign = (x: number): number => {
    if (Math.abs(x) < epsilon) return 0;
    return x > 0 ? 1 : -1;
  };

  return [
    sign(phi),
    sign(phiDot),
    sign(dilatorGradientJump),
    sign(entropyRate),
  ] as SignatureVector;
}

/**
 * Format invariant for logging/display
 */
export function formatInvariant(inv: OrientationInvariant): string {
  return (
    `P=${inv.P} D=${inv.D} ` +
    `(Ω=${inv.omegaNet > 0 ? "+" : ""}${inv.omegaNet} c2=${inv.class2} c3=${inv.class3}) ` +
    `flip=${inv.flipRate} [${inv.archetype}]`
  );
}

/**
 * Verbose logging: all triple products and interpretation
 */
export function verboseInvariant(u: SignatureVector, inv: OrientationInvariant): string {
  const tripleNames = [
    "(Φ·Φ̇·[∂ₓX])",
    "(Φ·Φ̇·ṡ)",
    "(Φ·[∂ₓX]·ṡ)",
    "(Φ̇·[∂ₓX]·ṡ)",
  ];

  let output = "\nOrientation Signature:\n";
  output += `  Vector: [${u.join(", ")}]\n`;
  output += "  Triples:\n";

  for (let i = 0; i < 4; i++) {
    const sign = inv.triples[i];
    const meaning =
      sign === 1
        ? "coherent"
        : sign === -1
          ? "antagonistic"
          : "degenerate";
    const signStr = sign > 0 ? "+" : "";
    output += `    ${tripleNames[i]}: ${signStr}${sign} (${meaning})\n`;
  }

  const netStr = inv.omegaNet > 0 ? "+" : "";
  output += `  Invariants: D=${inv.D} P=${inv.P} Ω_net=${netStr}${inv.omegaNet}\n`;
  output += `  Classes: mod2=${inv.class2} mod3=${inv.class3}\n`;
  output += `  Archetype: ${inv.archetype}\n`;

  return output;
}

// Export for testing
export const __internal__ = {
  computeTriples,
};
