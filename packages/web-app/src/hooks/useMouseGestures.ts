import React, { useState, useCallback, useRef, useEffect } from 'react';
import { 
  MousePosition, 
  DragGesture, 
  GestureRecognitionOptions,
  CursorState 
} from '@rubiks-cube/shared/types';
import { DebugLogger, MouseGestureDebugger } from '../utils/debugLogger';

interface UseMouseGesturesOptions extends GestureRecognitionOptions {
  /* eslint-disable no-unused-vars */
  onDragStart?: (gesture: DragGesture) => void;
  onDragUpdate?: (gesture: DragGesture) => void;
  onDragEnd?: (gesture: DragGesture) => void;
  onHover?: (position: MousePosition) => void;
  onLeave?: () => void;
  /* eslint-enable no-unused-vars */
}

interface UseMouseGesturesReturn {
  isDragging: boolean;
  currentGesture: DragGesture | null;
  cursorState: CursorState;
  handlers: {
    /* eslint-disable no-unused-vars */
    onMouseDown: (event: React.MouseEvent) => void;
    onMouseMove: (event: React.MouseEvent) => void;
    onMouseUp: (event: React.MouseEvent) => void;
    onMouseLeave: (event: React.MouseEvent) => void;
    onMouseEnter: (event: React.MouseEvent) => void;
    /* eslint-enable no-unused-vars */
  };
}

const DEFAULT_OPTIONS: GestureRecognitionOptions = {
  minDragDistance: 5, // pixels
  maxDragTime: 5000, // 5 seconds
  snapThreshold: 15, // degrees
  sensitivity: 1.0,
};

export function useMouseGestures(
  options: Partial<UseMouseGesturesOptions> = {}
): UseMouseGesturesReturn {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  
  const [isDragging, setIsDragging] = useState(false);
  const [currentGesture, setCurrentGesture] = useState<DragGesture | null>(null);
  const [cursorState, setCursorState] = useState<CursorState>(CursorState.DEFAULT);
  
  const gestureRef = useRef<DragGesture | null>(null);
  const isMouseDownRef = useRef(false);
  const animationFrameRef = useRef<number>();
  const activeGestureIdRef = useRef<string | null>(null);

  // Helper function to get mouse position from event
  const getMousePosition = useCallback((event: React.MouseEvent): MousePosition => {
    return {
      x: event.clientX,
      y: event.clientY,
    };
  }, []);

  // Calculate drag delta and distance
  const calculateDelta = useCallback((
    start: MousePosition, 
    current: MousePosition
  ) => {
    const deltaX = current.x - start.x;
    const deltaY = current.y - start.y;
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    
    return {
      deltaX,
      deltaY,
      distance,
    };
  }, []);

  // Update gesture state
  const updateGesture = useCallback((
    startPos: MousePosition,
    currentPos: MousePosition,
    startTime: number,
    previousGesture?: DragGesture
  ): DragGesture => {
    const now = performance.now();
    const { deltaX, deltaY } = calculateDelta(startPos, currentPos);
    
    return {
      // Preserve any additional properties from previous gesture (like gestureId)
      ...(previousGesture && { ...(previousGesture as any) }),
      // Core gesture properties (these will override any preserved properties)
      startPosition: startPos,
      currentPosition: currentPos,
      delta: { deltaX, deltaY },
      isActive: true,
      startTime,
      duration: now - startTime,
    };
  }, [calculateDelta]);

  // Handle mouse down
  const handleMouseDown = useCallback((event: React.MouseEvent) => {
    const gestureId = MouseGestureDebugger.startGestureTracking('MOUSE_DOWN');
    activeGestureIdRef.current = gestureId;
    
    MouseGestureDebugger.trackGestureStep(gestureId, 'POSITION', {
      x: event.clientX,
      y: event.clientY,
      button: event.button
    });
    
    event.preventDefault();
    
    const position = getMousePosition(event);
    const startTime = performance.now();
    
    DebugLogger.debug('useMouseGestures', 'Mouse position calculated', position);
    window.console.log('🎮 useMouseGestures: Mouse down position calculated', position);
    
    const initialGesture: DragGesture = {
      startPosition: position,
      currentPosition: position,
      delta: { deltaX: 0, deltaY: 0 },
      isActive: true,
      startTime,
      duration: 0,
    };
    
    gestureRef.current = initialGesture;
    isMouseDownRef.current = true;
    setCursorState(CursorState.GRABBING);
    
    DebugLogger.debug('useMouseGestures', 'Gesture state updated', {
      gestureRef: initialGesture,
      isMouseDown: isMouseDownRef.current,
      cursorState: CursorState.GRABBING,
    });
    
    MouseGestureDebugger.trackGestureStep(gestureId, 'DRAG_START_CALLBACK');
    opts.onDragStart?.(initialGesture);
  }, [getMousePosition, opts]);

  // Handle mouse move
  const handleMouseMove = useCallback((event: React.MouseEvent) => {
    event.preventDefault();
    
    const currentPosition = getMousePosition(event);
    
    if (activeGestureIdRef.current && isMouseDownRef.current) {
      MouseGestureDebugger.trackGestureStep(activeGestureIdRef.current, 'MOUSE_MOVE', {
        x: currentPosition.x,
        y: currentPosition.y
      });
    }
    
    // Handle hover when not dragging
    if (!isMouseDownRef.current) {
      setCursorState(CursorState.HOVER);
      opts.onHover?.(currentPosition);
      return;
    }
    
    // Handle drag update
    if (gestureRef.current) {
      const { distance, deltaX, deltaY } = calculateDelta(
        gestureRef.current.startPosition, 
        currentPosition
      );
      
      if (activeGestureIdRef.current) {
        MouseGestureDebugger.trackGestureStep(activeGestureIdRef.current, 'MOVEMENT_CHECK', {
          distance,
          deltaX,
          deltaY,
          threshold: opts.minDragDistance,
          thresholdMet: distance >= opts.minDragDistance
        });
      }
      
      // Update gesture first
      const updatedGesture = updateGesture(
        gestureRef.current.startPosition,
        currentPosition,
        gestureRef.current.startTime,
        gestureRef.current
      );
      
      gestureRef.current = updatedGesture;
      setCurrentGesture(updatedGesture);
      
      // Check if drag threshold is met
      if (distance >= opts.minDragDistance) {
        if (activeGestureIdRef.current) {
          MouseGestureDebugger.trackGestureStep(activeGestureIdRef.current, 'DRAG_THRESHOLD_MET');
        }
        setIsDragging(true);
        setCursorState(CursorState.ROTATING);
      }
      
      // Check for timeout
      if (updatedGesture.duration > opts.maxDragTime) {
        if (activeGestureIdRef.current) {
          MouseGestureDebugger.endGestureTracking(activeGestureIdRef.current, 'FAILED', 'timeout');
          activeGestureIdRef.current = null;
        }
        handleMouseUp(event);
        return;
      }
      
      // Always call onDragUpdate when mouse is down and moving
      if (activeGestureIdRef.current) {
        MouseGestureDebugger.trackGestureStep(activeGestureIdRef.current, 'DRAG_UPDATE_CALLBACK');
      }
      opts.onDragUpdate?.(updatedGesture);
    } else if (activeGestureIdRef.current) {
      MouseGestureDebugger.endGestureTracking(activeGestureIdRef.current, 'FAILED', 'no gestureRef');
      activeGestureIdRef.current = null;
    }
  }, [
    getMousePosition, 
    calculateDelta, 
    updateGesture, 
    opts,
    isDragging
  ]);

  // Handle mouse up
  const handleMouseUp = useCallback((event: React.MouseEvent) => {
    const gestureId = activeGestureIdRef.current;
    if (gestureId) {
      MouseGestureDebugger.trackGestureStep(gestureId, 'MOUSE_UP');
    }
    
    event.preventDefault();
    
    if (gestureRef.current) {
      const finalGesture: DragGesture = {
        ...gestureRef.current,
        isActive: false,
        duration: performance.now() - gestureRef.current.startTime,
      };
      
      if (gestureId) {
        MouseGestureDebugger.trackGestureStep(gestureId, 'DRAG_END_CALLBACK', {
          distance: Math.sqrt(finalGesture.delta.deltaX ** 2 + finalGesture.delta.deltaY ** 2),
          duration: finalGesture.duration
        });
      }
      opts.onDragEnd?.(finalGesture);
    } else if (gestureId) {
      MouseGestureDebugger.endGestureTracking(gestureId, 'FAILED', 'no gestureRef on mouse up');
    }
    
    // Reset state
    gestureRef.current = null;
    isMouseDownRef.current = false;
    setIsDragging(false);
    setCurrentGesture(null);
    setCursorState(CursorState.HOVER);
    activeGestureIdRef.current = null;
  }, [opts]);

  // Handle mouse leave
  const handleMouseLeave = useCallback((event: React.MouseEvent) => {
    event.preventDefault();
    
    // End any active drag
    if (isMouseDownRef.current && gestureRef.current) {
      handleMouseUp(event);
    }
    
    setCursorState(CursorState.DEFAULT);
    opts.onLeave?.();
  }, [handleMouseUp, opts]);

  // Handle mouse enter
  const handleMouseEnter = useCallback((event: React.MouseEvent) => {
    event.preventDefault();
    
    if (!isMouseDownRef.current) {
      setCursorState(CursorState.HOVER);
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  // Global mouse up handler for when mouse is released outside component
  useEffect(() => {
    const handleGlobalMouseUp = () => {
      if (isMouseDownRef.current) {
        gestureRef.current = null;
        isMouseDownRef.current = false;
        setIsDragging(false);
        setCurrentGesture(null);
        setCursorState(CursorState.DEFAULT);
      }
    };

    document.addEventListener('mouseup', handleGlobalMouseUp);
    return () => document.removeEventListener('mouseup', handleGlobalMouseUp);
  }, []);

  return {
    isDragging,
    currentGesture,
    cursorState,
    handlers: {
      onMouseDown: handleMouseDown,
      onMouseMove: handleMouseMove,
      onMouseUp: handleMouseUp,
      onMouseLeave: handleMouseLeave,
      onMouseEnter: handleMouseEnter,
    },
  };
}