# Cube Engine API Documentation

## Overview

The Cube Engine package provides core cube logic and state management functionality. This is a pure TypeScript library with no external dependencies, designed for performance-critical operations.

## Core Classes

### StateManager

Central state management for the Rubik's cube.

```typescript
import { StateManager } from '@rubiks-cube/cube-engine';

const stateManager = new StateManager();
```

#### Methods

**`getCurrentState(): CubeState`**
- Returns the current cube state
- Performance: < 1ms execution time
- Thread-safe: Yes

**`applyMove(move: Move): CubeOperationResult<CubeState>`**
- Applies a move to the cube
- Validates move before application
- Returns success/error result
- Performance: < 16ms for 60fps target

**`validateState(): boolean`**
- Validates current cube state integrity
- Checks for corruption or invalid configurations
- Returns true if state is valid

**`reset(): void`**
- Resets cube to solved state
- Clears move history
- Resets performance metrics

### CubeState

Immutable cube state representation.

```typescript
interface CubeState {
  readonly faces: ReadonlyArray<FaceState>;
  readonly timestamp: number;
  readonly moveCount: number;
  readonly isValid: boolean;
}
```

#### Properties

- **faces**: Array of 6 face states (Front, Back, Left, Right, Up, Down)
- **timestamp**: State creation timestamp
- **moveCount**: Number of moves applied since reset
- **isValid**: State validity flag

### MoveValidator

Validates cube moves and sequences.

```typescript
import { MoveValidator } from '@rubiks-cube/cube-engine';

const validator = new MoveValidator();
```

#### Methods

**`validateMove(move: Move): ValidationResult`**
- Validates a single move
- Checks move syntax and feasibility
- Returns validation result with error details

**`validateSequence(moves: Move[]): ValidationResult`**
- Validates a sequence of moves
- Checks for conflicting moves
- Optimizes move sequence

### MoveHistoryManager

Manages move history and undo/redo functionality.

```typescript
import { MoveHistoryManager } from '@rubiks-cube/cube-engine';

const historyManager = new MoveHistoryManager();
```

#### Methods

**`addMove(move: Move): void`**
- Adds move to history
- Maintains configurable history limit
- Thread-safe operation

**`undo(): Move | null`**
- Returns last move for undo
- Removes from history
- Returns null if no moves to undo

**`canUndo(): boolean`**
- Checks if undo is possible
- Performance: O(1) operation

**`clear(): void`**
- Clears entire move history
- Resets to initial state

## Types

### Move

```typescript
interface Move {
  readonly face: Face;
  readonly rotation: Rotation;
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

enum Rotation {
  CLOCKWISE = 90,
  COUNTER_CLOCKWISE = -90,
  HALF_TURN = 180
}
```

### CubeOperationResult

```typescript
type CubeOperationResult<T> = 
  | { success: true; data: T; performance: PerformanceMetrics }
  | { success: false; error: CubeError; context?: any };
```

### PerformanceMetrics

```typescript
interface PerformanceMetrics {
  readonly executionTime: number; // milliseconds
  readonly memoryUsage: number;   // bytes
  readonly operationsPerSecond: number;
}
```

## Error Handling

### CubeError

```typescript
enum CubeError {
  INVALID_MOVE = 'INVALID_MOVE',
  CORRUPTED_STATE = 'CORRUPTED_STATE',
  PERFORMANCE_THRESHOLD_EXCEEDED = 'PERFORMANCE_THRESHOLD_EXCEEDED',
  MEMORY_LIMIT_EXCEEDED = 'MEMORY_LIMIT_EXCEEDED'
}
```

## Usage Examples

### Basic Cube Operations

```typescript
import { StateManager, Move, Face, Rotation } from '@rubiks-cube/cube-engine';

// Initialize state manager
const stateManager = new StateManager();

// Create a move
const move: Move = {
  face: Face.FRONT,
  rotation: Rotation.CLOCKWISE,
  timestamp: Date.now()
};

// Apply move
const result = stateManager.applyMove(move);

if (result.success) {
  console.log('Move applied successfully');
  console.log('Performance:', result.data.performance);
} else {
  console.error('Move failed:', result.error);
}
```

### State Validation

```typescript
// Check state integrity
const isValid = stateManager.validateState();

if (!isValid) {
  console.warn('Cube state corrupted, resetting...');
  stateManager.reset();
}
```

### Move History Management

```typescript
import { MoveHistoryManager } from '@rubiks-cube/cube-engine';

const history = new MoveHistoryManager();

// Add moves to history
history.addMove(move);

// Undo last move
if (history.canUndo()) {
  const lastMove = history.undo();
  // Apply inverse move to cube
}
```

## Performance Considerations

- **Target**: All operations < 16ms for 60fps
- **Memory**: Minimal allocation during operations
- **Threading**: All methods are thread-safe
- **Caching**: Internal caching for frequently accessed states

## Testing

```bash
cd packages/cube-engine
npm test                    # Run all tests
npm run test:performance   # Run performance benchmarks
npm run test:coverage      # Generate coverage report
```

## Integration Notes

- Use with `@rubiks-cube/three-renderer` for 3D visualization
- Integrate with `@rubiks-cube/shared` for common types
- State serialization available for persistence
- Event system available for state change notifications