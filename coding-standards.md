# Coding Standards - Rubik's Cube Project

## Overview

This document outlines the comprehensive coding standards for the Rubik's Cube 3D application. These standards ensure consistency, maintainability, and optimal performance across our multi-package TypeScript/React codebase.

## General Principles

### 1. Performance-First Development
- Target 60fps on desktop, 30fps on mobile
- All performance-critical functions must execute within 16ms
- Use `window.performance.now()` for precise timing measurements
- Monitor memory usage in 3D operations

### 2. Type Safety Excellence
- Leverage TypeScript's strict mode configuration
- Use immutable data patterns for state management
- Implement comprehensive error handling with typed results
- No `any` types except for verified external APIs

### 3. 3D-Aware Architecture
- Separate logical cube state from visual representation
- Use Three.js best practices for memory management
- Implement proper cleanup for WebGL resources

## TypeScript Configuration Standards

### Strict Type Checking
```typescript
// Required tsconfig.json settings
{
  "strict": true,
  "noImplicitAny": true,
  "strictNullChecks": true,
  "noUncheckedIndexedAccess": true,
  "exactOptionalPropertyTypes": true,
  "noImplicitReturns": true,
  "noFallthroughCasesInSwitch": true
}
```

### Cross-Package Imports
```typescript
// Use path mapping for clean imports
import { CubeState } from '@rubiks-cube/cube-engine';
import { Vector3D } from '@rubiks-cube/shared';
import { FaceHighlighting } from '@rubiks-cube/three-renderer';
```

## Core Type Definitions

### Mathematical Types
```typescript
interface Vector3D {
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

interface Quaternion {
  readonly w: number;
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

interface Matrix4 {
  readonly elements: readonly [
    number, number, number, number,
    number, number, number, number,
    number, number, number, number,
    number, number, number, number
  ];
}
```

### Cube State Types
```typescript
interface CubeState {
  readonly faces: ReadonlyArray<FaceState>;
  readonly timestamp: number;
  readonly moveHistory: ReadonlyArray<Move>;
}

interface Move {
  readonly face: Face;
  readonly direction: RotationDirection;
  readonly angle: number;
  readonly timestamp: number;
}

enum Face {
  FRONT = 'F',
  BACK = 'B',
  LEFT = 'L',
  RIGHT = 'R',
  UP = 'U',
  DOWN = 'D'
}
```

### Error Handling Types
```typescript
type CubeOperationResult<T> = 
  | { success: true; data: T }
  | { success: false; error: CubeError };

enum CubeError {
  INVALID_MOVE = 'INVALID_MOVE',
  ANIMATION_IN_PROGRESS = 'ANIMATION_IN_PROGRESS',
  WEBGL_CONTEXT_LOST = 'WEBGL_CONTEXT_LOST',
  PERFORMANCE_DEGRADED = 'PERFORMANCE_DEGRADED',
  STATE_CORRUPTION = 'STATE_CORRUPTION'
}
```

## React Component Standards

### Component Structure
```typescript
// 1. Props interface first
interface CubeRendererProps {
  cubeState: CubeState;
  onMove?: (move: Move) => void;
  qualitySettings: QualitySettings;
  debugMode?: boolean;
}

// 2. Component with explicit return type
const CubeRenderer: React.FC<CubeRendererProps> = ({
  cubeState,
  onMove,
  qualitySettings,
  debugMode = false
}) => {
  // Implementation
  return <Canvas>{/* Three.js content */}</Canvas>;
};
```

### Custom Hooks Pattern
```typescript
// Hook naming: use[Domain][Action]
const useCubeInteraction = (
  cubeState: CubeState
): [InteractionState, InteractionHandlers] => {
  // Return tuple pattern for clarity
  return [state, handlers];
};

const usePerformanceMonitoring = (): {
  metrics: PerformanceMetrics;
  startMonitoring: () => void;
  stopMonitoring: () => void;
} => {
  // Object pattern for multiple related functions
};
```

### Error Boundaries
```typescript
class ThreeJSErrorBoundary extends React.Component<
  ThreeJSErrorBoundaryProps,
  ThreeJSErrorBoundaryState
> {
  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log to monitoring system
    console.error('Three.js Error:', error, errorInfo);
    
    // Attempt WebGL context recovery
    this.attemptContextRecovery();
  }

  private attemptContextRecovery(): void {
    // Implementation for WebGL context loss recovery
  }
}
```

## Performance Standards

### Animation Performance
```typescript
interface PerformanceCritical {
  readonly executionTime: '16ms'; // For 60fps
  readonly memoryAllocation: 'minimal';
  readonly garbageCollection: 'avoided';
}

// Animation loop optimization
const animateFrame = (timestamp: number): void => {
  const startTime = performance.now();
  
  // Perform animation calculations
  updateCubeRotation(deltaTime);
  
  const executionTime = performance.now() - startTime;
  if (executionTime > 16) {
    console.warn(`Frame time exceeded: ${executionTime}ms`);
  }
  
  requestAnimationFrame(animateFrame);
};
```

### Memory Management
```typescript
// Proper cleanup for Three.js resources
class CubeRenderer {
  dispose(): void {
    // Dispose geometries
    this.geometry?.dispose();
    
    // Dispose materials
    this.materials.forEach(material => material.dispose());
    
    // Dispose textures
    this.textures.forEach(texture => texture.dispose());
    
    // Clear references
    this.scene?.clear();
  }
}
```

## Testing Standards

### Unit Tests
```typescript
describe('CubeState', () => {
  it('should maintain immutability during rotations', () => {
    const initialState = createInitialCubeState();
    const rotatedState = rotateFace(initialState, Face.FRONT, RotationDirection.CLOCKWISE);
    
    expect(initialState).not.toBe(rotatedState);
    expect(initialState.faces).not.toBe(rotatedState.faces);
  });

  it('should complete rotations within performance threshold', async () => {
    const startTime = performance.now();
    
    await animateRotation(face, direction);
    
    const executionTime = performance.now() - startTime;
    expect(executionTime).toBeLessThan(300); // 300ms animation threshold
  });
});
```

### Integration Tests
```typescript
describe('Mouse Interaction Integration', () => {
  it('should detect face selection accurately', async () => {
    const mockEvent = createMouseEvent(100, 100);
    const result = await detectFaceFromMouse(mockEvent, camera, cubeGeometry);
    
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.face).toBe(Face.FRONT);
    }
  });
});
```

## Code Organization Standards

### File Naming
- Components: `PascalCase.tsx` (e.g., `CubeRenderer.tsx`)
- Hooks: `camelCase.ts` starting with 'use' (e.g., `useCubeInteraction.ts`)
- Utilities: `camelCase.ts` (e.g., `mathUtils.ts`)
- Types: `PascalCase.ts` with 'Types' suffix (e.g., `CubeTypes.ts`)

### Directory Structure Per Package
```
src/
├── components/          # React components
├── hooks/              # Custom hooks
├── types/              # TypeScript type definitions
├── utils/              # Utility functions
├── constants/          # Application constants
└── index.ts            # Package exports
```

### Import Organization
```typescript
// 1. External libraries
import React from 'react';
import * as THREE from 'three';

// 2. Internal package imports
import { CubeState } from '@rubiks-cube/cube-engine';
import { Vector3D } from '@rubiks-cube/shared';

// 3. Relative imports
import { mathUtils } from '../utils/mathUtils';
import { CUBE_COLORS } from '../constants/colors';
```

## Documentation Standards

### JSDoc Comments
```typescript
/**
 * Rotates a face of the cube in the specified direction.
 * 
 * @param cubeState - Current immutable cube state
 * @param face - Face to rotate (F, B, L, R, U, D)
 * @param direction - Rotation direction (clockwise/counterclockwise)
 * @returns New cube state with rotation applied
 * 
 * @performance Critical path - must execute within 16ms
 * @complexity O(1) - constant time face rotation
 */
const rotateFace = (
  cubeState: CubeState,
  face: Face,
  direction: RotationDirection
): CubeState => {
  // Implementation
};
```

### README Structure
Each package should include:
1. Purpose and responsibilities
2. Key exports and APIs
3. Performance characteristics
4. Testing approach
5. Known limitations

## Git Standards

### Commit Messages
```
feat: Add gesture-based layer detection for cube rotation

- Implement swipe gesture recognition
- Add layer highlighting during gestures
- Optimize touch event handling for mobile performance
- Include comprehensive unit tests

🤖 Generated with [Claude Code](https://claude.ai/code)

Co-Authored-By: Claude <noreply@anthropic.com>
```

### Branch Naming
- Features: `feat/gesture-layer-detection`
- Fixes: `fix/animation-memory-leak`
- Performance: `perf/touch-response-time`

## Linting and Formatting

### ESLint Configuration
```json
{
  "extends": [
    "@typescript-eslint/recommended",
    "prettier"
  ],
  "rules": {
    "@typescript-eslint/no-unused-vars": "error",
    "@typescript-eslint/explicit-function-return-type": "warn",
    "prefer-const": "error",
    "no-var": "error"
  }
}
```

### Prettier Configuration
```json
{
  "semi": true,
  "trailingComma": "es5",
  "singleQuote": true,
  "printWidth": 100,
  "tabWidth": 2,
  "useTabs": false
}
```

## Security Considerations

- Never expose WebGL debugging information in production
- Sanitize any user input for cube notation
- Use Content Security Policy for web app deployment
- Validate all API responses with runtime type checking

## Performance Monitoring

### Key Metrics
- Frame rate (target: 60fps desktop, 30fps mobile)
- Memory usage (monitor Three.js object creation)
- Touch/mouse response time (target: <100ms)
- Bundle size (monitor webpack analyzer)

### Monitoring Implementation
```typescript
const monitorPerformance = (): void => {
  const observer = new PerformanceObserver((list) => {
    list.getEntries().forEach((entry) => {
      if (entry.duration > 16) {
        console.warn(`Long task detected: ${entry.duration}ms`);
      }
    });
  });
  
  observer.observe({ entryTypes: ['longtask'] });
};
```

---

This document should be reviewed and updated as the codebase evolves, maintaining alignment with project requirements and performance targets.