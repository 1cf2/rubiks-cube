import { CubeColor } from '@rubiks-cube/shared/types/cube';
import { CubeFace, FaceState, CubeState, Move, STANDARD_SOLVED_STATE, CUBE_FACES, CubeOperationResult, CubeError } from '../types/CubeTypes';
import { CubeEngineError } from '../types/ErrorTypes';

export class CubeStateFactory {
  static createFaceState(face: CubeFace, colors?: readonly CubeColor[], rotation: number = 0): FaceState {
    const defaultColor = STANDARD_SOLVED_STATE[face];
    const faceColors = colors || new Array(9).fill(defaultColor);
    
    if (faceColors.length !== 9) {
      throw CubeEngineError.stateCorruption('invalid_colors', {
        expectedColors: 9,
        actualColors: faceColors.length,
      });
    }

    return {
      face,
      colors: faceColors,
      rotation,
    };
  }

  static createSolvedState(): CubeState {
    const timestamp = Date.now();
    const faces: readonly [FaceState, FaceState, FaceState, FaceState, FaceState, FaceState] = [
      CubeStateFactory.createFaceState('front'),
      CubeStateFactory.createFaceState('back'),
      CubeStateFactory.createFaceState('left'),
      CubeStateFactory.createFaceState('right'),
      CubeStateFactory.createFaceState('up'),
      CubeStateFactory.createFaceState('down'),
    ];

    return {
      faces,
      moveHistory: [],
      isScrambled: false,
      isSolved: true,
      timestamp,
    };
  }

  static createState(faces: readonly FaceState[], moveHistory: readonly Move[] = [], timestamp?: number): CubeOperationResult<CubeState> {
    if (faces.length !== 6) {
      return {
        success: false,
        error: CubeError.INVALID_FACE_STATE,
      };
    }

    const faceSet = new Set(faces.map(f => f.face));
    if (faceSet.size !== 6 || !CUBE_FACES.every(face => faceSet.has(face))) {
      return {
        success: false,
        error: CubeError.INVALID_FACE_STATE,
      };
    }

    const orderedFaces: readonly [FaceState, FaceState, FaceState, FaceState, FaceState, FaceState] = [
      faces.find(f => f.face === 'front')!,
      faces.find(f => f.face === 'back')!,
      faces.find(f => f.face === 'left')!,
      faces.find(f => f.face === 'right')!,
      faces.find(f => f.face === 'up')!,
      faces.find(f => f.face === 'down')!,
    ];

    const state: CubeState = {
      faces: orderedFaces,
      moveHistory,
      isScrambled: moveHistory.length > 0,
      isSolved: CubeStateOperations.checkIfSolved(orderedFaces),
      timestamp: timestamp ?? Date.now(),
    };

    return { success: true, data: state };
  }
}

export class CubeStateOperations {
  static updateFaceState(state: CubeState, faceIndex: number, newFaceState: FaceState): CubeOperationResult<CubeState> {
    if (faceIndex < 0 || faceIndex >= 6) {
      return {
        success: false,
        error: CubeError.INVALID_FACE_STATE,
      };
    }

    const newFaces = [...state.faces] as [FaceState, FaceState, FaceState, FaceState, FaceState, FaceState];
    newFaces[faceIndex] = newFaceState;

    return CubeStateFactory.createState(newFaces, state.moveHistory, Date.now());
  }

  static addMove(state: CubeState, move: Move): CubeOperationResult<CubeState> {
    const newMoveHistory = [...state.moveHistory, move];
    
    return CubeStateFactory.createState(
      state.faces,
      newMoveHistory,
      Date.now()
    );
  }

  static checkIfSolved(faces: readonly FaceState[]): boolean {
    return faces.every(face => {
      const expectedColor = STANDARD_SOLVED_STATE[face.face];
      return face.colors.every(color => color === expectedColor);
    });
  }

  static validateState(state: CubeState): CubeOperationResult<boolean> {
    // Check face count
    if (state.faces.length !== 6) {
      return {
        success: false,
        error: CubeError.STATE_CORRUPTION,
      };
    }

    // Check each face has 9 colors
    for (const face of state.faces) {
      if (face.colors.length !== 9) {
        return {
          success: false,
          error: CubeError.STATE_CORRUPTION,
        };
      }
    }

    // Check all face types are present and unique
    const faceTypes = state.faces.map(f => f.face);
    const uniqueFaces = new Set(faceTypes);
    if (uniqueFaces.size !== 6 || !CUBE_FACES.every(face => uniqueFaces.has(face))) {
      return {
        success: false,
        error: CubeError.STATE_CORRUPTION,
      };
    }

    // Color count validation (54 total, 9 per color)
    const allColors: CubeColor[] = [];
    for (const face of state.faces) {
      allColors.push(...face.colors);
    }

    const colorCounts = new Map<CubeColor, number>();
    for (const color of allColors) {
      colorCounts.set(color, (colorCounts.get(color) || 0) + 1);
    }

    const expectedColors = Object.values(CubeColor);
    for (const color of expectedColors) {
      if (colorCounts.get(color) !== 9) {
        return {
          success: false,
          error: CubeError.STATE_CORRUPTION,
        };
      }
    }

    return { success: true, data: true };
  }

  static isEqual(state1: CubeState, state2: CubeState): boolean {
    if (state1.faces.length !== state2.faces.length) return false;

    for (let i = 0; i < state1.faces.length; i++) {
      const face1 = state1.faces[i];
      const face2 = state2.faces[i];
      
      if (!face1 || !face2) return false;
      if (face1.face !== face2.face) return false;
      if (face1.rotation !== face2.rotation) return false;
      if (face1.colors.length !== face2.colors.length) return false;
      
      for (let j = 0; j < face1.colors.length; j++) {
        if (face1.colors[j] !== face2.colors[j]) return false;
      }
    }

    return true;
  }

  static clone(state: CubeState): CubeState {
    const newFaces = state.faces.map(face => ({
      face: face.face,
      colors: [...face.colors],
      rotation: face.rotation,
    }));
    
    if (newFaces.length !== 6) {
      throw new Error('Invalid face count during cloning');
    }
    
    return {
      faces: newFaces as unknown as readonly [FaceState, FaceState, FaceState, FaceState, FaceState, FaceState],
      moveHistory: [...state.moveHistory],
      isScrambled: state.isScrambled,
      isSolved: state.isSolved,
      timestamp: Date.now(),
    };
  }

  static rotateFace90Clockwise(colors: readonly CubeColor[]): readonly CubeColor[] {
    if (colors.length !== 9) {
      throw CubeEngineError.stateCorruption('invalid_colors', {
        expectedColors: 9,
        actualColors: colors.length,
      });
    }

    // Rotate 3x3 grid 90 degrees clockwise
    // Original:  0 1 2    Rotated:  6 3 0
    //            3 4 5              7 4 1
    //            6 7 8              8 5 2
    return [
      colors[6]!, colors[3]!, colors[0]!,
      colors[7]!, colors[4]!, colors[1]!,
      colors[8]!, colors[5]!, colors[2]!,
    ];
  }

  static rotateFace90Counterclockwise(colors: readonly CubeColor[]): readonly CubeColor[] {
    if (colors.length !== 9) {
      throw CubeEngineError.stateCorruption('invalid_colors', {
        expectedColors: 9,
        actualColors: colors.length,
      });
    }

    // Rotate 3x3 grid 90 degrees counterclockwise  
    // Original:  0 1 2    Rotated:  2 5 8
    //            3 4 5              1 4 7
    //            6 7 8              0 3 6
    return [
      colors[2]!, colors[5]!, colors[8]!,
      colors[1]!, colors[4]!, colors[7]!,
      colors[0]!, colors[3]!, colors[6]!,
    ];
  }

  static rotateFace180(colors: readonly CubeColor[]): readonly CubeColor[] {
    if (colors.length !== 9) {
      throw CubeEngineError.stateCorruption('invalid_colors', {
        expectedColors: 9,
        actualColors: colors.length,
      });
    }

    // Rotate 3x3 grid 180 degrees
    // Original:  0 1 2    Rotated:  8 7 6
    //            3 4 5              5 4 3
    //            6 7 8              2 1 0
    return [
      colors[8]!, colors[7]!, colors[6]!,
      colors[5]!, colors[4]!, colors[3]!,
      colors[2]!, colors[1]!, colors[0]!,
    ];
  }
}

export class CubeStateUtils {
  static getFaceByType(state: CubeState, faceType: CubeFace): FaceState | undefined {
    return state.faces.find(face => face.face === faceType);
  }

  static getFaceIndex(state: CubeState, faceType: CubeFace): number {
    return state.faces.findIndex(face => face.face === faceType);
  }

  static getColorAt(face: FaceState, row: number, col: number): CubeColor {
    if (row < 0 || row > 2 || col < 0 || col > 2) {
      throw new Error(`Invalid position: (${row}, ${col}). Must be 0-2.`);
    }
    const color = face.colors[row * 3 + col];
    if (!color) {
      throw new Error(`Color not found at position (${row}, ${col})`);
    }
    return color;
  }

  static setColorAt(face: FaceState, row: number, col: number, color: CubeColor): FaceState {
    if (row < 0 || row > 2 || col < 0 || col > 2) {
      throw new Error(`Invalid position: (${row}, ${col}). Must be 0-2.`);
    }
    
    const newColors = [...face.colors];
    newColors[row * 3 + col] = color;
    
    return {
      ...face,
      colors: newColors,
    };
  }

  static getMoveCount(state: CubeState): number {
    return state.moveHistory.length;
  }

  static getLastMove(state: CubeState): Move | undefined {
    return state.moveHistory[state.moveHistory.length - 1];
  }
}