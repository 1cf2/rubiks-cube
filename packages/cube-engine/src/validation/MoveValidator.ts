import { CubeFace, RotationDirection, Move, CubeState, CubeOperationResult, CubeError, CUBE_FACES, ROTATION_DIRECTIONS } from '../types/CubeTypes';

export interface MoveValidationContext {
  readonly currentAnimations: Map<CubeFace, AnimationStatus>;
  readonly performanceThreshold: number; // milliseconds
  readonly solvabilityCheckEnabled: boolean;
}

export interface AnimationStatus {
  readonly face: CubeFace;
  readonly progress: number; // 0-1
  readonly remainingTime: number; // milliseconds
  readonly startTime: number;
}

export interface MoveValidationResult {
  readonly isValid: boolean;
  readonly error?: CubeError;
  readonly reason?: string;
  readonly suggestedDelay?: number; // milliseconds to wait before retry
}

export class MoveValidator {

  static validateMove(face: CubeFace, direction: RotationDirection, context?: MoveValidationContext): MoveValidationResult {
    // Basic face validation
    if (!CUBE_FACES.includes(face)) {
      return {
        isValid: false,
        error: CubeError.INVALID_MOVE,
        reason: 'invalid_face',
      };
    }

    // Basic direction validation
    if (!ROTATION_DIRECTIONS.includes(direction)) {
      return {
        isValid: false,
        error: CubeError.INVALID_MOVE,
        reason: 'invalid_direction',
      };
    }

    // Animation conflict check
    if (context?.currentAnimations.has(face)) {
      const animation = context.currentAnimations.get(face)!;
      return {
        isValid: false,
        error: CubeError.ANIMATION_IN_PROGRESS,
        reason: 'animation_conflict',
        suggestedDelay: animation.remainingTime,
      };
    }

    // Check for adjacent face animations that might conflict
    const conflictingAnimations = MoveValidator.checkAdjacentFaceConflicts(face, context?.currentAnimations);
    if (conflictingAnimations.length > 0) {
      const maxRemainingTime = Math.max(...conflictingAnimations.map(a => a.remainingTime));
      return {
        isValid: false,
        error: CubeError.ANIMATION_IN_PROGRESS,
        reason: 'adjacent_animation_conflict',
        suggestedDelay: maxRemainingTime,
      };
    }

    return { isValid: true };
  }

  static validateMoveSequence(moves: readonly Move[]): CubeOperationResult<boolean> {
    if (moves.length === 0) {
      return { success: true, data: true };
    }

    // Check for timing conflicts in the sequence
    for (let i = 0; i < moves.length - 1; i++) {
      const currentMove = moves[i];
      const nextMove = moves[i + 1];
      
      if (!currentMove || !nextMove) {
        continue;
      }
      
      // Check if moves are too close in time
      const timeDiff = nextMove.timestamp - currentMove.timestamp;
      if (timeDiff < currentMove.duration) {
        return {
          success: false,
          error: CubeError.INVALID_MOVE,
        };
      }

      // Check for conflicting faces
      if (MoveValidator.wouldMovesConflict(currentMove, nextMove)) {
        return {
          success: false,
          error: CubeError.INVALID_MOVE,
        };
      }
    }

    return { success: true, data: true };
  }

  static createMove(face: CubeFace, direction: RotationDirection, duration: number = 300): CubeOperationResult<Move> {
    const validation = MoveValidator.validateMove(face, direction);
    if (!validation.isValid) {
      return {
        success: false,
        error: validation.error!,
      };
    }

    const move: Move = {
      face,
      direction,
      timestamp: Date.now(),
      duration: Math.max(100, Math.min(2000, duration)), // Clamp between 100ms and 2s
    };

    return { success: true, data: move };
  }

  static checkCubeSolvability(state: CubeState): CubeOperationResult<boolean> {
    // For basic validation, we'll check if the cube has valid color distribution
    // More sophisticated solvability checking would require implementing cube solving algorithms
    
    try {
      // Basic invariant: each color should appear exactly 9 times
      const allColors: string[] = [];
      for (const face of state.faces) {
        allColors.push(...face.colors);
      }

      const colorCounts = new Map<string, number>();
      for (const color of allColors) {
        colorCounts.set(color, (colorCounts.get(color) || 0) + 1);
      }

      // Check if any color count is invalid
      for (const count of colorCounts.values()) {
        if (count !== 9) {
          return {
            success: false,
            error: CubeError.STATE_CORRUPTION,
          };
        }
      }

      // Additional checks could include:
      // - Parity validation
      // - Corner piece orientation sum
      // - Edge piece orientation sum
      // For now, we'll assume the cube is solvable if colors are distributed correctly

      return { success: true, data: true };
    } catch (error) {
      return {
        success: false,
        error: CubeError.STATE_CORRUPTION,
      };
    }
  }

  private static checkAdjacentFaceConflicts(face: CubeFace, animations?: Map<CubeFace, AnimationStatus>): AnimationStatus[] {
    if (!animations || animations.size === 0) return [];

    const adjacentFaces = MoveValidator.getAdjacentFaces(face);
    const conflicts: AnimationStatus[] = [];

    for (const adjacentFace of adjacentFaces) {
      const animation = animations.get(adjacentFace);
      if (animation && animation.progress < 0.8) { // Allow moves when animation is nearly complete
        conflicts.push(animation);
      }
    }

    return conflicts;
  }

  private static getAdjacentFaces(face: CubeFace): CubeFace[] {
    const adjacencyMap: Record<CubeFace, CubeFace[]> = {
      front: ['up', 'down', 'left', 'right'],
      back: ['up', 'down', 'left', 'right'],
      left: ['up', 'down', 'front', 'back'],
      right: ['up', 'down', 'front', 'back'],
      up: ['front', 'back', 'left', 'right'],
      down: ['front', 'back', 'left', 'right'],
    };

    return adjacencyMap[face] || [];
  }

  private static wouldMovesConflict(move1: Move, move2: Move): boolean {
    // Same face moves conflict if they overlap in time
    if (move1.face === move2.face) {
      return move2.timestamp < (move1.timestamp + move1.duration);
    }

    // Adjacent face moves may conflict depending on timing
    const adjacentFaces = MoveValidator.getAdjacentFaces(move1.face);
    if (adjacentFaces.includes(move2.face)) {
      // Allow some overlap for adjacent faces, but not complete overlap
      const overlapThreshold = Math.min(move1.duration, move2.duration) * 0.5;
      return move2.timestamp < (move1.timestamp + overlapThreshold);
    }

    return false;
  }

  static getOppositeDirection(direction: RotationDirection): RotationDirection {
    switch (direction) {
      case 'clockwise':
        return 'counterclockwise';
      case 'counterclockwise':
        return 'clockwise';
      case 'double':
        return 'double'; // Double rotation is its own opposite
      default:
        throw new Error(`Invalid rotation direction: ${direction}`);
    }
  }

  static isValidMoveString(moveString: string): boolean {
    const validMoves = /^[UDLRFB]['2]?$/;
    return validMoves.test(moveString);
  }

  static parseMoveString(moveString: string): CubeOperationResult<{ face: CubeFace; direction: RotationDirection }> {
    if (!MoveValidator.isValidMoveString(moveString)) {
      return {
        success: false,
        error: CubeError.INVALID_MOVE,
      };
    }

    const faceMap: Record<string, CubeFace> = {
      'U': 'up',
      'D': 'down',
      'L': 'left',
      'R': 'right',
      'F': 'front',
      'B': 'back',
    };

    const faceChar = moveString[0];
    const modifier = moveString.slice(1);

    if (!faceChar) {
      return {
        success: false,
        error: CubeError.INVALID_MOVE,
      };
    }
    
    const face = faceMap[faceChar];
    if (!face) {
      return {
        success: false,
        error: CubeError.INVALID_MOVE,
      };
    }

    let direction: RotationDirection;
    if (modifier === '') {
      direction = 'clockwise';
    } else if (modifier === "'") {
      direction = 'counterclockwise';
    } else if (modifier === '2') {
      direction = 'double';
    } else {
      return {
        success: false,
        error: CubeError.INVALID_MOVE,
      };
    }

    return {
      success: true,
      data: { face, direction },
    };
  }
}