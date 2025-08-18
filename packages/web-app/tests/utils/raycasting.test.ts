import * as THREE from 'three';
import { RaycastingUtils } from '../../src/utils/raycasting';
import { FacePosition, MousePosition } from '@rubiks-cube/shared/types';

// Mock Three.js components
jest.mock('three');

describe('RaycastingUtils', () => {
  let mockCamera: THREE.Camera;
  let mockScene: THREE.Scene;
  let mockCanvas: HTMLCanvasElement;
  let mockMesh: THREE.Mesh;

  beforeEach(() => {
    // Setup mock camera
    mockCamera = new THREE.PerspectiveCamera();
    mockCamera.getWorldDirection = jest.fn().mockReturnValue(new THREE.Vector3(0, 0, -1));

    // Setup mock scene
    mockScene = new THREE.Scene();

    // Setup mock canvas
    mockCanvas = document.createElement('canvas');
    mockCanvas.width = 800;
    mockCanvas.height = 600;
    Object.defineProperty(mockCanvas, 'getBoundingClientRect', {
      value: jest.fn(() => ({
        left: 0,
        top: 0,
        width: 800,
        height: 600,
      })),
    });
    document.body.appendChild(mockCanvas);

    // Setup mock mesh
    mockMesh = new THREE.Mesh();
    mockMesh.name = 'front-face';
    mockMesh.isMesh = true;

    // Mock querySelector to return our canvas
    document.querySelector = jest.fn().mockReturnValue(mockCanvas);
  });

  afterEach(() => {
    document.body.removeChild(mockCanvas);
    jest.clearAllMocks();
  });

  describe('raycastCubeFaces', () => {
    it('should return null when no intersections found', () => {
      const mousePos: MousePosition = { x: 400, y: 300 };
      
      // Mock raycaster with no intersections
      const mockRaycaster = {
        setFromCamera: jest.fn(),
        intersectObjects: jest.fn().mockReturnValue([]),
      };
      (THREE.Raycaster as jest.Mock).mockImplementation(() => mockRaycaster);

      const result = RaycastingUtils.raycastCubeFaces({
        camera: mockCamera,
        scene: mockScene,
        mouse: mousePos,
        recursive: true,
      });

      expect(result.success).toBe(true);
      expect(result.data).toBe(null);
    });

    it('should return face intersection when mesh is hit', () => {
      const mousePos: MousePosition = { x: 400, y: 300 };
      
      // Mock intersection result
      const mockIntersection = {
        object: mockMesh,
        point: new THREE.Vector3(0, 0, 0.5),
        distance: 1,
      };

      const mockRaycaster = {
        setFromCamera: jest.fn(),
        intersectObjects: jest.fn().mockReturnValue([mockIntersection]),
      };
      (THREE.Raycaster as jest.Mock).mockImplementation(() => mockRaycaster);

      const result = RaycastingUtils.raycastCubeFaces({
        camera: mockCamera,
        scene: mockScene,
        mouse: mousePos,
        recursive: true,
      });

      expect(result.success).toBe(true);
      expect(result.data).not.toBe(null);
      expect(result.data?.facePosition).toBe(FacePosition.FRONT);
      expect(result.data?.point).toEqual([0, 0, 0.5]);
    });

    it('should handle camera not provided error', () => {
      const mousePos: MousePosition = { x: 400, y: 300 };

      const result = RaycastingUtils.raycastCubeFaces({
        camera: null,
        scene: mockScene,
        mouse: mousePos,
        recursive: true,
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('RAYCASTING_FAILED');
    });

    it('should handle canvas not found error', () => {
      document.querySelector = jest.fn().mockReturnValue(null);
      
      const mousePos: MousePosition = { x: 400, y: 300 };

      const result = RaycastingUtils.raycastCubeFaces({
        camera: mockCamera,
        scene: mockScene,
        mouse: mousePos,
        recursive: true,
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('RAYCASTING_FAILED');
      expect(result.message).toContain('Canvas element not found');
    });
  });

  describe('calculateRotationDirection', () => {
    it('should calculate clockwise rotation for front face', () => {
      const startPos: MousePosition = { x: 400, y: 300 };
      const endPos: MousePosition = { x: 450, y: 300 }; // Move right

      const result = RaycastingUtils.calculateRotationDirection(
        startPos,
        endPos,
        FacePosition.FRONT,
        mockCamera
      );

      expect(result.success).toBe(true);
      expect(result.data).toBe('clockwise');
    });

    it('should calculate counterclockwise rotation for front face', () => {
      const startPos: MousePosition = { x: 400, y: 300 };
      const endPos: MousePosition = { x: 350, y: 300 }; // Move left

      const result = RaycastingUtils.calculateRotationDirection(
        startPos,
        endPos,
        FacePosition.FRONT,
        mockCamera
      );

      expect(result.success).toBe(true);
      expect(result.data).toBe('counterclockwise');
    });

    it('should handle back face rotation correctly', () => {
      const startPos: MousePosition = { x: 400, y: 300 };
      const endPos: MousePosition = { x: 450, y: 300 }; // Move right

      const result = RaycastingUtils.calculateRotationDirection(
        startPos,
        endPos,
        FacePosition.BACK,
        mockCamera
      );

      expect(result.success).toBe(true);
      expect(result.data).toBe('counterclockwise'); // Opposite of front
    });

    it('should handle up face rotation correctly', () => {
      const startPos: MousePosition = { x: 400, y: 300 };
      const endPos: MousePosition = { x: 450, y: 300 }; // Move right

      const result = RaycastingUtils.calculateRotationDirection(
        startPos,
        endPos,
        FacePosition.UP,
        mockCamera
      );

      expect(result.success).toBe(true);
      expect(result.data).toBe('clockwise');
    });
  });

  describe('isPointOnFace', () => {
    it('should return true for point on front face', () => {
      const point: readonly [number, number, number] = [0, 0, 0.5];
      const result = RaycastingUtils.isPointOnFace(point, FacePosition.FRONT);
      expect(result).toBe(true);
    });

    it('should return false for point not on front face', () => {
      const point: readonly [number, number, number] = [0, 0, -0.5];
      const result = RaycastingUtils.isPointOnFace(point, FacePosition.FRONT);
      expect(result).toBe(false);
    });

    it('should work with custom cube size', () => {
      const point: readonly [number, number, number] = [0, 0, 1];
      const result = RaycastingUtils.isPointOnFace(point, FacePosition.FRONT, 2);
      expect(result).toBe(true);
    });

    it('should handle all face positions correctly', () => {
      const faces = [
        { face: FacePosition.FRONT, point: [0, 0, 0.5] as const },
        { face: FacePosition.BACK, point: [0, 0, -0.5] as const },
        { face: FacePosition.LEFT, point: [-0.5, 0, 0] as const },
        { face: FacePosition.RIGHT, point: [0.5, 0, 0] as const },
        { face: FacePosition.UP, point: [0, 0.5, 0] as const },
        { face: FacePosition.DOWN, point: [0, -0.5, 0] as const },
      ];

      faces.forEach(({ face, point }) => {
        const result = RaycastingUtils.isPointOnFace(point, face);
        expect(result).toBe(true);
      });
    });
  });

  describe('dispose', () => {
    it('should dispose resources without error', () => {
      expect(() => {
        RaycastingUtils.dispose();
      }).not.toThrow();
    });
  });
});