import { 
  CubeAnimation, 
  AnimationQueue, 
  FacePosition,
  CubeOperationResult,
  CubeError,
  Move,
  RotationDirection,
} from '@rubiks-cube/shared/types';

export interface AnimationStateManagerOptions {
  maxConcurrent?: number;
  maxQueueSize?: number;
  onAnimationStart?: (_animation: CubeAnimation) => void;
  onAnimationComplete?: (_animation: CubeAnimation) => void;
  onAnimationError?: (_animation: CubeAnimation, _error: CubeError) => void;
  onQueueChange?: (_queue: AnimationQueue) => void;
}

export class AnimationStateManager {
  private currentAnimation: CubeAnimation | null = null;
  private pendingQueue: CubeAnimation[] = [];
  private isBlocked: boolean = false;
  private maxConcurrent: number;
  private maxQueueSize: number;

  private onAnimationStart: ((_animation: CubeAnimation) => void) | undefined;
  private onAnimationComplete: ((_animation: CubeAnimation) => void) | undefined;
  private onAnimationError: ((_animation: CubeAnimation, _error: CubeError) => void) | undefined;
  private onQueueChange: ((_queue: AnimationQueue) => void) | undefined;

  private animationTimeouts = new Map<string, number>();

  constructor(options: AnimationStateManagerOptions = {}) {
    this.maxConcurrent = options.maxConcurrent ?? 1;
    this.maxQueueSize = options.maxQueueSize ?? 10;
    this.onAnimationStart = options.onAnimationStart;
    this.onAnimationComplete = options.onAnimationComplete;
    this.onAnimationError = options.onAnimationError;
    this.onQueueChange = options.onQueueChange;
  }

  /**
   * Add animation to queue
   */
  enqueueAnimation(
    face: FacePosition,
    direction: RotationDirection,
    move: Move,
    duration: number = 300,
    easing: CubeAnimation['easing'] = 'ease-out'
  ): CubeOperationResult<string> {
    try {
      // Check queue capacity
      if (this.pendingQueue.length >= this.maxQueueSize) {
        return {
          success: false,
          error: CubeError.ANIMATION_IN_PROGRESS,
          message: 'Animation queue is full',
        };
      }

      // Check for conflicting animations
      if (this.hasConflictingAnimation(face)) {
        return {
          success: false,
          error: CubeError.ANIMATION_IN_PROGRESS,
          message: `Face ${face} already has an active or pending animation`,
        };
      }

      const animation: CubeAnimation = {
        id: this.generateAnimationId(),
        type: 'face-rotation',
        move,
        face,
        direction,
        startTime: 0, // Will be set when animation starts
        duration,
        progress: 0,
        easing,
      };

      this.pendingQueue.push(animation);
      this.notifyQueueChange();

      // Try to start animation immediately if possible
      this.processQueue();

      return { success: true, data: animation.id };

    } catch (error) {
      return {
        success: false,
        error: CubeError.WEBGL_CONTEXT_LOST,
        message: error instanceof Error ? error.message : 'Failed to enqueue animation',
      };
    }
  }

  /**
   * Start the next animation in queue
   */
  private processQueue(): void {
    if (this.isBlocked || this.currentAnimation !== null || this.pendingQueue.length === 0) {
      return;
    }

    const nextAnimation = this.pendingQueue.shift()!;
    this.startAnimation(nextAnimation);
  }

  /**
   * Start an animation
   */
  private startAnimation(animation: CubeAnimation): void {
    const startedAnimation: CubeAnimation = {
      ...animation,
      startTime: performance.now(),
    };

    this.currentAnimation = startedAnimation;
    this.notifyQueueChange();

    this.onAnimationStart?.(startedAnimation);

    // Set timeout for animation completion
    const timeout = window.setTimeout(() => {
      this.completeAnimation(startedAnimation.id);
    }, startedAnimation.duration);

    this.animationTimeouts.set(startedAnimation.id, timeout);
  }

  /**
   * Complete an animation
   */
  completeAnimation(animationId: string): CubeOperationResult<void> {
    try {
      if (!this.currentAnimation || this.currentAnimation.id !== animationId) {
        return {
          success: false,
          error: CubeError.INVALID_MOVE,
          message: `Animation ${animationId} is not currently active`,
        };
      }

      const completedAnimation = this.currentAnimation;

      // Clear timeout
      const timeout = this.animationTimeouts.get(animationId);
      if (timeout) {
        window.clearTimeout(timeout);
        this.animationTimeouts.delete(animationId);
      }

      // Mark as complete
      const finalAnimation: CubeAnimation = {
        ...completedAnimation,
        progress: 1,
      };

      this.currentAnimation = null;
      this.notifyQueueChange();

      this.onAnimationComplete?.(finalAnimation);

      // Process next animation in queue
      setTimeout(() => this.processQueue(), 0);

      return { success: true, data: undefined };

    } catch (error) {
      return {
        success: false,
        error: CubeError.WEBGL_CONTEXT_LOST,
        message: error instanceof Error ? error.message : 'Failed to complete animation',
      };
    }
  }

  /**
   * Cancel an animation
   */
  cancelAnimation(animationId: string): CubeOperationResult<void> {
    try {
      // Check if it's the current animation
      if (this.currentAnimation && this.currentAnimation.id === animationId) {
        const timeout = this.animationTimeouts.get(animationId);
        if (timeout) {
          window.clearTimeout(timeout);
          this.animationTimeouts.delete(animationId);
        }

        if (this.currentAnimation) {
          this.onAnimationError?.(this.currentAnimation, CubeError.ANIMATION_IN_PROGRESS);
        }
        this.currentAnimation = null;
        this.notifyQueueChange();

        // Process next animation
        setTimeout(() => this.processQueue(), 0);
        return { success: true, data: undefined };
      }

      // Check if it's in the pending queue
      const index = this.pendingQueue.findIndex(anim => anim.id === animationId);
      if (index !== -1) {
        const [cancelledAnimation] = this.pendingQueue.splice(index, 1);
        if (cancelledAnimation) {
          this.onAnimationError?.(cancelledAnimation, CubeError.ANIMATION_IN_PROGRESS);
        }
        this.notifyQueueChange();
        return { success: true, data: undefined };
      }

      return {
        success: false,
        error: CubeError.INVALID_MOVE,
        message: `Animation ${animationId} not found`,
      };

    } catch (error) {
      return {
        success: false,
        error: CubeError.WEBGL_CONTEXT_LOST,
        message: error instanceof Error ? error.message : 'Failed to cancel animation',
      };
    }
  }

  /**
   * Clear all animations
   */
  clearAllAnimations(): void {
    // Cancel current animation
    if (this.currentAnimation) {
      this.cancelAnimation(this.currentAnimation.id);
    }

    // Clear pending queue
    const pendingAnimations = [...this.pendingQueue];
    this.pendingQueue = [];

    // Notify about cancelled animations
    pendingAnimations.forEach(animation => {
      this.onAnimationError?.(animation, CubeError.ANIMATION_IN_PROGRESS);
    });

    // Clear all timeouts
    this.animationTimeouts.forEach(timeout => window.clearTimeout(timeout));
    this.animationTimeouts.clear();

    this.notifyQueueChange();
  }

  /**
   * Block all animations
   */
  block(): void {
    this.isBlocked = true;
    this.notifyQueueChange();
  }

  /**
   * Unblock animations and process queue
   */
  unblock(): void {
    this.isBlocked = false;
    this.notifyQueueChange();
    this.processQueue();
  }

  /**
   * Check if there's a conflicting animation for a face
   */
  private hasConflictingAnimation(face: FacePosition): boolean {
    // Check current animation
    if (this.currentAnimation && this.currentAnimation.face === face) {
      return true;
    }

    // Check pending queue
    return this.pendingQueue.some(anim => anim.face === face);
  }

  /**
   * Get current queue state
   */
  getQueueState(): AnimationQueue {
    return {
      current: this.currentAnimation,
      pending: [...this.pendingQueue], // Return copy to prevent external modification
      isBlocked: this.isBlocked,
      maxConcurrent: this.maxConcurrent,
    };
  }

  /**
   * Get animation by ID
   */
  getAnimation(animationId: string): CubeAnimation | null {
    if (this.currentAnimation && this.currentAnimation.id === animationId) {
      return this.currentAnimation;
    }

    return this.pendingQueue.find(anim => anim.id === animationId) || null;
  }

  /**
   * Check if any animations are active or pending
   */
  hasAnimations(): boolean {
    return this.currentAnimation !== null || this.pendingQueue.length > 0;
  }

  /**
   * Get number of pending animations
   */
  getPendingCount(): number {
    return this.pendingQueue.length;
  }

  /**
   * Check if a specific face is animating
   */
  isFaceAnimating(face: FacePosition): boolean {
    return this.hasConflictingAnimation(face);
  }

  /**
   * Update animation progress (called externally)
   */
  updateAnimationProgress(animationId: string, progress: number): CubeOperationResult<void> {
    if (!this.currentAnimation || this.currentAnimation.id !== animationId) {
      return {
        success: false,
        error: CubeError.INVALID_MOVE,
        message: `Animation ${animationId} is not currently active`,
      };
    }

    this.currentAnimation = {
      ...this.currentAnimation,
      progress: Math.max(0, Math.min(1, progress)),
    };

    return { success: true, data: undefined };
  }

  /**
   * Notify listeners about queue changes
   */
  private notifyQueueChange(): void {
    this.onQueueChange?.(this.getQueueState());
  }

  /**
   * Generate unique animation ID
   */
  private generateAnimationId(): string {
    return `anim_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Dispose of manager resources
   */
  dispose(): void {
    this.clearAllAnimations();
    this.currentAnimation = null;
    this.pendingQueue = [];
    this.animationTimeouts.clear();
  }
}