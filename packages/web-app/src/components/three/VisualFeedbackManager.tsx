import React, { useRef, useEffect } from 'react';
import * as THREE from 'three';
import { FaceHighlighting } from '@rubiks-cube/three-renderer';
import { FacePosition, VisualFeedback, CubeError } from '@rubiks-cube/shared/types';

interface VisualFeedbackManagerProps {
  scene: THREE.Scene | null;
  cubeGroup: THREE.Group | null;
  cubeStateVersion?: number;
  feedbackMap: Map<FacePosition, VisualFeedback>;
  isEnabled?: boolean;
  onError?: (error: CubeError, message?: string) => void;
}

export const VisualFeedbackManager: React.FC<VisualFeedbackManagerProps> = ({
  scene,
  cubeGroup,
  cubeStateVersion = 0,
  feedbackMap,
  isEnabled = true,
  onError,
}) => {
  const faceHighlightingRef = useRef<FaceHighlighting | null>(null);

  // Initialize FaceHighlighting system and reinitialize when cube state changes
  useEffect(() => {
    if (!scene || !cubeGroup || !isEnabled) {
      return;
    }

    try {
      // Dispose previous instance if it exists
      if (faceHighlightingRef.current) {
        faceHighlightingRef.current.dispose();
      }
      
      faceHighlightingRef.current = new FaceHighlighting({
        scene,
        cubeGroup,
        highlightIntensity: 0.6,
        transitionDuration: 150, // Fast feedback for mouse down
        pulseAnimation: true,
      });
      
      window.console.log('🎨 VisualFeedbackManager: FaceHighlighting system (re)initialized');
    } catch (error) {
      onError?.(CubeError.WEBGL_CONTEXT_LOST, 'Failed to initialize visual feedback system');
    }

    return () => {
      if (faceHighlightingRef.current) {
        faceHighlightingRef.current.dispose();
        faceHighlightingRef.current = null;
      }
    };
  }, [scene, cubeGroup, cubeStateVersion, isEnabled, onError]);

  // Apply visual feedback when feedbackMap changes
  useEffect(() => {
    // Only log if there are actual changes or feedback to apply
    if (feedbackMap.size > 0) {
      window.console.log('🎨 VisualFeedbackManager: applying feedback', feedbackMap.size, 'items');
    }
    
    if (!faceHighlightingRef.current || !isEnabled) {
      return;
    }

    const highlighting = faceHighlightingRef.current;

    // Clear all existing highlights first
    highlighting.clearAll();

    // Apply new feedback
    feedbackMap.forEach((feedback) => {
      // If no piece position is provided but we have a tracked piece, update with current position
      let updatedFeedback = feedback;
      if (!feedback.piecePosition && feedback.intersectionPoint) {
        const currentPiecePosition = highlighting.getCurrentTrackedPiecePosition();
        if (currentPiecePosition) {
          updatedFeedback = {
            ...feedback,
            piecePosition: currentPiecePosition
          };
        }
      }
      
      const result = highlighting.applyFeedback(updatedFeedback);
      if (!result.success) {
        window.console.error('🎨 VisualFeedbackManager: feedback failed', result.error, result.message);
        onError?.(result.error, result.message);
      }
    });
  }, [feedbackMap, isEnabled, onError]);

  // Update animation system and track piece positions
  useEffect(() => {
    if (!faceHighlightingRef.current || !isEnabled) {
      return;
    }

    const highlighting = faceHighlightingRef.current;
    let animationId: number;

    const updateAnimation = () => {
      highlighting.update();
      
      // Check if we need to update highlight position based on tracked piece movement
      const currentPiecePosition = highlighting.getCurrentTrackedPiecePosition();
      if (currentPiecePosition && feedbackMap.size > 0) {
        // Get the first feedback (assuming single highlight for now)
        const [, feedback] = Array.from(feedbackMap.entries())[0] || [];
        if (feedback && feedback.state === 'selected') {
          // Update the feedback with current piece position
          const updatedFeedback = {
            ...feedback,
            piecePosition: currentPiecePosition
          };
          
          // Reapply feedback with updated position (without triggering infinite loop)
          if (JSON.stringify(feedback.piecePosition) !== JSON.stringify(currentPiecePosition)) {
            window.console.log('🔄 Updating highlight position during animation:', currentPiecePosition);
            highlighting.applyFeedback(updatedFeedback);
          }
        }
      }
      
      animationId = requestAnimationFrame(updateAnimation);
    };

    animationId = requestAnimationFrame(updateAnimation);

    return () => {
      if (animationId) {
        cancelAnimationFrame(animationId);
      }
    };
  }, [isEnabled, feedbackMap]);

  // This component doesn't render anything visible
  return null;
};