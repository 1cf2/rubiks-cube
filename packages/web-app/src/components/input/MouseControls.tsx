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
import { VisualFeedbackManager } from '../three/VisualFeedbackManager';
import { DebugOverlay } from '../debug/DebugOverlay';
import { isOverlayEnabled } from '../../utils/featureFlags';
import { DebugLogger } from '../../utils/debugLogger';
import { useCameraControls } from '../../hooks/useCameraControls';

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
  onFaceHover,
  onFaceSelect,
  onRotationStart,
  onRotationComplete,
  onError,
  className,
  style,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [visualFeedback, setVisualFeedback] = useState<Map<FacePosition, VisualFeedback>>(new Map());
  // eslint-disable-next-line no-unused-vars
  const checkMoveValidityRef = useRef<((face: FacePosition) => boolean) | null>(null);
  
  // Get canvas element for camera controls
  const canvasElement = React.useMemo(() => {
    return document.querySelector('canvas') as HTMLCanvasElement;
  }, []);

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
      const wasOverCube = isOverCube;
      const nowOverCube = face !== null;
      
      if (wasOverCube !== nowOverCube) {
        window.console.log('🎯 Cube hover changed:', { face, isOverCube: nowOverCube });
      }
      
      setIsOverCube(nowOverCube); // Update camera control state
      onFaceHover?.(face);
    },
    onFaceSelect: (face, intersectionPoint, mesh, hitNormal) => {
      // Check if move is valid before selecting
      if (enableInvalidMovePrevention && checkMoveValidityRef.current && !checkMoveValidityRef.current(face)) {
        return; // Block the selection if move is invalid
      }
      
      updateVisualFeedback(face, 'selected', intersectionPoint, mesh, hitNormal);
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
      // Clear visual feedback for the rotated face
      updateVisualFeedback(command.face, 'normal');
      
      // Clear ALL visual feedback to prevent stale highlights after cube state changes
      setVisualFeedback(new Map());
      
      // Show completion feedback
      if (enableCompletionFeedback) {
        showSuccessFlash(command.face);
      }
      
      window.console.log('🧹 Cleared all visual feedback after rotation completion');
      
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
    state: VisualFeedback['state'],
    intersectionPoint?: readonly [number, number, number],
    targetMesh?: any,
    hitNormal?: readonly [number, number, number]
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
      ...(intersectionPoint && { intersectionPoint }),
      ...(targetMesh && { targetMesh }),
      ...(hitNormal && { hitNormal }),
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
      case 'selected': return 0.8; // High opacity for clear mouse down feedback
      case 'rotating': return 0.7;
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
      case 'selected': return 0.15; // Increased for better mouse down feedback
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
      case 'selected': return [1.0, 0.5, 0.0] as const; // Pure orange for mouse down feedback
      case 'rotating': return [1.0, 0.2, 0.2] as const; // Red
      case 'blocked': return [1.0, 0.3, 0.3] as const; // Light red
      case 'preview': return [0.8, 0.8, 1.0] as const; // Very light blue
      case 'success': return [0.2, 1.0, 0.3] as const; // Green
      default: return [1.0, 1.0, 1.0] as const; // White
    }
  };

  // Convert cursor state to CSS cursor
  const getCSSCursor = (cursorState: CursorState): string => {
    // Override cursor if camera is being dragged
    if (isDraggingCamera) {
      return 'grabbing';
    }
    
    switch (cursorState) {
      case CursorState.DEFAULT: return isOverCube ? 'pointer' : 'grab'; // Show grab cursor when over empty space
      case CursorState.HOVER: return 'pointer';
      case CursorState.GRABBING: return 'grabbing';
      case CursorState.ROTATING: return 'grabbing';
      case CursorState.DISABLED: return 'not-allowed';
      default: return isOverCube ? 'pointer' : 'grab';
    }
  };

  // State to track if we're currently over a cube piece
  const [isOverCube, setIsOverCube] = useState(false);
  const [isDraggingCamera, setIsDraggingCamera] = useState(false);
  const lastCameraOrbitRef = useRef<{ x: number; y: number } | null>(null);

  // Use handlers from useMouseGestures hook with camera control integration
  const handleContainerMouseDown = useCallback((event: React.MouseEvent) => {
    if (!isEnabled) return;
    
    window.console.log('🖱️ MouseDown - button:', event.button);
    
    // For right-click, always try camera orbit first
    if (event.button === 2 && enableCameraControls && cameraControls) {
      window.console.log('🔄 Starting camera orbit (right-click)');
      setIsDraggingCamera(true);
      lastCameraOrbitRef.current = { x: event.clientX, y: event.clientY };
      event.preventDefault(); // Prevent context menu
      return;
    }
    
    // For left-click, check if over cube first
    handlers.onMouseDown(event);
    
    // If left-click and not over cube, try camera orbit
    if (event.button === 0 && !isOverCube && enableCameraControls && cameraControls) {
      window.console.log('🔄 Starting camera orbit (left-click)');
      setIsDraggingCamera(true);
      lastCameraOrbitRef.current = { x: event.clientX, y: event.clientY };
    }
  }, [isEnabled, isOverCube, enableCameraControls, handlers, cameraControls]);

  const handleContainerMouseMove = useCallback((event: React.MouseEvent) => {
    if (!isEnabled) return;
    
    // Always handle cube hover to determine if we're over a cube piece
    handlers.onMouseMove(event);
    
    // If dragging camera, handle camera orbit
    if (isDraggingCamera && enableCameraControls && lastCameraOrbitRef.current && cameraControls) {
      const deltaX = event.clientX - lastCameraOrbitRef.current.x;
      const deltaY = event.clientY - lastCameraOrbitRef.current.y;
      
      // Only process if there's actual movement
      if (Math.abs(deltaX) > 1 || Math.abs(deltaY) > 1) {
        window.console.log('🔄 Camera orbit move:', { deltaX, deltaY, clientX: event.clientX, clientY: event.clientY });
        
        // Apply camera orbit with high sensitivity to compensate for OrbitCameraManager's 0.01 factor
        const sensitivity = 1.0; // Raw delta values since OrbitCameraManager applies 0.01 internally
        const result = cameraControls.orbitCamera(deltaX * sensitivity, deltaY * sensitivity);
        
        if (!result.success) {
          window.console.error('🔄 Orbit failed:', result.error);
        } else {
          window.console.log('🔄 Orbit applied successfully');
        }
        
        // Update last position
        lastCameraOrbitRef.current = { x: event.clientX, y: event.clientY };
      }
    }
  }, [isEnabled, isDraggingCamera, enableCameraControls, handlers, cameraControls]);

  const handleContainerMouseUp = useCallback((event: React.MouseEvent) => {
    if (!isEnabled) return;
    
    window.console.log('🖱️ MouseUp - button:', event.button, 'isDraggingCamera:', isDraggingCamera);
    
    // End camera dragging for both left and right mouse button
    if (isDraggingCamera) {
      window.console.log('🔄 Ending camera orbit');
      setIsDraggingCamera(false);
      lastCameraOrbitRef.current = null;
    }
    
    // Always handle cube mouse up
    handlers.onMouseUp(event);
  }, [isEnabled, isDraggingCamera, handlers]);

  const handleContainerMouseLeave = useCallback((event: React.MouseEvent) => {
    if (!isEnabled) return;
    handlers.onMouseLeave(event);
    
    // End camera dragging on mouse leave
    if (isDraggingCamera) {
      setIsDraggingCamera(false);
      lastCameraOrbitRef.current = null;
    }
  }, [isEnabled, isDraggingCamera, handlers]);

  const handleContainerMouseEnter = useCallback((event: React.MouseEvent) => {
    if (!isEnabled) return;
    handlers.onMouseEnter(event);
  }, [isEnabled, handlers]);

  const handleContainerWheel = useCallback((event: React.WheelEvent) => {
    if (!isEnabled || !enableCameraControls || !cameraControls) {
      window.console.log('🔧 Wheel blocked:', { isEnabled, enableCameraControls, hasCameraControls: !!cameraControls });
      return;
    }
    
    // Prevent default scroll behavior
    event.preventDefault();
    event.stopPropagation();
    
    // Apply zoom - normalize wheel delta across different browsers with slower speed
    const delta = event.deltaY > 0 ? 0.05 : -0.05; // Reduced from 0.1 to 0.05 (half speed)
    window.console.log('🔧 Applying zoom:', delta, 'deltaY:', event.deltaY);
    
    const result = cameraControls.zoomCamera(delta);
    if (!result.success) {
      window.console.error('🔧 Zoom failed:', result.error);
    }
  }, [isEnabled, enableCameraControls, cameraControls]);

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
      
      {/* Visual feedback system for mouse down highlighting */}
      <VisualFeedbackManager
        scene={scene}
        cubeGroup={cubeGroup}
        cubeStateVersion={cubeStateVersion}
        feedbackMap={visualFeedback}
        isEnabled={isEnabled}
        {...(onError && { onError })}
      />
      
      <div
        ref={containerRef}
        className={className}
        style={containerStyle}
        onMouseDown={handleContainerMouseDown}
        onMouseMove={handleContainerMouseMove}
        onMouseUp={handleContainerMouseUp}
        onMouseLeave={handleContainerMouseLeave}
        onMouseEnter={handleContainerMouseEnter}
        onWheel={handleContainerWheel}
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