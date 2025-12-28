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

- `src/zetacard.ts` — Card model, operator T, zeta fingerprints
- `src/App.tsx` — Main UI with two cards and controls
- `src/components/` — React components (Omnibox, π-Clock, etc.)
- `src/piClock.ts` — π-clock deterministic generator
- `src/quadtree.ts` — Event routing and resonance gating
- `src/math.ts` — Mathematical utilities

## Key Features

- **Zeta fingerprints:** Multi-scale Laplacian energy and ζ(s)=Σ(λ_k+eps)^{-s}
- **Overlap blending:** Sigmoid weight on cosine similarity
- **Attractor modes:** Double-click to toggle with smooth interpolation
- **π-Clock timer:** Deterministic signature generator
- **Spectral heartbeat:** Angular change visualization


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
