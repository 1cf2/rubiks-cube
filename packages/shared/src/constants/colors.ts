/**
 * Standard Rubik's cube color definitions
 * Hex values optimized for Three.js materials
 */
export const CUBE_COLORS = {
  WHITE: 0xffffff,
  RED: 0xff0000,
  BLUE: 0x0000ff,
  ORANGE: 0xff8000,
  GREEN: 0x00ff00,
  YELLOW: 0xffff00,
} as const;

/**
 * Color mappings for each face in solved state
 */
export const SOLVED_FACE_COLORS = {
  front: CUBE_COLORS.RED,
  back: CUBE_COLORS.ORANGE,
  left: CUBE_COLORS.GREEN,
  right: CUBE_COLORS.BLUE,
  up: CUBE_COLORS.WHITE,
  down: CUBE_COLORS.YELLOW,
} as const;

/**
 * Face order for cube construction
 */
export const FACE_ORDER = ['front', 'back', 'left', 'right', 'up', 'down'] as const;