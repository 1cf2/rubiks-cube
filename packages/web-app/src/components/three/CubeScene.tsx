import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Group } from 'three';
import { ThreeScene, useThreeContext } from './ThreeScene';
import { CubeRenderer } from './CubeRenderer';
import { ThreeJSErrorBoundary } from './ErrorBoundary';
import { MouseControls } from '../input/MouseControls';
import TouchControls from '../input/TouchControls';
import { DebugControls } from '../debug/DebugControls';
import { FacePosition, RotationCommand, Move, CubeError, TouchError } from '@rubiks-cube/shared/types';
import { RotationDirection } from '@rubiks-cube/shared/types/mouse-interactions';
import { FaceRotationAnimator } from '@rubiks-cube/three-renderer';
import { featureFlags } from '../../utils/featureFlags';
import { useMobileDetector } from '../../hooks/useMobileDetector';

const CubeSceneContent: React.FC = () => {
  const { scene, camera } = useThreeContext();
  const [cubeGroup, setCubeGroup] = useState<Group | null>(null);
  const [cubeStateVersion, setCubeStateVersion] = useState(0); // Track cube state changes
  const animatorRef = useRef<FaceRotationAnimator | null>(null);
  const lightingRefreshRef = useRef<(() => void) | null>(null);

  const { isMobile } = useMobileDetector();
  console.log('🪲 CubeScene: isMobile detection', { isMobile });

  // Initialize lighting refresh function
  const initializeLightingRefresh = useCallback(() => {
    if (typeof window !== 'undefined' && (window as any).refreshCubeLighting) {
      lightingRefreshRef.current = (window as any).refreshCubeLighting;
      window.console.log('💡 Lighting refresh function initialized');
    }
  }, []);

  // Log rendering mode based on isMobile
  useEffect(() => {
    if (isMobile) {
      console.log('🪲 CubeScene: Rendering TouchControls (mobile mode)');
    } else {
      console.log('🪲 CubeScene: Rendering MouseControls (desktop mode)');
    }
  }, [isMobile]);

  // Log rendering mode based on isMobile
  useEffect(() => {
    if (isMobile) {
      console.log('🪲 CubeScene: Rendering TouchControls (mobile mode)');
    } else {
      console.log('🪲 CubeScene: Rendering MouseControls (desktop mode)');
    }
  }, [isMobile]);

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

          // Refresh spotlight lighting after rotation completes
          // This ensures shadows and lighting are properly updated
          if (lightingRefreshRef.current) {
            lightingRefreshRef.current();
          } else if (typeof window !== 'undefined' && (window as any).refreshCubeLighting) {
            (window as any).refreshCubeLighting();
          }
        },
        onError: (error, message) => {
          window.console.error('❌ Animation error:', error, message);
        },
      });

      // Initialize lighting refresh function after cube is ready
      setTimeout(() => initializeLightingRefresh(), 100);
    }
  };

  // eslint-disable-next-line no-unused-vars
  const handleFaceHover = (_face: FacePosition | null) => {
    // Face hover handled
  };

  // eslint-disable-next-line no-unused-vars
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


  // eslint-disable-next-line no-unused-vars
  const handleError = (error: CubeError | TouchError, _message?: string) => {
    // Error handling for cube and touch interactions
    console.error('Interaction error:', error, _message);
  };


  const { canvas } = useThreeContext();

  // Set canvas pointerEvents for mobile
  useEffect(() => {
    if (isMobile && canvas) {
      canvas.style.pointerEvents = 'auto';
      console.log('🪲 CubeScene: Set canvas pointerEvents to auto for mobile');
    }
  }, [isMobile, canvas]);

  return (
    <>
      <CubeRenderer
        scene={scene}
        isAnimating={false}
        onCubeGroupReady={handleCubeGroupReady}
      />
      
      {isMobile ? (
        <TouchControls
          scene={scene}
          camera={camera!}
          canvas={canvas}
          isEnabled={true}
          onFaceRotation={(face, direction) => {
            const command: RotationCommand = {
              face,
              direction,
              targetAngle: Math.PI / 2,
              angle: 0,
              isComplete: false
            };
            handleRotationStart(command);
          }}
          onError={(error, message) => handleError(error as any, message)}
        >
          <MouseControls
            camera={camera!}
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
        </TouchControls>
      ) : (
        <MouseControls
          camera={camera!}
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
      )}
      
      {/* Debug controls - shown in development or when debug flag is enabled */}
      <DebugControls
        isVisible={featureFlags.getFlag('enableDevelopmentTools')}
        camera={camera}
        scene={scene}
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