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

## Card Contract

Any object satisfying this minimal contract can be routed, indexed, visualized, and composed:

```ts
interface ZetaCard {
  id: string                    // Semantic identity (e.g., "ζ.card.spectral.heartbeat")
  zeta: number[]               // Normalized spectral vector (identity fingerprint)
  invariants: Invariant[]       // Declared structural properties
  failureModes: FailureMode[]   // Observable failure states
  activate(): void              // Entry point for invocation
}

interface Invariant {
  name: string
  validate(card: ZetaCard): boolean
}

interface FailureMode {
  name: string
  severity: 'warning' | 'error'
  detect(card: ZetaCard): boolean
}
```

This contract makes the system compositional: new cards can be added without modifying routing, UI, or registry logic.

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
