// Map organisms to positions along the GI tract based on their regional preferences
// and create visual representations for the 3D scene

export interface Organism3D {
  id: string;
  name: string;
  position: [number, number, number];
  color: string;
  size: number;
  zetaClass: string;
  abundance: number;
  region: string;
}

// Region positions along GI tract (normalized coordinates)
const REGION_POSITIONS = {
  'small-intestine': { x: 0.1, y: 1.0, z: 0 },
  'colon': { x: -0.25, y: -1.5, z: 0 },
  'stomach': { x: 0.3, y: 2.0, z: 0 },
  'mixed': { x: 0, y: 0, z: 0 },
};

// Zeta class colors (reflecting their role in the field)
const ZETA_CLASS_COLORS: { [key: string]: string } = {
  'coherence-enhancer': '#4ade80', // Green - stabilizing
  'flow-sensitive-conditional': '#3b82f6', // Blue - adaptive
  'transit-modulator': '#f59e0b', // Amber - regulating
  'stabilizer-coherent': '#10b981', // Emerald - consolidating
  'pressure-amplifier-pathogenic': '#ef4444', // Red - destabilizing
  'sulfide-producer-inflammatory': '#dc2626', // Dark red - inflammatory
  'pathogenic-vector-inverter': '#991b1b', // Maroon - inverting
};

// Abundance → size mapping (visual feedback)
function abundanceToSize(abundance: string): number {
  const abundanceMap: { [key: string]: number } = {
    'dominant': 0.25,
    'abundant': 0.18,
    'common': 0.12,
    'minor': 0.08,
    'rare': 0.05,
  };
  return abundanceMap[abundance] || 0.1;
}

// Jitter position to spread organisms in 3D space (avoid overlap)
function jitterPosition(
  basePos: { x: number; y: number; z: number },
  seed: number
): [number, number, number] {
  // Use seed-based pseudorandom for deterministic jitter
  const random = (s: number) => Math.sin(s * 12.9898 + s * 78.233) * 0.43758;
  
  return [
    basePos.x + random(seed * 0.1) * 0.3,
    basePos.y + random(seed * 0.2) * 0.3,
    basePos.z + random(seed * 0.3) * 0.2,
  ];
}

export function mapOrganismsTo3D(organisms: any[]): Organism3D[] {
  return organisms.map((org, index) => {
    const region = org.regional_expectation || 'mixed';
    const basePos = REGION_POSITIONS[region as keyof typeof REGION_POSITIONS] || REGION_POSITIONS['mixed'];
    const zetaClass = org.zetaClass || 'mixed';
    const abundance = org.abundance_healthy || 'common';

    return {
      id: org.id || `org-${index}`,
      name: org.commonName || org.scientificName || 'Unknown',
      position: jitterPosition(basePos, index),
      color: ZETA_CLASS_COLORS[zetaClass] || '#9ca3af',
      size: abundanceToSize(abundance),
      zetaClass,
      abundance: parseInt(abundance) || 1,
      region,
    };
  });
}

// Legend/guide for 3D visualization colors and meanings
export const ZetaClassLegend = [
  {
    zetaClass: 'coherence-enhancer',
    color: '#4ade80',
    meaning: 'Stabilizes flow, maintains coherence',
  },
  {
    zetaClass: 'flow-sensitive-conditional',
    color: '#3b82f6',
    meaning: 'Adapts to local conditions, responsive',
  },
  {
    zetaClass: 'transit-modulator',
    color: '#f59e0b',
    meaning: 'Regulates movement through tract',
  },
  {
    zetaClass: 'stabilizer-coherent',
    color: '#10b981',
    meaning: 'Consolidates barriers, maintains phases',
  },
  {
    zetaClass: 'pressure-amplifier-pathogenic',
    color: '#ef4444',
    meaning: 'Destabilizes flow, amplifies pressures',
  },
  {
    zetaClass: 'sulfide-producer-inflammatory',
    color: '#dc2626',
    meaning: 'Produces inflammatory compounds',
  },
  {
    zetaClass: 'pathogenic-vector-inverter',
    color: '#991b1b',
    meaning: 'Inverts field direction, highly pathogenic',
  },
];
