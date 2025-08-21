# @rubiks-cube/shared

Shared TypeScript types and utilities for the Rubik's Cube game. Provides common interfaces, types, and utility functions used across all packages in the monorepo.

## Overview

This package serves as the central type library, ensuring consistency and type safety across the entire Rubik's Cube application. It contains no runtime dependencies and focuses purely on TypeScript definitions and lightweight utilities.

## Features

- **Zero Dependencies** - Pure TypeScript types and interfaces
- **Strict Type Safety** - Comprehensive type definitions for all game entities
- **Cross-Package Consistency** - Shared interfaces ensure compatibility
- **Performance Types** - Specialized types for performance monitoring
- **Error Handling** - Standardized error types and result patterns

## Core Types

### Cube Types

#### CubeState
Complete representation of cube configuration:

```typescript
interface CubeState {
  faces: FaceColorMatrix;      // 6 faces × 3×3 color matrix
  moveHistory: Move[];         // Applied move sequence
  timestamp: number;           // State creation time
  isScrambled: boolean;        // Scrambled state flag
  isSolved: boolean;           // Solved state flag
  moveCount: number;           // Total moves from solved
}
```

#### Move Notation
Standard Rubik's cube move representation:

```typescript
type Move = 
  | 'F' | 'F\'' | 'F2'    // Front face rotations
  | 'R' | 'R\'' | 'R2'    // Right face rotations  
  | 'U' | 'U\'' | 'U2'    // Up face rotations
  | 'L' | 'L\'' | 'L2'    // Left face rotations
  | 'B' | 'B\'' | 'B2'    // Back face rotations
  | 'D' | 'D\'' | 'D2';   // Down face rotations

// Extended notation (future)
type ExtendedMove = Move | 'x' | 'y' | 'z' | 'M' | 'E' | 'S';
```

#### Colors and Positions
```typescript
enum CubeColor {
  WHITE = '#FFFFFF',
  RED = '#FF0000', 
  BLUE = '#0000FF',
  ORANGE = '#FFA500',
  GREEN = '#00FF00',
  YELLOW = '#FFFF00'
}

enum FacePosition {
  FRONT = 'front',
  BACK = 'back',
  LEFT = 'left', 
  RIGHT = 'right',
  UP = 'up',
  DOWN = 'down'
}
```

### Animation Types

#### CubeAnimation
3D animation state and configuration:

```typescript
interface CubeAnimation {
  id: string;                           // Unique animation identifier
  type: 'face-rotation' | 'cube-rotation'; // Animation category
  move: Move;                          // Associated cube move
  face: FacePosition;                  // Target face
  direction: RotationDirection;        // Rotation direction
  startTime: number;                   // Animation start timestamp
  duration: number;                    // Total animation duration
  progress: number;                    // Current progress (0-1)
  easing: 'linear' | 'ease-in-out' | 'ease-out' | 'ease-in';
}

enum RotationDirection {
  CLOCKWISE = 'clockwise',
  COUNTERCLOCKWISE = 'counterclockwise', 
  DOUBLE = 'double'
}
```

#### AnimationState
Runtime animation tracking:

```typescript
interface AnimationState {
  isAnimating: boolean;        // Animation active flag
  activeAnimations: string[];  // List of active animation IDs
  queuedAnimations: string[];  // Pending animations
  lastCompletedTime: number;   // Last completion timestamp
}
```

### Interaction Types

#### Mouse Interactions
```typescript
interface MousePosition {
  x: number;  // Screen X coordinate
  y: number;  // Screen Y coordinate
}

interface DragGesture {
  startPosition: MousePosition;    // Drag start point
  currentPosition: MousePosition;  // Current drag point
  delta: { deltaX: number; deltaY: number }; // Movement delta
  isActive: boolean;               // Gesture active state
  startTime: number;               // Gesture start time
  duration: number;                // Current gesture duration
}

enum CursorState {
  DEFAULT = 'default',
  HOVER = 'hover',
  GRABBING = 'grabbing', 
  ROTATING = 'rotating',
  DISABLED = 'disabled'
}
```

#### Touch Interactions
```typescript
interface TouchPosition {
  x: number;
  y: number;
  identifier: number;  // Touch point ID
}

interface TouchGesture {
  touches: TouchPosition[];     // Active touch points
  type: 'tap' | 'drag' | 'pinch' | 'rotate'; // Gesture type
  startTime: number;           // Gesture start time
  confidence: number;          // Recognition confidence (0-1)
}
```

### Performance Types

#### Performance Metrics
```typescript
interface PerformanceMetrics {
  fps: number;                 // Current frames per second
  averageFps: number;          // Average FPS over time window
  memoryUsage: number;         // Memory usage in MB
  renderTime: number;          // Frame render time in ms
  cpuUsage: number;           // CPU utilization percentage
  gpuUsage?: number;          // GPU utilization (if available)
}

interface PerformanceThresholds {
  minFps: number;              // Minimum acceptable FPS
  maxMemory: number;           // Maximum memory usage
  maxRenderTime: number;       // Maximum render time per frame
  warningThreshold: number;    // Performance warning level
}
```

#### Operation Results
```typescript
interface CubeOperationResult<T> {
  readonly success: boolean;
  readonly data?: T;
  readonly error?: CubeError;
  readonly message?: string;
  readonly performanceWarning?: boolean;
}

interface CameraOperationResult<T> {
  success: boolean;
  data?: T;
  error?: CameraError;
  message?: string;
}
```

### Error Types

#### Error Enumerations
```typescript
enum CubeError {
  // Move validation errors
  INVALID_MOVE = 'INVALID_MOVE',
  INVALID_MOVE_SEQUENCE = 'INVALID_MOVE_SEQUENCE',
  MOVE_CONFLICTS = 'MOVE_CONFLICTS',
  
  // State errors  
  INVALID_STATE = 'INVALID_STATE',
  STATE_CORRUPTION = 'STATE_CORRUPTION',
  SERIALIZATION_ERROR = 'SERIALIZATION_ERROR',
  
  // Animation errors
  ANIMATION_IN_PROGRESS = 'ANIMATION_IN_PROGRESS',
  ANIMATION_FAILED = 'ANIMATION_FAILED',
  
  // Performance errors
  PERFORMANCE_TIMEOUT = 'PERFORMANCE_TIMEOUT',
  MEMORY_LIMIT_EXCEEDED = 'MEMORY_LIMIT_EXCEEDED',
  
  // Rendering errors
  WEBGL_CONTEXT_LOST = 'WEBGL_CONTEXT_LOST',
  RAYCASTING_FAILED = 'RAYCASTING_FAILED'
}

enum CameraError {
  INVALID_POSITION = 'INVALID_POSITION',
  ANIMATION_IN_PROGRESS = 'ANIMATION_IN_PROGRESS', 
  ZOOM_LIMIT_EXCEEDED = 'ZOOM_LIMIT_EXCEEDED'
}
```

### Math Types

#### 3D Mathematics
```typescript
interface Vector3D {
  x: number;
  y: number; 
  z: number;
}

interface Quaternion {
  x: number;
  y: number;
  z: number;
  w: number;
}

interface Matrix4 {
  elements: number[]; // 16-element array
}

interface Transform3D {
  position: Vector3D;
  rotation: Quaternion;
  scale: Vector3D;
}
```

#### Geometry Types
```typescript
interface BoundingBox {
  min: Vector3D;
  max: Vector3D;
}

interface Ray {
  origin: Vector3D;
  direction: Vector3D;
}

interface Intersection {
  point: Vector3D;
  distance: number;
  faceIndex?: number;
  object?: any; // Three.js object reference
}
```

## Utility Types

### Conditional Types
```typescript
// Extract animation types
type FaceRotationAnimation = Extract<CubeAnimation, { type: 'face-rotation' }>;
type CubeRotationAnimation = Extract<CubeAnimation, { type: 'cube-rotation' }>;

// Result type utilities
type SuccessResult<T> = Extract<CubeOperationResult<T>, { success: true }>;
type ErrorResult = Extract<CubeOperationResult<any>, { success: false }>;
```

### Option Types
```typescript
interface AnimationOptions {
  duration?: number;           // Animation duration in ms
  easing?: CubeAnimation['easing']; // Easing function
  frameRate?: number;          // Target frame rate
  snapToGrid?: boolean;        // Snap to grid positions
}

interface GestureRecognitionOptions {
  minDragDistance?: number;    // Minimum drag distance in pixels
  maxDragTime?: number;        // Maximum drag time in ms
  snapThreshold?: number;      // Snap threshold in degrees
  sensitivity?: number;        // Gesture sensitivity multiplier
}
```

## Constants

### Color Definitions
```typescript
export const CUBE_COLORS = {
  WHITE: '#FFFFFF',
  RED: '#FF0000',
  BLUE: '#0000FF', 
  ORANGE: '#FFA500',
  GREEN: '#00FF00',
  YELLOW: '#FFFF00',
  BLACK: '#000000'  // Internal faces
} as const;
```

### Performance Constants
```typescript
export const PERFORMANCE_TARGETS = {
  TARGET_FPS: 60,
  MIN_FPS: 30,
  MAX_MEMORY_MB: 100,
  MAX_RENDER_TIME_MS: 16,
  WARNING_THRESHOLD: 0.8
} as const;
```

### Animation Constants
```typescript
export const ANIMATION_DEFAULTS = {
  DURATION: 300,           // Default animation duration
  EASING: 'ease-out',      // Default easing function
  SNAP_THRESHOLD: 15,      // Snap threshold in degrees
  MIN_DRAG_DISTANCE: 5     // Minimum drag distance
} as const;
```

## Type Guards

### Runtime Type Checking
```typescript
// Type guards for runtime validation
export function isCubeState(obj: any): obj is CubeState {
  return obj && 
    typeof obj.timestamp === 'number' &&
    Array.isArray(obj.moveHistory) &&
    typeof obj.isScrambled === 'boolean';
}

export function isValidMove(move: string): move is Move {
  const validMoves = ['F', 'F\'', 'F2', 'R', 'R\'', 'R2', /* ... */];
  return validMoves.includes(move);
}

export function isCubeError(error: any): error is CubeError {
  return Object.values(CubeError).includes(error);
}
```

### Result Type Guards
```typescript
export function isSuccessResult<T>(
  result: CubeOperationResult<T>
): result is SuccessResult<T> {
  return result.success === true;
}

export function isErrorResult<T>(
  result: CubeOperationResult<T>
): result is ErrorResult {
  return result.success === false;
}
```

## Integration Examples

### Cross-Package Usage
```typescript
// In cube-engine package
import { CubeState, Move, CubeOperationResult } from '@rubiks-cube/shared';

export class StateManager {
  applyMove(state: CubeState, move: Move): CubeOperationResult<CubeState> {
    // Implementation using shared types
  }
}

// In three-renderer package  
import { FacePosition, RotationDirection, CubeAnimation } from '@rubiks-cube/shared';

export class FaceRotationAnimator {
  startRotation(config: {
    face: FacePosition;
    direction: RotationDirection;
  }): CubeOperationResult<string> {
    // Implementation using shared types
  }
}
```

### Type-Safe Configuration
```typescript
// Configuration objects use shared types
const animationConfig: AnimationOptions = {
  duration: 300,
  easing: 'ease-out',
  frameRate: 60,
  snapToGrid: true
};

const gestureConfig: GestureRecognitionOptions = {
  minDragDistance: 5,
  sensitivity: 1.0,
  snapThreshold: 15
};
```

## Development

### Building
```bash
# Type checking only (no runtime code)
npm run build

# Type checking with watch mode
npm run build -- --watch
```

### Testing
```bash
# Type-only testing
npm test

# Test type definitions
npm run test:types
```

### Validation
```bash
# Lint type definitions
npm run lint

# Check for unused types
npm run lint:unused-types
```

## Best Practices

### Type Definition Guidelines

1. **Immutability**: Use `readonly` for data that shouldn't change
2. **Specificity**: Prefer specific types over `any` or `unknown`
3. **Documentation**: Include JSDoc comments for complex types
4. **Consistency**: Use consistent naming conventions across packages

### Example Type Documentation
```typescript
/**
 * Represents the complete state of a Rubik's cube at a point in time.
 * 
 * @example
 * ```typescript
 * const state: CubeState = {
 *   faces: [[...], [...], ...],
 *   moveHistory: ['F', 'R', 'U'],
 *   timestamp: Date.now(),
 *   isScrambled: true,
 *   isSolved: false,
 *   moveCount: 3
 * };
 * ```
 */
interface CubeState {
  // ... properties
}
```

### Error Handling Patterns
```typescript
// Preferred error handling pattern
function performOperation(): CubeOperationResult<ResultType> {
  try {
    const result = doSomething();
    return { success: true, data: result };
  } catch (error) {
    return {
      success: false,
      error: CubeError.OPERATION_FAILED,
      message: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}
```

## License

ISC License - Part of the Rubik's Cube monorepo project.