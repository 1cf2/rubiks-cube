/**
 * Touch Event Utilities for Mobile Cube Interactions
 * Provides low-level touch event handling and coordinate conversion
 */

import { Vector2, TouchInteraction, TouchOperationResult, TouchError } from '@rubiks-cube/shared/types';

/**
 * Convert touch event coordinates to normalized device coordinates
 */
export function touchEventToVector2(
  touch: Touch,
  container: HTMLElement
): TouchOperationResult<Vector2> {
  try {
    const rect = container.getBoundingClientRect();
    const x = ((touch.clientX - rect.left) / rect.width) * 2 - 1;
    const y = -((touch.clientY - rect.top) / rect.height) * 2 + 1;
    
    return {
      success: true,
      data: { x, y }
    };
  } catch (error) {
    return {
      success: false,
      error: TouchError.INVALID_GESTURE,
      message: 'Failed to convert touch coordinates'
    };
  }
}

/**
 * Create TouchInteraction from Touch event
 */
export function createTouchInteraction(
  touch: Touch,
  container: HTMLElement,
  targetFace: any = null
): TouchOperationResult<TouchInteraction> {
  const positionResult = touchEventToVector2(touch, container);
  
  if (!positionResult.success) {
    return positionResult as TouchOperationResult<TouchInteraction>;
  }
  
  return {
    success: true,
    data: {
      id: touch.identifier,
      startPosition: positionResult.data,
      currentPosition: positionResult.data,
      timestamp: Date.now(),
      targetFace
    }
  };
}

/**
 * Calculate distance between two touch positions
 */
export function calculateTouchDistance(pos1: Vector2, pos2: Vector2): number {
  const dx = pos2.x - pos1.x;
  const dy = pos2.y - pos1.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Calculate velocity of touch movement
 */
export function calculateTouchVelocity(
  startPos: Vector2,
  endPos: Vector2,
  timeDelta: number
): number {
  if (timeDelta <= 0) return 0;
  
  const distance = calculateTouchDistance(startPos, endPos);
  return distance / (timeDelta / 1000); // pixels per second
}

/**
 * Determine if touch movement exceeds minimum threshold
 */
export function isSignificantTouchMovement(
  startPos: Vector2,
  currentPos: Vector2,
  threshold: number = 0.1
): boolean {
  return calculateTouchDistance(startPos, currentPos) > threshold;
}

/**
 * Check if touch target meets accessibility standards (44px minimum)
 */
export function validateTouchTargetSize(
  element: HTMLElement,
  minimumSize: number = 44
): boolean {
  const rect = element.getBoundingClientRect();
  return rect.width >= minimumSize && rect.height >= minimumSize;
}

/**
 * Debounce touch events to prevent rapid duplicates
 */
export function debounceTouch<T extends (..._args: any[]) => any>(
  func: T,
  delay: number = 100
): T {
  let timeoutId: number | null = null;
  
  return ((...args: Parameters<T>) => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    
    timeoutId = window.setTimeout(() => {
      func(...args);
      timeoutId = null;
    }, delay);
  }) as T;
}

/**
 * Prevent browser default touch behaviors during cube interaction
 */
export function preventDefaultTouchBehavior(event: TouchEvent): void {
  // Prevent zooming, scrolling, and other default touch behaviors
  event.preventDefault();
  event.stopPropagation();
}

/**
 * Check if device supports touch events
 */
export function isTouchDevice(): boolean {
  return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
}

/**
 * Get device pixel ratio for high-DPI screen compensation
 */
export function getDevicePixelRatio(): number {
  return window.devicePixelRatio || 1;
}

/**
 * Handle orientation change and viewport adjustments
 */
export function getViewportInfo() {
  return {
    width: window.innerWidth,
    height: window.innerHeight,
    orientation: window.screen?.orientation?.angle || 0,
    pixelRatio: getDevicePixelRatio()
  };
}