import { CubeColor } from '@rubiks-cube/shared/types/cube';
import { CubeState, FaceState, CubeFace, CubeOperationResult, CubeError, CUBE_FACES } from '../types/CubeTypes';

export interface StateValidationResult {
  readonly isValid: boolean;
  readonly errors: StateValidationError[];
  readonly warnings: StateValidationWarning[];
}

export interface StateValidationError {
  readonly type: 'critical' | 'structural' | 'logical';
  readonly code: string;
  readonly message: string;
  readonly faceIndex?: number;
  readonly position?: [number, number];
}

export interface StateValidationWarning {
  readonly type: 'performance' | 'consistency' | 'optimization';
  readonly code: string;
  readonly message: string;
  readonly impact: 'low' | 'medium' | 'high';
}

export class StateValidator {
  private static readonly EXPECTED_COLOR_COUNT = 9;
  private static readonly FACE_COUNT = 6;

  static validateState(state: CubeState): StateValidationResult {
    const errors: StateValidationError[] = [];
    const warnings: StateValidationWarning[] = [];

    // Structural validation
    StateValidator.validateStructure(state, errors);
    
    // Color distribution validation
    StateValidator.validateColorDistribution(state, errors);
    
    // Face integrity validation
    StateValidator.validateFaces(state, errors, warnings);
    
    // Move history validation
    StateValidator.validateMoveHistory(state, errors);
    
    // Timestamp validation
    StateValidator.validateTimestamps(state, warnings);

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  static validateFaceIntegrity(face: FaceState): CubeOperationResult<boolean> {
    try {
      // Check face type
      if (!CUBE_FACES.includes(face.face)) {
        return {
          success: false,
          error: CubeError.INVALID_FACE_STATE,
        };
      }

      // Check color array length
      if (face.colors.length !== 9) {
        return {
          success: false,
          error: CubeError.INVALID_FACE_STATE,
        };
      }

      // Check if all colors are valid CubeColor enum values
      const validColors = Object.values(CubeColor);
      for (const color of face.colors) {
        if (!validColors.includes(color)) {
          return {
            success: false,
            error: CubeError.INVALID_FACE_STATE,
          };
        }
      }

      // Check rotation value
      if (typeof face.rotation !== 'number' || !isFinite(face.rotation)) {
        return {
          success: false,
          error: CubeError.INVALID_FACE_STATE,
        };
      }

      return { success: true, data: true };
    } catch (error) {
      return {
        success: false,
        error: CubeError.STATE_CORRUPTION,
      };
    }
  }

  static checkCubeSolvability(state: CubeState): CubeOperationResult<boolean> {
    // Basic solvability checks - a complete implementation would require 
    // sophisticated cube theory validation including:
    // - Corner orientation parity
    // - Edge orientation parity  
    // - Corner permutation parity
    // - Edge permutation parity
    
    try {
      // Check 1: Color count validation
      const colorValidation = StateValidator.validateColorCounts(state);
      if (!colorValidation.success) {
        return colorValidation;
      }

      // Check 2: Corner piece validation (simplified)
      // In a real implementation, we'd track corner pieces and their orientations
      
      // Check 3: Edge piece validation (simplified)
      // In a real implementation, we'd track edge pieces and their orientations

      // For now, if color distribution is correct, assume solvable
      return { success: true, data: true };
    } catch (error) {
      return {
        success: false,
        error: CubeError.STATE_CORRUPTION,
      };
    }
  }

  static detectStateCorruption(state: CubeState): StateValidationError[] {
    const errors: StateValidationError[] = [];

    try {
      // Check for null/undefined faces
      if (!state.faces || !Array.isArray(state.faces)) {
        errors.push({
          type: 'critical',
          code: 'NULL_FACES',
          message: 'Faces array is null or not an array',
        });
        return errors;
      }

      // Check face count
      if (state.faces.length !== StateValidator.FACE_COUNT) {
        errors.push({
          type: 'structural',
          code: 'INVALID_FACE_COUNT',
          message: `Expected ${StateValidator.FACE_COUNT} faces, found ${state.faces.length}`,
        });
      }

      // Check each face for corruption
      state.faces.forEach((face, index) => {
        if (!face) {
          errors.push({
            type: 'critical',
            code: 'NULL_FACE',
            message: `Face at index ${index} is null or undefined`,
            faceIndex: index,
          });
          return;
        }

        // Check face properties
        if (!face.face || !CUBE_FACES.includes(face.face)) {
          errors.push({
            type: 'structural',
            code: 'INVALID_FACE_TYPE',
            message: `Invalid face type: ${face.face}`,
            faceIndex: index,
          });
        }

        if (!face.colors || !Array.isArray(face.colors)) {
          errors.push({
            type: 'critical',
            code: 'NULL_COLORS',
            message: `Colors array is null or not an array for face ${face.face}`,
            faceIndex: index,
          });
          return;
        }

        if (face.colors.length !== 9) {
          errors.push({
            type: 'structural',
            code: 'INVALID_COLOR_COUNT',
            message: `Expected 9 colors, found ${face.colors.length} for face ${face.face}`,
            faceIndex: index,
          });
        }

        // Check individual color validity
        face.colors.forEach((color, colorIndex) => {
          if (!Object.values(CubeColor).includes(color)) {
            const row = Math.floor(colorIndex / 3);
            const col = colorIndex % 3;
            errors.push({
              type: 'logical',
              code: 'INVALID_COLOR',
              message: `Invalid color '${color}' at position (${row}, ${col}) on face ${face.face}`,
              faceIndex: index,
              position: [row, col] as [number, number],
            });
          }
        });
      });

      // Check for duplicate faces
      const faceTypes = state.faces.map(f => f?.face).filter(Boolean);
      const uniqueFaces = new Set(faceTypes);
      if (uniqueFaces.size !== faceTypes.length) {
        errors.push({
          type: 'structural',
          code: 'DUPLICATE_FACES',
          message: 'Duplicate face types detected',
        });
      }

      // Check for missing faces
      const missingFaces = CUBE_FACES.filter(face => !uniqueFaces.has(face));
      if (missingFaces.length > 0) {
        errors.push({
          type: 'structural',
          code: 'MISSING_FACES',
          message: `Missing faces: ${missingFaces.join(', ')}`,
        });
      }

    } catch (error) {
      errors.push({
        type: 'critical',
        code: 'VALIDATION_ERROR',
        message: `Error during corruption detection: ${error instanceof Error ? error.message : 'Unknown error'}`,
      });
    }

    return errors;
  }

  private static validateStructure(state: CubeState, errors: StateValidationError[]): void {
    // Face array validation
    if (!state.faces || !Array.isArray(state.faces)) {
      errors.push({
        type: 'critical',
        code: 'INVALID_FACES_ARRAY',
        message: 'Faces must be an array',
      });
      return;
    }

    if (state.faces.length !== StateValidator.FACE_COUNT) {
      errors.push({
        type: 'structural',
        code: 'WRONG_FACE_COUNT',
        message: `Expected ${StateValidator.FACE_COUNT} faces, got ${state.faces.length}`,
      });
    }

    // Move history validation
    if (!Array.isArray(state.moveHistory)) {
      errors.push({
        type: 'structural',
        code: 'INVALID_MOVE_HISTORY',
        message: 'Move history must be an array',
      });
    }
  }

  private static validateColorDistribution(state: CubeState, errors: StateValidationError[]): void {
    const colorCounts = new Map<CubeColor, number>();

    // Count all colors
    for (const face of state.faces) {
      if (!face?.colors) continue;
      
      for (const color of face.colors) {
        colorCounts.set(color, (colorCounts.get(color) || 0) + 1);
      }
    }

    // Check each color has exactly 9 occurrences
    const expectedColors = Object.values(CubeColor);
    for (const expectedColor of expectedColors) {
      const count = colorCounts.get(expectedColor) || 0;
      if (count !== StateValidator.EXPECTED_COLOR_COUNT) {
        errors.push({
          type: 'logical',
          code: 'WRONG_COLOR_COUNT',
          message: `Color ${expectedColor} appears ${count} times, expected ${StateValidator.EXPECTED_COLOR_COUNT}`,
        });
      }
    }

    // Check for unexpected colors
    for (const [color, count] of colorCounts) {
      if (!expectedColors.includes(color)) {
        errors.push({
          type: 'logical',
          code: 'UNEXPECTED_COLOR',
          message: `Unexpected color: ${color} (appears ${count} times)`,
        });
      }
    }
  }

  private static validateFaces(state: CubeState, errors: StateValidationError[], warnings: StateValidationWarning[]): void {
    const faceTypes = new Set<CubeFace>();

    state.faces.forEach((face, index) => {
      if (!face) return;

      // Check for duplicate face types
      if (faceTypes.has(face.face)) {
        errors.push({
          type: 'structural',
          code: 'DUPLICATE_FACE_TYPE',
          message: `Duplicate face type: ${face.face}`,
          faceIndex: index,
        });
      }
      faceTypes.add(face.face);

      // Validate individual face
      const faceValidation = StateValidator.validateFaceIntegrity(face);
      if (!faceValidation.success) {
        errors.push({
          type: 'structural',
          code: 'INVALID_FACE',
          message: `Face ${face.face} is invalid`,
          faceIndex: index,
        });
      }

      // Check rotation bounds (warn if extreme values)
      if (Math.abs(face.rotation) > Math.PI * 4) {
        warnings.push({
          type: 'consistency',
          code: 'EXTREME_ROTATION',
          message: `Face ${face.face} has extreme rotation value: ${face.rotation}`,
          impact: 'medium',
        });
      }
    });

    // Check for missing face types
    for (const expectedFace of CUBE_FACES) {
      if (!faceTypes.has(expectedFace)) {
        errors.push({
          type: 'structural',
          code: 'MISSING_FACE_TYPE',
          message: `Missing face type: ${expectedFace}`,
        });
      }
    }
  }

  private static validateMoveHistory(state: CubeState, errors: StateValidationError[]): void {
    if (!state.moveHistory) return;

    // Check move sequence timing
    for (let i = 1; i < state.moveHistory.length; i++) {
      const prevMove = state.moveHistory[i - 1];
      const currentMove = state.moveHistory[i];

      if (!prevMove || !currentMove) continue;

      if (currentMove.timestamp < prevMove.timestamp) {
        errors.push({
          type: 'logical',
          code: 'OUT_OF_ORDER_MOVES',
          message: `Move at index ${i} has earlier timestamp than previous move`,
        });
      }
    }
  }

  private static validateTimestamps(state: CubeState, warnings: StateValidationWarning[]): void {
    const now = Date.now();
    
    // Check if state timestamp is in future
    if (state.timestamp > now + 1000) { // Allow 1 second clock skew
      warnings.push({
        type: 'consistency',
        code: 'FUTURE_TIMESTAMP',
        message: 'State timestamp is in the future',
        impact: 'low',
      });
    }

    // Check if state timestamp is very old
    const oneHourAgo = now - (60 * 60 * 1000);
    if (state.timestamp < oneHourAgo) {
      warnings.push({
        type: 'consistency',
        code: 'OLD_TIMESTAMP',
        message: 'State timestamp is more than 1 hour old',
        impact: 'low',
      });
    }
  }

  private static validateColorCounts(state: CubeState): CubeOperationResult<boolean> {
    const colorCounts = new Map<CubeColor, number>();

    for (const face of state.faces) {
      for (const color of face.colors) {
        colorCounts.set(color, (colorCounts.get(color) || 0) + 1);
      }
    }

    for (const expectedColor of Object.values(CubeColor)) {
      const count = colorCounts.get(expectedColor) || 0;
      if (count !== StateValidator.EXPECTED_COLOR_COUNT) {
        return {
          success: false,
          error: CubeError.STATE_CORRUPTION,
        };
      }
    }

    return { success: true, data: true };
  }
}