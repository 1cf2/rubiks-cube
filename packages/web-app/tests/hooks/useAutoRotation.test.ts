import { renderHook, act } from '@testing-library/react';
import { useAutoRotation } from '../../src/hooks/useAutoRotation';

// Mock camera utils
jest.mock('../../src/utils/cameraUtils', () => ({
  getDefaultViewPreferences: jest.fn().mockReturnValue({
    autoRotationSpeed: 0.5,
    autoRotationTimeout: 5000
  })
}));

// Mock requestAnimationFrame and cancelAnimationFrame
const mockRequestAnimationFrame = jest.fn();
const mockCancelAnimationFrame = jest.fn();

// Set up requestAnimationFrame to work with fake timers
let frameId = 0;
const frameCallbacks = new Map<number, FrameRequestCallback>();

mockRequestAnimationFrame.mockImplementation((callback: FrameRequestCallback) => {
  const id = ++frameId;
  frameCallbacks.set(id, callback);
  // Execute callback on next tick with fake timers
  setTimeout(() => {
    if (frameCallbacks.has(id)) {
      frameCallbacks.delete(id);
      callback(performance.now());
    }
  }, 16); // 16ms = ~60fps
  return id;
});

mockCancelAnimationFrame.mockImplementation((id: number) => {
  frameCallbacks.delete(id);
});

Object.defineProperty(window, 'requestAnimationFrame', {
  writable: true,
  value: mockRequestAnimationFrame,
});

Object.defineProperty(window, 'cancelAnimationFrame', {
  writable: true,
  value: mockCancelAnimationFrame,
});

// Mock setTimeout and clearTimeout
jest.useFakeTimers();

describe('useAutoRotation', () => {
  let mockOrbitCamera: jest.Mock;

  beforeEach(() => {
    mockOrbitCamera = jest.fn();
    mockRequestAnimationFrame.mockClear();
    mockCancelAnimationFrame.mockClear();
    jest.clearAllTimers();
    frameCallbacks.clear();
  });

  afterEach(() => {
    jest.clearAllTimers();
  });

  test('should initialize with correct default state', () => {
    const { result } = renderHook(() => useAutoRotation(mockOrbitCamera, true));

    expect(result.current.isRotating).toBe(false);
    expect(result.current.isPaused).toBe(false);
    expect(result.current.isEnabled).toBe(true);
  });

  test('should provide all required API methods', () => {
    const { result } = renderHook(() => useAutoRotation(mockOrbitCamera, true));

    // Check that all expected methods exist
    expect(typeof result.current.startRotation).toBe('function');
    expect(typeof result.current.stopRotation).toBe('function');
    expect(typeof result.current.pauseRotation).toBe('function');
    expect(typeof result.current.resumeRotation).toBe('function');
    expect(typeof result.current.toggleAutoRotation).toBe('function');
    expect(typeof result.current.handleUserInteraction).toBe('function');
    expect(typeof result.current.handleMouseEnter).toBe('function');
    expect(typeof result.current.handleMouseLeave).toBe('function');
    expect(typeof result.current.updateConfig).toBe('function');
    expect(typeof result.current.getConfig).toBe('function');
    expect(typeof result.current.resetIdleTimer).toBe('function');
  });

  test('should call requestAnimationFrame when starting rotation', () => {
    const { result } = renderHook(() => useAutoRotation(mockOrbitCamera, true));

    act(() => {
      result.current.startRotation();
    });

    expect(mockRequestAnimationFrame).toHaveBeenCalled();
  });

  test('should call cancelAnimationFrame when stopping rotation', () => {
    const { result } = renderHook(() => useAutoRotation(mockOrbitCamera, true));

    act(() => {
      result.current.startRotation();
    });

    act(() => {
      result.current.stopRotation();
    });

    expect(mockCancelAnimationFrame).toHaveBeenCalled();
  });

  test('should not call requestAnimationFrame when disabled', () => {
    const { result } = renderHook(() => useAutoRotation(mockOrbitCamera, false));

    act(() => {
      result.current.startRotation();
    });

    expect(mockRequestAnimationFrame).not.toHaveBeenCalled();
  });

  test('should not call requestAnimationFrame without orbitCamera function', () => {
    const { result } = renderHook(() => useAutoRotation(null, true));

    act(() => {
      result.current.startRotation();
    });

    expect(mockRequestAnimationFrame).not.toHaveBeenCalled();
  });

  test('should call orbitCamera with correct parameters during animation', () => {
    const { result } = renderHook(() => useAutoRotation(mockOrbitCamera, true));

    act(() => {
      result.current.startRotation();
    });

    // Advance timers to trigger animation frame
    act(() => {
      jest.advanceTimersByTime(16); // One frame
    });

    expect(mockOrbitCamera).toHaveBeenCalled();
    const [deltaX, deltaY] = mockOrbitCamera.mock.calls[0];
    expect(typeof deltaX).toBe('number');
    expect(deltaY).toBe(0); // Y-axis rotation only
    expect(deltaX).toBeGreaterThan(0);
  });

  test('should start auto-rotation after idle timeout', () => {
    renderHook(() => useAutoRotation(mockOrbitCamera, true));

    expect(mockRequestAnimationFrame).not.toHaveBeenCalled();

    // Fast-forward past the idle timeout
    act(() => {
      jest.advanceTimersByTime(6000); // 6 seconds (more than 5 second timeout)
    });

    expect(mockRequestAnimationFrame).toHaveBeenCalled();
  });

  test('should reset idle timer on user interaction', () => {
    const { result } = renderHook(() => useAutoRotation(mockOrbitCamera, true));

    // Fast-forward time to just before auto-rotation would start
    act(() => {
      jest.advanceTimersByTime(4000); // 4 seconds (less than 5 second timeout)
    });

    expect(mockRequestAnimationFrame).not.toHaveBeenCalled();

    // Trigger user interaction
    act(() => {
      result.current.handleUserInteraction();
    });

    // Fast-forward again
    act(() => {
      jest.advanceTimersByTime(4000); // Another 4 seconds
    });

    // Should still not be rotating because timer was reset
    expect(mockRequestAnimationFrame).not.toHaveBeenCalled();
  });

  test('should update configuration correctly', () => {
    const { result } = renderHook(() => useAutoRotation(mockOrbitCamera, true));

    const newConfig = {
      idleTimeout: 10000,
      rotationSpeed: 1.0
    };

    act(() => {
      result.current.updateConfig(newConfig);
    });

    const config = result.current.getConfig();
    expect(config.idleTimeout).toBe(10000);
    expect(config.rotationSpeed).toBe(1.0);
  });

  test('should handle enable/disable state changes', () => {
    const { result, rerender } = renderHook(
      ({ enabled }) => useAutoRotation(mockOrbitCamera, enabled),
      { initialProps: { enabled: true } }
    );

    // Start rotation when enabled by advancing timers
    act(() => {
      jest.advanceTimersByTime(6000);
    });

    expect(mockRequestAnimationFrame).toHaveBeenCalled();

    // Reset mocks
    mockRequestAnimationFrame.mockClear();

    // Disable auto-rotation
    rerender({ enabled: false });

    expect(result.current.isEnabled).toBe(false);

    // Should not start rotation even after timeout when disabled
    act(() => {
      jest.advanceTimersByTime(6000);
    });

    expect(mockRequestAnimationFrame).not.toHaveBeenCalled();
  });

  test('should cleanup animation frames on unmount', () => {
    const { result, unmount } = renderHook(() => useAutoRotation(mockOrbitCamera, true));

    // Start rotation
    act(() => {
      result.current.startRotation();
    });

    expect(mockRequestAnimationFrame).toHaveBeenCalled();

    unmount();

    // Verify cleanup was called
    expect(mockCancelAnimationFrame).toHaveBeenCalled();
  });

  test('should interrupt rotation on user interaction', () => {
    const { result } = renderHook(() => useAutoRotation(mockOrbitCamera, true));

    // Start auto-rotation via timeout
    act(() => {
      jest.advanceTimersByTime(6000);
    });

    expect(mockRequestAnimationFrame).toHaveBeenCalled();

    // Reset mock to see if stopRotation is called
    mockCancelAnimationFrame.mockClear();

    // User interaction should interrupt rotation
    act(() => {
      result.current.handleUserInteraction();
    });

    expect(mockCancelAnimationFrame).toHaveBeenCalled();
  });

  test('should support pause and resume functionality', () => {
    const { result } = renderHook(() => useAutoRotation(mockOrbitCamera, true));

    // Methods should exist and be callable
    expect(() => {
      act(() => {
        result.current.pauseRotation();
      });
    }).not.toThrow();

    expect(() => {
      act(() => {
        result.current.resumeRotation();
      });
    }).not.toThrow();

    expect(typeof result.current.isPaused).toBe('boolean');
  });

  test('should support mouse enter and leave events', () => {
    const { result } = renderHook(() => useAutoRotation(mockOrbitCamera, true));

    // Methods should exist and be callable
    expect(() => {
      act(() => {
        result.current.handleMouseEnter();
      });
    }).not.toThrow();

    expect(() => {
      act(() => {
        result.current.handleMouseLeave();
      });
    }).not.toThrow();
  });

  test('should support toggle functionality', () => {
    const { result } = renderHook(() => useAutoRotation(mockOrbitCamera, true));

    // Method should exist and be callable
    expect(() => {
      act(() => {
        result.current.toggleAutoRotation();
      });
    }).not.toThrow();
  });
});