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

export interface PointerTouchInteraction {
  pointerId: number;
  x: number;
  y: number;
  startTime: number;
  isPrimary: boolean;
  pointerType: 'touch' | 'mouse' | 'pen';
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
  private currentPointers = new Map<number, PointerTouchInteraction>();
  private onTouchStart?: (event: TouchEvent) => void;
  private onTouchMove?: (event: TouchEvent) => void;
  private onTouchEnd?: (event: TouchEvent) => void;
  private onPointerDown?: (event: PointerEvent) => void;
  private onPointerMove?: (event: PointerEvent) => void;
  private onPointerUp?: (event: PointerEvent) => void;
  private onPointerCancel?: (event: PointerEvent) => void;

  constructor(
    renderer: THREE.WebGLRenderer,
    options: {
      onTouchStart?: (event: TouchEvent) => void;
      onTouchMove?: (event: TouchEvent) => void;
      onTouchEnd?: (event: TouchEvent) => void;
      onPointerDown?: (event: PointerEvent) => void;
      onPointerMove?: (event: PointerEvent) => void;
      onPointerUp?: (event: PointerEvent) => void;
      onPointerCancel?: (event: PointerEvent) => void;
    } = {}
  ) {
    this.domElement = renderer.domElement;
    this.onTouchStart = options.onTouchStart || (() => {});
    this.onTouchMove = options.onTouchMove || (() => {});
    this.onTouchEnd = options.onTouchEnd || (() => {});
    this.onPointerDown = options.onPointerDown || (() => {});
    this.onPointerMove = options.onPointerMove || (() => {});
    this.onPointerUp = options.onPointerUp || (() => {});
    this.onPointerCancel = options.onPointerCancel || (() => {});
    
    this.setupEventListeners();
  }

  /**
   * Set up touch event listeners with proper configuration
   */
  private setupEventListeners(): void {
    // Touch events
    this.domElement.addEventListener('touchstart', this.handleTouchStart.bind(this), { passive: false });
    this.domElement.addEventListener('touchmove', this.handleTouchMove.bind(this), { passive: false });
    this.domElement.addEventListener('touchend', this.handleTouchEnd.bind(this), { passive: false });
    this.domElement.addEventListener('touchcancel', this.handleTouchEnd.bind(this), { passive: false });

    // Pointer events for unified input
    this.domElement.addEventListener('pointerdown', this.handlePointerDown.bind(this), { passive: false });
    this.domElement.addEventListener('pointermove', this.handlePointerMove.bind(this), { passive: false });
    this.domElement.addEventListener('pointerup', this.handlePointerUp.bind(this), { passive: false });
    this.domElement.addEventListener('pointercancel', this.handlePointerCancel.bind(this), { passive: false });

    // Prevent context menu on long press
    this.domElement.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  private normalizePointerToTouch(pointerEvent: PointerEvent): PointerTouchInteraction {
    return {
      pointerId: pointerEvent.pointerId,
      x: pointerEvent.clientX,
      y: pointerEvent.clientY,
      startTime: pointerEvent.timeStamp,
      isPrimary: pointerEvent.isPrimary,
      pointerType: pointerEvent.pointerType as 'touch' | 'mouse' | 'pen',
    };
  }

  private createSimulatedTouch(pointer: PointerTouchInteraction): Touch {
    return {
      identifier: pointer.pointerId,
      target: this.domElement,
      currentTarget: this.domElement,
      clientX: pointer.x,
      clientY: pointer.y,
      screenX: pointer.x,
      screenY: pointer.y,
      pageX: pointer.x,
      pageY: pointer.y,
      radiusX: 1,
      radiusY: 1,
      rotationAngle: 0,
      force: pointer.pointerType === 'touch' ? 1 : 0,
      altitudeAngle: 0,
      azimuthAngle: 0,
    } as Touch;
  }

  private createTouchList(touches: Touch[]): TouchList {
    const list = Object.create(TouchList.prototype);
    list.length = touches.length;
    list.item = function(index: number): Touch | null {
      return touches[index] || null;
    };
    return list;
  }

  private createMockTouchEvent(type: string, touches: Touch[], changedTouches: Touch[] = []): TouchEvent {
    const touchList = this.createTouchList(touches);
    const changedTouchList = this.createTouchList(changedTouches);

    const event = new CustomEvent(type, {
      bubbles: true,
      cancelable: true,
      composed: true,
    });

    Object.assign(event, {
      target: this.domElement,
      currentTarget: this.domElement,
      touches: touchList,
      targetTouches: touchList,
      changedTouches: changedTouchList,
      timeStamp: performance.now(),
      defaultPrevented: false,
      isTrusted: false,
      altKey: false,
      ctrlKey: false,
      metaKey: false,
      shiftKey: false,
      detail: 0,
      view: window,
      button: 0,
      buttons: 0,
      clientX: 0,
      clientY: 0,
      screenX: 0,
      screenY: 0,
      movementX: 0,
      movementY: 0,
      relatedTarget: null,
      preventDefault: () => event.preventDefault(),
      stopPropagation: () => event.stopPropagation(),
      stopImmediatePropagation: () => event.stopImmediatePropagation(),
    });

    return event as unknown as TouchEvent;
  }

  private handlePointerDown(event: PointerEvent): void {
    event.preventDefault();
    this.isActive = true;

    const normalized = this.normalizePointerToTouch(event);
    this.currentPointers.set(event.pointerId, normalized);

    // Simulate touch event for shared logic
    const simulatedTouches = Array.from(this.currentPointers.values()).map(p => this.createSimulatedTouch(p));
    const simulatedTouchEvent = this.createMockTouchEvent('touchstart', simulatedTouches);
    this.handleTouchStart(simulatedTouchEvent);

    this.onPointerDown?.(event);
  }

  private handlePointerMove(event: PointerEvent): void {
    event.preventDefault();

    if (!this.isActive) return;

    const existing = this.currentPointers.get(event.pointerId);
    if (existing) {
      const normalized = this.normalizePointerToTouch(event);
      this.currentPointers.set(event.pointerId, normalized);
    }

    // Simulate touch move
    const simulatedTouches = Array.from(this.currentPointers.values()).map(p => this.createSimulatedTouch(p));
    const simulatedTouchEvent = this.createMockTouchEvent('touchmove', simulatedTouches);
    this.handleTouchMove(simulatedTouchEvent);

    this.onPointerMove?.(event);
  }

  private handlePointerUp(event: PointerEvent): void {
    event.preventDefault();

    this.currentPointers.delete(event.pointerId);

    // Simulate touch end
    const normalized = this.normalizePointerToTouch(event);
    const simulatedChangedTouches = [this.createSimulatedTouch(normalized)];
    const simulatedTouchEvent = this.createMockTouchEvent('touchend', [], simulatedChangedTouches);
    this.handleTouchEnd(simulatedTouchEvent);

    if (this.currentPointers.size === 0) {
      this.isActive = false;
    }

    this.onPointerUp?.(event);
  }

  private handlePointerCancel(event: PointerEvent): void {
    event.preventDefault();

    this.currentPointers.delete(event.pointerId);

    // Simulate touch cancel
    const normalized = this.normalizePointerToTouch(event);
    const simulatedChangedTouches = [this.createSimulatedTouch(normalized)];
    const simulatedTouchEvent = this.createMockTouchEvent('touchcancel', [], simulatedChangedTouches);
    this.handleTouchEnd(simulatedTouchEvent);

    this.onPointerCancel?.(event);
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

      // Normalize touch position to NDC for iOS DPI
      const canvas = document.querySelector('canvas') as HTMLCanvasElement;
      if (canvas) {
        const rect = canvas.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;
        const normalizedX = ((touchPosition.x - rect.left) / rect.width * 2 - 1) * dpr;
        const normalizedY = -((touchPosition.y - rect.top) / rect.height * 2 - 1) * dpr;
        this.touchVector.set(normalizedX, normalizedY);
        console.log('🪲 TouchInteractionHandler: Normalized touch for raycast', { raw: touchPosition, normalized: { x: normalizedX, y: normalizedY }, rect, dpr });
      } else {
        this.touchVector.set(touchPosition.x, touchPosition.y);
        console.log('🪲 TouchInteractionHandler: No canvas found, using raw touch position', touchPosition);
      }

      // Convert touch position to normalized device coordinates
      this.touchVector.set(touchPosition.x, touchPosition.y);
      
      // Set up raycaster from touch position
      this.raycaster.setFromCamera(this.touchVector, camera);

      // Find intersections with cube meshes
      const intersects = this.raycaster.intersectObjects(scene.children, recursive);
      console.log('🪲 TouchInteractionHandler: Raycast intersects', { count: intersects.length, touchVector: this.touchVector });

      // Filter for cube face meshes only
      const cubeIntersects = intersects.filter(intersect => {
        const mesh = intersect.object as THREE.Mesh;
        return mesh.isMesh && this.getFacePositionFromMesh(mesh) !== null;
      });

      if (cubeIntersects.length === 0) {
        console.log('🪲 TouchInteractionHandler: No cube face intersections found');
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