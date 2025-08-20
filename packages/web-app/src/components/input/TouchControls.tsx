/**
 * TouchControls Component
 * Main mobile touch interaction component that integrates gesture recognition
 * with cube face detection and rotation commands
 */

import React, { useCallback, useRef, useEffect } from 'react';
import * as THREE from 'three';
import { 
  TouchGesture, 
  TouchError, 
  FacePosition,
  RotationDirection
} from '@rubiks-cube/shared/types';
import { useTouchGestures } from '../../hooks/useTouchGestures';
import { TouchInteractionHandler } from '@rubiks-cube/three-renderer/interactions/TouchInteractionHandler';

export interface TouchControlsProps {
  scene?: THREE.Scene;
  camera?: THREE.Camera;
  isEnabled?: boolean;
  sensitivity?: number;
  onFaceRotation?: (_face: FacePosition, _direction: RotationDirection, _velocity: number) => void;
  onTouchStart?: () => void;
  onTouchEnd?: () => void;
  onError?: (_error: TouchError, _message: string) => void;
  className?: string;
  children?: React.ReactNode;
}

export const TouchControls: React.FC<TouchControlsProps> = ({
  scene,
  camera,
  isEnabled = true,
  sensitivity = 1.0,
  onFaceRotation,
  onTouchStart,
  onTouchEnd,
  onError,
  className = '',
  children,
}) => {
  const touchStartTime = useRef<number>(0);

  const handleGesture = useCallback(
    async (gesture: TouchGesture) => {
      if (!scene || !camera || !isEnabled) return;

      try {
        // For tap gestures, we need to detect the face during touch
        if (gesture.type === 'tap') {
          // Don't process taps for rotation - they're used for selection/highlighting
          return;
        }

        // For swipe gestures, use the first touch to determine target face
        if (gesture.type === 'swipe' && gesture.touches.length > 0) {
          const firstTouch = gesture.touches[0];
          if (!firstTouch) {
            onError?.(TouchError.INVALID_GESTURE, 'No touch data available');
            return;
          }
          
          // Perform raycasting to detect which face was touched
          const raycastResult = TouchInteractionHandler.raycastTouchOnCube({
            camera,
            scene,
            touchPosition: firstTouch.startPosition,
            recursive: true
          });

          if (!raycastResult.success || !raycastResult.data) {
            onError?.(TouchError.INVALID_GESTURE, 'No cube face detected under touch');
            return;
          }

          const intersection = raycastResult.data;
          
          // Validate touch target meets accessibility standards
          const canvas = document.querySelector('canvas') as HTMLCanvasElement;
          if (canvas) {
            const targetValidation = TouchInteractionHandler.validateTouchTarget(
              intersection,
              canvas,
              44 // WCAG AA minimum size
            );
            
            if (!targetValidation.success || !targetValidation.data) {
              if (process.env['NODE_ENV'] === 'development') {
                console.warn('Touch target may be too small for accessibility');
              }
            }
          }

          // Convert gesture to rotation command
          const rotationResult = TouchInteractionHandler.gestureToRotationCommand(
            gesture,
            intersection.facePosition
          );

          if (!rotationResult.success) {
            onError?.(rotationResult.error, rotationResult.message);
            return;
          }

          const { face, direction, velocity } = rotationResult.data;
          
          // Execute the face rotation
          onFaceRotation?.(face, direction, velocity);
        }

      } catch (error) {
        onError?.(
          TouchError.INVALID_GESTURE,
          error instanceof Error ? error.message : 'Unknown gesture processing error'
        );
      }
    },
    [scene, camera, isEnabled, onFaceRotation, onError]
  );

  const handleTouchError = useCallback(
    (error: TouchError, message: string) => {
      if (process.env['NODE_ENV'] === 'development') {
        console.warn(`Touch interaction error: ${error} - ${message}`);
      }
      onError?.(error, message);
    },
    [onError]
  );

  const { containerRef, mobileInputState, isTouchSupported } = useTouchGestures({
    sensitivity,
    debounceDelay: 100, // Prevent rapid duplicate gestures
    gestureTimeout: 1000, // Reset incomplete gestures after 1 second
    minimumSwipeDistance: 0.1, // Minimum movement for swipe detection
    onGesture: handleGesture,
    onError: handleTouchError,
  });

  // Handle touch lifecycle events
  useEffect(() => {
    if (mobileInputState.isGestureInProgress && !touchStartTime.current) {
      touchStartTime.current = Date.now();
      onTouchStart?.();
    } else if (!mobileInputState.isGestureInProgress && touchStartTime.current) {
      touchStartTime.current = 0;
      onTouchEnd?.();
    }
  }, [mobileInputState.isGestureInProgress, onTouchStart, onTouchEnd]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      TouchInteractionHandler.disposeStatic();
    };
  }, []);

  // Return the container element that will capture touch events
  return (
    <div
      ref={containerRef as React.RefObject<HTMLDivElement>}
      className={`touch-controls ${className} ${isEnabled ? 'enabled' : 'disabled'}`}
      style={{
        width: '100%',
        height: '100%',
        position: 'relative',
        touchAction: 'none', // Prevent default browser touch behaviors
        userSelect: 'none',
        WebkitUserSelect: 'none',
        WebkitTouchCallout: 'none',
        cursor: mobileInputState.isGestureInProgress ? 'grabbing' : 'pointer',
        ...(!isTouchSupported && { 
          pointerEvents: 'none', // Disable on non-touch devices
          opacity: 0.5 
        }),
      }}
      data-touch-enabled={isEnabled}
      data-touch-supported={isTouchSupported}
      data-active-touches={mobileInputState.activeTouches.size}
      data-gesture-in-progress={mobileInputState.isGestureInProgress}
    >
      {children}
      
      {/* Touch state indicator for debugging/development */}
      {process.env['NODE_ENV'] === 'development' && (
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            background: 'rgba(0,0,0,0.7)',
            color: 'white',
            padding: '8px',
            fontSize: '12px',
            fontFamily: 'monospace',
            pointerEvents: 'none',
            borderRadius: '4px',
            margin: '8px',
            zIndex: 1000,
          }}
        >
          <div>Touch Supported: {isTouchSupported ? 'Yes' : 'No'}</div>
          <div>Active Touches: {mobileInputState.activeTouches.size}</div>
          <div>Gesture In Progress: {mobileInputState.isGestureInProgress ? 'Yes' : 'No'}</div>
          {mobileInputState.currentGesture && (
            <div>
              Last Gesture: {mobileInputState.currentGesture.type} - {mobileInputState.currentGesture.direction}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default TouchControls;