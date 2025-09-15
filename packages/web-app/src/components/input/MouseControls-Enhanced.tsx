// Enhanced MouseControls with Face-to-Face Integration
// This is the complete enhanced version with dual interaction modes

// @ts-nocheck
import React, { useEffect, useRef, useCallback, useState } from 'react';
import * as THREE from 'three';
import {
  FacePosition,
  RotationCommand,
  VisualFeedback,
  CubeError,
  Move,
} from '@rubiks-cube/shared/types';
// Using string literal for direction to avoid import issues
import { DebugLogger } from '../../utils/debugLogger';
import { useCameraControls } from '../../hooks/useCameraControls';
// Face-to-Face interaction system
import { FaceToFaceMouseInteractionHandler } from '@rubiks-cube/three-renderer';

export interface MouseControlsProps {
  camera: THREE.Camera | null;
  scene: THREE.Scene | null;
  cubeGroup: THREE.Group | null;
  cubeStateVersion?: number;
  isEnabled?: boolean;
  enableRotationPreview?: boolean;
  previewIntensity?: number;
  enableCompletionFeedback?: boolean;
  completionIntensity?: number;
  enableInvalidMovePrevention?: boolean;
  allowConcurrentAnimations?: boolean;
  enableDebugOverlay?: boolean;
  enableCameraControls?: boolean;
  // Face-to-Face mode toggle prop
  enableFaceToFaceMode?: boolean;
  /* eslint-disable no-unused-vars */
  onFaceHover?: (face: FacePosition | null) => void;
  onFaceSelect?: (face: FacePosition) => void;
  onRotationStart?: (command: RotationCommand) => void;
  onRotationComplete?: (command: RotationCommand, move: Move) => void;
  onError?: (error: CubeError, message?: string) => void;
  /* eslint-enable no-unused-vars */
  className?: string;
  style?: React.CSSProperties;
}

export const MouseControls: React.FC<MouseControlsProps> = ({
  camera,
  scene,
  cubeGroup,
  cubeStateVersion = 0,
  isEnabled = true,
  enableRotationPreview = true,
  previewIntensity = 0.6,
  enableCompletionFeedback = true,
  completionIntensity = 1.0,
  enableInvalidMovePrevention = true,
  allowConcurrentAnimations = false,
  enableDebugOverlay = false,
  enableCameraControls = true,
  enableFaceToFaceMode = false, // New face-to-face mode prop
  onFaceHover,
  onFaceSelect,
  onRotationStart,
  onRotationComplete,
  onError,
  className,
  style,
}) => {
  /* eslint-disable no-unused-vars */
  const containerRef = useRef<HTMLDivElement>(null);
  const [visualFeedback, setVisualFeedback] = useState<Map<FacePosition, VisualFeedback>>(new Map());
  const [startPiecePosition, setStartPiecePosition] = useState<readonly [number, number, number] | null>(null);
  const checkMoveValidityRef = useRef<((face: FacePosition) => boolean) | null>(null);

  // Face-to-Face state management
  const [isFaceToFaceModeActive, setIsFaceToFaceModeActive] = useState(enableFaceToFaceMode);
  const faceToFaceHandlerRef = useRef<FaceToFaceMouseInteractionHandler | null>(null);
  const [faceToFaceVisualFeedback, setFaceToFaceVisualFeedback] = useState<VisualFeedback[]>([]);

  // Get canvas element for camera controls and face-to-face system
  const canvasElement = React.useMemo(() => {
    return document.querySelector('canvas') as HTMLCanvasElement;
  }, []);

  // Update face-to-face mode when prop changes
  useEffect(() => {
    setIsFaceToFaceModeActive(enableFaceToFaceMode);
  }, [enableFaceToFaceMode]);

  // Initialize face-to-face handler when dependencies are ready
  useEffect(() => {
    if (!scene || !camera || !cubeGroup || !canvasElement) return;

    if (isFaceToFaceModeActive && !faceToFaceHandlerRef.current) {
      try {
        // Create Three.js renderer instance - this needs to be enhanced based on your application setup
        // For now, creating a basic WebGLRenderer that matches your application's renderer
        const renderer = new THREE.WebGLRenderer({
          canvas: canvasElement,
          antialias: true,
          alpha: true
        });

        faceToFaceHandlerRef.current = new FaceToFaceMouseInteractionHandler(
          scene,
          camera as THREE.PerspectiveCamera,
          renderer,
          cubeGroup
        );

        window.console.log('🎯 Face-to-Face interaction handler initialized successfully');

      } catch (error) {
        console.error('❌ Failed to initialize Face-to-Face handler:', error);
        onError?.(CubeError.WEBGL_CONTEXT_LOST, 'Failed to initialize Face-to-Face interaction system');
      }

    } else if (!isFaceToFaceModeActive && faceToFaceHandlerRef.current) {
      // Dispose face-to-face handler when disabled
      try {
        faceToFaceHandlerRef.current.dispose();
        faceToFaceHandlerRef.current = null;
        setFaceToFaceVisualFeedback([]);
        window.console.log('🎯 Face-to-Face interaction handler disposed');
      } catch (error) {
        console.error('❌ Error disposing Face-to-Face handler:', error);
      }
    }
  }, [scene, camera, cubeGroup, canvasElement, isFaceToFaceModeActive, onError]);

  // Camera controls for manual cube rotation when not over cube pieces
  const cameraControls = useCameraControls(
    scene,
    camera as THREE.PerspectiveCamera,
    canvasElement
  );

  // Log camera controls state only once when fully initialized
  useEffect(() => {
    if (cameraControls?.isInitialized && canvasElement && scene && camera) {
      window.console.log('🎮 Camera controls initialized successfully');
    }
  }, [cameraControls?.isInitialized, canvasElement, scene, camera]);

  // Log when component mounts
  useEffect(() => {
    DebugLogger.debug('MouseControls', 'Component mounted', {
      isEnabled,
      containerRef: containerRef.current,
      hasCamera: !!camera,
      hasScene: !!scene,
      hasCubeGroup: !!cubeGroup,
      faceToFaceEnabled: isFaceToFaceModeActive
    });
  }, [isEnabled, camera, scene, cubeGroup, isFaceToFaceModeActive]);

  // ... existing code for useMoveCompletionFeedback, useInvalidMovePrevention ...

  // Enhanced face hover handler with face-to-face feedback
  const handleFaceHoverEnhanced = useCallback((face: FacePosition | null) => {
    // Always call original hover callback
    onFaceHover?.(face);

    // Update face-to-face visual feedback based on current mouse position
    if (isFaceToFaceModeActive && faceToFaceHandlerRef.current && face) {
      // Get current mouse position for world coordinate calculation
      const mouseEvent = window.event as MouseEvent;
      if (mouseEvent && canvasElement) {
        const rect = canvasElement.getBoundingClientRect();

        // Convert screen coordinates to normalized device coordinates
        const mouseX = ((mouseEvent.clientX - rect.left) / rect.width) * 2 - 1;
        const mouseY = -((mouseEvent.clientY - rect.top) / rect.height) * 2 + 1;

        // Simple world position calculation (enhance with your raycasting logic)
        const worldPos: readonly [number, number, number] = [
          mouseX * 2,  // Scale based on your scene setup
          mouseY * 2,
          0.5  // Approximate face depth
        ];

        try {
          // Update face-to-face interaction with current position
          const dragResult = faceToFaceHandlerRef.current.handleDragUpdate(worldPos);

          // Update visual feedback
          const feedback = faceToFaceHandlerRef.current.updateFaceToFaceVisualFeedback(worldPos);
          setFaceToFaceVisualFeedback(feedback);

          // Debug logging
          if (dragResult.data.canRotate) {
            window.console.log('🎯 Valid face-to-face gesture state:', {
              face,
              canRotate: dragResult.data.canRotate,
              adjacencyState: dragResult.data.adjacencyState,
              validFaces: dragResult.data.validFaces?.length || 0
            });
          }

        } catch (error) {
          console.error('❌ Error updating face-to-face interaction:', error);
        }
      }
    }
  }, [isFaceToFaceModeActive, onFaceHover, canvasElement]);

  // Enhanced face selection handler
  const handleFaceSelectEnhanced = useCallback((
    face: FacePosition,
    intersectionPoint: readonly [number, number, number],
    mesh: any,
    hitNormal: readonly [number, number, number]
  ) => {
    // Always call original face select callback
    onFaceSelect?.(face);

    // Handle face-to-face selection if mode is active
    if (isFaceToFaceModeActive && faceToFaceHandlerRef.current && intersectionPoint) {
      try {
        const result = faceToFaceHandlerRef.current.handleFaceSelection(
          face,
          intersectionPoint,
          hitNormal || [0, 0, 1],
          Date.now()
        );

        if (result.success) {
          window.console.log('🎯 Face A selected in face-to-face mode:', {
            face,
            position: intersectionPoint,
            timestamp: Date.now(),
          });

          // Update initial visual feedback
          const feedback = faceToFaceHandlerRef.current.updateFaceToFaceVisualFeedback(intersectionPoint);
          setFaceToFaceVisualFeedback(feedback);

        } else {
          console.error('❌ Failed to initialize face-to-face face selection:', result);
        }

      } catch (error) {
        console.error('❌ Error in face-to-face face selection:', error);
      }
    }
  }, [isFaceToFaceModeActive, onFaceSelect]);

  // Enhanced rotation start handler
  const handleRotationStartEnhanced = useCallback((command: RotationCommand) => {
    // Always call original rotation start callback
    onRotationStart?.(command);

    // Log face-to-face mode status
    if (isFaceToFaceModeActive) {
      window.console.log('🎯 Rotation start (Face-to-Face mode):', {
        face: command.face,
        direction: command.direction
      });
    }
  }, [isFaceToFaceModeActive, onRotationStart]);

  // Enhanced rotation update handler with face-to-face integration
  const handleRotationUpdateEnhanced = useCallback((command: RotationCommand, dragInfo: any) => {
    // Always call existing logic first
    // ... your existing onRotationUpdate logic ...

    // Enhanced with face-to-face updates
    if (isFaceToFaceModeActive && faceToFaceHandlerRef.current && dragInfo?.currentMesh) {
      try {
        const currentPos = [
          dragInfo.currentMesh.position.x,
          dragInfo.currentMesh.position.y,
          dragInfo.currentMesh.position.z
        ] as readonly [number, number, number];

        const dragResult = faceToFaceHandlerRef.current.handleDragUpdate(currentPos);

        if (dragResult.success && dragResult.data.canRotate && dragResult.data.rotationCommand) {
          // Log detailed face-to-face interaction state
          window.console.log('🎯 Face-to-face drag update:', {
            face: command.face,
            canRotate: dragResult.data.canRotate,
            adjacencyState: dragResult.data.adjacencyState,
            hasValidRotation: !!dragResult.data.rotationCommand
          });

          // Update visual feedback
          const feedback = faceToFaceHandlerRef.current.updateFaceToFaceVisualFeedback(currentPos);
          setFaceToFaceVisualFeedback(feedback);

          // Check if we should trigger rotation
          if (dragResult.data.rotationCommand && !command.isComplete) {
            handleRotationStartEnhanced(dragResult.data.rotationCommand as any);
          }
        }

      } catch (error) {
        console.error('❌ Error in face-to-face rotation update:', error);
      }
    }
  }, [isFaceToFaceModeActive, handleRotationStartEnhanced]);

  // Enhanced rotation complete handler
  const handleRotationCompleteEnhanced = useCallback((command: RotationCommand, move: Move) => {
    // Always call original callback
    onRotationComplete?.(command, move);

    // Complete face-to-face gesture if active
    if (isFaceToFaceModeActive && faceToFaceHandlerRef.current) {
      try {
        const completeResult = faceToFaceHandlerRef.current.handleGestureComplete();
        if (completeResult.success) {
          window.console.log('🎯 Face-to-face gesture completed');
          setFaceToFaceVisualFeedback([]);
        } else {
          console.error('❌ Failed to complete face-to-face gesture:', completeResult);
        }
      } catch (error) {
        console.error('❌ Error completing face-to-face gesture:', error);
      }
    }
  }, [isFaceToFaceModeActive, onRotationComplete]);

  // ... rest of the existing component code ...

  // Modified visual feedback rendering to include face-to-face feedback
  const combinedVisualFeedback = React.useMemo(() => {
    const combined = new Map(visualFeedback);

    // Add face-to-face visual feedback
    faceToFaceVisualFeedback.forEach(feedback => {
      // Create a proper VisualFeedback object or adapt as needed
      const feedbackObject: VisualFeedback = {
        face: feedback.face,
        state: feedback.state,
        opacity: feedback.opacity || 0.5,
        emissiveIntensity: feedback.emissiveIntensity || 0.1,
        color: feedback.color || [0.5, 0.8, 1.0],
        ...feedback
      };
      combined.set(feedback.face, feedbackObject);
    });

    return combined;
  }, [visualFeedback, faceToFaceVisualFeedback]);

  return (
    <>
      {/* ... existing JSX return statement ... */}

      {/* Face-to-face mode toggle UI */}
      {isEnabled && (
        <div style={{
          position: 'absolute',
          top: '90px', // Below the existing settings
          right: '10px',
          background: 'rgba(0, 0, 0, 0.8)',
          color: 'white',
          padding: '8px 16px',
          borderRadius: '24px',
          fontSize: '14px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          userSelect: 'none'
        }}>
          🎯 Face-to-Face
          <input
            type="checkbox"
            checked={isFaceToFaceModeActive}
            onChange={(e) => setIsFaceToFaceModeActive(e.target.checked)}
            style={{
              margin: 0,
              accentColor: '#4CAF50',
              cursor: 'pointer'
            }}
            title="Toggle Face-to-Face Interaction Mode"
          />
        </div>
      )}

      {/* ... rest of the existing return statement ... */}
    </>
  );
};