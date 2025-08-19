import { useState, useCallback, useRef, useEffect } from 'react';
import { 
  MousePosition, 
  DragGesture, 
  GestureRecognitionOptions,
  CursorState 
} from '@rubiks-cube/shared/types';

interface UseMouseGesturesOptions extends GestureRecognitionOptions {
  onDragStart?: (gesture: DragGesture) => void;
  onDragUpdate?: (gesture: DragGesture) => void;
  onDragEnd?: (gesture: DragGesture) => void;
  onHover?: (position: MousePosition) => void;
  onLeave?: () => void;
}

interface UseMouseGesturesReturn {
  isDragging: boolean;
  currentGesture: DragGesture | null;
  cursorState: CursorState;
  handlers: {
    onMouseDown: (event: React.MouseEvent) => void;
    onMouseMove: (event: React.MouseEvent) => void;
    onMouseUp: (event: React.MouseEvent) => void;
    onMouseLeave: (event: React.MouseEvent) => void;
    onMouseEnter: (event: React.MouseEvent) => void;
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
    console.log('useMouseGestures: Mouse down triggered');
    event.preventDefault();
    
    const position = getMousePosition(event);
    const startTime = performance.now();
    
    console.log('useMouseGestures: Mouse position:', position);
    
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
    
    console.log('useMouseGestures: Calling onDragStart with gesture:', initialGesture);
    opts.onDragStart?.(initialGesture);
  }, [getMousePosition, opts]);

  // Handle mouse move
  const handleMouseMove = useCallback((event: React.MouseEvent) => {
    event.preventDefault();
    
    const currentPosition = getMousePosition(event);
    
    // Handle hover when not dragging
    if (!isMouseDownRef.current) {
      setCursorState(CursorState.HOVER);
      opts.onHover?.(currentPosition);
      return;
    }
    
    // Handle drag update
    if (gestureRef.current) {
      const { distance } = calculateDelta(
        gestureRef.current.startPosition, 
        currentPosition
      );
      
      // Check if drag threshold is met
      if (distance >= opts.minDragDistance) {
        setIsDragging(true);
        setCursorState(CursorState.ROTATING);
      }
      
      // Update gesture
      const updatedGesture = updateGesture(
        gestureRef.current.startPosition,
        currentPosition,
        gestureRef.current.startTime
      );
      
      gestureRef.current = updatedGesture;
      setCurrentGesture(updatedGesture);
      
      // Check for timeout
      if (updatedGesture.duration > opts.maxDragTime) {
        handleMouseUp(event);
        return;
      }
      
      opts.onDragUpdate?.(updatedGesture);
    }
  }, [
    getMousePosition, 
    calculateDelta, 
    updateGesture, 
    opts
  ]);

  // Handle mouse up
  const handleMouseUp = useCallback((event: React.MouseEvent) => {
    event.preventDefault();
    
    if (gestureRef.current) {
      const finalGesture: DragGesture = {
        ...gestureRef.current,
        isActive: false,
        duration: performance.now() - gestureRef.current.startTime,
      };
      
      opts.onDragEnd?.(finalGesture);
    }
    
    // Reset state
    gestureRef.current = null;
    isMouseDownRef.current = false;
    setIsDragging(false);
    setCurrentGesture(null);
    setCursorState(CursorState.HOVER);
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