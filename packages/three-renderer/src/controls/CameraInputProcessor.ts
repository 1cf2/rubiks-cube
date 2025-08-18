import { 
  CameraInputEvent,
  DeviceCameraConfig,
  CameraOperationResult,
  CameraError
} from '@rubiks-cube/shared';

/**
 * CameraInputProcessor - Processes input events for camera controls
 * Handles right-click, two-finger touch, and keyboard input for camera operations
 */
export class CameraInputProcessor {
  private deviceConfig: DeviceCameraConfig;
  private inputLatencyTracker: number[] = [];
  private readonly LATENCY_SAMPLE_SIZE = 30;

  // Gesture state tracking
  private isDragging: boolean = false;
  private lastMousePosition: { x: number; y: number } = { x: 0, y: 0 };
  
  // Touch state for two-finger gestures
  private touchState: {
    touches: TouchList | null;
    lastTouchPositions: { x: number; y: number }[];
    initialDistance: number;
  } = {
    touches: null,
    lastTouchPositions: [],
    initialDistance: 0
  };

  constructor(deviceConfig: DeviceCameraConfig) {
    this.deviceConfig = deviceConfig;
  }

  /**
   * Process mouse input for camera controls
   */
  public processMouseInput(
    event: MouseEvent,
    canvas: HTMLCanvasElement
  ): CameraOperationResult<CameraInputEvent | null> {
    const inputStartTime = performance.now();

    try {
      // Only process right-click for camera controls
      if (event.button !== 2) {
        return { success: true, data: null };
      }

      const rect = canvas.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;

      let cameraEvent: CameraInputEvent | null = null;

      switch (event.type) {
        case 'mousedown':
          cameraEvent = this.handleMouseDown(x, y);
          break;
        case 'mousemove':
          cameraEvent = this.handleMouseMove(x, y, inputStartTime);
          break;
        case 'mouseup':
          cameraEvent = this.handleMouseUp();
          break;
        case 'wheel':
          const wheelEvent = event as WheelEvent;
          cameraEvent = this.handleMouseWheel(x, y, wheelEvent.deltaY, inputStartTime);
          break;
      }

      this.updateInputLatency(inputStartTime);
      return { success: true, data: cameraEvent };
    } catch (error) {
      return { success: false, error: CameraError.INVALID_CAMERA_STATE };
    }
  }

  /**
   * Process touch input for camera controls
   */
  public processTouchInput(
    event: TouchEvent,
    canvas: HTMLCanvasElement
  ): CameraOperationResult<CameraInputEvent | null> {
    const inputStartTime = performance.now();

    try {
      // Only process two-finger touches for camera controls
      if (event.touches.length !== 2) {
        this.resetTouchState();
        return { success: true, data: null };
      }

      const rect = canvas.getBoundingClientRect();
      let cameraEvent: CameraInputEvent | null = null;

      switch (event.type) {
        case 'touchstart':
          cameraEvent = this.handleTouchStart(event.touches, rect, inputStartTime);
          break;
        case 'touchmove':
          cameraEvent = this.handleTouchMove(event.touches, rect, inputStartTime);
          break;
        case 'touchend':
          cameraEvent = this.handleTouchEnd(event.touches, rect, inputStartTime);
          break;
      }

      this.updateInputLatency(inputStartTime);
      return { success: true, data: cameraEvent };
    } catch (error) {
      return { success: false, error: CameraError.INVALID_CAMERA_STATE };
    }
  }

  /**
   * Process keyboard input for camera controls
   */
  public processKeyboardInput(event: KeyboardEvent): CameraOperationResult<CameraInputEvent | null> {
    if (!this.deviceConfig.keyboardShortcuts) {
      return { success: true, data: null };
    }

    const inputStartTime = performance.now();

    try {
      let cameraEvent: CameraInputEvent | null = null;

      // Handle reset view shortcuts (spacebar or R key)
      if ((event.code === 'Space' || event.code === 'KeyR') && event.type === 'keydown') {
        event.preventDefault();
        
        cameraEvent = {
          type: 'keyboard',
          gesture: 'reset',
          parameters: {
            type: 'reset',
            timestamp: inputStartTime
          },
          deviceConfig: this.deviceConfig
        };
      }

      this.updateInputLatency(inputStartTime);
      return { success: true, data: cameraEvent };
    } catch (error) {
      return { success: false, error: CameraError.INVALID_CAMERA_STATE };
    }
  }

  /**
   * Handle mouse down for orbit controls
   */
  private handleMouseDown(x: number, y: number): CameraInputEvent | null {
    this.isDragging = true;
    this.lastMousePosition = { x, y };
    
    return null; // No immediate camera event, wait for drag
  }

  /**
   * Handle mouse move for orbit controls
   */
  private handleMouseMove(x: number, y: number, timestamp: number): CameraInputEvent | null {
    if (!this.isDragging) {
      return null;
    }

    const deltaX = x - this.lastMousePosition.x;
    const deltaY = y - this.lastMousePosition.y;
    
    // Check gesture dead zone
    const deadZone = this.deviceConfig.gestureDeadZone || 0;
    if (Math.abs(deltaX) < deadZone && Math.abs(deltaY) < deadZone) {
      return null;
    }

    this.lastMousePosition = { x, y };

    return {
      type: 'mouse',
      gesture: 'orbit',
      parameters: {
        type: 'orbit',
        deltaX: deltaX * this.deviceConfig.orbitSensitivity,
        deltaY: deltaY * this.deviceConfig.orbitSensitivity,
        timestamp
      },
      deviceConfig: this.deviceConfig
    };
  }

  /**
   * Handle mouse up to end orbit controls
   */
  private handleMouseUp(): CameraInputEvent | null {
    this.isDragging = false;
    return null;
  }

  /**
   * Handle mouse wheel for zoom controls
   */
  private handleMouseWheel(_x: number, _y: number, deltaY: number, timestamp: number): CameraInputEvent | null {
    const zoomDelta = -deltaY * 0.001 * this.deviceConfig.zoomSensitivity;

    return {
      type: 'mouse',
      gesture: 'zoom',
      parameters: {
        type: 'zoom',
        zoomDelta,
        timestamp
      },
      deviceConfig: this.deviceConfig
    };
  }

  /**
   * Handle touch start for two-finger gestures
   */
  private handleTouchStart(touches: TouchList, rect: DOMRect, _timestamp: number): CameraInputEvent | null {
    this.touchState.touches = touches;
    this.touchState.lastTouchPositions = Array.from(touches).map(touch => ({
      x: touch.clientX - rect.left,
      y: touch.clientY - rect.top
    }));

    // Calculate initial distance for pinch-to-zoom
    if (touches.length === 2 && this.touchState.lastTouchPositions.length >= 2) {
      const pos0 = this.touchState.lastTouchPositions[0];
      const pos1 = this.touchState.lastTouchPositions[1];
      if (pos0 && pos1) {
        const dx = pos0.x - pos1.x;
        const dy = pos0.y - pos1.y;
        this.touchState.initialDistance = Math.sqrt(dx * dx + dy * dy);
      }
    }

    return null; // No immediate camera event, wait for move
  }

  /**
   * Handle touch move for two-finger gestures
   */
  private handleTouchMove(touches: TouchList, rect: DOMRect, timestamp: number): CameraInputEvent | null {
    if (!this.touchState.touches || touches.length !== 2) {
      return null;
    }

    const currentPositions = Array.from(touches).map(touch => ({
      x: touch.clientX - rect.left,
      y: touch.clientY - rect.top
    }));

    // Calculate movement delta for orbit
    const lastPos0 = this.touchState.lastTouchPositions[0];
    const lastPos1 = this.touchState.lastTouchPositions[1];
    const currPos0 = currentPositions[0];
    const currPos1 = currentPositions[1];
    
    if (!lastPos0 || !lastPos1 || !currPos0 || !currPos1) {
      return null;
    }
    
    const deltaX = (currPos0.x - lastPos0.x + currPos1.x - lastPos1.x) / 2;
    const deltaY = (currPos0.y - lastPos0.y + currPos1.y - lastPos1.y) / 2;

    // Calculate distance change for zoom
    const currentDistance = Math.sqrt(
      Math.pow(currPos0.x - currPos1.x, 2) +
      Math.pow(currPos0.y - currPos1.y, 2)
    );
    const distanceChange = currentDistance - this.touchState.initialDistance;

    // Check gesture dead zone
    const deadZone = this.deviceConfig.gestureDeadZone || 10;
    
    this.touchState.lastTouchPositions = currentPositions;

    // Determine primary gesture (orbit vs zoom)
    if (Math.abs(distanceChange) > deadZone && Math.abs(distanceChange) > Math.abs(deltaX) + Math.abs(deltaY)) {
      // Pinch-to-zoom gesture
      const zoomDelta = distanceChange * 0.001 * this.deviceConfig.zoomSensitivity;
      this.touchState.initialDistance = currentDistance;

      return {
        type: 'touch',
        gesture: 'zoom',
        parameters: {
          type: 'zoom',
          zoomDelta,
          timestamp
        },
        deviceConfig: this.deviceConfig
      };
    } else if (Math.abs(deltaX) > deadZone || Math.abs(deltaY) > deadZone) {
      // Two-finger orbit gesture
      return {
        type: 'touch',
        gesture: 'orbit',
        parameters: {
          type: 'orbit',
          deltaX: deltaX * this.deviceConfig.orbitSensitivity,
          deltaY: deltaY * this.deviceConfig.orbitSensitivity,
          timestamp
        },
        deviceConfig: this.deviceConfig
      };
    }

    return null;
  }

  /**
   * Handle touch end to reset touch state
   */
  private handleTouchEnd(_touches: TouchList, _rect: DOMRect, _timestamp: number): CameraInputEvent | null {
    this.resetTouchState();
    return null;
  }

  /**
   * Reset touch gesture state
   */
  private resetTouchState(): void {
    this.touchState.touches = null;
    this.touchState.lastTouchPositions = [];
    this.touchState.initialDistance = 0;
  }

  /**
   * Update input latency tracking
   */
  private updateInputLatency(inputStartTime: number): void {
    const latency = performance.now() - inputStartTime;
    this.inputLatencyTracker.push(latency);
    
    if (this.inputLatencyTracker.length > this.LATENCY_SAMPLE_SIZE) {
      this.inputLatencyTracker.shift();
    }
  }

  /**
   * Get average input latency
   */
  public getAverageInputLatency(): number {
    if (this.inputLatencyTracker.length === 0) {
      return 0;
    }
    
    return this.inputLatencyTracker.reduce((a, b) => a + b) / this.inputLatencyTracker.length;
  }

  /**
   * Update device configuration
   */
  public updateDeviceConfig(config: DeviceCameraConfig): void {
    this.deviceConfig = config;
  }

  /**
   * Get current device configuration
   */
  public getDeviceConfig(): DeviceCameraConfig {
    return this.deviceConfig;
  }

  /**
   * Dispose resources and cleanup
   */
  public dispose(): void {
    this.isDragging = false;
    this.resetTouchState();
    this.inputLatencyTracker.length = 0;
  }
}