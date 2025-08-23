/* eslint-disable no-unused-vars */
/**
 * Touch Interaction Types for Mobile Cube Controls
 * Implements touch gesture recognition and validation
 */

import { FacePosition, Vector2 } from './index';

export interface TouchInteraction {
  readonly id: number; // Touch identifier
  readonly startPosition: Vector2;
  readonly currentPosition: Vector2;
  readonly timestamp: number;
  readonly targetFace: FacePosition | null;
}

export type GestureDirection = 'up' | 'down' | 'left' | 'right';

export interface TouchGesture {
  readonly type: 'swipe' | 'tap' | 'pinch' | 'rotate';
  readonly direction: GestureDirection;
  readonly velocity: number;
  readonly touches: ReadonlyArray<TouchInteraction>;
  readonly confidence: number; // Gesture recognition confidence (0-1)
}

export interface MobileInputState {
  readonly activeTouches: ReadonlyMap<number, TouchInteraction>;
  readonly currentGesture: TouchGesture | null;
  readonly isGestureInProgress: boolean;
  readonly touchTargetSize: number; // Minimum 44px for accessibility
}

export enum TouchError {
  INVALID_GESTURE = 'INVALID_GESTURE',
  MULTI_TOUCH_CONFLICT = 'MULTI_TOUCH_CONFLICT',
  TOUCH_TARGET_TOO_SMALL = 'TOUCH_TARGET_TOO_SMALL',
  GESTURE_TIMEOUT = 'GESTURE_TIMEOUT',
}

export type TouchOperationResult<T> = 
  | { success: true; data: T }
  | { success: false; error: TouchError; message: string };

export interface TouchPerformanceCritical {
  // Touch functions must execute within 32ms for mobile responsiveness
  readonly executionTime: '32ms';
  readonly memoryAllocation: 'minimal';
  readonly batteryOptimized: true;
}

export interface AccessibleTouchTarget {
  readonly minimumSize: 44; // px - WCAG AA compliance
  readonly targetExpansion: 'invisible-overlay'; // Expand touch area beyond visual face
  readonly visualFeedback: 'immediate'; // <32ms response to touch
  readonly contrastRatio: 3; // Minimum for touch state indicators
}

export interface TouchParameters {
  readonly direction: GestureDirection;
  readonly velocity: number;
  readonly targetFace: FacePosition;
  readonly startPosition: Vector2;
  readonly endPosition: Vector2;
}

export type TouchGestureType = 'swipe' | 'tap' | 'pinch' | 'rotate';

export interface AccessibilityResult {
  readonly isCompliant: boolean;
  readonly violations: ReadonlyArray<string>;
  readonly touchTargetsChecked: number;
}

export interface PerformanceMetrics {
  readonly responseTime: number; // ms
  readonly frameRate: number; // fps
  readonly memoryUsage: number; // MB
  readonly batteryImpact: 'low' | 'medium' | 'high';
}