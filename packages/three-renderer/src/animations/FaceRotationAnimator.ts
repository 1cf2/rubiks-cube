import * as THREE from 'three';
import { 
  FacePosition, 
  RotationDirection, 
  CubeAnimation,
  CubeOperationResult,
  CubeError,
  Move,
} from '@rubiks-cube/shared/types';

export interface FaceRotationAnimatorOptions {
  cubeGroup: THREE.Group;
  onAnimationStart?: (animation: CubeAnimation) => void;
  onAnimationUpdate?: (animation: CubeAnimation, progress: number) => void;
  onAnimationComplete?: (animation: CubeAnimation) => void;
  onError?: (error: CubeError, message?: string) => void;
}

export interface RotationAnimationConfig {
  face: FacePosition;
  direction: RotationDirection;
  angle: number; // Target angle in radians
  duration: number;
  easing: 'linear' | 'ease-in-out' | 'ease-out' | 'ease-in';
  move: Move;
}

export class FaceRotationAnimator {
  private cubeGroup: THREE.Group;
  private activeAnimations = new Map<string, AnimationState>();
  private faceMeshes = new Map<FacePosition, THREE.Object3D[]>();
  
  private onAnimationStart: ((animation: CubeAnimation) => void) | undefined;
  private onAnimationUpdate: ((animation: CubeAnimation, progress: number) => void) | undefined;
  private onAnimationComplete: ((animation: CubeAnimation) => void) | undefined;
  constructor(options: FaceRotationAnimatorOptions) {
    this.cubeGroup = options.cubeGroup;
    this.onAnimationStart = options.onAnimationStart;
    this.onAnimationUpdate = options.onAnimationUpdate;
    this.onAnimationComplete = options.onAnimationComplete;
    // Note: onError callback stored but not currently used in implementation

    this.initializeFaceMeshes();
  }

  /**
   * Initialize face mesh mappings for rotation
   */
  private initializeFaceMeshes(): void {
    // Map cube pieces to their respective faces
    // This assumes the cube is structured with named meshes or positioned pieces
    const faces = Object.values(FacePosition);
    
    faces.forEach(face => {
      const facePieces = this.findFacePieces(face);
      this.faceMeshes.set(face, facePieces);
    });
  }

  /**
   * Find all mesh pieces that belong to a specific face
   */
  private findFacePieces(face: FacePosition): THREE.Object3D[] {
    const pieces: THREE.Object3D[] = [];
    
    this.cubeGroup.traverse((child) => {
      if (child instanceof THREE.Mesh || child instanceof THREE.Group) {
        if (this.belongsToFace(child, face)) {
          pieces.push(child);
        }
      }
    });

    return pieces;
  }

  /**
   * Determine if a mesh belongs to a specific face
   */
  private belongsToFace(object: THREE.Object3D, face: FacePosition): boolean {
    const position = object.position;
    
    // Round position to nearest integer to handle floating-point precision issues
    const x = Math.round(position.x);
    const y = Math.round(position.y);
    const z = Math.round(position.z);

    switch (face) {
      case FacePosition.FRONT:
        return z === 1;
      case FacePosition.BACK:
        return z === -1;
      case FacePosition.LEFT:
        return x === -1;
      case FacePosition.RIGHT:
        return x === 1;
      case FacePosition.UP:
        return y === 1;
      case FacePosition.DOWN:
        return y === -1;
      default:
        return false;
    }
  }

  /**
   * Start a face rotation animation
   */
  startRotation(config: RotationAnimationConfig): CubeOperationResult<string> {
    try {
      const animationId = this.generateAnimationId();
      
      // Check if face is already animating
      const existingAnimation = Array.from(this.activeAnimations.values())
        .find(anim => anim.animation.face === config.face);
      
      if (existingAnimation) {
        return {
          success: false,
          error: CubeError.ANIMATION_IN_PROGRESS,
          message: `Face ${config.face} is already animating`,
        };
      }

      const facePieces = this.faceMeshes.get(config.face);
      if (!facePieces || facePieces.length === 0) {
        return {
          success: false,
          error: CubeError.INVALID_MOVE,
          message: `No pieces found for face ${config.face}`,
        };
      }

      const animation: CubeAnimation = {
        id: animationId,
        type: 'face-rotation',
        move: config.move,
        face: config.face,
        direction: config.direction,
        startTime: performance.now(),
        duration: config.duration,
        progress: 0,
        easing: config.easing,
      };

      const rotationAxis = this.getRotationAxis(config.face);
      const targetAngle = this.calculateTargetAngle(config.direction, config.angle);

      const animationState: AnimationState = {
        animation,
        facePieces: facePieces,
        rotationAxis,
        startRotations: facePieces.map(piece => piece.rotation.clone()),
        targetAngle,
        currentAngle: 0,
        isComplete: false,
      };

      this.activeAnimations.set(animationId, animationState);
      
      // Start the animation loop
      this.animateFrame(animationId);
      
      this.onAnimationStart?.(animation);

      return { success: true, data: animationId };

    } catch (error) {
      return {
        success: false,
        error: CubeError.WEBGL_CONTEXT_LOST,
        message: error instanceof Error ? error.message : 'Failed to start rotation animation',
      };
    }
  }

  /**
   * Get rotation axis for a face
   */
  private getRotationAxis(face: FacePosition): THREE.Vector3 {
    switch (face) {
      case FacePosition.FRONT:
      case FacePosition.BACK:
        return new THREE.Vector3(0, 0, 1);
      case FacePosition.LEFT:
      case FacePosition.RIGHT:
        return new THREE.Vector3(1, 0, 0);
      case FacePosition.UP:
      case FacePosition.DOWN:
        return new THREE.Vector3(0, 1, 0);
      default:
        return new THREE.Vector3(0, 1, 0);
    }
  }

  /**
   * Calculate target angle based on direction
   */
  private calculateTargetAngle(direction: RotationDirection, customAngle?: number): number {
    if (customAngle !== undefined) {
      return customAngle;
    }

    switch (direction) {
      case RotationDirection.CLOCKWISE:
        return Math.PI / 2; // 90 degrees
      case RotationDirection.COUNTERCLOCKWISE:
        return -Math.PI / 2; // -90 degrees
      case RotationDirection.DOUBLE:
        return Math.PI; // 180 degrees
      default:
        return Math.PI / 2;
    }
  }

  /**
   * Apply easing function to progress
   */
  private applyEasing(progress: number, easing: CubeAnimation['easing']): number {
    switch (easing) {
      case 'linear':
        return progress;
      case 'ease-in-out':
        return progress < 0.5
          ? 2 * progress * progress
          : 1 - Math.pow(-2 * progress + 2, 2) / 2;
      case 'ease-out':
        return 1 - Math.pow(1 - progress, 3);
      case 'ease-in':
        return progress * progress * progress;
      default:
        return progress;
    }
  }

  /**
   * Animation frame loop
   */
  private animateFrame(animationId: string): void {
    const state = this.activeAnimations.get(animationId);
    if (!state || state.isComplete) return;

    const now = performance.now();
    const elapsed = now - state.animation.startTime;
    const rawProgress = Math.min(elapsed / state.animation.duration, 1);
    const easedProgress = this.applyEasing(rawProgress, state.animation.easing);

    // Calculate current rotation angle
    const currentAngle = state.targetAngle * easedProgress;
    const deltaAngle = currentAngle - state.currentAngle;

    // Apply rotation to face pieces
    this.rotateFacePieces(state, deltaAngle);
    
    state.currentAngle = currentAngle;

    // Update animation progress
    const updatedAnimation: CubeAnimation = {
      ...state.animation,
      progress: rawProgress,
    };

    this.onAnimationUpdate?.(updatedAnimation, rawProgress);

    // Check if animation is complete
    if (rawProgress >= 1) {
      this.completeAnimation(animationId);
    } else {
      requestAnimationFrame(() => this.animateFrame(animationId));
    }
  }

  /**
   * Apply rotation to face pieces as a group around the face center
   */
  private rotateFacePieces(state: AnimationState, deltaAngle: number): void {
    const rotation = new THREE.Quaternion();
    rotation.setFromAxisAngle(state.rotationAxis, deltaAngle);

    // Calculate face center for proper rotation
    const faceCenter = this.getFaceCenter(state.animation.face);

    state.facePieces.forEach(piece => {
      // Store original position relative to face center
      const relativePosition = piece.position.clone().sub(faceCenter);
      
      // Rotate position around face center
      relativePosition.applyQuaternion(rotation);
      
      // Set new position relative to face center
      piece.position.copy(faceCenter.clone().add(relativePosition));
      
      // Apply rotation to the piece itself
      piece.quaternion.multiplyQuaternions(rotation, piece.quaternion);
    });
  }

  /**
   * Get the center point of a face for proper rotation
   */
  private getFaceCenter(face: FacePosition): THREE.Vector3 {
    switch (face) {
      case FacePosition.FRONT:
        return new THREE.Vector3(0, 0, 1);
      case FacePosition.BACK:
        return new THREE.Vector3(0, 0, -1);
      case FacePosition.LEFT:
        return new THREE.Vector3(-1, 0, 0);
      case FacePosition.RIGHT:
        return new THREE.Vector3(1, 0, 0);
      case FacePosition.UP:
        return new THREE.Vector3(0, 1, 0);
      case FacePosition.DOWN:
        return new THREE.Vector3(0, -1, 0);
      default:
        return new THREE.Vector3(0, 0, 0);
    }
  }

  /**
   * Complete an animation
   */
  private completeAnimation(animationId: string): void {
    const state = this.activeAnimations.get(animationId);
    if (!state) return;

    // Ensure exact final rotation
    const finalRotation = state.targetAngle - state.currentAngle;
    if (Math.abs(finalRotation) > 0.001) {
      this.rotateFacePieces(state, finalRotation);
    }

    // Snap to grid positions
    this.snapToGrid(state.facePieces);

    // CRITICAL: Re-initialize face mappings after rotation
    // This ensures pieces are correctly assigned to their new faces
    this.initializeFaceMeshes();

    state.isComplete = true;

    const completedAnimation: CubeAnimation = {
      ...state.animation,
      progress: 1,
    };

    this.onAnimationComplete?.(completedAnimation);
    this.activeAnimations.delete(animationId);
  }

  /**
   * Snap pieces to grid positions for perfect alignment
   */
  private snapToGrid(pieces: THREE.Object3D[]): void {
    pieces.forEach(piece => {
      // Snap position to nearest grid point (more precise snapping)
      piece.position.x = Math.round(piece.position.x);
      piece.position.y = Math.round(piece.position.y);
      piece.position.z = Math.round(piece.position.z);

      // Snap rotation to nearest 90-degree increment
      const euler = new THREE.Euler().setFromQuaternion(piece.quaternion);
      euler.x = Math.round(euler.x / (Math.PI / 2)) * (Math.PI / 2);
      euler.y = Math.round(euler.y / (Math.PI / 2)) * (Math.PI / 2);
      euler.z = Math.round(euler.z / (Math.PI / 2)) * (Math.PI / 2);
      piece.setRotationFromEuler(euler);
    });
  }

  /**
   * Stop a specific animation
   */
  stopAnimation(animationId: string): boolean {
    const state = this.activeAnimations.get(animationId);
    if (!state) return false;

    state.isComplete = true;
    this.activeAnimations.delete(animationId);
    return true;
  }

  /**
   * Stop all animations
   */
  stopAllAnimations(): void {
    this.activeAnimations.forEach((_state, id) => {
      this.stopAnimation(id);
    });
  }

  /**
   * Check if any animations are active
   */
  hasActiveAnimations(): boolean {
    return this.activeAnimations.size > 0;
  }

  /**
   * Get active animation for a specific face
   */
  getActiveAnimationForFace(face: FacePosition): CubeAnimation | null {
    for (const state of this.activeAnimations.values()) {
      if (state.animation.face === face) {
        return state.animation;
      }
    }
    return null;
  }

  /**
   * Generate unique animation ID
   */
  private generateAnimationId(): string {
    return `anim_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  }

  /**
   * Dispose of animator resources
   */
  dispose(): void {
    this.stopAllAnimations();
    this.faceMeshes.clear();
  }
}

interface AnimationState {
  animation: CubeAnimation;
  facePieces: THREE.Object3D[];
  rotationAxis: THREE.Vector3;
  startRotations: THREE.Euler[];
  targetAngle: number;
  currentAngle: number;
  isComplete: boolean;
}