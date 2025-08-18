import { useCallback, useEffect, useRef, useState } from 'react';
import { AutoRotationConfig } from '@rubiks-cube/shared';
import { getDefaultViewPreferences } from '../utils/cameraUtils';

/**
 * Hook for managing auto-rotation of the cube when idle
 */
export function useAutoRotation(
  orbitCamera: ((deltaX: number, deltaY: number) => any) | null,
  isEnabled: boolean = true
) {
  const [isRotating, setIsRotating] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  
  const idleTimerRef = useRef<number>();
  const rotationFrameRef = useRef<number>();
  const lastInteractionRef = useRef<number>(Date.now());
  const rotationAngleRef = useRef<number>(0);
  
  const configRef = useRef<AutoRotationConfig>({
    idleTimeout: 5000, // 5 seconds
    rotationSpeed: 0.5, // radians per second
    rotationAxis: { x: 0, y: 1, z: 0 }, // Y-axis rotation
    pauseOnHover: true,
    interruptOnInput: true,
    resumeDelay: 2000 // 2 seconds before auto-rotation can resume
  });

  /**
   * Start the auto-rotation animation
   */
  const startRotation = useCallback(() => {
    if (!orbitCamera || !isEnabled) {
      return;
    }

    setIsRotating(true);
    setIsPaused(false);
    
    const animate = () => {
      // Use refs for current state to avoid stale closures
      if (!rotationFrameRef.current) {
        return; // Animation was stopped
      }

      const rotationDelta = configRef.current.rotationSpeed * 0.016; // 60fps target
      
      // Apply rotation around Y-axis (horizontal rotation)
      if (orbitCamera) {
        orbitCamera(rotationDelta, 0);
      }
      
      rotationAngleRef.current += rotationDelta;
      
      // Continue animation
      rotationFrameRef.current = requestAnimationFrame(animate);
    };
    
    rotationFrameRef.current = requestAnimationFrame(animate);
  }, [orbitCamera, isEnabled]);

  /**
   * Stop the auto-rotation animation
   */
  const stopRotation = useCallback(() => {
    setIsRotating(false);
    
    if (rotationFrameRef.current) {
      cancelAnimationFrame(rotationFrameRef.current);
      rotationFrameRef.current = undefined;
    }
  }, []);

  /**
   * Pause auto-rotation temporarily
   */
  const pauseRotation = useCallback(() => {
    setIsPaused(true);
  }, []);

  /**
   * Resume auto-rotation if it was paused
   */
  const resumeRotation = useCallback(() => {
    setIsPaused(false);
  }, []);

  /**
   * Reset the idle timer
   */
  const resetIdleTimer = useCallback(() => {
    lastInteractionRef.current = Date.now();
    
    // Stop current rotation if interruption is enabled
    if (configRef.current.interruptOnInput && isRotating) {
      stopRotation();
    }
    
    // Clear existing idle timer
    if (idleTimerRef.current) {
      clearTimeout(idleTimerRef.current);
    }
    
    // Set new idle timer
    if (isEnabled) {
      idleTimerRef.current = window.setTimeout(() => {
        if (Date.now() - lastInteractionRef.current >= configRef.current.idleTimeout) {
          startRotation();
        }
      }, configRef.current.idleTimeout);
    }
  }, [isEnabled, isRotating, startRotation, stopRotation]);

  /**
   * Handle user interaction that should interrupt auto-rotation
   */
  const handleUserInteraction = useCallback(() => {
    resetIdleTimer();
    
    // Stop rotation immediately on user interaction
    if (isRotating && configRef.current.interruptOnInput) {
      stopRotation();
      
      // Add resume delay
      setTimeout(() => {
        if (isEnabled) {
          resetIdleTimer();
        }
      }, configRef.current.resumeDelay);
    }
  }, [isEnabled, isRotating, resetIdleTimer, stopRotation]);

  /**
   * Handle mouse hover events
   */
  const handleMouseEnter = useCallback(() => {
    if (configRef.current.pauseOnHover) {
      pauseRotation();
    }
  }, [pauseRotation]);

  const handleMouseLeave = useCallback(() => {
    if (configRef.current.pauseOnHover && isPaused) {
      resumeRotation();
    }
  }, [isPaused, resumeRotation]);

  /**
   * Update auto-rotation configuration
   */
  const updateConfig = useCallback((newConfig: Partial<AutoRotationConfig>) => {
    configRef.current = { ...configRef.current, ...newConfig };
  }, []);

  /**
   * Get current auto-rotation configuration
   */
  const getConfig = useCallback(() => configRef.current, []);

  /**
   * Toggle auto-rotation on/off
   */
  const toggleAutoRotation = useCallback(() => {
    if (isRotating) {
      stopRotation();
    } else if (isEnabled) {
      startRotation();
    }
  }, [isEnabled, isRotating, startRotation, stopRotation]);

  // Initialize with default preferences
  useEffect(() => {
    const prefs = getDefaultViewPreferences();
    updateConfig({
      rotationSpeed: prefs.autoRotationSpeed,
      idleTimeout: prefs.autoRotationTimeout
    });
  }, [updateConfig]);

  // Start idle detection when enabled
  useEffect(() => {
    if (isEnabled) {
      resetIdleTimer();
    } else {
      stopRotation();
      if (idleTimerRef.current) {
        clearTimeout(idleTimerRef.current);
        idleTimerRef.current = undefined;
      }
    }

    return () => {
      if (idleTimerRef.current) {
        clearTimeout(idleTimerRef.current);
      }
      if (rotationFrameRef.current) {
        cancelAnimationFrame(rotationFrameRef.current);
      }
    };
  }, [isEnabled, resetIdleTimer, stopRotation]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopRotation();
      if (idleTimerRef.current) {
        clearTimeout(idleTimerRef.current);
      }
    };
  }, [stopRotation]);

  return {
    // State
    isRotating,
    isPaused,
    isEnabled,
    
    // Controls
    startRotation,
    stopRotation,
    pauseRotation,
    resumeRotation,
    toggleAutoRotation,
    
    // Event handlers
    handleUserInteraction,
    handleMouseEnter,
    handleMouseLeave,
    
    // Configuration
    updateConfig,
    getConfig,
    
    // Manual control
    resetIdleTimer
  };
}