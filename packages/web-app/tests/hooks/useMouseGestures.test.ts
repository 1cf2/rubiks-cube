import { renderHook, act } from '@testing-library/react';
import { useMouseGestures } from '../../src/hooks/useMouseGestures';
import { DragGesture, MousePosition } from '@rubiks-cube/shared/types';

// Mock performance.now()
global.performance.now = jest.fn(() => 1000);

describe('useMouseGestures', () => {
  let mockOnDragStart: jest.Mock;
  let mockOnDragUpdate: jest.Mock;
  let mockOnDragEnd: jest.Mock;
  let mockOnHover: jest.Mock;
  let mockOnLeave: jest.Mock;

  beforeEach(() => {
    mockOnDragStart = jest.fn();
    mockOnDragUpdate = jest.fn();
    mockOnDragEnd = jest.fn();
    mockOnHover = jest.fn();
    mockOnLeave = jest.fn();

    jest.clearAllMocks();
  });

  const createMouseEvent = (clientX: number, clientY: number): React.MouseEvent => {
    return {
      clientX,
      clientY,
      preventDefault: jest.fn(),
    } as any;
  };

  it('should initialize with correct default state', () => {
    const { result } = renderHook(() => useMouseGestures());

    expect(result.current.isDragging).toBe(false);
    expect(result.current.currentGesture).toBe(null);
    expect(result.current.cursorState).toBe('default');
    expect(result.current.handlers).toBeDefined();
  });

  it('should handle mouse down and start gesture', () => {
    const { result } = renderHook(() => 
      useMouseGestures({
        onDragStart: mockOnDragStart,
      })
    );

    const mouseEvent = createMouseEvent(100, 100);

    act(() => {
      result.current.handlers.onMouseDown(mouseEvent);
    });

    expect(result.current.cursorState).toBe('grabbing');
    expect(mockOnDragStart).toHaveBeenCalledWith(
      expect.objectContaining({
        startPosition: { x: 100, y: 100 },
        currentPosition: { x: 100, y: 100 },
        delta: { deltaX: 0, deltaY: 0 },
        isActive: true,
        duration: 0,
      })
    );
  });

  it('should handle mouse move without drag', () => {
    const { result } = renderHook(() => 
      useMouseGestures({
        onHover: mockOnHover,
      })
    );

    const mouseEvent = createMouseEvent(150, 150);

    act(() => {
      result.current.handlers.onMouseMove(mouseEvent);
    });

    expect(result.current.cursorState).toBe('pointer');
    expect(mockOnHover).toHaveBeenCalledWith({ x: 150, y: 150 });
  });

  it('should handle drag update after mouse down', () => {
    const { result } = renderHook(() => 
      useMouseGestures({
        minDragDistance: 5,
        onDragStart: mockOnDragStart,
        onDragUpdate: mockOnDragUpdate,
      })
    );

    // Start drag
    act(() => {
      result.current.handlers.onMouseDown(createMouseEvent(100, 100));
    });

    // Move mouse to trigger drag
    act(() => {
      result.current.handlers.onMouseMove(createMouseEvent(110, 105));
    });

    expect(result.current.isDragging).toBe(true);
    expect(result.current.cursorState).toBe('rotating');
    expect(mockOnDragUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        startPosition: { x: 100, y: 100 },
        currentPosition: { x: 110, y: 105 },
        delta: { deltaX: 10, deltaY: 5 },
        isActive: true,
      })
    );
  });

  it('should not trigger drag if distance is below threshold', () => {
    const { result } = renderHook(() => 
      useMouseGestures({
        minDragDistance: 10,
        onDragUpdate: mockOnDragUpdate,
      })
    );

    // Start drag
    act(() => {
      result.current.handlers.onMouseDown(createMouseEvent(100, 100));
    });

    // Move mouse but stay below threshold
    act(() => {
      result.current.handlers.onMouseMove(createMouseEvent(105, 103));
    });

    expect(result.current.isDragging).toBe(false);
    expect(mockOnDragUpdate).toHaveBeenCalled(); // Still called for updates
  });

  it('should handle mouse up and end drag', () => {
    const { result } = renderHook(() => 
      useMouseGestures({
        onDragStart: mockOnDragStart,
        onDragEnd: mockOnDragEnd,
      })
    );

    // Start and move
    act(() => {
      result.current.handlers.onMouseDown(createMouseEvent(100, 100));
      result.current.handlers.onMouseMove(createMouseEvent(120, 110));
    });

    // End drag
    act(() => {
      result.current.handlers.onMouseUp(createMouseEvent(120, 110));
    });

    expect(result.current.isDragging).toBe(false);
    expect(result.current.currentGesture).toBe(null);
    expect(result.current.cursorState).toBe('pointer');
    expect(mockOnDragEnd).toHaveBeenCalledWith(
      expect.objectContaining({
        startPosition: { x: 100, y: 100 },
        isActive: false,
      })
    );
  });

  it('should handle mouse leave during drag', () => {
    const { result } = renderHook(() => 
      useMouseGestures({
        onDragEnd: mockOnDragEnd,
        onLeave: mockOnLeave,
      })
    );

    // Start drag
    act(() => {
      result.current.handlers.onMouseDown(createMouseEvent(100, 100));
      result.current.handlers.onMouseMove(createMouseEvent(120, 110));
    });

    // Leave during drag
    act(() => {
      result.current.handlers.onMouseLeave(createMouseEvent(0, 0));
    });

    expect(result.current.isDragging).toBe(false);
    expect(result.current.cursorState).toBe('default');
    expect(mockOnDragEnd).toHaveBeenCalled();
    expect(mockOnLeave).toHaveBeenCalled();
  });

  it('should handle mouse enter', () => {
    const { result } = renderHook(() => useMouseGestures());

    act(() => {
      result.current.handlers.onMouseEnter(createMouseEvent(100, 100));
    });

    expect(result.current.cursorState).toBe('pointer');
  });

  it('should timeout long drag gestures', async () => {
    jest.useFakeTimers();
    
    const { result } = renderHook(() => 
      useMouseGestures({
        maxDragTime: 1000,
        onDragEnd: mockOnDragEnd,
      })
    );

    // Start drag
    act(() => {
      result.current.handlers.onMouseDown(createMouseEvent(100, 100));
    });

    // Fast forward time beyond maxDragTime
    act(() => {
      (global.performance.now as jest.Mock).mockReturnValue(2500);
      result.current.handlers.onMouseMove(createMouseEvent(110, 105));
    });

    expect(mockOnDragEnd).toHaveBeenCalled();
    
    jest.useRealTimers();
  });

  it('should handle global mouse up events', () => {
    const { result } = renderHook(() => useMouseGestures());

    // Start drag
    act(() => {
      result.current.handlers.onMouseDown(createMouseEvent(100, 100));
    });

    expect(result.current.cursorState).toBe('grabbing');

    // Simulate global mouse up
    act(() => {
      const globalMouseUpEvent = new Event('mouseup');
      document.dispatchEvent(globalMouseUpEvent);
    });

    expect(result.current.isDragging).toBe(false);
    expect(result.current.cursorState).toBe('default');
  });

  it('should use custom gesture recognition options', () => {
    const { result } = renderHook(() => 
      useMouseGestures({
        minDragDistance: 20,
        maxDragTime: 2000,
        snapThreshold: 30,
        sensitivity: 0.5,
      })
    );

    // Start drag
    act(() => {
      result.current.handlers.onMouseDown(createMouseEvent(100, 100));
    });

    // Move mouse but stay below custom threshold
    act(() => {
      result.current.handlers.onMouseMove(createMouseEvent(115, 105));
    });

    expect(result.current.isDragging).toBe(false); // Below 20px threshold
  });

  it('should cleanup on unmount', () => {
    const { unmount } = renderHook(() => useMouseGestures());

    // Should not throw when unmounting
    expect(() => {
      unmount();
    }).not.toThrow();
  });
});