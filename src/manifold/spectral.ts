/**
 * ζ-Card: Spectral Signature Analysis (ζ.card.manifold.spectral)
 *
 * Analyze curvature evolution for coercion signatures:
 * 
 * ζ = FFT(log K_ab K^ab(t))
 * 
 * Curvature spiking → field discontinuities → coercion signatures
 * 
 * Classification:
 * - Low frequency, low amplitude: Planet (stable orbit)
 * - High frequency spikes: Comet (rapid transients)
 * - Both high: Spiky planet (unstable)
 */

import type { SpectralSignature, OrbitType, ExtrinsicCurvature, Metric } from './types';
import { extrinsicCurvatureSquared } from './geometry';

/**
 * Compute FFT of a real-valued signal
 * 
 * Simplified DFT implementation (O(n²))
 * 
 * NOTE: For production use with large datasets, consider integrating
 * a proper FFT library (e.g., fft.js, fftw.js) for O(n log n) complexity.
 * This implementation is adequate for small-scale analysis and testing.
 */
export function simpleDFT(signal: number[]): { real: number[]; imag: number[] } {
  const N = signal.length;
  const real: number[] = Array(N).fill(0);
  const imag: number[] = Array(N).fill(0);
  
  for (let k = 0; k < N; k++) {
    for (let n = 0; n < N; n++) {
      const angle = (2 * Math.PI * k * n) / N;
      real[k] += signal[n] * Math.cos(angle);
      imag[k] += signal[n] * -Math.sin(angle);
    }
  }
  
  return { real, imag };
}

/**
 * Compute power spectrum |F(ω)|²
 */
export function powerSpectrum(fft: { real: number[]; imag: number[] }): number[] {
  return fft.real.map((r, i) => r * r + fft.imag[i] * fft.imag[i]);
}

/**
 * Extract spectral signature from curvature history
 * 
 * @param curvatureHistory - Time series of extrinsic curvature tensors
 * @param metricHistory - Corresponding induced metrics
 * @param times - Time stamps
 * @returns Spectral signature with FFT and classification
 */
export function extractSpectralSignature(
  curvatureHistory: ExtrinsicCurvature[],
  metricHistory: Metric[],
  times: number[]
): SpectralSignature {
  if (curvatureHistory.length === 0) {
    throw new Error('Empty curvature history');
  }
  
  // Compute K_ab K^ab(t) time series
  const curvatureNorms = curvatureHistory.map((K, i) => 
    extrinsicCurvatureSquared(K, metricHistory[i])
  );
  
  // Take logarithm (with regularization to avoid log(0))
  const logCurvature = curvatureNorms.map(norm => 
    Math.log(Math.max(norm, 1e-10))
  );
  
  // Compute FFT
  const fft = simpleDFT(logCurvature);
  const power = powerSpectrum(fft);
  
  // Compute frequencies (assuming uniform sampling)
  const dt = times.length > 1 ? times[1] - times[0] : 1.0;
  const frequencies = power.map((_, k) => k / (times.length * dt));
  
  // Find peak frequency (ignore DC component at k=0)
  let peakIdx = 1;
  for (let i = 2; i < power.length / 2; i++) {
    if (power[i] > power[peakIdx]) {
      peakIdx = i;
    }
  }
  const peakFrequency = frequencies[peakIdx];
  
  // Classify orbit based on spectrum
  const orbitType = classifyFromSpectrum(power, frequencies);
  
  // Coercion score: high frequency energy relative to total
  const highFreqThreshold = 0.5; // Half Nyquist frequency
  const highFreqPower = power
    .slice(0, power.length / 2)
    .reduce((sum, p, i) => {
      return frequencies[i] > highFreqThreshold ? sum + p : sum;
    }, 0);
  const totalPower = power.slice(0, power.length / 2).reduce((sum, p) => sum + p, 0);
  const coercionScore = totalPower > 0 ? highFreqPower / totalPower : 0;
  
  return {
    spectrum: power,
    frequencies,
    peakFrequency,
    orbitType,
    coercionScore
  };
}

/**
 * Classify orbit type from power spectrum
 * 
 * - Planet: Low frequency dominant (< 0.1)
 * - Comet: High frequency dominant (> 0.5)
 * - Spiky planet: Broad spectrum
 * - Drift: Low total power
 */
function classifyFromSpectrum(
  power: number[],
  frequencies: number[]
): OrbitType {
  const halfLen = Math.floor(power.length / 2);
  const totalPower = power.slice(0, halfLen).reduce((sum, p) => sum + p, 0);
  
  if (totalPower < 1e-6) {
    return 'drift';
  }
  
  // Compute weighted average frequency
  let avgFreq = 0;
  for (let i = 0; i < halfLen; i++) {
    avgFreq += frequencies[i] * power[i];
  }
  avgFreq /= totalPower;
  
  // Compute frequency variance (broadness of spectrum)
  let variance = 0;
  for (let i = 0; i < halfLen; i++) {
    variance += power[i] * Math.pow(frequencies[i] - avgFreq, 2);
  }
  variance /= totalPower;
  
  const isBroadSpectrum = variance > 0.1;
  const isHighFreq = avgFreq > 0.5;
  const isLowFreq = avgFreq < 0.1;
  
  if (isBroadSpectrum && isHighFreq) {
    return 'spiky_planet';
  } else if (isHighFreq) {
    return 'comet';
  } else if (isLowFreq) {
    return 'planet';
  } else {
    return 'drift';
  }
}

/**
 * Detect coercion events from curvature spikes
 * 
 * @param curvatureNorms - Time series of ||K||²
 * @param times - Time stamps
 * @param threshold - Multiple of median to count as spike
 * @returns Array of coercion event times
 */
export function detectCoercionEvents(
  curvatureNorms: number[],
  times: number[],
  threshold: number = 3.0
): number[] {
  if (curvatureNorms.length === 0) return [];
  
  // Compute median
  const sorted = [...curvatureNorms].sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)];
  
  // Find spikes above threshold * median
  const coercionTimes: number[] = [];
  for (let i = 0; i < curvatureNorms.length; i++) {
    if (curvatureNorms[i] > threshold * median) {
      coercionTimes.push(times[i]);
    }
  }
  
  return coercionTimes;
}

/**
 * Compute curvature gradient (rate of change)
 * 
 * High gradient → rapid field changes → potential coercion
 */
export function curvatureGradient(
  curvatureNorms: number[],
  times: number[]
): number[] {
  if (curvatureNorms.length < 2) return [];
  
  const gradients: number[] = [];
  for (let i = 1; i < curvatureNorms.length; i++) {
    const dt = times[i] - times[i - 1];
    const dK = curvatureNorms[i] - curvatureNorms[i - 1];
    gradients.push(dK / Math.max(dt, 1e-10));
  }
  
  return gradients;
}

/**
 * Classify orbit from exposure and peak metrics
 * (Alternative to spectral classification)
 */
export function classifyOrbit(
  exposure: number,
  peakCurvature: number,
  exposureLow: number,
  exposureHigh: number
): OrbitType {
  const isHighCurv = peakCurvature >= 3;
  const isLowCurv = peakCurvature <= 2;
  const isHighExp = exposure >= exposureHigh;
  const isLowExp = exposure <= exposureLow;
  
  if (isHighCurv && isLowExp) return 'comet';
  if (isHighExp && isLowCurv) return 'planet';
  if (isHighExp && isHighCurv) return 'spiky_planet';
  return 'drift';
}
