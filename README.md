Zetacard — Spectral-Dynamical VM prototype

## Quick Start

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Start dev server**
   ```bash
   npm run dev
   ```

Open the app at http://127.0.0.1:5173

## Conceptual Model

Zetacard is organized around **semantic cards**, not pages.

* **Exactly one card is active at a time.** The system maintains a single locus of computation.
* **The URL reflects the active card's ID.** Routing is not navigation — it is a *projection* of card state.
* **The Omnibox activates cards by semantic reference.** Invocation is a first-class operation, not a search.
* **The Omnicard** (`ζ.card.omni`) **is the default attractor and system overview.** It surfaces recent cards, attractor states, and system health (π-clock phase, heartbeat resonance).

UI components are **views over card state**, not the source of truth. A card may exist without being rendered, and a card's identity persists across multiple visualizations.

## Documentation

For setup, troubleshooting, and best practices, see **[DEVELOPMENT.md](DEVELOPMENT.md)** (master guide).

Key topics covered:
- PowerShell execution policy fixes
- Module system (ES6 only)
- Available commands and scripts
- Configuration files
- Troubleshooting

## What's Included

This prototype uses React + Canvas with spectral-dynamical features:

**Card Logic (Semantic layer):**
- `src/zetacard.ts` — Card model, operator T, zeta fingerprints, and invariants
- `src/piClock.ts` — π-clock deterministic generator (time projection)
- `src/meaning.ts` — Semantic interpretation and card activation
- `src/cardRegistry.ts` — Card identity and composition registry

**Routing & Resonance (Projection layer):**
- `src/quadtree.ts` — Semantic event routing, card activation, and resonance gating
- `src/location.ts` — Route reflection from active card state

**UI Views (React layer):**
- `src/App.tsx` — Main UI composition and card context
- `src/components/` — React components (Omnibox semantic operator, π-Clock timer, Spectral Heartbeat validator, etc.)
- `src/components/Omnibox.tsx` — Semantic invocation interface
- `src/components/SpectralHeartbeat.tsx` — Angular change validator and visualizer

**Utilities:**
- `src/math.ts` — Mathematical foundations (normalization, similarity, spectral measures)
- `src/instrumentation.ts` — Observation and diagnostic hooks

## Key Features

**Semantic Core:**
- **Zeta fingerprints:** Multi-scale Laplacian energy and ζ(s)=Σ(λ_k+eps)^{-s} — cards carry spectral identity
- **Invariant validation:** Cards declare failure modes (flat spectrum, resonance loss, etc.) and the UI surfaces them
- **Semantic ticks:** Angular change detection beyond threshold — the heartbeat of semantic continuity

**Deterministic Projection:**
- **π-Clock timer:** Lossless signature generator — time made explicit and reproducible
- **Overlap blending:** Sigmoid-weighted cosine similarity — smooth morphisms between card states
- **Attractor modes:** Double-click to toggle between attractor fixed points with smooth interpolation

**Unified Navigation Grammar:**
- **Omnibox as semantic operator:** Not search, but *invocation* — activate cards by reference
- **Spectral heartbeat as validator:** Angular change visualization — the UI reflects card health
- **Route as projection:** URL reflects active card ID; navigation is downstream of card activation


---

## ζ-Card: Card Contract (ζ.card.contract.core)

**Purpose:** Define the minimal object grammar required for something to behave as a "card" in Zetacard: routable, indexable, activatable, and introspectable.

### Invariants

1. **Stable Identity**
   `id` is globally unique and stable across sessions.
   If the card is active, the URL must be a reversible reflection of `id`.

2. **Separability of Model and View**
   A card may exist without any React component mounted.
   Views are projections over card state, not state owners.

3. **Inspectable Semantics**
   A card can describe:
   - what it is (metadata)
   - what it depends on (inputs)
   - what it emits (outputs)
   - how it fails (failure modes)

4. **Activation is Explicit**
   Activation is an operator, not an incidental navigation event.

### Minimal Contract Shape (TypeScript)

```ts
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
  // Your spectral fingerprint, energy vector, or other invariant measure.
  readonly zeta?: number[];

  // Introspection
  getFailures?(): CardFailure[];

  // View projection (optional)
  // A card may exist without rendering (headless card / pure operator).
  View?: React.ComponentType<{ card: ZetaCardContract<State> }>;
}
```

### Router Reflection Rule

> **The URL is a reflection of the active card's `id`; navigation is implemented by activating cards.**

This single principle ensures routing stays downstream of semantic state.

### Failure Modes

Cards should check for these states and report them via `getFailures()`:

- **`missing_id`** — card has no stable id
- **`non_reversible_route`** — router can't encode/decode id losslessly
- **`view_owns_state`** — view mutates state that can't be reproduced from card model
- **`activation_side_effect_only`** — activation only changes UI, not runtime state
- **`flat_spectrum`** — spectral energy is too uniform; no dominant modes detected
- **`missing_input`** — required input dependency is not available
- **`disconnected`** — card cannot reach required external service or resource

### Implementation in This Repository

See [src/cardContract.ts](src/cardContract.ts) for the formal interface and validator.

The [Card](src/zetacard.ts) class implements `ZetaCardContract<CardState>` as a reference implementation.

---

## ζ-Card: Omnicard (ζ.card.omni)

**ID:** `ζ.card.omni`  
**Implementation:** [src/cards/omnicard.ts](src/cards/omnicard.ts)

The zero-dimensional attractor: system overview, semantic index, and invocation interface.

### Invariants

- Always resolvable (no dependencies).
- Always renderable (no missing inputs).
- Provides the omnibox query interface.

### Responsibilities

- Surface recent card activations
- Index and search the card registry
- Display system health (π-clock phase, spectral heartbeat resonance)
- Accept and resolve omnibox queries

### Operator

`select(query: string) → CardID | null` — resolve a semantic query to a card identity.

---

## ζ-Card: Normalized Spectral Heartbeat

ID: `ζ.card.spectral.heartbeat`

This repository includes a lightweight React visualization of the card implemented as `src/components/SpectralHeartbeat.tsx`.

Usage (conceptual):

1. Sense a field and compute a spectrum (Fourier, wavelet, learned basis).
2. Normalize the spectral vector to unit length.
3. Compare subsequent normalized vectors with an angular threshold to emit semantic ticks.

React example (live preview wiring found in `src/App.tsx`):

```tsx
<SpectralHeartbeat vector={card.zeta} prevVector={previousZeta} size={120} tickEpsilon={0.15} />
```

Visual affordances:
- Renders the normalized direction on a unit disk (first two components projected).
- Emits a red ring when the angular change exceeds `tickEpsilon` (semantic tick).

Failure modes declared in the card are surfaced by the UI (e.g., flat spectrum shows "Flat spectrum").

````
