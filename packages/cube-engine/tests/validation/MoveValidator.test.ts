import { 
  MoveValidator, 
  MoveValidationContext 
} from '../../src/validation/MoveValidator';
import { 
  CubeFace, 
  RotationDirection, 
  Move, 
  CubeError,
  CUBE_FACES,
  ROTATION_DIRECTIONS 
} from '../../src/types/CubeTypes';
import { CubeStateFactory } from '../../src/core/CubeState';

describe('MoveValidator', () => {
  describe('validateMove', () => {
    it('should validate legal moves', () => {
      CUBE_FACES.forEach(face => {
        ROTATION_DIRECTIONS.forEach(direction => {
          const result = MoveValidator.validateMove(face, direction);
          expect(result.isValid).toBe(true);
          expect(result.error).toBeUndefined();
        });
      });
    });

    it('should reject invalid face', () => {
      const result = MoveValidator.validateMove('invalid' as CubeFace, 'clockwise');
      
      expect(result.isValid).toBe(false);
      expect(result.error).toBe(CubeError.INVALID_MOVE);
      expect(result.reason).toBe('invalid_face');
    });

    it('should reject invalid direction', () => {
      const result = MoveValidator.validateMove('front', 'invalid' as RotationDirection);
      
      expect(result.isValid).toBe(false);
      expect(result.error).toBe(CubeError.INVALID_MOVE);
      expect(result.reason).toBe('invalid_direction');
    });

    it('should reject move during animation', () => {
      const context: MoveValidationContext = {
        currentAnimations: new Map([
          ['front', {
            face: 'front',
            progress: 0.5,
            remainingTime: 150,
            startTime: Date.now() - 150,
          }]
        ]),
        performanceThreshold: 16,
        solvabilityCheckEnabled: true,
      };

      const result = MoveValidator.validateMove('front', 'clockwise', context);
      
      expect(result.isValid).toBe(false);
      expect(result.error).toBe(CubeError.ANIMATION_IN_PROGRESS);
      expect(result.suggestedDelay).toBe(150);
    });

    it('should reject move during adjacent face animation', () => {
      const context: MoveValidationContext = {
        currentAnimations: new Map([
          ['up', {
            face: 'up',
            progress: 0.3, // Not near completion
            remainingTime: 200,
            startTime: Date.now() - 100,
          }]
        ]),
        performanceThreshold: 16,
        solvabilityCheckEnabled: true,
      };

      // Front face is adjacent to up face
      const result = MoveValidator.validateMove('front', 'clockwise', context);
      
      expect(result.isValid).toBe(false);
      expect(result.error).toBe(CubeError.ANIMATION_IN_PROGRESS);
      expect(result.reason).toBe('adjacent_animation_conflict');
    });

    it('should allow move when adjacent animation is near completion', () => {
      const context: MoveValidationContext = {
        currentAnimations: new Map([
          ['up', {
            face: 'up',
            progress: 0.9, // Near completion
            remainingTime: 30,
            startTime: Date.now() - 270,
          }]
        ]),
        performanceThreshold: 16,
        solvabilityCheckEnabled: true,
      };

      const result = MoveValidator.validateMove('front', 'clockwise', context);
      
      expect(result.isValid).toBe(true);
    });
  });

  describe('validateMoveSequence', () => {
    it('should validate empty sequence', () => {
      const result = MoveValidator.validateMoveSequence([]);
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe(true);
      }
    });

    it('should validate non-overlapping moves', () => {
      const moves: Move[] = [
        { face: 'front', direction: 'clockwise', timestamp: 1000, duration: 300 },
        { face: 'up', direction: 'counterclockwise', timestamp: 1500, duration: 300 },
      ];

      const result = MoveValidator.validateMoveSequence(moves);
      
      expect(result.success).toBe(true);
    });

    it('should reject overlapping moves on same face', () => {
      const moves: Move[] = [
        { face: 'front', direction: 'clockwise', timestamp: 1000, duration: 300 },
        { face: 'front', direction: 'counterclockwise', timestamp: 1200, duration: 300 }, // Overlaps by 100ms
      ];

      const result = MoveValidator.validateMoveSequence(moves);
      
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe(CubeError.INVALID_MOVE);
      }
    });

    it('should allow rapid moves on different faces', () => {
      const moves: Move[] = [
        { face: 'front', direction: 'clockwise', timestamp: 1000, duration: 300 },
        { face: 'back', direction: 'counterclockwise', timestamp: 1100, duration: 300 }, // Different face
      ];

      const result = MoveValidator.validateMoveSequence(moves);
      
      expect(result.success).toBe(true);
    });
  });

  describe('createMove', () => {
    it('should create valid move', () => {
      const result = MoveValidator.createMove('front', 'clockwise', 250);
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.face).toBe('front');
        expect(result.data.direction).toBe('clockwise');
        expect(result.data.duration).toBe(250);
        expect(result.data.timestamp).toBeGreaterThan(0);
      }
    });

    it('should clamp duration to valid range', () => {
      const shortResult = MoveValidator.createMove('front', 'clockwise', 50); // Too short
      if (shortResult.success) {
        expect(shortResult.data.duration).toBe(100); // Minimum
      }

      const longResult = MoveValidator.createMove('front', 'clockwise', 5000); // Too long
      if (longResult.success) {
        expect(longResult.data.duration).toBe(2000); // Maximum
      }
    });

    it('should reject invalid move parameters', () => {
      const result = MoveValidator.createMove('invalid' as CubeFace, 'clockwise');
      
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe(CubeError.INVALID_MOVE);
      }
    });
  });

  describe('checkCubeSolvability', () => {
    it('should validate solvable cube state', () => {
      const state = CubeStateFactory.createSolvedState();
      
      const result = MoveValidator.checkCubeSolvability(state);
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe(true);
      }
    });

    it('should detect invalid color distribution', () => {
      const state = CubeStateFactory.createSolvedState();
      
      // Create state with invalid color distribution
      const invalidState = {
        ...state,
        faces: state.faces.map((face, index) => {
          if (index === 0) {
            // Give front face 10 green colors (impossible)
            return {
              ...face,
              colors: [...face.colors, 'green' as any] as any
            };
          }
          return face;
        }) as any
      };

      const result = MoveValidator.checkCubeSolvability(invalidState);
      
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe(CubeError.STATE_CORRUPTION);
      }
    });
  });

  describe('getOppositeDirection', () => {
    it('should return correct opposite directions', () => {
      expect(MoveValidator.getOppositeDirection('clockwise')).toBe('counterclockwise');
      expect(MoveValidator.getOppositeDirection('counterclockwise')).toBe('clockwise');
      expect(MoveValidator.getOppositeDirection('double')).toBe('double');
    });

    it('should throw error for invalid direction', () => {
      expect(() => {
        MoveValidator.getOppositeDirection('invalid' as RotationDirection);
      }).toThrow();
    });
  });

  describe('isValidMoveString', () => {
    it('should validate standard move strings', () => {
      const validMoves = ['U', 'D', 'L', 'R', 'F', 'B', "U'", "D'", "L'", "R'", "F'", "B'", 'U2', 'D2', 'L2', 'R2', 'F2', 'B2'];
      
      validMoves.forEach(move => {
        expect(MoveValidator.isValidMoveString(move)).toBe(true);
      });
    });

    it('should reject invalid move strings', () => {
      const invalidMoves = ['X', 'U3', 'UU', 'u', '2U', 'U"', ''];
      
      invalidMoves.forEach(move => {
        expect(MoveValidator.isValidMoveString(move)).toBe(false);
      });
    });
  });

  describe('parseMoveString', () => {
    it('should parse standard moves correctly', () => {
      const testCases = [
        { input: 'U', expected: { face: 'up', direction: 'clockwise' } },
        { input: "U'", expected: { face: 'up', direction: 'counterclockwise' } },
        { input: 'U2', expected: { face: 'up', direction: 'double' } },
        { input: 'R', expected: { face: 'right', direction: 'clockwise' } },
        { input: 'F', expected: { face: 'front', direction: 'clockwise' } },
      ];

      testCases.forEach(({ input, expected }) => {
        const result = MoveValidator.parseMoveString(input);
        
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data).toEqual(expected);
        }
      });
    });

    it('should reject invalid move strings', () => {
      const invalidMoves = ['X', 'U3', 'invalid'];
      
      invalidMoves.forEach(move => {
        const result = MoveValidator.parseMoveString(move);
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error).toBe(CubeError.INVALID_MOVE);
        }
      });
    });
  });

  describe('Performance Requirements', () => {
    it('should validate moves in under 2ms', () => {
      const start = performance.now();
      
      for (let i = 0; i < 1000; i++) {
        MoveValidator.validateMove('front', 'clockwise');
      }
      
      const end = performance.now();
      const avgTime = (end - start) / 1000;
      
      expect(avgTime).toBeLessThan(2);
    });

    it('should handle rapid move sequences efficiently', () => {
      const moves: Move[] = [];
      for (let i = 0; i < 100; i++) {
        const face = CUBE_FACES[i % 6];
        const direction = ROTATION_DIRECTIONS[i % 3];
        if (face && direction) {
          moves.push({
            face,
            direction,
            timestamp: i * 400,
            duration: 300,
          });
        }
      }

      const start = performance.now();
      MoveValidator.validateMoveSequence(moves);
      const end = performance.now();
      
      expect(end - start).toBeLessThan(16);
    });
  });

  describe('Edge Cases', () => {
    it('should handle move validation with no context', () => {
      const result = MoveValidator.validateMove('front', 'clockwise');
      expect(result.isValid).toBe(true);
    });

    it('should handle empty animation map', () => {
      const context: MoveValidationContext = {
        currentAnimations: new Map(),
        performanceThreshold: 16,
        solvabilityCheckEnabled: true,
      };

      const result = MoveValidator.validateMove('front', 'clockwise', context);
      expect(result.isValid).toBe(true);
    });

    it('should handle move sequence with single move', () => {
      const moves: Move[] = [
        { face: 'front', direction: 'clockwise', timestamp: 1000, duration: 300 }
      ];

      const result = MoveValidator.validateMoveSequence(moves);
      expect(result.success).toBe(true);
    });

    it('should handle concurrent moves on opposite faces', () => {
      const moves: Move[] = [
        { face: 'front', direction: 'clockwise', timestamp: 1000, duration: 300 },
        { face: 'back', direction: 'counterclockwise', timestamp: 1000, duration: 300 }, // Same time, opposite faces
      ];

      const result = MoveValidator.validateMoveSequence(moves);
      expect(result.success).toBe(true);
    });
  });
});