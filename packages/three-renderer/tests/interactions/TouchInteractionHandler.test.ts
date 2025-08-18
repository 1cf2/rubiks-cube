/**
 * TouchInteractionHandler Test Suite
 * Tests for Three.js touch interaction integration and face detection
 */

import * as THREE from 'three';
import { TouchInteractionHandler } from '../../src/interactions/TouchInteractionHandler';
import { 
  FacePosition, 
  TouchGesture, 
  TouchError, 
  RotationDirection, 
  Vector2 
} from '@rubiks-cube/shared/types';

// Mock Three.js
jest.mock('three');

describe('TouchInteractionHandler', () => {
  let mockCamera: THREE.Camera;
  let mockScene: THREE.Scene;
  let mockMesh: THREE.Mesh;
  let mockCanvas: HTMLCanvasElement;

  beforeEach(() => {
    // Setup mock camera
    mockCamera = new THREE.PerspectiveCamera();
    
    // Setup mock scene
    mockScene = new THREE.Scene();
    
    // Setup mock mesh with face name
    mockMesh = new THREE.Mesh();
    mockMesh.name = 'front-face';
    mockMesh.isMesh = true;
    
    // Setup mock canvas
    mockCanvas = document.createElement('canvas');
    mockCanvas.getBoundingClientRect = jest.fn(() => ({
      left: 0,
      top: 0,
      width: 800,
      height: 600,
      right: 800,
      bottom: 600,
      x: 0,
      y: 0,
      toJSON: () => {},
    }));
    
    // Mock raycaster intersection
    const mockIntersection = {
      point: new THREE.Vector3(0, 0, 0),
      object: mockMesh,
      distance: 1,
    };
    
    // Mock THREE.Raycaster
    const mockRaycaster = {
      setFromCamera: jest.fn(),
      intersectObjects: jest.fn(() => [mockIntersection]),
    };
    
    (THREE.Raycaster as jest.Mock).mockImplementation(() => mockRaycaster);
    
    // Mock THREE.Vector2
    (THREE.Vector2 as jest.Mock).mockImplementation((x, y) => ({ x, y, set: jest.fn() }));
  });

  describe('raycastTouchOnCube', () => {
    test('should successfully detect cube face intersection', () => {
      const touchPosition: Vector2 = { x: 0, y: 0 };
      
      const result = TouchInteractionHandler.raycastTouchOnCube({
        camera: mockCamera,
        scene: mockScene,
        touchPosition,
        recursive: true,
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBeDefined();
        expect(result.data?.facePosition).toBe(FacePosition.FRONT);
        expect(result.data?.point).toEqual([0, 0, 0]);
        expect(result.data?.touchPosition).toEqual(touchPosition);
      }
    });

    test('should return null when no cube face is intersected', () => {
      // Mock empty intersection
      const mockRaycaster = {
        setFromCamera: jest.fn(),
        intersectObjects: jest.fn(() => []),
      };
      
      (THREE.Raycaster as jest.Mock).mockImplementation(() => mockRaycaster);

      const result = TouchInteractionHandler.raycastTouchOnCube({
        camera: mockCamera,
        scene: mockScene,
        touchPosition: { x: 0, y: 0 },
      });

      expect(result.success).toBe(true);
      expect(result.data).toBeNull();
    });

    test('should handle missing camera', () => {
      const result = TouchInteractionHandler.raycastTouchOnCube({
        camera: null as any,
        scene: mockScene,
        touchPosition: { x: 0, y: 0 },
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe(TouchError.INVALID_GESTURE);
        expect(result.message).toContain('Camera or scene not provided');
      }
    });

    test('should handle missing scene', () => {
      const result = TouchInteractionHandler.raycastTouchOnCube({
        camera: mockCamera,
        scene: null as any,
        touchPosition: { x: 0, y: 0 },
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe(TouchError.INVALID_GESTURE);
        expect(result.message).toContain('Camera or scene not provided');
      }
    });

    test('should filter out non-cube meshes', () => {
      const nonCubeMesh = new THREE.Mesh();
      nonCubeMesh.name = 'some-other-mesh';
      nonCubeMesh.isMesh = true;

      const mockIntersection = {
        point: new THREE.Vector3(0, 0, 0),
        object: nonCubeMesh,
        distance: 1,
      };

      const mockRaycaster = {
        setFromCamera: jest.fn(),
        intersectObjects: jest.fn(() => [mockIntersection]),
      };
      
      (THREE.Raycaster as jest.Mock).mockImplementation(() => mockRaycaster);

      const result = TouchInteractionHandler.raycastTouchOnCube({
        camera: mockCamera,
        scene: mockScene,
        touchPosition: { x: 0, y: 0 },
      });

      expect(result.success).toBe(true);
      expect(result.data).toBeNull();
    });

    test('should handle different face name formats', () => {
      const testCases = [
        { name: 'front-face', expected: FacePosition.FRONT },
        { name: 'BACK-FACE', expected: FacePosition.BACK },
        { name: 'left', expected: FacePosition.LEFT },
        { name: 'RIGHT', expected: FacePosition.RIGHT },
        { name: 'up-face', expected: FacePosition.UP },
        { name: 'down', expected: FacePosition.DOWN },
      ];

      testCases.forEach(({ name, expected }) => {
        const testMesh = new THREE.Mesh();
        testMesh.name = name;
        testMesh.isMesh = true;

        const mockIntersection = {
          point: new THREE.Vector3(0, 0, 0),
          object: testMesh,
          distance: 1,
        };

        const mockRaycaster = {
          setFromCamera: jest.fn(),
          intersectObjects: jest.fn(() => [mockIntersection]),
        };
        
        (THREE.Raycaster as jest.Mock).mockImplementation(() => mockRaycaster);

        const result = TouchInteractionHandler.raycastTouchOnCube({
          camera: mockCamera,
          scene: mockScene,
          touchPosition: { x: 0, y: 0 },
        });

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data?.facePosition).toBe(expected);
        }
      });
    });
  });

  describe('gestureToRotationCommand', () => {
    test('should convert swipe gesture to rotation command', () => {
      const gesture: TouchGesture = {
        type: 'swipe',
        direction: 'right',
        velocity: 5.0,
        touches: [],
        confidence: 0.8,
      };

      const result = TouchInteractionHandler.gestureToRotationCommand(
        gesture,
        FacePosition.FRONT
      );

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.face).toBe(FacePosition.FRONT);
        expect(result.data.direction).toBe(RotationDirection.CLOCKWISE);
        expect(result.data.velocity).toBe(5.0);
      }
    });

    test('should cap velocity to reasonable maximum', () => {
      const gesture: TouchGesture = {
        type: 'swipe',
        direction: 'right',
        velocity: 50.0, // Very high velocity
        touches: [],
        confidence: 0.8,
      };

      const result = TouchInteractionHandler.gestureToRotationCommand(
        gesture,
        FacePosition.FRONT
      );

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.velocity).toBe(10); // Capped at 10
      }
    });

    test('should reject non-swipe gestures', () => {
      const gesture: TouchGesture = {
        type: 'tap',
        direction: 'down',
        velocity: 0,
        touches: [],
        confidence: 0.9,
      };

      const result = TouchInteractionHandler.gestureToRotationCommand(
        gesture,
        FacePosition.FRONT
      );

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe(TouchError.INVALID_GESTURE);
        expect(result.message).toContain('Only swipe gestures can be converted');
      }
    });

    test('should map swipe directions correctly for all faces', () => {
      const testCases = [
        // Front face
        { face: FacePosition.FRONT, direction: 'left', expected: RotationDirection.COUNTERCLOCKWISE },
        { face: FacePosition.FRONT, direction: 'right', expected: RotationDirection.CLOCKWISE },
        { face: FacePosition.FRONT, direction: 'up', expected: RotationDirection.CLOCKWISE },
        { face: FacePosition.FRONT, direction: 'down', expected: RotationDirection.COUNTERCLOCKWISE },
        
        // Back face (reversed)
        { face: FacePosition.BACK, direction: 'left', expected: RotationDirection.CLOCKWISE },
        { face: FacePosition.BACK, direction: 'right', expected: RotationDirection.COUNTERCLOCKWISE },
        
        // Left face
        { face: FacePosition.LEFT, direction: 'up', expected: RotationDirection.COUNTERCLOCKWISE },
        { face: FacePosition.LEFT, direction: 'down', expected: RotationDirection.CLOCKWISE },
        
        // Right face
        { face: FacePosition.RIGHT, direction: 'up', expected: RotationDirection.CLOCKWISE },
        { face: FacePosition.RIGHT, direction: 'down', expected: RotationDirection.COUNTERCLOCKWISE },
        
        // Up face
        { face: FacePosition.UP, direction: 'left', expected: RotationDirection.COUNTERCLOCKWISE },
        { face: FacePosition.UP, direction: 'right', expected: RotationDirection.CLOCKWISE },
        
        // Down face
        { face: FacePosition.DOWN, direction: 'left', expected: RotationDirection.CLOCKWISE },
        { face: FacePosition.DOWN, direction: 'right', expected: RotationDirection.COUNTERCLOCKWISE },
      ];

      testCases.forEach(({ face, direction, expected }) => {
        const gesture: TouchGesture = {
          type: 'swipe',
          direction: direction as any,
          velocity: 5.0,
          touches: [],
          confidence: 0.8,
        };

        const result = TouchInteractionHandler.gestureToRotationCommand(gesture, face);

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.direction).toBe(expected);
        }
      });
    });

    test('should handle invalid swipe directions', () => {
      const gesture: TouchGesture = {
        type: 'swipe',
        direction: 'invalid' as any,
        velocity: 5.0,
        touches: [],
        confidence: 0.8,
      };

      const result = TouchInteractionHandler.gestureToRotationCommand(
        gesture,
        FacePosition.FRONT
      );

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe(TouchError.INVALID_GESTURE);
        expect(result.message).toContain('Invalid swipe direction');
      }
    });
  });

  describe('validateTouchTarget', () => {
    test('should validate touch target meets minimum size', () => {
      const intersection = {
        facePosition: FacePosition.FRONT,
        point: [0, 0, 0] as const,
        normal: [0, 0, 1] as const,
        distance: 1,
        touchPosition: { x: 0, y: 0 },
      };

      // Mock successful validation
      mockCamera.getWorldDirection = jest.fn();
      
      const mockVector3 = {
        project: jest.fn().mockReturnThis(),
        x: 0.5,
        y: 0.5,
      };
      
      (THREE.Vector3 as jest.Mock).mockImplementation(() => mockVector3);

      const result = TouchInteractionHandler.validateTouchTarget(
        intersection,
        mockCanvas,
        44
      );

      expect(result.success).toBe(true);
      if (result.success) {
        expect(typeof result.data).toBe('boolean');
      }
    });

    test('should handle missing camera in validation', () => {
      const intersection = {
        facePosition: FacePosition.FRONT,
        point: [0, 0, 0] as const,
        normal: [0, 0, 1] as const,
        distance: 1,
        touchPosition: { x: 0, y: 0 },
      };

      // Mock raycaster with no camera
      const mockRaycaster = {
        camera: null,
      };
      
      (TouchInteractionHandler as any).raycaster = mockRaycaster;

      const result = TouchInteractionHandler.validateTouchTarget(
        intersection,
        mockCanvas,
        44
      );

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe(TouchError.TOUCH_TARGET_TOO_SMALL);
        expect(result.message).toContain('No camera available');
      }
    });
  });

  describe('resource management', () => {
    test('should dispose resources properly', () => {
      const mockVector2 = {
        set: jest.fn(),
      };
      
      (TouchInteractionHandler as any).touchVector = mockVector2;

      TouchInteractionHandler.dispose();

      expect(mockVector2.set).toHaveBeenCalledWith(0, 0);
    });
  });

  describe('error handling', () => {
    test('should handle raycasting exceptions', () => {
      const mockRaycaster = {
        setFromCamera: jest.fn(() => {
          throw new Error('Raycasting failed');
        }),
        intersectObjects: jest.fn(),
      };
      
      (THREE.Raycaster as jest.Mock).mockImplementation(() => mockRaycaster);

      const result = TouchInteractionHandler.raycastTouchOnCube({
        camera: mockCamera,
        scene: mockScene,
        touchPosition: { x: 0, y: 0 },
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe(TouchError.INVALID_GESTURE);
        expect(result.message).toContain('Raycasting failed');
      }
    });

    test('should handle gesture conversion exceptions', () => {
      const invalidGesture = {
        type: 'swipe',
        direction: 'right',
        velocity: NaN, // Invalid velocity
        touches: [],
        confidence: 0.8,
      } as TouchGesture;

      // This should not throw but handle gracefully
      const result = TouchInteractionHandler.gestureToRotationCommand(
        invalidGesture,
        FacePosition.FRONT
      );

      // The function should handle this gracefully
      expect(result.success).toBeDefined();
    });
  });

  describe('face normal calculations', () => {
    test('should return correct normals for all faces', () => {
      const expectedNormals = {
        [FacePosition.FRONT]: [0, 0, 1],
        [FacePosition.BACK]: [0, 0, -1],
        [FacePosition.LEFT]: [-1, 0, 0],
        [FacePosition.RIGHT]: [1, 0, 0],
        [FacePosition.UP]: [0, 1, 0],
        [FacePosition.DOWN]: [0, -1, 0],
      };

      Object.entries(expectedNormals).forEach(([face, expectedNormal]) => {
        const testMesh = new THREE.Mesh();
        testMesh.name = face;
        testMesh.isMesh = true;

        const mockIntersection = {
          point: new THREE.Vector3(0, 0, 0),
          object: testMesh,
          distance: 1,
        };

        const mockRaycaster = {
          setFromCamera: jest.fn(),
          intersectObjects: jest.fn(() => [mockIntersection]),
        };
        
        (THREE.Raycaster as jest.Mock).mockImplementation(() => mockRaycaster);

        const result = TouchInteractionHandler.raycastTouchOnCube({
          camera: mockCamera,
          scene: mockScene,
          touchPosition: { x: 0, y: 0 },
        });

        expect(result.success).toBe(true);
        if (result.success && result.data) {
          expect(result.data.normal).toEqual(expectedNormal);
        }
      });
    });
  });
});