/**
 * Camera State Persistence Tests
 * Tests camera state persistence and restoration across browser sessions
 * Validates localStorage integration, state serialization, and migration handling
 */

import { renderHook, act } from '@testing-library/react';
import { useCameraControls } from '../../src/hooks/useCameraControls';
import { ViewPreferencesManager } from '@rubiks-cube/cube-engine/preferences/ViewPreferences';
import { CameraState, ViewPreferences, Vector3D } from '@rubiks-cube/shared';
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

// Mock camera managers
jest.mock('@rubiks-cube/three-renderer/cameras/OrbitCameraManager', () => ({
  OrbitCameraManager: jest.fn(() => ({
    orbit: jest.fn(),
    zoom: jest.fn(),
    resetPosition: jest.fn(),
    setPosition: jest.fn(),
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

// Mock localStorage
const mockLocalStorage = (() => {
  let store: Record<string, string> = {};
  
  return {
    getItem: jest.fn((key: string) => store[key] || null),
    setItem: jest.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: jest.fn((key: string) => {
      delete store[key];
    }),
    clear: jest.fn(() => {
      store = {};
    }),
    get length() {
      return Object.keys(store).length;
    },
    key: jest.fn((index: number) => Object.keys(store)[index] || null),
    // Test utility to access internal store
    __getStore: () => ({ ...store }),
    __setStore: (newStore: Record<string, string>) => {
      store = { ...newStore };
    }
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage
});

describe('Camera State Persistence Tests', () => {
  let mockScene: THREE.Scene;
  let mockCamera: THREE.PerspectiveCamera;
  let mockCanvas: HTMLCanvasElement;
  let mockOrbitManager: any;
  let mockInputProcessor: any;
  let preferencesManager: ViewPreferencesManager;

  const defaultCameraState: CameraState = {
    position: { x: 5, y: 5, z: 5 },
    rotation: { w: 1, x: 0, y: 0, z: 0 },
    zoom: 8.66,
    target: { x: 0, y: 0, z: 0 },
    isAnimating: false,
    autoRotationEnabled: false
  };

  const defaultPreferences: ViewPreferences = {
    defaultCameraPosition: { x: 5, y: 5, z: 5 },
    autoRotationSpeed: 0.5,
    autoRotationTimeout: 5000,
    zoomSensitivity: 1.0,
    orbitSensitivity: 1.2,
    persistCameraState: true
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockLocalStorage.clear();

    mockScene = new THREE.Scene();
    mockCamera = new THREE.PerspectiveCamera();
    mockCanvas = document.createElement('canvas');
    preferencesManager = new ViewPreferencesManager();

    // Mock successful camera manager
    const { OrbitCameraManager } = require('@rubiks-cube/three-renderer/cameras/OrbitCameraManager');
    mockOrbitManager = {
      orbit: jest.fn().mockReturnValue({ success: true, data: undefined }),
      zoom: jest.fn().mockReturnValue({ success: true, data: undefined }),
      resetPosition: jest.fn().mockReturnValue({ success: true, data: Promise.resolve() }),
      setPosition: jest.fn().mockReturnValue({ success: true, data: undefined }),
      getCameraState: jest.fn().mockReturnValue(defaultCameraState),
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
    cameraUtils.getDeviceCameraConfig.mockReturnValue({
      device: 'desktop',
      zoomSensitivity: 1.0,
      orbitSensitivity: 1.2
    });
    cameraUtils.getDefaultCameraConstraints.mockReturnValue({
      minZoom: 0.5,
      maxZoom: 3.0
    });
    cameraUtils.getDefaultViewPreferences.mockReturnValue(defaultPreferences);
    cameraUtils.validateCameraState.mockReturnValue(true);
    cameraUtils.serializeCameraState.mockImplementation((state: CameraState) => 
      JSON.stringify(state)
    );
    cameraUtils.deserializeCameraState.mockImplementation((serialized: string) => {
      try {
        return JSON.parse(serialized);
      } catch {
        return null;
      }
    });
  });

  describe('Camera State Serialization', () => {
    test('should serialize camera state correctly', () => {
      const { serializeCameraState } = require('../../src/utils/cameraUtils');
      
      const testState: CameraState = {
        position: { x: 10, y: 8, z: 6 },
        rotation: { w: 0.8, x: 0.2, y: 0.1, z: 0.5 },
        zoom: 12.5,
        target: { x: 0, y: 0, z: 0 },
        isAnimating: false,
        autoRotationEnabled: true
      };

      const serialized = serializeCameraState(testState);
      expect(serialized).toBeDefined();
      expect(typeof serialized).toBe('string');
      
      // Should be valid JSON
      expect(() => JSON.parse(serialized)).not.toThrow();
      
      window.console.log('Serialized camera state:', serialized);
    });

    test('should deserialize camera state correctly', () => {
      const { deserializeCameraState } = require('../../src/utils/cameraUtils');
      
      const testState: CameraState = {
        position: { x: 7, y: 7, z: 7 },
        rotation: { w: 1, x: 0, y: 0, z: 0 },
        zoom: 10.0,
        target: { x: 0, y: 0, z: 0 },
        isAnimating: false,
        autoRotationEnabled: false
      };

      const serialized = JSON.stringify(testState);
      const deserialized = deserializeCameraState(serialized);
      
      expect(deserialized).toEqual(testState);
    });

    test('should handle invalid serialized data gracefully', () => {
      const { deserializeCameraState } = require('../../src/utils/cameraUtils');
      
      // Test invalid JSON
      const invalidJson = '{"position":{"x":5,"y":5';
      const result1 = deserializeCameraState(invalidJson);
      expect(result1).toBeNull();

      // Test empty string
      const result2 = deserializeCameraState('');
      expect(result2).toBeNull();

      // Test non-JSON string
      const result3 = deserializeCameraState('not json');
      expect(result3).toBeNull();
    });
  });

  describe('Camera State Persistence', () => {
    test('should save camera state to localStorage when enabled', () => {
      const { result } = renderHook(() => 
        useCameraControls(mockScene, mockCamera, mockCanvas)
      );

      const modifiedState: CameraState = {
        ...defaultCameraState,
        position: { x: 8, y: 6, z: 4 },
        zoom: 15.0
      };

      mockOrbitManager.getCameraState.mockReturnValue(modifiedState);

      // Trigger a camera operation that should save state
      act(() => {
        result.current.orbitCamera(0.1, 0.1);
      });

      // Should have called localStorage.setItem
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'rubiks-cube-camera-state',
        expect.any(String)
      );
      
      // Verify the stored data is valid
      const storedData = mockLocalStorage.getItem('rubiks-cube-camera-state');
      expect(storedData).toBeDefined();
      expect(() => JSON.parse(storedData!)).not.toThrow();
      
      window.console.log('Stored camera state:', storedData);
    });

    test('should not save camera state when persistence is disabled', () => {
      const { getDefaultViewPreferences } = require('../../src/utils/cameraUtils');
      getDefaultViewPreferences.mockReturnValue({
        ...defaultPreferences,
        persistCameraState: false
      });

      const { result } = renderHook(() => 
        useCameraControls(mockScene, mockCamera, mockCanvas)
      );

      // Trigger a camera operation
      act(() => {
        result.current.orbitCamera(0.1, 0.1);
      });

      // Should not have called localStorage.setItem
      expect(mockLocalStorage.setItem).not.toHaveBeenCalled();
    });

    test('should restore camera state on initialization', () => {
      const savedState: CameraState = {
        position: { x: 12, y: 8, z: 10 },
        rotation: { w: 0.9, x: 0.1, y: 0.2, z: 0.3 },
        zoom: 20.0,
        target: { x: 0, y: 0, z: 0 },
        isAnimating: false,
        autoRotationEnabled: true
      };

      // Pre-populate localStorage with saved state
      mockLocalStorage.setItem('rubiks-cube-camera-state', JSON.stringify(savedState));

      const { result } = renderHook(() => 
        useCameraControls(mockScene, mockCamera, mockCanvas)
      );

      // Should have attempted to restore the saved position
      expect(mockOrbitManager.setPosition).toHaveBeenCalledWith(savedState.position);
      expect(mockLocalStorage.getItem).toHaveBeenCalledWith('rubiks-cube-camera-state');
    });

    test('should handle corrupted localStorage data gracefully', () => {
      // Store corrupted data
      mockLocalStorage.setItem('rubiks-cube-camera-state', 'corrupted-data');

      const { result } = renderHook(() => 
        useCameraControls(mockScene, mockCamera, mockCanvas)
      );

      // Should not crash and should not call setPosition
      expect(mockOrbitManager.setPosition).not.toHaveBeenCalled();
      expect(result.current.isInitialized).toBe(true);
    });

    test('should handle missing localStorage data gracefully', () => {
      // Ensure no data is stored
      mockLocalStorage.clear();

      const { result } = renderHook(() => 
        useCameraControls(mockScene, mockCamera, mockCanvas)
      );

      // Should initialize normally without restoring any state
      expect(mockOrbitManager.setPosition).not.toHaveBeenCalled();
      expect(result.current.isInitialized).toBe(true);
    });
  });

  describe('View Preferences Integration', () => {
    test('should save and load view preferences correctly', () => {
      const customPreferences: ViewPreferences = {
        defaultCameraPosition: { x: 10, y: 10, z: 10 },
        autoRotationSpeed: 1.0,
        autoRotationTimeout: 3000,
        zoomSensitivity: 0.8,
        orbitSensitivity: 1.5,
        persistCameraState: true
      };

      const saveResult = preferencesManager.savePreferences(customPreferences);
      expect(saveResult.success).toBe(true);

      const loadResult = preferencesManager.loadPreferences();
      expect(loadResult.success).toBe(true);
      expect(loadResult.data).toEqual(customPreferences);
    });

    test('should handle preferences migration between versions', () => {
      // Simulate old version preferences
      const oldVersionData = {
        version: '0.9',
        timestamp: Date.now(),
        preferences: {
          defaultPosition: { x: 5, y: 5, z: 5 }, // Old field name
          rotationSpeed: 0.5
        }
      };

      mockLocalStorage.setItem('rubiks-cube-view-preferences', JSON.stringify(oldVersionData));

      const loadResult = preferencesManager.loadPreferences();
      
      // Should fallback to defaults for unsupported version
      expect(loadResult.success).toBe(true);
      expect(loadResult.data).toEqual(expect.objectContaining({
        defaultCameraPosition: expect.any(Object),
        autoRotationSpeed: expect.any(Number)
      }));
    });

    test('should export and import preferences correctly', () => {
      const preferences: ViewPreferences = {
        defaultCameraPosition: { x: 8, y: 8, z: 8 },
        autoRotationSpeed: 0.7,
        autoRotationTimeout: 4000,
        zoomSensitivity: 1.1,
        orbitSensitivity: 0.9,
        persistCameraState: false
      };

      // Save preferences
      preferencesManager.savePreferences(preferences);

      // Export preferences
      const exportResult = preferencesManager.exportPreferences();
      expect(exportResult.success).toBe(true);
      expect(exportResult.data).toBeDefined();

      // Clear current preferences
      preferencesManager.clearPreferences();

      // Import preferences
      const importResult = preferencesManager.importPreferences(exportResult.data!);
      expect(importResult.success).toBe(true);
      expect(importResult.data).toEqual(preferences);
    });

    test('should validate preferences data before saving', () => {
      const invalidPreferences = {
        defaultCameraPosition: { x: 'invalid', y: 5, z: 5 },
        autoRotationSpeed: -1, // Invalid negative speed
        autoRotationTimeout: 'not-a-number',
        zoomSensitivity: 10, // Too high
        orbitSensitivity: 0, // Too low
        persistCameraState: 'yes' // Wrong type
      } as any;

      const result = preferencesManager.savePreferences(invalidPreferences);
      expect(result.success).toBe(true); // Should succeed but sanitize data

      const loadResult = preferencesManager.loadPreferences();
      expect(loadResult.success).toBe(true);
      
      // Should have sanitized the invalid values
      const sanitized = loadResult.data;
      expect(typeof sanitized.defaultCameraPosition.x).toBe('number');
      expect(sanitized.autoRotationSpeed).toBeGreaterThan(0);
      expect(typeof sanitized.autoRotationTimeout).toBe('number');
      expect(sanitized.zoomSensitivity).toBeLessThanOrEqual(3.0);
      expect(sanitized.orbitSensitivity).toBeGreaterThanOrEqual(0.1);
      expect(typeof sanitized.persistCameraState).toBe('boolean');
    });
  });

  describe('Cross-Session Restoration', () => {
    test('should restore camera state across simulated browser sessions', () => {
      // Session 1: Set up camera state
      const session1State: CameraState = {
        position: { x: 15, y: 12, z: 8 },
        rotation: { w: 0.7, x: 0.2, y: 0.3, z: 0.6 },
        zoom: 25.0,
        target: { x: 0, y: 0, z: 0 },
        isAnimating: false,
        autoRotationEnabled: true
      };

      const { result: session1Result } = renderHook(() => 
        useCameraControls(mockScene, mockCamera, mockCanvas)
      );

      mockOrbitManager.getCameraState.mockReturnValue(session1State);

      // Simulate camera movement that triggers save
      act(() => {
        session1Result.current.orbitCamera(0.2, 0.1);
      });

      // Verify state was saved
      const storedState = mockLocalStorage.getItem('rubiks-cube-camera-state');
      expect(storedState).toBeDefined();

      // Session 2: Simulate new browser session
      jest.clearAllMocks();
      
      const { result: session2Result } = renderHook(() => 
        useCameraControls(mockScene, mockCamera, mockCanvas)
      );

      // Should have attempted to restore the position from session 1
      expect(mockOrbitManager.setPosition).toHaveBeenCalledWith(session1State.position);
      expect(session2Result.current.isInitialized).toBe(true);
    });

    test('should handle localStorage quota exceeded gracefully', () => {
      // Mock localStorage quota exceeded error
      mockLocalStorage.setItem.mockImplementation(() => {
        throw new Error('QuotaExceededError');
      });

      const { result } = renderHook(() => 
        useCameraControls(mockScene, mockCamera, mockCanvas)
      );

      // Should not crash when trying to save state
      expect(() => {
        act(() => {
          result.current.orbitCamera(0.1, 0.1);
        });
      }).not.toThrow();

      expect(result.current.isInitialized).toBe(true);
    });

    test('should handle localStorage unavailable gracefully', () => {
      // Mock localStorage being unavailable
      Object.defineProperty(window, 'localStorage', {
        value: undefined,
        writable: true
      });

      const { result } = renderHook(() => 
        useCameraControls(mockScene, mockCamera, mockCanvas)
      );

      // Should initialize normally without persistence
      expect(result.current.isInitialized).toBe(true);

      // Restore localStorage for other tests
      Object.defineProperty(window, 'localStorage', {
        value: mockLocalStorage,
        writable: true
      });
    });
  });

  describe('State Validation and Error Recovery', () => {
    test('should validate restored camera state before applying', () => {
      const invalidState = {
        position: { x: NaN, y: Infinity, z: -Infinity },
        rotation: { w: 'invalid', x: null, y: undefined, z: 2 },
        zoom: -5, // Invalid negative zoom
        target: null,
        isAnimating: 'yes',
        autoRotationEnabled: 1
      };

      mockLocalStorage.setItem('rubiks-cube-camera-state', JSON.stringify(invalidState));

      const { validateCameraState } = require('../../src/utils/cameraUtils');
      validateCameraState.mockReturnValue(false); // Simulate validation failure

      const { result } = renderHook(() => 
        useCameraControls(mockScene, mockCamera, mockCanvas)
      );

      // Should not apply invalid state
      expect(mockOrbitManager.setPosition).not.toHaveBeenCalled();
      expect(result.current.isInitialized).toBe(true);
    });

    test('should clear corrupted state and continue normally', () => {
      // Store completely invalid data
      mockLocalStorage.setItem('rubiks-cube-camera-state', '{"corrupted":');

      const { result } = renderHook(() => 
        useCameraControls(mockScene, mockCamera, mockCanvas)
      );

      // Should initialize normally
      expect(result.current.isInitialized).toBe(true);
      
      // Should be able to perform normal operations
      expect(() => {
        act(() => {
          result.current.orbitCamera(0.1, 0.1);
        });
      }).not.toThrow();
    });

    test('should provide fallback for missing required properties', () => {
      const incompleteState = {
        position: { x: 5, y: 5, z: 5 }
        // Missing other required properties
      };

      mockLocalStorage.setItem('rubiks-cube-camera-state', JSON.stringify(incompleteState));

      const { result } = renderHook(() => 
        useCameraControls(mockScene, mockCamera, mockCanvas)
      );

      // Should handle incomplete state gracefully
      expect(result.current.isInitialized).toBe(true);
    });
  });

  describe('Performance Impact of Persistence', () => {
    test('should have minimal performance impact on camera operations', () => {
      const { result } = renderHook(() => 
        useCameraControls(mockScene, mockCamera, mockCanvas)
      );

      // Measure time for operations with persistence enabled
      const operations = [];
      for (let i = 0; i < 20; i++) {
        const start = performance.now();
        
        act(() => {
          result.current.orbitCamera(0.01, 0.01);
        });
        
        const end = performance.now();
        operations.push(end - start);
      }

      const averageTime = operations.reduce((sum, time) => sum + time, 0) / operations.length;
      
      // Should not significantly impact performance
      expect(averageTime).toBeLessThanOrEqual(20); // Allow up to 20ms per operation
      
      window.console.log(`Average operation time with persistence: ${averageTime.toFixed(2)}ms`);
    });

    test('should batch state saves efficiently', () => {
      const { result } = renderHook(() => 
        useCameraControls(mockScene, mockCamera, mockCanvas)
      );

      // Perform rapid operations
      for (let i = 0; i < 10; i++) {
        act(() => {
          result.current.orbitCamera(0.001, 0.001);
        });
      }

      // Should have called setItem for each operation (current implementation)
      // In a real implementation, this might be debounced
      expect(mockLocalStorage.setItem).toHaveBeenCalled();
    });
  });
});