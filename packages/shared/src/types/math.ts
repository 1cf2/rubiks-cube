/* eslint-disable no-unused-vars */
/**
 * 2D Vector interface for screen coordinates and touch positions
 */
export interface Vector2 {
  readonly x: number;
  readonly y: number;
}

/**
 * 3D Vector interface for mathematical operations with strict type safety
 */
export interface Vector3D {
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

/**
 * Quaternion interface for rotation operations with immutable properties
 */
export interface Quaternion {
  readonly x: number;
  readonly y: number;
  readonly z: number;
  readonly w: number;
}

/**
 * Immutable transformation matrix for 3D operations
 */
export interface Matrix4 {
  readonly elements: ReadonlyArray<number>; // 16 elements in column-major order
}

/**
 * Performance-critical function annotation for 16ms execution time
 */
export type PerformanceCritical<T extends (...args: never[]) => any> = T & {
  readonly __performanceCritical: true;
  readonly __maxExecutionTime: 16; // milliseconds
};

/**
 * Result type for error handling in 3D operations
 */
export type CubeOperationResult<T> =
  | {
      readonly success: true;
      readonly data: T;
    }
  | {
      readonly success: false;
      readonly error: CubeError;
      readonly message?: string;
    };

/**
 * Comprehensive error enum for cube operations
 */
export enum CubeError {
  INVALID_MOVE = 'INVALID_MOVE',
  ANIMATION_IN_PROGRESS = 'ANIMATION_IN_PROGRESS',
  WEBGL_CONTEXT_LOST = 'WEBGL_CONTEXT_LOST',
  PERFORMANCE_DEGRADED = 'PERFORMANCE_DEGRADED',
  INVALID_STATE = 'INVALID_STATE',
  NETWORK_ERROR = 'NETWORK_ERROR',
  RAYCASTING_FAILED = 'RAYCASTING_FAILED',
  GESTURE_RECOGNITION_FAILED = 'GESTURE_RECOGNITION_FAILED',
}
