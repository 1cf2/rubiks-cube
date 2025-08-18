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
import { useMouseGestures } from '../../hooks/useMouseGestures';
import { useCubeInteraction } from '../../hooks/useCubeInteraction';
import { RotationPreviewManager } from '../three/RotationPreviewManager';
import { useMoveCompletionFeedback } from '../three/MoveCompletionFeedback';
import { useInvalidMovePrevention } from '../three/InvalidMovePreventionManager';

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
  onFaceHover?: (face: FacePosition | null) => void;
  onFaceSelect?: (face: FacePosition) => void;
  onRotationStart?: (command: RotationCommand) => void;
  onRotationComplete?: (command: RotationCommand, move: Move) => void;
  onError?: (error: CubeError, message?: string) => void;
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
  const checkMoveValidityRef = useRef<((face: FacePosition) => boolean) | null>(null);

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
      // Final check before starting rotation
      if (enableInvalidMovePrevention && checkMoveValidityRef.current && !checkMoveValidityRef.current(command.face)) {
        return; // Block the rotation if move is invalid
      }
      
      updateVisualFeedback(command.face, 'rotating');
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
      console.error('Cube interaction error:', error, message);
      onError?.(error, message);
    },
  });

  // Invalid move prevention hook
  const {
    blockedMoves,
    checkMoveValidity,
    PreventionComponent
  } = useInvalidMovePrevention(scene, cubeGroup, {
    currentlyAnimating: [
      ...(currentRotation ? [currentRotation.face] : []),
      ...(interactionState.selectedFace && isAnimating ? [interactionState.selectedFace] : [])
    ],
    allowConcurrentAnimations,
    isEnabled: enableInvalidMovePrevention,
    onInvalidMoveAttempt: (face, reason) => {
      console.warn(`Invalid move attempt on ${face}: ${reason}`);
    },
    ...(onError && { onError }),
  });

  // Update the ref with the current function
  checkMoveValidityRef.current = checkMoveValidity;


  // Mouse gesture hook
  const { cursorState, handlers } = useMouseGestures({
    minDragDistance: 5,
    maxDragTime: 5000,
    snapThreshold: 15,
    sensitivity: 1.0,
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

  // Handle container mouse events
  const handleContainerMouseDown = useCallback((event: React.MouseEvent) => {
    if (!isEnabled || isAnimating) return;
    handlers.onMouseDown(event);
  }, [isEnabled, isAnimating, handlers]);

  const handleContainerMouseMove = useCallback((event: React.MouseEvent) => {
    if (!isEnabled) return;
    handlers.onMouseMove(event);
  }, [isEnabled, handlers]);

  const handleContainerMouseUp = useCallback((event: React.MouseEvent) => {
    if (!isEnabled) return;
    handlers.onMouseUp(event);
  }, [isEnabled, handlers]);

  const handleContainerMouseLeave = useCallback((event: React.MouseEvent) => {
    handlers.onMouseLeave(event);
  }, [handlers]);

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
    touchAction: 'none', // Prevent touch scrolling
    ...style,
  };

  return (
    <>
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
      {/* Debug information in development */}
      {process.env['NODE_ENV'] === 'development' && (
        <div
          style={{
            position: 'absolute',
            top: 10,
            left: 10,
            background: 'rgba(0, 0, 0, 0.7)',
            color: 'white',
            padding: '8px',
            borderRadius: '4px',
            fontSize: '12px',
            fontFamily: 'monospace',
            pointerEvents: 'none',
            zIndex: 1000,
          }}
        >
          <div>Hovered: {interactionState.hoveredFace || 'none'}</div>
          <div>Selected: {interactionState.selectedFace || 'none'}</div>
          <div>Animating: {isAnimating ? 'yes' : 'no'}</div>
          <div>Cursor: {cursorState}</div>
          {currentRotation && (
            <div>
              Rotation: {currentRotation.face} {currentRotation.direction}
            </div>
          )}
          {enableInvalidMovePrevention && blockedMoves.length > 0 && (
            <div style={{ color: '#ff6b6b', marginTop: '4px' }}>
              <div>Blocked: {blockedMoves[blockedMoves.length - 1]?.reason}</div>
            </div>
          )}
        </div>
      )}
      </div>
    </>
  );
};