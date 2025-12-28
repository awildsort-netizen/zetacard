type Vector = Map<string, number>;

function tokenize(text: string) {
  return text
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
}

function normalize(v: Vector) {
  let sum = 0;
  for (const w of v.values()) sum += w;
  if (sum === 0) return v;
  const out = new Map<string, number>();
  for (const [k, val] of v.entries()) out.set(k, val / sum);
  return out;
}

export class Card {
  id: string;
  partial: string;
  meaning: Vector;
  isUndefined: boolean;

  constructor(id: string, partial = "") {
    this.id = id;
    this.partial = partial;
    this.meaning = new Map();
    this.isUndefined = partial.trim() === "";
    if (!this.isUndefined) this.ingest(partial);
  }

  ingest(text: string) {
    this.partial = text;
    this.isUndefined = false;
    const tokens = tokenize(text);
    const v = new Map<string, number>();
    for (const t of tokens) v.set(t, (v.get(t) || 0) + 1);
    this.meaning = normalize(v);
  }

  mergePartial(text: string) {
    // absorb new partial text conservatively
    const tokens = tokenize(text);
    const counts = new Map<string, number>(this.meaning);
    for (const t of tokens) counts.set(t, (counts.get(t) || 0) + 0.5);
    this.meaning = normalize(counts);
    this.partial = this.partial + (this.partial ? " " : "") + text;
    this.isUndefined = false;
  }

  stabilize(neighbors: Card[], alpha = 0.15) {
    if (neighbors.length === 0) return;
    const mean = new Map<string, number>();
    for (const n of neighbors) {
      for (const [k, v] of n.meaning.entries()) mean.set(k, (mean.get(k) || 0) + v);
    }
    for (const k of mean.keys()) mean.set(k, (mean.get(k) || 0) / neighbors.length);
    // move this.meaning toward mean by alpha
    const merged = new Map<string, number>();
    const keys = new Set<string>([...this.meaning.keys(), ...mean.keys()]);
    for (const k of keys) {
      const a = this.meaning.get(k) || 0;
      const b = mean.get(k) || 0;
      merged.set(k, a * (1 - alpha) + b * alpha);
    }
    this.meaning = normalize(merged);
  }

  similarity(other: Card) {
    // cosine similarity for sparse vectors
    let dot = 0;
    let na = 0;
    let nb = 0;
    for (const [k, v] of this.meaning.entries()) {
      na += v * v;
      const ov = other.meaning.get(k) || 0;
      dot += v * ov;
    }
    for (const v of other.meaning.values()) nb += v * v;
    if (na === 0 || nb === 0) return 0;
    return dot / Math.sqrt(na * nb);
  }
}

export function stabilizeMany(cards: Card[], rounds = 3, alpha = 0.15) {
  for (let i = 0; i < rounds; i++) {
    for (const c of cards) c.stabilize(cards.filter((x) => x !== c), alpha);
  }
}
