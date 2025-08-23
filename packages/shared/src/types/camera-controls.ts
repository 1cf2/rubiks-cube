/* eslint-disable no-unused-vars */
import { Vector3D, Quaternion } from './math';

// Camera state management
export interface CameraState {
  readonly position: Vector3D;
  readonly rotation: Quaternion;
  readonly zoom: number;
  readonly target: Vector3D; // Always cube center (0,0,0)
  readonly isAnimating: boolean;
  readonly autoRotationEnabled: boolean;
}

// Camera animation definitions
export type CameraAnimationType = 'orbit' | 'zoom' | 'reset' | 'auto-rotate';

export interface CameraAnimation {
  readonly type: CameraAnimationType;
  readonly startState: CameraState;
  readonly targetState: CameraState;
  readonly duration: number;
  readonly easing: EasingFunction;
  readonly onComplete?: () => void;
}

// Easing function type for smooth animations
export type EasingFunction = (t: number) => number;

// View preferences for camera behavior
export interface ViewPreferences {
  readonly defaultCameraPosition: Vector3D;
  readonly autoRotationSpeed: number;
  readonly autoRotationTimeout: number; // ms before auto-rotation starts
  readonly zoomSensitivity: number;
  readonly orbitSensitivity: number;
  readonly persistCameraState: boolean;
}

// Camera operation result type following CubeOperationResult pattern
export type CameraOperationResult<T> = 
  | { success: true; data: T }
  | { success: false; error: CameraError };

// Camera-specific error types
export enum CameraError {
  INVALID_CAMERA_STATE = 'INVALID_CAMERA_STATE',
  ANIMATION_IN_PROGRESS = 'ANIMATION_IN_PROGRESS',
  ZOOM_LIMIT_EXCEEDED = 'ZOOM_LIMIT_EXCEEDED',
  ORBIT_CONSTRAINT_VIOLATION = 'ORBIT_CONSTRAINT_VIOLATION',
}

// Auto-rotation configuration
export interface AutoRotationConfig {
  readonly idleTimeout: number; // ms before auto-rotation starts
  readonly rotationSpeed: number; // radians per second
  readonly rotationAxis: Vector3D; // Default: (0, 1, 0) for Y-axis rotation
  readonly pauseOnHover: boolean; // Pause rotation when cursor over cube
  readonly interruptOnInput: boolean; // Stop rotation on any user input
  readonly resumeDelay: number; // ms before auto-rotation can resume
}

// Camera gesture input types
export type CameraGestureType = 'orbit' | 'zoom' | 'reset';

export interface CameraGestureParameters {
  readonly type: CameraGestureType;
  readonly startPosition?: Vector3D;
  readonly endPosition?: Vector3D;
  readonly deltaX?: number;
  readonly deltaY?: number;
  readonly zoomDelta?: number;
  readonly speed?: number;
  readonly timestamp: number;
}

// Device-specific camera configuration
export interface DeviceCameraConfig {
  readonly zoomSensitivity: number;
  readonly orbitSensitivity: number;
  readonly autoRotationSpeed: number;
  readonly frameRate: number;
  readonly gestureDeadZone?: number; // px - prevent accidental gestures
  readonly precisionControls?: boolean; // Mouse precision optimizations
  readonly hybridControls?: boolean; // Support both touch and precision controls
  readonly keyboardShortcuts?: boolean; // Full keyboard control support
  readonly adaptiveGestures?: boolean; // Context-aware gesture recognition
}

// Camera constraints for zoom and orbit limits
export interface CameraConstraints {
  readonly zoomLimits: {
    readonly min: number;
    readonly max: number;
  };
  readonly orbitLimits?: {
    readonly minPolarAngle?: number;
    readonly maxPolarAngle?: number;
    readonly minAzimuthAngle?: number;
    readonly maxAzimuthAngle?: number;
  };
}

// Performance monitoring for camera operations
export interface CameraPerformanceMetrics {
  readonly frameRate: number;
  readonly inputLatency: number; // ms from input to camera response
  readonly animationDuration: number; // ms for current animation
  readonly memoryUsage: number; // MB for camera state and animations
}

// Camera input event types
export interface CameraInputEvent {
  readonly type: 'mouse' | 'touch' | 'keyboard';
  readonly gesture: CameraGestureType;
  readonly parameters: CameraGestureParameters;
  readonly deviceConfig: DeviceCameraConfig;
}