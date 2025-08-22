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

interface UseCubeInteractionOptions {
  camera: THREE.Camera | null;
  scene: THREE.Scene | null;
  animationOptions?: Partial<AnimationOptions>;
  onFaceHover?: (_face: FacePosition | null) => void;
  onFaceSelect?: (_face: FacePosition, _intersectionPoint?: readonly [number, number, number], _mesh?: any, _hitNormal?: readonly [number, number, number]) => void;
  onRotationStart?: (_command: RotationCommand) => void;
  onRotationUpdate?: (_command: RotationCommand) => void;
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

    let effectiveFace = face;
    let recalculateLayer = false;

    // If we hit a different piece, determine new face based on movement direction
    if (currentRaycastResult.success && currentRaycastResult.data) {
      const currentMesh = currentRaycastResult.data.mesh;
      const currentPiecePosition = currentMesh ? [
        Math.round(currentMesh.position.x),
        Math.round(currentMesh.position.y), 
        Math.round(currentMesh.position.z)
      ] as const : null;

      // Check if we've moved to a different piece
      const movedToNewPiece = currentPiecePosition && currentPiecePositionRef.current && 
        (currentPiecePosition[0] !== currentPiecePositionRef.current[0] ||
         currentPiecePosition[1] !== currentPiecePositionRef.current[1] ||
         currentPiecePosition[2] !== currentPiecePositionRef.current[2]);

      if (movedToNewPiece && currentPiecePosition) {
        window.console.log('🎯 Moved to new piece:', {
          from: currentPiecePositionRef.current,
          to: currentPiecePosition,
          movementVector: { x: deltaX, y: deltaY }
        });

        // Update current piece position
        currentPiecePositionRef.current = currentPiecePosition;

        // Calculate movement direction between pieces
        const originalPosition = rotationStartRef.current?.piecePosition || currentPiecePositionRef.current;
        if (originalPosition) {
          const [fromX, fromY, fromZ] = originalPosition;
          const [toX, toY, toZ] = currentPiecePosition;
          const pieceMovement = {
            x: toX - fromX,
            y: toY - fromY,
            z: toZ - fromZ
          };

          // Determine which faces are available on the target piece
          const [x, y, z] = currentPiecePosition;
          const availableFaces: FacePosition[] = [];
          
          if (x === -1) availableFaces.push(FacePosition.LEFT);
          if (x === 1) availableFaces.push(FacePosition.RIGHT);
          if (y === -1) availableFaces.push(FacePosition.DOWN);
          if (y === 1) availableFaces.push(FacePosition.UP);
          if (z === -1) availableFaces.push(FacePosition.BACK);
          if (z === 1) availableFaces.push(FacePosition.FRONT);

          // Calculate the movement direction to help prioritize face selection
          const absPieceX = Math.abs(pieceMovement.x);
          const absPieceY = Math.abs(pieceMovement.y);
          const absPieceZ = Math.abs(pieceMovement.z);

          // Prioritize faces based on movement direction and availability
          let bestFace: FacePosition | null = null;
          
          // If we moved primarily along one axis, prioritize the corresponding faces
          if (absPieceX > absPieceY && absPieceX > absPieceZ) {
            // Horizontal movement - prefer left/right faces
            if (pieceMovement.x > 0 && availableFaces.includes(FacePosition.RIGHT)) {
              bestFace = FacePosition.RIGHT;
            } else if (pieceMovement.x < 0 && availableFaces.includes(FacePosition.LEFT)) {
              bestFace = FacePosition.LEFT;
            }
          } else if (absPieceY > absPieceX && absPieceY > absPieceZ) {
            // Vertical movement - prefer up/down faces
            if (pieceMovement.y > 0 && availableFaces.includes(FacePosition.UP)) {
              bestFace = FacePosition.UP;
            } else if (pieceMovement.y < 0 && availableFaces.includes(FacePosition.DOWN)) {
              bestFace = FacePosition.DOWN;
            }
          } else if (absPieceZ > absPieceX && absPieceZ > absPieceY) {
            // Depth movement - prefer front/back faces
            if (pieceMovement.z > 0 && availableFaces.includes(FacePosition.FRONT)) {
              bestFace = FacePosition.FRONT;
            } else if (pieceMovement.z < 0 && availableFaces.includes(FacePosition.BACK)) {
              bestFace = FacePosition.BACK;
            }
          }

          // If movement direction didn't give us a good match, use priority order
          if (!bestFace && availableFaces.length > 0) {
            // Priority order: prefer side faces over top/bottom for better UX
            const priorityOrder = [
              FacePosition.FRONT, 
              FacePosition.RIGHT, 
              FacePosition.LEFT, 
              FacePosition.BACK, 
              FacePosition.UP, 
              FacePosition.DOWN
            ];
            
            for (const priorityFace of priorityOrder) {
              if (availableFaces.includes(priorityFace)) {
                bestFace = priorityFace;
                break;
              }
            }
          }

          if (bestFace && bestFace !== face) {
            effectiveFace = bestFace;
            recalculateLayer = true;
            
            window.console.log('🎯 Recalculating layer:', {
              originalFace: face,
              newFace: effectiveFace,
              pieceMovement,
              availableFaces,
              targetPiecePosition: currentPiecePosition,
              movementMagnitudes: { x: absPieceX, y: absPieceY, z: absPieceZ }
            });
          }
        }
      }
    }
    
    // Calculate rotation direction using the effective face
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

    const direction = directionResult.data;
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

    callbacks.onRotationUpdate?.(rotationCommand);
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
      const { face } = rotationStartRef.current;
      
      // Use RaycastingUtils to determine proper direction
      const directionResult = RaycastingUtils.calculateRotationDirection(
        gesture.startPosition,
        gesture.currentPosition,
        face,
        camera || new THREE.PerspectiveCamera()
      );
      
      let direction = RotationDirection.CLOCKWISE;
      if (directionResult.success && directionResult.data) {
        direction = directionResult.data === 'clockwise' 
          ? RotationDirection.CLOCKWISE 
          : RotationDirection.COUNTERCLOCKWISE;
      } else {
        // Fallback to simple direction calculation
        direction = Math.abs(deltaX) > Math.abs(deltaY) 
          ? (deltaX > 0 ? RotationDirection.CLOCKWISE : RotationDirection.COUNTERCLOCKWISE)
          : (deltaY > 0 ? RotationDirection.COUNTERCLOCKWISE : RotationDirection.CLOCKWISE);
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