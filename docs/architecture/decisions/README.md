# Architecture Decision Records

This directory contains Architecture Decision Records (ADRs) for Zetacard.

## What is an ADR?

An Architecture Decision Record (ADR) captures an important architectural decision made along with its context and consequences.

## ADR Format

Each ADR follows this structure:

```markdown
# [Number]. [Title]

Date: YYYY-MM-DD
Status: [Proposed | Accepted | Deprecated | Superseded by ADR-XXX]
Deciders: [Names or roles]

## Context

What is the issue we're facing? What forces are at play?

## Decision

What decision did we make? Be specific and clear.

## Consequences

What becomes easier or more difficult due to this decision?

### Positive
- ...

### Negative
- ...

### Neutral
- ...
```

## Index of ADRs

1. [Card-Based Architecture](001-card-based-architecture.md) — Why cards, not pages
2. [Routing as Projection](002-routing-as-projection.md) — URL reflects card state
3. [TypeScript Only](003-typescript-only.md) — No JavaScript files
4. [Contract-First Card Design](004-contract-first-card-design.md) — All cards implement ZetaCardContract
5. [Gradient Invariant Principle](005-gradient-invariant-principle.md) — Field work over motion work

## How to Create a New ADR

1. **Choose a number** — Next available number in sequence
2. **Use the template** — Copy the format above
3. **Be specific** — Clear decision with concrete consequences
4. **Update this index** — Add your ADR to the list above
5. **Reference in code** — Link to ADR in relevant source files

## Status Meanings

- **Proposed** — Decision under discussion, not yet accepted
- **Accepted** — Decision made and currently in effect
- **Deprecated** — No longer relevant, kept for historical context
- **Superseded** — Replaced by a newer ADR (reference it)

## Examples of Good ADRs

- Describes a significant decision (not trivial choices)
- Explains the context and forces clearly
- States the decision unambiguously
- Lists concrete consequences (both positive and negative)
- References related ADRs or documentation

## Examples of Poor ADRs

- "We'll use React because it's popular" (no context or analysis)
- Vague decision statement
- Missing consequences section
- No date or status information

---

For questions about ADRs, see [CONTRIBUTING.md](../../../CONTRIBUTING.md).
