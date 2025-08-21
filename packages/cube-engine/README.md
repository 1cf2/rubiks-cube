# @rubiks-cube/cube-engine

Core cube logic and state management for the Rubik's Cube game. Provides pure TypeScript implementations of cube operations, move validation, and state management without external dependencies.

## Overview

This package contains the essential algorithms and data structures for managing Rubik's cube state, validating moves, and ensuring cube integrity. It serves as the logical foundation for the 3D game interface.

## Features

- **Pure TypeScript** - No external dependencies, fully type-safe
- **Immutable Operations** - All state changes preserve immutability
- **Move Validation** - Comprehensive validation of cube moves and sequences
- **State Serialization** - Save and load cube states in multiple formats
- **Corruption Recovery** - Automatic detection and recovery from invalid states
- **Performance Optimized** - 16ms operation thresholds for smooth gameplay

## Key Components

### StateManager

Central hub for cube state operations and management:

```typescript
import { StateManager } from '@rubiks-cube/cube-engine';

const manager = new StateManager();

// Get initial solved state
const solvedState = manager.getSolvedState();

// Apply a move
const result = manager.applyMove(solvedState, 'F');
if (result.success) {
  console.log('New state:', result.state);
}

// Validate state integrity
const validation = manager.validateState(result.state!);
console.log('State is valid:', validation.isValid);
```

**Key Methods:**
- `getSolvedState()` - Get initial solved cube state
- `applyMove(state, move)` - Apply single move to state
- `applyMoveSequence(state, moves)` - Apply sequence of moves
- `validateState(state)` - Check state integrity
- `scramble(moves)` - Generate scrambled state

### CubeState

Immutable representation of cube configuration:

```typescript
interface CubeState {
  faces: FaceColorMatrix;      // 6 faces × 3×3 color matrix
  moveHistory: Move[];         // Sequence of moves applied
  timestamp: number;           // State creation time
  isScrambled: boolean;        // Whether state is scrambled
  isSolved: boolean;           // Whether state is solved
  moveCount: number;           // Total moves from solved state
}
```

**State Properties:**
- **Immutable**: State objects never change after creation
- **Serializable**: Can be converted to/from JSON
- **Validated**: Automatic integrity checking
- **Timestamped**: Track state creation and modification

### MoveValidator

Comprehensive move validation and conflict detection:

```typescript
import { MoveValidator } from '@rubiks-cube/cube-engine';

// Validate single move
const moveResult = MoveValidator.validateMove('F');
console.log('Move is valid:', moveResult.success);

// Validate move sequence
const sequenceResult = MoveValidator.validateMoveSequence(['F', 'R', 'U']);
console.log('Sequence is valid:', sequenceResult.success);

// Check for move conflicts
const conflictResult = MoveValidator.checkMoveConflicts(['F', 'F\'']);
console.log('Has conflicts:', !conflictResult.success);
```

**Validation Features:**
- **Syntax Checking**: Validates move notation (F, R', U2, etc.)
- **Sequence Analysis**: Detects redundant and conflicting moves
- **Performance Limits**: Ensures moves can complete within time constraints
- **Concurrent Move Prevention**: Blocks simultaneous face rotations

### StateSerializer

Save and load cube states in multiple formats:

```typescript
import { StateSerializer } from '@rubiks-cube/cube-engine';

// Serialize state to JSON
const serialized = StateSerializer.serialize(cubeState, { 
  format: 'detailed',
  compression: true 
});

// Deserialize from JSON
const deserialized = StateSerializer.deserialize(serialized.data, {
  format: 'detailed'
});

if (deserialized.success) {
  console.log('Restored state:', deserialized.state);
}
```

**Serialization Formats:**
- **Detailed**: Complete state with move history and metadata
- **Compact**: Minimal representation for storage efficiency
- **Compatible**: Cross-version compatibility support

## Move Notation

Standard Rubik's cube notation is supported:

### Basic Moves
- **F** - Front face clockwise
- **R** - Right face clockwise  
- **U** - Up face clockwise
- **L** - Left face clockwise
- **B** - Back face clockwise
- **D** - Down face clockwise

### Move Modifiers
- **'** (prime) - Counterclockwise rotation (F', R', U')
- **2** - Double rotation (F2, R2, U2)
- **x**, **y**, **z** - Cube rotations (future feature)

### Move Validation Rules
- All moves must be valid notation
- No conflicting simultaneous moves on same face
- Sequence length limits for performance
- Invalid notation is rejected with helpful error messages

## State Management

### State Immutability

All state operations return new state objects:

```typescript
// ❌ Wrong - mutating state
cubeState.faces[0][0][0] = CubeColor.RED;

// ✅ Correct - immutable operation
const newState = StateManager.applyMove(cubeState, 'F');
```

### Move History

Complete move tracking for undo/redo functionality:

```typescript
interface CubeState {
  moveHistory: Move[];  // All moves from solved state
  moveCount: number;    // Total move count
}

// Get last move
const lastMove = cubeState.moveHistory[cubeState.moveHistory.length - 1];

// Undo functionality (future)
const undoMove = getInverseMove(lastMove);  // F -> F', R2 -> R2
```

### Performance Monitoring

Built-in performance tracking for operations:

```typescript
const result = StateManager.applyMove(state, 'F');
if (result.performanceWarning) {
  console.warn('Move took longer than 16ms threshold');
}
```

## Algorithms

### State Validation

Comprehensive cube state integrity checking:

1. **Face Completeness**: All 54 stickers accounted for
2. **Color Distribution**: Correct number of each color (9 per face)
3. **Center Preservation**: Center pieces maintain fixed positions
4. **Parity Validation**: Cube maintains solvable parity
5. **Corner/Edge Consistency**: Piece positions are physically possible

### Corruption Recovery

Automatic detection and recovery from invalid states:

```typescript
const validation = StateManager.validateState(suspiciousState);

if (!validation.isValid) {
  console.log('Corruption detected:', validation.errors);
  
  // Attempt automatic recovery
  const recovery = StateManager.recoverState(suspiciousState);
  if (recovery.success) {
    console.log('State recovered:', recovery.state);
  }
}
```

### Move Optimization

Sequence optimization for efficient solving:

```typescript
// Future feature - move sequence optimization
const optimized = MoveOptimizer.optimizeSequence(['F', 'F', 'F']); // -> ['F\'']
const simplified = MoveOptimizer.simplifySequence(['R', 'R\'']);   // -> []
```

## Testing

### Comprehensive Test Coverage

The cube engine includes extensive testing:

```bash
npm test                    # Run all tests
npm test -- --coverage     # Run with coverage report
npm test -- --watch        # Watch mode for development
```

**Test Categories:**
- **Unit Tests**: Individual component testing
- **Integration Tests**: Cross-component functionality
- **Performance Tests**: Operation timing validation
- **State Tests**: Cube state integrity verification
- **Algorithm Tests**: Move validation and serialization

### Test Utilities

Helper functions for testing cube operations:

```typescript
import { TestUtils } from '@rubiks-cube/cube-engine/testing';

// Create test states
const scrambledState = TestUtils.createScrambledState(['F', 'R', 'U']);
const solvedState = TestUtils.createSolvedState();

// Validate test results
const isEquivalent = TestUtils.statesEqual(state1, state2);
const isValid = TestUtils.isValidCubeState(testState);
```

## Performance Characteristics

### Operation Benchmarks

| Operation | Target Time | Typical Time |
|-----------|-------------|--------------|
| Single Move | <1ms | ~0.3ms |
| Move Sequence | <16ms | ~5ms |
| State Validation | <5ms | ~2ms |
| Serialization | <10ms | ~3ms |
| Corruption Recovery | <50ms | ~20ms |

### Memory Usage

- **CubeState**: ~2KB per state object
- **StateManager**: ~5KB base memory
- **Move History**: ~50 bytes per move
- **Total Runtime**: <1MB for typical session

## Error Handling

### Comprehensive Error Types

```typescript
enum CubeError {
  INVALID_MOVE = 'INVALID_MOVE',
  INVALID_STATE = 'INVALID_STATE',
  SEQUENCE_TOO_LONG = 'SEQUENCE_TOO_LONG',
  PERFORMANCE_TIMEOUT = 'PERFORMANCE_TIMEOUT',
  SERIALIZATION_ERROR = 'SERIALIZATION_ERROR',
  CORRUPTION_DETECTED = 'CORRUPTION_DETECTED'
}
```

### Error Recovery

```typescript
try {
  const result = StateManager.applyMove(state, 'INVALID');
} catch (error) {
  if (error instanceof CubeError) {
    console.log('Cube error:', error.type, error.message);
    // Handle specific cube errors
  }
}
```

## Future Features

### Planned Enhancements

- **Solving Algorithms**: CFOP, Roux, ZZ method implementations
- **Pattern Recognition**: Common cube pattern detection
- **Move Optimization**: Automatic sequence simplification
- **Algorithm Training**: Step-by-step solving guidance
- **Competition Mode**: Official scrambles and timing

### API Extensions

```typescript
// Future API additions
interface SolvingEngine {
  solve(state: CubeState): SolutionSequence;
  hint(state: CubeState): NextMove;
  analyze(state: CubeState): StateAnalysis;
}

interface PatternRecognition {
  detectOLL(state: CubeState): OLLCase | null;
  detectPLL(state: CubeState): PLLCase | null;
  findF2L(state: CubeState): F2LPairs;
}
```

## Integration

### Usage with Other Packages

```typescript
// Integration with three-renderer
import { StateManager } from '@rubiks-cube/cube-engine';
import { FaceRotationAnimator } from '@rubiks-cube/three-renderer';

const stateManager = new StateManager();
const currentState = stateManager.getSolvedState();

// Apply logical move
const newState = stateManager.applyMove(currentState, 'F');

// Trigger 3D animation
animator.startRotation({
  face: FacePosition.FRONT,
  direction: RotationDirection.CLOCKWISE,
  // ... animation config
});
```

### Type Integration

Shared types ensure consistency across packages:

```typescript
import { CubeState, Move, FacePosition } from '@rubiks-cube/shared';
// Types are consistent across all packages
```

## Troubleshooting

**Performance Issues:**
- Check for long move sequences (>50 moves)
- Monitor state validation frequency
- Use compact serialization for storage

**State Corruption:**
- Enable automatic corruption detection
- Use state validation in development
- Implement proper error boundaries

**Memory Leaks:**
- Avoid storing large move histories
- Clean up old state references
- Use state compression for long sessions

## License

ISC License - Part of the Rubik's Cube monorepo project.