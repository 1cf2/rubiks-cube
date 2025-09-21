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
  canvas?: HTMLCanvasElement | null;
  isEnabled?: boolean;
  sensitivity?: number;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  onFaceRotation?: (face: FacePosition, direction: RotationDirection, velocity: number) => void;
  onTouchStart?: () => void;
  onTouchEnd?: () => void;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  onError?: (error: TouchError, message: string) => void;
  className?: string;
  children?: React.ReactNode;
}

export const TouchControls: React.FC<TouchControlsProps> = ({
  scene,
  camera,
  canvas,
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

  console.log('🪲 TouchControls: Component rendered', { isEnabled, scene: !!scene, camera: !!camera });

  const handleGesture = useCallback(
    async (gesture: TouchGesture) => {
      console.log('🪲 TouchControls: Gesture received', { type: gesture.type, direction: gesture.direction, velocity: gesture.velocity, touches: gesture.touches.length });
      if (!scene || !camera || !isEnabled) {
        console.log('🪲 TouchControls: Skipping gesture - missing scene/camera or disabled');
        return;
      }

      try {
        // For tap gestures, we need to detect the face during touch
        if (gesture.type === 'tap') {
          console.log('🪲 TouchControls: Tap gesture - skipping rotation');
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
          
          console.log('🪲 TouchControls: Performing raycast for swipe', { startPos: firstTouch.startPosition });
          // Perform raycasting to detect which face was touched
          const raycastResult = TouchInteractionHandler.raycastTouchOnCube({
            camera,
            scene,
            touchPosition: firstTouch.startPosition,
            recursive: true
          });

          console.log('🪲 TouchControls: Raycast result', raycastResult);

          if (!raycastResult.success || !raycastResult.data) {
            console.log('🪲 TouchControls: Outside cube drag detected - no face hit, event prevented, no forward to camera');
            onError?.(TouchError.INVALID_GESTURE, 'No cube face detected under touch');
            return;
          }

          const intersection = raycastResult.data;
          
          console.log('🪲 TouchControls: Face detected', { face: intersection.facePosition, point: intersection.point });
          // Validate touch target meets accessibility standards
          const canvas = document.querySelector('canvas') as HTMLCanvasElement;
          if (canvas) {
            const targetValidation = TouchInteractionHandler.validateTouchTarget(
              intersection,
              canvas,
              44 // WCAG AA minimum size
            );
            
            console.log('🪲 TouchControls: Target validation', targetValidation);
            if (!targetValidation.success || !targetValidation.data) {
              if (process.env['NODE_ENV'] === 'development') {
                window.console.log('Touch target may be too small for accessibility');
              }
            }
          }

          // Convert gesture to rotation command
          const rotationResult = TouchInteractionHandler.gestureToRotationCommand(
            gesture,
            intersection.facePosition
          );

          console.log('🪲 TouchControls: Rotation command result', rotationResult);

          if (!rotationResult.success) {
            onError?.(rotationResult.error, rotationResult.message);
            return;
          }

          const { face, direction, velocity } = rotationResult.data;
          
          console.log('🪲 TouchControls: Executing rotation', { face, direction, velocity });
          // Execute the face rotation
          onFaceRotation?.(face, direction, velocity);
        }

      } catch (error) {
        console.error('🪲 TouchControls: Gesture processing error', error);
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
        window.console.log(`Touch interaction error: ${error} - ${message}`);
      }
      onError?.(error, message);
    },
    [onError]
  );

  const { mobileInputState, isTouchSupported } = useTouchGestures({
    canvas: canvas || null, // Pass canvas directly for event attachment
    sensitivity,
    debounceDelay: 100, // Prevent rapid duplicate gestures
    gestureTimeout: 1000, // Reset incomplete gestures after 1 second
    minimumSwipeDistance: 0.1, // Minimum movement for swipe detection
    onGesture: handleGesture,
    onError: handleTouchError,
  });

  console.log('🪲 TouchControls: useTouchGestures result', { isTouchSupported });

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
      className={`touch-controls ${className} ${isEnabled ? 'enabled' : 'disabled'}`}
      style={{
        width: '100%',
        height: '100%',
        position: 'relative',
        pointerEvents: 'none', // Wrapper doesn't capture events, canvas does
        userSelect: 'none',
        WebkitUserSelect: 'none',
        WebkitTouchCallout: 'none',
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