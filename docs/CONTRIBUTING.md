# Contributing to Zetacard

Thank you for your interest in contributing to Zetacard! This document provides guidelines and information to help you contribute effectively.

## Table of Contents

1. [Code of Conduct](#code-of-conduct)
2. [Getting Started](#getting-started)
3. [Development Workflow](#development-workflow)
4. [Project Architecture](#project-architecture)
5. [Testing Guidelines](#testing-guidelines)
6. [Documentation Guidelines](#documentation-guidelines)
7. [Pull Request Process](#pull-request-process)
8. [Coding Standards](#coding-standards)

---

## Code of Conduct

This project follows a professional and respectful code of conduct. All contributors are expected to:
- Be respectful and inclusive
- Focus on constructive feedback
- Prioritize the project's goals and quality
- Help maintain a welcoming environment

## Getting Started

### Prerequisites

- Node.js 16+ and npm
- Git
- A code editor (VS Code recommended)

### Initial Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/awildsort-netizen/zetacard.git
   cd zetacard
   ```

2. **Install dependencies**
   ```bash
   npm install --legacy-peer-deps
   ```

3. **Verify installation**
   ```bash
   npm run test
   npm run lint
   ```

4. **Start development server**
   ```bash
   npm run dev
   ```
   Visit http://127.0.0.1:5173 to see the app.

### Key Documentation Files

Before contributing, familiarize yourself with:
- **[README.md](README.md)** — Project overview and quick start
- **[DEVELOPMENT.md](DEVELOPMENT.md)** — Development environment setup
- **[DOCUMENTATION_INDEX_V2.md](DOCUMENTATION_INDEX_V2.md)** — Complete documentation map
- **[TESTING.md](TESTING.md)** — Testing strategy and guidelines

## Development Workflow

### Branch Naming

Use descriptive branch names:
- `feature/card-validation` — New features
- `fix/suncontract-dosing` — Bug fixes
- `docs/architecture-adr` — Documentation updates
- `refactor/card-registry` — Code refactoring
- `test/integration-coverage` — Test improvements

### Commit Messages

Follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types:**
- `feat` — New feature
- `fix` — Bug fix
- `docs` — Documentation changes
- `test` — Test additions or corrections
- `refactor` — Code restructuring without behavior change
- `perf` — Performance improvements
- `chore` — Build process or auxiliary tool changes

**Examples:**
```
feat(cards): implement ZetaGradientCardContract validation

Add runtime validation for gradient-aware cards to ensure
they properly implement potential field and gradient methods.

Closes #123
```

```
fix(sunContract): correct exposure ramping calculation

The ramping logic was using incorrect delta calculation.
Changed to properly clamp from current exposure value.

Fixes #456
```

### Development Cycle

1. **Create a branch** from `main`
   ```bash
   git checkout -b feature/your-feature
   ```

2. **Make changes** following our [Coding Standards](#coding-standards)

3. **Quick check** as you work
   ```bash
   npm run check:quick
   ```

4. **Write/update tests**
   ```bash
   npm run test:watch
   ```

5. **Lint your code**
   ```bash
   npm run lint:fix
   ```

6. **Full validation** before pushing
   ```bash
   npm run check:full
   ```

7. **Commit your changes**
   ```bash
   git add .
   git commit -m "feat(scope): description"
   ```

8. **Push and create PR**
   ```bash
   git push origin feature/your-feature
   ```

## Project Architecture

### Core Concepts

Zetacard is organized around **semantic cards**, not pages:

1. **Card Contract** — Minimal interface all cards must implement
2. **Card Registry** — Single source of truth for all cards
3. **Routing as Projection** — URL reflects active card state
4. **Semantic Invocation** — Cards activated by reference, not navigation

### Key Components

```
src/
├── cards/               # Card implementations
│   ├── omnicard.ts     # System overview card
│   ├── sunContract.ts  # Safety contract model
│   └── readmeCard.ts   # Documentation card
├── components/          # React UI components
│   ├── Omnibox.tsx     # Semantic invocation interface
│   └── SpectralHeartbeat.tsx  # Angular change validator
├── zetacard.ts         # Core card model
├── cardContract.ts     # Card interface definitions
├── cardRegistry.ts     # Card discovery and metadata
├── quadtree.ts         # Event routing and resonance
├── piClock.ts          # Deterministic time projection
└── __tests__/          # Test suite
```

### Card Implementation Pattern

All cards must implement `ZetaCardContract`:

```typescript
export class MyCard implements ZetaCardContract<MyState> {
  readonly id = "ζ.card.my-card";
  readonly meta = {
    title: "My Card",
    description: "What this card does",
    tags: ["category", "feature"],
  };
  
  private state: MyState;
  
  getState(): MyState { return {...this.state}; }
  setState(next: MyState): void { this.state = {...next}; }
  activate(ctx?: CardActivationContext): void {
    // Become the active card
  }
  
  getFailures?(): CardFailure[] {
    // Return observable failure states
    return [];
  }
}
```

**Register your card** in `src/cardRegistry.ts`:

```typescript
export const CardRegistry: Record<CardID, CardRegistryEntry> = {
  "ζ.card.my-card": {
    id: "ζ.card.my-card",
    meta: { /* ... */ },
    implementationPath: "src/cards/myCard.ts",
    invariants: [
      "Invariant 1: description",
      "Invariant 2: description",
    ],
    failureModes: [
      { code: "failure_code", message: "Description", severity: "error" },
    ],
  },
  // ... other cards
};
```

## Testing Guidelines

### Test Structure

Tests follow the Arrange-Act-Assert (AAA) pattern:

```typescript
describe("MyCard", () => {
  it("should activate and maintain state", () => {
    // Arrange
    const card = new MyCard();
    const initialState = card.getState();
    
    // Act
    card.activate({ reason: "test" });
    
    // Assert
    expect(card.isActive()).toBe(true);
    expect(card.getState()).not.toBe(initialState);
  });
});
```

### Testing Requirements

1. **Unit Tests** — Test individual functions and methods
2. **Integration Tests** — Test card interactions and lifecycle
3. **Contract Tests** — Verify cards implement ZetaCardContract correctly

### Running Tests

```bash
npm run test              # Run all tests once
npm run test:watch        # Watch mode for development
npm run test:ui           # Visual test UI
npm run test:e2e          # End-to-end tests
```

### Test Coverage Goals

- **Critical paths:** 100% coverage
- **Card implementations:** 90%+ coverage
- **Utility functions:** 85%+ coverage
- **UI components:** 75%+ coverage

## Documentation Guidelines

### Documentation Philosophy

- **Documentation is code** — Keep it in sync with implementation
- **README is a projection** — Generated from CardRegistry, not independent prose
- **Examples over abstractions** — Show, don't just tell
- **Failure modes are first-class** — Document what can go wrong

### Documentation Types

1. **API Documentation** — JSDoc comments in code
2. **Architecture Documentation** — High-level system design (this file, README)
3. **Specification Documentation** — Detailed technical specs (TWOMANIFOLD_1PLUS1D_SPEC.md)
4. **User Documentation** — How to use the system (README, DEVELOPMENT.md)

### Writing Guidelines

- Use **present tense** ("Card activates" not "Card will activate")
- Be **specific** (avoid "etc.", "and so on")
- Include **code examples** for non-obvious concepts
- Link to **related documentation** for context
- Update **DOCUMENTATION_INDEX_V2.md** when adding new docs

### JSDoc Example

```typescript
/**
 * Activates the card, making it the system's active focus.
 * 
 * This is the ONLY way a card should become active. The URL
 * will reflect this activation through the routing system.
 * 
 * @param ctx - Optional context about why/how activation occurred
 * 
 * @example
 * ```typescript
 * card.activate({
 *   reason: "user_selected",
 *   from: "ζ.card.omni",
 *   timestamp: Date.now()
 * });
 * ```
 */
activate(ctx?: CardActivationContext): void {
  // implementation
}
```

## Pull Request Process

### Before Submitting

1. **Run all checks**
   ```bash
   npm run lint
   npm run test
   npm run build
   ```

2. **Update documentation** as needed

3. **Add tests** for new features or bug fixes

4. **Verify visual changes** (take screenshots if UI changed)

### PR Description Template

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix (non-breaking change fixing an issue)
- [ ] New feature (non-breaking change adding functionality)
- [ ] Breaking change (fix or feature causing existing functionality to change)
- [ ] Documentation update

## Testing
- [ ] Unit tests pass
- [ ] Integration tests pass  
- [ ] Manual testing completed

## Documentation
- [ ] Code comments updated
- [ ] README updated (if needed)
- [ ] DOCUMENTATION_INDEX_V2.md updated (if needed)

## Screenshots (if applicable)
[Add screenshots here]

## Related Issues
Closes #123
```

### Review Process

1. **Automated checks** must pass (tests, linting)
2. **Code review** by at least one maintainer
3. **Documentation review** for completeness
4. **Approval** required before merge

## Coding Standards

### TypeScript Guidelines

1. **Use explicit types** — Avoid `any`, prefer specific types
   ```typescript
   // Good
   function process(state: CardState): CardFailure[]
   
   // Avoid
   function process(state: any): any[]
   ```

2. **Immutable patterns** — Don't mutate state directly
   ```typescript
   // Good
   setState(next: State): void {
     this.state = { ...next };
   }
   
   // Avoid
   setState(next: State): void {
     this.state = next; // Direct reference
   }
   ```

3. **Readonly where possible**
   ```typescript
   readonly id = "ζ.card.example";
   readonly meta: CardMeta = { /* ... */ };
   ```

4. **Interface over type aliases** for object shapes
   ```typescript
   // Preferred
   interface CardState {
     field: number;
   }
   
   // Use for unions or primitives
   type CardID = string;
   ```

### React Guidelines

1. **Functional components** with hooks
2. **Props interfaces** for all components
3. **Memoization** for expensive computations
4. **Error boundaries** for failure isolation

### Code Organization

1. **One class/component per file**
2. **Barrel exports** (`index.ts`) for modules
3. **Tests alongside code** (`__tests__` directories)
4. **Constants at top** of file

### Naming Conventions

- **Files:** `camelCase.ts` or `PascalCase.tsx` for components
- **Classes:** `PascalCase`
- **Functions/methods:** `camelCase`
- **Constants:** `UPPER_SNAKE_CASE` or `camelCase` depending on scope
- **Interfaces:** `PascalCase` (no `I` prefix)
- **Types:** `PascalCase`

### Comments

```typescript
// Single-line comments for brief explanations

/**
 * Multi-line JSDoc comments for:
 * - Public APIs
 * - Complex algorithms
 * - Non-obvious behavior
 */
 
// TODO: Future improvements
// FIXME: Known issues that need attention
// NOTE: Important information
```

## Common Patterns

### Error Handling

```typescript
try {
  // Risky operation
  card.activate();
} catch (error) {
  if (error instanceof CardActivationError) {
    // Handle specific error
  } else {
    // Log and rethrow
    console.error("Unexpected error:", error);
    throw error;
  }
}
```

### Async Operations

```typescript
async function fetchCardData(id: CardID): Promise<CardData> {
  try {
    const response = await fetch(`/api/cards/${id}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch: ${response.statusText}`);
    }
    return await response.json();
  } catch (error) {
    console.error(`Error fetching card ${id}:`, error);
    throw error;
  }
}
```

## Getting Help

- **Documentation:** Check [DOCUMENTATION_INDEX_V2.md](DOCUMENTATION_INDEX_V2.md)
- **Issues:** Search existing issues or create a new one
- **Discussions:** Use GitHub Discussions for questions

## License

By contributing, you agree that your contributions will be licensed under the same license as the project.

---

**Last Updated:** 2025-12-29
**Version:** 1.0.0
