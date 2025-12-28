import React, { useRef, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Text } from '@react-three/drei';
import * as THREE from 'three';

interface Organism {
  id: string;
  name: string;
  position: [number, number, number];
  color: string;
  size: number;
  zetaClass: string;
  abundance: number;
}

interface GITract3DProps {
  organisms: Organism[];
  onOrganismClick?: (organism: Organism) => void;
}

// Individual microorganism particle
function Microbe({ organism, onClick }: { organism: Organism; onClick: () => void }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);

  return (
    <group>
      {/* Glow sphere for attraction/visibility */}
      <mesh
        ref={meshRef}
        position={organism.position}
        onClick={onClick}
        onPointerEnter={() => setHovered(true)}
        onPointerLeave={() => setHovered(false)}
        scale={hovered ? 1.5 : 1}
      >
        <sphereGeometry args={[organism.size, 16, 16]} />
        <meshStandardMaterial
          color={organism.color}
          emissive={hovered ? organism.color : '#000000'}
          emissiveIntensity={hovered ? 0.8 : 0.2}
          metalness={0.3}
          roughness={0.4}
        />
      </mesh>

      {/* Hover label */}
      {hovered && (
        <Text
          position={[organism.position[0], organism.position[1] + organism.size + 0.3, organism.position[2]]}
          fontSize={0.15}
          color="white"
          anchorX="center"
          anchorY="bottom"
        >
          {organism.name}
        </Text>
      )}
    </group>
  );
}

// GI tract tube with gradient
function GITractTube() {
  const groupRef = useRef<THREE.Group>(null);

  // Create a curved GI tract path (simplified)
  const curve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 3, 0),      // mouth
    new THREE.Vector3(0.2, 2.5, 0),  // esophagus
    new THREE.Vector3(0.3, 2, 0),    // stomach
    new THREE.Vector3(0.2, 1, 0),    // small intestine upper
    new THREE.Vector3(0, 0, 0),      // small intestine mid
    new THREE.Vector3(-0.2, -1, 0),  // small intestine lower
    new THREE.Vector3(-0.3, -2, 0),  // colon upper
    new THREE.Vector3(-0.1, -2.8, 0), // colon lower
    new THREE.Vector3(0, -3.2, 0),   // rectum
  ]);

  const points = curve.getPoints(50);
  const geometry = new THREE.BufferGeometry().setFromPoints(points);

  return (
    <group ref={groupRef}>
      {/* Main tube */}
      <mesh>
        <tubeGeometry args={[curve, 20, 0.25, 8]} />
        <meshStandardMaterial
          color="#8B4513"
          emissive="#4a2511"
          emissiveIntensity={0.3}
          wireframe={false}
          transparent={true}
          opacity={0.6}
          metalness={0.2}
          roughness={0.7}
        />
      </mesh>

      {/* Pressure gradient indicator (vertical color fade) */}
      <mesh position={[1.2, 0, 0]}>
        <boxGeometry args={[0.15, 6.5, 0.15]} />
        <meshStandardMaterial color="#ff6b35" emissiveIntensity={0.4} />
      </mesh>

      {/* Flow direction arrows along the tract */}
      {[0, 1, 2, 3, 4].map((i) => {
        const pos = curve.getPoint((i + 1) / 6);
        return (
          <group key={i} position={[pos.x - 0.5, pos.y, pos.z]}>
            <mesh>
              <coneGeometry args={[0.08, 0.2, 8]} />
              <meshStandardMaterial color="#FFD700" emissive="#FF8C00" emissiveIntensity={0.8} />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}

// Pressure field visualization (animated)
function PressureField() {
  const groupRef = useRef<THREE.Group>(null);
  const [time] = useState(0);

  return (
    <group ref={groupRef}>
      {/* Ambient pressure field (subtle background) */}
      <mesh position={[0, 0, -0.5]}>
        <planeGeometry args={[4, 8]} />
        <meshStandardMaterial
          color="#4a4a6a"
          emissive="#2a2a4a"
          emissiveIntensity={0.2}
          transparent={true}
          opacity={0.3}
        />
      </mesh>
    </group>
  );
}

// Main 3D scene
function GITract3DScene({ organisms, onOrganismClick }: GITract3DProps) {
  const [error, setError] = useState<Error | null>(null);

  if (error) {
    return (
      <div style={{ padding: '20px', background: '#1a1a2e', color: '#fff', borderRadius: '8px', border: '1px solid #333' }}>
        <div style={{ color: '#ff6b6b', fontWeight: 'bold' }}>3D Visualization Error</div>
        <div style={{ fontSize: '12px', color: '#aaa', marginTop: '8px' }}>{error.message}</div>
        <div style={{ fontSize: '11px', color: '#666', marginTop: '8px' }}>
          This might be a WebGL compatibility issue. The app will continue to work with other features.
        </div>
      </div>
    );
  }

  return (
    <Canvas
      style={{ width: '100%', height: '100%', background: '#1a1a2e' }}
      camera={{ position: [3, 0, 3], fov: 60 }}
      shadows
      onCreated={(state) => {
        try {
          // Verify WebGL is available
          if (!state.gl) {
            throw new Error('WebGL context not available');
          }
        } catch (err) {
          setError(err instanceof Error ? err : new Error('Unknown error'));
        }
      }}
    >
      <ambientLight intensity={0.6} />
      <pointLight position={[5, 5, 5]} intensity={1} castShadow />
      <pointLight position={[-5, -5, 5]} intensity={0.5} color="#4a90e2" />

      <PressureField />
      <GITractTube />

      {/* Render organisms */}
      {organisms.map((org) => (
        <Microbe
          key={org.id}
          organism={org}
          onClick={() => onOrganismClick?.(org)}
        />
      ))}

      <OrbitControls
        enablePan={true}
        enableZoom={true}
        enableRotate={true}
        autoRotate={true}
        autoRotateSpeed={2}
      />

      {/* Scene labels */}
      <Text position={[0, 3.7, 0]} fontSize={0.2} color="white">
        Mouth
      </Text>
      <Text position={[0, -3.7, 0]} fontSize={0.2} color="white">
        Rectum
      </Text>
    </Canvas>
  );
}

export default function GITract3D({ organisms, onOrganismClick }: GITract3DProps) {
  return (
    <div style={{ width: '100%', height: '500px', borderRadius: '8px', overflow: 'hidden', marginBottom: '24px' }}>
      <GITract3DScene organisms={organisms} onOrganismClick={onOrganismClick} />
      <div style={{ padding: '12px', fontSize: '12px', color: '#888', textAlign: 'center' }}>
        Drag to rotate • Scroll to zoom • Click organisms to explore
      </div>
    </div>
  );
}
