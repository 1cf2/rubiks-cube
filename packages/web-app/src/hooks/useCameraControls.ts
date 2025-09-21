import { useCallback, useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { 
  CameraState, 
  CameraInputEvent, 
  CameraOperationResult,
  CameraError,
  DeviceCameraConfig,
  CameraConstraints,
  CameraPerformanceMetrics
} from '@rubiks-cube/shared';
import { OrbitCameraManager } from '@rubiks-cube/three-renderer/cameras/OrbitCameraManager';
import { CameraInputProcessor } from '@rubiks-cube/three-renderer/controls/CameraInputProcessor';
import { 
  getDeviceCameraConfig, 
  getDefaultCameraConstraints,
  getDefaultViewPreferences,
  serializeCameraState,
  deserializeCameraState,
  validateCameraState
} from '../utils/cameraUtils';

/**
 * Camera controls hook for managing Three.js camera interactions
 */
export function useCameraControls(
  scene: THREE.Scene | null,
  camera: THREE.PerspectiveCamera | null,
  canvas: HTMLCanvasElement | null
) {
  // State
  const [cameraState, setCameraState] = useState<CameraState | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [performanceMetrics, setPerformanceMetrics] = useState<CameraPerformanceMetrics>({
    frameRate: 0,
    inputLatency: 0,
    animationDuration: 0,
    memoryUsage: 0
  });

  // Refs for managers
  const orbitManagerRef = useRef<OrbitCameraManager | null>(null);
  const inputProcessorRef = useRef<CameraInputProcessor | null>(null);
  const deviceConfigRef = useRef<DeviceCameraConfig>(getDeviceCameraConfig());
  const constraintsRef = useRef<CameraConstraints>(getDefaultCameraConstraints());

  // Performance monitoring
  const performanceUpdateRef = useRef<number>();

  /**
   * Initialize camera controls
   */
  useEffect(() => {
    if (!scene || !camera || !canvas) {
      return;
    }

    try {
      // Create orbit camera manager
      orbitManagerRef.current = new OrbitCameraManager(
        camera,
        scene,
        constraintsRef.current
      );

      // Create input processor
      inputProcessorRef.current = new CameraInputProcessor(deviceConfigRef.current);

      // Set initial camera state
      const initialState = orbitManagerRef.current.getCameraState();
      setCameraState(initialState);
      setIsInitialized(true);

      // Try to restore saved camera state
      restoreCameraState();

      window.console.log('Camera controls initialized');
    } catch (error) {
      window.console.error('Failed to initialize camera controls:', error);
    }

    return () => {
      if (orbitManagerRef.current) {
        orbitManagerRef.current.dispose();
      }
      if (inputProcessorRef.current) {
        inputProcessorRef.current.dispose();
      }
      if (performanceUpdateRef.current) {
        cancelAnimationFrame(performanceUpdateRef.current);
      }
    };
  }, [scene, camera, canvas]);

  /**
   * Handle camera input events
   */
  const handleCameraInput = useCallback((inputEvent: CameraInputEvent): CameraOperationResult<void> => {
    if (!orbitManagerRef.current || !inputEvent) {
      return { success: false, error: CameraError.INVALID_CAMERA_STATE };
    }

    try {
      const { gesture, parameters } = inputEvent;
      let result: CameraOperationResult<void | Promise<void>>;

      switch (gesture) {
        case 'orbit':
          result = orbitManagerRef.current.orbit(
            parameters.deltaX || 0,
            parameters.deltaY || 0,
            parameters.speed || 1.0
          );
          break;

        case 'zoom':
          result = orbitManagerRef.current.zoom(parameters.zoomDelta || 0);
          break;

        case 'reset':
          const defaultPrefs = getDefaultViewPreferences();
          result = orbitManagerRef.current.resetPosition(defaultPrefs.defaultCameraPosition);
          break;

        default:
          return { success: false, error: CameraError.INVALID_CAMERA_STATE };
      }

      if (result.success) {
        // Update camera state
        const newState = orbitManagerRef.current.getCameraState();
        setCameraState(newState);
        
        // Save camera state if persistence is enabled
        saveCameraState(newState);
        
        return { success: true, data: undefined };
      } else {
        return { success: false, error: result.error || CameraError.INVALID_CAMERA_STATE };
      }
    } catch (error) {
      console.error('Camera input handling error:', error);
      return { success: false, error: CameraError.INVALID_CAMERA_STATE };
    }
  }, []);

  /**
   * Set up event listeners for camera input
   */
  useEffect(() => {
    if (!canvas || !inputProcessorRef.current) {
      return;
    }

    const processor = inputProcessorRef.current;

    // Mouse event handlers
    const handleMouseEvent = (event: MouseEvent) => {
      const result = processor.processMouseInput(event, canvas);
      if (result.success && result.data) {
        handleCameraInput(result.data);
      }
    };

    // Touch event handlers
    const handleTouchEvent = (event: TouchEvent) => {
      console.log('🪲 useCameraControls: Touch event reached camera handler', { type: event.type, touchesLength: event.touches.length, targetTouchesLength: event.targetTouches.length, changedTouchesLength: event.changedTouches.length });
      const result = processor.processTouchInput(event, canvas);
      if (result.success && result.data) {
        console.log('🪲 useCameraControls: Processed touch input to gesture', { gesture: result.data.gesture, touches: event.touches.length });
        handleCameraInput(result.data);
      } else {
        console.log('🪲 useCameraControls: Touch input processing failed or no gesture', { success: result.success, error: !result.success ? result.error : undefined });
      }
    };

    // Keyboard event handlers
    const handleKeyboardEvent = (event: KeyboardEvent) => {
      const result = processor.processKeyboardInput(event);
      if (result.success && result.data) {
        handleCameraInput(result.data);
      }
    };

    // Prevent context menu on right-click
    const preventContextMenu = (event: MouseEvent) => {
      if (event.button === 2) {
        event.preventDefault();
      }
    };

    // Add event listeners
    canvas.addEventListener('mousedown', handleMouseEvent);
    canvas.addEventListener('mousemove', handleMouseEvent);
    canvas.addEventListener('mouseup', handleMouseEvent);
    canvas.addEventListener('wheel', handleMouseEvent, { passive: false });
    canvas.addEventListener('contextmenu', preventContextMenu);

    console.log('🪲 useCameraControls: Attaching touch listeners to canvas');
    canvas.addEventListener('touchstart', handleTouchEvent, { passive: false });
    canvas.addEventListener('touchmove', handleTouchEvent, { passive: false });
    canvas.addEventListener('touchend', handleTouchEvent, { passive: false });

    window.addEventListener('keydown', handleKeyboardEvent);

    return () => {
      canvas.removeEventListener('mousedown', handleMouseEvent);
      canvas.removeEventListener('mousemove', handleMouseEvent);
      canvas.removeEventListener('mouseup', handleMouseEvent);
      canvas.removeEventListener('wheel', handleMouseEvent);
      canvas.removeEventListener('contextmenu', preventContextMenu);

      canvas.removeEventListener('touchstart', handleTouchEvent);
      canvas.removeEventListener('touchmove', handleTouchEvent);
      canvas.removeEventListener('touchend', handleTouchEvent);

      window.removeEventListener('keydown', handleKeyboardEvent);
    };
  }, [canvas, handleCameraInput]);

  /**
   * Performance monitoring loop
   */
  useEffect(() => {
    if (!orbitManagerRef.current || !inputProcessorRef.current) {
      return;
    }

    const updatePerformance = () => {
      if (orbitManagerRef.current && inputProcessorRef.current) {
        const cameraMetrics = orbitManagerRef.current.updatePerformanceMetrics();
        const inputLatency = inputProcessorRef.current.getAverageInputLatency();
        
        setPerformanceMetrics({
          ...cameraMetrics,
          inputLatency
        });
      }

      performanceUpdateRef.current = requestAnimationFrame(updatePerformance);
    };

    performanceUpdateRef.current = requestAnimationFrame(updatePerformance);

    return () => {
      if (performanceUpdateRef.current) {
        cancelAnimationFrame(performanceUpdateRef.current);
      }
    };
  }, [isInitialized]);

  /**
   * Update device configuration on window resize
   */
  useEffect(() => {
    const handleResize = () => {
      const newConfig = getDeviceCameraConfig();
      deviceConfigRef.current = newConfig;
      
      if (inputProcessorRef.current) {
        inputProcessorRef.current.updateDeviceConfig(newConfig);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  /**
   * Save camera state to local storage
   */
  const saveCameraState = useCallback((state: CameraState) => {
    const prefs = getDefaultViewPreferences();
    if (!prefs.persistCameraState) {
      return;
    }

    try {
      const serialized = serializeCameraState(state);
      if (serialized) {
        localStorage.setItem('rubiks-cube-camera-state', serialized);
      }
    } catch (error) {
      window.console.log('Failed to save camera state:', error);
    }
  }, []);

  /**
   * Restore camera state from local storage
   */
  const restoreCameraState = useCallback(() => {
    if (!orbitManagerRef.current) {
      return;
    }

    try {
      const saved = localStorage.getItem('rubiks-cube-camera-state');
      if (!saved) {
        return;
      }

      const state = deserializeCameraState(saved);
      if (!state || !validateCameraState(state)) {
        return;
      }

      // Restore camera position
      const result = orbitManagerRef.current.setPosition(state.position);
      if (result.success) {
        const newState = orbitManagerRef.current.getCameraState();
        setCameraState(newState);
        window.console.log('Camera state restored from local storage');
      }
    } catch (error) {
      window.console.log('Failed to restore camera state:', error);
    }
  }, []);

  /**
   * Reset camera to default position
   */
  const resetCamera = useCallback((): CameraOperationResult<void> => {
    if (!orbitManagerRef.current) {
      return { success: false, error: CameraError.INVALID_CAMERA_STATE };
    }

    const defaultPrefs = getDefaultViewPreferences();
    const result = orbitManagerRef.current.resetPosition(defaultPrefs.defaultCameraPosition);
    
    if (result.success) {
      const newState = orbitManagerRef.current.getCameraState();
      setCameraState(newState);
      saveCameraState(newState);
      
      return { success: true, data: undefined };
    } else {
      return { success: false, error: result.error || CameraError.INVALID_CAMERA_STATE };
    }
  }, [saveCameraState]);

  /**
   * Manually trigger camera orbit
   */
  const orbitCamera = useCallback((deltaX: number, deltaY: number): CameraOperationResult<void> => {
    const inputEvent: CameraInputEvent = {
      type: 'keyboard',
      gesture: 'orbit',
      parameters: {
        type: 'orbit',
        deltaX,
        deltaY,
        timestamp: performance.now()
      },
      deviceConfig: deviceConfigRef.current
    };

    return handleCameraInput(inputEvent);
  }, [handleCameraInput]);

  /**
   * Manually trigger camera zoom
   */
  const zoomCamera = useCallback((delta: number): CameraOperationResult<void> => {
    const inputEvent: CameraInputEvent = {
      type: 'keyboard',
      gesture: 'zoom',
      parameters: {
        type: 'zoom',
        zoomDelta: delta,
        timestamp: performance.now()
      },
      deviceConfig: deviceConfigRef.current
    };

    return handleCameraInput(inputEvent);
  }, [handleCameraInput]);

  return {
    // State
    cameraState,
    isInitialized,
    performanceMetrics,
    
    // Controls
    resetCamera,
    orbitCamera,
    zoomCamera,
    
    // Managers (for advanced use)
    orbitManager: orbitManagerRef.current,
    inputProcessor: inputProcessorRef.current,
    
    // Configuration
    deviceConfig: deviceConfigRef.current,
    constraints: constraintsRef.current
  };
}