/**
 * Touch Gesture Recognition Hook
 * Handles touch event detection, gesture recognition, and multi-touch discrimination
 */

import { useCallback, useRef, useState, useEffect } from 'react';
import {
  TouchInteraction,
  TouchGesture,
  MobileInputState,
  TouchOperationResult,
  TouchError,
  GestureDirection,
  Vector2
} from '@rubiks-cube/shared/types';
import {
  createTouchInteraction,
  calculateTouchVelocity,
  isSignificantTouchMovement,
  preventDefaultTouchBehavior,
  debounceTouch,
  isTouchDevice
} from '../utils/touchUtils';

interface UseTouchGesturesOptions {
  sensitivity: number;
  debounceDelay: number;
  gestureTimeout: number;
  minimumSwipeDistance: number;
  canvas?: HTMLCanvasElement | null;
  onGesture?: (_gesture: TouchGesture) => void;
  onError?: (_error: TouchError, _message: string) => void;
}

const DEFAULT_OPTIONS: UseTouchGesturesOptions = {
  sensitivity: 1.0,
  debounceDelay: 100,
  gestureTimeout: 1000,
  minimumSwipeDistance: 0.1,
};

export function useTouchGestures(options: Partial<UseTouchGesturesOptions> = {}) {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const canvas = opts.canvas;
  
  const [mobileInputState, setMobileInputState] = useState<MobileInputState>({
    activeTouches: new Map(),
    currentGesture: null,
    isGestureInProgress: false,
    touchTargetSize: 44, // WCAG AA compliance
  });

  const containerRef = useRef<HTMLElement | null>(null);
  const gestureTimeoutRef = useRef<number | null>(null);
  const lastGestureTime = useRef<number>(0);

  // Check if this is a touch device
  const isTouchSupported = isTouchDevice();
  console.log('🪲 useTouchGestures: isTouchSupported:', isTouchSupported);

  const clearGestureTimeout = useCallback(() => {
    if (gestureTimeoutRef.current) {
      clearTimeout(gestureTimeoutRef.current);
      gestureTimeoutRef.current = null;
    }
  }, []);

  const resetGestureState = useCallback(() => {
    clearGestureTimeout();
    setMobileInputState(prev => ({
      ...prev,
      activeTouches: new Map(),
      currentGesture: null,
      isGestureInProgress: false,
    }));
  }, [clearGestureTimeout]);

  const calculateSwipeDirection = useCallback(
    (startPos: Vector2, endPos: Vector2): GestureDirection => {
      const dx = endPos.x - startPos.x;
      const dy = endPos.y - startPos.y;
      
      if (Math.abs(dx) > Math.abs(dy)) {
        return dx > 0 ? 'right' : 'left';
      } else {
        return dy > 0 ? 'up' : 'down';
      }
    },
    []
  );

  const recognizeGesture = useCallback(
    (touches: Map<number, TouchInteraction>): TouchOperationResult<TouchGesture> => {
      const touchArray = Array.from(touches.values());
      
      if (touchArray.length === 0) {
        return {
          success: false,
          error: TouchError.INVALID_GESTURE,
          message: 'No touches provided for gesture recognition'
        };
      }

      // Single touch gestures
      if (touchArray.length === 1) {
        const touch = touchArray[0];
        if (!touch) {
          return {
            success: false,
            error: TouchError.INVALID_GESTURE,
            message: 'Invalid touch data'
          };
        }
        const timeDelta = Date.now() - touch.timestamp;
        
        if (!isSignificantTouchMovement(
          touch.startPosition,
          touch.currentPosition,
          opts.minimumSwipeDistance
        )) {
          // Tap gesture
          return {
            success: true,
            data: {
              type: 'tap',
              direction: 'down', // Default for tap
              velocity: 0,
              touches: touchArray,
              confidence: 0.9
            }
          };
        }

        // Swipe gesture
        const velocity = calculateTouchVelocity(
          touch.startPosition,
          touch.currentPosition,
          timeDelta
        );
        
        const direction = calculateSwipeDirection(
          touch.startPosition,
          touch.currentPosition
        );

        return {
          success: true,
          data: {
            type: 'swipe',
            direction,
            velocity: velocity * opts.sensitivity,
            touches: touchArray,
            confidence: Math.min(velocity / 100, 1.0) // Higher velocity = higher confidence
          }
        };
      }

      // Multi-touch gestures (pinch/rotate) - for cube orientation
      if (touchArray.length === 2) {
        return {
          success: true,
          data: {
            type: 'pinch',
            direction: 'down', // Default
            velocity: 0,
            touches: touchArray,
            confidence: 0.8
          }
        };
      }

      return {
        success: false,
        error: TouchError.MULTI_TOUCH_CONFLICT,
        message: `Unsupported touch count: ${touchArray.length}`
      };
    },
    [opts.sensitivity, opts.minimumSwipeDistance, calculateSwipeDirection]
  );

  // Debounced gesture handler
  const handleGestureRecognized = useCallback(
    debounceTouch((gesture: TouchGesture) => {
      const now = Date.now();
      if (now - lastGestureTime.current < opts.debounceDelay) {
        return; // Skip if too soon after last gesture
      }
      
      lastGestureTime.current = now;
      opts.onGesture?.(gesture);
    }, opts.debounceDelay),
    [opts.onGesture, opts.debounceDelay]
  );

  const handleTouchStart = useCallback(
    (event: TouchEvent) => {
      console.log('🪲 useTouchGestures: touchstart event fired', { touchesLength: event.changedTouches.length, target: event.target });
      if (!containerRef.current) return;
      
      preventDefaultTouchBehavior(event);
      clearGestureTimeout();

      const newTouches = new Map(mobileInputState.activeTouches);
      
      // Process each new touch
      for (let i = 0; i < event.changedTouches.length; i++) {
        const touch = event.changedTouches[i];
        if (!touch) continue;
        const touchResult = createTouchInteraction(touch, containerRef.current);
        
        if (touchResult.success) {
          newTouches.set(touch.identifier, touchResult.data);
          console.log('🪲 useTouchGestures: Added touch', { id: touch.identifier, position: touchResult.data.startPosition });
        } else {
          opts.onError?.(touchResult.error, touchResult.message);
        }
      }

      // Prevent more than 2 simultaneous touches for cube interaction
      if (newTouches.size > 2) {
        opts.onError?.(
          TouchError.MULTI_TOUCH_CONFLICT,
          'Too many simultaneous touches for cube interaction'
        );
        return;
      }

      setMobileInputState(prev => ({
        ...prev,
        activeTouches: newTouches,
        isGestureInProgress: true,
      }));

      console.log('🪲 useTouchGestures: Gesture started with', newTouches.size, 'touches');

      // Set gesture timeout
      gestureTimeoutRef.current = window.setTimeout(() => {
        opts.onError?.(TouchError.GESTURE_TIMEOUT, 'Gesture timed out');
        resetGestureState();
      }, opts.gestureTimeout);
    },
    [mobileInputState.activeTouches, opts, resetGestureState, clearGestureTimeout]
  );

  const handleTouchMove = useCallback(
    (event: TouchEvent) => {
      console.log('🪲 useTouchGestures: touchmove event fired', { touchesLength: event.changedTouches.length });
      if (!containerRef.current || !mobileInputState.isGestureInProgress) return;
      
      preventDefaultTouchBehavior(event);

      const updatedTouches = new Map(mobileInputState.activeTouches);
      
      // Update existing touches with new positions
      for (let i = 0; i < event.changedTouches.length; i++) {
        const touch = event.changedTouches[i];
        if (!touch) continue;
        const existingTouch = updatedTouches.get(touch.identifier);
        
        if (existingTouch) {
          const positionResult = createTouchInteraction(touch, containerRef.current);
          if (positionResult.success) {
            updatedTouches.set(touch.identifier, {
              ...existingTouch,
              currentPosition: positionResult.data.currentPosition,
            });
            console.log('🪲 useTouchGestures: Updated touch position', { id: touch.identifier, newPos: positionResult.data.currentPosition });
          }
        }
      }

      setMobileInputState(prev => ({
        ...prev,
        activeTouches: updatedTouches,
      }));
    },
    [mobileInputState.activeTouches, mobileInputState.isGestureInProgress]
  );

  const handleTouchEnd = useCallback(
    (event: TouchEvent) => {
      console.log('🪲 useTouchGestures: touchend event fired', { changedTouchesLength: event.changedTouches.length });
      preventDefaultTouchBehavior(event);
      
      const updatedTouches = new Map(mobileInputState.activeTouches);
      
      // Remove ended touches
      for (let i = 0; i < event.changedTouches.length; i++) {
        const touch = event.changedTouches[i];
        if (!touch) continue;
        updatedTouches.delete(touch.identifier);
        console.log('🪲 useTouchGestures: Removed touch', { id: touch.identifier });
      }

      // If no more touches, recognize the gesture
      if (updatedTouches.size === 0 && mobileInputState.activeTouches.size > 0) {
        const gestureResult = recognizeGesture(new Map(mobileInputState.activeTouches));
        
        if (gestureResult.success) {
          console.log('🪲 useTouchGestures: Gesture recognized:', gestureResult.data);
          handleGestureRecognized(gestureResult.data);
          setMobileInputState(prev => ({
            ...prev,
            currentGesture: gestureResult.data,
          }));
        } else {
          console.log('🪲 useTouchGestures: Gesture recognition failed:', gestureResult.error, gestureResult.message);
          opts.onError?.(gestureResult.error, gestureResult.message);
        }
        
        resetGestureState();
      } else {
        setMobileInputState(prev => ({
          ...prev,
          activeTouches: updatedTouches,
        }));
      }
    },
    [
      mobileInputState.activeTouches,
      recognizeGesture,
      handleGestureRecognized,
      resetGestureState,
      opts
    ]
  );

  // Set up event listeners
  useEffect(() => {
    const element = canvas || containerRef.current;
    if (!element || !isTouchSupported) {
      console.log('🪲 useTouchGestures: Skipping attachment - no element or not touch supported');
      return;
    }

    console.log('🪲 useTouchGestures: Attaching touch listeners to', canvas ? 'canvas' : 'container');

    element.addEventListener('touchstart', handleTouchStart, { passive: false });
    element.addEventListener('touchmove', handleTouchMove, { passive: false });
    element.addEventListener('touchend', handleTouchEnd, { passive: false });
    element.addEventListener('touchcancel', handleTouchEnd, { passive: false });

    return () => {
      console.log('🪲 useTouchGestures: Removing touch listeners');
      element.removeEventListener('touchstart', handleTouchStart);
      element.removeEventListener('touchmove', handleTouchMove);
      element.removeEventListener('touchend', handleTouchEnd);
      element.removeEventListener('touchcancel', handleTouchEnd);
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd, isTouchSupported, canvas]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearGestureTimeout();
    };
  }, [clearGestureTimeout]);

  return {
    containerRef,
    mobileInputState,
    resetGestureState,
    isTouchSupported,
  };
}