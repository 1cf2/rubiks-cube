import { CubeColor } from '@rubiks-cube/shared/types/cube';
import { CubeState, FaceState, Move, CubeFace, RotationDirection, CubeOperationResult, CubeError } from '../types/CubeTypes';
import { CubeStateFactory } from './CubeState';
import { StateValidator } from '../validation/StateValidator';

export interface SerializationOptions {
  readonly includeHistory: boolean;
  readonly compression: 'none' | 'minimal' | 'aggressive';
  readonly format: 'json' | 'compact' | 'base64';
  readonly validation: boolean;
}

export interface ShareableConfiguration {
  readonly version: string;
  readonly timestamp: number;
  readonly checksum: string;
  readonly metadata: {
    readonly source: string;
    readonly difficulty?: 'easy' | 'medium' | 'hard' | 'expert';
    readonly tags?: readonly string[];
    readonly description?: string;
  };
  readonly state: SerializedCubeState;
}

export interface SerializedCubeState {
  readonly faces: readonly SerializedFaceState[];
  readonly moveHistory?: readonly SerializedMove[];
  readonly isScrambled: boolean;
  readonly isSolved: boolean;
  readonly timestamp: number;
}

export interface SerializedFaceState {
  readonly face: CubeFace;
  readonly colors: readonly CubeColor[];
  readonly rotation: number;
}

export interface SerializedMove {
  readonly face: CubeFace;
  readonly direction: RotationDirection;
  readonly timestamp: number;
  readonly duration: number;
}

export interface DeserializationResult {
  readonly success: boolean;
  readonly state?: CubeState;
  readonly errors: string[];
  readonly warnings: string[];
}

export class StateSerializer {
  private static readonly CURRENT_VERSION = '1.0.0';

  // Main serialization method
  static serialize(state: CubeState, options: Partial<SerializationOptions> = {}): CubeOperationResult<string> {
    const opts: SerializationOptions = {
      includeHistory: true,
      compression: 'minimal',
      format: 'json',
      validation: true,
      ...options,
    };

    try {
      const startTime = performance.now();

      // Validate state if requested
      if (opts.validation) {
        const validation = StateValidator.validateState(state);
        if (!validation.isValid) {
          return {
            success: false,
            error: CubeError.STATE_CORRUPTION,
          };
        }
      }

      // Create serialized state
      const serializedState = StateSerializer.serializeState(state, opts);
      
      // Apply format transformation
      let result: string;
      switch (opts.format) {
        case 'json':
          result = JSON.stringify(serializedState, null, opts.compression === 'none' ? 2 : 0);
          break;
        case 'compact':
          result = StateSerializer.createCompactFormat(serializedState);
          break;
        case 'base64': {
          const jsonString = JSON.stringify(serializedState);
          result = btoa(jsonString);
          break;
        }
        default:
          throw new Error(`Unsupported format: ${opts.format}`);
      }

      const executionTime = performance.now() - startTime;
      if (executionTime > 5) { // 5ms threshold for serialization
        console.warn(`Serialization took ${executionTime.toFixed(2)}ms, consider using compression`);
      }

      return { success: true, data: result };
    } catch (error) {
      return {
        success: false,
        error: CubeError.STATE_CORRUPTION,
      };
    }
  }

  // Main deserialization method
  static deserialize(serializedData: string, options: Partial<SerializationOptions> = {}): DeserializationResult {
    const opts: SerializationOptions = {
      includeHistory: true,
      compression: 'minimal',
      format: 'json',
      validation: true,
      ...options,
    };

    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      const startTime = performance.now();

      // Parse data based on format
      let parsedData: SerializedCubeState;
      try {
        switch (opts.format) {
          case 'json':
            parsedData = JSON.parse(serializedData);
            break;
          case 'compact':
            parsedData = StateSerializer.parseCompactFormat(serializedData);
            break;
          case 'base64': {
            const decodedJson = atob(serializedData);
            parsedData = JSON.parse(decodedJson);
            break;
          }
          default:
            errors.push(`Unsupported format: ${opts.format}`);
            return { success: false, errors, warnings };
        }
      } catch (parseError) {
        errors.push(`Failed to parse serialized data: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`);
        return { success: false, errors, warnings };
      }

      // Validate structure
      const structureValidation = StateSerializer.validateSerializedStructure(parsedData);
      if (!structureValidation.isValid) {
        errors.push(...structureValidation.errors);
        if (errors.length > 0) {
          return { success: false, errors, warnings };
        }
      }
      warnings.push(...structureValidation.warnings);

      // Convert to CubeState
      const stateResult = StateSerializer.deserializeState(parsedData);
      if (!stateResult.success) {
        errors.push('Failed to deserialize state');
        return { success: false, errors, warnings };
      }

      const state = stateResult.data;

      // Validate final state if requested
      if (opts.validation) {
        const validation = StateValidator.validateState(state);
        if (!validation.isValid) {
          errors.push('Deserialized state failed validation');
          warnings.push(...validation.warnings.map(w => w.message));
          return { success: false, errors, warnings };
        }
        warnings.push(...validation.warnings.map(w => w.message));
      }

      const executionTime = performance.now() - startTime;
      if (executionTime > 5) { // 5ms threshold
        warnings.push(`Deserialization took ${executionTime.toFixed(2)}ms`);
      }

      return {
        success: true,
        state,
        errors: [],
        warnings,
      };
    } catch (error) {
      errors.push(`Deserialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return { success: false, errors, warnings };
    }
  }

  // Create shareable cube configuration
  static createShareableConfiguration(
    state: CubeState,
    metadata: Partial<ShareableConfiguration['metadata']> = {}
  ): CubeOperationResult<ShareableConfiguration> {
    try {
      const serializedState = StateSerializer.serializeState(state, { 
        includeHistory: true, 
        compression: 'minimal', 
        format: 'json', 
        validation: true 
      });

      const checksum = StateSerializer.calculateChecksum(serializedState);

      const config: ShareableConfiguration = {
        version: StateSerializer.CURRENT_VERSION,
        timestamp: Date.now(),
        checksum,
        metadata: {
          source: 'cube-engine',
          ...metadata,
        },
        state: serializedState,
      };

      return { success: true, data: config };
    } catch (error) {
      return {
        success: false,
        error: CubeError.STATE_CORRUPTION,
      };
    }
  }

  // Import from shareable configuration
  static importFromShareableConfiguration(config: ShareableConfiguration): DeserializationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      // Validate version compatibility
      if (config.version !== StateSerializer.CURRENT_VERSION) {
        warnings.push(`Version mismatch: expected ${StateSerializer.CURRENT_VERSION}, got ${config.version}`);
      }

      // Validate checksum
      const calculatedChecksum = StateSerializer.calculateChecksum(config.state);
      if (calculatedChecksum !== config.checksum) {
        errors.push('Checksum validation failed - data may be corrupted');
        return { success: false, errors, warnings };
      }

      // Deserialize state
      const stateResult = StateSerializer.deserializeState(config.state);

      if (!stateResult.success) {
        errors.push('Failed to deserialize state from configuration');
        return { success: false, errors, warnings };
      }

      return {
        success: true,
        state: stateResult.data,
        errors,
        warnings,
      };
    } catch (error) {
      errors.push(`Import failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return { success: false, errors, warnings };
    }
  }

  // Export to file format
  static exportToFile(state: CubeState, format: 'json' | 'csv' | 'txt' = 'json'): CubeOperationResult<Blob> {
    try {
      let content: string;
      let mimeType: string;

      switch (format) {
        case 'json': {
          const serializeResult = StateSerializer.serialize(state, { format: 'json' });
          if (!serializeResult.success) {
            return { success: false, error: serializeResult.error };
          }
          content = serializeResult.data;
          mimeType = 'application/json';
          break;
        }

        case 'csv':
          content = StateSerializer.createCSVFormat(state);
          mimeType = 'text/csv';
          break;

        case 'txt':
          content = StateSerializer.createTextFormat(state);
          mimeType = 'text/plain';
          break;

        default:
          return { success: false, error: CubeError.INVALID_MOVE };
      }

      const blob = new Blob([content], { type: mimeType });
      return { success: true, data: blob };
    } catch (error) {
      return {
        success: false,
        error: CubeError.STATE_CORRUPTION,
      };
    }
  }

  private static serializeState(state: CubeState, options: SerializationOptions): SerializedCubeState {
    const faces: SerializedFaceState[] = state.faces.map(face => ({
      face: face.face,
      colors: face.colors,
      rotation: face.rotation,
    }));

    const moveHistory = options.includeHistory 
      ? state.moveHistory.map(move => ({
          face: move.face,
          direction: move.direction,
          timestamp: move.timestamp,
          duration: move.duration,
        })) as readonly SerializedMove[]
      : undefined;

    return {
      faces,
      ...(moveHistory && { moveHistory }),
      isScrambled: state.isScrambled,
      isSolved: state.isSolved,
      timestamp: state.timestamp,
    };
  }

  private static deserializeState(data: SerializedCubeState): CubeOperationResult<CubeState> {
    try {
      // Deserialize faces
      const faces: FaceState[] = data.faces.map(serializedFace => ({
        face: serializedFace.face,
        colors: serializedFace.colors,
        rotation: serializedFace.rotation,
      }));

      // Deserialize move history
      const moveHistory: Move[] = data.moveHistory?.map(serializedMove => ({
        face: serializedMove.face,
        direction: serializedMove.direction,
        timestamp: serializedMove.timestamp,
        duration: serializedMove.duration,
      })) || [];

      // Create state
      const stateResult = CubeStateFactory.createState(faces, moveHistory, data.timestamp);
      if (!stateResult.success) {
        return stateResult;
      }

      const state = stateResult.data;

      // Override flags from serialized data
      const finalState: CubeState = {
        ...state,
        isScrambled: data.isScrambled,
        isSolved: data.isSolved,
      };

      return { success: true, data: finalState };
    } catch (error) {
      return {
        success: false,
        error: CubeError.STATE_CORRUPTION,
      };
    }
  }

  private static validateSerializedStructure(data: any): { isValid: boolean; errors: string[]; warnings: string[] } {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!data || typeof data !== 'object') {
      errors.push('Data must be an object');
      return { isValid: false, errors, warnings };
    }

    // Check required fields
    if (!Array.isArray(data.faces)) {
      errors.push('faces must be an array');
    } else if (data.faces.length !== 6) {
      errors.push(`Expected 6 faces, got ${data.faces.length}`);
    }

    if (typeof data.isScrambled !== 'boolean') {
      errors.push('isScrambled must be a boolean');
    }

    if (typeof data.isSolved !== 'boolean') {
      errors.push('isSolved must be a boolean');
    }

    if (typeof data.timestamp !== 'number') {
      errors.push('timestamp must be a number');
    }

    // Check move history if present
    if (data.moveHistory !== undefined) {
      if (!Array.isArray(data.moveHistory)) {
        errors.push('moveHistory must be an array');
      }
    }

    // Validate faces
    if (Array.isArray(data.faces)) {
      data.faces.forEach((face: any, index: number) => {
        if (!face || typeof face !== 'object') {
          errors.push(`Face ${index} must be an object`);
          return;
        }

        if (typeof face.face !== 'string') {
          errors.push(`Face ${index} must have a string 'face' property`);
        }

        if (!Array.isArray(face.colors) || face.colors.length !== 9) {
          errors.push(`Face ${index} must have 9 colors`);
        }

        if (typeof face.rotation !== 'number') {
          errors.push(`Face ${index} must have a numeric rotation`);
        }
      });
    }

    return { isValid: errors.length === 0, errors, warnings };
  }

  private static createCompactFormat(state: SerializedCubeState): string {
    // Create a compact string representation
    const faceColors = state.faces.map(face => face.colors.join('')).join('|');
    const rotations = state.faces.map(face => face.rotation.toFixed(3)).join(',');
    const flags = `${state.isScrambled ? '1' : '0'}${state.isSolved ? '1' : '0'}`;
    
    return `${faceColors}:${rotations}:${flags}:${state.timestamp}`;
  }

  private static parseCompactFormat(compactData: string): SerializedCubeState {
    const parts = compactData.split(':');
    if (parts.length < 4) {
      throw new Error('Invalid compact format');
    }

    const [faceColorsStr, rotationsStr, flagsStr, timestampStr] = parts;
    
    if (!faceColorsStr || !rotationsStr || !flagsStr || !timestampStr) {
      throw new Error('Invalid compact format: missing required parts');
    }
    
    // Parse face colors
    const faceColorArrays = faceColorsStr.split('|');
    if (faceColorArrays.length !== 6) {
      throw new Error('Invalid face count in compact format');
    }

    const rotations = rotationsStr.split(',').map(r => parseFloat(r));
    const faceNames: CubeFace[] = ['front', 'back', 'left', 'right', 'up', 'down'];

    const faces: SerializedFaceState[] = faceColorArrays.map((colorStr, index) => {
      if (colorStr.length !== 9) {
        throw new Error(`Invalid color count for face ${index}`);
      }
      
      const faceName = faceNames[index];
      if (!faceName) {
        throw new Error(`Invalid face index: ${index}`);
      }
      
      return {
        face: faceName,
        colors: colorStr.split('') as CubeColor[],
        rotation: rotations[index] || 0,
      };
    });

    const isScrambled = flagsStr[0] === '1';
    const isSolved = flagsStr[1] === '1';
    const timestamp = parseInt(timestampStr, 10);

    return {
      faces,
      isScrambled,
      isSolved,
      timestamp,
    };
  }

  private static createCSVFormat(state: CubeState): string {
    const headers = ['Face', 'Position', 'Color', 'Rotation'];
    const rows = [headers.join(',')];

    state.faces.forEach(face => {
      face.colors.forEach((color, index) => {
        const row = Math.floor(index / 3);
        const col = index % 3;
        const position = `${row}-${col}`;
        rows.push([face.face, position, color, face.rotation.toFixed(3)].join(','));
      });
    });

    return rows.join('\n');
  }

  private static createTextFormat(state: CubeState): string {
    const lines: string[] = [];
    lines.push('Rubik\'s Cube State');
    lines.push('==================');
    lines.push('');
    lines.push(`Solved: ${state.isSolved ? 'Yes' : 'No'}`);
    lines.push(`Scrambled: ${state.isScrambled ? 'Yes' : 'No'}`);
    lines.push(`Moves: ${state.moveHistory.length}`);
    lines.push(`Timestamp: ${new Date(state.timestamp).toISOString()}`);
    lines.push('');

    state.faces.forEach(face => {
      lines.push(`${face.face.toUpperCase()} Face (rotation: ${face.rotation.toFixed(3)}°):`);
      for (let row = 0; row < 3; row++) {
        const rowColors = face.colors.slice(row * 3, (row + 1) * 3);
        lines.push(`  ${rowColors.join(' ')}`);
      }
      lines.push('');
    });

    return lines.join('\n');
  }

  private static calculateChecksum(state: SerializedCubeState): string {
    const dataString = JSON.stringify(state);
    let hash = 0;
    for (let i = 0; i < dataString.length; i++) {
      const char = dataString.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString(16);
  }
}