/**
 * zeta_contract_scoring.ts
 *
 * Drop-in TypeScript module implementing the "contract-as-field" model:
 *  - deterministic normalization from raw log features -> x ∈ R^8
 *  - canonical Phi_c(x), grad, force (with optional bounding)
 *  - stable finite-difference velocity / acceleration from irregular ticks (antclock)
 *  - per-agent capacity profile schema and defaults
 *  - harm, exposure, G-force, Zeta score, planet/comet classifier
 *
 * Usage:
 *  - Build Event[] per agent (time-ordered) where timestamps are "antclock" ticks (monotonic)
 *  - Call scoreAgentFromEvents(...) to get { H, Gpeak, E, zeta, classification, timeline }
 *
 * Feature ordering (canonical Vec length 8):
 *  idx  name (raw)         notes / accepted raw range
 *  0    money_slack        months of slack (0..24 suggested)
 *  1    time_pressure      0..1
 *  2    obligations        count (0..50 suggested)
 *  3    uncertainty        0..1
 *  4    power_asym         0..1
 *  5    legal_risk         0..1
 *  6    switching_cost     0..1
 *  7    cognitive_load     0..1
 *
 * Exports:
 *  - scoreAgentFromEvents(events, agentProfile?, phiParams?, opts?)
 *  - defaultPhiParams, defaultAgentProfiles
 *
 * Notes:
 *  - All numeric defaults are conservative; tune to your dataset.
 *  - "antclock" ticks are treated as generic monotonic units; dtMin used for stability.
 */

type Vec = number[]; // length 8

// Event is a single timestamped snapshot for an agent or contract
export type Event = {
  t: number; // antclock tick (monotonic)
  features: {
    money_slack: number;
    time_pressure: number;
    obligations: number;
    uncertainty: number;
    power_asym: number;
    legal_risk: number;
    switching_cost: number;
    cognitive_load: number;
  };
  involved?: number; // optional involvement weight [0,1] for exposure
};

export type PhiParams = {
  w: Vec; // length 8
  alpha: Vec; // length 8
  mu: Vec; // length 8
  w_mp: number;
  w_to: number;
  C_cliff: number;
  theta_legal: number;
  q: number;
  Fmax?: number | null; // if provided, saturate forces at this magnitude
};

export type AgentProfile = {
  id?: string;
  // capacity constants
  c0: number;
  c1: number;
  c2: number;
  tau: number; // timescale in same units as t
  // harm params
  G0: number;
  p: number;
  alpha: number;
  beta: number;
  theta6: number;
  r: number;
  // zeta params
  lambda1: number;
  lambda2: number;
  s: number;
  // per-dimension accel scaling (sigma_a)
  sigmaA?: Vec;
  // optional label / role
  role?: string;
};

export type ScoreResult = {
  H: number;
  Gpeak: number;
  E: number;
  zeta: number;
  classification: "comet" | "planet" | "spiky_planet" | "drift";
  timeline: {
    t: number;
    x: Vec;
    v: Vec;
    a: Vec;
    amag: number;
    G: number;
    harm: number;
    forceMag: number;
  }[];
};

// ----------------------------- numerics -----------------------------

const softplus = (z: number): number =>
  // numerically stable softplus
  Math.log1p(Math.exp(-Math.abs(z))) + Math.max(z, 0);

const sigmoid = (z: number): number => 1 / (1 + Math.exp(-z));
const relu = (z: number): number => (z > 0 ? z : 0);

const dot = (a: Vec, b: Vec) => a.reduce((s, ai, i) => s + ai * b[i], 0);
const l2 = (v: Vec) => Math.sqrt(dot(v, v));
const sub = (a: Vec, b: Vec): Vec => a.map((ai, i) => ai - b[i]);
const scale = (a: Vec, c: number): Vec => a.map(ai => ai * c);
const zeros = (n = 8): Vec => Array(n).fill(0);

// ----------------------------- normalization -----------------------------

// Deterministic normalization from raw features -> x in [0,1] (mostly)
// Use log1p for money_slack and obligations to keep tails controlled.
type NormalizationConfig = {
  money_max: number; // months cap
  obligations_max: number; // cap for logging
};

const defaultNorm: NormalizationConfig = {
  money_max: 24,
  obligations_max: 50,
};

export function normalizeEventToVec(
  e: Event,
  norm: NormalizationConfig = defaultNorm
): Vec {
  const f = e.features;
  // money: log1p(months)/log1p(max)
  const money = Math.min(Math.max(f.money_slack, 0), norm.money_max);
  const x0 = Math.log1p(money) / Math.log1p(norm.money_max);

  const time_pressure = clamp01(f.time_pressure);
  const obligations = Math.log1p(Math.min(Math.max(f.obligations, 0), norm.obligations_max)) /
    Math.log1p(norm.obligations_max);
  const uncertainty = clamp01(f.uncertainty);
  const power_asym = clamp01(f.power_asym);
  const legal_risk = clamp01(f.legal_risk);
  const switching_cost = clamp01(f.switching_cost);
  const cognitive_load = clamp01(f.cognitive_load);

  return [
    x0,
    time_pressure,
    obligations,
    uncertainty,
    power_asym,
    legal_risk,
    switching_cost,
    cognitive_load,
  ];
}

function clamp01(x: number): number {
  if (Number.isNaN(x) || x === Infinity || x === -Infinity) return 0;
  return Math.max(0, Math.min(1, x));
}

// ----------------------------- Phi, gradient, force -----------------------------

export const defaultPhiParams: PhiParams = {
  w: [1, 1.2, 1.1, 0.8, 1.5, 2.0, 0.8, 0.9],
  alpha: Array(8).fill(5),
  mu: Array(8).fill(0.5),
  w_mp: 2.0,
  w_to: 1.5,
  C_cliff: 5.0,
  theta_legal: 0.8,
  q: 2,
  Fmax: null, // null => no saturation
};

export function phi_c(x: Vec, p: PhiParams = defaultPhiParams): number {
  let base = 0;
  for (let i = 0; i < 8; i++) {
    const z = p.alpha[i] * (x[i] - p.mu[i]);
    base += p.w[i] * softplus(z);
  }
  const inter = p.w_mp * x[0] * x[4] + p.w_to * x[1] * x[2];
  const cliff = p.C_cliff * Math.pow(relu(x[5] - p.theta_legal), p.q);
  return base + inter + cliff;
}

export function grad_phi_c(x: Vec, p: PhiParams = defaultPhiParams): Vec {
  const g: Vec = zeros(8);
  for (let i = 0; i < 8; i++) {
    const z = p.alpha[i] * (x[i] - p.mu[i]);
    g[i] += p.w[i] * p.alpha[i] * sigmoid(z);
  }
  // interactions
  g[0] += p.w_mp * x[4];
  g[4] += p.w_mp * x[0];
  g[1] += p.w_to * x[2];
  g[2] += p.w_to * x[1];
  // cliff term (legal risk is x[5])
  const d = x[5] - p.theta_legal;
  if (d > 0) g[5] += p.C_cliff * p.q * Math.pow(d, p.q - 1);
  return g;
}

export function force_c(x: Vec, p: PhiParams = defaultPhiParams): Vec {
  const g = grad_phi_c(x, p);
  const F = scale(g, -1);
  if (p.Fmax && p.Fmax > 0) return boundedForce(F, p.Fmax);
  return F;
}

export function boundedForce(F: Vec, Fmax: number): Vec {
  const mag = l2(F);
  if (mag <= 1e-12) return F;
  const scaleFactor = 1 / (1 + mag / Fmax);
  return scale(F, scaleFactor);
}

// ----------------------------- kinematics -----------------------------

type KinematicsOptions = {
  dtMin?: number; // minimum dt to avoid blowups
  emaRho?: number | null; // if provided, smooth x with EMA rho in [0,1)
};

const defaultKinematicsOpts: KinematicsOptions = {
  dtMin: 1e-6,
  emaRho: null,
};

function applyEMA(xs: Vec[], rho: number): Vec[] {
  if (!xs.length) return [];
  const out: Vec[] = [];
  let s = xs[0].slice();
  out.push(s.slice());
  for (let k = 1; k < xs.length; k++) {
    s = s.map((si, i) => rho * si + (1 - rho) * xs[k][i]);
    out.push(s.slice());
  }
  return out;
}

export function computeVA(
  times: number[],
  xs: Vec[],
  opts: KinematicsOptions = defaultKinematicsOpts
): { v: Vec[]; a: Vec[] } {
  const dtMin = opts.dtMin ?? 1e-6;
  let xsUse = xs;
  if (opts.emaRho != null && opts.emaRho > 0 && opts.emaRho < 1) {
    xsUse = applyEMA(xs, opts.emaRho);
  }

  const N = xsUse.length;
  const v: Vec[] = Array(N).fill(null).map(() => zeros(8));
  const a: Vec[] = Array(N).fill(null).map(() => zeros(8));

  for (let k = 1; k < N; k++) {
    const dt = Math.max(times[k] - times[k - 1], dtMin);
    v[k] = scale(sub(xsUse[k], xsUse[k - 1]), 1 / dt);
  }
  for (let k = 2; k < N; k++) {
    const dt = Math.max(times[k] - times[k - 1], dtMin);
    a[k] = scale(sub(v[k], v[k - 1]), 1 / dt);
  }
  return { v, a };
}

export function accelMagnitude(a: Vec, sigmaA?: Vec): number {
  if (!sigmaA) return l2(a);
  let sum = 0;
  for (let i = 0; i < 8; i++) {
    const s = sigmaA[i] || 1;
    sum += Math.pow(a[i] / s, 2);
  }
  return Math.sqrt(sum);
}

// ----------------------------- capacity / harm / scoring -----------------------------

export const defaultAgentProfiles: { [key: string]: AgentProfile } = {
  org_default: {
    c0: 0.25,
    c1: 1.0,
    c2: 0.5,
    tau: 7, // antclock = days by default
    G0: 1.0,
    p: 2.0,
    alpha: 1.0,
    beta: 5.0,
    theta6: 0.8,
    r: 3,
    lambda1: 0.2,
    lambda2: 0.5,
    s: 2,
    sigmaA: undefined,
    role: "org_default",
  },
  small_startup: {
    c0: 0.1,
    c1: 0.6,
    c2: 0.3,
    tau: 1,
    G0: 1.0,
    p: 2.0,
    alpha: 1.0,
    beta: 6.0,
    theta6: 0.7,
    r: 3,
    lambda1: 0.25,
    lambda2: 0.6,
    s: 2,
    sigmaA: undefined,
    role: "small_startup",
  },
  emergency: {
    c0: 0.05,
    c1: 0.3,
    c2: 0.1,
    tau: 0.25,
    G0: 1.0,
    p: 2.0,
    alpha: 1.2,
    beta: 8.0,
    theta6: 0.7,
    r: 3,
    lambda1: 0.3,
    lambda2: 0.75,
    s: 2,
    sigmaA: undefined,
    role: "emergency",
  },
};

export type ScoreOptions = {
  phiParams?: PhiParams;
  agentProfile?: AgentProfile;
  norm?: NormalizationConfig;
  kinOpts?: KinematicsOptions;
  classifyE_low?: number; // numeric thresholds for exposure classification (defaults small)
  classifyE_high?: number;
};

const defaultScoreOpts: ScoreOptions = {
  phiParams: defaultPhiParams,
  agentProfile: defaultAgentProfiles.org_default,
  norm: defaultNorm,
  kinOpts: defaultKinematicsOpts,
  classifyE_low: 1e-3,
  classifyE_high: 1e2,
};

/**
 * scoreAgentFromEvents
 *
 * events: chronological Event[] for a single agent (or agent-specific filtered)
 * returns ScoreResult with timeline and summary metrics
 */
export function scoreAgentFromEvents(
  events: Event[],
  opts: ScoreOptions = {}
): ScoreResult {
  if (!events || events.length < 3)
    throw new Error("Need at least 3 events (to compute v and a)");

  const cfg: ScoreOptions = { ...defaultScoreOpts, ...opts };
  const phiParams = cfg.phiParams!;
  const agent = cfg.agentProfile!;
  const norm = cfg.norm!;
  const kinOpts = cfg.kinOpts!;

  // Prepare time vector and x vectors
  const times = events.map(e => e.t);
  const xs: Vec[] = events.map(e => normalizeEventToVec(e, norm));
  const involvedArr = events.map(e => (e.involved == null ? 1 : clamp01(e.involved)));

  // kinematics
  const { v, a } = computeVA(times, xs, kinOpts);

  // accumulate
  let H = 0;
  let Gpeak = 0;
  let E = 0;
  const timeline: ScoreResult["timeline"] = [];

  for (let k = 2; k < xs.length; k++) {
    const dt = Math.max(times[k] - times[k - 1], kinOpts.dtMin ?? 1e-6);
    const x = xs[k];
    const amag = accelMagnitude(a[k], agent.sigmaA);
    // capacity per-step
    const C = agent.c0 + agent.c1 * x[0] + agent.c2 * (1 - x[7]);
    const g = C / Math.max(agent.tau, 1e-9);
    const G = amag / Math.max(g, 1e-9);
    if (G > Gpeak) Gpeak = G;

    const riskCliff = Math.pow(relu(x[5] - agent.theta6), agent.r);
    const harm = agent.alpha * Math.pow(relu(G - agent.G0), agent.p) + agent.beta * riskCliff;
    H += harm * dt;

    const w = involvedArr[k] ?? 1;
    const F = force_c(x, phiParams);
    const forceMag = l2(F);
    E += w * forceMag * dt;

    timeline.push({
      t: times[k],
      x,
      v: v[k],
      a: a[k],
      amag,
      G,
      harm,
      forceMag,
    });
  }

  const zeta = Math.exp(
    -agent.lambda1 * H - agent.lambda2 * Math.pow(relu(Gpeak - agent.G0), agent.s)
  );

  // classification with dataset-agnostic defaults; patrons should tune classifyE_* by percentiles
  const E_low = cfg.classifyE_low!;
  const E_high = cfg.classifyE_high!;
  let classification: ScoreResult["classification"] = "drift";
  if (Gpeak >= 3 && E <= E_low) classification = "comet";
  else if (E >= E_high && Gpeak <= 2) classification = "planet";
  else if (Gpeak >= 3 && E >= E_high) classification = "spiky_planet";
  else classification = "drift";

  return { H, Gpeak, E, zeta, classification, timeline };
}

// ----------------------------- utilities / example -----------------------------

/**
 * Example usage:
 *
 * const events: Event[] = [
 *   { t: 0, features: { money_slack: 6, time_pressure: 0.2, obligations: 3, uncertainty: 0.1, power_asym: 0.1, legal_risk: 0.0, switching_cost: 0.2, cognitive_load: 0.1 } },
 *   { t: 1, features: { money_slack: 4, time_pressure: 0.5, obligations: 6, uncertainty: 0.2, power_asym: 0.2, legal_risk: 0.0, switching_cost: 0.3, cognitive_load: 0.2 } },
 *   ...
 * ];
 *
 * const res = scoreAgentFromEvents(events, {
 *   agentProfile: defaultAgentProfiles.small_startup,
 *   phiParams: defaultPhiParams,
 *   kinOpts: { dtMin: 1e-6, emaRho: 0.7 },
 *   classifyE_low: 0.1,
 *   classifyE_high: 20
 * });
 *
 * console.log(res.zeta, res.Gpeak, res.H, res.classification);
 */

// small helpers exported for integration testing / external instrumentation
export { defaultNorm as DEFAULT_NORM };
