/**
 * Touch Utilities Test Suite
 * Tests for touch event handling and coordinate conversion utilities
 */

import {
  touchEventToVector2,
  createTouchInteraction,
  calculateTouchDistance,
  calculateTouchVelocity,
  isSignificantTouchMovement,
  validateTouchTargetSize,
  preventDefaultTouchBehavior,
  isTouchDevice,
  getDevicePixelRatio,
  getViewportInfo,
} from '../../src/utils/touchUtils';
import { TouchError, Vector2 } from '@rubiks-cube/shared/types';

// Mock DOM elements
const createMockContainer = (width = 800, height = 600) => {
  const container = document.createElement('div');
  container.getBoundingClientRect = jest.fn(() => ({
    left: 0,
    top: 0,
    width,
    height,
    right: width,
    bottom: height,
    x: 0,
    y: 0,
    toJSON: () => {},
  }));
  return container;
};

const createMockTouch = (
  identifier: number,
  clientX: number,
  clientY: number
): Touch => ({
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

const createMockTouchEvent = (
  type: string,
  touches: Touch[],
  preventDefault = jest.fn(),
  stopPropagation = jest.fn()
) => ({
  type,
  touches: touches as any,
  changedTouches: touches as any,
  targetTouches: touches as any,
  preventDefault,
  stopPropagation,
} as unknown as TouchEvent);

describe('touchEventToVector2', () => {
  test('should convert touch coordinates to normalized device coordinates', () => {
    const container = createMockContainer(800, 600);
    const touch = createMockTouch(0, 400, 300); // Center of container
    
    const result = touchEventToVector2(touch, container);
    
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.x).toBeCloseTo(0, 5); // Center X = 0 in NDC
      expect(result.data.y).toBeCloseTo(0, 5); // Center Y = 0 in NDC
    }
  });

  test('should handle top-left corner correctly', () => {
    const container = createMockContainer(800, 600);
    const touch = createMockTouch(0, 0, 0);
    
    const result = touchEventToVector2(touch, container);
    
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.x).toBeCloseTo(-1, 5); // Left edge = -1 in NDC
      expect(result.data.y).toBeCloseTo(1, 5);  // Top edge = 1 in NDC (flipped Y)
    }
  });

  test('should handle bottom-right corner correctly', () => {
    const container = createMockContainer(800, 600);
    const touch = createMockTouch(0, 800, 600);
    
    const result = touchEventToVector2(touch, container);
    
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.x).toBeCloseTo(1, 5);  // Right edge = 1 in NDC
      expect(result.data.y).toBeCloseTo(-1, 5); // Bottom edge = -1 in NDC (flipped Y)
    }
  });

  test('should handle errors gracefully', () => {
    const container = null as any;
    const touch = createMockTouch(0, 400, 300);
    
    const result = touchEventToVector2(touch, container);
    
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe(TouchError.INVALID_GESTURE);
    }
  });
});

describe('createTouchInteraction', () => {
  test('should create valid TouchInteraction from Touch event', () => {
    const container = createMockContainer();
    const touch = createMockTouch(1, 400, 300);
    
    const result = createTouchInteraction(touch, container);
    
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.id).toBe(1);
      expect(result.data.startPosition.x).toBeCloseTo(0, 5);
      expect(result.data.startPosition.y).toBeCloseTo(0, 5);
      expect(result.data.currentPosition).toEqual(result.data.startPosition);
      expect(result.data.targetFace).toBeNull();
      expect(typeof result.data.timestamp).toBe('number');
    }
  });

  test('should propagate coordinate conversion errors', () => {
    const container = null as any;
    const touch = createMockTouch(1, 400, 300);
    
    const result = createTouchInteraction(touch, container);
    
    expect(result.success).toBe(false);
  });
});

describe('calculateTouchDistance', () => {
  test('should calculate distance between two points correctly', () => {
    const pos1: Vector2 = { x: 0, y: 0 };
    const pos2: Vector2 = { x: 3, y: 4 };
    
    const distance = calculateTouchDistance(pos1, pos2);
    
    expect(distance).toBe(5); // 3-4-5 triangle
  });

  test('should return zero for identical points', () => {
    const pos: Vector2 = { x: 1, y: 2 };
    
    const distance = calculateTouchDistance(pos, pos);
    
    expect(distance).toBe(0);
  });

  test('should handle negative coordinates', () => {
    const pos1: Vector2 = { x: -2, y: -1 };
    const pos2: Vector2 = { x: 1, y: 3 };
    
    const distance = calculateTouchDistance(pos1, pos2);
    
    expect(distance).toBe(5); // sqrt((1-(-2))^2 + (3-(-1))^2) = sqrt(9+16) = 5
  });
});

describe('calculateTouchVelocity', () => {
  test('should calculate velocity correctly', () => {
    const startPos: Vector2 = { x: 0, y: 0 };
    const endPos: Vector2 = { x: 3, y: 4 };
    const timeDelta = 1000; // 1 second
    
    const velocity = calculateTouchVelocity(startPos, endPos, timeDelta);
    
    expect(velocity).toBe(5); // 5 pixels per second
  });

  test('should handle zero time delta', () => {
    const startPos: Vector2 = { x: 0, y: 0 };
    const endPos: Vector2 = { x: 10, y: 10 };
    const timeDelta = 0;
    
    const velocity = calculateTouchVelocity(startPos, endPos, timeDelta);
    
    expect(velocity).toBe(0);
  });

  test('should handle negative time delta', () => {
    const startPos: Vector2 = { x: 0, y: 0 };
    const endPos: Vector2 = { x: 10, y: 10 };
    const timeDelta = -100;
    
    const velocity = calculateTouchVelocity(startPos, endPos, timeDelta);
    
    expect(velocity).toBe(0);
  });
});

describe('isSignificantTouchMovement', () => {
  test('should detect significant movement above threshold', () => {
    const startPos: Vector2 = { x: 0, y: 0 };
    const currentPos: Vector2 = { x: 0.2, y: 0 };
    const threshold = 0.1;
    
    const isSignificant = isSignificantTouchMovement(startPos, currentPos, threshold);
    
    expect(isSignificant).toBe(true);
  });

  test('should not detect movement below threshold', () => {
    const startPos: Vector2 = { x: 0, y: 0 };
    const currentPos: Vector2 = { x: 0.05, y: 0 };
    const threshold = 0.1;
    
    const isSignificant = isSignificantTouchMovement(startPos, currentPos, threshold);
    
    expect(isSignificant).toBe(false);
  });

  test('should use default threshold when not provided', () => {
    const startPos: Vector2 = { x: 0, y: 0 };
    const currentPos: Vector2 = { x: 0.15, y: 0 };
    
    const isSignificant = isSignificantTouchMovement(startPos, currentPos);
    
    expect(isSignificant).toBe(true); // Default threshold is 0.1
  });
});

describe('validateTouchTargetSize', () => {
  test('should validate element meets minimum size requirement', () => {
    const element = document.createElement('div');
    element.getBoundingClientRect = jest.fn(() => ({
      width: 50,
      height: 50,
      left: 0,
      top: 0,
      right: 50,
      bottom: 50,
      x: 0,
      y: 0,
      toJSON: () => {},
    }));
    
    const isValid = validateTouchTargetSize(element, 44);
    
    expect(isValid).toBe(true);
  });

  test('should reject element below minimum size', () => {
    const element = document.createElement('div');
    element.getBoundingClientRect = jest.fn(() => ({
      width: 30,
      height: 30,
      left: 0,
      top: 0,
      right: 30,
      bottom: 30,
      x: 0,
      y: 0,
      toJSON: () => {},
    }));
    
    const isValid = validateTouchTargetSize(element, 44);
    
    expect(isValid).toBe(false);
  });

  test('should use default minimum size when not provided', () => {
    const element = document.createElement('div');
    element.getBoundingClientRect = jest.fn(() => ({
      width: 40,
      height: 40,
      left: 0,
      top: 0,
      right: 40,
      bottom: 40,
      x: 0,
      y: 0,
      toJSON: () => {},
    }));
    
    const isValid = validateTouchTargetSize(element);
    
    expect(isValid).toBe(false); // Default minimum is 44px
  });
});

describe('preventDefaultTouchBehavior', () => {
  test('should call preventDefault and stopPropagation', () => {
    const preventDefault = jest.fn();
    const stopPropagation = jest.fn();
    const touchEvent = createMockTouchEvent('touchstart', [], preventDefault, stopPropagation);
    
    preventDefaultTouchBehavior(touchEvent);
    
    expect(preventDefault).toHaveBeenCalled();
    expect(stopPropagation).toHaveBeenCalled();
  });
});

describe('device detection utilities', () => {
  beforeEach(() => {
    // Reset window properties before each test
    delete (window as any).ontouchstart;
    Object.defineProperty(navigator, 'maxTouchPoints', {
      writable: true,
      value: 0,
    });
  });

  describe('isTouchDevice', () => {
    test('should detect touch support via ontouchstart', () => {
      (window as any).ontouchstart = null;
      
      const isTouch = isTouchDevice();
      
      expect(isTouch).toBe(true);
    });

    test('should detect touch support via maxTouchPoints', () => {
      Object.defineProperty(navigator, 'maxTouchPoints', {
        writable: true,
        value: 5,
      });
      
      const isTouch = isTouchDevice();
      
      expect(isTouch).toBe(true);
    });

    test('should return false when no touch support detected', () => {
      const isTouch = isTouchDevice();
      
      expect(isTouch).toBe(false);
    });
  });

  describe('getDevicePixelRatio', () => {
    test('should return window.devicePixelRatio when available', () => {
      Object.defineProperty(window, 'devicePixelRatio', {
        writable: true,
        value: 2,
      });
      
      const ratio = getDevicePixelRatio();
      
      expect(ratio).toBe(2);
    });

    test('should return 1 as fallback', () => {
      Object.defineProperty(window, 'devicePixelRatio', {
        writable: true,
        value: undefined,
      });
      
      const ratio = getDevicePixelRatio();
      
      expect(ratio).toBe(1);
    });
  });

  describe('getViewportInfo', () => {
    test('should return viewport information', () => {
      Object.defineProperty(window, 'innerWidth', { writable: true, value: 390 });
      Object.defineProperty(window, 'innerHeight', { writable: true, value: 844 });
      Object.defineProperty(window, 'devicePixelRatio', { writable: true, value: 3 });
      
      const viewportInfo = getViewportInfo();
      
      expect(viewportInfo.width).toBe(390);
      expect(viewportInfo.height).toBe(844);
      expect(viewportInfo.pixelRatio).toBe(3);
      expect(typeof viewportInfo.orientation).toBe('number');
    });
  });
});

describe('debounceTouch', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test('should debounce function calls', () => {
    const { debounceTouch } = require('../../src/utils/touchUtils');
    const mockFn = jest.fn();
    const debouncedFn = debounceTouch(mockFn, 100);
    
    debouncedFn('arg1');
    debouncedFn('arg2');
    debouncedFn('arg3');
    
    expect(mockFn).not.toHaveBeenCalled();
    
    jest.advanceTimersByTime(100);
    
    expect(mockFn).toHaveBeenCalledTimes(1);
    expect(mockFn).toHaveBeenCalledWith('arg3');
  });

  test('should reset timer on subsequent calls', () => {
    const { debounceTouch } = require('../../src/utils/touchUtils');
    const mockFn = jest.fn();
    const debouncedFn = debounceTouch(mockFn, 100);
    
    debouncedFn('arg1');
    jest.advanceTimersByTime(50);
    debouncedFn('arg2');
    jest.advanceTimersByTime(50);
    
    expect(mockFn).not.toHaveBeenCalled();
    
    jest.advanceTimersByTime(50);
    
    expect(mockFn).toHaveBeenCalledTimes(1);
    expect(mockFn).toHaveBeenCalledWith('arg2');
  });
});