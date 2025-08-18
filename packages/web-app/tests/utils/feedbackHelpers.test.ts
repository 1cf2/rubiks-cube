import { 
  isFaceSelectable,
  createSelectionFeedback,
  getSelectabilityFeedback,
  updateFaceSelectability,
  FEEDBACK_COLOR_SCHEME,
  FEEDBACK_TIMING
} from '../../src/utils/feedbackHelpers';
import { FacePosition, AnimationQueue } from '@rubiks-cube/shared/types';

describe('feedbackHelpers', () => {
  describe('isFaceSelectable', () => {
    it('should return true for selectable faces by default', () => {
      const result = isFaceSelectable(FacePosition.FRONT);
      expect(result).toBe(true);
    });

    it('should return false when face is currently animating', () => {
      const result = isFaceSelectable(FacePosition.FRONT, {
        currentlyAnimating: [FacePosition.FRONT],
      });
      expect(result).toBe(false);
    });

    it('should return false when animation queue is blocked', () => {
      const animationQueue: AnimationQueue = {
        current: null,
        pending: [],
        isBlocked: true,
        maxConcurrent: 1,
      };
      
      const result = isFaceSelectable(FacePosition.FRONT, {
        animationQueue,
      });
      expect(result).toBe(false);
    });

    it('should return false when concurrent animations are not allowed and something is animating', () => {
      const result = isFaceSelectable(FacePosition.FRONT, {
        currentlyAnimating: [FacePosition.BACK],
        allowConcurrentAnimations: false,
      });
      expect(result).toBe(false);
    });

    it('should return true when concurrent animations are allowed and something is animating', () => {
      const result = isFaceSelectable(FacePosition.FRONT, {
        currentlyAnimating: [FacePosition.BACK],
        allowConcurrentAnimations: true,
      });
      expect(result).toBe(true);
    });
  });

  describe('createSelectionFeedback', () => {
    it('should create hover feedback with correct properties', () => {
      const feedback = createSelectionFeedback(FacePosition.FRONT, 'hover');
      
      expect(feedback).toEqual({
        face: FacePosition.FRONT,
        state: 'hover',
        opacity: 0.2,
        color: FEEDBACK_COLOR_SCHEME.hover,
        emissiveIntensity: 0,
        pulse: false,
        intensity: 1,
      });
    });

    it('should create selected feedback with correct properties', () => {
      const feedback = createSelectionFeedback(FacePosition.BACK, 'selected');
      
      expect(feedback).toEqual({
        face: FacePosition.BACK,
        state: 'selected',
        opacity: 0.4,
        color: FEEDBACK_COLOR_SCHEME.selected,
        emissiveIntensity: 0.1,
        pulse: false,
        intensity: 1,
      });
    });

    it('should create blocked feedback with correct properties', () => {
      const feedback = createSelectionFeedback(FacePosition.LEFT, 'blocked');
      
      expect(feedback).toEqual({
        face: FacePosition.LEFT,
        state: 'blocked',
        opacity: 0.15,
        color: FEEDBACK_COLOR_SCHEME.blocked,
        emissiveIntensity: 0,
        pulse: false,
        intensity: 1,
      });
    });

    it('should apply custom intensity multiplier', () => {
      const feedback = createSelectionFeedback(FacePosition.RIGHT, 'success', {
        intensity: 1.5,
      });
      
      expect(feedback.opacity).toBe(0.4 * 1.5); // Base success opacity * intensity
      expect(feedback.emissiveIntensity).toBe(0.1 * 1.5);
      expect(feedback.intensity).toBe(1.5);
    });

    it('should override with custom color and opacity', () => {
      const customColor: [number, number, number] = [0.5, 0.5, 0.5];
      const customOpacity = 0.8;
      
      const feedback = createSelectionFeedback(FacePosition.UP, 'hover', {
        customColor,
        customOpacity,
      });
      
      expect(feedback.color).toEqual(customColor);
      expect(feedback.opacity).toBe(customOpacity);
    });

    it('should enable pulse for rotating and success states', () => {
      const rotatingFeedback = createSelectionFeedback(FacePosition.DOWN, 'rotating');
      const successFeedback = createSelectionFeedback(FacePosition.FRONT, 'success');
      const hoverFeedback = createSelectionFeedback(FacePosition.BACK, 'hover');
      
      expect(rotatingFeedback.pulse).toBe(true);
      expect(successFeedback.pulse).toBe(true);
      expect(hoverFeedback.pulse).toBe(false);
    });
  });

  describe('getSelectabilityFeedback', () => {
    it('should return blocked feedback for non-selectable faces', () => {
      const feedback = getSelectabilityFeedback(FacePosition.FRONT, {
        currentlyAnimating: [FacePosition.FRONT],
      });
      
      expect(feedback.state).toBe('blocked');
      expect(feedback.face).toBe(FacePosition.FRONT);
    });

    it('should return normal feedback for selectable faces', () => {
      const feedback = getSelectabilityFeedback(FacePosition.FRONT);
      
      expect(feedback.state).toBe('normal');
      expect(feedback.face).toBe(FacePosition.FRONT);
    });
  });

  describe('updateFaceSelectability', () => {
    const allFaces = [
      FacePosition.FRONT,
      FacePosition.BACK,
      FacePosition.LEFT,
      FacePosition.RIGHT,
      FacePosition.UP,
      FacePosition.DOWN,
    ];

    it('should return empty map when all faces are selectable', () => {
      const feedbackMap = updateFaceSelectability(allFaces);
      
      expect(feedbackMap.size).toBe(0);
    });

    it('should return blocked feedback for non-selectable faces only', () => {
      const feedbackMap = updateFaceSelectability(allFaces, {
        currentlyAnimating: [FacePosition.FRONT, FacePosition.BACK],
        allowConcurrentAnimations: true, // Allow concurrent so only specific faces are blocked
      });
      
      expect(feedbackMap.size).toBe(2);
      expect(feedbackMap.get(FacePosition.FRONT)?.state).toBe('blocked');
      expect(feedbackMap.get(FacePosition.BACK)?.state).toBe('blocked');
      expect(feedbackMap.has(FacePosition.LEFT)).toBe(false);
    });

    it('should block all faces when concurrent animations are not allowed', () => {
      const feedbackMap = updateFaceSelectability(allFaces, {
        currentlyAnimating: [FacePosition.FRONT],
        allowConcurrentAnimations: false, // Default behavior - blocks all when any is animating
      });
      
      expect(feedbackMap.size).toBe(6); // All faces should be blocked
    });

    it('should handle empty face array', () => {
      const feedbackMap = updateFaceSelectability([]);
      
      expect(feedbackMap.size).toBe(0);
    });
  });

  describe('FEEDBACK_COLOR_SCHEME', () => {
    it('should contain all required feedback states', () => {
      expect(FEEDBACK_COLOR_SCHEME.hover).toEqual([0.3, 0.7, 1.0]);
      expect(FEEDBACK_COLOR_SCHEME.selected).toEqual([1.0, 0.6, 0.1]);
      expect(FEEDBACK_COLOR_SCHEME.rotating).toEqual([1.0, 0.2, 0.2]);
      expect(FEEDBACK_COLOR_SCHEME.blocked).toEqual([1.0, 0.3, 0.3]);
      expect(FEEDBACK_COLOR_SCHEME.preview).toEqual([0.8, 0.8, 1.0]);
      expect(FEEDBACK_COLOR_SCHEME.success).toEqual([0.2, 1.0, 0.3]);
      expect(FEEDBACK_COLOR_SCHEME.normal).toEqual([1.0, 1.0, 1.0]);
    });

    it('should have colors in RGB format (0-1)', () => {
      Object.values(FEEDBACK_COLOR_SCHEME).forEach(color => {
        expect(color).toHaveLength(3);
        color.forEach(channel => {
          expect(channel).toBeGreaterThanOrEqual(0);
          expect(channel).toBeLessThanOrEqual(1);
        });
      });
    });
  });

  describe('FEEDBACK_TIMING', () => {
    it('should contain all required timing values', () => {
      expect(FEEDBACK_TIMING.quick).toBe(100);
      expect(FEEDBACK_TIMING.normal).toBe(200);
      expect(FEEDBACK_TIMING.slow).toBe(300);
      expect(FEEDBACK_TIMING.success).toBe(300);
      expect(FEEDBACK_TIMING.pulse).toBe(150);
    });

    it('should have reasonable timing values in milliseconds', () => {
      Object.values(FEEDBACK_TIMING).forEach(timing => {
        expect(timing).toBeGreaterThan(0);
        expect(timing).toBeLessThanOrEqual(1000); // Max 1 second
      });
    });
  });
});