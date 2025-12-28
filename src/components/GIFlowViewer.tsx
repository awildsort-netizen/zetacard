import React, { useState, useEffect, Suspense, lazy } from 'react';
import bioIndexData from '../../.zeta_repo/workdir/cards/gi-flow-topology/bio-index.json';
import geometricPurposeSchema from '../../.zeta_repo/workdir/cards/gi-flow-topology/geometric-purpose-schema.json';
import { mapOrganismsTo3D, ZetaClassLegend } from '../utils/gi3dMapping';

// Lazy load the 3D component to avoid blocking on @react-three/fiber initialization
const GITract3D = lazy(() => import('./GITract3D'));

interface Organism {
  commonName: string;
  scientificName: string;
  id: string;
  zetaClass: string;
  description: string;
  abundance_healthy: string;
}

export default function GIFlowViewer({ mode = 'overview' }: { mode?: 'overview' | 'bio-index' | 'equations' | 'schema' }) {
  const [activeTab, setActiveTab] = useState<'overview' | 'bio-index' | 'schema' | 'interventions'>(mode as any || 'overview');
  const [selectedOrganism, setSelectedOrganism] = useState<string | null>(null);
  const [filterZetaClass, setFilterZetaClass] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');

  const organisms: Organism[] = bioIndexData.bioIndex || [];
  const filteredOrganisms = organisms.filter(org => {
    const matchesZeta = !filterZetaClass || org.zetaClass === filterZetaClass;
    const matchesSearch = !searchTerm || 
      org.commonName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      org.scientificName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      org.description.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesZeta && matchesSearch;
  });

  const zetaClasses = [...new Set(organisms.map(o => o.zetaClass))].sort();
  const selectedOrganismData = organisms.find(o => o.id === selectedOrganism);

  const archetypes = [
    { name: 'Entropy Injector', desc: 'Increases disorder; disrupts local coherence (lytic phages, transient toxin bursts)', color: '#ff6b6b' },
    { name: 'Flow Rider', desc: 'Couples to existing vectors; amplifies established patterns', color: '#4ecdc4' },
    { name: 'Barrier Guardian', desc: '2D stabilizer; maintains epithelial interfaces', color: '#45b7d1' },
    { name: 'Bulk Architect', desc: '3D stabilizer; defines steady-state ecology', color: '#96ceb4' },
    { name: 'Phase Reset Trigger', desc: 'Causes discontinuous transitions; breaks locked pathological states', color: '#ffeaa7' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', backgroundColor: '#0a0e27', color: '#e0e0e0', fontFamily: 'monospace', fontSize: '13px' }}>
      {/* Tab Navigation */}
      <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid #333', backgroundColor: '#0f1229' }}>
        {['overview', 'bio-index', 'schema', 'interventions'].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab as any)}
            style={{
              flex: 1,
              padding: '10px 12px',
              background: activeTab === tab ? '#1a2050' : 'transparent',
              color: activeTab === tab ? '#64b5f6' : '#999',
              border: 'none',
              cursor: 'pointer',
              borderBottom: activeTab === tab ? '2px solid #64b5f6' : 'none',
              textTransform: 'capitalize',
              fontSize: '12px',
              fontWeight: activeTab === tab ? 'bold' : 'normal',
            }}
          >
            {tab === 'bio-index' ? 'Bio-Index Explorer' : tab === 'schema' ? 'Geometric Purpose' : tab === 'interventions' ? 'Interventions' : 'Overview'}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflow: 'auto', display: 'flex', gap: '1px', backgroundColor: '#0a0e27' }}>
        {/* Main Content Panel */}
        <div style={{ flex: 1, padding: '16px', overflowY: 'auto' }}>
          {activeTab === 'overview' && (
            <div>
              <h2 style={{ color: '#64b5f6', marginBottom: '12px' }}>ζ GI Flow Topology Theory</h2>
              <p style={{ lineHeight: 1.6, marginBottom: '12px', color: '#b0b0b0' }}>
                Gastrointestinal pathology emerges when air, water, and microbial phase vectors lose downstream coherence, producing localized geometric inversions that manifest as symptoms.
              </p>
              
              {/* 3D GI Tract Visualization */}
              <div style={{ marginBottom: '16px' }}>
                <Suspense fallback={<div style={{padding: '20px', textAlign: 'center', color: '#666'}}>Loading 3D visualization...</div>}>
                  <GITract3D
                    organisms={mapOrganismsTo3D(organisms)}
                    onOrganismClick={(org) => {
                      setActiveTab('bio-index');
                      setSelectedOrganism(org.id);
                    }}
                  />
                </Suspense>
              </div>

              {/* 3D Legend */}
              <h3 style={{ color: '#90caf9', marginTop: '16px', marginBottom: '8px' }}>Organism Color Guide (3D)</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '8px', marginBottom: '16px' }}>
                {ZetaClassLegend.map((item, i) => (
                  <div key={i} style={{ display: 'flex', gap: '8px', alignItems: 'center', padding: '8px', backgroundColor: 'rgba(100, 181, 246, 0.05)', borderRadius: '4px' }}>
                    <div style={{ width: '16px', height: '16px', backgroundColor: item.color, borderRadius: '50%', flexShrink: 0 }} />
                    <div style={{ fontSize: '11px', color: '#999' }}>
                      <div style={{ color: item.color, fontWeight: 'bold' }}>{item.zetaClass}</div>
                      <div>{item.meaning}</div>
                    </div>
                  </div>
                ))}
              </div>
              
              <h3 style={{ color: '#90caf9', marginTop: '16px', marginBottom: '8px' }}>Core Principles</h3>
              <ul style={{ marginLeft: '16px', color: '#999' }}>
                <li><strong>Flow Coherence (ζ_flow)</strong>: Metric tracking alignment of pressure, flow, and gas vectors</li>
                <li><strong>Dimensional Operators</strong>: 0D–3D entities that transform the gradient field</li>
                <li><strong>Geometric Purpose</strong>: Classification by effect, not taxonomy</li>
                <li><strong>Microbiota as Operators</strong>: Not residents, but geometry shapers</li>
              </ul>

              <h3 style={{ color: '#90caf9', marginTop: '16px', marginBottom: '8px' }}>Five Archetypes</h3>
              {archetypes.map((arch, i) => (
                <div key={i} style={{ marginBottom: '8px', padding: '8px', backgroundColor: 'rgba(100, 181, 246, 0.05)', borderLeft: `3px solid ${arch.color}` }}>
                  <div style={{ color: arch.color, fontWeight: 'bold' }}>{arch.name}</div>
                  <div style={{ fontSize: '12px', color: '#999', marginTop: '4px' }}>{arch.desc}</div>
                </div>
              ))}

              <h3 style={{ color: '#90caf9', marginTop: '16px', marginBottom: '8px' }}>Quick Start</h3>
              <div style={{ fontSize: '12px', color: '#999', lineHeight: 1.6 }}>
                <p>→ <strong>Click organisms in the 3D visualization</strong> to explore them in the Bio-Index</p>
                <p>→ <strong>Bio-Index:</strong> Deep dive into organisms and their geometric roles</p>
                <p>→ <strong>Geometric Purpose:</strong> Learn the 5-field classification schema</p>
                <p>→ <strong>Interventions:</strong> See how posture, breathing, movement realign the field</p>
              </div>
            </div>
          )}

          {activeTab === 'bio-index' && (
            <div>
              <h2 style={{ color: '#64b5f6', marginBottom: '12px' }}>Bio-Index Explorer</h2>
              
              <div style={{ marginBottom: '12px' }}>
                <input
                  type="text"
                  placeholder="Search by name or description..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px',
                    backgroundColor: '#1a2050',
                    border: '1px solid #333',
                    color: '#e0e0e0',
                    borderRadius: '4px',
                    marginBottom: '8px',
                    fontSize: '12px',
                  }}
                />
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  <button
                    onClick={() => setFilterZetaClass('')}
                    style={{
                      padding: '4px 8px',
                      fontSize: '11px',
                      background: !filterZetaClass ? '#64b5f6' : '#333',
                      color: !filterZetaClass ? '#000' : '#999',
                      border: 'none',
                      borderRadius: '3px',
                      cursor: 'pointer',
                    }}
                  >
                    All ({organisms.length})
                  </button>
                  {zetaClasses.map(zc => (
                    <button
                      key={zc}
                      onClick={() => setFilterZetaClass(zc)}
                      style={{
                        padding: '4px 8px',
                        fontSize: '11px',
                        background: filterZetaClass === zc ? '#64b5f6' : '#333',
                        color: filterZetaClass === zc ? '#000' : '#999',
                        border: 'none',
                        borderRadius: '3px',
                        cursor: 'pointer',
                      }}
                    >
                      {zc} ({organisms.filter(o => o.zetaClass === zc).length})
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ fontSize: '12px', color: '#999', marginBottom: '12px' }}>
                Showing {filteredOrganisms.length} of {organisms.length} organisms
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '8px' }}>
                {filteredOrganisms.map(org => (
                  <div
                    key={org.id}
                    onClick={() => setSelectedOrganism(org.id)}
                    style={{
                      padding: '10px',
                      backgroundColor: selectedOrganism === org.id ? 'rgba(100, 181, 246, 0.15)' : 'rgba(100, 181, 246, 0.05)',
                      borderLeft: `3px solid ${selectedOrganism === org.id ? '#64b5f6' : '#333'}`,
                      cursor: 'pointer',
                      borderRadius: '2px',
                      transition: 'all 0.2s',
                    }}
                  >
                    <div style={{ color: '#64b5f6', fontWeight: 'bold', fontSize: '12px' }}>{org.commonName}</div>
                    <div style={{ fontSize: '11px', color: '#999', marginTop: '2px' }}>{org.scientificName}</div>
                    <div style={{ fontSize: '11px', color: '#aaa', marginTop: '4px' }}>{org.description}</div>
                    <div style={{ fontSize: '10px', color: '#777', marginTop: '4px' }}>
                      <span style={{ display: 'inline-block', backgroundColor: '#333', padding: '2px 6px', borderRadius: '2px', marginRight: '4px' }}>
                        {org.zetaClass}
                      </span>
                      <span style={{ display: 'inline-block', backgroundColor: '#333', padding: '2px 6px', borderRadius: '2px' }}>
                        {org.abundance_healthy}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'schema' && (
            <div>
              <h2 style={{ color: '#64b5f6', marginBottom: '12px' }}>Geometric Purpose Schema</h2>
              <p style={{ color: '#999', marginBottom: '12px', lineHeight: 1.6 }}>
                Five-field classification for any entity: Dimensionality (D), Geometry Enforced (G), Curvature Preference (κ*), Archetype (A), Failure Mode (F)
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '12px' }}>
                {Object.entries((geometricPurposeSchema as any).schema.canonical_fields || {}).map(([key, field]: [string, any]) => (
                  <div key={key} style={{ padding: '12px', backgroundColor: 'rgba(100, 181, 246, 0.05)', borderRadius: '4px', border: '1px solid #333' }}>
                    <div style={{ color: '#64b5f6', fontWeight: 'bold' }}>{field.name} ({key})</div>
                    <div style={{ fontSize: '11px', color: '#999', marginTop: '4px', lineHeight: 1.5 }}>
                      {field.definition}
                    </div>
                    {field.values && (
                      <div style={{ marginTop: '6px', fontSize: '11px' }}>
                        <div style={{ color: '#aaa' }}>Values: {field.values.join(', ')}</div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'interventions' && (
            <div>
              <h2 style={{ color: '#64b5f6', marginBottom: '12px' }}>Interventions as Operators</h2>
              <p style={{ color: '#999', marginBottom: '12px', lineHeight: 1.6 }}>
                Interventions are high-level operators that act on the gradient field topology. They target specific vector dimensions and have expected effects on ζ_flow.
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '12px' }}>
                {[
                  { name: 'Posture Change', target: 'Pressure vector realignment', effect: 'Immediate (seconds)', icon: '⬅' },
                  { name: 'Slow Breathing', target: 'Pressure wave synchronization', effect: '1-2 minutes', icon: '◉' },
                  { name: 'Walking / Movement', target: 'Longitudinal shear restoration', effect: '5-30 min cumulative', icon: '↔' },
                  { name: 'Meal Timing (IF)', target: 'Phase separation reset', effect: '1-2 weeks', icon: '⏱' },
                  { name: 'Probiotics', target: 'Conditional stabilizers (ζ > 2.0)', effect: '2-4 weeks', icon: '◇' },
                ].map((intervention, i) => (
                  <div key={i} style={{ padding: '10px', backgroundColor: 'rgba(100, 181, 246, 0.05)', borderLeft: '3px solid #64b5f6', borderRadius: '2px' }}>
                    <div style={{ color: '#64b5f6', fontWeight: 'bold' }}>
                      <span style={{ marginRight: '8px', fontSize: '14px' }}>{intervention.icon}</span>
                      {intervention.name}
                    </div>
                    <div style={{ fontSize: '11px', color: '#aaa', marginTop: '4px' }}>
                      Target: {intervention.target}
                    </div>
                    <div style={{ fontSize: '11px', color: '#999', marginTop: '2px' }}>
                      Time: {intervention.effect}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Details Panel */}
        {selectedOrganismData && activeTab === 'bio-index' && (
          <div style={{ width: '320px', borderLeft: '1px solid #333', padding: '16px', overflowY: 'auto', backgroundColor: '#0f1229' }}>
            <h3 style={{ color: '#64b5f6', marginBottom: '12px' }}>{selectedOrganismData.commonName}</h3>
            <div style={{ fontSize: '11px', color: '#999', marginBottom: '12px' }}>
              <div><strong>Scientific:</strong> {selectedOrganismData.scientificName}</div>
              <div style={{ marginTop: '4px' }}><strong>Role:</strong> {selectedOrganismData.zetaClass}</div>
              <div style={{ marginTop: '4px' }}><strong>Healthy Abundance:</strong> {selectedOrganismData.abundance_healthy}</div>
            </div>

            {(selectedOrganismData as any).gradientOptima && (
              <>
                <h4 style={{ color: '#90caf9', fontSize: '12px', marginBottom: '8px' }}>Gradient Optima</h4>
                <div style={{ fontSize: '11px', color: '#999', lineHeight: 1.6 }}>
                  {Object.entries((selectedOrganismData as any).gradientOptima).map(([key, val]: [string, any]) => (
                    <div key={key} style={{ marginBottom: '4px' }}>
                      <span style={{ color: '#aaa' }}>{key}:</span> {val}
                    </div>
                  ))}
                </div>
              </>
            )}

            {(selectedOrganismData as any).keyMetabolites && (
              <>
                <h4 style={{ color: '#90caf9', fontSize: '12px', marginBottom: '8px', marginTop: '12px' }}>Key Metabolites</h4>
                <div style={{ fontSize: '11px', color: '#999' }}>
                  {((selectedOrganismData as any).keyMetabolites || []).join(', ')}
                </div>
              </>
            )}

            {(selectedOrganismData as any).interactionMap && (
              <>
                <h4 style={{ color: '#90caf9', fontSize: '12px', marginBottom: '8px', marginTop: '12px' }}>Interactions</h4>
                <div style={{ fontSize: '11px', color: '#999', lineHeight: 1.6 }}>
                  <div><span style={{ color: '#64b5f6' }}>Cooperates:</span> {((selectedOrganismData as any).interactionMap.cooperates_with || []).join(', ')}</div>
                  <div style={{ marginTop: '4px' }}><span style={{ color: '#ff6b6b' }}>Competes:</span> {((selectedOrganismData as any).interactionMap.competes_with || []).join(', ')}</div>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
