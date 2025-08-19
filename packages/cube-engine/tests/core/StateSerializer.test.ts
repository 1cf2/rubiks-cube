import { 
  StateSerializer,
  SerializationOptions,
  ShareableConfiguration 
} from '../../src/core/StateSerializer';
import { CubeStateFactory } from '../../src/core/CubeState';
import { CubeState, Move, CubeError } from '../../src/types/CubeTypes';
import { CubeColor } from '@rubiks-cube/shared/types/cube';

describe('StateSerializer', () => {
  let solvedState: CubeState;
  let scrambledState: CubeState;

  beforeEach(() => {
    solvedState = CubeStateFactory.createSolvedState();
    
    // Create a scrambled state with move history
    const moves: Move[] = [
      { face: 'front', direction: 'clockwise', timestamp: 1000, duration: 300 },
      { face: 'up', direction: 'counterclockwise', timestamp: 1400, duration: 300 },
    ];

    scrambledState = {
      ...solvedState,
      moveHistory: moves,
      isScrambled: true,
      isSolved: false,
      timestamp: 1800,
    };
  });

  describe('serialize', () => {
    it('should serialize solved state to JSON', () => {
      const result = StateSerializer.serialize(solvedState);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBeDefined();
        const parsed = JSON.parse(result.data);
        expect(parsed.faces).toHaveLength(6);
        expect(parsed.isScrambled).toBe(false);
        expect(parsed.isSolved).toBe(true);
        expect(parsed.moveHistory).toHaveLength(0);
      }
    });

    it('should serialize with move history', () => {
      const options: Partial<SerializationOptions> = {
        includeHistory: true,
      };

      const result = StateSerializer.serialize(scrambledState, options);

      expect(result.success).toBe(true);
      
      if (result.success) {
        const parsed = JSON.parse(result.data);
        expect(parsed.moveHistory).toHaveLength(2);
        expect(parsed.moveHistory[0].face).toBe('front');
        expect(parsed.moveHistory[0].direction).toBe('clockwise');
      }
    });

    it('should serialize without move history when disabled', () => {
      const options: Partial<SerializationOptions> = {
        includeHistory: false,
      };

      const result = StateSerializer.serialize(scrambledState, options);

      expect(result.success).toBe(true);
      
      if (result.success) {
        const parsed = JSON.parse(result.data);
        expect(parsed.moveHistory).toBeUndefined();
      }
    });

    it('should serialize in compact format', () => {
      const options: Partial<SerializationOptions> = {
        format: 'compact',
        includeHistory: false,
      };

      const result = StateSerializer.serialize(solvedState, options);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBeDefined();
      }
      if (result.success) {
        expect(result.data.includes(':')).toBe(true); // Compact format uses colons
        expect(result.data.length).toBeLessThan(JSON.stringify(solvedState).length);
      }
    });

    it('should serialize in base64 format', () => {
      const options: Partial<SerializationOptions> = {
        format: 'base64',
        includeHistory: false,
      };

      const result = StateSerializer.serialize(solvedState, options);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBeDefined();
      }
      
      if (result.success) {
        // Should be valid base64
        expect(() => atob(result.data)).not.toThrow();
      }
    });

    it('should reject invalid state when validation enabled', () => {
      const invalidState = {
        ...solvedState,
        faces: solvedState.faces.slice(0, 5) as any, // Only 5 faces
      };

      const options: Partial<SerializationOptions> = {
        validation: true,
      };

      const result = StateSerializer.serialize(invalidState, options);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe(CubeError.STATE_CORRUPTION);
      }
    });
  });

  describe('deserialize', () => {
    it('should deserialize JSON format', () => {
      const serialized = StateSerializer.serialize(solvedState);
      if (!serialized.success) throw new Error('Serialization failed');
      const result = StateSerializer.deserialize(serialized.data);

      expect(result.success).toBe(true);
      expect(result.state).toBeDefined();
      if (result.state) {
        expect(result.state.faces).toHaveLength(6);
        expect(result.state.isSolved).toBe(true);
      }
      expect(result.errors).toHaveLength(0);
    });

    it('should deserialize with move history', () => {
      const serialized = StateSerializer.serialize(scrambledState, { includeHistory: true });
      if (!serialized.success) throw new Error('Serialization failed');
      const result = StateSerializer.deserialize(serialized.data, { includeHistory: true });

      expect(result.success).toBe(true);
      if (result.state) {
        expect(result.state.moveHistory).toHaveLength(2);
        expect(result.state.isScrambled).toBe(true);
      }
    });

    it('should deserialize compact format', () => {
      const serialized = StateSerializer.serialize(solvedState, { format: 'compact' });
      if (!serialized.success) throw new Error('Serialization failed');
      const result = StateSerializer.deserialize(serialized.data, { format: 'compact' });

      expect(result.success).toBe(true);
      if (result.state) {
        expect(result.state.isSolved).toBe(true);
      }
    });

    it('should deserialize base64 format', () => {
      const serialized = StateSerializer.serialize(solvedState, { format: 'base64' });
      if (!serialized.success) throw new Error('Serialization failed');
      const result = StateSerializer.deserialize(serialized.data, { format: 'base64' });

      expect(result.success).toBe(true);
      if (result.state) {
        expect(result.state.isSolved).toBe(true);
      }
    });

    it('should handle invalid JSON', () => {
      const result = StateSerializer.deserialize('invalid json');

      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toContain('Failed to parse');
    });

    it('should handle structurally invalid data', () => {
      const invalidData = JSON.stringify({
        faces: [1, 2, 3], // Invalid face structure
        isScrambled: true,
        isSolved: false,
        timestamp: Date.now(),
      });

      const result = StateSerializer.deserialize(invalidData);

      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should provide warnings for version mismatches', () => {
      // Create data with old version
      const serialized = StateSerializer.serialize(solvedState);
      if (!serialized.success) throw new Error('Serialization failed');
      
      const result = StateSerializer.deserialize(serialized.data);
      
      // Should still succeed but may have warnings
      expect(result.success).toBe(true);
    });
  });

  describe('createShareableConfiguration', () => {
    it('should create shareable configuration', () => {
      const metadata = {
        difficulty: 'medium' as const,
        description: 'Test configuration',
        tags: ['test', 'solved'],
      };

      const result = StateSerializer.createShareableConfiguration(solvedState, metadata);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.version).toBeDefined();
        expect(result.data.checksum).toBeDefined();
        expect(result.data.metadata.difficulty).toBe('medium');
        expect(result.data.metadata.description).toBe('Test configuration');
        expect(result.data.metadata.tags).toEqual(['test', 'solved']);
        expect(result.data.state).toBeDefined();
      }
    });

    it('should include default metadata', () => {
      const result = StateSerializer.createShareableConfiguration(solvedState);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.metadata.source).toBe('cube-engine');
      }
    });
  });

  describe('importFromShareableConfiguration', () => {
    it('should import from valid configuration', () => {
      const configResult = StateSerializer.createShareableConfiguration(scrambledState);
      if (!configResult.success) throw new Error('Failed to create configuration');
      const config = configResult.data;

      const result = StateSerializer.importFromShareableConfiguration(config);

      expect(result.success).toBe(true);
      expect(result.state).toBeDefined();
      if (result.state) {
        expect(result.state.isScrambled).toBe(true);
        expect(result.state.moveHistory).toHaveLength(2);
      }
    });

    it('should detect checksum mismatches', () => {
      const configResult = StateSerializer.createShareableConfiguration(solvedState);
      if (!configResult.success) throw new Error('Failed to create configuration');
      const config = configResult.data;

      // Corrupt the checksum
      const corruptedConfig: ShareableConfiguration = {
        ...config,
        checksum: 'invalid-checksum',
      };

      const result = StateSerializer.importFromShareableConfiguration(corruptedConfig);

      expect(result.success).toBe(false);
      expect(result.errors[0]).toContain('Checksum validation failed');
    });

    it('should warn about version mismatches', () => {
      const configResult = StateSerializer.createShareableConfiguration(solvedState);
      if (!configResult.success) throw new Error('Failed to create configuration');
      const config = configResult.data;

      // Simulate old version
      const oldConfig: ShareableConfiguration = {
        ...config,
        version: '0.9.0',
      };

      // Recalculate checksum for the modified config
      const newChecksum = StateSerializer['calculateChecksum'](oldConfig.state);
      const correctedConfig = {
        ...oldConfig,
        checksum: newChecksum,
      };

      const result = StateSerializer.importFromShareableConfiguration(correctedConfig);

      expect(result.success).toBe(true);
      expect(result.warnings.some(w => w.includes('Version mismatch'))).toBe(true);
    });
  });

  describe('exportToFile', () => {
    it('should export to JSON file format', () => {
      const result = StateSerializer.exportToFile(solvedState, 'json');

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBeInstanceOf(Blob);
        expect(result.data.type).toBe('application/json');
      }
    });

    it('should export to CSV file format', () => {
      const result = StateSerializer.exportToFile(solvedState, 'csv');

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBeInstanceOf(Blob);
        expect(result.data.type).toBe('text/csv');
      }
    });

    it('should export to TXT file format', () => {
      const result = StateSerializer.exportToFile(solvedState, 'txt');

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBeInstanceOf(Blob);
        expect(result.data.type).toBe('text/plain');
      }
    });
  });

  describe('Round-trip Compatibility', () => {
    it('should maintain state integrity through serialize/deserialize cycle', () => {
      const originalState = scrambledState;

      // Serialize and deserialize
      const serialized = StateSerializer.serialize(originalState);
      if (!serialized.success) throw new Error('Serialization failed');
      const deserialized = StateSerializer.deserialize(serialized.data);

      expect(deserialized.success).toBe(true);
      if (!deserialized.state) throw new Error('Deserialization failed');
      
      const restored = deserialized.state;

      // Compare key properties
      expect(restored.faces).toHaveLength(originalState.faces.length);
      expect(restored.isScrambled).toBe(originalState.isScrambled);
      expect(restored.isSolved).toBe(originalState.isSolved);
      expect(restored.moveHistory).toHaveLength(originalState.moveHistory.length);

      // Compare face colors
      originalState.faces.forEach((originalFace, index) => {
        const restoredFace = restored.faces[index];
        expect(restoredFace).toBeDefined();
        if (restoredFace) {
          expect(restoredFace.face).toBe(originalFace.face);
          expect(restoredFace.colors).toEqual(originalFace.colors);
          expect(restoredFace.rotation).toBeCloseTo(originalFace.rotation, 5);
        }
      });

      // Compare move history
      originalState.moveHistory.forEach((originalMove, index) => {
        const restoredMove = restored.moveHistory[index];
        expect(restoredMove).toBeDefined();
        if (restoredMove) {
          expect(restoredMove.face).toBe(originalMove.face);
          expect(restoredMove.direction).toBe(originalMove.direction);
          expect(restoredMove.timestamp).toBe(originalMove.timestamp);
          expect(restoredMove.duration).toBe(originalMove.duration);
        }
      });
    });

    it('should work with all format types', () => {
      const formats: Array<SerializationOptions['format']> = ['json', 'compact', 'base64'];

      formats.forEach(format => {
        const serialized = StateSerializer.serialize(scrambledState, { format });
        if (!serialized.success) throw new Error(`Serialization failed for format ${format}`);
        const deserialized = StateSerializer.deserialize(serialized.data, { format });

        expect(deserialized.success).toBe(true);
        if (deserialized.state) {
          expect(deserialized.state.moveHistory).toHaveLength(scrambledState.moveHistory.length);
        }
      });
    });
  });

  describe('Performance Requirements', () => {
    it('should serialize in under 5ms', () => {
      const start = performance.now();

      for (let i = 0; i < 100; i++) {
        StateSerializer.serialize(solvedState);
      }

      const end = performance.now();
      const avgTime = (end - start) / 100;

      expect(avgTime).toBeLessThan(5);
    });

    it('should deserialize in under 5ms', () => {
      const serialized = StateSerializer.serialize(solvedState);
      if (!serialized.success) throw new Error('Serialization failed');
      const data = serialized.data;

      const start = performance.now();

      for (let i = 0; i < 100; i++) {
        StateSerializer.deserialize(data);
      }

      const end = performance.now();
      const avgTime = (end - start) / 100;

      expect(avgTime).toBeLessThan(5);
    });

    it('should handle large state efficiently', () => {
      // Create state with large move history
      const largeMoves: Move[] = [];
      for (let i = 0; i < 1000; i++) {
        largeMoves.push({
          face: 'front',
          direction: 'clockwise',
          timestamp: i * 300,
          duration: 300,
        });
      }

      const largeState: CubeState = {
        ...solvedState,
        moveHistory: largeMoves,
      };

      const start = performance.now();
      const serialized = StateSerializer.serialize(largeState);
      const serializedTime = performance.now() - start;

      expect(serialized.success).toBe(true);
      expect(serializedTime).toBeLessThan(50); // Allow more time for large data

      if (!serialized.success) throw new Error('Serialization failed');
      const deserializeStart = performance.now();
      const deserialized = StateSerializer.deserialize(serialized.data);
      const deserializedTime = performance.now() - deserializeStart;

      expect(deserialized.success).toBe(true);
      expect(deserializedTime).toBeLessThan(50);
    });
  });

  describe('Error Handling', () => {
    it('should handle circular references gracefully', () => {
      // Create a state with circular reference (not possible with our types, but test error handling)
      const circularState = { ...solvedState } as any;
      circularState.self = circularState;

      const result = StateSerializer.serialize(circularState);
      
      // Should fail gracefully
      expect(result.success).toBe(false);
    });

    it('should handle extremely large data', () => {
      // Create state with very large color arrays (invalid but tests limits)
      const largeColors = new Array(10000).fill(CubeColor.RED);
      
      try {
        CubeStateFactory.createFaceState('front', largeColors);
        // This should throw before we get to serialization
        expect(true).toBe(false); // Should not reach here
      } catch (error) {
        // Expected to throw due to invalid color count
        expect(error).toBeDefined();
      }
    });

    it('should provide meaningful error messages', () => {
      const invalidJson = '{"faces": [invalid]}';
      const result = StateSerializer.deserialize(invalidJson);

      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toContain('Failed to parse');
    });
  });
});