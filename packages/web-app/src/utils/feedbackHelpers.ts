import { FacePosition, VisualFeedback, AnimationQueue } from '@rubiks-cube/shared/types';

/**
 * Helper utilities for visual feedback management
 */

export interface FaceSelectabilityOptions {
  animationQueue?: AnimationQueue;
  currentlyAnimating?: FacePosition[];
  allowConcurrentAnimations?: boolean;
}

/**
 * Determine if a face is selectable based on current animation state
 */
export function isFaceSelectable(
  face: FacePosition, 
  options: FaceSelectabilityOptions = {}
): boolean {
  const { animationQueue, currentlyAnimating = [], allowConcurrentAnimations = false } = options;
  
  // If face is currently animating, it's not selectable
  if (currentlyAnimating.includes(face)) {
    return false;
  }
  
  // If animation queue is blocked, no faces are selectable
  if (animationQueue && animationQueue.isBlocked) {
    return false;
  }
  
  // If concurrent animations are not allowed and something is animating
  if (!allowConcurrentAnimations && (animationQueue?.current || currentlyAnimating.length > 0)) {
    return false;
  }
  
  return true;
}

/**
 * Create visual feedback configuration for face selection indicators
 */
export function createSelectionFeedback(
  face: FacePosition,
  state: VisualFeedback['state'],
  options: {
    intensity?: number;
    pulse?: boolean;
    customColor?: [number, number, number];
    customOpacity?: number;
  } = {}
): VisualFeedback {
  const { intensity = 1, pulse = false, customColor, customOpacity } = options;
  
  const baseConfigs = {
    hover: {
      opacity: 0.2,
      color: [0.3, 0.7, 1.0] as const,
      emissiveIntensity: 0,
    },
    selected: {
      opacity: 0.4,
      color: [1.0, 0.6, 0.1] as const,
      emissiveIntensity: 0.1,
    },
    blocked: {
      opacity: 0.15,
      color: [1.0, 0.3, 0.3] as const,
      emissiveIntensity: 0,
    },
    preview: {
      opacity: 0.1,
      color: [0.8, 0.8, 1.0] as const,
      emissiveIntensity: 0,
    },
    success: {
      opacity: 0.4,
      color: [0.2, 1.0, 0.3] as const,
      emissiveIntensity: 0.1,
    },
    rotating: {
      opacity: 0.6,
      color: [1.0, 0.2, 0.2] as const,
      emissiveIntensity: 0.2,
    },
    normal: {
      opacity: 0,
      color: [1.0, 1.0, 1.0] as const,
      emissiveIntensity: 0,
    },
  };
  
  const config = baseConfigs[state];
  
  return {
    face,
    state,
    opacity: customOpacity ?? (config.opacity * intensity),
    color: customColor ?? config.color,
    emissiveIntensity: config.emissiveIntensity * intensity,
    pulse: pulse || (state === 'rotating' || state === 'success'),
    intensity,
  };
}

/**
 * Get default visual feedback for face selectability
 */
export function getSelectabilityFeedback(
  face: FacePosition,
  options: FaceSelectabilityOptions = {}
): VisualFeedback {
  const selectable = isFaceSelectable(face, options);
  
  if (!selectable) {
    return createSelectionFeedback(face, 'blocked');
  }
  
  return createSelectionFeedback(face, 'normal');
}

/**
 * Update face feedback based on selectability state
 */
export function updateFaceSelectability(
  faces: FacePosition[],
  options: FaceSelectabilityOptions = {}
): Map<FacePosition, VisualFeedback> {
  const feedbackMap = new Map<FacePosition, VisualFeedback>();
  
  faces.forEach(face => {
    const feedback = getSelectabilityFeedback(face, options);
    if (feedback.state !== 'normal') {
      feedbackMap.set(face, feedback);
    }
  });
  
  return feedbackMap;
}

/**
 * Create consistent color scheme for all feedback states
 */
export const FEEDBACK_COLOR_SCHEME = {
  hover: [0.3, 0.7, 1.0] as const,      // Light blue
  selected: [1.0, 0.6, 0.1] as const,   // Orange
  rotating: [1.0, 0.2, 0.2] as const,   // Red
  blocked: [1.0, 0.3, 0.3] as const,    // Light red
  preview: [0.8, 0.8, 1.0] as const,    // Very light blue
  success: [0.2, 1.0, 0.3] as const,    // Green
  normal: [1.0, 1.0, 1.0] as const,     // White
} as const;

/**
 * Standard timing values for consistent feedback animations
 */
export const FEEDBACK_TIMING = {
  quick: 100,      // For blocked state indication
  normal: 200,     // Standard transition
  slow: 300,       // For selection states
  success: 300,    // Success flash duration
  pulse: 150,      // Pulse animation period
} as const;