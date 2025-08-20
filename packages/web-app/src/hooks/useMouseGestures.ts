import React, { useState, useCallback, useRef, useEffect } from 'react';
import { 
  MousePosition, 
  DragGesture, 
  GestureRecognitionOptions,
  CursorState 
} from '@rubiks-cube/shared/types';
import { DebugLogger, MouseGestureDebugger } from '../utils/debugLogger';

interface UseMouseGesturesOptions extends GestureRecognitionOptions {
  onDragStart?: (_gesture: DragGesture) => void;
  onDragUpdate?: (_gesture: DragGesture) => void;
  onDragEnd?: (_gesture: DragGesture) => void;
  onHover?: (_position: MousePosition) => void;
  onLeave?: () => void;
}

interface UseMouseGesturesReturn {
  isDragging: boolean;
  currentGesture: DragGesture | null;
  cursorState: CursorState;
  handlers: {
    onMouseDown: (_event: React.MouseEvent) => void;
    onMouseMove: (_event: React.MouseEvent) => void;
    onMouseUp: (_event: React.MouseEvent) => void;
    onMouseLeave: (_event: React.MouseEvent) => void;
    onMouseEnter: (_event: React.MouseEvent) => void;
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
    startTime: number
  ): DragGesture => {
    const now = performance.now();
    const { deltaX, deltaY } = calculateDelta(startPos, currentPos);
    
    return {
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
    window.console.log('🎮 useMouseGestures: Mouse down event triggered', {
      target: event.target,
      currentTarget: event.currentTarget,
      button: event.button,
      clientX: event.clientX,
      clientY: event.clientY
    });
    
    DebugLogger.group('useMouseGestures', 'Mouse Down Event');
    DebugLogger.info('useMouseGestures', 'Mouse down triggered');
    MouseGestureDebugger.logEventDetails(event, 'MouseDown');
    
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
    
    DebugLogger.info('useMouseGestures', 'Calling onDragStart callback');
    window.console.log('🎮 useMouseGestures: Calling onDragStart with:', initialGesture);
    opts.onDragStart?.(initialGesture);
    DebugLogger.groupEnd();
  }, [getMousePosition, opts]);

  // Handle mouse move
  const handleMouseMove = useCallback((event: React.MouseEvent) => {
    event.preventDefault();
    MouseGestureDebugger.logEventDetails(event, 'MouseMove');
    
    const currentPosition = getMousePosition(event);
    DebugLogger.trace('useMouseGestures', 'Mouse move - position calculated', {
      currentPosition,
      isMouseDown: isMouseDownRef.current,
    });
    
    // Handle hover when not dragging
    if (!isMouseDownRef.current) {
      DebugLogger.trace('useMouseGestures', 'Mouse move - hover mode');
      setCursorState(CursorState.HOVER);
      opts.onHover?.(currentPosition);
      return;
    }
    
    DebugLogger.debug('useMouseGestures', 'Mouse move - drag mode active');
    
    // Handle drag update
    if (gestureRef.current) {
      const { distance, deltaX, deltaY } = calculateDelta(
        gestureRef.current.startPosition, 
        currentPosition
      );
      
      DebugLogger.trace('useMouseGestures', 'Drag delta calculated', {
        distance,
        deltaX,
        deltaY,
        threshold: opts.minDragDistance,
      });
      
      // Update gesture first
      const updatedGesture = updateGesture(
        gestureRef.current.startPosition,
        currentPosition,
        gestureRef.current.startTime
      );
      
      gestureRef.current = updatedGesture;
      setCurrentGesture(updatedGesture);
      
      // Check if drag threshold is met
      if (distance >= opts.minDragDistance) {
        DebugLogger.info('useMouseGestures', 'Drag threshold met!', {
          distance,
          threshold: opts.minDragDistance,
        });
        setIsDragging(true);
        setCursorState(CursorState.ROTATING);
      }
      
      DebugLogger.debug('useMouseGestures', 'Gesture updated', {
        distance,
        deltaX: updatedGesture.delta.deltaX,
        deltaY: updatedGesture.delta.deltaY,
        duration: updatedGesture.duration,
        isDragging,
      });
      
      // Check for timeout
      if (updatedGesture.duration > opts.maxDragTime) {
        DebugLogger.warn('useMouseGestures', 'Gesture timeout exceeded', {
          duration: updatedGesture.duration,
          maxTime: opts.maxDragTime,
        });
        handleMouseUp(event);
        return;
      }
      
      // Always call onDragUpdate when mouse is down and moving
      DebugLogger.trace('useMouseGestures', 'Calling onDragUpdate callback');
      opts.onDragUpdate?.(updatedGesture);
    } else {
      DebugLogger.warn('useMouseGestures', 'No gestureRef.current in drag mode!');
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
    DebugLogger.group('useMouseGestures', 'Mouse Up Event');
    DebugLogger.info('useMouseGestures', 'Mouse up triggered');
    MouseGestureDebugger.logEventDetails(event, 'MouseUp');
    
    event.preventDefault();
    
    if (gestureRef.current) {
      const finalGesture: DragGesture = {
        ...gestureRef.current,
        isActive: false,
        duration: performance.now() - gestureRef.current.startTime,
      };
      
      DebugLogger.debug('useMouseGestures', 'Final gesture calculated', {
        gesture: finalGesture,
        wasActive: gestureRef.current.isActive,
        totalDuration: finalGesture.duration,
      });
      
      DebugLogger.info('useMouseGestures', 'Calling onDragEnd callback');
      window.console.log('🎮 useMouseGestures: Calling onDragEnd with:', finalGesture);
      opts.onDragEnd?.(finalGesture);
    } else {
      DebugLogger.warn('useMouseGestures', 'Mouse up but no gestureRef.current!');
    }
    
    // Reset state
    DebugLogger.debug('useMouseGestures', 'Resetting gesture state');
    gestureRef.current = null;
    isMouseDownRef.current = false;
    setIsDragging(false);
    setCurrentGesture(null);
    setCursorState(CursorState.HOVER);
    DebugLogger.groupEnd();
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