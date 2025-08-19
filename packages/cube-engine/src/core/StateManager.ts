import { CubeState, CubeFace, Move, RotationDirection, CubeOperationResult, CubeError, STANDARD_SOLVED_STATE } from '../types/CubeTypes';
import { CubeStateFactory, CubeStateOperations, CubeStateUtils } from './CubeState';
import { StateValidator, StateValidationResult } from '../validation/StateValidator';
import { MoveValidator, MoveValidationContext } from '../validation/MoveValidator';
import { CubeEngineError } from '../types/ErrorTypes';

export interface StateComparisonResult {
  readonly isEqual: boolean;
  readonly differences: StateDifference[];
  readonly similarity: number; // 0-1 score
}

export interface StateDifference {
  readonly type: 'face_rotation' | 'color_mismatch' | 'move_history' | 'metadata';
  readonly faceIndex?: number;
  readonly position?: [number, number];
  readonly expected: unknown;
  readonly actual: unknown;
}

export interface SolvedStateAnalysis {
  readonly isSolved: boolean;
  readonly completedFaces: CubeFace[];
  readonly incorrectStickers: number;
  readonly solvedPercentage: number;
}

export interface StateRecoveryResult {
  readonly canRecover: boolean;
  readonly recoveredState?: CubeState;
  readonly recoverySteps: string[];
  readonly errors: string[];
}

export class StateManager {
  private static readonly PERFORMANCE_THRESHOLD_MS = 16;
  private validationContext?: MoveValidationContext;

  constructor(validationContext?: MoveValidationContext) {
    if (validationContext) {
      this.validationContext = validationContext;
    }
  }

  // State Equality Checking
  compareStates(state1: CubeState, state2: CubeState): StateComparisonResult {
    const startTime = performance.now();
    const differences: StateDifference[] = [];
    let matchingStickers = 0;
    const totalStickers = 54;

    try {
      // Compare faces
      if (state1.faces.length !== state2.faces.length) {
        differences.push({
          type: 'metadata',
          expected: state1.faces.length,
          actual: state2.faces.length,
        });
      } else {
        for (let faceIndex = 0; faceIndex < state1.faces.length; faceIndex++) {
          const face1 = state1.faces[faceIndex];
          const face2 = state2.faces[faceIndex];

          if (!face1 || !face2) continue;

          // Compare face types
          if (face1.face !== face2.face) {
            differences.push({
              type: 'metadata',
              faceIndex,
              expected: face1.face,
              actual: face2.face,
            });
          }

          // Compare rotations
          if (Math.abs(face1.rotation - face2.rotation) > 0.001) {
            differences.push({
              type: 'face_rotation',
              faceIndex,
              expected: face1.rotation,
              actual: face2.rotation,
            });
          }

          // Compare colors
          for (let i = 0; i < face1.colors.length; i++) {
            const row = Math.floor(i / 3);
            const col = i % 3;
            
            if (face1.colors[i] === face2.colors[i]) {
              matchingStickers++;
            } else {
              differences.push({
                type: 'color_mismatch',
                faceIndex,
                position: [row, col] as [number, number],
                expected: face1.colors[i],
                actual: face2.colors[i],
              });
            }
          }
        }
      }

      // Compare move history lengths
      if (state1.moveHistory.length !== state2.moveHistory.length) {
        differences.push({
          type: 'move_history',
          expected: state1.moveHistory.length,
          actual: state2.moveHistory.length,
        });
      }

      const executionTime = performance.now() - startTime;
      if (executionTime > StateManager.PERFORMANCE_THRESHOLD_MS) {
        console.warn(`State comparison took ${executionTime.toFixed(2)}ms, exceeding ${StateManager.PERFORMANCE_THRESHOLD_MS}ms threshold`);
      }

      return {
        isEqual: differences.length === 0,
        differences,
        similarity: matchingStickers / totalStickers,
      };
    } catch (error) {
      throw CubeEngineError.stateCorruption('broken_invariant', {
        actualColors: 0,
        expectedColors: 54,
      });
    }
  }

  // Solved State Detection
  analyzeSolvedState(state: CubeState): SolvedStateAnalysis {
    const startTime = performance.now();
    
    try {
      const completedFaces: CubeFace[] = [];
      let correctStickers = 0;
      const totalStickers = 54;

      for (const face of state.faces) {
        const expectedColor = STANDARD_SOLVED_STATE[face.face];
        let faceCorrectStickers = 0;

        for (const color of face.colors) {
          if (color === expectedColor) {
            faceCorrectStickers++;
            correctStickers++;
          }
        }

        // A face is complete if all 9 stickers match the expected color
        if (faceCorrectStickers === 9) {
          completedFaces.push(face.face);
        }
      }

      const executionTime = performance.now() - startTime;
      if (executionTime > StateManager.PERFORMANCE_THRESHOLD_MS) {
        console.warn(`Solved state analysis took ${executionTime.toFixed(2)}ms, exceeding ${StateManager.PERFORMANCE_THRESHOLD_MS}ms threshold`);
      }

      return {
        isSolved: completedFaces.length === 6,
        completedFaces,
        incorrectStickers: totalStickers - correctStickers,
        solvedPercentage: (correctStickers / totalStickers) * 100,
      };
    } catch (error) {
      throw CubeEngineError.stateCorruption('broken_invariant', {
        actualColors: 0,
        expectedColors: 54,
      });
    }
  }

  // Comprehensive state validation
  validateState(state: CubeState): StateValidationResult {
    const startTime = performance.now();
    
    try {
      const result = StateValidator.validateState(state);
      
      const executionTime = performance.now() - startTime;
      if (executionTime > StateManager.PERFORMANCE_THRESHOLD_MS) {
        console.warn(`State validation took ${executionTime.toFixed(2)}ms, exceeding ${StateManager.PERFORMANCE_THRESHOLD_MS}ms threshold`);
      }

      return result;
    } catch (error) {
      throw CubeEngineError.stateCorruption('broken_invariant', {
        actualColors: 0,
        expectedColors: 54,
      });
    }
  }

  // State corruption detection and recovery
  detectAndRecoverCorruption(state: CubeState): StateRecoveryResult {
    const startTime = performance.now();
    
    try {
      const corruptionErrors = StateValidator.detectStateCorruption(state);
      const recoverySteps: string[] = [];
      const errors: string[] = [];
      
      if (corruptionErrors.length === 0) {
        return {
          canRecover: true,
          recoveredState: state,
          recoverySteps: ['No corruption detected'],
          errors: [],
        };
      }

      // Attempt recovery based on error types
      let recoveredState = CubeStateOperations.clone(state);
      let canRecover = true;

      for (const error of corruptionErrors) {
        switch (error.code) {
          case 'INVALID_COLOR_COUNT':
          case 'WRONG_COLOR_COUNT':
            // Attempt to redistribute colors properly
            const redistributionResult = this.attemptColorRedistribution();
            if (redistributionResult.success) {
              recoveredState = redistributionResult.data;
              recoverySteps.push(`Fixed color distribution for ${error.message}`);
            } else {
              canRecover = false;
              errors.push(`Cannot fix color distribution: ${error.message}`);
            }
            break;

          case 'MISSING_FACE_TYPE':
          case 'DUPLICATE_FACE_TYPE':
            // Attempt to fix face structure
            const faceFixResult = this.attemptFaceStructureFix();
            if (faceFixResult.success) {
              recoveredState = faceFixResult.data;
              recoverySteps.push(`Fixed face structure: ${error.message}`);
            } else {
              canRecover = false;
              errors.push(`Cannot fix face structure: ${error.message}`);
            }
            break;

          case 'INVALID_COLOR':
            // Replace invalid colors with valid ones
            if (error.faceIndex !== undefined && error.position) {
              const faceIndex = error.faceIndex;
              const [row, col] = error.position;
              const face = recoveredState.faces[faceIndex];
              
              if (!face) continue;
              
              const expectedColor = STANDARD_SOLVED_STATE[face.face];
              if (!expectedColor) continue;
              
              const newFace = CubeStateUtils.setColorAt(
                face,
                row,
                col,
                expectedColor
              );
              
              const updateResult = CubeStateOperations.updateFaceState(recoveredState, faceIndex, newFace);
              if (updateResult.success) {
                recoveredState = updateResult.data;
                recoverySteps.push(`Fixed invalid color at face ${faceIndex}, position (${row}, ${col})`);
              } else {
                canRecover = false;
                errors.push(`Cannot fix invalid color: ${error.message}`);
              }
            }
            break;

          default:
            canRecover = false;
            errors.push(`Cannot recover from error: ${error.message}`);
        }
      }

      const executionTime = performance.now() - startTime;
      if (executionTime > StateManager.PERFORMANCE_THRESHOLD_MS) {
        console.warn(`Corruption recovery took ${executionTime.toFixed(2)}ms, exceeding ${StateManager.PERFORMANCE_THRESHOLD_MS}ms threshold`);
      }

      if (canRecover) {
        return {
          canRecover: true,
          recoveredState,
          recoverySteps,
          errors,
        };
      } else {
        return {
          canRecover: false,
          recoverySteps,
          errors,
        };
      }
    } catch (error) {
      return {
        canRecover: false,
        recoverySteps: [],
        errors: [`Recovery failed: ${error instanceof Error ? error.message : 'Unknown error'}`],
      };
    }
  }

  // Execute move with validation
  executeMove(state: CubeState, face: CubeFace, direction: RotationDirection, duration: number = 300): CubeOperationResult<CubeState> {
    const startTime = performance.now();
    
    try {
      // Validate the move
      const moveValidation = MoveValidator.validateMove(face, direction, this.validationContext);
      if (!moveValidation.isValid) {
        return {
          success: false,
          error: moveValidation.error!,
        };
      }

      // Create the move
      const moveResult = MoveValidator.createMove(face, direction, duration);
      if (!moveResult.success) {
        return {
          success: false,
          error: moveResult.error,
        };
      }

      const move = moveResult.data;

      // Apply the move to the state (basic implementation)
      // In a full implementation, this would include the actual cube rotation logic
      const newState = this.applyMoveToState(state, move);
      
      const executionTime = performance.now() - startTime;
      if (executionTime > StateManager.PERFORMANCE_THRESHOLD_MS) {
        console.warn(`Move execution took ${executionTime.toFixed(2)}ms, exceeding ${StateManager.PERFORMANCE_THRESHOLD_MS}ms threshold`);
      }

      return { success: true, data: newState };
    } catch (error) {
      return {
        success: false,
        error: CubeError.STATE_CORRUPTION,
      };
    }
  }

  private attemptColorRedistribution(): CubeOperationResult<CubeState> {
    // Simplified color redistribution - in practice this would be much more complex
    try {
      const solvedState = CubeStateFactory.createSolvedState();
      return { success: true, data: solvedState };
    } catch (error) {
      return {
        success: false,
        error: CubeError.STATE_CORRUPTION,
      };
    }
  }

  private attemptFaceStructureFix(): CubeOperationResult<CubeState> {
    // Simplified face structure fix
    try {
      const solvedState = CubeStateFactory.createSolvedState();
      return { success: true, data: solvedState };
    } catch (error) {
      return {
        success: false,
        error: CubeError.STATE_CORRUPTION,
      };
    }
  }

  private applyMoveToState(state: CubeState, move: Move): CubeState {
    // Basic move application - in a full implementation, this would contain
    // the actual 3D cube rotation algorithms
    const newMoveHistory = [...state.moveHistory, move];
    
    // For now, just update move history and timestamp
    // Real implementation would rotate the cube faces according to the move
    return {
      ...state,
      moveHistory: newMoveHistory,
      isScrambled: newMoveHistory.length > 0,
      timestamp: Date.now(),
    };
  }

  // Utility methods for quick state checks
  isStateSolved(state: CubeState): boolean {
    return CubeStateOperations.checkIfSolved(state.faces);
  }

  getStateChecksum(state: CubeState): string {
    // Create a simple checksum for state comparison
    const colorString = state.faces
      .map(face => face.colors.join(''))
      .join('');
    
    // Simple hash function (in production, use a proper hash algorithm)
    let hash = 0;
    for (let i = 0; i < colorString.length; i++) {
      const char = colorString.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    
    return hash.toString(16);
  }

  getStateStatistics(state: CubeState) {
    const analysis = this.analyzeSolvedState(state);
    
    return {
      moveCount: state.moveHistory.length,
      solvedPercentage: analysis.solvedPercentage,
      completedFaces: analysis.completedFaces.length,
      incorrectStickers: analysis.incorrectStickers,
      lastMoveTimestamp: CubeStateUtils.getLastMove(state)?.timestamp,
      stateAge: Date.now() - state.timestamp,
    };
  }
}