/**
 * Touch Interaction Handler for Three.js Scene
 * Integrates touch gesture recognition with 3D cube raycasting
 */

import * as THREE from 'three';
import {
  TouchGesture,
  TouchOperationResult,
  TouchError,
  FacePosition,
  Vector2,
  CubeOperationResult,
  CubeError,
  RotationDirection
} from '@rubiks-cube/shared/types';

export interface TouchRaycastOptions {
  camera: THREE.Camera;
  scene: THREE.Scene;
  touchPosition: Vector2;
  recursive?: boolean;
}

export interface TouchFaceIntersection {
  readonly facePosition: FacePosition;
  readonly point: readonly [number, number, number];
  readonly normal: readonly [number, number, number];
  readonly distance: number;
  readonly touchPosition: Vector2;
}

export class TouchInteractionHandler {
  private static raycaster = new THREE.Raycaster();
  private static touchVector = new THREE.Vector2();
  
  private domElement: HTMLElement;
  private isActive: boolean = false;
  private currentTouches = new Map<number, { x: number; y: number; startTime: number }>();
  private onTouchStart?: (event: TouchEvent) => void;
  private onTouchMove?: (event: TouchEvent) => void;
  private onTouchEnd?: (event: TouchEvent) => void;

  constructor(
    renderer: THREE.WebGLRenderer,
    options: {
      onTouchStart?: (event: TouchEvent) => void;
      onTouchMove?: (event: TouchEvent) => void;
      onTouchEnd?: (event: TouchEvent) => void;
    } = {}
  ) {
    this.domElement = renderer.domElement;
    this.onTouchStart = options.onTouchStart || (() => {});
    this.onTouchMove = options.onTouchMove || (() => {});
    this.onTouchEnd = options.onTouchEnd || (() => {});
    
    this.setupEventListeners();
  }

  /**
   * Set up touch event listeners with proper configuration
   */
  private setupEventListeners(): void {
    // Use passive: false to allow preventDefault() to work
    this.domElement.addEventListener('touchstart', this.handleTouchStart.bind(this), { passive: false });
    this.domElement.addEventListener('touchmove', this.handleTouchMove.bind(this), { passive: false });
    this.domElement.addEventListener('touchend', this.handleTouchEnd.bind(this), { passive: false });
    this.domElement.addEventListener('touchcancel', this.handleTouchEnd.bind(this), { passive: false });
  }

  /**
   * Handle touch start events
   */
  private handleTouchStart(event: TouchEvent): void {
    event.preventDefault();
    
    for (let i = 0; i < event.changedTouches.length; i++) {
      const touch = event.changedTouches[i];
      if (touch) {
        this.currentTouches.set(touch.identifier, {
          x: touch.clientX,
          y: touch.clientY,
          startTime: performance.now()
        });
      }
    }
    
    this.isActive = true;
    this.onTouchStart?.(event);
  }

  /**
   * Handle touch move events
   */
  private handleTouchMove(event: TouchEvent): void {
    event.preventDefault();
    
    if (!this.isActive) return;
    
    // Update touch positions
    for (let i = 0; i < event.changedTouches.length; i++) {
      const touch = event.changedTouches[i];
      if (touch) {
        const existing = this.currentTouches.get(touch.identifier);
        if (existing) {
          this.currentTouches.set(touch.identifier, {
            ...existing,
            x: touch.clientX,
            y: touch.clientY
          });
        }
      }
    }
    
    this.onTouchMove?.(event);
  }

  /**
   * Handle touch end events
   */
  private handleTouchEnd(event: TouchEvent): void {
    // Remove ended touches
    for (let i = 0; i < event.changedTouches.length; i++) {
      const touch = event.changedTouches[i];
      if (touch) {
        this.currentTouches.delete(touch.identifier);
      }
    }
    
    // If no touches remain, deactivate
    if (this.currentTouches.size === 0) {
      this.isActive = false;
    }
    
    this.onTouchEnd?.(event);
  }

  /**
   * Get current touch state
   */
  getTouchState(): { isActive: boolean; touchCount: number } {
    return {
      isActive: this.isActive,
      touchCount: this.currentTouches.size
    };
  }

  /**
   * Remove event listeners and cleanup
   */
  dispose(): void {
    this.domElement.removeEventListener('touchstart', this.handleTouchStart.bind(this));
    this.domElement.removeEventListener('touchmove', this.handleTouchMove.bind(this));
    this.domElement.removeEventListener('touchend', this.handleTouchEnd.bind(this));
    this.domElement.removeEventListener('touchcancel', this.handleTouchEnd.bind(this));
    
    this.currentTouches.clear();
    this.isActive = false;
  }

  /**
   * Performs raycasting for touch input to detect cube face intersections
   */
  static raycastTouchOnCube(options: TouchRaycastOptions): CubeOperationResult<TouchFaceIntersection | null> {
    try {
      const { camera, scene, touchPosition, recursive = true } = options;
      
      if (!camera || !scene) {
        return {
          success: false,
          error: CubeError.INVALID_STATE,
          message: 'Camera or scene not provided for touch raycasting'
        };
      }

      // Convert touch position to normalized device coordinates
      this.touchVector.set(touchPosition.x, touchPosition.y);
      
      // Set up raycaster from touch position
      this.raycaster.setFromCamera(this.touchVector, camera);

      // Find intersections with cube meshes
      const intersects = this.raycaster.intersectObjects(scene.children, recursive);

      // Filter for cube face meshes only
      const cubeIntersects = intersects.filter(intersect => {
        const mesh = intersect.object as THREE.Mesh;
        return mesh.isMesh && this.getFacePositionFromMesh(mesh) !== null;
      });

      if (cubeIntersects.length === 0) {
        return { success: true, data: null };
      }

      // Get the closest intersection
      const closest = cubeIntersects[0];
      if (!closest) {
        return { success: true, data: null };
      }
      const mesh = closest.object as THREE.Mesh;
      const facePosition = this.getFacePositionFromMesh(mesh);

      if (!facePosition) {
        return { success: true, data: null };
      }

      const intersection: TouchFaceIntersection = {
        facePosition,
        point: [closest.point.x, closest.point.y, closest.point.z] as const,
        normal: this.getFaceNormal(facePosition),
        distance: closest.distance,
        touchPosition
      };

      return { success: true, data: intersection };

    } catch (error) {
      return {
        success: false,
        error: CubeError.RAYCASTING_FAILED,
        message: error instanceof Error ? error.message : 'Touch raycasting failed'
      };
    }
  }

  /**
   * Determines which cube face was touched based on mesh name
   */
  private static getFacePositionFromMesh(mesh: THREE.Mesh): FacePosition | null {
    if (!mesh.name) return null;

    const faceMap: Record<string, FacePosition> = {
      'front-face': FacePosition.FRONT,
      'back-face': FacePosition.BACK,
      'left-face': FacePosition.LEFT,
      'right-face': FacePosition.RIGHT,
      'up-face': FacePosition.UP,
      'down-face': FacePosition.DOWN,
      'front': FacePosition.FRONT,
      'back': FacePosition.BACK,
      'left': FacePosition.LEFT,
      'right': FacePosition.RIGHT,
      'up': FacePosition.UP,
      'down': FacePosition.DOWN,
    };

    return faceMap[mesh.name.toLowerCase()] || null;
  }

  /**
   * Gets the normal vector for a cube face
   */
  private static getFaceNormal(face: FacePosition): readonly [number, number, number] {
    const normals: Record<FacePosition, readonly [number, number, number]> = {
      [FacePosition.FRONT]: [0, 0, 1],
      [FacePosition.BACK]: [0, 0, -1],
      [FacePosition.LEFT]: [-1, 0, 0],
      [FacePosition.RIGHT]: [1, 0, 0],
      [FacePosition.UP]: [0, 1, 0],
      [FacePosition.DOWN]: [0, -1, 0],
    };
    return normals[face];
  }

  /**
   * Converts touch gesture to cube rotation command
   */
  static gestureToRotationCommand(
    gesture: TouchGesture,
    targetFace: FacePosition
  ): TouchOperationResult<{
    face: FacePosition;
    direction: RotationDirection;
    velocity: number;
  }> {
    try {
      if (gesture.type !== 'swipe') {
        return {
          success: false,
          error: TouchError.INVALID_GESTURE,
          message: 'Only swipe gestures can be converted to rotation commands'
        };
      }

      // Map swipe direction to rotation direction based on face orientation
      const rotationDirection = this.mapSwipeToRotation(gesture.direction, targetFace);
      
      if (!rotationDirection.success) {
        return rotationDirection as TouchOperationResult<any>;
      }

      return {
        success: true,
        data: {
          face: targetFace,
          direction: rotationDirection.data,
          velocity: Math.min(gesture.velocity, 10) // Cap velocity for reasonable animation speed
        }
      };

    } catch (error) {
      return {
        success: false,
        error: TouchError.INVALID_GESTURE,
        message: error instanceof Error ? error.message : 'Failed to convert gesture to rotation'
      };
    }
  }

  /**
   * Maps swipe direction to cube face rotation direction
   */
  private static mapSwipeToRotation(
    swipeDirection: string,
    face: FacePosition
  ): TouchOperationResult<RotationDirection> {
    const directionMap: Record<FacePosition, Record<string, RotationDirection>> = {
      [FacePosition.FRONT]: {
        'left': RotationDirection.COUNTERCLOCKWISE,
        'right': RotationDirection.CLOCKWISE,
        'up': RotationDirection.CLOCKWISE,
        'down': RotationDirection.COUNTERCLOCKWISE,
      },
      [FacePosition.BACK]: {
        'left': RotationDirection.CLOCKWISE,
        'right': RotationDirection.COUNTERCLOCKWISE,
        'up': RotationDirection.COUNTERCLOCKWISE,
        'down': RotationDirection.CLOCKWISE,
      },
      [FacePosition.LEFT]: {
        'up': RotationDirection.COUNTERCLOCKWISE,
        'down': RotationDirection.CLOCKWISE,
        'left': RotationDirection.CLOCKWISE,
        'right': RotationDirection.COUNTERCLOCKWISE,
      },
      [FacePosition.RIGHT]: {
        'up': RotationDirection.CLOCKWISE,
        'down': RotationDirection.COUNTERCLOCKWISE,
        'left': RotationDirection.COUNTERCLOCKWISE,
        'right': RotationDirection.CLOCKWISE,
      },
      [FacePosition.UP]: {
        'left': RotationDirection.COUNTERCLOCKWISE,
        'right': RotationDirection.CLOCKWISE,
        'up': RotationDirection.CLOCKWISE,
        'down': RotationDirection.COUNTERCLOCKWISE,
      },
      [FacePosition.DOWN]: {
        'left': RotationDirection.CLOCKWISE,
        'right': RotationDirection.COUNTERCLOCKWISE,
        'up': RotationDirection.COUNTERCLOCKWISE,
        'down': RotationDirection.CLOCKWISE,
      },
    };

    const rotation = directionMap[face]?.[swipeDirection];
    
    if (!rotation) {
      return {
        success: false,
        error: TouchError.INVALID_GESTURE,
        message: `Invalid swipe direction '${swipeDirection}' for face '${face}'`
      };
    }

    return {
      success: true,
      data: rotation
    };
  }

  /**
   * Validates touch target meets accessibility requirements (44px minimum)
   */
  static validateTouchTarget(
    intersection: TouchFaceIntersection,
    canvas: HTMLCanvasElement,
    minimumSize: number = 44
  ): TouchOperationResult<boolean> {
    try {
      // Project 3D point back to screen coordinates
      const point3D = new THREE.Vector3(...intersection.point);
      const camera = this.raycaster.camera as THREE.Camera;
      
      if (!camera) {
        return {
          success: false,
          error: TouchError.TOUCH_TARGET_TOO_SMALL,
          message: 'No camera available for touch target validation'
        };
      }

      point3D.project(camera);
      
      // Convert to screen pixels
      const canvasRect = canvas.getBoundingClientRect();
      
      // For cube faces, assume each face has a minimum interactive area
      // This is a simplified validation - in practice, each face should have
      // expanded touch zones to meet accessibility standards
      const touchTargetSize = Math.min(canvasRect.width, canvasRect.height) / 6; // Rough estimate
      
      const meetsStandard = touchTargetSize >= minimumSize;
      
      return {
        success: true,
        data: meetsStandard
      };

    } catch (error) {
      return {
        success: false,
        error: TouchError.TOUCH_TARGET_TOO_SMALL,
        message: error instanceof Error ? error.message : 'Touch target validation failed'
      };
    }
  }

  /**
   * Static method to dispose of shared resources
   */
  static disposeStatic(): void {
    this.touchVector.set(0, 0);
  }
}