import { FacePosition, Move } from './cube';

/**
 * Mouse interaction types for cube face rotation
 */

export enum RotationDirection {
  CLOCKWISE = 'clockwise',
  COUNTERCLOCKWISE = 'counterclockwise',
  DOUBLE = 'double',
}

export enum CursorState {
  DEFAULT = 'default',
  HOVER = 'pointer',
  GRABBING = 'grabbing',
  ROTATING = 'grabbing',
  DISABLED = 'not-allowed',
}

export interface MousePosition {
  readonly x: number;
  readonly y: number;
}

export interface MouseDelta {
  readonly deltaX: number;
  readonly deltaY: number;
}

export interface FaceIntersection {
  readonly facePosition: FacePosition;
  readonly point: readonly [number, number, number]; // 3D intersection point
  readonly normal: readonly [number, number, number]; // Face normal vector
  readonly distance: number;
  readonly mesh?: any; // The actual Three.js mesh that was clicked (optional for backward compatibility)
  readonly hitNormal?: readonly [number, number, number]; // The actual surface normal that was hit by raycasting
}

export interface DragGesture {
  readonly startPosition: MousePosition;
  readonly currentPosition: MousePosition;
  readonly delta: MouseDelta;
  readonly isActive: boolean;
  readonly startTime: number;
  readonly duration: number;
}

export interface RotationCommand {
  readonly face: FacePosition;
  readonly direction: RotationDirection;
  readonly angle: number; // Current rotation angle in radians
  readonly targetAngle: number; // Target angle (90, 180, 270 degrees)
  readonly isComplete: boolean;
  readonly recalculateLayer?: boolean; // Flag to recalculate layer highlighting when mouse moves to new piece
}

export interface CubeAnimation {
  readonly id: string;
  readonly type: 'face-rotation';
  readonly move: Move;
  readonly face: FacePosition;
  readonly direction: RotationDirection;
  readonly startTime: number;
  readonly duration: number;
  readonly progress: number; // 0-1
  readonly easing: 'linear' | 'ease-in-out' | 'ease-out' | 'ease-in';
}

export interface AnimationQueue {
  readonly current: CubeAnimation | null;
  readonly pending: ReadonlyArray<CubeAnimation>;
  readonly isBlocked: boolean;
  readonly maxConcurrent: number;
}

export interface VisualFeedback {
  readonly face: FacePosition;
  readonly state: 'normal' | 'hover' | 'selected' | 'rotating' | 'blocked' | 'preview' | 'success';
  readonly opacity?: number;
  readonly emissiveIntensity?: number;
  readonly color?: readonly [number, number, number]; // RGB values 0-1
  readonly pulse?: boolean; // Enable pulsing animation
  readonly intensity?: number; // Overall feedback intensity multiplier
  readonly intersectionPoint?: readonly [number, number, number]; // 3D point where interaction occurred
  readonly piecePosition?: readonly [number, number, number]; // Current position of the tracked piece
  readonly targetMesh?: any; // The specific mesh to highlight (optional)
  readonly hitNormal?: readonly [number, number, number]; // The surface normal that was actually hit
}

export interface MouseInteractionState {
  readonly isInteracting: boolean;
  readonly hoveredFace: FacePosition | null;
  readonly selectedFace: FacePosition | null;
  readonly dragGesture: DragGesture | null;
  readonly cursorState: CursorState;
  readonly lastInteraction: number; // timestamp
}

export interface PerformanceMetrics {
  readonly frameRate: number;
  readonly inputLatency: number; // ms from mouse event to visual feedback
  readonly animationLatency: number; // ms for animation completion
  readonly memoryUsage: number; // MB
}


export interface RaycastOptions {
  readonly camera: any; // THREE.Camera
  readonly scene: any; // THREE.Scene
  readonly mouse: MousePosition;
  readonly recursive: boolean;
}

export interface GestureRecognitionOptions {
  readonly minDragDistance: number; // pixels
  readonly maxDragTime: number; // ms
  readonly snapThreshold: number; // degrees
  readonly sensitivity: number; // 0-1
}

export interface AnimationOptions {
  readonly duration: number; // ms
  readonly easing: 'linear' | 'ease-in-out' | 'ease-out' | 'ease-in';
  readonly frameRate: number; // target fps
  readonly snapToGrid: boolean;
}

export interface PerformanceCritical {
  readonly executionTime: '16ms';
  readonly memoryAllocation: 'minimal';
}