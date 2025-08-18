import React, { useEffect, useRef, useCallback } from 'react';
import * as THREE from 'three';
import { 
  FacePosition, 
  CubeAnimation,
  CubeError
} from '@rubiks-cube/shared/types';
import { FaceHighlighting } from '@rubiks-cube/three-renderer';
import { createSelectionFeedback, FEEDBACK_TIMING } from '../../utils/feedbackHelpers';

export interface MoveCompletionFeedbackProps {
  scene: THREE.Scene | null;
  cubeGroup: THREE.Group | null;
  isEnabled?: boolean;
  flashIntensity?: number;
  flashDuration?: number;
  onError?: (error: CubeError, message?: string) => void;
}

export interface CompletionFeedbackManager {
  showCompletionFeedback: (face: FacePosition) => void;
  showSuccessFlash: (face: FacePosition) => void;
}

export const MoveCompletionFeedback = React.forwardRef<CompletionFeedbackManager, MoveCompletionFeedbackProps>(({
  scene,
  cubeGroup,
  isEnabled = true,
  flashIntensity = 1.0,
  flashDuration = FEEDBACK_TIMING.success,
  onError,
}, ref) => {
  const faceHighlightingRef = useRef<FaceHighlighting | null>(null);
  const activeFlashesRef = useRef<Set<FacePosition>>(new Set());

  // Initialize face highlighting system
  useEffect(() => {
    if (!scene || !cubeGroup || !isEnabled) {
      if (faceHighlightingRef.current) {
        faceHighlightingRef.current.dispose();
        faceHighlightingRef.current = null;
      }
      return;
    }

    try {
      faceHighlightingRef.current = new FaceHighlighting({
        scene,
        cubeGroup,
        highlightIntensity: flashIntensity,
        transitionDuration: FEEDBACK_TIMING.quick,
        pulseAnimation: false,
      });
    } catch (error) {
      onError?.(CubeError.WEBGL_CONTEXT_LOST, 'Failed to initialize completion feedback');
      console.error('Failed to initialize completion feedback:', error);
    }

    return () => {
      if (faceHighlightingRef.current) {
        faceHighlightingRef.current.dispose();
        faceHighlightingRef.current = null;
      }
    };
  }, [scene, cubeGroup, isEnabled, flashIntensity, onError]);

  // Show completion feedback for a specific face
  const showCompletionFeedback = useCallback((face: FacePosition) => {
    if (!faceHighlightingRef.current || !isEnabled) return;
    
    // Don't show if already flashing
    if (activeFlashesRef.current.has(face)) return;
    
    activeFlashesRef.current.add(face);
    
    const feedback = createSelectionFeedback(face, 'success', {
      intensity: flashIntensity,
      pulse: false,
    });
    
    const result = faceHighlightingRef.current.applyFeedback(feedback);
    
    if (!result.success) {
      onError?.(result.error, result.message);
      activeFlashesRef.current.delete(face);
      return;
    }
    
    // Auto-fade after duration
    setTimeout(() => {
      if (faceHighlightingRef.current) {
        const normalFeedback = createSelectionFeedback(face, 'normal');
        faceHighlightingRef.current.applyFeedback(normalFeedback);
      }
      activeFlashesRef.current.delete(face);
    }, flashDuration);
  }, [isEnabled, flashIntensity, flashDuration, onError]);

  // Show success flash with more dramatic effect
  const showSuccessFlash = useCallback((face: FacePosition) => {
    if (!faceHighlightingRef.current || !isEnabled) return;
    
    // Don't show if already flashing
    if (activeFlashesRef.current.has(face)) return;
    
    activeFlashesRef.current.add(face);
    
    const feedback = createSelectionFeedback(face, 'success', {
      intensity: flashIntensity * 1.2, // Slightly more intense
      pulse: true,
    });
    
    const result = faceHighlightingRef.current.applyFeedback(feedback);
    
    if (!result.success) {
      onError?.(result.error, result.message);
      activeFlashesRef.current.delete(face);
      return;
    }
    
    // Auto-fade after duration with pulsing
    setTimeout(() => {
      if (faceHighlightingRef.current) {
        const normalFeedback = createSelectionFeedback(face, 'normal');
        faceHighlightingRef.current.applyFeedback(normalFeedback);
      }
      activeFlashesRef.current.delete(face);
    }, flashDuration * 1.5); // Slightly longer for success flash
  }, [isEnabled, flashIntensity, flashDuration, onError]);

  // Expose methods via ref
  React.useImperativeHandle(ref, () => ({
    showCompletionFeedback,
    showSuccessFlash,
  }), [showCompletionFeedback, showSuccessFlash]);

  return null; // This component doesn't render anything visible
});

// Custom hook for using completion feedback
export const useMoveCompletionFeedback = (
  scene: THREE.Scene | null,
  cubeGroup: THREE.Group | null,
  options: {
    isEnabled?: boolean;
    flashIntensity?: number;
    flashDuration?: number;
    onError?: (error: CubeError, message?: string) => void;
  } = {}
) => {
  const feedbackRef = useRef<CompletionFeedbackManager | null>(null);
  
  const showCompletionFeedback = useCallback((face: FacePosition) => {
    feedbackRef.current?.showCompletionFeedback(face);
  }, []);
  
  const showSuccessFlash = useCallback((face: FacePosition) => {
    feedbackRef.current?.showSuccessFlash(face);
  }, []);
  
  const handleAnimationComplete = useCallback((animation: CubeAnimation) => {
    if (animation.type === 'face-rotation' && animation.progress >= 1) {
      showCompletionFeedback(animation.face);
    }
  }, [showCompletionFeedback]);
  
  return {
    feedbackRef,
    showCompletionFeedback,
    showSuccessFlash,
    handleAnimationComplete,
    FeedbackComponent: () => (
      <MoveCompletionFeedback
        ref={feedbackRef}
        scene={scene}
        cubeGroup={cubeGroup}
        {...options}
      />
    ),
  };
};

export default MoveCompletionFeedback;