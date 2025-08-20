import React, { useEffect, useRef, useCallback, useState } from 'react';
import * as THREE from 'three';
import {
  FacePosition,
  RotationCommand,
  VisualFeedback,
  CubeError,
  Move,
  CursorState,
} from '@rubiks-cube/shared/types';
// Using string literal for direction to avoid import issues
import { useMouseGestures } from '../../hooks/useMouseGestures';
import { useCubeInteraction } from '../../hooks/useCubeInteraction';
import { RotationPreviewManager } from '../three/RotationPreviewManager';
import { useMoveCompletionFeedback } from '../three/MoveCompletionFeedback';
import { useInvalidMovePrevention } from '../three/InvalidMovePreventionManager';
import { DebugOverlay } from '../debug/DebugOverlay';
import { isOverlayEnabled } from '../../utils/featureFlags';
import { DebugLogger } from '../../utils/debugLogger';

export interface MouseControlsProps {
  camera: THREE.Camera | null;
  scene: THREE.Scene | null;
  cubeGroup: THREE.Group | null;
  isEnabled?: boolean;
  enableRotationPreview?: boolean;
  previewIntensity?: number;
  enableCompletionFeedback?: boolean;
  completionIntensity?: number;
  enableInvalidMovePrevention?: boolean;
  allowConcurrentAnimations?: boolean;
  enableDebugOverlay?: boolean;
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
  isEnabled = true,
  enableRotationPreview = true,
  previewIntensity = 0.6,
  enableCompletionFeedback = true,
  completionIntensity = 1.0,
  enableInvalidMovePrevention = true,
  allowConcurrentAnimations = false,
  enableDebugOverlay = false,
  onFaceHover,
  onFaceSelect,
  onRotationStart,
  onRotationComplete,
  onError,
  className,
  style,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [, setVisualFeedback] = useState<Map<FacePosition, VisualFeedback>>(new Map());
  // eslint-disable-next-line no-unused-vars
  const checkMoveValidityRef = useRef<((face: FacePosition) => boolean) | null>(null);

  // Log when component mounts
  useEffect(() => {
    DebugLogger.debug('MouseControls', 'Component mounted', {
      isEnabled,
      containerRef: containerRef.current,
      hasCamera: !!camera,
      hasScene: !!scene,
      hasCubeGroup: !!cubeGroup
    });
  }, [isEnabled, camera, scene, cubeGroup]);

  // Move completion feedback hook
  const { 
    showSuccessFlash,
    FeedbackComponent 
  } = useMoveCompletionFeedback(scene, cubeGroup, {
    isEnabled: enableCompletionFeedback,
    flashIntensity: completionIntensity,
    ...(onError && { onError }),
  });

  // Cube interaction hook first to get state
  const {
    interactionState,
    currentRotation,
    isAnimating,
    handleMouseHover,
    handleDragStart,
    handleDragUpdate,
    handleDragEnd,
    handleMouseLeave,
    resetInteraction,
  } = useCubeInteraction({
    camera,
    scene,
    animationOptions: {
      duration: 300,
      easing: 'ease-out',
      frameRate: 60,
      snapToGrid: true,
    },
    onFaceHover: (face) => {
      updateVisualFeedback(face, face ? 'hover' : 'normal');
      onFaceHover?.(face);
    },
    onFaceSelect: (face) => {
      // Check if move is valid before selecting
      if (enableInvalidMovePrevention && checkMoveValidityRef.current && !checkMoveValidityRef.current(face)) {
        return; // Block the selection if move is invalid
      }
      
      updateVisualFeedback(face, 'selected');
      onFaceSelect?.(face);
    },
    onRotationStart: (command) => {
      window.console.log('🎮 MouseControls: onRotationStart received:', command);
      
      // Skip invalid move prevention for completed rotations (drag end finalization)
      // This prevents race conditions where currentRotation hasn't been cleared yet
      if (command.isComplete) {
        window.console.log('🎮 MouseControls: Skipping invalid move prevention for completed rotation');
        updateVisualFeedback(command.face, 'rotating');
        window.console.log('🎮 MouseControls: Calling parent onRotationStart callback');
        onRotationStart?.(command);
        return;
      }
      
      // Final check before starting rotation (only for non-completed rotations)
      if (enableInvalidMovePrevention && checkMoveValidityRef.current && !checkMoveValidityRef.current(command.face)) {
        window.console.log('🚫 MouseControls: Rotation blocked by invalid move prevention');
        window.console.log('🔍 Debug - currentRotation:', currentRotation);
        window.console.log('🔍 Debug - isAnimating:', isAnimating);
        window.console.log('🔍 Debug - selectedFace:', interactionState.selectedFace);
        window.console.log('🔍 Debug - currentlyAnimating array:', [
          ...(currentRotation ? [currentRotation.face] : []),
          ...(interactionState.selectedFace && isAnimating ? [interactionState.selectedFace] : [])
        ]);
        return; // Block the rotation if move is invalid
      }
      
      updateVisualFeedback(command.face, 'rotating');
      window.console.log('🎮 MouseControls: Calling parent onRotationStart callback');
      onRotationStart?.(command);
    },
    onRotationComplete: (command, move) => {
      updateVisualFeedback(command.face, 'normal');
      
      // Show completion feedback
      if (enableCompletionFeedback) {
        showSuccessFlash(command.face);
      }
      
      onRotationComplete?.(command, move);
    },
    onError: (error, message) => {
      // Handle error silently for now
      onError?.(error, message);
    },
  });

  // Invalid move prevention hook
  const {
    checkMoveValidity,
    PreventionComponent
  } = useInvalidMovePrevention(scene, cubeGroup, {
    currentlyAnimating: [
      ...(currentRotation ? [currentRotation.face] : []),
      ...(interactionState.selectedFace && isAnimating ? [interactionState.selectedFace] : [])
    ],
    allowConcurrentAnimations,
    isEnabled: enableInvalidMovePrevention,
    onInvalidMoveAttempt: (/* face, reason */) => {
      // Invalid move blocked
    },
    ...(onError && { onError }),
  });

  // Update the ref with the current function
  checkMoveValidityRef.current = checkMoveValidity;


  // Mouse gesture hook - optimized for trackpad with very low thresholds
  const { cursorState, handlers, isDragging, currentGesture } = useMouseGestures({
    minDragDistance: 1, // Minimal distance for trackpad
    maxDragTime: 10000, // Longer time for trackpad gestures
    snapThreshold: 5, // Very low threshold
    sensitivity: 2.0, // High sensitivity for trackpad
    onDragStart: handleDragStart,
    onDragUpdate: handleDragUpdate,
    onDragEnd: handleDragEnd,
    onHover: handleMouseHover,
    onLeave: handleMouseLeave,
  });

  // Update visual feedback for a face
  const updateVisualFeedback = useCallback((
    face: FacePosition | null, 
    state: VisualFeedback['state']
  ) => {
    if (!face) {
      // Clear all feedback
      setVisualFeedback(new Map());
      return;
    }

    const feedback: VisualFeedback = {
      face,
      state,
      opacity: getOpacityForState(state),
      emissiveIntensity: getEmissiveIntensityForState(state),
      color: getColorForState(state),
    };

    setVisualFeedback(prev => {
      const newMap = new Map(prev);
      if (state === 'normal') {
        newMap.delete(face);
      } else {
        newMap.set(face, feedback);
      }
      return newMap;
    });
  }, []);

  // Get opacity based on state
  const getOpacityForState = (state: VisualFeedback['state']): number => {
    switch (state) {
      case 'hover': return 0.2;
      case 'selected': return 0.4;
      case 'rotating': return 0.6;
      case 'blocked': return 0.15;
      case 'preview': return 0.1;
      case 'success': return 0.4;
      default: return 0;
    }
  };

  // Get emissive intensity based on state
  const getEmissiveIntensityForState = (state: VisualFeedback['state']): number => {
    switch (state) {
      case 'hover': return 0;
      case 'selected': return 0.1;
      case 'rotating': return 0.2;
      case 'blocked': return 0;
      case 'preview': return 0;
      case 'success': return 0.1;
      default: return 0;
    }
  };

  // Get color based on state
  const getColorForState = (state: VisualFeedback['state']): readonly [number, number, number] => {
    switch (state) {
      case 'hover': return [0.3, 0.7, 1.0] as const; // Light blue
      case 'selected': return [1.0, 0.6, 0.1] as const; // Orange
      case 'rotating': return [1.0, 0.2, 0.2] as const; // Red
      case 'blocked': return [1.0, 0.3, 0.3] as const; // Light red
      case 'preview': return [0.8, 0.8, 1.0] as const; // Very light blue
      case 'success': return [0.2, 1.0, 0.3] as const; // Green
      default: return [1.0, 1.0, 1.0] as const; // White
    }
  };

  // Convert cursor state to CSS cursor
  const getCSSCursor = (cursorState: CursorState): string => {
    switch (cursorState) {
      case CursorState.DEFAULT: return 'default';
      case CursorState.HOVER: return 'pointer';
      case CursorState.GRABBING: return 'grabbing';
      case CursorState.ROTATING: return 'grabbing';
      case CursorState.DISABLED: return 'not-allowed';
      default: return 'default';
    }
  };

  // Use handlers from useMouseGestures hook
  const handleContainerMouseDown = useCallback((event: React.MouseEvent) => {
    if (!isEnabled) return;
    handlers.onMouseDown(event);
  }, [isEnabled, handlers]);

  const handleContainerMouseMove = useCallback((event: React.MouseEvent) => {
    if (!isEnabled) return;
    handlers.onMouseMove(event);
  }, [isEnabled, handlers]);

  const handleContainerMouseUp = useCallback((event: React.MouseEvent) => {
    if (!isEnabled) return;
    handlers.onMouseUp(event);
  }, [isEnabled, handlers]);

  const handleContainerMouseLeave = useCallback((event: React.MouseEvent) => {
    if (!isEnabled) return;
    handlers.onMouseLeave(event);
  }, [isEnabled, handlers]);

  const handleContainerMouseEnter = useCallback((event: React.MouseEvent) => {
    if (!isEnabled) return;
    handlers.onMouseEnter(event);
  }, [isEnabled, handlers]);

  // Reset interaction when disabled
  useEffect(() => {
    if (!isEnabled) {
      resetInteraction();
      setVisualFeedback(new Map());
    }
  }, [isEnabled, resetInteraction]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      resetInteraction();
    };
  }, [resetInteraction]);

  // The mouse gesture handling is now done through React event handlers
  // connected to the useMouseGestures hook above

  // Prevent context menu on right click
  const handleContextMenu = useCallback((event: React.MouseEvent) => {
    event.preventDefault();
  }, []);

  // Determine container style
  const containerStyle: React.CSSProperties = {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    cursor: isEnabled ? getCSSCursor(cursorState) : 'not-allowed',
    pointerEvents: isEnabled ? 'auto' : 'none',
    userSelect: 'none',
    WebkitUserSelect: 'none',
    touchAction: 'none', // Prevent touch scrolling and zooming
    WebkitTouchCallout: 'none', // Prevent iOS callout
    zIndex: 10, // Above canvas but below other UI elements
    backgroundColor: 'transparent', // Ensure transparent background
    ...style,
  };


  return (
    <>
      {/* Debug overlay - controlled by feature flags */}
      <DebugOverlay
        isDragging={isDragging}
        currentGesture={currentGesture}
        cursorState={cursorState}
        hoveredFace={interactionState.hoveredFace}
        selectedFace={interactionState.selectedFace}
        isEnabled={enableDebugOverlay || isOverlayEnabled()}
      />
      
      {/* Rotation preview system */}
      <RotationPreviewManager
        scene={scene}
        cubeGroup={cubeGroup}
        hoveredFace={interactionState.hoveredFace}
        currentDrag={interactionState.dragGesture}
        isEnabled={isEnabled && enableRotationPreview}
        previewIntensity={previewIntensity}
        {...(onError && { onError })}
      />
      
      {/* Move completion feedback system */}
      <FeedbackComponent />
      
      {/* Invalid move prevention system */}
      <PreventionComponent />
      
      <div
        ref={containerRef}
        className={className}
        style={containerStyle}
        onMouseDown={handleContainerMouseDown}
        onMouseMove={handleContainerMouseMove}
        onMouseUp={handleContainerMouseUp}
        onMouseLeave={handleContainerMouseLeave}
        onMouseEnter={handleContainerMouseEnter}
        onContextMenu={handleContextMenu}
        role="button"
        tabIndex={isEnabled ? 0 : -1}
        aria-label="Rubik's cube interaction area"
        aria-disabled={!isEnabled}
        data-testid="mouse-controls"
      >
        {/* Debug overlay to show interaction area */}
        {process.env['NODE_ENV'] === 'development' && (
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            border: '2px dashed red',
            pointerEvents: 'none',
            zIndex: 1000,
            color: 'red',
            fontSize: '12px',
            padding: '4px',
            backgroundColor: 'rgba(255,0,0,0.1)'
          }}>
            Mouse Controls Area
          </div>
        )}
      </div>
    </>
  );
};