import { CameraState, CameraOperationResult, CameraError } from '@rubiks-cube/shared';

/**
 * CameraStateManager - Manages camera state persistence and restoration
 */
export class CameraStateManager {
  private readonly STORAGE_KEY = 'rubiks-cube-camera-state';
  private readonly STORAGE_VERSION = '1.0';
  
  /**
   * Save camera state to local storage with versioning
   */
  public saveCameraState(state: CameraState): CameraOperationResult<void> {
    try {
      const serializedData = {
        version: this.STORAGE_VERSION,
        timestamp: Date.now(),
        state: {
          position: state.position,
          rotation: state.rotation,
          zoom: state.zoom,
          target: state.target,
          autoRotationEnabled: state.autoRotationEnabled
          // Note: isAnimating is intentionally excluded as it's runtime state
        }
      };

      const serialized = JSON.stringify(serializedData);
      localStorage.setItem(this.STORAGE_KEY, serialized);
      
      return { success: true, data: undefined };
    } catch (error) {
      console.warn('Failed to save camera state:', error);
      return { success: false, error: CameraError.INVALID_CAMERA_STATE };
    }
  }

  /**
   * Load camera state from local storage with validation
   */
  public loadCameraState(): CameraOperationResult<CameraState | null> {
    try {
      const serialized = localStorage.getItem(this.STORAGE_KEY);
      if (!serialized) {
        return { success: true, data: null };
      }

      const parsed = JSON.parse(serialized);
      
      // Validate structure
      if (!this.validateStoredData(parsed)) {
        console.warn('Invalid camera state data structure');
        return { success: false, error: CameraError.INVALID_CAMERA_STATE };
      }

      // Handle version migration if needed
      const migratedState = this.migrateStateFormat(parsed);
      if (!migratedState) {
        console.warn('Failed to migrate camera state format');
        return { success: false, error: CameraError.INVALID_CAMERA_STATE };
      }

      // Reconstruct full camera state
      const cameraState: CameraState = {
        position: migratedState.state.position,
        rotation: migratedState.state.rotation,
        zoom: migratedState.state.zoom,
        target: migratedState.state.target,
        isAnimating: false, // Always start as not animating
        autoRotationEnabled: migratedState.state.autoRotationEnabled || false
      };

      // Final validation
      if (!this.validateCameraState(cameraState)) {
        console.warn('Loaded camera state failed validation');
        return { success: false, error: CameraError.INVALID_CAMERA_STATE };
      }

      return { success: true, data: cameraState };
    } catch (error) {
      console.warn('Failed to load camera state:', error);
      return { success: false, error: CameraError.INVALID_CAMERA_STATE };
    }
  }

  /**
   * Clear saved camera state
   */
  public clearCameraState(): CameraOperationResult<void> {
    try {
      localStorage.removeItem(this.STORAGE_KEY);
      return { success: true, data: undefined };
    } catch (error) {
      console.warn('Failed to clear camera state:', error);
      return { success: false, error: CameraError.INVALID_CAMERA_STATE };
    }
  }

  /**
   * Check if camera state persistence is available
   */
  public isStorageAvailable(): boolean {
    try {
      const testKey = '__camera_storage_test__';
      localStorage.setItem(testKey, 'test');
      localStorage.removeItem(testKey);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get information about saved camera state
   */
  public getCameraStateInfo(): {
    exists: boolean;
    timestamp?: number;
    version?: string;
    size?: number;
  } {
    try {
      const serialized = localStorage.getItem(this.STORAGE_KEY);
      if (!serialized) {
        return { exists: false };
      }

      const parsed = JSON.parse(serialized);
      return {
        exists: true,
        timestamp: parsed.timestamp,
        version: parsed.version,
        size: new Blob([serialized]).size
      };
    } catch {
      return { exists: false };
    }
  }

  /**
   * Validate stored data structure
   */
  private validateStoredData(data: any): boolean {
    if (!data || typeof data !== 'object') {
      return false;
    }

    if (!data.version || !data.state || !data.timestamp) {
      return false;
    }

    const state = data.state;
    return !!(
      state.position &&
      state.rotation &&
      state.target &&
      typeof state.zoom === 'number'
    );
  }

  /**
   * Migrate state format between versions
   */
  private migrateStateFormat(data: any): any | null {
    try {
      // Handle version 1.0 (current version)
      if (data.version === this.STORAGE_VERSION) {
        return data;
      }

      // Future version migrations would go here
      // For now, we only support the current version
      console.warn(`Unsupported camera state version: ${data.version}`);
      return null;
    } catch (error) {
      console.warn('Error during state migration:', error);
      return null;
    }
  }

  /**
   * Validate camera state object
   */
  private validateCameraState(state: CameraState): boolean {
    try {
      // Check position
      if (!state.position || 
          typeof state.position.x !== 'number' ||
          typeof state.position.y !== 'number' ||
          typeof state.position.z !== 'number') {
        return false;
      }

      // Check rotation (quaternion)
      if (!state.rotation ||
          typeof state.rotation.w !== 'number' ||
          typeof state.rotation.x !== 'number' ||
          typeof state.rotation.y !== 'number' ||
          typeof state.rotation.z !== 'number') {
        return false;
      }

      // Check target
      if (!state.target ||
          typeof state.target.x !== 'number' ||
          typeof state.target.y !== 'number' ||
          typeof state.target.z !== 'number') {
        return false;
      }

      // Check zoom
      if (typeof state.zoom !== 'number' || state.zoom <= 0) {
        return false;
      }

      // Check boolean flags
      if (typeof state.isAnimating !== 'boolean' ||
          typeof state.autoRotationEnabled !== 'boolean') {
        return false;
      }

      return true;
    } catch {
      return false;
    }
  }

  /**
   * Export camera state for backup/sharing
   */
  public exportCameraState(): CameraOperationResult<string> {
    const loadResult = this.loadCameraState();
    if (!loadResult.success || !loadResult.data) {
      return { success: false, error: CameraError.INVALID_CAMERA_STATE };
    }

    try {
      const exportData = {
        type: 'rubiks-cube-camera-state',
        version: this.STORAGE_VERSION,
        exported: Date.now(),
        state: loadResult.data
      };

      return { success: true, data: JSON.stringify(exportData, null, 2) };
    } catch (error) {
      return { success: false, error: CameraError.INVALID_CAMERA_STATE };
    }
  }

  /**
   * Import camera state from backup/sharing
   */
  public importCameraState(importData: string): CameraOperationResult<void> {
    try {
      const parsed = JSON.parse(importData);
      
      if (parsed.type !== 'rubiks-cube-camera-state' || !parsed.state) {
        return { success: false, error: CameraError.INVALID_CAMERA_STATE };
      }

      return this.saveCameraState(parsed.state);
    } catch (error) {
      return { success: false, error: CameraError.INVALID_CAMERA_STATE };
    }
  }
}