# Zetacard Quick Reference Guide

Fast lookup for common tasks and patterns in the Zetacard project.

## Quick Links

- 📚 [Full Documentation Index](DOCUMENTATION_INDEX_V2.md)
- 🏗️ [Architecture Decisions](docs/architecture/decisions/README.md)
- 🤝 [Contributing Guide](CONTRIBUTING.md)
- 🧪 [Testing Guide](TESTING.md)
- 🛠️ [Development Setup](DEVELOPMENT.md)

---

## Common Commands

```bash
# Development
npm run dev              # Start dev server (http://127.0.0.1:5173)
npm run build            # Build for production
npm run preview          # Preview production build

# Testing
npm run test             # Run tests once
npm run test:watch       # Watch mode
npm run test:ui          # Visual test UI
npm run test:e2e         # End-to-end tests
npm run test:all         # Run all tests (unit + e2e)

# Code Quality
npm run lint             # Check code
npm run lint:fix         # Auto-fix issues

# Validation & Checks
npm run validate:cards   # Validate all cards
npm run validate:registry # Check registry consistency
npm run check:quick      # Quick check (changed files only)
npm run check:full       # Full pre-push validation

# Documentation
npm run docs:gen         # Generate documentation stats
```

---

## Creating a New Card

### 1. Implement the Contract

```typescript
// src/cards/myCard.ts
import {
  ZetaCardContract,
  CardMeta,
  CardFailure,
  CardActivationContext,
} from "../cardContract";

export interface MyCardState {
  // Your state fields
  value: number;
}

export class MyCard implements ZetaCardContract<MyCardState> {
  readonly id = "ζ.card.my-card";
  readonly meta: CardMeta = {
    title: "My Card",
    description: "What this card does",
    tags: ["category"],
  };

  private state: MyCardState = { value: 0 };

  getState(): MyCardState {
    return { ...this.state };
  }

  setState(next: MyCardState): void {
    this.state = { ...next };
  }

  activate(ctx?: CardActivationContext): void {
    console.log(`[${this.id}] activated`, ctx);
    // Your activation logic
  }

  getFailures?(): CardFailure[] {
    const failures: CardFailure[] = [];
    // Check for failure conditions
    if (this.state.value < 0) {
      failures.push({
        code: "invalid_value",
        message: "Value must be non-negative",
        severity: "error",
      });
    }
    return failures;
  }
}
```

### 2. Register the Card

```typescript
// src/cardRegistry.ts
export const CardRegistry: Record<CardID, CardRegistryEntry> = {
  // ... existing cards
  
  "ζ.card.my-card": {
    id: "ζ.card.my-card",
    meta: {
      title: "My Card",
      description: "What this card does",
      tags: ["category"],
    },
    implementationPath: "src/cards/myCard.ts",
    invariants: [
      "Invariant 1: description",
      "Invariant 2: description",
    ],
    failureModes: [
      {
        code: "invalid_value",
        message: "Value must be non-negative",
        severity: "error",
      },
    ],
  },
};
```

### 3. Write Tests

```typescript
// src/__tests__/myCard.test.ts
import { describe, it, expect } from "vitest";
import { MyCard } from "../cards/myCard";
import { validateCardContract } from "../cardContract";

describe("MyCard", () => {
  it("implements ZetaCardContract", () => {
    const card = new MyCard();
    const failures = validateCardContract(card);
    expect(failures).toHaveLength(0);
  });

  it("maintains immutable state", () => {
    const card = new MyCard();
    const state1 = card.getState();
    const state2 = card.getState();
    expect(state1).not.toBe(state2); // Different references
    expect(state1).toEqual(state2); // Same values
  });

  it("detects failure modes", () => {
    const card = new MyCard();
    card.setState({ value: -1 });
    const failures = card.getFailures?.() || [];
    expect(failures.length).toBeGreaterThan(0);
  });
});
```

---

## Testing Patterns

### Unit Test Template

```typescript
describe("Component/Function Name", () => {
  it("should do expected behavior", () => {
    // Arrange
    const input = setupTest();
    
    // Act
    const result = performAction(input);
    
    // Assert
    expect(result).toBe(expected);
  });
});
```

### Card Lifecycle Test

```typescript
it("maintains state through activation", () => {
  const card = new MyCard();
  
  // Initial state
  card.setState({ value: 5 });
  expect(card.getState().value).toBe(5);
  
  // Activate
  card.activate({ reason: "test" });
  
  // State preserved
  expect(card.getState().value).toBe(5);
});
```

### Failure Mode Test

```typescript
it("reports expected failures", () => {
  const card = new MyCard();
  
  // Set up failure condition
  card.setState({ value: -1 });
  
  // Check failure detected
  const failures = card.getFailures?.() || [];
  const invalidValue = failures.find(f => f.code === "invalid_value");
  expect(invalidValue).toBeDefined();
  expect(invalidValue?.severity).toBe("error");
});
```

---

## TypeScript Patterns

### Immutable State Updates

```typescript
// ✅ Good: Return new object
getState(): State {
  return { ...this.state };
}

// ✅ Good: Create new object
setState(next: State): void {
  this.state = { ...next };
}

// ❌ Bad: Return reference
getState(): State {
  return this.state; // Direct reference!
}

// ❌ Bad: Mutate directly
setState(next: State): void {
  this.state = next; // Direct assignment!
}
```

### Type-Safe Card Contract

```typescript
// Define your state interface
export interface MyState {
  field1: string;
  field2: number;
}

// Use generic parameter
export class MyCard implements ZetaCardContract<MyState> {
  private state: MyState; // TypeScript enforces this type
  
  getState(): MyState { /* ... */ } // Return type checked
  setState(next: MyState): void { /* ... */ } // Parameter type checked
}
```

---

## React Component Patterns

### Card View Component

```typescript
import React from "react";
import { MyCard, MyCardState } from "../cards/myCard";

interface MyCardViewProps {
  card: MyCard;
}

export function MyCardView({ card }: MyCardViewProps) {
  const state = card.getState();
  
  const handleActivate = () => {
    card.activate({ reason: "user_selected" });
  };
  
  return (
    <div>
      <h1>{card.meta.title}</h1>
      <p>Value: {state.value}</p>
      <button onClick={handleActivate}>Activate</button>
    </div>
  );
}
```

### Using Card State in Hooks

```typescript
function useCardState<T>(card: ZetaCardContract<T>): T {
  const [state, setState] = React.useState(card.getState());
  
  React.useEffect(() => {
    const interval = setInterval(() => {
      setState(card.getState());
    }, 100);
    
    return () => clearInterval(interval);
  }, [card]);
  
  return state;
}

// Usage
function MyComponent({ card }: { card: MyCard }) {
  const state = useCardState(card);
  return <div>{state.value}</div>;
}
```

---

## Common Patterns

### Card Activation

```typescript
// From another card
sourceCard.activate({ reason: "user_selected" });
targetCard.activate({
  reason: "programmatic",
  from: sourceCard.id,
  timestamp: Date.now(),
});

// From UI
const handleClick = () => {
  card.activate({ reason: "user_selected" });
};
```

### Failure Mode Detection

```typescript
// Check for failures
const failures = card.getFailures?.() || [];

// Filter by severity
const errors = failures.filter(f => f.severity === "error");
const warnings = failures.filter(f => f.severity === "warn");

// Display in UI
{failures.map(failure => (
  <div key={failure.code} className={failure.severity}>
    {failure.message}
  </div>
))}
```

### Card Discovery

```typescript
import { CardRegistry, queryCards } from "./cardRegistry";

// Get specific card
const card = CardRegistry["ζ.card.omni"];

// Search cards
const results = queryCards("spectral"); // Returns matching cards

// List all cards
const allCards = Object.values(CardRegistry);
```

---

## Debugging Tips

### Check Card Contract

```typescript
import { validateCardContract } from "./cardContract";

const card = new MyCard();
const failures = validateCardContract(card);
console.log("Contract violations:", failures);
```

### Inspect Card State

```typescript
// In browser console
window.debugCard = (cardId) => {
  const card = CardRegistry[cardId];
  if (!card) return "Card not found";
  
  return {
    id: card.id,
    state: card.getState?.(),
    failures: card.getFailures?.() || [],
    meta: card.meta,
  };
};

// Usage: debugCard("ζ.card.omni")
```

### Test Card in Isolation

```typescript
// Create card without dependencies
const card = new MyCard();

// Test methods directly
console.log("Initial state:", card.getState());
card.activate({ reason: "test" });
console.log("After activation:", card.getState());
console.log("Failures:", card.getFailures?.());
```

---

## File Structure

```
zetacard/
├── src/
│   ├── cards/              # Card implementations
│   │   ├── omnicard.ts
│   │   ├── sunContract.ts
│   │   └── myCard.ts
│   ├── components/         # React components
│   │   └── Omnibox.tsx
│   ├── __tests__/          # Test files
│   │   └── myCard.test.ts
│   ├── cardContract.ts     # Card interface
│   ├── cardRegistry.ts     # Card registration
│   └── App.tsx             # Main app
├── docs/
│   └── architecture/
│       └── decisions/      # ADRs
├── CONTRIBUTING.md         # This guide
└── README.md              # Project overview
```

---

## Style Guidelines (Quick)

### Naming

- **Files:** `camelCase.ts`, `PascalCase.tsx`
- **Classes:** `PascalCase`
- **Functions:** `camelCase`
- **Interfaces:** `PascalCase` (no `I` prefix)
- **Constants:** `UPPER_SNAKE_CASE` or `camelCase`

### Imports

```typescript
// External libraries first
import React from "react";
import { describe, it, expect } from "vitest";

// Internal imports next
import { ZetaCardContract } from "./cardContract";
import { MyCard } from "./cards/myCard";

// Types last
import type { CardState } from "./types";
```

### Comments

```typescript
// Brief single-line explanation

/**
 * Longer explanation for complex logic.
 * Include examples if helpful.
 * 
 * @param param - Description
 * @returns Description
 */
```

---

## Getting Help

- **Documentation:** See [DOCUMENTATION_INDEX_V2.md](DOCUMENTATION_INDEX_V2.md)
- **Issues:** [GitHub Issues](https://github.com/awildsort-netizen/zetacard/issues)
- **Contributing:** See [CONTRIBUTING.md](CONTRIBUTING.md)

---

**Last Updated:** 2025-12-29  
**Version:** 1.0.0
