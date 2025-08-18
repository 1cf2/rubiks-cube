import { AnimationStateManager } from '../../src/state/AnimationStateManager';
import { FacePosition, RotationDirection } from '@rubiks-cube/shared/types';

// Mock setTimeout and clearTimeout
jest.useFakeTimers();

describe('AnimationStateManager', () => {
  let manager: AnimationStateManager;
  let mockOnAnimationStart: jest.Mock;
  let mockOnAnimationComplete: jest.Mock;
  let mockOnAnimationError: jest.Mock;
  let mockOnQueueChange: jest.Mock;

  beforeEach(() => {
    mockOnAnimationStart = jest.fn();
    mockOnAnimationComplete = jest.fn();
    mockOnAnimationError = jest.fn();
    mockOnQueueChange = jest.fn();

    manager = new AnimationStateManager({
      maxConcurrent: 1,
      maxQueueSize: 5,
      onAnimationStart: mockOnAnimationStart,
      onAnimationComplete: mockOnAnimationComplete,
      onAnimationError: mockOnAnimationError,
      onQueueChange: mockOnQueueChange,
    });

    jest.clearAllMocks();
  });

  afterEach(() => {
    manager.dispose();
  });

  describe('enqueueAnimation', () => {
    it('should successfully enqueue and start animation', () => {
      const result = manager.enqueueAnimation(
        FacePosition.FRONT,
        RotationDirection.CLOCKWISE,
        'F',
        300
      );

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBeDefined();
      }
      expect(mockOnAnimationStart).toHaveBeenCalledWith(
        expect.objectContaining({
          face: FacePosition.FRONT,
          direction: RotationDirection.CLOCKWISE,
          move: 'F',
          duration: 300,
        })
      );
      expect(mockOnQueueChange).toHaveBeenCalled();
    });

    it('should queue animation when another is active', () => {
      // Start first animation
      manager.enqueueAnimation(FacePosition.FRONT, RotationDirection.CLOCKWISE, 'F');
      
      // Enqueue second animation
      const result = manager.enqueueAnimation(
        FacePosition.BACK,
        RotationDirection.COUNTERCLOCKWISE,
        "B'",
        250
      );

      expect(result.success).toBe(true);
      expect(manager.getPendingCount()).toBe(1);
    });

    it('should reject animation for same face', () => {
      // Start first animation on front face
      manager.enqueueAnimation(FacePosition.FRONT, RotationDirection.CLOCKWISE, 'F');
      
      // Try to enqueue another animation on same face
      const result = manager.enqueueAnimation(
        FacePosition.FRONT,
        RotationDirection.COUNTERCLOCKWISE,
        "F'"
      );

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe('ANIMATION_IN_PROGRESS');
      }
    });

    it('should reject animation when queue is full', () => {
      // Fill the queue
      for (let i = 0; i < 6; i++) {
        const face = Object.values(FacePosition)[i % 6];
        if (face) {
          manager.enqueueAnimation(face, RotationDirection.CLOCKWISE, 'F');
        }
      }

      // Try to add one more
      const result = manager.enqueueAnimation(
        FacePosition.UP,
        RotationDirection.CLOCKWISE,
        'U'
      );

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe('ANIMATION_IN_PROGRESS');
        expect(result.message).toContain('queue is full');
      }
    });
  });

  describe('completeAnimation', () => {
    it('should complete active animation and start next', () => {
      // Start first animation
      const result1 = manager.enqueueAnimation(FacePosition.FRONT, RotationDirection.CLOCKWISE, 'F');
      if (!result1.success) throw new Error('Failed to enqueue animation');
      const animationId = result1.data;

      // Queue second animation
      manager.enqueueAnimation(FacePosition.BACK, RotationDirection.CLOCKWISE, 'B');

      // Complete first animation
      const completeResult = manager.completeAnimation(animationId);

      expect(completeResult.success).toBe(true);
      expect(mockOnAnimationComplete).toHaveBeenCalled();
      expect(manager.getPendingCount()).toBeLessThanOrEqual(1); // Second animation should now be active
    });

    it('should handle completing non-existent animation', () => {
      const result = manager.completeAnimation('non-existent-id');

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe('INVALID_MOVE');
      }
    });

    it('should auto-complete animation after timeout', () => {
      manager.enqueueAnimation(
        FacePosition.FRONT,
        RotationDirection.CLOCKWISE,
        'F',
        100
      );

      // Fast forward time
      jest.advanceTimersByTime(100);

      expect(mockOnAnimationComplete).toHaveBeenCalled();
    });
  });

  describe('cancelAnimation', () => {
    it('should cancel active animation', () => {
      const result = manager.enqueueAnimation(FacePosition.FRONT, RotationDirection.CLOCKWISE, 'F');
      if (!result.success) throw new Error('Failed to enqueue animation');
      const animationId = result.data;

      const cancelResult = manager.cancelAnimation(animationId);

      expect(cancelResult.success).toBe(true);
      expect(mockOnAnimationError).toHaveBeenCalled();
    });

    it('should cancel queued animation', () => {
      // Start first animation
      manager.enqueueAnimation(FacePosition.FRONT, RotationDirection.CLOCKWISE, 'F');
      
      // Queue second animation
      const result = manager.enqueueAnimation(FacePosition.BACK, RotationDirection.CLOCKWISE, 'B');
      if (!result.success) throw new Error('Failed to enqueue animation');
      const queuedAnimationId = result.data;

      // Cancel queued animation
      const cancelResult = manager.cancelAnimation(queuedAnimationId);

      expect(cancelResult.success).toBe(true);
      expect(manager.getPendingCount()).toBe(0);
    });

    it('should handle cancelling non-existent animation', () => {
      const result = manager.cancelAnimation('non-existent-id');

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe('INVALID_MOVE');
      }
    });
  });

  describe('clearAllAnimations', () => {
    it('should clear all animations', () => {
      // Add multiple animations
      manager.enqueueAnimation(FacePosition.FRONT, RotationDirection.CLOCKWISE, 'F');
      manager.enqueueAnimation(FacePosition.BACK, RotationDirection.CLOCKWISE, 'B');
      manager.enqueueAnimation(FacePosition.LEFT, RotationDirection.CLOCKWISE, 'L');

      manager.clearAllAnimations();

      expect(manager.hasAnimations()).toBe(false);
      expect(manager.getPendingCount()).toBe(0);
    });
  });

  describe('blocking and unblocking', () => {
    it('should block animations', () => {
      manager.block();

      const result = manager.enqueueAnimation(FacePosition.FRONT, RotationDirection.CLOCKWISE, 'F');

      expect(result.success).toBe(true);
      expect(mockOnAnimationStart).not.toHaveBeenCalled(); // Should not start while blocked
    });

    it('should unblock and process queue', () => {
      manager.block();
      manager.enqueueAnimation(FacePosition.FRONT, RotationDirection.CLOCKWISE, 'F');

      manager.unblock();

      expect(mockOnAnimationStart).toHaveBeenCalled();
    });
  });

  describe('queue state queries', () => {
    it('should return correct queue state', () => {
      manager.enqueueAnimation(FacePosition.FRONT, RotationDirection.CLOCKWISE, 'F');
      manager.enqueueAnimation(FacePosition.BACK, RotationDirection.CLOCKWISE, 'B');

      const state = manager.getQueueState();

      expect(state.current).toBeDefined();
      expect(state.pending.length).toBe(1);
      expect(state.maxConcurrent).toBe(1);
      expect(state.isBlocked).toBe(false);
    });

    it('should check if face is animating', () => {
      manager.enqueueAnimation(FacePosition.FRONT, RotationDirection.CLOCKWISE, 'F');

      expect(manager.isFaceAnimating(FacePosition.FRONT)).toBe(true);
      expect(manager.isFaceAnimating(FacePosition.BACK)).toBe(false);
    });

    it('should get animation by ID', () => {
      const result = manager.enqueueAnimation(FacePosition.FRONT, RotationDirection.CLOCKWISE, 'F');
      if (!result.success) throw new Error('Failed to enqueue animation');
      const animationId = result.data;

      const animation = manager.getAnimation(animationId);

      expect(animation).toBeDefined();
      expect(animation?.id).toBe(animationId);
    });

    it('should return null for non-existent animation ID', () => {
      const animation = manager.getAnimation('non-existent-id');
      expect(animation).toBe(null);
    });
  });

  describe('updateAnimationProgress', () => {
    it('should update progress of active animation', () => {
      const result = manager.enqueueAnimation(FacePosition.FRONT, RotationDirection.CLOCKWISE, 'F');
      if (!result.success) throw new Error('Failed to enqueue animation');
      const animationId = result.data;

      const updateResult = manager.updateAnimationProgress(animationId, 0.5);

      expect(updateResult.success).toBe(true);

      const animation = manager.getAnimation(animationId);
      expect(animation?.progress).toBe(0.5);
    });

    it('should clamp progress values', () => {
      const result = manager.enqueueAnimation(FacePosition.FRONT, RotationDirection.CLOCKWISE, 'F');
      if (!result.success) throw new Error('Failed to enqueue animation');
      const animationId = result.data;

      manager.updateAnimationProgress(animationId, 1.5);
      let animation = manager.getAnimation(animationId);
      expect(animation?.progress).toBe(1);

      manager.updateAnimationProgress(animationId, -0.5);
      animation = manager.getAnimation(animationId);
      expect(animation?.progress).toBe(0);
    });

    it('should handle updating non-active animation', () => {
      const result = manager.updateAnimationProgress('non-existent-id', 0.5);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe('INVALID_MOVE');
      }
    });
  });

  describe('dispose', () => {
    it('should dispose resources without error', () => {
      manager.enqueueAnimation(FacePosition.FRONT, RotationDirection.CLOCKWISE, 'F');
      manager.enqueueAnimation(FacePosition.BACK, RotationDirection.CLOCKWISE, 'B');

      expect(() => {
        manager.dispose();
      }).not.toThrow();

      expect(manager.hasAnimations()).toBe(false);
    });
  });
});