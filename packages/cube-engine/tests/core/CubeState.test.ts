import { CubeColor } from '@rubiks-cube/shared/types/cube';
import { 
  CubeStateFactory, 
  CubeStateOperations, 
  CubeStateUtils 
} from '../../src/core/CubeState';
import { 
  CubeFace, 
  CubeState, 
  STANDARD_SOLVED_STATE, 
  CUBE_FACES 
} from '../../src/types/CubeTypes';
import { CubeEngineError } from '../../src/types/ErrorTypes';

describe('CubeStateFactory', () => {
  describe('createFaceState', () => {
    it('should create a face state with default colors', () => {
      const face = CubeStateFactory.createFaceState('front');
      
      expect(face.face).toBe('front');
      expect(face.colors).toHaveLength(9);
      expect(face.colors.every(color => color === CubeColor.GREEN)).toBe(true);
      expect(face.rotation).toBe(0);
    });

    it('should create a face state with custom colors', () => {
      const customColors = new Array(9).fill(CubeColor.RED);
      const face = CubeStateFactory.createFaceState('back', customColors, Math.PI / 2);
      
      expect(face.face).toBe('back');
      expect(face.colors).toEqual(customColors);
      expect(face.rotation).toBe(Math.PI / 2);
    });

    it('should throw error for invalid color count', () => {
      const invalidColors = [CubeColor.RED, CubeColor.BLUE]; // Only 2 colors
      
      expect(() => {
        CubeStateFactory.createFaceState('front', invalidColors);
      }).toThrow(CubeEngineError);
    });
  });

  describe('createSolvedState', () => {
    it('should create a solved cube state', () => {
      const state = CubeStateFactory.createSolvedState();
      
      expect(state.faces).toHaveLength(6);
      expect(state.moveHistory).toHaveLength(0);
      expect(state.isScrambled).toBe(false);
      expect(state.isSolved).toBe(true);
      expect(state.timestamp).toBeGreaterThan(0);
      
      // Check each face has correct colors
      state.faces.forEach(face => {
        const expectedColor = STANDARD_SOLVED_STATE[face.face];
        expect(face.colors.every(color => color === expectedColor)).toBe(true);
      });
    });

    it('should create immutable state', () => {
      const state = CubeStateFactory.createSolvedState();
      
      // Attempting to modify should not affect the original
      expect(() => {
        (state.faces as any).push('invalid');
      }).toThrow();
      
      expect(() => {
        (state.moveHistory as any).push('invalid');
      }).toThrow();
    });
  });

  describe('createState', () => {
    it('should create state from valid faces', () => {
      const faces = CUBE_FACES.map(face => 
        CubeStateFactory.createFaceState(face)
      );
      
      const result = CubeStateFactory.createState(faces);
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.faces).toHaveLength(6);
        expect(result.data.isSolved).toBe(true);
      }
    });

    it('should reject invalid face count', () => {
      const faces = [CubeStateFactory.createFaceState('front')]; // Only 1 face
      
      const result = CubeStateFactory.createState(faces);
      
      expect(result.success).toBe(false);
    });

    it('should reject duplicate face types', () => {
      const faces = [
        CubeStateFactory.createFaceState('front'),
        CubeStateFactory.createFaceState('front'), // Duplicate
        CubeStateFactory.createFaceState('back'),
        CubeStateFactory.createFaceState('left'),
        CubeStateFactory.createFaceState('right'),
        CubeStateFactory.createFaceState('up'),
      ];
      
      const result = CubeStateFactory.createState(faces);
      
      expect(result.success).toBe(false);
    });
  });
});

describe('CubeStateOperations', () => {
  let solvedState: CubeState;

  beforeEach(() => {
    solvedState = CubeStateFactory.createSolvedState();
  });

  describe('updateFaceState', () => {
    it('should update face state correctly', () => {
      const newFaceState = CubeStateFactory.createFaceState('front', 
        new Array(9).fill(CubeColor.RED)
      );
      
      const result = CubeStateOperations.updateFaceState(solvedState, 0, newFaceState);
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.faces[0].colors.every(c => c === CubeColor.RED)).toBe(true);
        expect(result.data.timestamp).toBeGreaterThan(solvedState.timestamp);
      }
    });

    it('should reject invalid face index', () => {
      const newFaceState = CubeStateFactory.createFaceState('front');
      
      const result = CubeStateOperations.updateFaceState(solvedState, 10, newFaceState);
      
      expect(result.success).toBe(false);
    });
  });

  describe('checkIfSolved', () => {
    it('should return true for solved state', () => {
      const isSolved = CubeStateOperations.checkIfSolved(solvedState.faces);
      expect(isSolved).toBe(true);
    });

    it('should return false for scrambled state', () => {
      const scrambledFaces = solvedState.faces.map((face, index) => {
        if (index === 0) {
          // Scramble the front face
          return CubeStateFactory.createFaceState(face.face, 
            [CubeColor.RED, CubeColor.BLUE, CubeColor.GREEN, 
             CubeColor.WHITE, CubeColor.YELLOW, CubeColor.ORANGE,
             CubeColor.RED, CubeColor.BLUE, CubeColor.GREEN]
          );
        }
        return face;
      });
      
      const isSolved = CubeStateOperations.checkIfSolved(scrambledFaces);
      expect(isSolved).toBe(false);
    });
  });

  describe('validateState', () => {
    it('should validate correct state', () => {
      const result = CubeStateOperations.validateState(solvedState);
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe(true);
      }
    });

    it('should reject state with wrong face count', () => {
      const invalidState = {
        ...solvedState,
        faces: solvedState.faces.slice(0, 5) as any, // Only 5 faces
      };
      
      const result = CubeStateOperations.validateState(invalidState);
      
      expect(result.success).toBe(false);
    });

    it('should reject state with invalid color count', () => {
      expect(() => {
        CubeStateFactory.createFaceState('front', [CubeColor.RED, CubeColor.BLUE]);
      }).toThrow();
    });
  });

  describe('isEqual', () => {
    it('should return true for identical states', () => {
      const state2 = CubeStateFactory.createSolvedState();
      
      // Note: timestamps will be different, so we need to normalize
      const normalizedState1 = { ...solvedState, timestamp: 12345 };
      const normalizedState2 = { ...state2, timestamp: 12345 };
      
      const isEqual = CubeStateOperations.isEqual(normalizedState1, normalizedState2);
      expect(isEqual).toBe(true);
    });

    it('should return false for different states', () => {
      const scrambledFace = CubeStateFactory.createFaceState('front',
        new Array(9).fill(CubeColor.RED)
      );
      
      const result = CubeStateOperations.updateFaceState(solvedState, 0, scrambledFace);
      if (!result.success) throw new Error('Failed to update face state');
      const scrambledState = result.data;
      
      const isEqual = CubeStateOperations.isEqual(solvedState, scrambledState);
      expect(isEqual).toBe(false);
    });
  });

  describe('clone', () => {
    it('should create independent copy', () => {
      const cloned = CubeStateOperations.clone(solvedState);
      
      expect(cloned).not.toBe(solvedState);
      expect(cloned.faces).not.toBe(solvedState.faces);
      expect(cloned.moveHistory).not.toBe(solvedState.moveHistory);
      expect(cloned.timestamp).toBeGreaterThan(solvedState.timestamp);
    });

    it('should preserve state content', () => {
      const cloned = CubeStateOperations.clone(solvedState);
      
      // Normalize timestamps for comparison
      const normalizedOriginal = { ...solvedState, timestamp: 0 };
      const normalizedCloned = { ...cloned, timestamp: 0 };
      
      expect(CubeStateOperations.isEqual(normalizedOriginal, normalizedCloned)).toBe(true);
    });
  });

  describe('rotateFace90Clockwise', () => {
    it('should rotate 3x3 grid correctly', () => {
      const colors = [
        CubeColor.RED, CubeColor.GREEN, CubeColor.BLUE,
        CubeColor.WHITE, CubeColor.YELLOW, CubeColor.ORANGE,
        CubeColor.RED, CubeColor.GREEN, CubeColor.BLUE
      ];
      
      const rotated = CubeStateOperations.rotateFace90Clockwise(colors);
      
      // Check specific positions after 90° clockwise rotation
      expect(rotated[0]).toBe(colors[6]); // Bottom-left -> Top-left
      expect(rotated[2]).toBe(colors[0]); // Top-left -> Top-right
      expect(rotated[8]).toBe(colors[2]); // Top-right -> Bottom-right
      expect(rotated[6]).toBe(colors[8]); // Bottom-right -> Bottom-left
    });

    it('should throw error for invalid color count', () => {
      const invalidColors = [CubeColor.RED, CubeColor.BLUE]; // Only 2 colors
      
      expect(() => {
        CubeStateOperations.rotateFace90Clockwise(invalidColors);
      }).toThrow(CubeEngineError);
    });
  });

  describe('rotateFace90Counterclockwise', () => {
    it('should rotate 3x3 grid correctly', () => {
      const colors = [
        CubeColor.RED, CubeColor.GREEN, CubeColor.BLUE,
        CubeColor.WHITE, CubeColor.YELLOW, CubeColor.ORANGE,
        CubeColor.RED, CubeColor.GREEN, CubeColor.BLUE
      ];
      
      const rotated = CubeStateOperations.rotateFace90Counterclockwise(colors);
      
      // Check specific positions after 90° counterclockwise rotation
      expect(rotated[0]).toBe(colors[2]); // Top-right -> Top-left
      expect(rotated[2]).toBe(colors[8]); // Bottom-right -> Top-right
      expect(rotated[8]).toBe(colors[6]); // Bottom-left -> Bottom-right
      expect(rotated[6]).toBe(colors[0]); // Top-left -> Bottom-left
    });
  });

  describe('rotateFace180', () => {
    it('should rotate 3x3 grid 180 degrees', () => {
      const colors = [
        CubeColor.RED, CubeColor.GREEN, CubeColor.BLUE,
        CubeColor.WHITE, CubeColor.YELLOW, CubeColor.ORANGE,
        CubeColor.RED, CubeColor.GREEN, CubeColor.BLUE
      ];
      
      const rotated = CubeStateOperations.rotateFace180(colors);
      
      // After 180° rotation, position [i] should be at position [8-i]
      expect(rotated[0]).toBe(colors[8]);
      expect(rotated[1]).toBe(colors[7]);
      expect(rotated[4]).toBe(colors[4]); // Center stays the same
      expect(rotated[8]).toBe(colors[0]);
    });
  });
});

describe('CubeStateUtils', () => {
  let state: CubeState;

  beforeEach(() => {
    state = CubeStateFactory.createSolvedState();
  });

  describe('getFaceByType', () => {
    it('should find face by type', () => {
      const frontFace = CubeStateUtils.getFaceByType(state, 'front');
      
      expect(frontFace).toBeDefined();
      expect(frontFace?.face).toBe('front');
    });

    it('should return undefined for non-existent face', () => {
      // Remove a face to test
      const invalidState = {
        ...state,
        faces: state.faces.slice(0, 5) as any
      };
      
      const missingFace = CubeStateUtils.getFaceByType(invalidState, 'down');
      expect(missingFace).toBeUndefined();
    });
  });

  describe('getColorAt', () => {
    it('should get color at specific position', () => {
      const frontFace = CubeStateUtils.getFaceByType(state, 'front')!;
      const color = CubeStateUtils.getColorAt(frontFace, 1, 1); // Center
      
      expect(color).toBe(CubeColor.GREEN);
    });

    it('should throw error for invalid position', () => {
      const frontFace = CubeStateUtils.getFaceByType(state, 'front')!;
      
      expect(() => {
        CubeStateUtils.getColorAt(frontFace, 5, 5); // Out of bounds
      }).toThrow();
    });
  });

  describe('setColorAt', () => {
    it('should set color at specific position', () => {
      const frontFace = CubeStateUtils.getFaceByType(state, 'front')!;
      const updatedFace = CubeStateUtils.setColorAt(frontFace, 0, 0, CubeColor.RED);
      
      expect(CubeStateUtils.getColorAt(updatedFace, 0, 0)).toBe(CubeColor.RED);
      expect(CubeStateUtils.getColorAt(updatedFace, 1, 1)).toBe(CubeColor.GREEN); // Others unchanged
    });

    it('should not mutate original face', () => {
      const frontFace = CubeStateUtils.getFaceByType(state, 'front')!;
      const originalColor = CubeStateUtils.getColorAt(frontFace, 0, 0);
      
      CubeStateUtils.setColorAt(frontFace, 0, 0, CubeColor.RED);
      
      expect(CubeStateUtils.getColorAt(frontFace, 0, 0)).toBe(originalColor);
    });
  });

  describe('getMoveCount', () => {
    it('should return correct move count', () => {
      expect(CubeStateUtils.getMoveCount(state)).toBe(0);
      
      // Add moves to history (simplified)
      const stateWithMoves = {
        ...state,
        moveHistory: [
          { face: 'front' as CubeFace, direction: 'clockwise' as const, timestamp: Date.now(), duration: 300 },
          { face: 'up' as CubeFace, direction: 'counterclockwise' as const, timestamp: Date.now(), duration: 300 }
        ]
      };
      
      expect(CubeStateUtils.getMoveCount(stateWithMoves)).toBe(2);
    });
  });

  describe('getLastMove', () => {
    it('should return last move', () => {
      const move = { face: 'front' as CubeFace, direction: 'clockwise' as const, timestamp: Date.now(), duration: 300 };
      const stateWithMove = {
        ...state,
        moveHistory: [move]
      };
      
      expect(CubeStateUtils.getLastMove(stateWithMove)).toBe(move);
    });

    it('should return undefined for empty history', () => {
      expect(CubeStateUtils.getLastMove(state)).toBeUndefined();
    });
  });
});

describe('Performance Requirements', () => {
  it('should create state in under 16ms', () => {
    const start = performance.now();
    
    for (let i = 0; i < 100; i++) {
      CubeStateFactory.createSolvedState();
    }
    
    const end = performance.now();
    const avgTime = (end - start) / 100;
    
    expect(avgTime).toBeLessThan(16);
  });

  it('should validate state in under 16ms', () => {
    const state = CubeStateFactory.createSolvedState();
    const start = performance.now();
    
    for (let i = 0; i < 100; i++) {
      CubeStateOperations.validateState(state);
    }
    
    const end = performance.now();
    const avgTime = (end - start) / 100;
    
    expect(avgTime).toBeLessThan(16);
  });

  it('should clone state in under 16ms', () => {
    const state = CubeStateFactory.createSolvedState();
    const start = performance.now();
    
    for (let i = 0; i < 100; i++) {
      CubeStateOperations.clone(state);
    }
    
    const end = performance.now();
    const avgTime = (end - start) / 100;
    
    expect(avgTime).toBeLessThan(16);
  });
});