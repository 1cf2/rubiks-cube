import React, { useState, useRef, useCallback } from 'react';
import { Group, Mesh } from 'three';
import { ThreeScene, useThreeContext } from './ThreeScene';
import { CubeRenderer } from './CubeRenderer';
import { ThreeJSErrorBoundary } from './ErrorBoundary';
import { MouseControls } from '../input/MouseControls';
import { DebugControls } from '../debug/DebugControls';
import { FacePosition, RotationCommand, Move, CubeError } from '@rubiks-cube/shared/types';
import { RotationDirection } from '@rubiks-cube/shared/types/mouse-interactions';
import { featureFlags } from '../../utils/featureFlags';

const CubeSceneContent: React.FC = () => {
  const { scene, camera } = useThreeContext();
  const [cubeGroup, setCubeGroup] = useState<Group | null>(null);
  const animationRef = useRef<{
    isAnimating: boolean;
    startTime: number;
    duration: number;
    startRotations: Map<Mesh, { x: number; y: number; z: number }>;
    targetRotations: Map<Mesh, { x: number; y: number; z: number }>;
    pieces: Mesh[];
  } | null>(null);

  if (!scene) {
    return null;
  }

  const handleCubeGroupReady = (group: Group) => {
    setCubeGroup(group);
  };

  const handleFaceHover = (_face: FacePosition | null) => {
    // Face hover handled
  };

  const handleFaceSelect = (_face: FacePosition) => {
    // Face select handled
  };

  const handleRotationStart = (command: RotationCommand) => {
    window.console.log('🎯 handleRotationStart called:', command);
    window.console.log('🎯 cubeGroup exists:', !!cubeGroup);
    window.console.log('🎯 animationRef.current?.isAnimating:', animationRef.current?.isAnimating);
    
    if (cubeGroup && !animationRef.current?.isAnimating) {
      window.console.log('🎯 Starting smooth rotation!');
      startSmoothRotation(cubeGroup, command);
    } else {
      window.console.log('🎯 Rotation blocked - cubeGroup missing or already animating');
    }
  };

  const handleRotationComplete = (_command: RotationCommand, _move: Move) => {
    // Rotation completion handled
  };

  // Start smooth rotation animation
  const startSmoothRotation = useCallback((group: Group, command: RotationCommand) => {
    const pieces = getFacePieces(group, command.face);
    
    if (pieces.length === 0) {
      return;
    }

    // Calculate target angle
    let targetAngle = Math.PI / 2; // 90 degrees
    if (command.direction === RotationDirection.COUNTERCLOCKWISE) {
      targetAngle = -Math.PI / 2;
    } else if (command.direction === RotationDirection.DOUBLE) {
      targetAngle = Math.PI; // 180 degrees
    }

    // Store initial rotations
    const startRotations = new Map<Mesh, { x: number; y: number; z: number }>();
    const targetRotations = new Map<Mesh, { x: number; y: number; z: number }>();

    pieces.forEach(piece => {
      const startRot = { x: piece.rotation.x, y: piece.rotation.y, z: piece.rotation.z };
      startRotations.set(piece, startRot);

      const targetRot = { ...startRot };
      switch (command.face) {
        case FacePosition.FRONT:
          targetRot.z += targetAngle;
          break;
        case FacePosition.BACK:
          targetRot.z -= targetAngle;
          break;
        case FacePosition.LEFT:
          targetRot.x += targetAngle;
          break;
        case FacePosition.RIGHT:
          targetRot.x -= targetAngle;
          break;
        case FacePosition.UP:
          targetRot.y += targetAngle;
          break;
        case FacePosition.DOWN:
          targetRot.y -= targetAngle;
          break;
      }
      targetRotations.set(piece, targetRot);
    });

    // Set up animation
    animationRef.current = {
      isAnimating: true,
      startTime: performance.now(),
      duration: 300, // 300ms animation
      startRotations,
      targetRotations,
      pieces
    };

    // Start animation loop
    animateRotation();
  }, []);

  // Animation loop
  const animateRotation = useCallback(() => {
    const animation = animationRef.current;
    if (!animation || !animation.isAnimating) {
      return;
    }

    const elapsed = performance.now() - animation.startTime;
    const progress = Math.min(elapsed / animation.duration, 1);

    // Ease-out function
    const easeProgress = 1 - Math.pow(1 - progress, 3);

    // Update rotations
    animation.pieces.forEach(piece => {
      const startRot = animation.startRotations.get(piece);
      const targetRot = animation.targetRotations.get(piece);
      
      if (startRot && targetRot) {
        piece.rotation.x = startRot.x + (targetRot.x - startRot.x) * easeProgress;
        piece.rotation.y = startRot.y + (targetRot.y - startRot.y) * easeProgress;
        piece.rotation.z = startRot.z + (targetRot.z - startRot.z) * easeProgress;
      }
    });

    if (progress < 1) {
      requestAnimationFrame(animateRotation);
    } else {
      // Animation complete
      animationRef.current = null;
    }
  }, []);

  // Get the pieces that belong to a specific face
  const getFacePieces = (group: Group, face: FacePosition): Mesh[] => {
    const pieces: Mesh[] = [];
    
    group.traverse((child) => {
      if (child instanceof Mesh && child.userData) {
        const { x, y, z } = child.userData;
        
        // Check if this piece is part of the rotating face
        switch (face) {
          case FacePosition.FRONT:
            if (z === 1) pieces.push(child);
            break;
          case FacePosition.BACK:
            if (z === -1) pieces.push(child);
            break;
          case FacePosition.LEFT:
            if (x === -1) pieces.push(child);
            break;
          case FacePosition.RIGHT:
            if (x === 1) pieces.push(child);
            break;
          case FacePosition.UP:
            if (y === 1) pieces.push(child);
            break;
          case FacePosition.DOWN:
            if (y === -1) pieces.push(child);
            break;
        }
      }
    });
    
    return pieces;
  };

  const handleError = (_error: CubeError, _message?: string) => {
    // Error handling for cube interactions
  };


  return (
    <>
      <CubeRenderer 
        scene={scene} 
        isAnimating={true} 
        onCubeGroupReady={handleCubeGroupReady}
      />
      <MouseControls
        camera={camera}
        scene={scene}
        cubeGroup={cubeGroup}
        isEnabled={true}
        enableRotationPreview={true}
        enableDebugOverlay={true}
        enableCompletionFeedback={true}
        enableInvalidMovePrevention={true}
        allowConcurrentAnimations={false}
        onFaceHover={handleFaceHover}
        onFaceSelect={handleFaceSelect}
        onRotationStart={handleRotationStart}
        onRotationComplete={handleRotationComplete}
        onError={handleError}
      />
      
      {/* Debug controls - shown in development or when debug flag is enabled */}
      <DebugControls 
        isVisible={featureFlags.getFlag('enableDevelopmentTools')} 
      />
    </>
  );
};

export const CubeScene: React.FC = () => {
  return (
    <ThreeJSErrorBoundary>
      <ThreeScene>
        <CubeSceneContent />
      </ThreeScene>
    </ThreeJSErrorBoundary>
  );
};