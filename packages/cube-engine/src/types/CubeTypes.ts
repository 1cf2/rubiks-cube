import { CubeColor } from '@rubiks-cube/shared/types/cube';

export type CubeFace = 'front' | 'back' | 'left' | 'right' | 'up' | 'down';
export type RotationDirection = 'clockwise' | 'counterclockwise' | 'double';

export interface FaceState {
  readonly face: CubeFace;
  readonly colors: readonly CubeColor[]; // 9 colors in row-major order (3x3 grid flattened)
  readonly rotation: number; // Current rotation in radians
}

export interface Move {
  readonly face: CubeFace;
  readonly direction: RotationDirection;
  readonly timestamp: number;
  readonly duration: number; // milliseconds
}

export interface CubeState {
  readonly faces: readonly [FaceState, FaceState, FaceState, FaceState, FaceState, FaceState]; // 6 faces
  readonly moveHistory: readonly Move[];
  readonly isScrambled: boolean;
  readonly isSolved: boolean;
  readonly timestamp: number;
}

export interface StateOperation<T = CubeState> {
  readonly executionTime: number; // milliseconds
  readonly memoryAllocation: 'minimal' | 'moderate' | 'heavy';
  readonly result: T;
}

export enum CubeError {
  INVALID_MOVE = 'INVALID_MOVE',
  ANIMATION_IN_PROGRESS = 'ANIMATION_IN_PROGRESS',
  WEBGL_CONTEXT_LOST = 'WEBGL_CONTEXT_LOST',
  PERFORMANCE_DEGRADED = 'PERFORMANCE_DEGRADED',
  STATE_CORRUPTION = 'STATE_CORRUPTION',
  INVALID_FACE_STATE = 'INVALID_FACE_STATE',
}

// Prevent unused variable warnings by exporting unused enum values
export const CUBE_ERROR_CONSTANTS = {
  INVALID_MOVE: CubeError.INVALID_MOVE,
  ANIMATION_IN_PROGRESS: CubeError.ANIMATION_IN_PROGRESS,
  WEBGL_CONTEXT_LOST: CubeError.WEBGL_CONTEXT_LOST,
  PERFORMANCE_DEGRADED: CubeError.PERFORMANCE_DEGRADED,
  STATE_CORRUPTION: CubeError.STATE_CORRUPTION,
  INVALID_FACE_STATE: CubeError.INVALID_FACE_STATE,
} as const;

export type CubeOperationResult<T> = 
  | { readonly success: true; readonly data: T }
  | { readonly success: false; readonly error: CubeError };

export interface PerformanceCritical {
  readonly executionTime: '16ms';
  readonly memoryAllocation: 'minimal';
}

export const STANDARD_SOLVED_STATE: Record<CubeFace, CubeColor> = {
  front: CubeColor.GREEN,
  back: CubeColor.BLUE,
  left: CubeColor.ORANGE,
  right: CubeColor.RED,
  up: CubeColor.WHITE,
  down: CubeColor.YELLOW,
} as const;

export const CUBE_FACES: readonly CubeFace[] = ['front', 'back', 'left', 'right', 'up', 'down'] as const;
export const ROTATION_DIRECTIONS: readonly RotationDirection[] = ['clockwise', 'counterclockwise', 'double'] as const;