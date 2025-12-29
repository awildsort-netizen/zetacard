# Zetacard Routing Architecture

## Overview

Zetacard implements a **card-based routing system** where the URL reflects the active card's identity. Navigation is achieved by activating cards rather than navigating to traditional pages. This document describes how source files connect to the routing system.

## Core Routing Concepts

### Card Identity and Activation

Every card in the system has:
- A **unique Card ID** (e.g., `ζ.card.spectral.heartbeat`)
- An **activation operator** that makes it the "active" card
- **State management** (getState/setState)
- Optional **routing integration** to reflect activation in the URL

**Key Principle**: The URL is a reflection of the active card's `id`. Navigation is implemented by activating cards, not by URL manipulation.

## Source Files and Their Routing Roles

### 1. Entry Point and Main Application

#### `index.html`
- **Role**: Application bootstrap
- **Routing Connection**: Defines the root `<div id="root">` where the React app mounts
- Contains the module script that loads `main.tsx`

#### `src/main.tsx`
- **Role**: React application entry point
- **Routing Connection**: 
  - Creates the React root and renders the `<App />` component
  - No direct routing logic, but initializes the entire application tree
  - Handles root element errors and provides fallback rendering

#### `src/App.tsx`
- **Role**: Main application coordinator and view switcher
- **Routing Connection**:
  - Manages the active card state (`activeCard`, `activeCardData`)
  - Renders either:
    - The main canvas view (when no card is active)
    - A full-screen card view (when a card is activated via Omnibox)
  - Contains event handlers that respond to card activation
  - Implements view-level routing by conditionally rendering based on active card state
- **Key State**:
  ```typescript
  const [activeCard, setActiveCard] = useState<string | null>(null);
  const [activeCardData, setActiveCardData] = useState<CardQueryResult | null>(null);
  ```
- **Route Handling**: When `activeCard` is set, renders full-screen card view; otherwise shows canvas

### 2. Card Contract and Identity System

#### `src/cardContract.ts`
- **Role**: Defines the card contract interface
- **Routing Connection**:
  - Defines `CardID` type (string) - the stable identifier used for routing
  - Defines `CardActivationContext` - context passed when a card is activated
  - Declares `activate(ctx?: CardActivationContext): void` - the core activation operator
  - Establishes that **card identity is stable and global** (Invariant: "id is globally unique and stable across sessions")
- **Key Types**:
  ```typescript
  export type CardID = string;
  export type CardActivationContext = {
    reason?: string; // "user_selected", "route_reflection", "programmatic"
    from?: CardID;    // which card initiated the activation
    timestamp?: number;
  };
  ```

#### `src/cardRegistry.ts`
- **Role**: Single source of truth for all cards in the system
- **Routing Connection**:
  - Maps CardID → CardRegistryEntry (metadata, implementation path, invariants)
  - Provides discovery interface for routing: `getCard(id)`, `listCards()`
  - Used by Omnibox to search and resolve card IDs
- **Registry Structure**:
  ```typescript
  export const CardRegistry: Record<CardID, CardRegistryEntry> = {
    "ζ.card.contract.core": { ... },
    "ζ.card.omni": { ... },
    "ζ.card.spectral.heartbeat": { ... },
    "ζ.card.readme": { ... },
  }
  ```
- **Routing Functions**:
  - `listCards()`: Returns all registered cards
  - `getCard(id)`: Retrieves card metadata by ID
  - `validateReadmeAgainstRegistry()`: Ensures documentation consistency

### 3. Card Implementations

#### `src/zetacard.ts` (Card class)
- **Role**: Reference implementation of the card contract
- **Routing Connection**:
  - Implements the spectral heartbeat card (`ζ.card.spectral.heartbeat`)
  - Provides `activate(ctx)` method that sets internal `_isActive` flag
  - The router would reflect this activation into the URL (not yet implemented)
- **Card Identity**: `id = "ζ.card.spectral.heartbeat"`
- **Activation**: 
  ```typescript
  activate(ctx?: CardActivationContext): void {
    this._isActive = true;
    if (ctx?.reason) {
      console.log(`[${this.id}] activated: ${ctx.reason}`);
    }
  }
  ```

#### `src/cards/omnicard.ts` (Omnicard class)
- **Role**: Zero-dimensional attractor card - the system's home/index
- **Routing Connection**:
  - Card ID: `ζ.card.omni`
  - Always resolvable, always healthy
  - Provides `select(query)` method to resolve queries to card IDs
  - Tracks recent cards for quick navigation
  - Acts as the semantic entry point - "Home is not a page; it is Card Zero"
- **Semantic Routing**: 
  - `select(query: string): string | null` - resolves semantic queries to card IDs
  - `addRecent(cardId)` - tracks navigation history

#### `src/cards/readmeCard.ts` (ReadmeCard class)
- **Role**: Self-healing documentation card
- **Routing Connection**:
  - Card ID: `ζ.card.readme`
  - Introspects the card registry to validate README consistency
  - Ensures documentation reflects actual routing structure
  - Prevents "documentation drift" from actual implementation

### 4. Invocation Interface (Omnibox)

#### `src/components/Omnibox.tsx`
- **Role**: **Primary routing interface** - semantic search and card activation
- **Routing Connection**:
  - Provides keyboard-driven card invocation (Ctrl+K)
  - Searches CardRegistry by ID, title, description, tags
  - Activates cards by calling the parent's `onInvoke` callback
  - Emits instrumentation events for navigation tracking
- **Activation Flow**:
  ```typescript
  1. User searches: searchCards(query) → CardRegistryEntry[]
  2. User selects card
  3. handleActivateCard(card, mode) is called
  4. Emits events: CARD_SELECTED, CARD_OPENED
  5. Calls onInvoke(card.id, mode, cardQueryResult)
  6. Parent (App.tsx) updates activeCard state
  7. UI switches to full-screen card view
  ```
- **Search Scoring**:
  - Exact ID match: +1000
  - ID substring: +100
  - Title match: +50
  - Description match: +25
  - Tag match: +10

### 5. Location and Repository Navigation

#### `src/location.ts` (LocationManager)
- **Role**: Git-like navigation through commit history
- **Routing Connection**:
  - Manages current commit and path
  - Provides `resolve(target)` to parse commit:path references
  - Emits 'moved' events when location changes
  - Could integrate with URL routing to reflect git history in URLs
- **Navigation Methods**:
  - `move(target)`: Navigate to commit/ref/path
  - `descend(relPath)`: Navigate deeper into path
  - `ascend()`: Navigate up one level
- **Event System**: Emits 'moved' and 'commit' events that could drive URL updates

#### `src/zetaRepo.ts` (ZetaRepo)
- **Role**: Git-compatible object store
- **Routing Connection**:
  - Stores card manifests as blobs in a git-like structure
  - Supports refs (branches) that could be exposed in routing
  - Could enable time-travel routing (navigate to specific commits)
  - Provides `readPathAtRef(ref, cardPath)` for content-addressed routing

### 6. Instrumentation and Observability

#### `src/instrumentation.ts` (EventLog)
- **Role**: Navigation and interaction telemetry
- **Routing Connection**:
  - Tracks all navigation events with timestamps and flow IDs
  - Records: SEARCH_QUERY, CARD_SELECTED, CARD_OPENED, CARD_CLOSED
  - Provides debugging and analytics for routing behavior
  - Exposes `window.__zetacard__` for test and debug access
- **Flow Tracking**:
  - Each user journey gets a unique flowId
  - Can reconstruct navigation paths: `getEventsByFlowId(flowId)`
  - Useful for A/B testing and UX optimization

### 7. UI Components (Non-Routing)

The following components don't participate in routing but render within routed views:

#### `src/components/SpectralHeartbeat.tsx`
- Visual representation of card state
- Rendered within App.tsx canvas view

#### `src/components/GIFlowViewer.tsx`
- 3D visualization of GI flow data
- Could become a routable card in the future

#### `src/components/GITract3D.tsx`
- 3D rendering component
- Presentation layer, no routing logic

#### `src/components/PiTimerCard.tsx`
- Timer visualization
- Could become a routable card

### 8. Utilities and Math

These files provide utilities but don't participate in routing:

- `src/math.ts` - Mathematical operations (sigmoid, cosine, etc.)
- `src/meaning.ts` - Semantic utilities
- `src/quadtree.ts` - Spatial indexing for canvas events
- `src/piClock.ts` - Clock implementation
- `src/utils/gi3dMapping.ts` - 3D mapping utilities

## Routing Flow Diagram

```
User Input (Ctrl+K)
       ↓
  Omnibox.tsx (search + select)
       ↓
  CardRegistry (resolve ID)
       ↓
  onInvoke callback
       ↓
  App.tsx (setActiveCard)
       ↓
  Render Full-Screen Card View
       ↓
  (Future: URL update via LocationManager)
```

## Current Routing State

### ✅ Implemented
- Card identity system (CardID, Card contract)
- Card registry (single source of truth)
- Semantic invocation interface (Omnibox)
- View-level routing (App.tsx activeCard state)
- Event instrumentation (EventLog)
- Git-like location management (LocationManager)

### ⚠️ Partial / In Progress
- URL reflection: Cards can be activated, but URL doesn't update
- Browser history: Back/forward buttons don't navigate cards
- Deep linking: Can't bookmark a specific card view
- LocationManager integration: Exists but not connected to Omnibox routing

### 🔮 Future Enhancements
- URL patterns: `/#/card/:cardId` or `/#/:cardId`
- History integration: Browser back/forward should navigate cards
- Commit-based routing: `/#/card/:cardId@:commitHash`
- Path-based routing: `/#/:commit/:path` for git content
- Card-to-card navigation: Cards can activate other cards
- Router component: Centralized routing logic

## Design Principles

1. **Cards are First-Class**: Routes resolve to cards, not pages
2. **Identity is Stable**: CardID is globally unique and persistent
3. **Activation is Explicit**: Only `activate()` makes a card active
4. **State is Separable**: Cards exist independently of React components
5. **Routing is Reflective**: URL should reflect active card, not dictate it
6. **Semantic Navigation**: Search and select, not memorize URLs

## Testing Routing

The test files verify routing behavior:

- `src/__tests__/App.test.tsx` - Tests main app view switching
- `src/__tests__/Omnibox.integration.test.tsx` - Tests Omnibox activation flow
- `src/__tests__/OmniboxFlow.test.tsx` - Tests search and invocation
- `src/__tests__/instrumentation.test.ts` - Tests event tracking
- `src/__tests__/location.test.ts` - Tests LocationManager navigation

## Summary

Zetacard implements a **card-centric routing architecture** where:

1. **Cards are the routing primitive** (not URLs or pages)
2. **CardRegistry is the routing table** (maps IDs to cards)
3. **Omnibox is the router interface** (user-facing navigation)
4. **App.tsx is the route renderer** (switches views based on active card)
5. **instrumentation.ts is the router telemetry** (tracks all navigation)
6. **LocationManager provides git-like navigation** (commits and paths)

The system is designed for **semantic navigation** where users find cards by describing what they want, rather than remembering URLs. The URL will eventually reflect the active card for bookmarking and sharing, but card activation drives the experience, not URL changes.
