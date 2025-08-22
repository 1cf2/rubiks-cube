/* eslint-disable no-unused-vars, no-console */
import { useState, useCallback, useRef, useEffect } from 'react';
import * as THREE from 'three';
import { 
  MouseInteractionState,
  FacePosition,
  RotationCommand,
  RotationDirection,
  DragGesture,
  MousePosition,
  CubeError,
  Move,
  AnimationOptions,
  CursorState,
} from '@rubiks-cube/shared/types';
import { RaycastingUtils } from '../utils/raycasting';
import { DebugLogger, MouseGestureDebugger } from '../utils/debugLogger';
import { GestureLayerDetection } from '../utils/gestureLayerDetection';

interface UseCubeInteractionOptions {
  camera: THREE.Camera | null;
  scene: THREE.Scene | null;
  animationOptions?: Partial<AnimationOptions>;
  onFaceHover?: (_face: FacePosition | null) => void;
  onFaceSelect?: (_face: FacePosition, _intersectionPoint?: readonly [number, number, number], _mesh?: any, _hitNormal?: readonly [number, number, number]) => void;
  onRotationStart?: (_command: RotationCommand) => void;
  onRotationUpdate?: (_command: RotationCommand, _dragInfo?: { currentMesh?: any; startPiece?: readonly [number, number, number] | undefined; currentPiece?: readonly [number, number, number] | null }) => void;
  onRotationComplete?: (_command: RotationCommand, _move: Move) => void;
  onError?: (_error: CubeError, _message?: string) => void;
}

interface UseCubeInteractionReturn {
  interactionState: MouseInteractionState;
  currentRotation: RotationCommand | null;
  isAnimating: boolean;
  handleMouseHover: (_position: MousePosition) => void;
  handleDragStart: (_gesture: DragGesture) => void;
  handleDragUpdate: (_gesture: DragGesture) => void;
  handleDragEnd: (_gesture: DragGesture) => void;
  handleMouseLeave: () => void;
  resetInteraction: () => void;
}

const DEFAULT_ANIMATION_OPTIONS: AnimationOptions = {
  duration: 300,
  easing: 'ease-out',
  frameRate: 60,
  snapToGrid: true,
};

export function useCubeInteraction(
  options: UseCubeInteractionOptions
): UseCubeInteractionReturn {
  const { camera, scene, animationOptions = {}, ...callbacks } = options;
  const animOpts = { ...DEFAULT_ANIMATION_OPTIONS, ...animationOptions };

  const [interactionState, setInteractionState] = useState<MouseInteractionState>({
    isInteracting: false,
    hoveredFace: null,
    selectedFace: null,
    dragGesture: null,
    cursorState: CursorState.DEFAULT,
    lastInteraction: 0,
  });

  const [currentRotation, setCurrentRotation] = useState<RotationCommand | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);

  const lastHoveredFaceRef = useRef<FacePosition | null>(null);
  const rotationStartRef = useRef<{ face: FacePosition; startAngle: number; piecePosition?: readonly [number, number, number] } | null>(null);
  const currentPiecePositionRef = useRef<readonly [number, number, number] | null>(null);

  // Convert face position and rotation direction to Move notation
  const createMove = useCallback((face: FacePosition, direction: RotationDirection): Move => {
    const faceMap: Record<FacePosition, string> = {
      [FacePosition.FRONT]: 'F',
      [FacePosition.BACK]: 'B',
      [FacePosition.LEFT]: 'L',
      [FacePosition.RIGHT]: 'R',
      [FacePosition.UP]: 'U',
      [FacePosition.DOWN]: 'D',
    };

    const baseFace = faceMap[face];
    
    switch (direction) {
      case RotationDirection.CLOCKWISE:
        return baseFace as Move;
      case RotationDirection.COUNTERCLOCKWISE:
        return `${baseFace}'` as Move;
      case RotationDirection.DOUBLE:
        return `${baseFace}2` as Move;
      default:
        return baseFace as Move;
    }
  }, []);

  // Calculate rotation angle from drag distance
  const calculateRotationAngle = useCallback((
    gesture: DragGesture,
    _face: FacePosition
  ): number => {
    const { deltaX, deltaY } = gesture.delta;
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    
    // Convert pixel distance to rotation angle (radians)
    // Adjust sensitivity based on face orientation
    const baseAngle = (distance / 100) * Math.PI * (animOpts.snapToGrid ? 0.5 : 1);
    
    // Clamp to maximum 90 degrees per gesture
    return Math.min(baseAngle, Math.PI / 2);
  }, [animOpts.snapToGrid]);

  // Snap angle to nearest 90-degree increment
  const snapToGrid = useCallback((angle: number): number => {
    if (!animOpts.snapToGrid) return angle;
    
    const snapPoints = [0, Math.PI / 2, Math.PI, (3 * Math.PI) / 2, 2 * Math.PI];
    return snapPoints.reduce((closest, snap) => 
      Math.abs(angle - snap) < Math.abs(angle - closest) ? snap : closest
    );
  }, [animOpts.snapToGrid]);

  // Handle mouse hover
  const handleMouseHover = useCallback((position: MousePosition) => {
    if (!camera || !scene || isAnimating) return;

    const raycastResult = RaycastingUtils.raycastCubeFaces({
      camera,
      scene,
      mouse: position,
      recursive: true,
    });

    if (!raycastResult.success) {
      callbacks.onError?.(raycastResult.error, raycastResult.message);
      return;
    }

    const hoveredFace = raycastResult.data?.facePosition || null;
    
    // Only update if face changed
    if (hoveredFace !== lastHoveredFaceRef.current) {
      lastHoveredFaceRef.current = hoveredFace;
      
      setInteractionState(prev => ({
        ...prev,
        hoveredFace,
        lastInteraction: performance.now(),
      }));

      callbacks.onFaceHover?.(hoveredFace);
    }
  }, [camera, scene, isAnimating, callbacks]);

  // Handle drag start
  const handleDragStart = useCallback((gesture: DragGesture) => {
    // Find gesture ID from the gesture data or create one
    const gestureId = (gesture as any).gestureId || MouseGestureDebugger.startGestureTracking('CUBE_DRAG_START');
    
    if (!camera || !scene || isAnimating) {
      MouseGestureDebugger.endGestureTracking(gestureId, 'FAILED', 'missing deps or animating');
      return;
    }

    MouseGestureDebugger.trackGestureStep(gestureId, 'RAYCAST_START', gesture.startPosition);
    
    const raycastResult = RaycastingUtils.raycastCubeFaces({
      camera,
      scene,
      mouse: gesture.startPosition,
      recursive: true,
    });

    if (!raycastResult.success || !raycastResult.data) {
      MouseGestureDebugger.endGestureTracking(gestureId, 'FAILED', 'raycast failed');
      callbacks.onError?.(CubeError.RAYCASTING_FAILED, 'No face detected at drag start');
      return;
    }

    const selectedFace = raycastResult.data.facePosition;
    const intersectionPoint = raycastResult.data.point;
    const clickedMesh = raycastResult.data.mesh;
    const hitNormal = raycastResult.data.hitNormal;
    
    // Store the initial piece position for tracking movement
    const initialPiecePosition = clickedMesh ? [
      Math.round(clickedMesh.position.x),
      Math.round(clickedMesh.position.y),
      Math.round(clickedMesh.position.z)
    ] as const : null;
    
    window.console.log('🔍 Raycast result:', { 
      selectedFace, 
      intersectionPoint, 
      clickedMesh: clickedMesh?.uuid,
      meshPosition: clickedMesh ? { x: clickedMesh.position.x, y: clickedMesh.position.y, z: clickedMesh.position.z } : null,
      initialPiecePosition,
      hitNormal,
      raycastData: raycastResult.data 
    });
    MouseGestureDebugger.trackGestureStep(gestureId, 'FACE_SELECTED', { face: selectedFace, intersectionPoint });
    
    // Immediate visual feedback - call onFaceSelect right away to show highlighting
    callbacks.onFaceSelect?.(selectedFace, intersectionPoint, clickedMesh, hitNormal);
    
    setInteractionState(prev => ({
      ...prev,
      isInteracting: true,
      selectedFace,
      dragGesture: gesture,
      lastInteraction: performance.now(),
    }));

    rotationStartRef.current = {
      face: selectedFace,
      startAngle: 0,
      ...(initialPiecePosition && { piecePosition: initialPiecePosition }),
    };
    
    currentPiecePositionRef.current = initialPiecePosition;
    
    // Store gesture ID in the interaction state for later tracking
    (gesture as any).gestureId = gestureId;
  }, [camera, scene, isAnimating, callbacks]);

  // Handle drag update
  const handleDragUpdate = useCallback((gesture: DragGesture) => {
    const gestureId = (gesture as any).gestureId;
    if (!gestureId) return;
    
    if (!camera || !scene || !rotationStartRef.current || isAnimating) {
      MouseGestureDebugger.trackGestureStep(gestureId, 'DRAG_UPDATE_BLOCKED', {
        reason: !camera ? 'no camera' : !scene ? 'no scene' : !rotationStartRef.current ? 'no rotation start' : 'is animating'
      });
      return;
    }

    const { face } = rotationStartRef.current;
    
    // Check if we've moved enough to start a rotation
    const { deltaX, deltaY } = gesture.delta;
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    
    MouseGestureDebugger.trackGestureStep(gestureId, 'MOVEMENT_CHECK', {
      distance,
      threshold: 1,
      passed: distance >= 1
    });
    
    if (distance < 1) {
      return;
    }

    // Raycast at current mouse position to detect if we're over a new piece
    const currentRaycastResult = RaycastingUtils.raycastCubeFaces({
      camera,
      scene,
      mouse: gesture.currentPosition,
      recursive: true,
    });

    // Always use gesture-based layer detection for rotation
    let effectiveFace = face;
    let recalculateLayer = false;

    // Update current piece position if we hit something
    if (currentRaycastResult.success && currentRaycastResult.data) {
      const currentMesh = currentRaycastResult.data.mesh;
      const currentPiecePosition = currentMesh ? [
        Math.round(currentMesh.position.x),
        Math.round(currentMesh.position.y), 
        Math.round(currentMesh.position.z)
      ] as const : null;

      if (currentPiecePosition) {
        currentPiecePositionRef.current = currentPiecePosition;
      }
    }

    // Use gesture-based layer detection to determine the rotating layer
    const originalPosition = rotationStartRef.current?.piecePosition;
    const currentPosition = currentPiecePositionRef.current;
    
    if (originalPosition && currentPosition) {
      window.console.log('🎯 Using gesture-based rotation layer detection:', {
        startPiece: originalPosition,
        currentPiece: currentPosition,
        originalFace: face
      });

      const gestureLayerInfo = GestureLayerDetection.detectLayerFromGesture(originalPosition, currentPosition);
      
      if (gestureLayerInfo) {
        // Convert gesture layer info to face position - this becomes our rotation layer
        let detectedFace: FacePosition;
        switch (gestureLayerInfo.axis) {
          case 'x':
            detectedFace = gestureLayerInfo.layerIndex === -1 ? FacePosition.LEFT : 
                           gestureLayerInfo.layerIndex === 0 ? FacePosition.LEFT : FacePosition.RIGHT;
            break;
          case 'y':
            detectedFace = gestureLayerInfo.layerIndex === -1 ? FacePosition.DOWN : 
                           gestureLayerInfo.layerIndex === 0 ? FacePosition.UP : FacePosition.UP;
            break;
          case 'z':
            detectedFace = gestureLayerInfo.layerIndex === -1 ? FacePosition.BACK : 
                           gestureLayerInfo.layerIndex === 0 ? FacePosition.FRONT : FacePosition.FRONT;
            break;
          default:
            detectedFace = face; // fallback to original
        }

        effectiveFace = detectedFace;
        recalculateLayer = true;
        
        // Store gesture direction for use in rotation command
        (rotationStartRef.current as any).gestureDirection = gestureLayerInfo.direction;
        
        window.console.log('🎯 Rotation layer and direction set from gesture:', {
          originalFace: face,
          rotationFace: effectiveFace,
          gestureLayer: gestureLayerInfo,
          gestureDirection: gestureLayerInfo.direction
        });
      } else {
        window.console.log('🎯 No gesture layer detected, using original face:', face);
      }
    }
    
    // Use gesture-determined direction if available, otherwise calculate from raycasting
    let direction: 'clockwise' | 'counterclockwise' = 'clockwise';
    
    if ((rotationStartRef.current as any).gestureDirection) {
      direction = (rotationStartRef.current as any).gestureDirection;
      window.console.log('🎯 Using gesture-determined direction:', direction);
    } else {
      // Fallback to raycasting calculation
      const directionResult = RaycastingUtils.calculateRotationDirection(
        gesture.startPosition,
        gesture.currentPosition,
        effectiveFace,
        camera
      );

      if (!directionResult.success) {
        DebugLogger.error('useCubeInteraction', 'Failed to calculate rotation direction', directionResult);
        callbacks.onError?.(directionResult.error, directionResult.message);
        return;
      }

      direction = directionResult.data;
      window.console.log('🎯 Using raycasting-determined direction:', direction);
    }

    const angle = calculateRotationAngle(gesture, effectiveFace);
    const targetAngle = snapToGrid(angle);

    const rotationCommand: RotationCommand = {
      face: effectiveFace,
      direction: direction === 'clockwise' ? RotationDirection.CLOCKWISE : RotationDirection.COUNTERCLOCKWISE,
      angle,
      targetAngle,
      isComplete: false,
      recalculateLayer, // Add flag to indicate layer should be recalculated
    };

    MouseGestureDebugger.trackGestureStep(gestureId, 'ROTATION_COMMAND', {
      face: effectiveFace,
      originalFace: face,
      direction: direction === 'clockwise' ? 'CLOCKWISE' : 'COUNTERCLOCKWISE',
      angle,
      targetAngle,
      recalculateLayer
    });
    setCurrentRotation(rotationCommand);
    setInteractionState(prev => ({
      ...prev,
      dragGesture: gesture,
      lastInteraction: performance.now(),
    }));

    // Pass dragInfo for gesture-based layer detection
    const dragInfo = {
      currentMesh: currentRaycastResult.success ? currentRaycastResult.data?.mesh : undefined,
      startPiece: rotationStartRef.current?.piecePosition as readonly [number, number, number] | undefined,
      currentPiece: currentPiecePositionRef.current
    };
    
    window.console.log('🔵 useCubeInteraction onRotationUpdate:', {
      rotationCommand,
      dragInfo,
      hasCallback: !!callbacks.onRotationUpdate,
      raycastSuccess: currentRaycastResult.success,
      gestureDistance: distance
    });
    
    callbacks.onRotationUpdate?.(rotationCommand, dragInfo);
  }, [camera, scene, isAnimating, calculateRotationAngle, snapToGrid, callbacks, interactionState.selectedFace]);

  // Reset interaction state
  const resetInteraction = useCallback(() => {
    setInteractionState({
      isInteracting: false,
      hoveredFace: null,
      selectedFace: null,
      dragGesture: null,
      cursorState: CursorState.DEFAULT,
      lastInteraction: performance.now(),
    });

    setCurrentRotation(null);
    rotationStartRef.current = null;
    lastHoveredFaceRef.current = null;
  }, []);

  // Handle drag end
  const handleDragEnd = useCallback((gesture: DragGesture) => {
    const gestureId = (gesture as any).gestureId;
    if (!gestureId) return;
    
    MouseGestureDebugger.trackGestureStep(gestureId, 'DRAG_END', {
      hasCurrentRotation: !!currentRotation,
      hasRotationStart: !!rotationStartRef.current
    });
    
    // Calculate drag distance to determine if it was a meaningful drag
    const { deltaX, deltaY } = gesture.delta;
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    const minimumDragDistance = 1; // Minimum pixels for a rotation (trackpad optimized)
    
    MouseGestureDebugger.trackGestureStep(gestureId, 'DISTANCE_CHECK', {
      distance,
      minimumRequired: minimumDragDistance,
      duration: gesture.duration,
      passed: distance >= minimumDragDistance && gesture.duration > 50
    });
    
    // CRITICAL: Clear currentRotation immediately to prevent race condition with invalid move prevention
    // We need to save the current rotation before clearing it
    const savedCurrentRotation = currentRotation;
    setCurrentRotation(null);
    
    // If we have a face selection but no savedCurrentRotation and sufficient drag, create one
    if (rotationStartRef.current && !savedCurrentRotation && distance >= minimumDragDistance && gesture.duration > 50) {
      MouseGestureDebugger.trackGestureStep(gestureId, 'CREATING_ROTATION');
      
      // Always use gesture-based layer detection for rotation
      const originalPosition = rotationStartRef.current?.piecePosition;
      const currentPosition = currentPiecePositionRef.current;
      let face = rotationStartRef.current.face; // fallback
      
      if (originalPosition && currentPosition) {
        window.console.log('🎯 handleDragEnd: Using highlighted layer for rotation:', {
          originalPosition,
          currentPosition
        });
        
        const gestureLayerInfo = GestureLayerDetection.detectLayerFromGesture(originalPosition, currentPosition);
        
        if (gestureLayerInfo) {
          // Convert gesture layer info to face position - this is our rotation layer
          switch (gestureLayerInfo.axis) {
            case 'x':
              face = gestureLayerInfo.layerIndex === -1 ? FacePosition.LEFT : 
                     gestureLayerInfo.layerIndex === 0 ? FacePosition.LEFT : FacePosition.RIGHT;
              break;
            case 'y':
              face = gestureLayerInfo.layerIndex === -1 ? FacePosition.DOWN : 
                     gestureLayerInfo.layerIndex === 0 ? FacePosition.UP : FacePosition.UP;
              break;
            case 'z':
              face = gestureLayerInfo.layerIndex === -1 ? FacePosition.BACK : 
                     gestureLayerInfo.layerIndex === 0 ? FacePosition.FRONT : FacePosition.FRONT;
              break;
          }

          // Store gesture direction for use in rotation
          (rotationStartRef.current as any).gestureDirection = gestureLayerInfo.direction;

          window.console.log('🎯 handleDragEnd: Rotation layer and direction set from gesture:', {
            gestureLayer: gestureLayerInfo,
            rotationFace: face,
            gestureDirection: gestureLayerInfo.direction
          });
        } else {
          window.console.log('🎯 handleDragEnd: No gesture detected, using fallback face:', face);
        }
      }
      
      // Use gesture-determined direction if available, otherwise calculate from raycasting
      let direction = RotationDirection.CLOCKWISE;
      
      if ((rotationStartRef.current as any).gestureDirection) {
        const gestureDirection = (rotationStartRef.current as any).gestureDirection;
        direction = gestureDirection === 'clockwise' ? RotationDirection.CLOCKWISE : RotationDirection.COUNTERCLOCKWISE;
        window.console.log('🎯 handleDragEnd: Using gesture-determined direction:', gestureDirection);
      } else {
        // Fallback to raycasting calculation
        const directionResult = RaycastingUtils.calculateRotationDirection(
          gesture.startPosition,
          gesture.currentPosition,
          face,
          camera || new THREE.PerspectiveCamera()
        );
        
        if (directionResult.success && directionResult.data) {
          direction = directionResult.data === 'clockwise' 
            ? RotationDirection.CLOCKWISE 
            : RotationDirection.COUNTERCLOCKWISE;
          window.console.log('🎯 handleDragEnd: Using raycasting-determined direction:', directionResult.data);
        } else {
          // Fallback to simple direction calculation
          direction = Math.abs(deltaX) > Math.abs(deltaY) 
            ? (deltaX > 0 ? RotationDirection.CLOCKWISE : RotationDirection.COUNTERCLOCKWISE)
            : (deltaY > 0 ? RotationDirection.COUNTERCLOCKWISE : RotationDirection.CLOCKWISE);
          window.console.log('🎯 handleDragEnd: Using fallback direction calculation:', direction);
        }
      }
        
      const finalRotation: RotationCommand = {
        face,
        direction,
        angle: Math.PI / 2,
        targetAngle: Math.PI / 2,
        isComplete: true,
      };
      
      const move = createMove(finalRotation.face, finalRotation.direction);
      
      MouseGestureDebugger.trackGestureStep(gestureId, 'ROTATION_START', {
        face: finalRotation.face,
        direction: finalRotation.direction
      });
      // currentRotation already cleared above
      setIsAnimating(true);
      callbacks.onRotationStart?.(finalRotation);

      setTimeout(() => {
        MouseGestureDebugger.endGestureTracking(gestureId, 'SUCCESS', `Rotation completed: ${move}`);
        setIsAnimating(false);
        callbacks.onRotationComplete?.(finalRotation, move);
        resetInteraction();
      }, animOpts.duration);
      
      DebugLogger.groupEnd();
      return;
    }
    
    // If we have a saved current rotation from drag updates, finalize it
    if (savedCurrentRotation && rotationStartRef.current) {
      const finalRotation: RotationCommand = {
        ...savedCurrentRotation,
        isComplete: true,
        angle: savedCurrentRotation.targetAngle,
      };

      const move = createMove(finalRotation.face, finalRotation.direction);
      
      DebugLogger.info('useCubeInteraction', 'Finalizing existing rotation', finalRotation);
      window.console.log('🚀 useCubeInteraction: Finalizing rotation - calling onRotationStart with:', finalRotation);
      MouseGestureDebugger.addToGestureChain('useCubeInteraction', 'rotationFinalize', { face: finalRotation.face, direction: finalRotation.direction });
      
      // currentRotation already cleared above
      setIsAnimating(true);
      callbacks.onRotationStart?.(finalRotation);

      setTimeout(() => {
        DebugLogger.info('useCubeInteraction', 'Rotation finalization completed');
        MouseGestureDebugger.addToGestureChain('useCubeInteraction', 'rotationFinalizeComplete', { move });
        setIsAnimating(false);
        callbacks.onRotationComplete?.(finalRotation, move);
        resetInteraction();
      }, animOpts.duration);
    } else {
      // No meaningful rotation, just reset
      MouseGestureDebugger.endGestureTracking(gestureId, 'FAILED', 'insufficient movement or time');
      resetInteraction();
    }
  }, [currentRotation, createMove, animOpts.duration, callbacks, camera, resetInteraction]);

  // Handle mouse leave
  const handleMouseLeave = useCallback(() => {
    setInteractionState(prev => ({
      ...prev,
      hoveredFace: null,
      lastInteraction: performance.now(),
    }));

    lastHoveredFaceRef.current = null;
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      resetInteraction();
    };
  }, [resetInteraction]);

  return {
    interactionState,
    currentRotation,
    isAnimating,
    handleMouseHover,
    handleDragStart,
    handleDragUpdate,
    handleDragEnd,
    handleMouseLeave,
    resetInteraction,
  };
}