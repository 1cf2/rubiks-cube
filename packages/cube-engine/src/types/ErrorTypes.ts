import { CubeError, CubeFace, RotationDirection } from './CubeTypes';

export interface CubeErrorDetails {
  readonly code: CubeError;
  readonly message: string;
  readonly context?: Record<string, unknown>;
  readonly timestamp: number;
}

export interface InvalidMoveError extends CubeErrorDetails {
  readonly code: CubeError.INVALID_MOVE;
  readonly context: {
    readonly face: CubeFace;
    readonly direction: RotationDirection;
    readonly reason: 'illegal_rotation' | 'animation_conflict' | 'invalid_face' | 'invalid_direction';
  };
}

export interface AnimationInProgressError extends CubeErrorDetails {
  readonly code: CubeError.ANIMATION_IN_PROGRESS;
  readonly context: {
    readonly currentAnimation: {
      readonly face: CubeFace;
      readonly progress: number;
      readonly remainingTime: number;
    };
  };
}

export interface StateCorruptionError extends CubeErrorDetails {
  readonly code: CubeError.STATE_CORRUPTION;
  readonly context: {
    readonly corruptionType: 'invalid_colors' | 'missing_face' | 'invalid_structure' | 'broken_invariant';
    readonly faceIndex?: number;
    readonly expectedColors?: number;
    readonly actualColors?: number;
  };
}

export interface PerformanceDegradedError extends CubeErrorDetails {
  readonly code: CubeError.PERFORMANCE_DEGRADED;
  readonly context: {
    readonly operation: string;
    readonly executionTime: number;
    readonly targetTime: number;
    readonly memoryUsage?: number;
  };
}

export interface WebGLContextLostError extends CubeErrorDetails {
  readonly code: CubeError.WEBGL_CONTEXT_LOST;
  readonly context: {
    readonly canRecover: boolean;
    readonly lostReason?: string;
  };
}

export type SpecificCubeError = 
  | InvalidMoveError
  | AnimationInProgressError
  | StateCorruptionError
  | PerformanceDegradedError
  | WebGLContextLostError;

export class CubeEngineError extends Error {
  public readonly details: CubeErrorDetails;

  constructor(details: CubeErrorDetails) {
    super(details.message);
    this.name = 'CubeEngineError';
    this.details = details;
  }

  static invalidMove(face: CubeFace, direction: RotationDirection, reason: InvalidMoveError['context']['reason']): CubeEngineError {
    return new CubeEngineError({
      code: CubeError.INVALID_MOVE,
      message: `Invalid move: ${face} ${direction} - ${reason}`,
      context: { face, direction, reason },
      timestamp: Date.now(),
    });
  }

  static animationInProgress(currentAnimation: AnimationInProgressError['context']['currentAnimation']): CubeEngineError {
    return new CubeEngineError({
      code: CubeError.ANIMATION_IN_PROGRESS,
      message: `Cannot execute move while animation in progress on face ${currentAnimation.face}`,
      context: { currentAnimation },
      timestamp: Date.now(),
    });
  }

  static stateCorruption(corruptionType: StateCorruptionError['context']['corruptionType'], additionalContext?: Partial<StateCorruptionError['context']>): CubeEngineError {
    return new CubeEngineError({
      code: CubeError.STATE_CORRUPTION,
      message: `Cube state corruption detected: ${corruptionType}`,
      context: { corruptionType, ...additionalContext },
      timestamp: Date.now(),
    });
  }

  static performanceDegraded(operation: string, executionTime: number, targetTime: number, memoryUsage?: number): CubeEngineError {
    return new CubeEngineError({
      code: CubeError.PERFORMANCE_DEGRADED,
      message: `Performance degraded in ${operation}: ${executionTime}ms > ${targetTime}ms target`,
      context: { operation, executionTime, targetTime, memoryUsage },
      timestamp: Date.now(),
    });
  }
}