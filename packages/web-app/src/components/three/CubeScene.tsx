import React, { useState, useRef } from 'react';
import { Group } from 'three';
import { ThreeScene, useThreeContext } from './ThreeScene';
import { CubeRenderer } from './CubeRenderer';
import { ThreeJSErrorBoundary } from './ErrorBoundary';
import { MouseControls } from '../input/MouseControls';
import { DebugControls } from '../debug/DebugControls';
import { FacePosition, RotationCommand, Move, CubeError } from '@rubiks-cube/shared/types';
import { RotationDirection } from '@rubiks-cube/shared/types/mouse-interactions';
import { FaceRotationAnimator } from '@rubiks-cube/three-renderer';
import { featureFlags } from '../../utils/featureFlags';

const CubeSceneContent: React.FC = () => {
  const { scene, camera } = useThreeContext();
  const [cubeGroup, setCubeGroup] = useState<Group | null>(null);
  const [cubeStateVersion, setCubeStateVersion] = useState(0); // Track cube state changes
  const animatorRef = useRef<FaceRotationAnimator | null>(null);

  if (!scene) {
    return null;
  }

  const handleCubeGroupReady = (group: Group) => {
    setCubeGroup(group);
    
    // Initialize the FaceRotationAnimator with the cube group
    if (group) {
      animatorRef.current = new FaceRotationAnimator({
        cubeGroup: group,
        onAnimationStart: (animation) => {
          window.console.log('🎬 Animation started:', animation);
        },
        onAnimationUpdate: () => {
          // Animation progress updates
        },
        onAnimationComplete: (animation) => {
          window.console.log('✅ Animation completed:', animation);
        },
        onError: (error, message) => {
          window.console.error('❌ Animation error:', error, message);
        },
      });
    }
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
    window.console.log('🎯 animator exists:', !!animatorRef.current);
    
    if (animatorRef.current && !animatorRef.current.hasActiveAnimations()) {
      window.console.log('🎯 Starting FaceRotationAnimator rotation!');
      
      // Convert RotationCommand to the format expected by FaceRotationAnimator
      const rotationConfig = {
        face: command.face,
        direction: command.direction,
        angle: command.targetAngle || Math.PI / 2,
        duration: 300,
        easing: 'ease-out' as const,
        move: createMoveFromCommand(command),
      };
      
      const result = animatorRef.current.startRotation(rotationConfig);
      if (!result.success) {
        window.console.error('❌ Failed to start rotation:', result.error, result.message);
      }
    } else {
      window.console.log('🎯 Rotation blocked - animator missing or already animating');
    }
  };

  const handleRotationComplete = (command: RotationCommand, move: Move) => {
    window.console.log('✅ Rotation completed:', { command, move });
    
    // Force a refresh of the cube state and face mappings
    // This ensures highlighting and interaction systems work correctly after rotation
    if (animatorRef.current) {
      // The animator already calls initializeFaceMeshes internally
      // But we need to trigger a re-render of any highlighting systems
      window.console.log('🔄 Cube state updated after rotation');
      
      // Increment version to trigger refresh of highlighting systems
      setCubeStateVersion(prev => prev + 1);
    }
    
    // Clear any lingering visual feedback to prevent stale highlights
    // This will be handled by the MouseControls component
  };

  // Helper function to convert RotationCommand to Move notation
  const createMoveFromCommand = (command: RotationCommand): Move => {
    const faceMap: Record<FacePosition, string> = {
      [FacePosition.FRONT]: 'F',
      [FacePosition.BACK]: 'B',
      [FacePosition.LEFT]: 'L',
      [FacePosition.RIGHT]: 'R',
      [FacePosition.UP]: 'U',
      [FacePosition.DOWN]: 'D',
    };

    const baseFace = faceMap[command.face];
    
    switch (command.direction) {
      case RotationDirection.CLOCKWISE:
        return baseFace as Move;
      case RotationDirection.COUNTERCLOCKWISE:
        return `${baseFace}'` as Move;
      case RotationDirection.DOUBLE:
        return `${baseFace}2` as Move;
      default:
        return baseFace as Move;
    }
  };


  const handleError = (_error: CubeError, _message?: string) => {
    // Error handling for cube interactions
  };


  return (
    <>
      <CubeRenderer 
        scene={scene} 
        isAnimating={false} 
        onCubeGroupReady={handleCubeGroupReady}
      />
      
      <MouseControls
        camera={camera}
        scene={scene}
        cubeGroup={cubeGroup}
        cubeStateVersion={cubeStateVersion}
        isEnabled={true}
        enableRotationPreview={true}
        enableDebugOverlay={true}
        enableCompletionFeedback={true}
        enableInvalidMovePrevention={true}
        allowConcurrentAnimations={false}
        enableCameraControls={true}
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