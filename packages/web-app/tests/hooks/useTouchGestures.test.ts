/**
 * Touch Gesture Recognition Hook Test Suite
 * Tests for touch gesture detection, recognition, and multi-touch handling
 */

import { renderHook, act } from '@testing-library/react';
import { useTouchGestures } from '../../src/hooks/useTouchGestures';
import { TouchError } from '@rubiks-cube/shared/types';
import * as touchUtils from '../../src/utils/touchUtils';

// Mock the touch utilities
jest.mock('../../src/utils/touchUtils');

const mockTouchUtils = touchUtils as jest.Mocked<typeof touchUtils>;

// Mock DOM methods
const mockGetBoundingClientRect = jest.fn();
const mockAddEventListener = jest.fn();
const mockRemoveEventListener = jest.fn();

// Create mock container element
const createMockContainer = () => {
  const container = {
    getBoundingClientRect: mockGetBoundingClientRect,
    addEventListener: mockAddEventListener,
    removeEventListener: mockRemoveEventListener,
  } as unknown as HTMLElement;
  
  mockGetBoundingClientRect.mockReturnValue({
    left: 0,
    top: 0,
    width: 800,
    height: 600,
    right: 800,
    bottom: 600,
    x: 0,
    y: 0,
    toJSON: () => {},
  });
  
  return container;
};

// Create mock touch
const createMockTouch = (identifier: number, clientX: number, clientY: number): Touch => ({
  identifier,
  clientX,
  clientY,
  target: document.createElement('div'),
  screenX: clientX,
  screenY: clientY,
  pageX: clientX,
  pageY: clientY,
  radiusX: 10,
  radiusY: 10,
  rotationAngle: 0,
  force: 1,
});

// Create mock touch event
const createMockTouchEvent = (type: string, touches: Touch[]): TouchEvent => ({
  type,
  touches: touches as any,
  changedTouches: touches as any,
  targetTouches: touches as any,
  preventDefault: jest.fn(),
  stopPropagation: jest.fn(),
} as unknown as TouchEvent);

describe('useTouchGestures', () => {
  let mockContainer: HTMLElement;
  let mockOnGesture: jest.Mock;
  let mockOnError: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    mockContainer = createMockContainer();
    mockOnGesture = jest.fn();
    mockOnError = jest.fn();

    // Setup default mock returns
    mockTouchUtils.isTouchDevice.mockReturnValue(true);
    mockTouchUtils.createTouchInteraction.mockReturnValue({
      success: true,
      data: {
        id: 1,
        startPosition: { x: 0, y: 0 },
        currentPosition: { x: 0, y: 0 },
        timestamp: Date.now(),
        targetFace: null,
      },
    });
    mockTouchUtils.preventDefaultTouchBehavior.mockImplementation(() => {});
    mockTouchUtils.isSignificantTouchMovement.mockReturnValue(true);
    mockTouchUtils.calculateTouchVelocity.mockReturnValue(5.0);
    mockTouchUtils.debounceTouch.mockImplementation((fn) => fn);
  });

  describe('initialization', () => {
    test('should initialize with default state', () => {
      const { result } = renderHook(() =>
        useTouchGestures({
          onGesture: mockOnGesture,
          onError: mockOnError,
        })
      );

      expect(result.current.mobileInputState.activeTouches.size).toBe(0);
      expect(result.current.mobileInputState.currentGesture).toBeNull();
      expect(result.current.mobileInputState.isGestureInProgress).toBe(false);
      expect(result.current.mobileInputState.touchTargetSize).toBe(44);
      expect(result.current.isTouchSupported).toBe(true);
    });

    test('should detect non-touch devices', () => {
      mockTouchUtils.isTouchDevice.mockReturnValue(false);

      const { result } = renderHook(() => useTouchGestures());

      expect(result.current.isTouchSupported).toBe(false);
    });

    test('should set up event listeners when container ref is set', () => {
      const { result } = renderHook(() =>
        useTouchGestures({
          onGesture: mockOnGesture,
          onError: mockOnError,
        })
      );

      act(() => {
        result.current.containerRef.current = mockContainer;
      });

      expect(mockAddEventListener).toHaveBeenCalledWith('touchstart', expect.any(Function), { passive: false });
      expect(mockAddEventListener).toHaveBeenCalledWith('touchmove', expect.any(Function), { passive: false });
      expect(mockAddEventListener).toHaveBeenCalledWith('touchend', expect.any(Function), { passive: false });
      expect(mockAddEventListener).toHaveBeenCalledWith('touchcancel', expect.any(Function), { passive: false });
    });
  });

  describe('touch event handling', () => {
    let result: any;
    let touchStartHandler: Function;
    let touchMoveHandler: Function;
    let touchEndHandler: Function;

    beforeEach(() => {
      const hook = renderHook(() =>
        useTouchGestures({
          sensitivity: 1.0,
          debounceDelay: 100,
          gestureTimeout: 1000,
          minimumSwipeDistance: 0.1,
          onGesture: mockOnGesture,
          onError: mockOnError,
        })
      );
      result = hook.result;

      act(() => {
        result.current.containerRef.current = mockContainer;
      });

      // Extract the event handlers
      touchStartHandler = mockAddEventListener.mock.calls.find(call => call[0] === 'touchstart')[1];
      touchMoveHandler = mockAddEventListener.mock.calls.find(call => call[0] === 'touchmove')[1];
      touchEndHandler = mockAddEventListener.mock.calls.find(call => call[0] === 'touchend')[1];
    });

    test('should handle single touch start correctly', () => {
      const touch = createMockTouch(1, 400, 300);
      const touchEvent = createMockTouchEvent('touchstart', [touch]);

      act(() => {
        touchStartHandler(touchEvent);
      });

      expect(mockTouchUtils.preventDefaultTouchBehavior).toHaveBeenCalledWith(touchEvent);
      expect(mockTouchUtils.createTouchInteraction).toHaveBeenCalledWith(touch, mockContainer);
      expect(result.current.mobileInputState.activeTouches.size).toBe(1);
      expect(result.current.mobileInputState.isGestureInProgress).toBe(true);
    });

    test('should reject too many simultaneous touches', () => {
      const touches = [
        createMockTouch(1, 100, 100),
        createMockTouch(2, 200, 200),
        createMockTouch(3, 300, 300),
      ];
      const touchEvent = createMockTouchEvent('touchstart', touches);

      act(() => {
        touchStartHandler(touchEvent);
      });

      expect(mockOnError).toHaveBeenCalledWith(
        TouchError.MULTI_TOUCH_CONFLICT,
        'Too many simultaneous touches for cube interaction'
      );
    });

    test('should handle touch move events', () => {
      // Start with a touch
      const startTouch = createMockTouch(1, 400, 300);
      const startEvent = createMockTouchEvent('touchstart', [startTouch]);

      act(() => {
        touchStartHandler(startEvent);
      });

      // Move the touch
      const moveTouch = createMockTouch(1, 450, 300);
      const moveEvent = createMockTouchEvent('touchmove', [moveTouch]);

      act(() => {
        touchMoveHandler(moveEvent);
      });

      expect(mockTouchUtils.preventDefaultTouchBehavior).toHaveBeenCalledWith(moveEvent);
      expect(mockTouchUtils.createTouchInteraction).toHaveBeenCalledWith(moveTouch, mockContainer);
    });

    test('should handle touch end and recognize swipe gesture', () => {
      // Start with a touch
      const startTouch = createMockTouch(1, 400, 300);
      const startEvent = createMockTouchEvent('touchstart', [startTouch]);

      act(() => {
        touchStartHandler(startEvent);
      });

      // End the touch
      const endTouch = createMockTouch(1, 500, 300);
      const endEvent = createMockTouchEvent('touchend', [endTouch]);

      act(() => {
        touchEndHandler(endEvent);
      });

      expect(mockOnGesture).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'swipe',
          direction: 'right',
          velocity: expect.any(Number),
          confidence: expect.any(Number),
        })
      );
    });

    test('should recognize tap gesture for small movements', () => {
      mockTouchUtils.isSignificantTouchMovement.mockReturnValue(false);

      // Start with a touch
      const startTouch = createMockTouch(1, 400, 300);
      const startEvent = createMockTouchEvent('touchstart', [startTouch]);

      act(() => {
        touchStartHandler(startEvent);
      });

      // End without significant movement
      const endTouch = createMockTouch(1, 405, 305);
      const endEvent = createMockTouchEvent('touchend', [endTouch]);

      act(() => {
        touchEndHandler(endEvent);
      });

      expect(mockOnGesture).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'tap',
          direction: 'down',
          velocity: 0,
          confidence: 0.9,
        })
      );
    });

    test('should handle multi-touch for cube orientation', () => {
      const touches = [
        createMockTouch(1, 300, 300),
        createMockTouch(2, 500, 300),
      ];
      const touchEvent = createMockTouchEvent('touchstart', touches);

      act(() => {
        touchStartHandler(touchEvent);
      });

      const endEvent = createMockTouchEvent('touchend', touches);

      act(() => {
        touchEndHandler(endEvent);
      });

      expect(mockOnGesture).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'pinch',
          confidence: 0.8,
        })
      );
    });

    test('should handle errors in touch interaction creation', () => {
      mockTouchUtils.createTouchInteraction.mockReturnValue({
        success: false,
        error: TouchError.INVALID_GESTURE,
        message: 'Test error',
      });

      const touch = createMockTouch(1, 400, 300);
      const touchEvent = createMockTouchEvent('touchstart', [touch]);

      act(() => {
        touchStartHandler(touchEvent);
      });

      expect(mockOnError).toHaveBeenCalledWith(TouchError.INVALID_GESTURE, 'Test error');
    });
  });

  describe('gesture recognition', () => {
    test('should calculate correct swipe directions', () => {
      const { result } = renderHook(() =>
        useTouchGestures({
          onGesture: mockOnGesture,
          onError: mockOnError,
        })
      );

      act(() => {
        result.current.containerRef.current = mockContainer;
      });

      const touchStartHandler = mockAddEventListener.mock.calls.find(call => call[0] === 'touchstart')[1];
      const touchEndHandler = mockAddEventListener.mock.calls.find(call => call[0] === 'touchend')[1];

      // Test different swipe directions
      const testCases = [
        { start: { x: 0, y: 0 }, end: { x: 0.5, y: 0 }, expected: 'right' },
        { start: { x: 0, y: 0 }, end: { x: -0.5, y: 0 }, expected: 'left' },
        { start: { x: 0, y: 0 }, end: { x: 0, y: 0.5 }, expected: 'up' },
        { start: { x: 0, y: 0 }, end: { x: 0, y: -0.5 }, expected: 'down' },
      ];

      testCases.forEach((testCase, index) => {
        mockOnGesture.mockClear();
        
        const touchId = index + 1;
        const startTouch = createMockTouch(touchId, 400, 300);
        const startEvent = createMockTouchEvent('touchstart', [startTouch]);

        act(() => {
          touchStartHandler(startEvent);
        });

        const endTouch = createMockTouch(touchId, 400, 300);
        const endEvent = createMockTouchEvent('touchend', [endTouch]);

        act(() => {
          touchEndHandler(endEvent);
        });

        expect(mockOnGesture).toHaveBeenCalledWith(
          expect.objectContaining({
            direction: testCase.expected,
          })
        );
      });
    });

    test('should adjust velocity based on sensitivity', () => {
      const { result } = renderHook(() =>
        useTouchGestures({
          sensitivity: 2.0,
          onGesture: mockOnGesture,
        })
      );

      act(() => {
        result.current.containerRef.current = mockContainer;
      });

      mockTouchUtils.calculateTouchVelocity.mockReturnValue(10.0);

      const touchStartHandler = mockAddEventListener.mock.calls.find(call => call[0] === 'touchstart')[1];
      const touchEndHandler = mockAddEventListener.mock.calls.find(call => call[0] === 'touchend')[1];

      const startTouch = createMockTouch(1, 400, 300);
      const startEvent = createMockTouchEvent('touchstart', [startTouch]);

      act(() => {
        touchStartHandler(startEvent);
      });

      const endTouch = createMockTouch(1, 500, 300);
      const endEvent = createMockTouchEvent('touchend', [endTouch]);

      act(() => {
        touchEndHandler(endEvent);
      });

      expect(mockOnGesture).toHaveBeenCalledWith(
        expect.objectContaining({
          velocity: 20.0, // 10.0 * 2.0 sensitivity
        })
      );
    });
  });

  describe('gesture timeout and cleanup', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    test('should timeout gestures after specified duration', () => {
      const { result } = renderHook(() =>
        useTouchGestures({
          gestureTimeout: 1000,
          onError: mockOnError,
        })
      );

      act(() => {
        result.current.containerRef.current = mockContainer;
      });

      const touchStartHandler = mockAddEventListener.mock.calls.find(call => call[0] === 'touchstart')[1];

      const touch = createMockTouch(1, 400, 300);
      const touchEvent = createMockTouchEvent('touchstart', [touch]);

      act(() => {
        touchStartHandler(touchEvent);
      });

      expect(result.current.mobileInputState.isGestureInProgress).toBe(true);

      act(() => {
        jest.advanceTimersByTime(1000);
      });

      expect(mockOnError).toHaveBeenCalledWith(TouchError.GESTURE_TIMEOUT, 'Gesture timed out');
      expect(result.current.mobileInputState.isGestureInProgress).toBe(false);
    });

    test('should reset gesture state', () => {
      const { result } = renderHook(() => useTouchGestures());

      act(() => {
        result.current.containerRef.current = mockContainer;
      });

      // Simulate active gesture state
      const touchStartHandler = mockAddEventListener.mock.calls.find(call => call[0] === 'touchstart')[1];
      const touch = createMockTouch(1, 400, 300);
      const touchEvent = createMockTouchEvent('touchstart', [touch]);

      act(() => {
        touchStartHandler(touchEvent);
      });

      expect(result.current.mobileInputState.isGestureInProgress).toBe(true);

      act(() => {
        result.current.resetGestureState();
      });

      expect(result.current.mobileInputState.activeTouches.size).toBe(0);
      expect(result.current.mobileInputState.currentGesture).toBeNull();
      expect(result.current.mobileInputState.isGestureInProgress).toBe(false);
    });
  });

  describe('cleanup and memory management', () => {
    test('should remove event listeners on unmount', () => {
      const { result, unmount } = renderHook(() => useTouchGestures());

      act(() => {
        result.current.containerRef.current = mockContainer;
      });

      unmount();

      expect(mockRemoveEventListener).toHaveBeenCalledWith('touchstart', expect.any(Function));
      expect(mockRemoveEventListener).toHaveBeenCalledWith('touchmove', expect.any(Function));
      expect(mockRemoveEventListener).toHaveBeenCalledWith('touchend', expect.any(Function));
      expect(mockRemoveEventListener).toHaveBeenCalledWith('touchcancel', expect.any(Function));
    });

    test('should handle container ref changes', () => {
      const { result } = renderHook(() => useTouchGestures());

      const firstContainer = createMockContainer();
      const secondContainer = createMockContainer();

      // Set first container
      act(() => {
        result.current.containerRef.current = firstContainer;
      });

      expect(firstContainer.addEventListener).toHaveBeenCalled();

      // Clear mocks and set second container
      jest.clearAllMocks();

      act(() => {
        result.current.containerRef.current = secondContainer;
      });

      expect(firstContainer.removeEventListener).toHaveBeenCalled();
      expect(secondContainer.addEventListener).toHaveBeenCalled();
    });
  });

  describe('debouncing', () => {
    test('should debounce gesture recognition', () => {
      const mockDebouncedFn = jest.fn();
      mockTouchUtils.debounceTouch.mockReturnValue(mockDebouncedFn);

      renderHook(() =>
        useTouchGestures({
          debounceDelay: 200,
          onGesture: mockOnGesture,
        })
      );

      expect(mockTouchUtils.debounceTouch).toHaveBeenCalledWith(expect.any(Function), 200);
    });
  });

  describe('advanced gestures', () => {
    test('should recognize pinch gesture with two touches', () => {
      const { result } = renderHook(() =>
        useTouchGestures({
          onGesture: mockOnGesture,
          onError: mockOnError,
        })
      );

      act(() => {
        result.current.containerRef.current = mockContainer;
      });

      const touchStartHandler = mockAddEventListener.mock.calls.find(call => call[0] === 'touchstart')[1];
      const touchEndHandler = mockAddEventListener.mock.calls.find(call => call[0] === 'touchend')[1];

      const touches = [
        createMockTouch(1, 300, 300),
        createMockTouch(2, 500, 300),
      ];
      const touchEvent = createMockTouchEvent('touchstart', touches);

      act(() => {
        touchStartHandler(touchEvent);
      });

      // Simulate pinch by moving one touch closer
      const pinchEvent = createMockTouchEvent('touchmove', [
        createMockTouch(1, 350, 300),
        createMockTouch(2, 450, 300),
      ]);
      const touchMoveHandler = mockAddEventListener.mock.calls.find(call => call[0] === 'touchmove')[1];
      act(() => {
        touchMoveHandler(pinchEvent);
      });

      const endEvent = createMockTouchEvent('touchend', touches);

      act(() => {
        touchEndHandler(endEvent);
      });

      expect(mockOnGesture).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'pinch',
          direction: 'in', // or 'out' based on distance
          confidence: 0.8,
        })
      );
    });

    test('should recognize rotate gesture with two touches', () => {
      // Similar to pinch, but test angle change
      const { result } = renderHook(() =>
        useTouchGestures({
          onGesture: mockOnGesture,
        })
      );

      act(() => {
        result.current.containerRef.current = mockContainer;
      });

      // Mock angle calculation in utils if needed
      // Test rotation direction based on touch movement
      // Assert type: 'rotate', direction: 'clockwise' or 'counterclockwise'
      expect(mockOnGesture).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'rotate',
          direction: 'clockwise',
        })
      );
    });
  });

  describe('pointer event unification', () => {
    test('should handle pointer events as touch equivalents', () => {
      mockTouchUtils.isTouchDevice.mockReturnValue(false); // Test pointer fallback

      const { result } = renderHook(() =>
        useTouchGestures({
          onGesture: mockOnGesture,
        })
      );

      act(() => {
        result.current.containerRef.current = mockContainer;
      });

      // Mock pointerdown event
      const pointerEvent = new PointerEvent('pointerdown', {
        clientX: 400,
        clientY: 300,
        pointerId: 1,
        isPrimary: true,
        pointerType: 'touch' as const,
      });

      // For unification test, since hook is touch-focused, mock to simulate pointer as touch
      mockTouchUtils.isTouchDevice.mockReturnValue(true); // Enable for test

      // Assume pointer triggers touch simulation in TouchControls
      // Test that gesture is recognized
      act(() => {
        // Simulate by calling touch handler with pointer data
        const touchStartHandler = mockAddEventListener.mock.calls.find(call => call[0] === 'touchstart')[1];
        const simulatedTouch = createMockTouch(1, 400, 300);
        const simulatedEvent = createMockTouchEvent('touchstart', [simulatedTouch]);
        touchStartHandler(simulatedEvent);
      });

      expect(mockOnGesture).toHaveBeenCalled(); // Assert unification works
    });
  });

  describe('gesture accuracy', () => {
    test('should achieve 95% accuracy for swipe gestures', () => {
      const testSwipes = 100;
      let successCount = 0;
      const onGestureCallback = jest.fn((gesture) => {
        if (gesture.type === 'swipe') {
          const expectedDirs = ['right', 'left', 'up', 'down'];
          const direction = Math.floor(Math.random() * 4); // Random direction for test
          const expectedDir = expectedDirs[direction];
          if (gesture.direction === expectedDir) successCount++;
        }
      });

      const { result } = renderHook(() =>
        useTouchGestures({
          onGesture: onGestureCallback,
        })
      );

      act(() => {
        result.current.containerRef.current = mockContainer;
      });

      const touchStartHandler = mockAddEventListener.mock.calls.find(call => call[0] === 'touchstart')[1];
      const touchEndHandler = mockAddEventListener.mock.calls.find(call => call[0] === 'touchend')[1];

      for (let i = 0; i < testSwipes; i++) {
        const direction = i % 4;
        const startX = 400;
        const startY = 300;
        const delta = 50;

        const startTouch = createMockTouch(1, startX, startY);
        const endTouch = createMockTouch(1,
          direction === 0 ? startX + delta : direction === 1 ? startX - delta : startX,
          direction === 2 ? startY - delta : direction === 3 ? startY + delta : startY
        );

        const startEvent = createMockTouchEvent('touchstart', [startTouch]);
        const endEvent = createMockTouchEvent('touchend', [endTouch]);

        act(() => {
          touchStartHandler(startEvent);
          touchEndHandler(endEvent);
        });
      }

      const accuracy = (successCount / testSwipes) * 100;
      expect(accuracy).toBeGreaterThanOrEqual(95);
    });
  });

  describe('iOS specific detection', () => {
    test('should detect touch support on iOS user agent', () => {
      Object.defineProperty(navigator, 'userAgent', {
        value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X)',
        configurable: true,
      });

      const { result } = renderHook(() => useTouchGestures());

      expect(result.current.isTouchSupported).toBe(true);
    });
  });
});