import * as THREE from 'three';
import { OrbitCameraManager } from '../../src/cameras/OrbitCameraManager';
import { CameraConstraints, CameraError } from '@rubiks-cube/shared';

// Mock performance.now for consistent testing
jest.spyOn(performance, 'now').mockReturnValue(1000);

describe('OrbitCameraManager', () => {
  let scene: THREE.Scene;
  let camera: THREE.PerspectiveCamera;
  let constraints: CameraConstraints;
  let manager: OrbitCameraManager;

  beforeEach(() => {
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000);
    camera.position.set(5, 5, 5);
    
    constraints = {
      zoomLimits: {
        min: 2.0,
        max: 15.0
      },
      orbitLimits: {
        minPolarAngle: 0,
        maxPolarAngle: Math.PI,
        minAzimuthAngle: -Infinity,
        maxAzimuthAngle: Infinity
      }
    };

    manager = new OrbitCameraManager(camera, scene, constraints);
  });

  afterEach(() => {
    manager.dispose();
  });

  describe('initialization', () => {
    test('should initialize with camera looking at cube center', () => {
      const target = manager.getTarget();
      expect(target.x).toBe(0);
      expect(target.y).toBe(0);
      expect(target.z).toBe(0);
    });

    test('should return initial camera state', () => {
      const state = manager.getCameraState();
      
      expect(state.position).toEqual({ x: 5, y: 5, z: 5 });
      expect(state.target).toEqual({ x: 0, y: 0, z: 0 });
      expect(state.isAnimating).toBe(false);
      expect(state.autoRotationEnabled).toBe(false);
      expect(typeof state.zoom).toBe('number');
      expect(state.zoom).toBeGreaterThan(0);
    });

    test('should not be animating initially', () => {
      expect(manager.getIsAnimating()).toBe(false);
    });
  });

  describe('setPosition', () => {
    test('should set camera position successfully', () => {
      const newPosition = { x: 10, y: 8, z: 6 };
      const result = manager.setPosition(newPosition);
      
      expect(result.success).toBe(true);
      
      const state = manager.getCameraState();
      expect(state.position.x).toBeCloseTo(newPosition.x, 5);
      expect(state.position.y).toBeCloseTo(newPosition.y, 5);
      expect(state.position.z).toBeCloseTo(newPosition.z, 5);
    });

    test('should maintain camera looking at target after position change', () => {
      const newPosition = { x: 0, y: 10, z: 0 };
      manager.setPosition(newPosition);
      
      // Camera should be looking down at origin
      const direction = new THREE.Vector3();
      camera.getWorldDirection(direction);
      
      expect(direction.y).toBeLessThan(0); // Looking down
    });

    test('should fail when animation is in progress', () => {
      // Start an animation by calling resetPosition
      const resetResult = manager.resetPosition({ x: 1, y: 1, z: 1 }, 100);
      expect(resetResult.success).toBe(true);
      
      // Try to set position while animating
      const result = manager.setPosition({ x: 5, y: 5, z: 5 });
      expect(result.success).toBe(false);
      expect(result.error).toBe(CameraError.ANIMATION_IN_PROGRESS);
    });
  });

  describe('orbit', () => {
    test('should orbit camera around target', () => {
      const initialState = manager.getCameraState();
      const result = manager.orbit(0.1, 0.1, 1.0);
      
      expect(result.success).toBe(true);
      
      const newState = manager.getCameraState();
      expect(newState.position.x).not.toBeCloseTo(initialState.position.x, 1);
      expect(newState.position.y).not.toBeCloseTo(initialState.position.y, 1);
      expect(newState.position.z).not.toBeCloseTo(initialState.position.z, 1);
    });

    test('should maintain distance from target during orbit', () => {
      const initialState = manager.getCameraState();
      const initialDistance = Math.sqrt(
        initialState.position.x ** 2 + 
        initialState.position.y ** 2 + 
        initialState.position.z ** 2
      );
      
      manager.orbit(0.5, 0.5, 1.0);
      
      const newState = manager.getCameraState();
      const newDistance = Math.sqrt(
        newState.position.x ** 2 + 
        newState.position.y ** 2 + 
        newState.position.z ** 2
      );
      
      expect(newDistance).toBeCloseTo(initialDistance, 1);
    });

    test('should respect sensitivity parameter', () => {
      const lowSensitivityResult = manager.orbit(0.1, 0.1, 0.5);
      const lowSensitivityState = manager.getCameraState();
      
      // Reset position
      manager.setPosition({ x: 5, y: 5, z: 5 });
      
      const highSensitivityResult = manager.orbit(0.1, 0.1, 2.0);
      const highSensitivityState = manager.getCameraState();
      
      expect(lowSensitivityResult.success).toBe(true);
      expect(highSensitivityResult.success).toBe(true);
      
      // High sensitivity should produce more movement
      const lowChange = Math.abs(lowSensitivityState.position.x - 5);
      const highChange = Math.abs(highSensitivityState.position.x - 5);
      expect(highChange).toBeGreaterThan(lowChange);
    });

    test('should fail when animation is in progress', () => {
      // Start an animation
      manager.resetPosition({ x: 1, y: 1, z: 1 }, 100);
      
      const result = manager.orbit(0.1, 0.1, 1.0);
      expect(result.success).toBe(false);
      expect(result.error).toBe(CameraError.ANIMATION_IN_PROGRESS);
    });
  });

  describe('zoom', () => {
    test('should zoom in with negative delta', () => {
      const initialState = manager.getCameraState();
      const result = manager.zoom(-0.1); // Zoom in
      
      expect(result.success).toBe(true);
      
      const newState = manager.getCameraState();
      expect(newState.zoom).toBeLessThan(initialState.zoom);
    });

    test('should zoom out with positive delta', () => {
      const initialState = manager.getCameraState();
      const result = manager.zoom(0.1); // Zoom out
      
      expect(result.success).toBe(true);
      
      const newState = manager.getCameraState();
      expect(newState.zoom).toBeGreaterThan(initialState.zoom);
    });

    test('should respect zoom constraints', () => {
      // Try to zoom too far out
      const result1 = manager.zoom(10); // Huge zoom out
      expect(result1.success).toBe(false);
      expect(result1.error).toBe(CameraError.ZOOM_LIMIT_EXCEEDED);
      
      // Try to zoom too far in
      const result2 = manager.zoom(-0.9); // Huge zoom in
      expect(result2.success).toBe(false);
      expect(result2.error).toBe(CameraError.ZOOM_LIMIT_EXCEEDED);
    });

    test('should maintain camera direction during zoom', () => {
      const initialDirection = new THREE.Vector3();
      camera.getWorldDirection(initialDirection);
      
      manager.zoom(0.1);
      
      const newDirection = new THREE.Vector3();
      camera.getWorldDirection(newDirection);
      
      expect(newDirection.dot(initialDirection)).toBeCloseTo(1, 1); // Directions should be similar
    });

    test('should fail when animation is in progress', () => {
      // Start an animation
      manager.resetPosition({ x: 1, y: 1, z: 1 }, 100);
      
      const result = manager.zoom(0.1);
      expect(result.success).toBe(false);
      expect(result.error).toBe(CameraError.ANIMATION_IN_PROGRESS);
    });
  });

  describe('resetPosition', () => {
    test('should return promise for reset animation', () => {
      const result = manager.resetPosition({ x: 10, y: 10, z: 10 }, 100);
      
      expect(result.success).toBe(true);
      expect(result.data).toBeInstanceOf(Promise);
    });

    test('should set animating state during reset', () => {
      expect(manager.getIsAnimating()).toBe(false);
      
      manager.resetPosition({ x: 10, y: 10, z: 10 }, 100);
      
      expect(manager.getIsAnimating()).toBe(true);
    });

    test('should fail when already animating', () => {
      // Start first animation
      const result1 = manager.resetPosition({ x: 1, y: 1, z: 1 }, 100);
      expect(result1.success).toBe(true);
      
      // Try to start second animation
      const result2 = manager.resetPosition({ x: 2, y: 2, z: 2 }, 100);
      expect(result2.success).toBe(false);
      expect(result2.error).toBe(CameraError.ANIMATION_IN_PROGRESS);
    });

    test('should complete animation and update state', async () => {
      const targetPosition = { x: 8, y: 6, z: 4 };
      const result = manager.resetPosition(targetPosition, 50);
      
      expect(result.success).toBe(true);
      
      // Wait for animation to complete
      await result.data;
      
      expect(manager.getIsAnimating()).toBe(false);
      
      const finalState = manager.getCameraState();
      expect(finalState.position.x).toBeCloseTo(targetPosition.x, 1);
      expect(finalState.position.y).toBeCloseTo(targetPosition.y, 1);
      expect(finalState.position.z).toBeCloseTo(targetPosition.z, 1);
    }, 1000);
  });

  describe('performance metrics', () => {
    test('should return performance metrics', () => {
      const metrics = manager.updatePerformanceMetrics();
      
      expect(typeof metrics.frameRate).toBe('number');
      expect(typeof metrics.inputLatency).toBe('number');
      expect(typeof metrics.animationDuration).toBe('number');
      expect(typeof metrics.memoryUsage).toBe('number');
      
      expect(metrics.frameRate).toBeGreaterThanOrEqual(0);
      expect(metrics.inputLatency).toBe(0); // Measured by input processor
      expect(metrics.animationDuration).toBeGreaterThanOrEqual(0);
      expect(metrics.memoryUsage).toBeGreaterThan(0);
    });

    test('should track frame rate over time', () => {
      // Mock multiple performance.now calls to simulate frame times
      const mockNow = jest.spyOn(performance, 'now');
      mockNow.mockReturnValueOnce(1000);
      
      manager.updatePerformanceMetrics();
      
      mockNow.mockReturnValueOnce(1016); // 16ms later = ~60fps
      const metrics = manager.updatePerformanceMetrics();
      
      expect(metrics.frameRate).toBeCloseTo(62.5, 0); // 1000/16 = 62.5fps
    });

    test('should indicate animation duration when animating', () => {
      // Start animation
      manager.resetPosition({ x: 1, y: 1, z: 1 }, 100);
      
      const metrics = manager.updatePerformanceMetrics();
      expect(metrics.animationDuration).toBeGreaterThan(0);
    });
  });

  describe('cleanup', () => {
    test('should dispose resources properly', () => {
      manager.updatePerformanceMetrics(); // Generate some tracked data
      
      expect(() => manager.dispose()).not.toThrow();
      
      expect(manager.getIsAnimating()).toBe(false);
    });
  });

  describe('camera constraints', () => {
    test('should respect polar angle constraints', () => {
      const constrainedManager = new OrbitCameraManager(camera, scene, {
        zoomLimits: { min: 2.0, max: 15.0 },
        orbitLimits: {
          minPolarAngle: Math.PI / 4,
          maxPolarAngle: 3 * Math.PI / 4,
          minAzimuthAngle: -Infinity,
          maxAzimuthAngle: Infinity
        }
      });

      // Try to orbit to extreme polar angle
      const result = constrainedManager.orbit(0, 10, 1.0); // Large vertical movement
      expect(result.success).toBe(true);
      
      constrainedManager.dispose();
    });

    test('should handle unconstrained orbits', () => {
      const unconstrainedManager = new OrbitCameraManager(camera, scene, {
        zoomLimits: { min: 2.0, max: 15.0 }
        // No orbit limits
      });

      const result = unconstrainedManager.orbit(1.0, 1.0, 1.0);
      expect(result.success).toBe(true);
      
      unconstrainedManager.dispose();
    });
  });
});