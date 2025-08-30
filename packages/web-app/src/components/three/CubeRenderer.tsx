import React, { useEffect, useRef } from 'react';
import { 
  Scene,
  Group, 
  BoxGeometry, 
  MeshPhongMaterial, 
  Mesh,
  Material
} from 'three';
import { CUBE_COLORS } from '@rubiks-cube/shared';

interface CubeRendererProps {
  scene: Scene;
  isAnimating?: boolean;
  onCubeGroupReady?: (cubeGroup: Group) => void;
}

export const CubeRenderer: React.FC<CubeRendererProps> = ({ scene, isAnimating = false, onCubeGroupReady }) => {
  const cubeGroupRef = useRef<Group | null>(null);
  const rotationSpeedRef = useRef<number>(0.005);

  useEffect(() => {
    if (!scene) return;

    // Create cube group container for 27 individual pieces
    const cubeGroup = new Group();
    cubeGroupRef.current = cubeGroup;

    // Individual cube piece geometry
    const geometry = new BoxGeometry(0.95, 0.95, 0.95);

    // Standard Rubik's cube color materials with Phong shading for better lighting
    const materials = {
      white: new MeshPhongMaterial({ color: CUBE_COLORS.WHITE, shininess: 30 }),
      red: new MeshPhongMaterial({ color: CUBE_COLORS.RED, shininess: 30 }),
      blue: new MeshPhongMaterial({ color: CUBE_COLORS.BLUE, shininess: 30 }),
      orange: new MeshPhongMaterial({ color: CUBE_COLORS.ORANGE, shininess: 30 }),
      green: new MeshPhongMaterial({ color: CUBE_COLORS.GREEN, shininess: 30 }),
      yellow: new MeshPhongMaterial({ color: CUBE_COLORS.YELLOW, shininess: 30 }),
      black: new MeshPhongMaterial({ color: 0x000000, shininess: 10 }) // For internal faces
    };

    // Create 27 cube pieces in 3x3x3 grid formation
    for (let x = -1; x <= 1; x++) {
      for (let y = -1; y <= 1; y++) {
        for (let z = -1; z <= 1; z++) {
          const cube = new Mesh(geometry.clone());
          
          // Position cube in grid
          cube.position.set(x, y, z);
          
          // Name the cube based on which faces are visible for raycasting
          const visibleFaces: string[] = [];
          if (x === 1) visibleFaces.push('right');
          if (x === -1) visibleFaces.push('left');
          if (y === 1) visibleFaces.push('up');
          if (y === -1) visibleFaces.push('down');
          if (z === 1) visibleFaces.push('front');
          if (z === -1) visibleFaces.push('back');
          
          // Use primary visible face for naming (prioritize front face if multiple)
          cube.name = visibleFaces.includes('front') ? 'front-face' :
                     visibleFaces.includes('back') ? 'back-face' :
                     visibleFaces.includes('left') ? 'left-face' :
                     visibleFaces.includes('right') ? 'right-face' :
                     visibleFaces.includes('up') ? 'up-face' :
                     visibleFaces.includes('down') ? 'down-face' :
                     `cube-${x}-${y}-${z}`;
          
          // Store position info for easier access
          cube.userData = { x, y, z, visibleFaces };
          
          // Determine which faces are visible and assign colors
          // Initialize all 6 material slots to ensure no undefined values
          const cubeMaterials: Material[] = [
            materials.black, // Right face (+X) - default to black
            materials.black, // Left face (-X) - default to black
            materials.black, // Top face (+Y) - default to black
            materials.black, // Bottom face (-Y) - default to black
            materials.black, // Front face (+Z) - default to black
            materials.black  // Back face (-Z) - default to black
          ];

          // Face order: +X, -X, +Y, -Y, +Z, -Z (right, left, top, bottom, front, back)

          // Right face (+X)
          if (x === 1) {
            cubeMaterials[0] = materials.blue; // Right is blue
          }

          // Left face (-X)
          if (x === -1) {
            cubeMaterials[1] = materials.green; // Left is green
          }

          // Top face (+Y)
          if (y === 1) {
            cubeMaterials[2] = materials.white; // Up is white
          }

          // Bottom face (-Y)
          if (y === -1) {
            cubeMaterials[3] = materials.yellow; // Down is yellow
          }

          // Front face (+Z)
          if (z === 1) {
            cubeMaterials[4] = materials.red; // Front is red
          }

          // Back face (-Z)
          if (z === -1) {
            cubeMaterials[5] = materials.orange; // Back is orange
          }
          
          // Enable shadow casting and receiving for spot lighting effects
          cube.castShadow = true;
          cube.receiveShadow = true;

          cube.material = cubeMaterials;
          cubeGroup.add(cube);
        }
      }
    }

    scene.add(cubeGroup);

    // Notify parent component that cube group is ready
    onCubeGroupReady?.(cubeGroup);

    // Cleanup
    return () => {
      scene.remove(cubeGroup);
      
      // Dispose of geometries and materials
      cubeGroup.traverse((child) => {
        if (child instanceof Mesh) {
          child.geometry.dispose();
          if (Array.isArray(child.material)) {
            child.material.forEach(material => material.dispose());
          } else {
            child.material.dispose();
          }
        }
      });
    };
  }, [scene]);

  // Basic rotation animation
  useEffect(() => {
    if (!isAnimating || !cubeGroupRef.current) return;

    let animationId: number;

    const animate = () => {
      if (cubeGroupRef.current) {
        // Slow rotation around Y-axis to showcase 3D effect
        cubeGroupRef.current.rotation.y += rotationSpeedRef.current;
        cubeGroupRef.current.rotation.x += rotationSpeedRef.current * 0.5;
      }
      animationId = requestAnimationFrame(animate);
    };

    animationId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animationId);
    };
  }, [isAnimating]);

  // Responsive handling
  useEffect(() => {
    const handleResize = (event: Event) => {
      const customEvent = event as CustomEvent;
      const { isMobile } = customEvent.detail;
      
      if (cubeGroupRef.current) {
        // Adjust cube size for mobile devices
        const scale = isMobile ? 0.8 : 1.0;
        cubeGroupRef.current.scale.setScalar(scale);
        
        // Adjust rotation speed for mobile
        rotationSpeedRef.current = isMobile ? 0.003 : 0.005;
      }
    };

    window.addEventListener('threeSceneResize', handleResize);
    
    // Initial resize check
    const isMobile = window.innerWidth < 768;
    if (cubeGroupRef.current) {
      const scale = isMobile ? 0.8 : 1.0;
      cubeGroupRef.current.scale.setScalar(scale);
      rotationSpeedRef.current = isMobile ? 0.003 : 0.005;
    }

    return () => {
      window.removeEventListener('threeSceneResize', handleResize);
    };
  }, []);

  return null; // This component only manages Three.js objects
};

// Component returns null as it only manages Three.js objects
// Cube group reference is managed internally per instance