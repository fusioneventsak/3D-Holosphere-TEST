import React, { useRef, useMemo, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Suspense } from 'react';
import * as THREE from 'three';

// Stock photo URLs of smiling people (using Unsplash for demo)
const DEMO_PHOTOS = [
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop&crop=face',
  'https://images.unsplash.com/photo-1494790108755-2616b612b47c?w=400&h=400&fit=crop&crop=face',
  'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&h=400&fit=crop&crop=face',
  'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400&h=400&fit=crop&crop=face',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&h=400&fit=crop&crop=face',
  'https://images.unsplash.com/photo-1544725176-7c40e5a71c5e?w=400&h=400&fit=crop&crop=face',
  'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400&h=400&fit=crop&crop=face',
  'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=400&h=400&fit=crop&crop=face',
  'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=400&h=400&fit=crop&crop=face',
  'https://images.unsplash.com/photo-1463453091185-61582044d556?w=400&h=400&fit=crop&crop=face',
  'https://images.unsplash.com/photo-1559526324-4b87b5e36e44?w=400&h=400&fit=crop&crop=face',
  'https://images.unsplash.com/photo-1519648023493-d82b5f8d7b8a?w=400&h=400&fit=crop&crop=face',
];

interface PhotoProps {
  position: [number, number, number];
  rotation: [number, number, number];
  imageUrl: string;
  index: number;
}

const FloatingPhoto: React.FC<PhotoProps> = ({ position, rotation, imageUrl, index }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const textureRef = useRef<THREE.Texture>();
  
  // Load texture
  const texture = useMemo(() => {
    const loader = new THREE.TextureLoader();
    const tex = loader.load(imageUrl);
    tex.minFilter = THREE.LinearFilter;
    tex.magFilter = THREE.LinearFilter;
    textureRef.current = tex;
    return tex;
  }, [imageUrl]);

  useFrame((state) => {
    if (!meshRef.current) return;
    
    const time = state.clock.getElapsedTime();
    
    // Floating animation with different frequencies for each photo
    const floatOffset = Math.sin(time * 0.5 + index * 0.5) * 0.3;
    const rotationOffset = Math.sin(time * 0.3 + index * 0.3) * 0.1;
    
    meshRef.current.position.y = position[1] + floatOffset;
    meshRef.current.rotation.z = rotation[2] + rotationOffset;
    meshRef.current.rotation.x = rotation[0] + Math.sin(time * 0.2 + index * 0.2) * 0.05;
  });

  return (
    <mesh ref={meshRef} position={position} rotation={rotation} castShadow receiveShadow>
      <planeGeometry args={[1.2, 1.2]} />
      <meshStandardMaterial 
        map={texture} 
        transparent
        side={THREE.DoubleSide}
      />
      {/* Photo frame effect */}
      <mesh position={[0, 0, -0.01]}>
        <planeGeometry args={[1.3, 1.3]} />
        <meshStandardMaterial color="#ffffff" />
      </mesh>
    </mesh>
  );
};

const ParticleSystem: React.FC = () => {
  const pointsRef = useRef<THREE.Points>(null);
  
  const particles = useMemo(() => {
    const count = 100;
    const positions = new Float32Array(count * 3);
    
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 20;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 15;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 10;
    }
    
    return positions;
  }, []);

  useFrame((state) => {
    if (!pointsRef.current) return;
    
    const time = state.clock.getElapsedTime();
    pointsRef.current.rotation.y = time * 0.05;
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          array={particles}
          count={particles.length / 3}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        color="#8b5cf6"
        size={0.02}
        transparent
        opacity={0.6}
        sizeAttenuation
      />
    </points>
  );
};

const CameraController: React.FC = () => {
  const { camera } = useThree();
  
  useFrame((state) => {
    const time = state.clock.getElapsedTime();
    
    // Smooth camera orbit
    const radius = 8;
    const x = Math.sin(time * 0.1) * radius;
    const z = Math.cos(time * 0.1) * radius;
    
    camera.position.x = x;
    camera.position.z = z;
    camera.position.y = 2;
    camera.lookAt(0, 0, 0);
  });
  
  return null;
};

const Scene: React.FC = () => {
  // Generate photo positions in a spiral/wave pattern
  const photoPositions = useMemo(() => {
    return DEMO_PHOTOS.map((photo, index) => {
      const angle = (index / DEMO_PHOTOS.length) * Math.PI * 4;
      const radius = 3 + Math.sin(index * 0.5) * 1.5;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      const y = Math.sin(index * 0.8) * 2;
      
      const rotationX = (Math.random() - 0.5) * 0.3;
      const rotationY = (Math.random() - 0.5) * 0.5;
      const rotationZ = (Math.random() - 0.5) * 0.2;
      
      return {
        position: [x, y, z] as [number, number, number],
        rotation: [rotationX, rotationY, rotationZ] as [number, number, number],
        imageUrl: photo,
      };
    });
  }, []);

  return (
    <>
      {/* Lighting */}
      <ambientLight intensity={0.4} />
      <directionalLight 
        position={[10, 10, 5]} 
        intensity={1}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
      />
      <pointLight position={[0, 5, 0]} intensity={0.5} color="#8b5cf6" />
      <pointLight position={[-5, 2, -5]} intensity={0.3} color="#3b82f6" />
      
      {/* Camera Controller */}
      <CameraController />
      
      {/* Particle System */}
      <ParticleSystem />
      
      {/* Floating Photos */}
      {photoPositions.map((photo, index) => (
        <FloatingPhoto
          key={index}
          position={photo.position}
          rotation={photo.rotation}
          imageUrl={photo.imageUrl}
          index={index}
        />
      ))}
    </>
  );
};

const LoadingFallback: React.FC = () => (
  <div className="flex items-center justify-center h-full">
    <div className="text-center">
      <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
      <p className="mt-2 text-sm text-gray-400">Loading 3D experience...</p>
    </div>
  </div>
);

const HeroScene: React.FC = () => {
  return (
    <div className="absolute inset-0 w-full h-full">
      <Canvas
        camera={{ position: [8, 2, 8], fov: 60 }}
        shadows
        gl={{ 
          antialias: true, 
          alpha: true,
          powerPreference: "high-performance"
        }}
        style={{ background: 'transparent' }}
      >
        <Suspense fallback={null}>
          <Scene />
        </Suspense>
      </Canvas>
    </div>
  );
};

export default HeroScene;