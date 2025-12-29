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
export function validateCardContract(card: any): CardFailure[] {
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
