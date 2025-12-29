/**
 * ζ-Card: Card Contract (ζ.card.contract.core)
 *
 * Defines the minimal object grammar required for something to behave as a "card":
 * routable, indexable, activatable, and introspectable.
 *
 * Key principle: The URL is a reflection of the active card's `id`;
 * navigation is implemented by activating cards.
 */

export type CardID = string;

export type CardFailure = {
  code: string; // "flat_spectrum", "missing_input", "disconnected", ...
  message: string; // human-readable
  severity?: "info" | "warn" | "error";
};

export type CardMeta = {
  title: string;
  description?: string;
  tags?: string[];
};

export type CardIO = {
  inputs?: string[]; // semantic keys or dependency names
  outputs?: string[]; // semantic keys or emitted artifacts
};

export type CardActivationContext = {
  reason?: string; // "user_selected", "route_reflection", "programmatic", ...
  from?: CardID; // which card initiated the activation
  timestamp?: number;
};

/**
 * Core contract that all zeta cards must satisfy.
 * A card is routable, stateful, activatable, and introspectable.
 */
export interface ZetaCardContract<State = unknown> {
  // Identity
  readonly id: CardID;
  readonly meta: CardMeta;

  // Dependency graph (optional)
  readonly io?: CardIO;

  // State management
  getState(): State;
  setState(next: State): void;

  // Activation operator: "become the active card"
  // This is the ONLY way a card should become active.
  activate(ctx?: CardActivationContext): void;

  // Semantic payload (optional but encouraged)
  // Your spectral fingerprint, energy vector, or other invariant measure
  readonly zeta?: number[];

  // Introspection
  getFailures?(): CardFailure[];

  // View projection (optional)
  // A card may exist without rendering (headless card / pure operator).
  View?: React.ComponentType<{ card: ZetaCardContract<State> }>;
}

/**
 * Failure modes that any card implementation should check for.
 * These help implementers know what "broken" means.
 */
export const CardFailureRegistry = {
  MISSING_ID: { code: "missing_id", message: "Card has no stable ID" },
  NON_REVERSIBLE_ROUTE: {
    code: "non_reversible_route",
    message: "Router cannot encode/decode ID losslessly",
  },
  VIEW_OWNS_STATE: {
    code: "view_owns_state",
    message: "View mutates state without routing through card model",
  },
  ACTIVATION_SIDE_EFFECT_ONLY: {
    code: "activation_side_effect_only",
    message: "Activation only changes UI, not runtime state",
  },
  FLAT_SPECTRUM: {
    code: "flat_spectrum",
    message: "Spectral energy is too uniform; no dominant modes detected",
  },
  MISSING_INPUT: {
    code: "missing_input",
    message: "Required input dependency is not available",
  },
  DISCONNECTED: {
    code: "disconnected",
    message: "Card cannot reach required external service or resource",
  },
};

/**
 * Helper to check if a card is properly contracted.
 * Use this for introspection and validation.
 */
export function validateCardContract(card: ZetaCardContract): CardFailure[] {
  const failures: CardFailure[] = [];

  if (!card.id || typeof card.id !== "string") {
    failures.push(CardFailureRegistry.MISSING_ID);
  }

  if (typeof card.activate !== "function") {
    failures.push({
      code: "missing_activate",
      message: "Card must implement activate() method",
    });
  }

  if (typeof card.getState !== "function") {
    failures.push({
      code: "missing_getState",
      message: "Card must implement getState() method",
    });
  }

  if (typeof card.setState !== "function") {
    failures.push({
      code: "missing_setState",
      message: "Card must implement setState() method",
    });
  }

  return failures;
}

// ============================================================================
// Zeta Gradient Invariant: Field-Based Contract Law
// ============================================================================
// See: ZETA_GRADIENT_INVARIANT.md
//
// Principle: Motion follows field reshaping, not coercion.
// You do not fix motion by commanding it.
// You fix motion by reshaping the field.
//
// ============================================================================

/** Vector type for gradients */
export type Vec = number[];

/** Coercion tracking for detected violations */
export type CoercionRecord = {
  magnitude: number; // |F_coercion|
  timestamp: number; // when applied
  expectedDecay: "exponential" | "linear" | "step"; // decay model
};

/** Potential field modification */
export type PotentialModifier = {
  name: string; // what changed
  magnitude: number; // how much
  reason: string; // why
  affectedStates?: unknown[]; // which states feel the change
};

/** Gradient-aware card contract: motion follows field, not commands */
export interface ZetaGradientCardContract<State = unknown>
  extends ZetaCardContract<State>
{
  /**
   * The potential field Φ(x) governing this card's state space.
   * Lower potential = lower energy = more natural/stable.
   */
  potentialField(state: State): number;

  /**
   * Gradient (force direction): ∇Φ(x)
   * Negative gradient is the direction of steepest descent (least resistance).
   */
  gradient(state: State): Vec;

  /**
   * Coercion tracking: if the system is forcing motion against the gradient,
   * this records the external force. Must decay (not sustained).
   */
  coercionForce?: CoercionRecord;

  /**
   * Field reshaping: explicit, trackable modifications to the potential.
   * This is the ONLY way to sustainably change motion.
   *
   * @returns success and the new potential function
   */
  reshapeField?(
    delta: PotentialModifier
  ): {
    success: boolean;
    newPotential?: (state: State) => number;
    reason?: string;
  };
}

/**
 * Violation types for the gradient invariant.
 * These detect when institutions are doing motion work instead of field work.
 */
export const GradientFailureRegistry = {
  SUSTAINED_COERCION: {
    code: "sustained_coercion",
    message:
      "Card applying force for too long; motion work instead of field work",
    severity: "warn" as const,
  },
  HIDDEN_BASIN: {
    code: "hidden_basin",
    message: "No gradient; agent trapped, cannot move",
    severity: "error" as const,
  },
  CLIFF_POTENTIAL: {
    code: "cliff_potential",
    message: "Potential has discontinuities; abrupt field changes",
    severity: "warn" as const,
  },
  FLAT_SPECTRUM: {
    code: "flat_spectrum",
    message: "No preferred direction; stuck or oscillating",
    severity: "warn" as const,
  },
  MISSING_FIELD: {
    code: "missing_field",
    message: "Card does not declare potentialField; cannot check gradient invariant",
    severity: "info" as const,
  },
};

/**
 * Check if a card respects the gradient invariant.
 * Returns violations if the card is doing motion work instead of field work.
 */
export function validateGradientInvariant(
  card: ZetaCardContract<any>
): CardFailure[] {
  const failures: CardFailure[] = [];
  const gradCard = card as ZetaGradientCardContract<any>;

  // If not a gradient card, that's OK (it's optional), but note it
  if (!gradCard.potentialField) {
    failures.push({
      code: GradientFailureRegistry.MISSING_FIELD.code,
      message: GradientFailureRegistry.MISSING_FIELD.message,
      severity: GradientFailureRegistry.MISSING_FIELD.severity,
    });
    return failures;
  }

  const state = card.getState();
  const phi = gradCard.potentialField(state);
  const grad = gradCard.gradient(state);

  // Check 1: Sustained coercion
  if (gradCard.coercionForce && gradCard.coercionForce.magnitude > 0) {
    const COERCION_HALF_LIFE = 5000; // 5 seconds in milliseconds
    const age = Date.now() - gradCard.coercionForce.timestamp;
    if (age > COERCION_HALF_LIFE && gradCard.coercionForce.magnitude > 0.1) {
      failures.push({
        code: GradientFailureRegistry.SUSTAINED_COERCION.code,
        message: GradientFailureRegistry.SUSTAINED_COERCION.message,
        severity: GradientFailureRegistry.SUSTAINED_COERCION.severity,
      });
    }
  }

  // Check 2: Hidden basins (no escape route)
  const EPSILON = 1e-6;
  const localGradNorm = Math.sqrt(grad.reduce((s, g) => s + g * g, 0));
  if (localGradNorm < EPSILON) {
    failures.push({
      code: GradientFailureRegistry.HIDDEN_BASIN.code,
      message: GradientFailureRegistry.HIDDEN_BASIN.message,
      severity: GradientFailureRegistry.HIDDEN_BASIN.severity,
    });
  }

  return failures;
}
