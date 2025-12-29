# Zetacard Documentation

Welcome to the Zetacard documentation! This directory contains all project documentation organized by topic.

## 📂 Directory Structure

- **[Getting Started](#getting-started)** — Setup, development, and contribution guides
- **[Architecture](#architecture)** — Design decisions and system architecture
- **[Physics Framework](#physics-framework)** — Mathematical specifications and physics models
- **[Reference](#reference)** — Technical references, implementation details, and reports

## Getting Started

Essential guides for developers:

- **[DEVELOPMENT.md](DEVELOPMENT.md)** — Development environment setup, PowerShell fixes, module system
- **[CONTRIBUTING.md](CONTRIBUTING.md)** — How to contribute, coding standards, PR process
- **[TESTING.md](TESTING.md)** — Testing strategy and event instrumentation
- **[TESTING_E2E.md](TESTING_E2E.md)** — End-to-end testing with Playwright
- **[QUICK_REFERENCE.md](QUICK_REFERENCE.md)** — Fast lookup for common tasks

## Architecture

Design decisions and architectural patterns:

- **[Architecture Decisions](architecture/decisions/README.md)** — All ADRs (Architecture Decision Records)
  - [Card-Based Architecture](architecture/decisions/001-card-based-architecture.md)
  - [Routing as Projection](architecture/decisions/002-routing-as-projection.md)
  - [Contract-First Card Design](architecture/decisions/004-contract-first-card-design.md)

## Physics Framework

Mathematical specifications and physics-informed components:

### Core Documentation
- **[DOCUMENTATION_INDEX_V2.md](physics/DOCUMENTATION_INDEX_V2.md)** — Complete physics documentation map
- **[TWOMANIFOLD_1PLUS1D_SPEC.md](physics/TWOMANIFOLD_1PLUS1D_SPEC.md)** — Complete mathematical specification (v2.0)
- **[FRAMEWORK_COMPLETE.md](physics/FRAMEWORK_COMPLETE.md)** — Integrated framework overview

### Key Physics Concepts
- **[ZETA_GRADIENT_INVARIANT.md](physics/ZETA_GRADIENT_INVARIANT.md)** — Gradient invariant principle (foundational)
- **[CONTRACT_PHYSICS.md](physics/CONTRACT_PHYSICS.md)** — Physics contract model
- **[GRADIENT_TUNNELING_ANALYSIS.md](physics/GRADIENT_TUNNELING_ANALYSIS.md)** — Gradient tunneling analysis

### Version 2.0 Updates
- **[CRITICAL_FIX_SUMMARY.md](physics/CRITICAL_FIX_SUMMARY.md)** — Executive summary of v2.0 fixes
- **[DILATON_GRAVITY_FIX_SUMMARY.md](physics/DILATON_GRAVITY_FIX_SUMMARY.md)** — Detailed explanation of fixes
- **[V1_VS_V2_COMPARISON.md](physics/V1_VS_V2_COMPARISON.md)** — Before/after comparison
- **[MIGRATION_DILATON_v1_TO_v2.md](physics/MIGRATION_DILATON_v1_TO_v2.md)** — Migration guide

### Integration
- **[GRADIENT_SUN_CONTRACT_INTEGRATION.md](physics/GRADIENT_SUN_CONTRACT_INTEGRATION.md)** — Gradient sun contract integration
- **[LEVI_CIVITA_ORIENTATION_SIGNATURE.md](physics/LEVI_CIVITA_ORIENTATION_SIGNATURE.md)** — Orientation signature details

## Reference

Technical references, implementation details, and completion reports:

### Core Components
- **[ANTCLOCK_TECHNICAL_REFERENCE.md](reference/ANTCLOCK_TECHNICAL_REFERENCE.md)** — Antclock solver details
- **[ANTCLOCK_SOLVER_SPEC.md](reference/ANTCLOCK_SOLVER_SPEC.md)** — Antclock solver specification
- **[ANTCLOCK_COMPLETE.md](reference/ANTCLOCK_COMPLETE.md)** — Antclock validation and completion
- **[SUN_CONTRACT.md](reference/SUN_CONTRACT.md)** — Safety contract model
- **[ROUTING_ARCHITECTURE.md](reference/ROUTING_ARCHITECTURE.md)** — Routing system architecture

### Implementation Plans
- **[IMPLEMENTATION_ROADMAP_V2.md](reference/IMPLEMENTATION_ROADMAP_V2.md)** — 7-phase implementation plan
- **[ROADMAP_TO_PRODUCTION.md](reference/ROADMAP_TO_PRODUCTION.md)** — Release planning
- **[PRODUCTION_READINESS.md](reference/PRODUCTION_READINESS.md)** — Production checklist

### Implementation Reports
- **[IMPLEMENTATION_COMPLETE.md](reference/IMPLEMENTATION_COMPLETE.md)** — General implementation completion
- **[IMPLEMENTATION_COMPLETE_ANTCLOCK.md](reference/IMPLEMENTATION_COMPLETE_ANTCLOCK.md)** — Antclock implementation
- **[IMPLEMENTATION_SUN_CONTRACT.md](reference/IMPLEMENTATION_SUN_CONTRACT.md)** — Sun contract implementation
- **[IMPLEMENTATION_CHANGES.md](reference/IMPLEMENTATION_CHANGES.md)** — Change log

### Phase Completion Reports
- **[PHASE_1_COMPLETE.md](reference/PHASE_1_COMPLETE.md)** — Phase 1 completion
- **[PHASE_1_SUMMARY.md](reference/PHASE_1_SUMMARY.md)** — Phase 1 summary
- **[PHASE_2_COMPLETE.md](reference/PHASE_2_COMPLETE.md)** — Phase 2 completion
- **[ORIENTATION_SIGNATURE_COMPLETE.md](reference/ORIENTATION_SIGNATURE_COMPLETE.md)** — Orientation signature completion
- **[MERGE_COMPLETE.md](reference/MERGE_COMPLETE.md)** — Merge completion

### Additional References
- **[LLM_CORRESPONDENCE_SPEC.md](reference/LLM_CORRESPONDENCE_SPEC.md)** — LLM physics bridge specification
- **[README_LLM_PHYSICS_BRIDGE.md](reference/README_LLM_PHYSICS_BRIDGE.md)** — LLM physics bridge README
- **[MANIFOLD_IMPLEMENTATION.md](reference/MANIFOLD_IMPLEMENTATION.md)** — Manifold implementation details
- **[TWOMANIFOLD_COMPLETE_FRAMEWORK.md](reference/TWOMANIFOLD_COMPLETE_FRAMEWORK.md)** — TwoManifold complete framework

### Quality & Testing
- **[CORRECTIONS_APPLIED.md](reference/CORRECTIONS_APPLIED.md)** — Corrections applied log
- **[COHESION_IMPROVEMENTS.md](reference/COHESION_IMPROVEMENTS.md)** — Cohesion improvements
- **[TEST_REPORT.md](reference/TEST_REPORT.md)** — Test reports
- **[TEST_REPORTING_IMPROVEMENTS.md](reference/TEST_REPORTING_IMPROVEMENTS.md)** — Test reporting improvements
- **[SOURCE_FILES_REPORT.md](reference/SOURCE_FILES_REPORT.md)** — Source files report
- **[TASK_COMPLETION_SUMMARY.md](reference/TASK_COMPLETION_SUMMARY.md)** — Task completion summary

## Quick Links

- [Main README](../README.md) — Project overview and quick start
- [Source Code](../src/) — Application source code
- [Tests](../tests/) — Test suite

## Documentation Organization

The documentation has been organized to provide:
1. **Easy discovery** — Clear directory structure by topic
2. **Progressive disclosure** — Start with guides, dive into reference as needed
3. **Cross-references** — Links between related documents
4. **Completeness** — All documentation in one place

## Contributing to Documentation

When adding or updating documentation:
1. Place files in the appropriate directory (guides, architecture, physics, reference)
2. Update this index (README.md) to include new files
3. Update cross-references in related documents
4. Follow the existing naming conventions (UPPERCASE.md)
5. Include a "Last Updated" date at the end of the document

---

**Last Updated:** 2025-12-29
