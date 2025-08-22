/**
 * Comprehensive unit tests for GestureLayerDetection class
 * Tests the core logic for detecting rotational layers from gesture vectors
 */

import * as THREE from 'three';
import { GestureLayerDetection, GestureLayerInfo } from '../../src/utils/gestureLayerDetection';

// Mock window.console to avoid noise in tests
const mockConsole = {
  log: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
};

// Store original console methods
const originalConsole = window.console;

describe('GestureLayerDetection', () => {
  beforeEach(() => {
    // Mock console to reduce test output noise
    window.console = mockConsole as any;
    jest.clearAllMocks();
  });

  afterEach(() => {
    // Restore original console
    window.console = originalConsole;
  });

  describe('detectLayerFromGesture', () => {
    describe('RED LAYER scenarios (horizontal layers)', () => {
      it('should detect red layer for gesture between pieces 0 and 1', () => {
        // Scenario: Gesture between pieces 0 and 1 (both in top layer)
        const startPiece: readonly [number, number, number] = [-1, 1, 0]; // piece 0
        const endPiece: readonly [number, number, number] = [0, 1, 0];   // piece 1
        
        const result = GestureLayerDetection.detectLayerFromGesture(startPiece, endPiece);
        
        expect(result).not.toBeNull();
        expect(result!.axis).toBe('y');
        expect(result!.layerIndex).toBe(1); // Top layer
        expect(result!.pieces).toHaveLength(9);
        
        // Verify all pieces in top layer (y=1)
        result!.pieces.forEach(piece => {
          expect(piece[1]).toBe(1);
        });
      });

      it('should detect red layer for gesture between pieces 1 and 2', () => {
        const startPiece: readonly [number, number, number] = [0, 1, 0];  // piece 1
        const endPiece: readonly [number, number, number] = [1, 1, 0];    // piece 2
        
        const result = GestureLayerDetection.detectLayerFromGesture(startPiece, endPiece);
        
        expect(result).not.toBeNull();
        expect(result!.axis).toBe('y');
        expect(result!.layerIndex).toBe(1);
        expect(result!.pieces).toHaveLength(9);
      });

      it('should detect red layer for gesture between pieces 2 and 3', () => {
        const startPiece: readonly [number, number, number] = [1, 1, 0];  // piece 2
        const endPiece: readonly [number, number, number] = [1, 1, 1];    // piece 3
        
        const result = GestureLayerDetection.detectLayerFromGesture(startPiece, endPiece);
        
        expect(result).not.toBeNull();
        expect(result!.axis).toBe('y');
        expect(result!.layerIndex).toBe(1);
      });
    });

    describe('BLUE LAYER scenarios (vertical layers)', () => {
      it('should detect blue layer for gesture between pieces 1 and 5', () => {
        // Scenario: Gesture between pieces 1 and 5 (vertical movement)
        const startPiece: readonly [number, number, number] = [0, 1, 0];  // piece 1
        const endPiece: readonly [number, number, number] = [0, 0, -1];   // piece 5
        
        const result = GestureLayerDetection.detectLayerFromGesture(startPiece, endPiece);
        
        expect(result).not.toBeNull();
        expect(result!.axis).toBe('x');
        expect(result!.layerIndex).toBe(0); // Middle layer in X axis
        expect(result!.pieces).toHaveLength(9);
        
        // Verify all pieces in middle X layer (x=0)
        result!.pieces.forEach(piece => {
          expect(piece[0]).toBe(0);
        });
      });
    });

    describe('SPECIFIC LAYER scenarios (limited pieces)', () => {
      it('should detect specific layer for gesture between pieces 2 and 4', () => {
        // Scenario: Gesture between pieces 2 and 4 (specific layer)
        const startPiece: readonly [number, number, number] = [1, 1, 0];  // piece 2
        const endPiece: readonly [number, number, number] = [0, 1, 1];    // piece 4
        
        const result = GestureLayerDetection.detectLayerFromGesture(startPiece, endPiece);
        
        expect(result).not.toBeNull();
        expect(result!.axis).toBe('y');
        expect(result!.layerIndex).toBe(1); // Top layer
        expect(result!.pieces).toHaveLength(9);
        
        // Should contain both pieces 2 and 4
        const containsPiece2 = result!.pieces.some(p => p[0] === 1 && p[1] === 1 && p[2] === 0);
        const containsPiece4 = result!.pieces.some(p => p[0] === 0 && p[1] === 1 && p[2] === 1);
        
        expect(containsPiece2).toBe(true);
        expect(containsPiece4).toBe(true);
      });
    });

    describe('Edge cases and boundary conditions', () => {
      it('should handle identical start and end pieces', () => {
        const startPiece: readonly [number, number, number] = [0, 0, 0];
        const endPiece: readonly [number, number, number] = [0, 0, 0];
        
        const result = GestureLayerDetection.detectLayerFromGesture(startPiece, endPiece);
        
        // Should still detect a layer (shared layer logic)
        expect(result).not.toBeNull();
      });

      it('should handle floating point coordinates by rounding', () => {
        const startPiece: readonly [number, number, number] = [-0.9, 1.1, -0.1];
        const endPiece: readonly [number, number, number] = [0.1, 0.9, 0.1];
        
        const result = GestureLayerDetection.detectLayerFromGesture(startPiece, endPiece);
        
        expect(result).not.toBeNull();
        // Should round to nearest integer coordinates
      });

      it('should handle extreme coordinate values', () => {
        const startPiece: readonly [number, number, number] = [-2, -2, -2];
        const endPiece: readonly [number, number, number] = [2, 2, 2];
        
        const result = GestureLayerDetection.detectLayerFromGesture(startPiece, endPiece);
        
        expect(result).not.toBeNull();
      });
    });

    describe('Axis prioritization logic', () => {
      it('should prioritize X-axis movement when X delta is largest', () => {
        const startPiece: readonly [number, number, number] = [-1, 0, 0];
        const endPiece: readonly [number, number, number] = [1, 0, 0]; // Large X movement
        
        const result = GestureLayerDetection.detectLayerFromGesture(startPiece, endPiece);
        
        expect(result).not.toBeNull();
        expect(result!.axis).toBe('y'); // X movement -> Y axis rotation
      });

      it('should prioritize Y-axis movement when Y delta is largest', () => {
        const startPiece: readonly [number, number, number] = [0, -1, 0];
        const endPiece: readonly [number, number, number] = [0, 1, 0]; // Large Y movement
        
        const result = GestureLayerDetection.detectLayerFromGesture(startPiece, endPiece);
        
        expect(result).not.toBeNull();
        expect(result!.axis).toBe('x'); // Y movement -> X axis rotation
      });

      it('should prioritize Z-axis movement when Z delta is largest', () => {
        const startPiece: readonly [number, number, number] = [0, 0, -1];
        const endPiece: readonly [number, number, number] = [0, 0, 1]; // Large Z movement
        
        const result = GestureLayerDetection.detectLayerFromGesture(startPiece, endPiece);
        
        expect(result).not.toBeNull();
        expect(result!.axis).toBe('x'); // Z movement -> X axis rotation
      });
    });
  });

  describe('findLayerMeshes', () => {
    let mockScene: THREE.Scene;
    let mockCubeMeshes: THREE.Mesh[];

    beforeEach(() => {
      mockScene = new THREE.Scene();
      mockCubeMeshes = [];

      // Create mock cube piece meshes with proper naming and positions
      for (let x = -1; x <= 1; x++) {
        for (let y = -1; y <= 1; y++) {
          for (let z = -1; z <= 1; z++) {
            const mesh = new THREE.Mesh();
            mesh.name = `cube-piece-${x}-${y}-${z}`;
            mesh.position.set(x, y, z);
            mockCubeMeshes.push(mesh);
            mockScene.add(mesh);
          }
        }
      }

      // Add some non-cube meshes to test filtering
      const nonCubeMesh = new THREE.Mesh();
      nonCubeMesh.name = 'highlight-mesh';
      mockScene.add(nonCubeMesh);
    });

    it('should find all meshes in a Y-axis layer', () => {
      const layerInfo: GestureLayerInfo = {
        axis: 'y',
        layerIndex: 1,
        pieces: [
          [-1, 1, -1], [-1, 1, 0], [-1, 1, 1],
          [0, 1, -1],  [0, 1, 0],  [0, 1, 1],
          [1, 1, -1],  [1, 1, 0],  [1, 1, 1]
        ]
      };

      const result = GestureLayerDetection.findLayerMeshes(mockScene, layerInfo);

      expect(result).toHaveLength(9);
      result.forEach(mesh => {
        expect(mesh.name).toContain('cube-piece');
        expect(Math.round(mesh.position.y)).toBe(1);
      });
    });

    it('should find all meshes in an X-axis layer', () => {
      const layerInfo: GestureLayerInfo = {
        axis: 'x',
        layerIndex: 0,
        pieces: [
          [0, -1, -1], [0, -1, 0], [0, -1, 1],
          [0, 0, -1],  [0, 0, 0],  [0, 0, 1],
          [0, 1, -1],  [0, 1, 0],  [0, 1, 1]
        ]
      };

      const result = GestureLayerDetection.findLayerMeshes(mockScene, layerInfo);

      expect(result).toHaveLength(9);
      result.forEach(mesh => {
        expect(mesh.name).toContain('cube-piece');
        expect(Math.round(mesh.position.x)).toBe(0);
      });
    });

    it('should exclude non-cube meshes from results', () => {
      const layerInfo: GestureLayerInfo = {
        axis: 'z',
        layerIndex: -1,
        pieces: [
          [-1, -1, -1], [-1, 0, -1], [-1, 1, -1],
          [0, -1, -1],  [0, 0, -1],  [0, 1, -1],
          [1, -1, -1],  [1, 0, -1],  [1, 1, -1]
        ]
      };

      const result = GestureLayerDetection.findLayerMeshes(mockScene, layerInfo);

      expect(result).toHaveLength(9);
      result.forEach(mesh => {
        expect(mesh.name).toContain('cube-piece');
        expect(mesh.name).not.toContain('highlight');
      });
    });

    it('should return empty array for invalid layer info', () => {
      const layerInfo: GestureLayerInfo = {
        axis: 'y',
        layerIndex: 5, // Invalid layer index
        pieces: [[5, 5, 5]] // Non-existent position
      };

      const result = GestureLayerDetection.findLayerMeshes(mockScene, layerInfo);

      expect(result).toHaveLength(0);
    });
  });

  describe('createLayerHighlights', () => {
    let mockScene: THREE.Scene;
    let mockCubeGroup: THREE.Group;
    let mockCubeMesh: THREE.Mesh;

    beforeEach(() => {
      mockScene = new THREE.Scene();
      mockCubeGroup = new THREE.Group();
      mockScene.add(mockCubeGroup);

      // Create a single cube mesh for testing
      mockCubeMesh = new THREE.Mesh();
      mockCubeMesh.name = 'cube-piece-0-1-0';
      mockCubeMesh.position.set(0, 1, 0);
      mockScene.add(mockCubeMesh);
    });

    it('should create highlight meshes for valid layer info', () => {
      const layerInfo: GestureLayerInfo = {
        axis: 'y',
        layerIndex: 1,
        pieces: [[0, 1, 0]]
      };

      const result = GestureLayerDetection.createLayerHighlights(mockScene, mockCubeGroup, layerInfo);

      expect(result).toHaveLength(1);
      
      const highlightMesh = result[0];
      expect(highlightMesh?.name).toContain('gesture-layer-highlight');
      expect(highlightMesh?.material).toBeInstanceOf(THREE.MeshBasicMaterial);
      expect(highlightMesh?.geometry).toBeInstanceOf(THREE.PlaneGeometry);
      expect(highlightMesh?.renderOrder).toBe(1002);
      
      // Should be added to cube group
      expect(mockCubeGroup.children).toContain(highlightMesh);
    });

    it('should return empty array when no meshes found', () => {
      const layerInfo: GestureLayerInfo = {
        axis: 'y',
        layerIndex: 1,
        pieces: [[5, 5, 5]] // Non-existent position
      };

      const result = GestureLayerDetection.createLayerHighlights(mockScene, mockCubeGroup, layerInfo);

      expect(result).toHaveLength(0);
      expect(mockCubeGroup.children).toHaveLength(0);
    });

    it('should position highlights with correct offset', () => {
      const layerInfo: GestureLayerInfo = {
        axis: 'y',
        layerIndex: 1,
        pieces: [[0, 1, 0]]
      };

      const result = GestureLayerDetection.createLayerHighlights(mockScene, mockCubeGroup, layerInfo);

      expect(result).toHaveLength(1);
      
      const highlightMesh = result[0];
      expect(highlightMesh?.position.x).toBe(0);
      expect(highlightMesh?.position.y).toBe(1);
      expect(highlightMesh?.position.z).toBe(0.02); // Offset applied
    });
  });

  describe('cleanupHighlights', () => {
    let mockHighlightMeshes: THREE.Mesh[];
    let mockParent: THREE.Group;

    beforeEach(() => {
      mockParent = new THREE.Group();
      mockHighlightMeshes = [];

      // Create mock highlight meshes
      for (let i = 0; i < 3; i++) {
        const mesh = new THREE.Mesh(
          new THREE.PlaneGeometry(1, 1),
          new THREE.MeshBasicMaterial({ color: 0xff0000 })
        );
        mesh.name = `highlight-${i}`;
        mockParent.add(mesh);
        mockHighlightMeshes.push(mesh);
      }
    });

    it('should properly dispose geometry and material', () => {
      const disposeSpy = jest.spyOn(mockHighlightMeshes[0]?.geometry!, 'dispose');
      const materialDisposeSpy = jest.spyOn(mockHighlightMeshes[0]?.material as THREE.Material, 'dispose');

      GestureLayerDetection.cleanupHighlights(mockHighlightMeshes);

      expect(disposeSpy).toHaveBeenCalled();
      expect(materialDisposeSpy).toHaveBeenCalled();
    });

    it('should remove meshes from parent', () => {
      expect(mockParent.children).toHaveLength(3);

      GestureLayerDetection.cleanupHighlights(mockHighlightMeshes);

      expect(mockParent.children).toHaveLength(0);
    });

    it('should handle meshes without parent gracefully', () => {
      const orphanMesh = new THREE.Mesh();
      
      expect(() => {
        GestureLayerDetection.cleanupHighlights([orphanMesh]);
      }).not.toThrow();
    });
  });

  describe('getLayerPieces static method', () => {
    it('should return correct pieces for X-axis layers', () => {
      const pieces = (GestureLayerDetection as any).getLayerPieces('x', 1);
      
      expect(pieces).toHaveLength(9);
      pieces.forEach((piece: readonly [number, number, number]) => {
        expect(piece[0]).toBe(1); // All pieces should have x=1
      });
    });

    it('should return correct pieces for Y-axis layers', () => {
      const pieces = (GestureLayerDetection as any).getLayerPieces('y', -1);
      
      expect(pieces).toHaveLength(9);
      pieces.forEach((piece: readonly [number, number, number]) => {
        expect(piece[1]).toBe(-1); // All pieces should have y=-1
      });
    });

    it('should return correct pieces for Z-axis layers', () => {
      const pieces = (GestureLayerDetection as any).getLayerPieces('z', 0);
      
      expect(pieces).toHaveLength(9);
      pieces.forEach((piece: readonly [number, number, number]) => {
        expect(piece[2]).toBe(0); // All pieces should have z=0
      });
    });
  });

  describe('Performance and memory tests', () => {
    it('should handle large number of gesture detections efficiently', () => {
      const startTime = performance.now();
      
      // Run 1000 gesture detections
      for (let i = 0; i < 1000; i++) {
        const start: readonly [number, number, number] = [
          Math.floor(Math.random() * 3) - 1,
          Math.floor(Math.random() * 3) - 1,
          Math.floor(Math.random() * 3) - 1
        ];
        const end: readonly [number, number, number] = [
          Math.floor(Math.random() * 3) - 1,
          Math.floor(Math.random() * 3) - 1,
          Math.floor(Math.random() * 3) - 1
        ];
        
        GestureLayerDetection.detectLayerFromGesture(start, end);
      }
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      // Should complete 1000 detections in under 100ms
      expect(duration).toBeLessThan(100);
    });

    it('should not leak memory during highlight creation and cleanup', () => {
      const mockScene = new THREE.Scene();
      const mockCubeGroup = new THREE.Group();
      
      // Add some cube meshes
      for (let i = 0; i < 9; i++) {
        const mesh = new THREE.Mesh();
        mesh.name = `cube-piece-${i}`;
        mesh.position.set(0, 1, 0);
        mockScene.add(mesh);
      }
      
      const layerInfo: GestureLayerInfo = {
        axis: 'y',
        layerIndex: 1,
        pieces: [[0, 1, 0]]
      };
      
      // Create and cleanup highlights multiple times
      for (let i = 0; i < 10; i++) {
        const highlights = GestureLayerDetection.createLayerHighlights(mockScene, mockCubeGroup, layerInfo);
        GestureLayerDetection.cleanupHighlights(highlights);
      }
      
      // Cube group should be empty after cleanup
      expect(mockCubeGroup.children).toHaveLength(0);
    });
  });
});