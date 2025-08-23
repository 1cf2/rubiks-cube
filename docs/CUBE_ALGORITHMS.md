# Cube Algorithm Documentation

## Overview

This document covers the mathematical algorithms and data structures used in the Rubik's cube implementation, including state representation, move validation, solving algorithms, and performance optimizations.

## Cube State Representation

### Mathematical Model

The cube is modeled as a mathematical group with 54 individual stickers arranged on 6 faces:

```typescript
// Face representation (9 stickers per face)
interface FaceState {
  readonly stickers: ReadonlyArray<Color>; // 3x3 grid flattened to array
  readonly center: Color;                   // Face center (never moves)
}

// Complete cube state
interface CubeState {
  readonly faces: {
    readonly front: FaceState;
    readonly back: FaceState;
    readonly left: FaceState;
    readonly right: FaceState;
    readonly up: FaceState;
    readonly down: FaceState;
  };
  readonly isValid: boolean;
  readonly moveCount: number;
}
```

### Sticker Indexing Convention

Each face uses a consistent 3x3 grid indexing:

```
0 1 2
3 4 5  
6 7 8
```

Where index 4 is always the center piece (immutable).

### Color Encoding

```typescript
enum Color {
  WHITE = 0,   // Up face
  YELLOW = 1,  // Down face  
  RED = 2,     // Front face
  ORANGE = 3,  // Back face
  GREEN = 4,   // Right face
  BLUE = 5     // Left face
}
```

## Move Notation and Encoding

### Standard Notation

Following international cube notation:

```typescript
enum Face {
  F = 'F',  // Front
  B = 'B',  // Back
  L = 'L',  // Left
  R = 'R',  // Right
  U = 'U',  // Up
  D = 'D'   // Down
}

enum Rotation {
  CLOCKWISE = 1,        // 90° clockwise (no suffix)
  COUNTER_CLOCKWISE = 3, // 90° counter-clockwise (')
  HALF_TURN = 2         // 180° rotation (2)
}
```

### Move Representation

```typescript
interface Move {
  readonly face: Face;
  readonly rotation: Rotation;
  readonly timestamp: number;
}

// Examples:
// F   = { face: 'F', rotation: 1 }  // Front face 90° clockwise
// F'  = { face: 'F', rotation: 3 }  // Front face 90° counter-clockwise  
// F2  = { face: 'F', rotation: 2 }  // Front face 180°
```

## Core Algorithms

### Face Rotation Algorithm

The fundamental operation that rotates a face and affected edge pieces:

```typescript
class FaceRotator {
  /**
   * Rotates a face and updates adjacent edge pieces
   * Time Complexity: O(1)
   * Space Complexity: O(1)
   */
  rotateFace(state: CubeState, face: Face, rotation: Rotation): CubeState {
    const newState = { ...state };
    
    // 1. Rotate the face itself
    newState.faces[face] = this.rotateFaceGrid(state.faces[face], rotation);
    
    // 2. Update adjacent edge pieces
    const affectedEdges = this.getAffectedEdges(face);
    this.rotateEdgePieces(newState, affectedEdges, rotation);
    
    return newState;
  }
  
  private rotateFaceGrid(face: FaceState, rotation: Rotation): FaceState {
    const rotatedStickers = [...face.stickers];
    
    // Rotation mapping for 90° clockwise
    const clockwiseMapping = [6, 3, 0, 7, 4, 1, 8, 5, 2];
    
    for (let i = 0; i < 9; i++) {
      const sourceIndex = this.getSourceIndex(i, rotation, clockwiseMapping);
      rotatedStickers[i] = face.stickers[sourceIndex];
    }
    
    return {
      ...face,
      stickers: rotatedStickers
    };
  }
}
```

### Edge Piece Cycling Algorithm

Handles the cycling of edge pieces between adjacent faces:

```typescript
interface EdgeCycle {
  readonly faces: readonly [Face, Face, Face, Face];
  readonly indices: readonly [readonly number[], readonly number[], readonly number[], readonly number[]];
}

class EdgeCycler {
  private static readonly EDGE_CYCLES: Record<Face, EdgeCycle> = {
    [Face.F]: {
      faces: [Face.U, Face.R, Face.D, Face.L],
      indices: [[6, 7, 8], [0, 3, 6], [2, 1, 0], [8, 5, 2]]
    },
    [Face.R]: {
      faces: [Face.U, Face.B, Face.D, Face.F],
      indices: [[8, 5, 2], [0, 3, 6], [8, 5, 2], [8, 5, 2]]
    },
    // ... other faces
  };
  
  cycleEdges(state: CubeState, face: Face, rotation: Rotation): void {
    const cycle = EdgeCycler.EDGE_CYCLES[face];
    const steps = rotation; // 1, 2, or 3 steps
    
    // Create temporary storage for edge pieces
    const temp: Color[][] = cycle.faces.map((f, i) => 
      cycle.indices[i].map(idx => state.faces[f].stickers[idx])
    );
    
    // Perform the cycle
    for (let step = 0; step < steps; step++) {
      this.performSingleCycle(state, cycle, temp);
    }
  }
}
```

### State Validation Algorithm

Ensures cube state integrity and detects corruption:

```typescript
class StateValidator {
  /**
   * Validates complete cube state
   * Checks: Color count, piece permutations, corner orientation, edge orientation
   */
  validateState(state: CubeState): ValidationResult {
    const errors: string[] = [];
    
    // 1. Color count validation
    if (!this.validateColorCounts(state)) {
      errors.push('Invalid color distribution');
    }
    
    // 2. Corner piece validation  
    if (!this.validateCornerPieces(state)) {
      errors.push('Invalid corner piece configuration');
    }
    
    // 3. Edge piece validation
    if (!this.validateEdgePieces(state)) {
      errors.push('Invalid edge piece configuration');
    }
    
    // 4. Parity validation
    if (!this.validateParity(state)) {
      errors.push('Invalid cube parity');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }
  
  private validateColorCounts(state: CubeState): boolean {
    const colorCounts = new Map<Color, number>();
    
    // Count all stickers
    Object.values(state.faces).forEach(face => {
      face.stickers.forEach(color => {
        colorCounts.set(color, (colorCounts.get(color) || 0) + 1);
      });
    });
    
    // Each color should appear exactly 9 times
    return Array.from(colorCounts.values()).every(count => count === 9);
  }
}
```

## Solving Algorithms

### Layer-by-Layer (Beginner) Algorithm

Implementation of the standard beginner solving method:

```typescript
class LayerByLayerSolver {
  solve(state: CubeState): Move[] {
    const solution: Move[] = [];
    let currentState = state;
    
    // Step 1: White cross
    const crossMoves = this.solveWhiteCross(currentState);
    solution.push(...crossMoves);
    currentState = this.applyMoves(currentState, crossMoves);
    
    // Step 2: White corners
    const cornerMoves = this.solveWhiteCorners(currentState);
    solution.push(...cornerMoves);
    currentState = this.applyMoves(currentState, cornerMoves);
    
    // Step 3: Middle layer edges
    const middleMoves = this.solveMiddleLayer(currentState);
    solution.push(...middleMoves);
    currentState = this.applyMoves(currentState, middleMoves);
    
    // Step 4: Yellow cross
    const yellowCrossMoves = this.solveYellowCross(currentState);
    solution.push(...yellowCrossMoves);
    currentState = this.applyMoves(currentState, yellowCrossMoves);
    
    // Step 5: Yellow face
    const yellowFaceMoves = this.solveYellowFace(currentState);
    solution.push(...yellowFaceMoves);
    currentState = this.applyMoves(currentState, yellowFaceMoves);
    
    // Step 6: Permute corners
    const permuteCornerMoves = this.permuteLastLayerCorners(currentState);
    solution.push(...permuteCornerMoves);
    currentState = this.applyMoves(currentState, permuteCornerMoves);
    
    // Step 7: Permute edges
    const permuteEdgeMoves = this.permuteLastLayerEdges(currentState);
    solution.push(...permuteEdgeMoves);
    
    return this.optimizeMoveSequence(solution);
  }
  
  private solveWhiteCross(state: CubeState): Move[] {
    // Implementation of white cross algorithm
    // Returns sequence of moves to solve white cross
  }
}
```

### CFOP Algorithm Implementation

Advanced solving method (Cross, F2L, OLL, PLL):

```typescript
class CFOPSolver {
  private ollAlgorithms: Map<string, Move[]> = new Map();
  private pllAlgorithms: Map<string, Move[]> = new Map();
  
  constructor() {
    this.initializeAlgorithms();
  }
  
  solve(state: CubeState): Move[] {
    const solution: Move[] = [];
    let currentState = state;
    
    // Cross
    const crossMoves = this.solveCross(currentState);
    solution.push(...crossMoves);
    currentState = this.applyMoves(currentState, crossMoves);
    
    // F2L (First Two Layers)
    for (let i = 0; i < 4; i++) {
      const f2lMoves = this.solveF2LPair(currentState, i);
      solution.push(...f2lMoves);
      currentState = this.applyMoves(currentState, f2lMoves);
    }
    
    // OLL (Orient Last Layer)
    const ollCase = this.identifyOLLCase(currentState);
    const ollMoves = this.ollAlgorithms.get(ollCase) || [];
    solution.push(...ollMoves);
    currentState = this.applyMoves(currentState, ollMoves);
    
    // PLL (Permute Last Layer)
    const pllCase = this.identifyPLLCase(currentState);
    const pllMoves = this.pllAlgorithms.get(pllCase) || [];
    solution.push(...pllMoves);
    
    return solution;
  }
}
```

## Scrambling Algorithms

### Random State Generation

Generates truly random cube states:

```typescript
class CubeScrambler {
  /**
   * Generates a random legal cube state
   * Uses group theory to ensure all generated states are reachable
   */
  generateRandomState(): CubeState {
    // Use Kociemba's method to generate random state
    const cornerPermutation = this.generateRandomCornerPermutation();
    const cornerOrientation = this.generateRandomCornerOrientation();
    const edgePermutation = this.generateRandomEdgePermutation();
    const edgeOrientation = this.generateRandomEdgeOrientation();
    
    return this.constructStateFromComponents(
      cornerPermutation,
      cornerOrientation, 
      edgePermutation,
      edgeOrientation
    );
  }
  
  /**
   * Generates a scramble sequence (sequence of moves to randomize cube)
   * More practical than random state generation
   */
  generateScramble(length: number = 25): Move[] {
    const moves: Move[] = [];
    const faces = [Face.F, Face.B, Face.L, Face.R, Face.U, Face.D];
    const rotations = [Rotation.CLOCKWISE, Rotation.COUNTER_CLOCKWISE, Rotation.HALF_TURN];
    
    let lastFace: Face | null = null;
    let lastAxis: string | null = null;
    
    for (let i = 0; i < length; i++) {
      let face: Face;
      let attempts = 0;
      
      do {
        face = faces[Math.floor(Math.random() * faces.length)];
        attempts++;
      } while (
        attempts < 10 && (
          face === lastFace || 
          this.getAxis(face) === lastAxis
        )
      );
      
      const rotation = rotations[Math.floor(Math.random() * rotations.length)];
      
      moves.push({
        face,
        rotation,
        timestamp: Date.now()
      });
      
      lastFace = face;
      lastAxis = this.getAxis(face);
    }
    
    return moves;
  }
}
```

## Performance Optimization Algorithms

### Move Sequence Optimization

Reduces redundant moves in sequences:

```typescript
class MoveOptimizer {
  /**
   * Optimizes a sequence of moves by removing redundancies
   * Examples: F F F -> F', F F' -> (nothing), F2 F2 -> (nothing)
   */
  optimizeSequence(moves: Move[]): Move[] {
    const optimized: Move[] = [];
    let i = 0;
    
    while (i < moves.length) {
      const currentMove = moves[i];
      let combinedRotation = currentMove.rotation;
      let j = i + 1;
      
      // Combine consecutive moves on the same face
      while (j < moves.length && moves[j].face === currentMove.face) {
        combinedRotation = (combinedRotation + moves[j].rotation) % 4;
        j++;
      }
      
      // Only add move if it's not a no-op (4 quarter turns = 0)
      if (combinedRotation !== 0) {
        optimized.push({
          face: currentMove.face,
          rotation: combinedRotation as Rotation,
          timestamp: currentMove.timestamp
        });
      }
      
      i = j;
    }
    
    return optimized;
  }
  
  /**
   * Cancels opposite moves (F F' -> nothing)
   */
  cancelOpposites(moves: Move[]): Move[] {
    const result: Move[] = [];
    
    for (const move of moves) {
      const lastMove = result[result.length - 1];
      
      if (lastMove && 
          lastMove.face === move.face && 
          this.areOpposite(lastMove.rotation, move.rotation)) {
        result.pop(); // Remove the opposite move
      } else {
        result.push(move);
      }
    }
    
    return result;
  }
}
```

### Pattern Recognition Algorithms

Efficient pattern matching for algorithm lookup:

```typescript
class PatternMatcher {
  private patternDatabase: Map<string, string> = new Map();
  
  /**
   * Creates a canonical representation of a cube pattern
   * Used for fast algorithm lookup
   */
  createPattern(state: CubeState, mask: boolean[][]): string {
    const pattern: string[] = [];
    
    Object.entries(state.faces).forEach(([faceName, face], faceIndex) => {
      face.stickers.forEach((color, stickerIndex) => {
        if (mask[faceIndex][stickerIndex]) {
          pattern.push(`${faceName}${stickerIndex}:${color}`);
        }
      });
    });
    
    return pattern.sort().join('|');
  }
  
  /**
   * Finds matching algorithm for a given pattern
   * Uses symmetry reduction for faster lookup
   */
  findAlgorithm(state: CubeState, patternType: string): Move[] | null {
    const pattern = this.createPattern(state, this.getMask(patternType));
    
    // Try exact match first
    let algorithm = this.patternDatabase.get(pattern);
    if (algorithm) {
      return this.parseAlgorithm(algorithm);
    }
    
    // Try symmetrical variations
    for (const symmetry of this.getSymmetries()) {
      const transformedPattern = this.applySymmetry(pattern, symmetry);
      algorithm = this.patternDatabase.get(transformedPattern);
      if (algorithm) {
        return this.transformAlgorithm(this.parseAlgorithm(algorithm), symmetry);
      }
    }
    
    return null;
  }
}
```

## Mathematical Properties

### Group Theory Foundation

The Rubik's cube forms a group under the operation of move composition:

```typescript
class CubeGroup {
  // Total number of possible cube states: 43,252,003,274,489,856,000
  static readonly TOTAL_STATES = BigInt('43252003274489856000');
  
  // God's number: Maximum moves needed to solve any state
  static readonly GODS_NUMBER = 20;
  
  /**
   * Computes the order of a move (how many times to repeat until identity)
   */
  getMoveOrder(move: Move): number {
    switch (move.rotation) {
      case Rotation.CLOCKWISE:
      case Rotation.COUNTER_CLOCKWISE:
        return 4; // Four quarter turns return to start
      case Rotation.HALF_TURN:
        return 2; // Two half turns return to start
      default:
        return 1;
    }
  }
  
  /**
   * Computes the inverse of a move
   */
  getInverse(move: Move): Move {
    const inverseRotation = {
      [Rotation.CLOCKWISE]: Rotation.COUNTER_CLOCKWISE,
      [Rotation.COUNTER_CLOCKWISE]: Rotation.CLOCKWISE,
      [Rotation.HALF_TURN]: Rotation.HALF_TURN
    };
    
    return {
      ...move,
      rotation: inverseRotation[move.rotation]
    };
  }
}
```

### Parity and Solvability

```typescript
class ParityChecker {
  /**
   * Checks if a cube state is solvable
   * Uses mathematical constraints of the cube group
   */
  isSolvable(state: CubeState): boolean {
    // 1. Corner permutation parity must match edge permutation parity
    const cornerParity = this.getCornerPermutationParity(state);
    const edgeParity = this.getEdgePermutationParity(state);
    
    if (cornerParity !== edgeParity) {
      return false;
    }
    
    // 2. Corner orientation sum must be 0 mod 3
    const cornerOrientationSum = this.getCornerOrientationSum(state);
    if (cornerOrientationSum % 3 !== 0) {
      return false;
    }
    
    // 3. Edge orientation sum must be 0 mod 2
    const edgeOrientationSum = this.getEdgeOrientationSum(state);
    if (edgeOrientationSum % 2 !== 0) {
      return false;
    }
    
    return true;
  }
}
```

This mathematical foundation ensures the cube engine maintains valid states and provides efficient solving algorithms.