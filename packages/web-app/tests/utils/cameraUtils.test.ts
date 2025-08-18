import {
  getDeviceCameraConfig,
  getDefaultCameraConstraints,
  getDefaultViewPreferences,
  calculateOptimalCameraPosition,
  serializeCameraState,
  deserializeCameraState,
  validateCameraState,
  CameraEasing,
  sphericalToCartesian,
  cartesianToSpherical,
  calculateDistance,
  interpolateVector3D,
  getTargetFrameRate,
  supportsHighPerformanceCamera
} from '../../src/utils/cameraUtils';
import { CameraState } from '@rubiks-cube/shared';

// Mock window properties for testing
const mockWindow = (width: number, height: number, touchSupport: boolean = false) => {
  Object.defineProperty(window, 'innerWidth', {
    writable: true,
    configurable: true,
    value: width,
  });
  Object.defineProperty(window, 'innerHeight', {
    writable: true,
    configurable: true,
    value: height,
  });
  
  if (touchSupport) {
    Object.defineProperty(window, 'ontouchstart', {
      writable: true,
      configurable: true,
      value: {},
    });
  } else {
    delete (window as any).ontouchstart;
  }
};

describe('cameraUtils', () => {
  describe('getDeviceCameraConfig', () => {
    beforeEach(() => {
      // Reset to desktop default
      mockWindow(1200, 800, false);
    });

    test('should return mobile configuration for small screens', () => {
      mockWindow(400, 600, true);
      const config = getDeviceCameraConfig();
      
      expect(config.zoomSensitivity).toBe(0.5);
      expect(config.orbitSensitivity).toBe(0.8);
      expect(config.frameRate).toBe(30);
      expect(config.gestureDeadZone).toBe(10);
      expect(config.keyboardShortcuts).toBe(false);
    });

    test('should return tablet configuration for medium screens', () => {
      mockWindow(800, 600, true);
      const config = getDeviceCameraConfig();
      
      expect(config.zoomSensitivity).toBe(0.7);
      expect(config.orbitSensitivity).toBe(1.0);
      expect(config.hybridControls).toBe(true);
      expect(config.adaptiveGestures).toBe(true);
    });

    test('should return desktop configuration for large screens', () => {
      mockWindow(1200, 800, false);
      const config = getDeviceCameraConfig();
      
      expect(config.zoomSensitivity).toBe(1.0);
      expect(config.orbitSensitivity).toBe(1.2);
      expect(config.frameRate).toBe(60);
      expect(config.precisionControls).toBe(true);
      expect(config.keyboardShortcuts).toBe(true);
    });
  });

  describe('getDefaultCameraConstraints', () => {
    test('should return valid zoom and orbit constraints', () => {
      const constraints = getDefaultCameraConstraints();
      
      expect(constraints.zoomLimits.min).toBe(2.0);
      expect(constraints.zoomLimits.max).toBe(15.0);
      expect(constraints.zoomLimits.min).toBeLessThan(constraints.zoomLimits.max);
      
      expect(constraints.orbitLimits?.minPolarAngle).toBe(0);
      expect(constraints.orbitLimits?.maxPolarAngle).toBe(Math.PI);
      expect(constraints.orbitLimits?.minAzimuthAngle).toBe(-Infinity);
      expect(constraints.orbitLimits?.maxAzimuthAngle).toBe(Infinity);
    });
  });

  describe('getDefaultViewPreferences', () => {
    test('should return consistent view preferences', () => {
      const prefs = getDefaultViewPreferences();
      
      expect(prefs.defaultCameraPosition).toEqual({ x: 5, y: 5, z: 5 });
      expect(prefs.autoRotationTimeout).toBe(5000);
      expect(prefs.persistCameraState).toBe(true);
      expect(typeof prefs.autoRotationSpeed).toBe('number');
      expect(typeof prefs.zoomSensitivity).toBe('number');
      expect(typeof prefs.orbitSensitivity).toBe('number');
    });
  });

  describe('calculateOptimalCameraPosition', () => {
    test('should calculate position at default angles', () => {
      const position = calculateOptimalCameraPosition();
      
      // Default cube size is 2.0, distance is 2.0 * 3 = 6
      // At angles π/4, π/4: 6 * sin(π/4) * cos(π/4) ≈ 3.0
      expect(position.x).toBeCloseTo(3.0, 1); 
      expect(position.y).toBeCloseTo(4.24, 1); // 6 * cos(π/4) ≈ 4.24
      expect(position.z).toBeCloseTo(3.0, 1); 
    });

    test('should scale with cube size', () => {
      const position1 = calculateOptimalCameraPosition(1.0);
      const position2 = calculateOptimalCameraPosition(2.0);
      
      expect(position2.x).toBeCloseTo(position1.x * 2, 1);
      expect(position2.y).toBeCloseTo(position1.y * 2, 1);
      expect(position2.z).toBeCloseTo(position1.z * 2, 1);
    });

    test('should handle custom view angles', () => {
      const position = calculateOptimalCameraPosition(2.0, { azimuth: 0, polar: Math.PI / 2 });
      
      expect(position.x).toBeCloseTo(6, 1); // On X axis
      expect(position.y).toBeCloseTo(0, 1); // In XZ plane
      expect(position.z).toBeCloseTo(0, 1); // On X axis
    });
  });

  describe('camera state serialization', () => {
    const testCameraState: CameraState = {
      position: { x: 5, y: 5, z: 5 },
      rotation: { w: 1, x: 0, y: 0, z: 0 },
      zoom: 8.66,
      target: { x: 0, y: 0, z: 0 },
      isAnimating: false,
      autoRotationEnabled: true
    };

    test('should serialize camera state to JSON string', () => {
      const serialized = serializeCameraState(testCameraState);
      
      expect(typeof serialized).toBe('string');
      expect(serialized.length).toBeGreaterThan(0);
      
      const parsed = JSON.parse(serialized);
      expect(parsed.position).toEqual(testCameraState.position);
      expect(parsed.rotation).toEqual(testCameraState.rotation);
      expect(parsed.zoom).toBe(testCameraState.zoom);
      expect(parsed.target).toEqual(testCameraState.target);
      expect(parsed.autoRotationEnabled).toBe(testCameraState.autoRotationEnabled);
      expect(typeof parsed.timestamp).toBe('number');
    });

    test('should deserialize valid camera state', () => {
      const serialized = serializeCameraState(testCameraState);
      const deserialized = deserializeCameraState(serialized);
      
      expect(deserialized).not.toBeNull();
      expect(deserialized?.position).toEqual(testCameraState.position);
      expect(deserialized?.rotation).toEqual(testCameraState.rotation);
      expect(deserialized?.zoom).toBe(testCameraState.zoom);
      expect(deserialized?.target).toEqual(testCameraState.target);
      expect(deserialized?.isAnimating).toBe(false); // Always starts as not animating
      expect(deserialized?.autoRotationEnabled).toBe(testCameraState.autoRotationEnabled);
    });

    test('should handle invalid JSON gracefully', () => {
      const result = deserializeCameraState('invalid json');
      expect(result).toBeNull();
    });

    test('should handle incomplete data gracefully', () => {
      const incompleteJson = JSON.stringify({ position: { x: 1, y: 1, z: 1 } });
      const result = deserializeCameraState(incompleteJson);
      expect(result).toBeNull();
    });
  });

  describe('validateCameraState', () => {
    const validState: CameraState = {
      position: { x: 5, y: 5, z: 5 },
      rotation: { w: 1, x: 0, y: 0, z: 0 },
      zoom: 8.66,
      target: { x: 0, y: 0, z: 0 },
      isAnimating: false,
      autoRotationEnabled: true
    };

    test('should validate correct camera state', () => {
      expect(validateCameraState(validState)).toBe(true);
    });

    test('should reject state with invalid position', () => {
      const invalidState = { ...validState, position: { x: 'invalid', y: 5, z: 5 } } as any;
      expect(validateCameraState(invalidState)).toBe(false);
    });

    test('should reject state with missing rotation', () => {
      const invalidState = { ...validState, rotation: undefined } as any;
      expect(validateCameraState(invalidState)).toBe(false);
    });

    test('should reject state with invalid zoom', () => {
      const invalidState = { ...validState, zoom: -5 };
      expect(validateCameraState(invalidState)).toBe(false);
    });

    test('should reject state with invalid boolean flags', () => {
      const invalidState = { ...validState, isAnimating: 'not boolean' } as any;
      expect(validateCameraState(invalidState)).toBe(false);
    });
  });

  describe('CameraEasing functions', () => {
    test('linear easing should return input value', () => {
      expect(CameraEasing.linear(0)).toBe(0);
      expect(CameraEasing.linear(0.5)).toBe(0.5);
      expect(CameraEasing.linear(1)).toBe(1);
    });

    test('easeOut should start fast and slow down', () => {
      const early = CameraEasing.easeOut(0.1);
      const late = CameraEasing.easeOut(0.9);
      const linear_early = 0.1;
      const linear_late = 0.9;
      
      expect(early).toBeGreaterThan(linear_early);
      expect(late).toBeLessThan(linear_late + 0.1);
    });

    test('easeInOut should be symmetric', () => {
      expect(CameraEasing.easeInOut(0)).toBe(0);
      expect(CameraEasing.easeInOut(1)).toBe(1);
      expect(CameraEasing.easeInOut(0.5)).toBeCloseTo(0.5, 1);
    });

    test('all easing functions should stay within [0, 1] range', () => {
      const testValues = [0, 0.25, 0.5, 0.75, 1];
      const easingFunctions = Object.values(CameraEasing);
      
      easingFunctions.forEach(easingFn => {
        testValues.forEach(t => {
          const result = easingFn(t);
          expect(result).toBeGreaterThanOrEqual(0);
          expect(result).toBeLessThanOrEqual(1.2); // Allow slight overshoot for elastic/back
        });
      });
    });
  });

  describe('coordinate conversions', () => {
    test('spherical to cartesian conversion', () => {
      const cartesian = sphericalToCartesian(1, 0, Math.PI / 2);
      
      expect(cartesian.x).toBeCloseTo(1, 5);
      expect(cartesian.y).toBeCloseTo(0, 5);
      expect(cartesian.z).toBeCloseTo(0, 5);
    });

    test('cartesian to spherical conversion', () => {
      const spherical = cartesianToSpherical({ x: 1, y: 0, z: 0 });
      
      expect(spherical.radius).toBeCloseTo(1, 5);
      expect(spherical.azimuth).toBeCloseTo(0, 5);
      expect(spherical.polar).toBeCloseTo(Math.PI / 2, 5);
    });

    test('coordinate conversion round trip', () => {
      const original = { x: 3, y: 4, z: 5 };
      const spherical = cartesianToSpherical(original);
      const converted = sphericalToCartesian(spherical.radius, spherical.azimuth, spherical.polar);
      
      expect(converted.x).toBeCloseTo(original.x, 10);
      expect(converted.y).toBeCloseTo(original.y, 10);
      expect(converted.z).toBeCloseTo(original.z, 10);
    });
  });

  describe('utility functions', () => {
    test('calculateDistance should compute 3D distance correctly', () => {
      const point1 = { x: 0, y: 0, z: 0 };
      const point2 = { x: 3, y: 4, z: 0 };
      
      expect(calculateDistance(point1, point2)).toBeCloseTo(5, 5);
    });

    test('interpolateVector3D should interpolate correctly', () => {
      const start = { x: 0, y: 0, z: 0 };
      const end = { x: 10, y: 20, z: 30 };
      
      const midpoint = interpolateVector3D(start, end, 0.5);
      expect(midpoint).toEqual({ x: 5, y: 10, z: 15 });
      
      const quarter = interpolateVector3D(start, end, 0.25);
      expect(quarter).toEqual({ x: 2.5, y: 5, z: 7.5 });
    });

    test('getTargetFrameRate should return device-appropriate frame rate', () => {
      const frameRate = getTargetFrameRate();
      expect(typeof frameRate).toBe('number');
      expect(frameRate).toBeGreaterThan(0);
      expect([30, 60]).toContain(frameRate);
    });

    test('supportsHighPerformanceCamera should return boolean', () => {
      // Mock WebGL context
      const mockGetExtension = jest.fn();
      const mockGetParameter = jest.fn();
      const mockWebGLContext = {
        getExtension: mockGetExtension,
        getParameter: mockGetParameter
      };
      
      const originalGetContext = HTMLCanvasElement.prototype.getContext;
      (HTMLCanvasElement.prototype.getContext as jest.Mock) = jest.fn(() => mockWebGLContext);
      
      const supports = supportsHighPerformanceCamera();
      expect(typeof supports).toBe('boolean');
      
      // Restore original method
      HTMLCanvasElement.prototype.getContext = originalGetContext;
    });
  });
});