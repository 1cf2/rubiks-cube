/**
 * Color enum for cube faces
 */
export enum CubeColor {
  WHITE = 'white',
  YELLOW = 'yellow',
  RED = 'red',
  ORANGE = 'orange',
  BLUE = 'blue',
  GREEN = 'green',
}

/**
 * Face position on the cube
 */
export enum FacePosition {
  FRONT = 'front',
  BACK = 'back',
  LEFT = 'left',
  RIGHT = 'right',
  UP = 'up',
  DOWN = 'down',
}

/**
 * Individual cube sticker/square state
 */
export interface StickerState {
  readonly color: CubeColor;
  readonly position: readonly [number, number]; // [row, col] 0-2
}

/**
 * Face state with immutable sticker array
 */
export interface FaceState {
  readonly position: FacePosition;
  readonly stickers: ReadonlyArray<ReadonlyArray<StickerState>>; // 3x3 grid
}

/**
 * Complete cube state with immutable operations
 */
export interface CubeState {
  readonly faces: ReadonlyArray<FaceState>;
  readonly isValid: boolean;
  readonly moveCount: number;
  readonly timestamp: number;
}

/**
 * Move notation for cube operations
 */
export type Move =
  | 'U'
  | "U'"
  | 'U2' // Up face
  | 'D'
  | "D'"
  | 'D2' // Down face
  | 'R'
  | "R'"
  | 'R2' // Right face
  | 'L'
  | "L'"
  | 'L2' // Left face
  | 'F'
  | "F'"
  | 'F2' // Front face
  | 'B'
  | "B'"
  | 'B2'; // Back face

/**
 * Sequence of moves
 */
export type MoveSequence = ReadonlyArray<Move>;

/**
 * Animation state for smooth transitions
 */
export interface AnimationState {
  readonly isAnimating: boolean;
  readonly currentMove: Move | null;
  readonly progress: number; // 0-1
  readonly duration: number; // milliseconds
}
