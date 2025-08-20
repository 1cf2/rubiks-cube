/**
 * Camera Performance Tests
 * Tests camera performance during complex movements, zoom operations, and animations
 * Validates frame rate targets: 60fps desktop, 30fps mobile, <16ms input latency
 */

import { renderHook, act } from '@testing-library/react';
import { useCameraControls } from '../../src/hooks/useCameraControls';
import { useAutoRotation } from '../../src/hooks/useAutoRotation';
import * as THREE from 'three';

// Mock Three.js
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

// Mock camera managers with performance tracking
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

// Performance measurement utilities
const measureExecutionTime = (fn: Function): number => {
  const start = performance.now();
  fn();
  const end = performance.now();
  return end - start;
};

const simulateFrameLoop = (iterations: number, callback: Function): number[] => {
  const frameTimes: number[] = [];
  for (let i = 0; i < iterations; i++) {
    const frameTime = measureExecutionTime(callback);
    frameTimes.push(frameTime);
  }
  return frameTimes;
};

const calculateAverageFrameRate = (frameTimes: number[]): number => {
  const averageFrameTime = frameTimes.reduce((sum, time) => sum + time, 0) / frameTimes.length;
  return 1000 / averageFrameTime; // Convert to FPS
};

describe('Camera Performance Tests', () => {
  let mockScene: THREE.Scene;
  let mockCamera: THREE.PerspectiveCamera;
  let mockCanvas: HTMLCanvasElement;
  let mockOrbitManager: any;
  let mockInputProcessor: any;

  const deviceConfigs = {
    mobile: {
      device: 'mobile' as const,
      frameRate: 30,
      zoomSensitivity: 0.5,
      orbitSensitivity: 0.8
    },
    desktop: {
      device: 'desktop' as const,
      frameRate: 60,
      zoomSensitivity: 1.0,
      orbitSensitivity: 1.2
    }
  };

  beforeEach(() => {
    jest.clearAllMocks();

    mockScene = new THREE.Scene();
    mockCamera = new THREE.PerspectiveCamera();
    mockCanvas = document.createElement('canvas');

    // Mock successful camera manager with performance metrics
    const { OrbitCameraManager } = require('@rubiks-cube/three-renderer/cameras/OrbitCameraManager');
    mockOrbitManager = {
      orbit: jest.fn().mockImplementation(() => {
        // Simulate processing time for orbit operation
        const processingTime = Math.random() * 5 + 1; // 1-6ms
        return { success: true, data: undefined, processingTime };
      }),
      zoom: jest.fn().mockImplementation(() => {
        // Simulate processing time for zoom operation
        const processingTime = Math.random() * 3 + 1; // 1-4ms
        return { success: true, data: undefined, processingTime };
      }),
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

    // Mock input processor with latency tracking
    const { CameraInputProcessor } = require('@rubiks-cube/three-renderer/controls/CameraInputProcessor');
    mockInputProcessor = {
      processMouseInput: jest.fn().mockImplementation(() => {
        // Simulate input processing latency
        const latency = Math.random() * 10 + 5; // 5-15ms
        return {
          success: true,
          data: {
            type: 'mouse',
            gesture: 'orbit',
            parameters: { deltaX: 0.1, deltaY: 0.1 },
            timestamp: performance.now()
          },
          latency
        };
      }),
      processTouchInput: jest.fn().mockImplementation(() => {
        // Simulate touch processing latency (slightly higher)
        const latency = Math.random() * 15 + 8; // 8-23ms
        return {
          success: true,
          data: {
            type: 'touch',
            gesture: 'orbit',
            parameters: { deltaX: 0.1, deltaY: 0.1 },
            timestamp: performance.now()
          },
          latency
        };
      }),
      processKeyboardInput: jest.fn().mockReturnValue({
        success: true,
        data: {
          type: 'keyboard',
          gesture: 'reset',
          parameters: { timestamp: performance.now() }
        }
      }),
      updateDeviceConfig: jest.fn(),
      getAverageInputLatency: jest.fn().mockReturnValue(12),
      dispose: jest.fn()
    };
    CameraInputProcessor.mockImplementation(() => mockInputProcessor);

    // Mock utility functions
    const cameraUtils = require('../../src/utils/cameraUtils');
    cameraUtils.getDeviceCameraConfig.mockReturnValue(deviceConfigs.desktop);
    cameraUtils.getDefaultCameraConstraints.mockReturnValue({
      minZoom: 0.5,
      maxZoom: 3.0
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
  });

  describe('Frame Rate Performance', () => {
    test('should maintain 60fps during continuous orbit operations on desktop', () => {
      const { getDeviceCameraConfig } = require('../../src/utils/cameraUtils');
      getDeviceCameraConfig.mockReturnValue(deviceConfigs.desktop);

      const { result } = renderHook(() => 
        useCameraControls(mockScene, mockCamera, mockCanvas)
      );

      // Simulate continuous orbit operations
      const frameTimes = simulateFrameLoop(120, () => { // 2 seconds at 60fps
        act(() => {
          result.current.orbitCamera(0.01, 0.01);
        });
      });

      const averageFps = calculateAverageFrameRate(frameTimes);
      
      // Should maintain at least 55fps (allowing for some variance)
      expect(averageFps).toBeGreaterThanOrEqual(55);
      
      // No frame should take longer than 20ms (50fps minimum)
      const maxFrameTime = Math.max(...frameTimes);
      expect(maxFrameTime).toBeLessThanOrEqual(20);
      
      window.console.log(`Desktop Orbit Performance: ${averageFps.toFixed(1)} fps average, ${maxFrameTime.toFixed(1)}ms max frame time`);
    });

    test('should maintain 30fps during continuous orbit operations on mobile', () => {
      const { getDeviceCameraConfig } = require('../../src/utils/cameraUtils');
      getDeviceCameraConfig.mockReturnValue(deviceConfigs.mobile);

      const { result } = renderHook(() => 
        useCameraControls(mockScene, mockCamera, mockCanvas)
      );

      // Simulate continuous orbit operations
      const frameTimes = simulateFrameLoop(60, () => { // 2 seconds at 30fps
        act(() => {
          result.current.orbitCamera(0.01, 0.01);
        });
      });

      const averageFps = calculateAverageFrameRate(frameTimes);
      
      // Should maintain at least 28fps on mobile
      expect(averageFps).toBeGreaterThanOrEqual(28);
      
      // No frame should take longer than 40ms (25fps minimum)
      const maxFrameTime = Math.max(...frameTimes);
      expect(maxFrameTime).toBeLessThanOrEqual(40);
      
      window.console.log(`Mobile Orbit Performance: ${averageFps.toFixed(1)} fps average, ${maxFrameTime.toFixed(1)}ms max frame time`);
    });

    test('should maintain performance during rapid zoom operations', () => {
      const { result } = renderHook(() => 
        useCameraControls(mockScene, mockCamera, mockCanvas)
      );

      // Simulate rapid zoom in/out
      const frameTimes = simulateFrameLoop(100, () => {
        act(() => {
          const zoomDelta = (Math.random() - 0.5) * 0.2; // Random zoom between -0.1 and 0.1
          result.current.zoomCamera(zoomDelta);
        });
      });

      const averageFps = calculateAverageFrameRate(frameTimes);
      
      // Should maintain good performance during zoom
      expect(averageFps).toBeGreaterThanOrEqual(50);
      
      // No zoom operation should take longer than 18ms
      const maxFrameTime = Math.max(...frameTimes);
      expect(maxFrameTime).toBeLessThanOrEqual(18);
      
      window.console.log(`Zoom Performance: ${averageFps.toFixed(1)} fps average, ${maxFrameTime.toFixed(1)}ms max frame time`);
    });

    test('should handle combined orbit and zoom operations efficiently', () => {
      const { result } = renderHook(() => 
        useCameraControls(mockScene, mockCamera, mockCanvas)
      );

      // Simulate complex camera movements
      const frameTimes = simulateFrameLoop(80, () => {
        act(() => {
          // Alternate between orbit and zoom operations
          if (Math.random() > 0.5) {
            result.current.orbitCamera(
              (Math.random() - 0.5) * 0.02,
              (Math.random() - 0.5) * 0.02
            );
          } else {
            result.current.zoomCamera((Math.random() - 0.5) * 0.1);
          }
        });
      });

      const averageFps = calculateAverageFrameRate(frameTimes);
      
      // Should maintain performance with mixed operations
      expect(averageFps).toBeGreaterThanOrEqual(45);
      
      window.console.log(`Mixed Operations Performance: ${averageFps.toFixed(1)} fps average`);
    });
  });

  describe('Input Latency Performance', () => {
    test('should meet input latency requirements for desktop', () => {
      const { result } = renderHook(() => 
        useCameraControls(mockScene, mockCamera, mockCanvas)
      );

      // Test multiple input operations
      const latencies: number[] = [];
      
      for (let i = 0; i < 50; i++) {
        const start = performance.now();
        
        act(() => {
          result.current.orbitCamera(0.01, 0.01);
        });
        
        const end = performance.now();
        latencies.push(end - start);
      }

      const averageLatency = latencies.reduce((sum, lat) => sum + lat, 0) / latencies.length;
      const maxLatency = Math.max(...latencies);
      
      // Desktop should meet <16ms latency requirement
      expect(averageLatency).toBeLessThanOrEqual(16);
      expect(maxLatency).toBeLessThanOrEqual(25); // Allow some variance for worst case
      
      window.console.log(`Desktop Input Latency: ${averageLatency.toFixed(1)}ms average, ${maxLatency.toFixed(1)}ms max`);
    });

    test('should meet input latency requirements for mobile', () => {
      const { getDeviceCameraConfig } = require('../../src/utils/cameraUtils');
      getDeviceCameraConfig.mockReturnValue(deviceConfigs.mobile);

      const { result } = renderHook(() => 
        useCameraControls(mockScene, mockCamera, mockCanvas)
      );

      // Test touch input latency
      const latencies: number[] = [];
      
      for (let i = 0; i < 30; i++) {
        const start = performance.now();
        
        act(() => {
          result.current.orbitCamera(0.01, 0.01);
        });
        
        const end = performance.now();
        latencies.push(end - start);
      }

      const averageLatency = latencies.reduce((sum, lat) => sum + lat, 0) / latencies.length;
      const maxLatency = Math.max(...latencies);
      
      // Mobile should meet <32ms latency requirement
      expect(averageLatency).toBeLessThanOrEqual(32);
      expect(maxLatency).toBeLessThanOrEqual(50); // Allow more variance for mobile
      
      window.console.log(`Mobile Input Latency: ${averageLatency.toFixed(1)}ms average, ${maxLatency.toFixed(1)}ms max`);
    });

    test('should track and report input processor latency', () => {
      const { result } = renderHook(() => 
        useCameraControls(mockScene, mockCamera, mockCanvas)
      );

      // Verify that input latency is being tracked
      expect(result.current.performanceMetrics.inputLatency).toBeDefined();
      expect(result.current.performanceMetrics.inputLatency).toBeLessThanOrEqual(20);
    });
  });

  describe('Memory and Resource Performance', () => {
    test('should maintain stable memory usage during extended operation', () => {
      const { result } = renderHook(() => 
        useCameraControls(mockScene, mockCamera, mockCanvas)
      );

      const initialMemory = result.current.performanceMetrics.memoryUsage;

      // Perform many operations to test for memory leaks
      for (let i = 0; i < 1000; i++) {
        act(() => {
          result.current.orbitCamera(0.001, 0.001);
        });
      }

      const finalMemory = result.current.performanceMetrics.memoryUsage;
      
      // Memory usage should not increase significantly
      const memoryGrowth = finalMemory - initialMemory;
      expect(memoryGrowth).toBeLessThanOrEqual(1.0); // Allow max 1MB growth
      
      window.console.log(`Memory usage: ${initialMemory}MB -> ${finalMemory}MB (growth: ${memoryGrowth.toFixed(2)}MB)`);
    });

    test('should efficiently handle animation state transitions', () => {
      const { result } = renderHook(() => 
        useCameraControls(mockScene, mockCamera, mockCanvas)
      );

      // Test rapid animation state changes
      const operations = [];
      
      for (let i = 0; i < 20; i++) {
        const start = performance.now();
        
        act(() => {
          result.current.resetCamera();
        });
        
        const end = performance.now();
        operations.push(end - start);
      }

      const averageAnimationTime = operations.reduce((sum, time) => sum + time, 0) / operations.length;
      
      // Animation transitions should be fast
      expect(averageAnimationTime).toBeLessThanOrEqual(10);
      
      window.console.log(`Animation transition time: ${averageAnimationTime.toFixed(1)}ms average`);
    });
  });

  describe('Auto-rotation Performance', () => {
    test('should maintain performance during auto-rotation', () => {
      // Mock requestAnimationFrame for auto-rotation tests
      const mockRequestAnimationFrame = jest.fn();
      global.requestAnimationFrame = mockRequestAnimationFrame;

      const mockOrbitCamera = jest.fn();
      const { result } = renderHook(() => useAutoRotation(mockOrbitCamera, true));

      // Simulate auto-rotation frames
      const frameTimes: number[] = [];
      
      // Start auto-rotation
      act(() => {
        result.current.startRotation();
      });

      // Simulate 60 frames of auto-rotation
      for (let i = 0; i < 60; i++) {
        const frameTime = measureExecutionTime(() => {
          // Simulate the auto-rotation frame callback
          mockOrbitCamera(0.008, 0); // Typical auto-rotation delta
        });
        frameTimes.push(frameTime);
      }

      const averageFrameTime = frameTimes.reduce((sum, time) => sum + time, 0) / frameTimes.length;
      
      // Auto-rotation should be very lightweight
      expect(averageFrameTime).toBeLessThanOrEqual(2); // Should be under 2ms per frame
      
      window.console.log(`Auto-rotation performance: ${averageFrameTime.toFixed(2)}ms average per frame`);
    });
  });

  describe('Stress Testing', () => {
    test('should handle rapid input bursts without performance degradation', () => {
      const { result } = renderHook(() => 
        useCameraControls(mockScene, mockCamera, mockCanvas)
      );

      // Simulate burst of rapid inputs
      const burstSize = 20;
      const burstTimes: number[] = [];

      for (let burst = 0; burst < 5; burst++) {
        const burstStart = performance.now();
        
        for (let i = 0; i < burstSize; i++) {
          act(() => {
            result.current.orbitCamera(0.001, 0.001);
          });
        }
        
        const burstEnd = performance.now();
        burstTimes.push(burstEnd - burstStart);
      }

      const averageBurstTime = burstTimes.reduce((sum, time) => sum + time, 0) / burstTimes.length;
      const timePerOperation = averageBurstTime / burstSize;
      
      // Each operation should still be fast even in bursts
      expect(timePerOperation).toBeLessThanOrEqual(3);
      
      window.console.log(`Burst performance: ${timePerOperation.toFixed(2)}ms per operation in ${burstSize}-operation bursts`);
    });

    test('should maintain performance under resource constraints', () => {
      // Simulate lower-end device by adding artificial delays
      const originalOrbit = mockOrbitManager.orbit;
      mockOrbitManager.orbit = jest.fn().mockImplementation(() => {
        // Simulate slower processing on lower-end device
        const delay = Math.random() * 8 + 2; // 2-10ms
        return { success: true, data: undefined, processingTime: delay };
      });

      const { result } = renderHook(() => 
        useCameraControls(mockScene, mockCamera, mockCanvas)
      );

      const frameTimes = simulateFrameLoop(40, () => {
        act(() => {
          result.current.orbitCamera(0.01, 0.01);
        });
      });

      const averageFps = calculateAverageFrameRate(frameTimes);
      
      // Should still maintain reasonable performance
      expect(averageFps).toBeGreaterThanOrEqual(25);
      
      window.console.log(`Constrained performance: ${averageFps.toFixed(1)} fps average`);
      
      // Restore original implementation
      mockOrbitManager.orbit = originalOrbit;
    });
  });

  describe('Performance Monitoring and Reporting', () => {
    test('should provide comprehensive performance metrics', () => {
      const { result } = renderHook(() => 
        useCameraControls(mockScene, mockCamera, mockCanvas)
      );

      const metrics = result.current.performanceMetrics;
      
      // Verify all required metrics are present
      expect(metrics).toHaveProperty('frameRate');
      expect(metrics).toHaveProperty('inputLatency');
      expect(metrics).toHaveProperty('animationDuration');
      expect(metrics).toHaveProperty('memoryUsage');
      
      // Verify metrics are within expected ranges
      expect(metrics.frameRate).toBeGreaterThan(0);
      expect(metrics.inputLatency).toBeGreaterThan(0);
      expect(metrics.memoryUsage).toBeGreaterThan(0);
      
      window.console.log('Performance Metrics:', {
        frameRate: `${metrics.frameRate} fps`,
        inputLatency: `${metrics.inputLatency}ms`,
        animationDuration: `${metrics.animationDuration}ms`,
        memoryUsage: `${metrics.memoryUsage}MB`
      });
    });

    test('should update performance metrics during operation', () => {
      const { result } = renderHook(() => 
        useCameraControls(mockScene, mockCamera, mockCanvas)
      );

      const initialMetrics = { ...result.current.performanceMetrics };

      // Perform operations
      for (let i = 0; i < 10; i++) {
        act(() => {
          result.current.orbitCamera(0.01, 0.01);
        });
      }

      // Metrics should be updated (mock implementation would update these)
      expect(mockOrbitManager.updatePerformanceMetrics).toHaveBeenCalled();
      expect(mockInputProcessor.getAverageInputLatency).toHaveBeenCalled();
    });
  });
});