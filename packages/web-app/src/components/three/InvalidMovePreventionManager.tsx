import React, { useEffect, useRef, useCallback, useState } from 'react';
import * as THREE from 'three';
import { 
  FacePosition, 
  AnimationQueue,
  CubeError 
} from '@rubiks-cube/shared/types';
import { FaceHighlighting } from '@rubiks-cube/three-renderer';
import { createSelectionFeedback, isFaceSelectable, FEEDBACK_TIMING } from '../../utils/feedbackHelpers';

export interface InvalidMovePreventionManagerProps {
  scene: THREE.Scene | null;
  cubeGroup: THREE.Group | null;
  animationQueue?: AnimationQueue;
  currentlyAnimating?: FacePosition[];
  allowConcurrentAnimations?: boolean;
  isEnabled?: boolean;
  onInvalidMoveAttempt?: (face: FacePosition, reason: string) => void;
  onError?: (error: CubeError, message?: string) => void;
}

export interface BlockedMoveInfo {
  face: FacePosition;
  reason: string;
  timestamp: number;
}

export const InvalidMovePreventionManager: React.FC<InvalidMovePreventionManagerProps> = ({
  scene,
  cubeGroup,
  animationQueue,
  currentlyAnimating = [],
  allowConcurrentAnimations = false,
  isEnabled = true,
  onInvalidMoveAttempt,
  onError,
}) => {
  const faceHighlightingRef = useRef<FaceHighlighting | null>(null);
  const [blockedFaces, setBlockedFaces] = useState<Set<FacePosition>>(new Set());
  const [, setRecentBlockedMoves] = useState<Map<FacePosition, BlockedMoveInfo>>(new Map());
  const blockTimeoutRef = useRef<Map<FacePosition, NodeJS.Timeout>>(new Map());

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
        highlightIntensity: 0.3,
        transitionDuration: FEEDBACK_TIMING.quick,
        pulseAnimation: false,
      });
    } catch (error) {
      onError?.(CubeError.WEBGL_CONTEXT_LOST, 'Failed to initialize invalid move prevention');
      console.error('Failed to initialize invalid move prevention:', error);
    }

    return () => {
      if (faceHighlightingRef.current) {
        faceHighlightingRef.current.dispose();
        faceHighlightingRef.current = null;
      }
    };
  }, [scene, cubeGroup, isEnabled, onError]);

  // Check if a move is valid
  const isValidMove = useCallback((face: FacePosition): { valid: boolean; reason?: string } => {
    if (!isEnabled) return { valid: true };

    // Check if face is currently animating
    if (currentlyAnimating.includes(face)) {
      return { valid: false, reason: `${face} face is currently rotating` };
    }

    // Check if animation queue is blocked
    if (animationQueue?.isBlocked) {
      return { valid: false, reason: 'Animation system is temporarily blocked' };
    }

    // Check concurrent animation limits
    if (!allowConcurrentAnimations && (animationQueue?.current || currentlyAnimating.length > 0)) {
      return { valid: false, reason: 'Another move is in progress' };
    }

    // Check if we've exceeded maximum concurrent animations
    if (animationQueue && currentlyAnimating.length >= animationQueue.maxConcurrent) {
      return { valid: false, reason: 'Too many moves in progress' };
    }

    return { valid: true };
  }, [isEnabled, currentlyAnimating, animationQueue, allowConcurrentAnimations]);

  // Show blocked move feedback
  const showBlockedFeedback = useCallback((face: FacePosition, reason: string) => {
    if (!faceHighlightingRef.current || !isEnabled) return;

    const feedback = createSelectionFeedback(face, 'blocked', {
      intensity: 1.0,
      pulse: false,
    });

    const result = faceHighlightingRef.current.applyFeedback(feedback);
    
    if (result.success) {
      setBlockedFaces(prev => new Set(prev).add(face));
      
      // Record the blocked move
      setRecentBlockedMoves(prev => new Map(prev).set(face, {
        face,
        reason,
        timestamp: Date.now(),
      }));
      
      // Clear existing timeout for this face
      const existingTimeout = blockTimeoutRef.current.get(face);
      if (existingTimeout) {
        clearTimeout(existingTimeout);
      }
      
      // Auto-clear after short duration
      const timeout = setTimeout(() => {
        clearBlockedFeedback(face);
      }, FEEDBACK_TIMING.quick * 3);
      
      blockTimeoutRef.current.set(face, timeout);
      
      onInvalidMoveAttempt?.(face, reason);
    } else {
      onError?.(result.error, result.message);
    }
  }, [isEnabled, onInvalidMoveAttempt, onError]);

  // Clear blocked move feedback
  const clearBlockedFeedback = useCallback((face: FacePosition) => {
    if (!faceHighlightingRef.current) return;

    const normalFeedback = createSelectionFeedback(face, 'normal');
    faceHighlightingRef.current.applyFeedback(normalFeedback);
    
    setBlockedFaces(prev => {
      const newSet = new Set(prev);
      newSet.delete(face);
      return newSet;
    });
    
    // Clear timeout
    const timeout = blockTimeoutRef.current.get(face);
    if (timeout) {
      clearTimeout(timeout);
      blockTimeoutRef.current.delete(face);
    }
  }, []);

  // Check and enforce move validity
  const checkMoveValidity = useCallback((face: FacePosition): boolean => {
    const { valid, reason } = isValidMove(face);
    
    if (!valid && reason) {
      showBlockedFeedback(face, reason);
      return false;
    }
    
    return true;
  }, [isValidMove, showBlockedFeedback]);

  // Update blocked faces based on animation state
  useEffect(() => {
    if (!isEnabled) return;

    const allFaces = Object.values(FacePosition);
    const newBlockedFaces = new Set<FacePosition>();

    // Check each face for validity
    allFaces.forEach(face => {
      if (!isFaceSelectable(face, { 
        ...(animationQueue && { animationQueue }), 
        currentlyAnimating, 
        allowConcurrentAnimations 
      })) {
        newBlockedFaces.add(face);
      }
    });

    // Update UI for newly blocked faces
    newBlockedFaces.forEach(face => {
      if (!blockedFaces.has(face)) {
        const { reason } = isValidMove(face);
        if (reason) {
          showBlockedFeedback(face, reason);
        }
      }
    });

    // Clear UI for no longer blocked faces
    blockedFaces.forEach(face => {
      if (!newBlockedFaces.has(face)) {
        clearBlockedFeedback(face);
      }
    });

  }, [animationQueue, currentlyAnimating, allowConcurrentAnimations, isEnabled, blockedFaces, isValidMove, showBlockedFeedback, clearBlockedFeedback]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      blockTimeoutRef.current.forEach(timeout => clearTimeout(timeout));
      blockTimeoutRef.current.clear();
    };
  }, []);

  // Expose check function for external use
  React.useEffect(() => {
    // Store the check function on a global reference for external access
    if (typeof window !== 'undefined') {
      (window as any).__invalidMoveChecker = checkMoveValidity;
    }

    return () => {
      if (typeof window !== 'undefined') {
        delete (window as any).__invalidMoveChecker;
      }
    };
  }, [checkMoveValidity]);

  return null; // This component doesn't render anything visible
};

// Custom hook for using invalid move prevention
export const useInvalidMovePrevention = (
  scene: THREE.Scene | null,
  cubeGroup: THREE.Group | null,
  options: {
    animationQueue?: AnimationQueue;
    currentlyAnimating?: FacePosition[];
    allowConcurrentAnimations?: boolean;
    isEnabled?: boolean;
    onInvalidMoveAttempt?: (face: FacePosition, reason: string) => void;
    onError?: (error: CubeError, message?: string) => void;
  } = {}
) => {
  const [blockedMoves, setBlockedMoves] = useState<BlockedMoveInfo[]>([]);

  const handleInvalidMoveAttempt = useCallback((face: FacePosition, reason: string) => {
    const blockedMove: BlockedMoveInfo = {
      face,
      reason,
      timestamp: Date.now(),
    };

    setBlockedMoves(prev => [...prev, blockedMove]);
    
    // Auto-remove after a few seconds
    setTimeout(() => {
      setBlockedMoves(prev => prev.filter(move => move.timestamp !== blockedMove.timestamp));
    }, 5000);

    options.onInvalidMoveAttempt?.(face, reason);
  }, [options.onInvalidMoveAttempt]);

  const checkMoveValidity = useCallback((face: FacePosition): boolean => {
    if (typeof window !== 'undefined' && (window as any).__invalidMoveChecker) {
      return (window as any).__invalidMoveChecker(face);
    }
    return true; // Fallback to allowing moves if checker not available
  }, []);

  return {
    blockedMoves,
    checkMoveValidity,
    PreventionComponent: () => (
      <InvalidMovePreventionManager
        scene={scene}
        cubeGroup={cubeGroup}
        onInvalidMoveAttempt={handleInvalidMoveAttempt}
        {...options}
      />
    ),
  };
};

export default InvalidMovePreventionManager;