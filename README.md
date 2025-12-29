Zetacard — Spectral-Dynamical VM prototype

A semantic card-based system with spectral-dynamical features, deterministic time projection, and physics-informed architecture.

## Table of Contents

- [Quick Start](#quick-start)
- [Development](#development)
- [Testing](#testing)
- [Architecture](#architecture)
- [Contributing](#contributing)
- [Documentation](#documentation)

## Quick Start

### Prerequisites

- Node.js 16+ and npm
- Git
- A code editor (VS Code recommended)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/awildsort-netizen/zetacard.git
   cd zetacard
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start dev server**
   ```bash
   npm run dev
   ```

4. **Open the app**
   
   Visit http://127.0.0.1:5173

### Common Commands

```bash
# Development
npm run dev              # Start dev server (http://127.0.0.1:5173)
npm run build            # Build for production
npm run preview          # Preview production build

# Testing
npm run test             # Run unit tests
npm run test:watch       # Watch mode for tests
npm run test:ui          # Visual test UI
npm run test:e2e         # End-to-end tests
npm run test:all         # Run all tests (unit + e2e)

# Code Quality
npm run lint             # Check code
npm run lint:fix         # Auto-fix issues

# Validation
npm run validate:cards   # Validate all cards
npm run check:full       # Full pre-push validation
```

## Development

### Environment Setup

**For Windows Users:**

This project uses ES6 modules exclusively. If you're using PowerShell and encounter npm execution errors:

1. **Quick fix**: Use Command Prompt (cmd.exe) instead of PowerShell
   - VS Code is already configured to use cmd.exe by default
   
2. **PowerShell fix**: Run `setup-powershell.cmd` once as Administrator to set execution policy

3. **Restricted environments**: Use the direct node pattern:
   ```powershell
   node "$env:APPDATA\npm\node_modules\npm\bin\npm-cli.js" run dev
   ```

### Module System

**Important:** This is an ES6 module project. CommonJS is not supported.

✅ **Correct (ES6):**
```typescript
import Component from './Component';
import { helper } from './utils';
export default MyComponent;
```

❌ **Wrong (CommonJS - will break):**
```typescript
const Component = require('./Component');
module.exports = MyComponent;
```

ESLint is configured to catch CommonJS patterns automatically.

### Project Structure

```
zetacard/
├── src/
│   ├── cards/              # Card implementations
│   │   ├── omnicard.ts     # System overview card
│   │   ├── sunContract.ts  # Safety contract model
│   │   └── ...
│   ├── components/         # React UI components
│   │   ├── Omnibox.tsx     # Semantic invocation
│   │   ├── SpectralHeartbeat.tsx  # Angular change validator
│   │   └── ...
│   ├── __tests__/          # Test files
│   ├── zetacard.ts         # Core card model
│   ├── cardContract.ts     # Card interface definitions
│   ├── cardRegistry.ts     # Card discovery and metadata
│   ├── quadtree.ts         # Event routing
│   ├── piClock.ts          # Deterministic time projection
│   └── App.tsx             # Main app composition
├── tests/e2e/              # End-to-end tests
├── docs/                   # Documentation
│   ├── architecture/       # Architecture decisions
│   ├── physics/            # Physics framework docs
│   └── reference/          # Technical references
└── scripts/                # Build and validation scripts
```

### Configuration Files

- `.eslintrc.json` — Enforces ES6 modules, catches CommonJS
- `tsconfig.json` — TypeScript strict mode configuration
- `vite.config.ts` — Vite bundler configuration
- `vitest.config.ts` — Test runner configuration
- `playwright.config.ts` — E2E test configuration
- `.vscode/` — VS Code settings (terminal, tasks, etc.)

## Testing

### Testing Strategy

Zetacard uses **system instrumentation** for testing. The app emits structured events that tests can assert on, providing:

- **Low maintenance** — tests don't break when UI is refactored
- **High visibility** — failures show exactly what the app did
- **Determinism** — no arbitrary timeouts; wait for events instead

### Test API

Tests use the `window.__zetacard__` API:

```typescript
window.__zetacard__ = {
  version: string;           // Instrumentation version
  buildId: string;           // Build timestamp
  getEvents(): Event[];      // All events since clear
  getCurrentIndex(): number; // Current event count
  startFlow(): string;       // Start a new flow
  clearEvents(): void;       // Clear all events
  getErrors(): Event[];      // All ERROR events
  export(): EventLogExport;  // Export full log
}
```

### Writing Tests

**Unit Test Example:**
```typescript
// src/__tests__/myCard.test.ts
import { describe, it, expect } from 'vitest';
import { MyCard } from '../cards/myCard';

describe('MyCard', () => {
  it('maintains immutable state', () => {
    const card = new MyCard();
    const state1 = card.getState();
    const state2 = card.getState();
    expect(state1).not.toBe(state2); // Different references
    expect(state1).toEqual(state2);  // Same values
  });
});
```

**E2E Test Example:**
```typescript
// tests/e2e/search.spec.ts
import { waitForEvent, assertNoErrors } from './helpers/events';

test('search workflow', async ({ page }) => {
  await page.goto('/');
  await page.fill('input[placeholder*="search"]', 'query');
  
  const event = await waitForEvent(page, 'SEARCH_QUERY');
  expect(event.query).toBe('query');
  
  await assertNoErrors(page);
});
```

### Running Tests

```bash
# Unit tests
npm run test              # Run once
npm run test:watch        # Watch mode
npm run test:ui           # Visual UI

# E2E tests  
npm run test:e2e          # Run E2E tests
npm run test:e2e:ui       # Interactive E2E UI

# All tests
npm run test:all          # Run everything
```

## Architecture

### Conceptual Model

Zetacard is organized around **semantic cards**, not pages.

* **Exactly one card is active at a time.** The system maintains a single locus of computation.
* **The URL reflects the active card's ID.** Routing is not navigation — it is a *projection* of card state.
* **The Omnibox activates cards by semantic reference.** Invocation is a first-class operation, not a search.
* **The Omnicard** (`ζ.card.omni`) **is the default attractor and system overview.** It surfaces recent cards, attractor states, and system health (π-clock phase, heartbeat resonance).

UI components are **views over card state**, not the source of truth. A card may exist without being rendered, and a card's identity persists across multiple visualizations.

### Core Principles

1. **Stable Identity** — `id` is globally unique and stable across sessions. If a card is active, the URL must reversibly reflect its `id`.

2. **Separability of Model and View** — A card may exist without any React component mounted. Views are projections over card state, not state owners.

3. **Inspectable Semantics** — A card can describe what it is (metadata), what it depends on (inputs), what it emits (outputs), and how it fails (failure modes).

4. **Activation is Explicit** — Activation is an operator, not an incidental navigation event.

### Key Components

### Key Components

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
- `src/components/Omnibox.tsx` — Semantic invocation interface
- `src/components/SpectralHeartbeat.tsx` — Angular change validator and visualizer

**Utilities:**
- `src/math.ts` — Mathematical foundations (normalization, similarity, spectral measures)
- `src/instrumentation.ts` — Observation and diagnostic hooks

### Architecture Decisions

For detailed architecture decisions and rationale, see:
- [Architecture Decision Records (ADRs)](docs/architecture/decisions/README.md)
- [Card-Based Architecture](docs/architecture/decisions/001-card-based-architecture.md)
- [Routing as Projection](docs/architecture/decisions/002-routing-as-projection.md)
- [Contract-First Card Design](docs/architecture/decisions/004-contract-first-card-design.md)

## Contributing

We welcome contributions! Here's how to get started:

### Development Workflow

1. **Create a branch** from `main`
   ```bash
   git checkout -b feature/your-feature
   ```

2. **Make changes** following our coding standards
   - Use TypeScript with explicit types
   - Follow immutable state patterns
   - Write tests for new features
   - Add JSDoc comments for public APIs

3. **Test your changes**
   ```bash
   npm run lint          # Check code style
   npm run test          # Run unit tests
   npm run test:e2e      # Run E2E tests
   npm run check:full    # Full validation
   ```

4. **Commit with conventional commits**
   ```bash
   git commit -m "feat(cards): add new card type"
   git commit -m "fix(sunContract): correct exposure calculation"
   ```

5. **Push and create PR**
   ```bash
   git push origin feature/your-feature
   ```

### Coding Standards

**TypeScript:**
- Use explicit types, avoid `any`
- Prefer `readonly` for immutable properties
- Use interfaces for object shapes
- Use type aliases for unions/primitives

**React:**
- Functional components with hooks
- Props interfaces for all components
- Memoization for expensive computations
- Error boundaries for failure isolation

**Naming Conventions:**
- Files: `camelCase.ts` or `PascalCase.tsx` for components
- Classes: `PascalCase`
- Functions/methods: `camelCase`
- Constants: `UPPER_SNAKE_CASE` or `camelCase`
- Interfaces: `PascalCase` (no `I` prefix)

### Creating a New Card

1. **Implement the Contract**
   ```typescript
   // src/cards/myCard.ts
   import { ZetaCardContract, CardMeta } from '../cardContract';
   
   export class MyCard implements ZetaCardContract<MyState> {
     readonly id = "ζ.card.my-card";
     readonly meta: CardMeta = {
       title: "My Card",
       description: "What this card does",
       tags: ["category"],
     };
     
     private state: MyState = { value: 0 };
     
     getState(): MyState { return { ...this.state }; }
     setState(next: MyState): void { this.state = { ...next }; }
     activate(ctx?: CardActivationContext): void {
       // Activation logic
     }
   }
   ```

2. **Register the Card** in `src/cardRegistry.ts`

3. **Write Tests** in `src/__tests__/myCard.test.ts`

For more details, see the full [Contributing Guide](docs/CONTRIBUTING.md).

## Documentation

### Getting Started
- [Quick Reference](docs/QUICK_REFERENCE.md) — Fast lookup for common tasks
- [Development Setup](docs/DEVELOPMENT.md) — Environment setup and troubleshooting  
- [Testing Guide](docs/TESTING.md) — Testing strategies and best practices

### Architecture & Design
- [Architecture Decisions](docs/architecture/decisions/README.md) — Why we made key design choices
- [Card Contract Specification](src/cardContract.ts) — Formal card interface definition
- [Routing Architecture](docs/reference/ROUTING_ARCHITECTURE.md) — How routing works as projection

### Physics Framework
- [Documentation Index](docs/physics/DOCUMENTATION_INDEX_V2.md) — Complete physics documentation map
- [TwoManifold 1+1D Specification](docs/physics/TWOMANIFOLD_1PLUS1D_SPEC.md) — Mathematical specification
- [Dilaton Gravity Fix Summary](docs/physics/DILATON_GRAVITY_FIX_SUMMARY.md) — Key physics corrections
- [Framework Overview](docs/physics/FRAMEWORK_COMPLETE.md) — Integrated framework overview

### Implementation & Roadmap
- [Implementation Roadmap v2](docs/reference/IMPLEMENTATION_ROADMAP_V2.md) — Development plan
- [Production Readiness](docs/reference/PRODUCTION_READINESS.md) — Production checklist
- [Roadmap to Production](docs/reference/ROADMAP_TO_PRODUCTION.md) — Release planning

### Reference Documentation
- [Antclock Technical Reference](docs/reference/ANTCLOCK_TECHNICAL_REFERENCE.md) — Antclock solver details
- [LLM Correspondence Spec](docs/reference/LLM_CORRESPONDENCE_SPEC.md) — LLM physics bridge
- [Sun Contract](docs/reference/SUN_CONTRACT.md) — Safety contract model
- [Zeta Gradient Invariant](docs/physics/ZETA_GRADIENT_INVARIANT.md) — Gradient invariant principle

## Key Topics

Key topics covered in detail in the documentation:

- **PowerShell execution policy fixes** — Windows development setup workarounds
- **Module system (ES6 only)** — Why we use ES6 modules exclusively
- **Available commands and scripts** — Complete npm script reference
- **Configuration files** — tsconfig, vite, eslint, and more
- **Troubleshooting** — Common issues and solutions
- **Card validation** — Ensuring cards implement contracts correctly
- **Event instrumentation** — How testing works via events
- **Spectral dynamics** — Mathematical foundations
- **Physics framework** — Dilaton gravity and manifold mathematics

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

## Card Contract (ζ.card.contract.core)

**Purpose:** Define the minimal object grammar required for something to behave as a "card" in Zetacard: routable, indexable, activatable, and introspectable.

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

See [src/cardContract.ts](src/cardContract.ts) for the formal interface and validator.

---

## Notable Cards

### Omnicard (ζ.card.omni)

**Implementation:** [src/cards/omnicard.ts](src/cards/omnicard.ts)

The zero-dimensional attractor: system overview, semantic index, and invocation interface.

**Responsibilities:**
- Surface recent card activations
- Index and search the card registry
- Display system health (π-clock phase, spectral heartbeat resonance)
- Accept and resolve omnibox queries

**Operator:** `select(query: string) → CardID | null` — resolve a semantic query to a card identity.

### Spectral Heartbeat (ζ.card.spectral.heartbeat)

**Implementation:** [src/components/SpectralHeartbeat.tsx](src/components/SpectralHeartbeat.tsx)

Angular change validator and visualizer.

**Usage:**
```tsx
<SpectralHeartbeat 
  vector={card.zeta} 
  prevVector={previousZeta} 
  size={120} 
  tickEpsilon={0.15} 
/>
```

**Visual affordances:**
- Renders the normalized direction on a unit disk (first two components projected)
- Emits a red ring when angular change exceeds `tickEpsilon` (semantic tick)
- Surfaces failure modes (e.g., flat spectrum)

---

## License

See the LICENSE file for details.

---

## Questions or Issues?

- **Documentation:** Check the [docs/](docs/) directory for detailed guides
- **Issues:** [GitHub Issues](https://github.com/awildsort-netizen/zetacard/issues)
- **Discussions:** [GitHub Discussions](https://github.com/awildsort-netizen/zetacard/discussions)

---

**Last Updated:** 2025-12-29  
**Version:** 0.0.0
