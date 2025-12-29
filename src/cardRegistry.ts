/**
 * Card Registry
 *
 * Canonical index of all implemented ζ-cards.
 * This is the single source of truth for card metadata, invariants, and failure modes.
 *
 * The README is a projection of this registry, not an independent source.
 */

import { CardID, CardMeta, CardFailure } from "./cardContract";

export type CardManifest = {
  title: string;
  tagline?: string;
  semanticDescriptor?: string;
  description?: string;
  tags?: string[];
};

export type CardQueryResult = {
  manifest: CardManifest;
  score: number;
};

// simple deterministic text->vector mapper for demo purposes
function textToVector(text: string, dim = 16) {
  const v = new Array(dim).fill(0);
  for (let i = 0; i < text.length; i++) {
    const c = text.charCodeAt(i);
    v[(c + i) % dim] += 1;
  }
  const norm = Math.sqrt(v.reduce((s, x) => s + x * x, 0)) || 1;
  return v.map((x) => x / norm);
}

function dot(a: number[], b: number[]) {
  let s = 0;
  for (let i = 0; i < Math.min(a.length, b.length); i++) s += a[i] * b[i];
  return s;
}

export interface CardRegistryEntry {
  id: CardID;
  meta: CardMeta;
  implementationPath: string; // relative path to the card implementation
  invariants: string[]; // human-readable invariants
  failureModes: CardFailure[]; // observable failure states
  docstring?: string; // optional extended description
}

/**
 * Global card registry.
 * All cards must be registered here to be discoverable.
 */
export const CardRegistry: Record<CardID, CardRegistryEntry> = {
  "ζ.card.contract.core": {
    id: "ζ.card.contract.core",
    meta: {
      title: "Card Contract",
      description: "Minimal object grammar for cards: routable, indexable, activatable, introspectable",
      tags: ["system", "contract", "foundation"],
    },
    implementationPath: "src/cardContract.ts",
    invariants: [
      "Stable Identity: id is globally unique and stable across sessions",
      "Separability of Model and View: cards exist independently of React components",
      "Inspectable Semantics: cards declare inputs, outputs, and failure modes",
      "Activation is Explicit: only activate() makes a card active",
    ],
    failureModes: [
      { code: "missing_id", message: "Card has no stable ID", severity: "error" },
      { code: "non_reversible_route", message: "Router cannot encode/decode ID losslessly", severity: "error" },
      { code: "view_owns_state", message: "View mutates state without routing through card model", severity: "error" },
      { code: "activation_side_effect_only", message: "Activation only changes UI, not runtime state", severity: "error" },
    ],
    docstring: "All other cards must satisfy this contract. It is itself a card: meta-semantic.",
  },

  "ζ.card.omni": {
    id: "ζ.card.omni",
    meta: {
      title: "Omnicard",
      description: "Zero-dimensional attractor: system overview, index, recents, invocation interface",
      tags: ["system", "attractor", "index"],
    },
    implementationPath: "src/cards/omnicard.ts",
    invariants: [
      "Always resolvable: no external dependencies",
      "Always renderable: complete semantic coverage",
      "Query resolution: select(query) → CardID | null",
    ],
    failureModes: [], // Omnicard is always healthy
    docstring: "Home is not a page; it is Card Zero. The Omnicard is the system's entry point and semantic index.",
  },

  "ζ.card.spectral.heartbeat": {
    id: "ζ.card.spectral.heartbeat",
    meta: {
      title: "Spectral Heartbeat",
      description: "Normalized spectral vector with angular change detection validator",
      tags: ["spectral", "deterministic", "validator"],
    },
    implementationPath: "src/zetacard.ts",
    invariants: [
      "Normalized spectral identity: zeta vector carries multi-scale energy",
      "Deterministic operator T: diffusion + unsharp mask, reproducible state",
      "Angular change detection: semantic ticks when angle exceeds threshold",
      "Attractor modes: smooth morphism between parameter sets",
    ],
    failureModes: [
      { code: "flat_spectrum", message: "Spectral energy too uniform; no dominant modes", severity: "warn" },
    ],
    docstring: "Reference implementation of ZetaCardContract. Demonstrates state ownership, activation, and failure introspection.",
  },

  "ζ.card.readme": {
    id: "ζ.card.readme",
    meta: {
      title: "README Card",
      description: "Self-healing documentation: introspects card registry and validates README consistency",
      tags: ["system", "documentation", "validator"],
    },
    implementationPath: "src/cards/readmeCard.ts",
    invariants: [
      "README is a projection of CardRegistry, not independent prose",
      "Drift detection: surface when README diverges from actual cards",
      "Auto-generation: can generate sections from card metadata",
    ],
    failureModes: [
      { code: "missing_card_docs", message: "README missing documentation for registered card", severity: "warn" },
      { code: "undocumented_card", message: "Card exists but not in registry", severity: "error" },
      { code: "stale_docs", message: "README references removed or renamed cards", severity: "warn" },
    ],
    docstring: "Makes README consistent and non-hallucinating. The Omnicard can surface README health.",
  },

  "ζ.card.sun-contract": {
    id: "ζ.card.sun-contract",
    meta: {
      title: "Sun Contract",
      description: "Unbounded source with bounded couplings: models capacity + demand with safety invariants",
      tags: ["contract", "safety", "capacity", "asymmetric"],
    },
    implementationPath: "src/cards/sunContract.ts",
    invariants: [
      "Unbounded source safety: S(t) may be ∞; interfaces are bounded",
      "Capped absorption: A_a(t) ≤ cap_a(t) (hard limit per cycle)",
      "Bounded ramping: |dA_a/dt| ≤ ρ_a (gradual exposure only)",
      "Cumulative dose budget: D_a = ∫ max(0, A_a - P_a) dt ≤ B_a",
      "Externality audit: X_a(t) = β₁A_a + β₂|∇A_a| + β₃dependency ≤ Ξ_a",
      "Shielding control: exposure ramp dc_a/dt ≤ r_a (no instant full blast)",
    ],
    failureModes: [
      { code: "cap_exceeded", message: "Agent intake exceeded safety cap in one cycle", severity: "error" },
      { code: "ramp_exceeded", message: "Intake rate of change too steep (exposure change too fast)", severity: "warn" },
      { code: "dose_exceeded", message: "Cumulative dose budget exhausted (burnout threshold)", severity: "error" },
      { code: "externality_exceeded", message: "Cumulative harm/dependency metric exceeded", severity: "warn" },
      { code: "sun_contract_violation", message: "Recent safety violations detected", severity: "error" },
      { code: "dose_budget_warning", message: "Agent approaching dose budget limit (>70%)", severity: "warn" },
    ],
    docstring:
      "The core insight: unbounded source + bounded couplings = safety. Even with infinite demand, safety is enforced by capping intake per cycle, limiting how fast exposure can change, tracking cumulative harm (dose), and auditing side effects (externalities). Agents couple to the sun contract and the contract tracks their health. Used for capacity planning, dependency prevention, and power-asymmetry mitigation.",
  },
};

/**
 * List all registered cards.
 */
export function listCards(): CardRegistryEntry[] {
  return Object.values(CardRegistry);
}

/**
 * Get a card by ID.
 */
export function getCard(id: CardID): CardRegistryEntry | null {
  return CardRegistry[id] || null;
}

/**
 * Generate a README section for a single card.
 */
export function generateCardSection(entry: CardRegistryEntry): string {
  const invariantsList = entry.invariants
    .map((inv) => `   - **${inv.split(":")[0]}**: ${inv.split(":").slice(1).join(":").trim()}`)
    .join("\n");

  const failuresHeader =
    entry.failureModes.length > 0 ? "\n\n**Failure Modes:**\n" : "\n\n*Always healthy.*\n";

  const failuresList = entry.failureModes
    .map((fm) => `   - \`${fm.code}\` — ${fm.message} (${fm.severity || "info"})`)
    .join("\n");

  return `## ζ-Card: ${entry.meta.title}

**ID:** \`${entry.id}\`  
**Path:** [${entry.implementationPath}](${entry.implementationPath})

${entry.meta.description}

### Invariants

${invariantsList}

### Failure Modes

${failuresHeader}${failuresList}

${entry.docstring ? `### Notes\n\n${entry.docstring}\n` : ""}
`;
}

/**
 * Generate the entire "Cards" section of the README.
 */
export function generateCardsSection(): string {
  const sections = listCards().map(generateCardSection).join("\n---\n\n");
  return `## ζ-Cards (Complete Registry)\n\n${sections}`;
}

/**
 * Validate that a given markdown string contains all registered cards.
 * Returns a list of drift issues.
 */
export interface ReadmeDriftIssue {
  type: "missing_card" | "undocumented_card" | "incomplete_docs";
  cardId: CardID;
  message: string;
}

export function validateReadmeAgainstRegistry(readmeContent: string): ReadmeDriftIssue[] {
  const issues: ReadmeDriftIssue[] = [];
  const cards = listCards();

  for (const card of cards) {
    // Check if card is mentioned in README
    if (!readmeContent.includes(card.id)) {
      issues.push({
        type: "missing_card",
        cardId: card.id,
        message: `README missing documentation for ${card.id}`,
      });
    }
  }

  return issues;
}

/**
 * Backwards compatibility: old queryCards function.
 * Returns metadata about cards matching a query string.
 * In the new system, queries should be semantic (via Omnicard.select()).
 */
export function queryCards(q: string, max = 10): { id: string; title: string }[] {
  // Simple text search against card registry
  const results: { id: string; title: string }[] = [];
  const query = q.toLowerCase();

  for (const card of listCards()) {
    const titleMatch = card.meta.title.toLowerCase().includes(query);
    const descMatch = card.meta.description?.toLowerCase().includes(query);
    const tagsMatch = card.meta.tags?.some((t) => t.toLowerCase().includes(query));

    if (titleMatch || descMatch || tagsMatch) {
      results.push({
        id: card.id,
        title: card.meta.title,
      });
    }
  }

  return results.slice(0, max);
}

/**
 * Backwards compatibility: old detectFacets function.
 * Heuristically identify the "type" of a query string.
 */
export function detectFacets(input: string): string[] {
  const facets: string[] = [];
  if (/^https?:\/\//.test(input)) facets.push("url");
  try {
    JSON.parse(input);
    facets.push("json");
  } catch (e) {}
  if (/\d{4}-\d{2}-\d{2}/.test(input)) facets.push("date");
  if (/^[\d,\s]+$/.test(input)) facets.push("number-series");
  return facets;
}

/**
 * Backwards compatibility: old refreshRegistryFromRepo function.
 * In the new system, the registry is static.
 * This is a no-op; kept for API compatibility.
 */
export async function refreshRegistryFromRepo(): Promise<void> {
  // No-op: registry is now static and loaded from CardRegistry object
  return Promise.resolve();
}
