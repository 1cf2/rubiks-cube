import { CubeColor, FacePosition, CubeError } from '../src/types';

describe('Shared Types', () => {
  describe('CubeColor', () => {
    test('should have correct color values', () => {
      expect(CubeColor.WHITE).toBe('white');
      expect(CubeColor.YELLOW).toBe('yellow');
      expect(CubeColor.RED).toBe('red');
      expect(CubeColor.ORANGE).toBe('orange');
      expect(CubeColor.BLUE).toBe('blue');
      expect(CubeColor.GREEN).toBe('green');
    });
  });

  describe('FacePosition', () => {
    test('should have correct position values', () => {
      expect(FacePosition.FRONT).toBe('front');
      expect(FacePosition.BACK).toBe('back');
      expect(FacePosition.LEFT).toBe('left');
      expect(FacePosition.RIGHT).toBe('right');
      expect(FacePosition.UP).toBe('up');
      expect(FacePosition.DOWN).toBe('down');
    });
  });

  describe('CubeError', () => {
    test('should have correct error values', () => {
      expect(CubeError.INVALID_MOVE).toBe('INVALID_MOVE');
      expect(CubeError.ANIMATION_IN_PROGRESS).toBe('ANIMATION_IN_PROGRESS');
      expect(CubeError.WEBGL_CONTEXT_LOST).toBe('WEBGL_CONTEXT_LOST');
      expect(CubeError.PERFORMANCE_DEGRADED).toBe('PERFORMANCE_DEGRADED');
      expect(CubeError.INVALID_STATE).toBe('INVALID_STATE');
      expect(CubeError.NETWORK_ERROR).toBe('NETWORK_ERROR');
    });
  });
});
