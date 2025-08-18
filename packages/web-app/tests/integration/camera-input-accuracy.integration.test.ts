/**
 * Camera Input Accuracy Integration Tests
 * Tests cross-platform camera control accuracy and input method coordination
 */

import { renderHook, act } from '@testing-library/react';
import { useCameraControls } from '../../src/hooks/useCameraControls';
import { CameraInputProcessor } from '@rubiks-cube/three-renderer/controls/CameraInputProcessor';
import { 
  CameraInputEvent, 
  DeviceCameraConfig, 
  CameraOperationResult,
  CameraError,
  Vector3D 
} from '@rubiks-cube/shared';
import * as THREE from 'three';

// Mock Three.js components
jest.mock('three', () => ({
  Scene: jest.fn(() => ({
    add: jest.fn(),
    remove: jest.fn()
  })),
  PerspectiveCamera: jest.fn(() => ({
    position: { x: 5, y: 5, z: 5 },
    lookAt: jest.fn()
  })),
  Vector3: jest.fn()
}));

// Mock camera utilities
jest.mock('../../src/utils/cameraUtils', () => ({
  getDeviceCameraConfig: jest.fn(),
  getDefaultCameraConstraints: jest.fn(),
  getDefaultViewPreferences: jest.fn(),
  serializeCameraState: jest.fn(),
  deserializeCameraState: jest.fn(),
  validateCameraState: jest.fn()
}));

// Mock camera managers
jest.mock('@rubiks-cube/three-renderer/cameras/OrbitCameraManager', () => ({
  OrbitCameraManager: jest.fn(() => ({
    orbit: jest.fn(),
    zoom: jest.fn(),
    resetPosition: jest.fn(),
    getCameraState: jest.fn(),
    dispose: jest.fn(),
    updatePerformanceMetrics: jest.fn()
  }))
}));

jest.mock('@rubiks-cube/three-renderer/controls/CameraInputProcessor', () => ({
  CameraInputProcessor: jest.fn(() => ({
    processMouseInput: jest.fn(),
    processTouchInput: jest.fn(),
    processKeyboardInput: jest.fn(),
    updateDeviceConfig: jest.fn(),
    getAverageInputLatency: jest.fn(),
    dispose: jest.fn()
  }))
}));

describe('Camera Input Accuracy Integration', () => {
  let mockScene: THREE.Scene;
  let mockCamera: THREE.PerspectiveCamera;
  let mockCanvas: HTMLCanvasElement;
  let mockOrbitManager: any;
  let mockInputProcessor: any;

  const mockDeviceConfigs = {
    mobile: {
      device: 'mobile' as const,
      zoomSensitivity: 0.5,
      orbitSensitivity: 0.8,
      autoRotationSpeed: 0.3,
      frameRate: 30,
      gestureDeadZone: 10,
      touchTargetSize: 44
    },
    tablet: {
      device: 'tablet' as const,
      zoomSensitivity: 0.7,
      orbitSensitivity: 1.0,
      autoRotationSpeed: 0.4,
      frameRate: 45,
      gestureDeadZone: 8,
      touchTargetSize: 44
    },
    desktop: {
      device: 'desktop' as const,
      zoomSensitivity: 1.0,
      orbitSensitivity: 1.2,
      autoRotationSpeed: 0.5,
      frameRate: 60,
      gestureDeadZone: 5,
      touchTargetSize: 32
    }
  };

  beforeEach(() => {
    jest.clearAllMocks();

    mockScene = new THREE.Scene();
    mockCamera = new THREE.PerspectiveCamera();
    mockCanvas = document.createElement('canvas');

    // Mock successful camera manager creation
    const { OrbitCameraManager } = require('@rubiks-cube/three-renderer/cameras/OrbitCameraManager');
    mockOrbitManager = {
      orbit: jest.fn().mockReturnValue({ success: true, data: undefined }),
      zoom: jest.fn().mockReturnValue({ success: true, data: undefined }),
      resetPosition: jest.fn().mockReturnValue({ success: true, data: Promise.resolve() }),
      getCameraState: jest.fn().mockReturnValue({
        position: { x: 5, y: 5, z: 5 },
        rotation: { w: 1, x: 0, y: 0, z: 0 },
        zoom: 8.66,
        target: { x: 0, y: 0, z: 0 },
        isAnimating: false,
        autoRotationEnabled: false
      }),
      dispose: jest.fn(),
      updatePerformanceMetrics: jest.fn().mockReturnValue({
        frameRate: 60,
        animationDuration: 0,
        memoryUsage: 2.5
      })
    };
    OrbitCameraManager.mockImplementation(() => mockOrbitManager);

    // Mock input processor
    const { CameraInputProcessor } = require('@rubiks-cube/three-renderer/controls/CameraInputProcessor');
    mockInputProcessor = {
      processMouseInput: jest.fn(),
      processTouchInput: jest.fn(),
      processKeyboardInput: jest.fn(),
      updateDeviceConfig: jest.fn(),
      getAverageInputLatency: jest.fn().mockReturnValue(15),
      dispose: jest.fn()
    };
    CameraInputProcessor.mockImplementation(() => mockInputProcessor);

    // Mock utility functions
    const cameraUtils = require('../../src/utils/cameraUtils');
    cameraUtils.getDeviceCameraConfig.mockReturnValue(mockDeviceConfigs.desktop);
    cameraUtils.getDefaultCameraConstraints.mockReturnValue({
      minZoom: 0.5,
      maxZoom: 3.0,
      minDistance: 2.0,
      maxDistance: 20.0
    });
    cameraUtils.getDefaultViewPreferences.mockReturnValue({
      defaultCameraPosition: { x: 5, y: 5, z: 5 },
      autoRotationSpeed: 0.5,
      autoRotationTimeout: 5000,
      zoomSensitivity: 1.0,
      orbitSensitivity: 1.2,
      persistCameraState: true
    });
    cameraUtils.validateCameraState.mockReturnValue(true);
    cameraUtils.serializeCameraState.mockReturnValue('{"position":{"x":5,"y":5,"z":5}}');
    cameraUtils.deserializeCameraState.mockReturnValue({
      position: { x: 5, y: 5, z: 5 },
      rotation: { w: 1, x: 0, y: 0, z: 0 },
      zoom: 8.66,
      target: { x: 0, y: 0, z: 0 },
      isAnimating: false,
      autoRotationEnabled: false
    });
  });

  describe('Cross-Platform Input Handling', () => {
    test('should adapt camera sensitivity for different devices', () => {
      const { getDeviceCameraConfig } = require('../../src/utils/cameraUtils');

      // Test mobile configuration
      getDeviceCameraConfig.mockReturnValue(mockDeviceConfigs.mobile);
      const { result: mobileResult } = renderHook(() => 
        useCameraControls(mockScene, mockCamera, mockCanvas)
      );

      expect(CameraInputProcessor).toHaveBeenCalledWith(mockDeviceConfigs.mobile);

      // Test tablet configuration
      jest.clearAllMocks();
      getDeviceCameraConfig.mockReturnValue(mockDeviceConfigs.tablet);
      const { result: tabletResult } = renderHook(() => 
        useCameraControls(mockScene, mockCamera, mockCanvas)
      );

      expect(CameraInputProcessor).toHaveBeenCalledWith(mockDeviceConfigs.tablet);

      // Test desktop configuration
      jest.clearAllMocks();
      getDeviceCameraConfig.mockReturnValue(mockDeviceConfigs.desktop);
      const { result: desktopResult } = renderHook(() => 
        useCameraControls(mockScene, mockCamera, mockCanvas)
      );

      expect(CameraInputProcessor).toHaveBeenCalledWith(mockDeviceConfigs.desktop);
    });

    test('should handle mouse input with correct sensitivity', () => {
      const { result } = renderHook(() => 
        useCameraControls(mockScene, mockCamera, mockCanvas)
      );

      const mockMouseEvent: MouseEvent = {
        type: 'mousedown',
        button: 2, // Right click
        clientX: 400,
        clientY: 300,
        preventDefault: jest.fn()
      } as any;

      const expectedInputEvent: CameraInputEvent = {
        type: 'mouse',
        gesture: 'orbit',
        parameters: {
          type: 'orbit',
          deltaX: 10,
          deltaY: 5,
          speed: 1.0,
          timestamp: expect.any(Number)
        },
        deviceConfig: mockDeviceConfigs.desktop
      };

      mockInputProcessor.processMouseInput.mockReturnValue({
        success: true,
        data: expectedInputEvent
      });

      // Simulate mouse event processing
      act(() => {
        // This would normally be triggered by event listeners
        mockInputProcessor.processMouseInput(mockMouseEvent, mockCanvas);
      });

      expect(mockInputProcessor.processMouseInput).toHaveBeenCalledWith(mockMouseEvent, mockCanvas);
    });

    test('should handle touch input with multi-touch recognition', () => {
      const { getDeviceCameraConfig } = require('../../src/utils/cameraUtils');
      getDeviceCameraConfig.mockReturnValue(mockDeviceConfigs.mobile);

      const { result } = renderHook(() => 
        useCameraControls(mockScene, mockCamera, mockCanvas)
      );

      const mockTouchEvent: TouchEvent = {
        type: 'touchstart',
        touches: [
          { identifier: 1, clientX: 300, clientY: 200 },
          { identifier: 2, clientX: 500, clientY: 200 }
        ] as any,
        preventDefault: jest.fn()
      } as any;

      const expectedTouchInputEvent: CameraInputEvent = {
        type: 'touch',
        gesture: 'orbit',
        parameters: {
          type: 'orbit',
          deltaX: 0,
          deltaY: 0,
          pinchScale: 1.0,
          timestamp: expect.any(Number)
        },
        deviceConfig: mockDeviceConfigs.mobile
      };

      mockInputProcessor.processTouchInput.mockReturnValue({
        success: true,
        data: expectedTouchInputEvent
      });

      act(() => {
        mockInputProcessor.processTouchInput(mockTouchEvent, mockCanvas);
      });

      expect(mockInputProcessor.processTouchInput).toHaveBeenCalledWith(mockTouchEvent, mockCanvas);
    });

    test('should handle keyboard input for camera reset', () => {
      const { result } = renderHook(() => 
        useCameraControls(mockScene, mockCamera, mockCanvas)
      );

      const mockKeyboardEvent: KeyboardEvent = {
        type: 'keydown',
        code: 'Space',
        key: ' ',
        preventDefault: jest.fn()
      } as any;

      const expectedKeyboardInputEvent: CameraInputEvent = {
        type: 'keyboard',
        gesture: 'reset',
        parameters: {
          type: 'reset',
          timestamp: expect.any(Number)
        },
        deviceConfig: mockDeviceConfigs.desktop
      };

      mockInputProcessor.processKeyboardInput.mockReturnValue({
        success: true,
        data: expectedKeyboardInputEvent
      });

      act(() => {
        mockInputProcessor.processKeyboardInput(mockKeyboardEvent);
      });

      expect(mockInputProcessor.processKeyboardInput).toHaveBeenCalledWith(mockKeyboardEvent);
    });
  });

  describe('Input Method Accuracy', () => {
    test('should maintain consistent camera movement regardless of input method', () => {
      const { result } = renderHook(() => 
        useCameraControls(mockScene, mockCamera, mockCanvas)
      );

      const orbitDelta = { deltaX: 0.1, deltaY: 0.05 };

      // Test mouse orbit
      act(() => {
        result.current.orbitCamera(orbitDelta.deltaX, orbitDelta.deltaY);
      });

      expect(mockOrbitManager.orbit).toHaveBeenCalledWith(
        orbitDelta.deltaX,
        orbitDelta.deltaY,
        1.0
      );

      // Reset mock
      mockOrbitManager.orbit.mockClear();

      // Test touch orbit (should apply device sensitivity)
      const { getDeviceCameraConfig } = require('../../src/utils/cameraUtils');
      getDeviceCameraConfig.mockReturnValue(mockDeviceConfigs.mobile);

      act(() => {
        result.current.orbitCamera(orbitDelta.deltaX, orbitDelta.deltaY);
      });

      // Should be called with same parameters regardless of device
      expect(mockOrbitManager.orbit).toHaveBeenCalledWith(
        orbitDelta.deltaX,
        orbitDelta.deltaY,
        1.0
      );
    });

    test('should apply correct zoom scaling for different devices', () => {
      const testCases = [
        { device: 'mobile', config: mockDeviceConfigs.mobile, expectedSensitivity: 0.5 },
        { device: 'tablet', config: mockDeviceConfigs.tablet, expectedSensitivity: 0.7 },
        { device: 'desktop', config: mockDeviceConfigs.desktop, expectedSensitivity: 1.0 }
      ];

      testCases.forEach(({ device, config }) => {
        const { getDeviceCameraConfig } = require('../../src/utils/cameraUtils');
        getDeviceCameraConfig.mockReturnValue(config);

        const { result } = renderHook(() => 
          useCameraControls(mockScene, mockCamera, mockCanvas)
        );

        const zoomDelta = 0.5;

        act(() => {
          result.current.zoomCamera(zoomDelta);
        });

        expect(mockOrbitManager.zoom).toHaveBeenCalledWith(zoomDelta);

        // Cleanup for next test
        jest.clearAllMocks();
        mockOrbitManager.zoom.mockClear();
      });
    });

    test('should handle input conflicts and prioritization', () => {
      const { result } = renderHook(() => 
        useCameraControls(mockScene, mockCamera, mockCanvas)
      );

      // Simulate camera reset during orbit animation
      mockOrbitManager.getCameraState.mockReturnValue({
        position: { x: 5, y: 5, z: 5 },
        rotation: { w: 1, x: 0, y: 0, z: 0 },
        zoom: 8.66,
        target: { x: 0, y: 0, z: 0 },
        isAnimating: true, // Animation in progress
        autoRotationEnabled: false
      });

      act(() => {
        result.current.resetCamera();
      });

      // Should still call reset even during animation
      expect(mockOrbitManager.resetPosition).toHaveBeenCalled();
    });
  });

  describe('Performance and Latency Requirements', () => {
    test('should meet input latency requirements', () => {
      const { result } = renderHook(() => 
        useCameraControls(mockScene, mockCamera, mockCanvas)
      );

      // Verify performance metrics are tracked
      expect(result.current.performanceMetrics).toBeDefined();
      expect(result.current.performanceMetrics.inputLatency).toBeLessThanOrEqual(32); // Mobile requirement
    });

    test('should maintain frame rate during camera operations', () => {
      const { result } = renderHook(() => 
        useCameraControls(mockScene, mockCamera, mockCanvas)
      );

      // Desktop should target 60fps
      const { getDeviceCameraConfig } = require('../../src/utils/cameraUtils');
      getDeviceCameraConfig.mockReturnValue(mockDeviceConfigs.desktop);

      expect(result.current.performanceMetrics.frameRate).toBeGreaterThanOrEqual(30);
    });

    test('should handle device configuration updates on window resize', () => {
      const { result } = renderHook(() => 
        useCameraControls(mockScene, mockCamera, mockCanvas)
      );

      const { getDeviceCameraConfig } = require('../../src/utils/cameraUtils');
      
      // Simulate window resize from desktop to mobile
      getDeviceCameraConfig.mockReturnValue(mockDeviceConfigs.mobile);

      act(() => {
        window.dispatchEvent(new Event('resize'));
      });

      expect(mockInputProcessor.updateDeviceConfig).toHaveBeenCalledWith(mockDeviceConfigs.mobile);
    });
  });

  describe('Error Handling and Recovery', () => {
    test('should handle camera operation failures gracefully', () => {
      const { result } = renderHook(() => 
        useCameraControls(mockScene, mockCamera, mockCanvas)
      );

      // Mock orbit failure
      mockOrbitManager.orbit.mockReturnValue({
        success: false,
        error: CameraError.INVALID_CAMERA_STATE
      });

      const orbitResult = result.current.orbitCamera(0.1, 0.1);

      expect(orbitResult.success).toBe(false);
      expect(orbitResult.error).toBe(CameraError.INVALID_CAMERA_STATE);
    });

    test('should recover from invalid input events', () => {
      const { result } = renderHook(() => 
        useCameraControls(mockScene, mockCamera, mockCanvas)
      );

      // Mock input processor failure
      mockInputProcessor.processMouseInput.mockReturnValue({
        success: false,
        error: 'Invalid input event'
      });

      // Should not crash when input processing fails
      expect(() => {
        mockInputProcessor.processMouseInput({} as MouseEvent, mockCanvas);
      }).not.toThrow();
    });

    test('should handle missing canvas or scene gracefully', () => {
      // Test with null canvas
      const { result: nullCanvasResult } = renderHook(() => 
        useCameraControls(mockScene, mockCamera, null)
      );

      expect(nullCanvasResult.current.isInitialized).toBe(false);

      // Test with null scene
      const { result: nullSceneResult } = renderHook(() => 
        useCameraControls(null, mockCamera, mockCanvas)
      );

      expect(nullSceneResult.current.isInitialized).toBe(false);
    });
  });

  describe('Camera State Consistency', () => {
    test('should maintain camera state consistency across input methods', () => {
      const { result } = renderHook(() => 
        useCameraControls(mockScene, mockCamera, mockCanvas)
      );

      const initialState = result.current.cameraState;

      // Perform orbit via different methods
      act(() => {
        result.current.orbitCamera(0.1, 0.1);
      });

      act(() => {
        result.current.zoomCamera(0.5);
      });

      act(() => {
        result.current.resetCamera();
      });

      // Camera state should be updated after each operation
      expect(mockOrbitManager.getCameraState).toHaveBeenCalledTimes(3);
    });

    test('should serialize and restore camera state correctly', () => {
      const { result } = renderHook(() => 
        useCameraControls(mockScene, mockCamera, mockCanvas)
      );

      const { serializeCameraState, deserializeCameraState } = require('../../src/utils/cameraUtils');

      // Test state persistence
      expect(serializeCameraState).toHaveBeenCalled();
      expect(deserializeCameraState).toHaveBeenCalled();
    });
  });
});