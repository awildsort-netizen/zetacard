/**
 * ζ-Card: Two-Manifold Structure (ζ.card.manifold)
 *
 * Complete implementation of the formalized two-manifold system:
 * 
 * Physical Manifold M (agent state, observable motion)
 * Shadow Manifold M̃ (institutional configuration, field structure)
 * Interface Membrane Σ (3D boundary coupling both manifolds)
 * 
 * Based on:
 * - Riemannian geometry (metrics, curvature)
 * - Israel junction conditions
 * - Dissipative membrane dynamics
 * - Global conservation (Bianchi identity)
 * 
 * Connection to ZetaCard:
 * - Physical ↔ card.getState()
 * - Shadow ↔ potentialField(ψ)
 * - Interface ↔ activate(ctx), reshapeField()
 */

// Core types
export type {
  Vec,
  Metric,
  Coordinates,
  Tensor,
  StressEnergyTensor,
  ExtrinsicCurvature,
  PhysicalManifold,
  ShadowManifold,
  InterfaceMembraneState,
  ShearRate,
  ViscosityCoefficients,
  EnergyFlux,
  InterfaceLagrangianParams,
  TwoManifoldSystem,
  NormalVector,
  TangentBasis,
  JumpConditions,
  ConservationCheck,
  OrbitType,
  SpectralSignature
} from './types';

// Geometry operations
export {
  metricDeterminant,
  metricInverse,
  raiseIndex,
  lowerIndex,
  contractIndices,
  christoffelSymbols,
  ricciTensor,
  scalarCurvature,
  einsteinTensor,
  extrinsicCurvatureFromNormal,
  extrinsicCurvatureTrace,
  extrinsicCurvatureSquared,
  inducedMetric,
  normalizeVector,
  vectorType
} from './geometry';

// Interface Lagrangian
export {
  expansionScalar,
  shearRateTensor,
  surfaceTensionTerm,
  bulkViscosityTerm,
  shearViscosityTerm,
  entropyProductionTerm,
  interfaceLagrangian,
  surfaceStressTensor,
  membraneTemperature,
  entropyEvolution,
  energyFluxFromStress,
  thermalRadiation,
  updateMembraneState
} from './interface';

// Junction conditions
export {
  curvatureJump,
  verifyJunctionCondition,
  surfaceStressFromJunction,
  computeJumpConditions,
  projectStressToMembrane,
  normalStress,
  stressDifference
} from './junction';

// Membrane equations
export {
  surfaceStressDivergence,
  momentumBalance,
  raychaudhuriEquation,
  entropyBalanceEquation,
  membraneRicciScalar,
  updateMembraneDynamics,
  computeMembraneForce
} from './membrane';

// Bulk equations
export {
  membraneStressInBulk,
  totalPhysicalStress,
  einsteinConstraint,
  evolveMetric,
  minkowskiMetric,
  flatMetricDerivatives,
  initializePhysicalManifold,
  initializeShadowManifold,
  energyDensity,
  momentumDensity
} from './bulk';

// Conservation laws
export {
  stressDivergence,
  checkConservation,
  bianchiIdentityCheck,
  localConservationCheck,
  energyConservation
} from './conservation';

// Zeta Engine (main integrator)
export type {
  ZetaEngineState,
  IntegrationParams
} from './zetaEngine';

export {
  DEFAULT_INTEGRATION_PARAMS,
  initializeZetaEngine,
  stepZetaEngine,
  runZetaEngine,
  isSystemConserved,
  maxConservationViolation,
  systemEnergy
} from './zetaEngine';

// 1+1D toy model
export type {
  State1D
} from './toy1d';

export {
  minkowski1D,
  initialize1DSystem,
  step1DSystem,
  run1DSimulation,
  constantSource,
  pulsedSource,
  rampSource,
  verify1DConservation
} from './toy1d';

// Spectral signature analysis
export {
  simpleDFT,
  powerSpectrum,
  extractSpectralSignature,
  detectCoercionEvents,
  curvatureGradient,
  classifyOrbit
} from './spectral';
