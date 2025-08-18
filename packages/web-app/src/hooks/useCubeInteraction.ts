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

interface UseCubeInteractionOptions {
  camera: THREE.Camera | null;
  scene: THREE.Scene | null;
  animationOptions?: Partial<AnimationOptions>;
  onFaceHover?: (face: FacePosition | null) => void;
  onFaceSelect?: (face: FacePosition) => void;
  onRotationStart?: (command: RotationCommand) => void;
  onRotationUpdate?: (command: RotationCommand) => void;
  onRotationComplete?: (command: RotationCommand, move: Move) => void;
  onError?: (error: CubeError, message?: string) => void;
}

interface UseCubeInteractionReturn {
  interactionState: MouseInteractionState;
  currentRotation: RotationCommand | null;
  isAnimating: boolean;
  handleMouseHover: (position: MousePosition) => void;
  handleDragStart: (gesture: DragGesture) => void;
  handleDragUpdate: (gesture: DragGesture) => void;
  handleDragEnd: (gesture: DragGesture) => void;
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
  const rotationStartRef = useRef<{ face: FacePosition; startAngle: number } | null>(null);

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
    if (!camera || !scene || isAnimating) return;

    const raycastResult = RaycastingUtils.raycastCubeFaces({
      camera,
      scene,
      mouse: gesture.startPosition,
      recursive: true,
    });

    if (!raycastResult.success || !raycastResult.data) {
      callbacks.onError?.(CubeError.RAYCASTING_FAILED, 'No face detected at drag start');
      return;
    }

    const selectedFace = raycastResult.data.facePosition;
    
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
    };

    callbacks.onFaceSelect?.(selectedFace);
  }, [camera, scene, isAnimating, callbacks]);

  // Handle drag update
  const handleDragUpdate = useCallback((gesture: DragGesture) => {
    if (!camera || !scene || !rotationStartRef.current || isAnimating) return;

    const { face } = rotationStartRef.current;
    
    // Calculate rotation direction
    const directionResult = RaycastingUtils.calculateRotationDirection(
      gesture.startPosition,
      gesture.currentPosition,
      face,
      camera
    );

    if (!directionResult.success) {
      callbacks.onError?.(directionResult.error, directionResult.message);
      return;
    }

    const direction = directionResult.data;
    const angle = calculateRotationAngle(gesture, face);
    const targetAngle = snapToGrid(angle);

    const rotationCommand: RotationCommand = {
      face,
      direction: direction === 'clockwise' ? RotationDirection.CLOCKWISE : RotationDirection.COUNTERCLOCKWISE,
      angle,
      targetAngle,
      isComplete: false,
    };

    setCurrentRotation(rotationCommand);
    setInteractionState(prev => ({
      ...prev,
      dragGesture: gesture,
      lastInteraction: performance.now(),
    }));

    callbacks.onRotationUpdate?.(rotationCommand);
  }, [camera, scene, isAnimating, calculateRotationAngle, snapToGrid, callbacks]);

  // Handle drag end
  const handleDragEnd = useCallback((_gesture: DragGesture) => {
    if (!currentRotation || !rotationStartRef.current) {
      resetInteraction();
      return;
    }

    const finalRotation: RotationCommand = {
      ...currentRotation,
      isComplete: true,
      angle: currentRotation.targetAngle,
    };

    const move = createMove(finalRotation.face, finalRotation.direction);
    
    setIsAnimating(true);
    callbacks.onRotationStart?.(finalRotation);

    // Simulate animation completion after duration
    setTimeout(() => {
      setIsAnimating(false);
      callbacks.onRotationComplete?.(finalRotation, move);
      resetInteraction();
    }, animOpts.duration);

  }, [currentRotation, createMove, animOpts.duration, callbacks]);

  // Handle mouse leave
  const handleMouseLeave = useCallback(() => {
    setInteractionState(prev => ({
      ...prev,
      hoveredFace: null,
      lastInteraction: performance.now(),
    }));

    lastHoveredFaceRef.current = null;
  }, []);

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