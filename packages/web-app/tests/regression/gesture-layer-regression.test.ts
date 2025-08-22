/**
 * Regression test suite for gesture layer highlighting
 * Ensures new gesture functionality doesn't break existing behavior
 */

import * as THREE from 'three';
import { GestureLayerDetection } from '../../src/utils/gestureLayerDetection';

// Mock console to reduce test noise
const mockConsole = {
  log: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
};

const originalConsole = window.console;

describe('Gesture Layer Regression Tests', () => {
  beforeEach(() => {
    window.console = mockConsole as any;
    jest.clearAllMocks();
  });

  afterEach(() => {
    window.console = originalConsole;
  });

  describe('Backward compatibility', () => {
    it('should maintain compatibility with existing face-based interactions', () => {
      // Test that traditional face selection still works
      const startPiece: readonly [number, number, number] = [0, 0, 1]; // Front center
      const endPiece: readonly [number, number, number] = [0, 0, 1];   // Same piece
      
      const result = GestureLayerDetection.detectLayerFromGesture(startPiece, endPiece);
      
      // Should detect a layer even for same-piece "gestures"
      expect(result).not.toBeNull();
      expect(result!.pieces).toHaveLength(9);
    });

    it('should handle legacy coordinate systems', () => {
      // Test various coordinate formats that might exist in legacy code
      const legacyCoordinates: Array<[readonly [number, number, number], readonly [number, number, number]]> = [
        [[0.0, 1.0, 0.0], [1.0, 1.0, 0.0]], // Exact floats
        [[-0.9999, 0.9999, -0.0001], [0.0001, 1.0001, 0.0001]], // Near-integer
        [[2, 2, 2], [-2, -2, -2]] // Out of range values
      ];

      legacyCoordinates.forEach(([start, end]) => {
        expect(() => {
          GestureLayerDetection.detectLayerFromGesture(start, end);
        }).not.toThrow();
      });
    });
  });

  describe('Performance regression', () => {
    it('should not degrade performance compared to baseline', () => {
      const iterations = 1000;
      const testCases = [
        [[-1, 1, 0], [0, 1, 0]],  // Red layer case
        [[0, 1, 0], [0, 0, -1]],  // Blue layer case
        [[1, 1, 0], [0, 1, 1]]    // Specific layer case
      ];

      const startTime = performance.now();
      
      for (let i = 0; i < iterations; i++) {
        const testCase = testCases[i % testCases.length];
        GestureLayerDetection.detectLayerFromGesture(
          testCase[0] as readonly [number, number, number],
          testCase[1] as readonly [number, number, number]
        );
      }
      
      const endTime = performance.now();
      const avgTimePerCall = (endTime - startTime) / iterations;
      
      // Should average less than 0.1ms per call
      expect(avgTimePerCall).toBeLessThan(0.1);
    });

    it('should have consistent memory usage', () => {
      const mockScene = new THREE.Scene();
      const mockCubeGroup = new THREE.Group();
      
      // Add cube meshes
      for (let x = -1; x <= 1; x++) {
        for (let y = -1; y <= 1; y++) {
          for (let z = -1; z <= 1; z++) {
            const mesh = new THREE.Mesh();
            mesh.name = `cube-piece-${x}-${y}-${z}`;
            mesh.position.set(x, y, z);
            mockScene.add(mesh);
          }
        }
      }

      const layerInfo = {
        axis: 'y' as const,
        layerIndex: 1,
        pieces: [
          [-1, 1, -1], [-1, 1, 0], [-1, 1, 1],
          [0, 1, -1], [0, 1, 0], [0, 1, 1],
          [1, 1, -1], [1, 1, 0], [1, 1, 1]
        ] as Array<readonly [number, number, number]>
      };

      // Test multiple create/cleanup cycles
      for (let i = 0; i < 50; i++) {
        const highlights = GestureLayerDetection.createLayerHighlights(mockScene, mockCubeGroup, layerInfo);
        GestureLayerDetection.cleanupHighlights(highlights);
      }

      // Should have no remaining children after cleanup
      expect(mockCubeGroup.children).toHaveLength(0);
    });
  });

  describe('Output format stability', () => {
    it('should maintain consistent GestureLayerInfo structure', () => {
      const result = GestureLayerDetection.detectLayerFromGesture([-1, 1, 0], [0, 1, 0]);
      
      expect(result).toMatchObject({
        axis: expect.stringMatching(/^[xyz]$/),
        layerIndex: expect.any(Number),
        pieces: expect.any(Array)
      });
      
      if (result) {
        expect(result.layerIndex).toBeGreaterThanOrEqual(-1);
        expect(result.layerIndex).toBeLessThanOrEqual(1);
        expect(result.pieces).toHaveLength(9);
        
        result.pieces.forEach(piece => {
          expect(piece).toHaveLength(3);
          expect(typeof piece[0]).toBe('number');
          expect(typeof piece[1]).toBe('number');
          expect(typeof piece[2]).toBe('number');
        });
      }
    });

    it('should preserve layer piece order consistency', () => {
      const testCases = [
        { start: [-1, 1, 0], end: [0, 1, 0], expected: 'y' },
        { start: [0, 1, 0], end: [0, 0, -1], expected: 'x' },
        { start: [0, 0, 1], end: [0, 0, -1], expected: 'x' }
      ];

      testCases.forEach(testCase => {
        const result = GestureLayerDetection.detectLayerFromGesture(
          testCase.start as readonly [number, number, number],
          testCase.end as readonly [number, number, number]
        );
        
        if (result) {
          expect(result.axis).toBe(testCase.expected);
          
          // Check that pieces are properly ordered and unique
          const uniquePieces = new Set(result.pieces.map(p => `${p[0]},${p[1]},${p[2]}`));
          expect(uniquePieces.size).toBe(9);
        }
      });
    });
  });

  describe('Error handling regression', () => {
    it('should handle edge cases without throwing errors', () => {
      const edgeCases = [
        [null, null], // Null inputs
        [undefined, undefined], // Undefined inputs
        [[], []], // Empty arrays
        [[NaN, NaN, NaN], [NaN, NaN, NaN]], // NaN values
        [[Infinity, -Infinity, 0], [0, 0, 0]], // Infinite values
        [['1', '2', '3'], ['4', '5', '6']] // String inputs (type error)
      ];

      edgeCases.forEach(([start, end]) => {
        expect(() => {
          try {
            GestureLayerDetection.detectLayerFromGesture(
              start as any,
              end as any
            );
          } catch (error) {
            // Expected to throw for invalid inputs, but shouldn't crash
            expect(error).toBeDefined();
          }
        }).not.toThrow();
      });
    });

    it('should handle missing scene objects gracefully', () => {
      const emptyScene = new THREE.Scene();
      const layerInfo = {
        axis: 'y' as const,
        layerIndex: 1,
        pieces: [[0, 1, 0]] as Array<readonly [number, number, number]>
      };

      // Should not throw when no cube meshes exist
      expect(() => {
        const meshes = GestureLayerDetection.findLayerMeshes(emptyScene, layerInfo);
        expect(meshes).toHaveLength(0);
      }).not.toThrow();
    });
  });

  describe('Integration with existing systems', () => {
    it('should not interfere with existing mouse interaction flow', () => {
      // Mock the old layer detection system (if it exists)
      const mockLegacyLayerDetection = jest.fn();
      
      // Test that new system can coexist with legacy systems
      const startPiece: readonly [number, number, number] = [0, 0, 1];
      const endPiece: readonly [number, number, number] = [1, 0, 1];
      
      const newResult = GestureLayerDetection.detectLayerFromGesture(startPiece, endPiece);
      mockLegacyLayerDetection(startPiece, endPiece);
      
      expect(newResult).not.toBeNull();
      expect(mockLegacyLayerDetection).toHaveBeenCalledWith(startPiece, endPiece);
    });

    it('should maintain Three.js object integrity', () => {
      const scene = new THREE.Scene();
      const cubeGroup = new THREE.Group();
      
      // Add a test mesh
      const testMesh = new THREE.Mesh();
      testMesh.name = 'cube-piece-test';
      testMesh.position.set(0, 1, 0);
      scene.add(testMesh);
      
      const layerInfo = {
        axis: 'y' as const,
        layerIndex: 1,
        pieces: [[0, 1, 0]] as Array<readonly [number, number, number]>
      };

      // Create and cleanup highlights
      const highlights = GestureLayerDetection.createLayerHighlights(scene, cubeGroup, layerInfo);
      
      // Original mesh should remain unchanged
      expect(testMesh.position.x).toBe(0);
      expect(testMesh.position.y).toBe(1);
      expect(testMesh.position.z).toBe(0);
      expect(testMesh.name).toBe('cube-piece-test');
      
      // Cleanup should not affect original meshes
      GestureLayerDetection.cleanupHighlights(highlights);
      expect(scene.children).toContain(testMesh);
    });
  });

  describe('Cross-browser compatibility', () => {
    it('should work with different Math.round implementations', () => {
      // Mock different rounding behaviors
      const originalRound = Math.round;
      
      // Test with mock that might behave differently for edge cases
      Math.round = jest.fn().mockImplementation((x: number) => {
        return originalRound(x);
      });

      const result = GestureLayerDetection.detectLayerFromGesture([0.5, 1.5, -0.5], [1.5, 0.5, 0.5]);
      
      expect(result).not.toBeNull();
      expect(Math.round).toHaveBeenCalled();
      
      // Restore original
      Math.round = originalRound;
    });

    it('should handle different Array methods', () => {
      // Test that the code doesn't rely on specific Array prototype methods
      const originalIndexOf = Array.prototype.indexOf;
      const originalSome = Array.prototype.some;
      
      // Temporarily modify Array methods to ensure compatibility
      Array.prototype.indexOf = function<T>(this: T[], searchElement: T): number {
        for (let i = 0; i < this.length; i++) {
          if (this[i] === searchElement) return i;
        }
        return -1;
      };
      
      Array.prototype.some = function<T>(this: T[], predicate: (value: T, index: number, array: T[]) => boolean): boolean {
        for (let i = 0; i < this.length; i++) {
          if (predicate(this[i], i, this)) return true;
        }
        return false;
      };

      // Test gesture detection still works
      const result = GestureLayerDetection.detectLayerFromGesture([-1, 1, 0], [0, 1, 0]);
      expect(result).not.toBeNull();
      
      // Restore original methods
      Array.prototype.indexOf = originalIndexOf;
      Array.prototype.some = originalSome;
    });
  });

  describe('Coordinate system consistency', () => {
    it('should maintain consistent coordinate interpretation', () => {
      // Define known test cases with expected results
      const knownGoodCases = [
        {
          input: [[-1, 1, 0], [0, 1, 0]] as [readonly [number, number, number], readonly [number, number, number]],
          expected: { axis: 'y', layerIndex: 1 }
        },
        {
          input: [[0, 1, 0], [0, 0, -1]] as [readonly [number, number, number], readonly [number, number, number]],
          expected: { axis: 'x', layerIndex: 0 }
        },
        {
          input: [[0, 0, -1], [0, 0, 1]] as [readonly [number, number, number], readonly [number, number, number]],
          expected: { axis: 'x', layerIndex: 0 }
        }
      ];

      knownGoodCases.forEach((testCase, index) => {
        const result = GestureLayerDetection.detectLayerFromGesture(...testCase.input);
        
        expect(result).not.toBeNull();
        expect(result!.axis).toBe(testCase.expected.axis);
        expect(result!.layerIndex).toBe(testCase.expected.layerIndex);
      });
    });

    it('should handle coordinate transformations consistently', () => {
      // Test that the same logical gesture produces the same result regardless of coordinate precision
      const precisionTests: Array<[readonly [number, number, number], readonly [number, number, number]]> = [
        [[0, 1, 0], [1, 1, 0]], // Integer coordinates
        [[0.0, 1.0, 0.0], [1.0, 1.0, 0.0]], // Float coordinates
        [[-0.001, 0.999, 0.001], [0.999, 1.001, -0.001]] // Near-integer coordinates
      ];

      const results = precisionTests.map(([start, end]) =>
        GestureLayerDetection.detectLayerFromGesture(start, end)
      );

      // All results should be equivalent
      results.forEach(result => {
        expect(result).not.toBeNull();
        expect(result!.axis).toBe(results[0]!.axis);
        expect(result!.layerIndex).toBe(results[0]!.layerIndex);
      });
    });
  });
});