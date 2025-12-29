# Two-Manifold Structure Implementation

This implementation provides a mathematically rigorous framework for modeling coupled physical-shadow systems with a dissipative interface, as specified in the problem statement.

## Overview

The system consists of three components:

1. **Physical Manifold M**: Represents actual agent state and observable motion
2. **Shadow Manifold M̃**: Represents institutional configuration and field structure  
3. **Interface Membrane Σ**: 3D hypersurface coupling the two manifolds

## Quick Start

### 1+1D Toy Model (Proof of Concept)

The simplest way to understand the system is through the 1+1D toy model:

```typescript
import { 
  initialize1DSystem, 
  run1DSimulation, 
  constantSource 
} from './src/manifold/toy1d';

// Initialize system
const system = initialize1DSystem(
  1.0,  // Surface tension σ
  { eta: 0.1, zeta: 0.05 }  // Viscosity coefficients
);

// Define energy source (constant flux from physical side)
const source = constantSource(
  1.0,  // Physical flux
  0.0   // Shadow flux
);

// Run simulation
const result = run1DSimulation(
  system,
  100,   // Number of steps
  0.01,  // Time step
  source
);

// Inspect results
console.log('Final entropy:', result.system.interface.entropy);
console.log('Final temperature:', result.system.interface.temperature);
console.log('History:', result.history);
```

### Full Zeta Engine

For the complete system with conservation checks:

```typescript
import {
  initialize1DSystem
} from './src/manifold/toy1d';
import {
  initializeZetaEngine,
  runZetaEngine,
  isSystemConserved,
  maxConservationViolation
} from './src/manifold/zetaEngine';

// Initialize
const system = initialize1DSystem();
const engineState = initializeZetaEngine(system);

// Run for multiple steps
const finalState = runZetaEngine(engineState, 100);

// Check conservation
const conserved = isSystemConserved(finalState);
const maxViolation = maxConservationViolation(finalState);

console.log('Energy conserved:', conserved);
console.log('Max violation:', maxViolation);
```

## Mathematical Framework

### Interface Lagrangian

The "Uncharged Dissipative Battery" Lagrangian on Σ:

```
L_Σ = σ h_ab K_ab + η(D_a u^a)² + ζ σ_ab σ^ab + T_Σ s D_a(su^a)
```

Where:
- `σ h_ab K_ab`: Surface tension (geometric)
- `η(D_a u^a)²`: Bulk viscosity (expansion damping)
- `ζ σ_ab σ^ab`: Shear viscosity (shear damping)
- `T_Σ s D_a(su^a)`: Entropy production (dissipation)

### Junction Conditions (Israel)

At the interface Σ:

```
K_ab - K h_ab = 8π S_ab        (physical side)
K̃_ab - K̃ h_ab = -8π S_ab      (shadow side)
```

Note the sign flip: shadow absorbs what physical releases.

### Conservation (Bianchi Identity)

Global energy-momentum conservation:

```
∇_μ T^μν + ∇̃_μ T̃^μν + D_a S^aν = 0
```

What leaves physical bulk enters interface; what leaves interface enters shadow or radiates.

## Connection to ZetaCard

The two-manifold structure maps to ZetaCard concepts:

- **Physical Manifold M** ↔ `card.getState()` (agent card state)
- **Shadow Manifold M̃** ↔ `potentialField(ψ)` (institutional configuration)
- **Interface Σ** ↔ `activate(ctx)`, `reshapeField()` (state transfer operations)

The entropy `s` on Σ encodes:
- How much institutional effort has flowed in
- How much has been dissipated (irreversibly committed)
- Temperature of interface (resistance to change)

## Spectral Signature

Coercion detection via curvature analysis:

```typescript
import {
  extractSpectralSignature,
  detectCoercionEvents
} from './src/manifold/spectral';

// Extract signature from time series
const signature = extractSpectralSignature(
  curvatureHistory,
  metricHistory,
  times
);

console.log('Peak frequency:', signature.peakFrequency);
console.log('Orbit type:', signature.orbitType);  // 'planet', 'comet', etc.
console.log('Coercion score:', signature.coercionScore);

// Detect specific coercion events
const events = detectCoercionEvents(
  curvatureNorms,
  times,
  3.0  // Threshold (multiples of median)
);
```

### Orbit Classification

- **Planet**: Low frequency, stable orbit (smooth field)
- **Comet**: High frequency spikes (rapid transients)
- **Spiky Planet**: Both high frequency and high exposure (unstable)
- **Drift**: Low power (minimal dynamics)

## Example: Approval Queue

In the ZetaCard framework, an approval queue maps as:

- Physical side: queue length `n(t)`, agent capacity `c(t)`
- Shadow side: institutional potential `Φ(n)`, field stiffness `κ = |∇²Φ|`
- Interface:
  - Entropy `s`: Institutional effort sunk into queue
  - Curvature `K`: Steepness of potential
  - Viscosity `η`: Queue stickiness

Predictions:
- High `n`, low `κ`: Entropy increases (effort paid, agents move freely)
- High `κ`, forced decrease in `n`: `K` jumps, `s` spikes (coercion signature)

## API Reference

### Core Modules

- **`types.ts`**: Type definitions for all manifold structures
- **`geometry.ts`**: Riemannian geometry operations (metrics, curvature)
- **`interface.ts`**: Interface Lagrangian and membrane dynamics
- **`junction.ts`**: Israel junction conditions
- **`membrane.ts`**: Three membrane PDEs (momentum, expansion, entropy)
- **`bulk.ts`**: Einstein equations for both manifolds
- **`conservation.ts`**: Conservation law verification
- **`zetaEngine.ts`**: Main integration engine
- **`toy1d.ts`**: 1+1D simplified model
- **`spectral.ts`**: Spectral signature analysis

### Key Functions

#### Geometry
- `metricInverse(g)`: Compute g^μν from g_μν
- `christoffelSymbols(g, dg)`: Compute Γ^λ_μν
- `einsteinTensor(R, g)`: Compute G_μν
- `extrinsicCurvature(...)`: Compute K_ab on hypersurface

#### Interface
- `interfaceLagrangian(...)`: Compute L_Σ
- `entropyEvolution(...)`: Compute ṡ
- `surfaceStressTensor(...)`: Compute S_ab

#### Engine
- `stepZetaEngine(state, params)`: Single timestep
- `runZetaEngine(state, steps, params)`: Multiple timesteps
- `checkConservation(system, ...)`: Verify Bianchi identity

## Testing

Run the comprehensive test suite:

```bash
npm test -- manifold
```

All 33 tests cover:
- Metric operations (14 tests)
- Interface Lagrangian (10 tests)
- 1+1D integration (9 tests)

## Implementation Status

✅ Complete and tested:
- Core geometry operations
- Interface Lagrangian with viscosity and entropy
- Junction conditions (Israel formalism)
- Membrane PDEs (3 coupled equations)
- Bulk Einstein equations
- Conservation checks
- 1+1D toy model
- Spectral signature analysis
- Comprehensive test suite

## Next Steps

To integrate with ZetaCard:

1. Map card states to physical manifold tensors
2. Define institutional potential field for shadow manifold
3. Connect activation events to membrane fluxes
4. Implement spectral analysis in card lifecycle
5. Add visualization of curvature evolution

## References

- Problem statement: "Formalized two-manifold structure with metrics"
- Interface Lagrangian: "Uncharged Dissipative Battery"
- Junction conditions: Israel formalism for timelike boundaries
- Conservation: Bianchi identity in coupled systems
