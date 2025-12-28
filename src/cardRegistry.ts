export type CardManifest = {
  id: string;
  title: string;
  tagline: string;
  tags: string[];
  badges?: string[];
  inputSchema?: string[];
  semanticDescriptor?: string;
};

// simple deterministic text->vector mapper for demo purposes
function textToVector(text: string, dim = 16) {
  const v = new Array(dim).fill(0);
  for (let i = 0; i < text.length; i++) {
    const c = text.charCodeAt(i);
    v[(c + i) % dim] += 1;
  }
  const norm = Math.sqrt(v.reduce((s, x) => s + x * x, 0)) || 1;
  return v.map((x) => x / norm);
}

function dot(a: number[], b: number[]) {
  let s = 0;
  for (let i = 0; i < Math.min(a.length, b.length); i++) s += a[i] * b[i];
  return s;
}

function cosine(a: number[], b: number[]) {
  return dot(a, b) / (Math.sqrt(dot(a, a)) * Math.sqrt(dot(b, b)) || 1);
}

// Example manifests: include the SpectralHeartbeat and the Omnibox itself
export const manifests: CardManifest[] = [
  {
    id: 'ζ.card.spectral.heartbeat',
    title: 'Normalized Spectral Heartbeat',
    tagline: 'A scale-invariant heartbeat extracted from a field\'s spectral identity.',
    tags: ['spectrum', 'heartbeat', 'normalize', 'zeta'],
    badges: ['UI', 'Read-only'],
    inputSchema: ['time-series', 'spectrum'],
    semanticDescriptor:
      'Identity lives in direction, not amplitude. Normalize spectral vectors and compare angular change.',
  },
  {
    id: 'ζ.card.ui.omnibox',
    title: 'Omnibox',
    tagline: 'Universal command/search box that surfaces cards by meaning.',
    tags: ['ui', 'search', 'router', 'semantic'],
    badges: ['UI', 'Tool'],
    inputSchema: ['text', 'url', 'json'],
    semanticDescriptor: 'Produce query vector and retrieve semantic cards by meaning.',
  },
  {
    id: 'ζ.card.theory.gi.flow',
    title: 'GI Flow Topology Theory',
    tagline: 'Functional GI disorders as misaligned pressure, gas, and water directional vectors.',
    tags: ['physiology', 'gradient', 'flow', 'microbiome', 'dynamical-systems', 'topology'],
    badges: ['Theory', 'Computable Ontology', 'Mathematical'],
    inputSchema: ['posture', 'breathing', 'transit-time', 'gas-location', 'water-distribution'],
    semanticDescriptor:
      'Health emerges when pressure, gas, and water flow downstream in coordinated vectors. Pathology arises from inverted, segmented, or decoupled gradients. Microbiota are operators on the GI field topology.',
  },
  {
    id: 'π.clock.timer',
    title: 'π-Clock Timer',
    tagline: 'Set your π-clock like a spy gadget—dial the watch and the universe snaps into that file.',
    tags: ['pi', 'clock', 'deterministic', 'signature', 'oracle', 'cryptography'],
    badges: ['Tool', 'Generator', 'Spy-Mode'],
    inputSchema: ['dial', 'file-tag', 'channel'],
    semanticDescriptor:
      'π as infinite master tape. Choose dial (phase + tempo) and file lock to generate unique, deterministic signatures. Same setting forever produces same worldline.',
  },
];
// precompute static registry vectors (used as fallback)
const staticRegistry = manifests.map((m) => ({
  manifest: m,
  vec: textToVector((m.semanticDescriptor || m.title) + ' ' + (m.tags || []).join(' ')),
}));

// Dynamic registry populated from repo (if available)
let dynamicRegistry: {manifest: CardManifest; vec: number[]}[] | null = null;

export async function refreshRegistryFromRepo(){
  dynamicRegistry = null;
  try{
    // lazy import to avoid cycles
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { repo } = require('./zetaRepo');
    if(!repo) return;
    const head = await repo.readRef('refs/heads/main');
    if(!head) return;
    const commit = await repo.readCommit(head);
    const tree = await repo.readTree(commit.tree);
    const items: {manifest: CardManifest; vec: number[]}[] = [];
    for(const p of Object.keys(tree)){
      // look for manifest files under cards/
      if(/^cards\/.+\/manifest\.json$/.test(p)){
        try{
              const blobOid = tree[p].oid;
              const content = (await repo.readBlob(blobOid)).toString('utf8');
          const parsed = JSON.parse(content);
          const m: CardManifest = {
            id: parsed.id || parsed.cardKey || p,
            title: parsed.title || parsed.id || p,
            tagline: parsed.tagline || '',
            tags: parsed.tags || [],
            badges: parsed.badges || [],
            inputSchema: parsed.inputSchema || [],
            semanticDescriptor: parsed.semanticDescriptor || (parsed.title || parsed.id || ''),
          };
          const vec = textToVector((m.semanticDescriptor || m.title) + ' ' + (m.tags || []).join(' '));
          items.push({manifest:m, vec});
        }catch(e){}
      }
    }
    if(items.length>0) dynamicRegistry = items;
  }catch(e){
    // ignore repo read errors and leave dynamicRegistry null
  }
}

// initial attempt to populate dynamic registry at module load (async)
(async ()=>{ try{ await refreshRegistryFromRepo(); }catch(e){} })();

// Auto-refresh when the repo emits commits or ref updates (autoreg).
if (typeof globalThis !== 'undefined' && typeof globalThis.window !== 'undefined') {
  // Browser environment - skip repo integration
} else {
  try{
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { repo } = require('./zetaRepo');
    if(repo && typeof repo.on === 'function'){
      repo.on('ref-update', async (ref:string, oid:string)=>{
        try{ if(ref === 'refs/heads/main') await refreshRegistryFromRepo(); }catch(e){}
      });
      repo.on('commit', async (oid:string, commit:any)=>{
        try{ await refreshRegistryFromRepo(); }catch(e){}
      });
    }
  }catch(e){}
}

export function queryCards(q: string, max = 10) {
  const registry = dynamicRegistry || staticRegistry;
  const qv = textToVector(q);
  const scored = registry.map((r) => ({
    manifest: r.manifest,
    score: cosine(qv, r.vec),
  }));
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, max);
}

export function detectFacets(input: string) {
  const facets: string[] = [];
  if (/^https?:\/\//.test(input)) facets.push('url');
  try { JSON.parse(input); facets.push('json'); } catch (e) {}
  if (/\d{4}-\d{2}-\d{2}/.test(input)) facets.push('date');
  if (/^[\d,\s]+$/.test(input)) facets.push('number-series');
  return facets;
}
