import { ViewPreferences, Vector3D, CameraOperationResult, CameraError } from '@rubiks-cube/shared';

/**
 * ViewPreferencesManager - Manages user preferences for camera and view settings
 */
export class ViewPreferencesManager {
  private readonly STORAGE_KEY = 'rubiks-cube-view-preferences';
  private readonly PREFERENCES_VERSION = '1.0';
  
  private defaultPreferences: ViewPreferences = {
    defaultCameraPosition: { x: 5, y: 5, z: 5 },
    autoRotationSpeed: 0.5,
    autoRotationTimeout: 5000,
    zoomSensitivity: 1.0,
    orbitSensitivity: 1.2,
    persistCameraState: true
  };

  /**
   * Save view preferences to local storage
   */
  public savePreferences(preferences: ViewPreferences): CameraOperationResult<void> {
    try {
      const serializedData = {
        version: this.PREFERENCES_VERSION,
        timestamp: Date.now(),
        preferences: this.validateAndSanitizePreferences(preferences)
      };

      const serialized = JSON.stringify(serializedData);
      localStorage.setItem(this.STORAGE_KEY, serialized);
      
      return { success: true, data: undefined };
    } catch (error) {
      console.warn('Failed to save view preferences:', error);
      return { success: false, error: CameraError.INVALID_CAMERA_STATE };
    }
  }

  /**
   * Load view preferences from local storage
   */
  public loadPreferences(): CameraOperationResult<ViewPreferences> {
    try {
      const serialized = localStorage.getItem(this.STORAGE_KEY);
      if (!serialized) {
        return { success: true, data: this.defaultPreferences };
      }

      const parsed = JSON.parse(serialized);
      
      // Validate structure
      if (!this.validateStoredPreferences(parsed)) {
        console.warn('Invalid preferences data, using defaults');
        return { success: true, data: this.defaultPreferences };
      }

      // Handle version migration if needed
      const migratedPrefs = this.migratePreferencesFormat(parsed);
      if (!migratedPrefs) {
        console.warn('Failed to migrate preferences format, using defaults');
        return { success: true, data: this.defaultPreferences };
      }

      // Merge with defaults to ensure all properties exist
      const mergedPreferences = {
        ...this.defaultPreferences,
        ...migratedPrefs.preferences
      };

      return { success: true, data: this.validateAndSanitizePreferences(mergedPreferences) };
    } catch (error) {
      console.warn('Failed to load view preferences:', error);
      return { success: true, data: this.defaultPreferences };
    }
  }

  /**
   * Reset preferences to defaults
   */
  public resetToDefaults(): CameraOperationResult<ViewPreferences> {
    const saveResult = this.savePreferences(this.defaultPreferences);
    if (!saveResult.success) {
      return { success: false, error: saveResult.error };
    }
    
    return { success: true, data: this.defaultPreferences };
  }

  /**
   * Update specific preference values
   */
  public updatePreferences(updates: Partial<ViewPreferences>): CameraOperationResult<ViewPreferences> {
    const loadResult = this.loadPreferences();
    if (!loadResult.success) {
      return loadResult;
    }

    const updatedPreferences = {
      ...loadResult.data,
      ...updates
    };

    const saveResult = this.savePreferences(updatedPreferences);
    if (!saveResult.success) {
      return { success: false, error: saveResult.error };
    }

    return { success: true, data: updatedPreferences };
  }

  /**
   * Get default camera position based on preferences
   */
  public getDefaultCameraPosition(): Vector3D {
    const loadResult = this.loadPreferences();
    return loadResult.success ? loadResult.data.defaultCameraPosition : this.defaultPreferences.defaultCameraPosition;
  }

  /**
   * Check if camera state persistence is enabled
   */
  public isCameraPersistenceEnabled(): boolean {
    const loadResult = this.loadPreferences();
    return loadResult.success ? loadResult.data.persistCameraState : this.defaultPreferences.persistCameraState;
  }

  /**
   * Get auto-rotation configuration from preferences
   */
  public getAutoRotationConfig(): {
    speed: number;
    timeout: number;
  } {
    const loadResult = this.loadPreferences();
    const prefs = loadResult.success ? loadResult.data : this.defaultPreferences;
    
    return {
      speed: prefs.autoRotationSpeed,
      timeout: prefs.autoRotationTimeout
    };
  }

  /**
   * Get input sensitivity settings
   */
  public getInputSensitivity(): {
    zoom: number;
    orbit: number;
  } {
    const loadResult = this.loadPreferences();
    const prefs = loadResult.success ? loadResult.data : this.defaultPreferences;
    
    return {
      zoom: prefs.zoomSensitivity,
      orbit: prefs.orbitSensitivity
    };
  }

  /**
   * Validate and sanitize preferences
   */
  private validateAndSanitizePreferences(preferences: ViewPreferences): ViewPreferences {
    const sanitized: ViewPreferences = {
      defaultCameraPosition: this.validateVector3D(preferences.defaultCameraPosition) 
        ? preferences.defaultCameraPosition 
        : this.defaultPreferences.defaultCameraPosition,
      
      autoRotationSpeed: this.clampNumber(preferences.autoRotationSpeed, 0.1, 2.0),
      autoRotationTimeout: this.clampNumber(preferences.autoRotationTimeout, 1000, 30000),
      zoomSensitivity: this.clampNumber(preferences.zoomSensitivity, 0.1, 3.0),
      orbitSensitivity: this.clampNumber(preferences.orbitSensitivity, 0.1, 3.0),
      persistCameraState: typeof preferences.persistCameraState === 'boolean' 
        ? preferences.persistCameraState 
        : this.defaultPreferences.persistCameraState
    };

    return sanitized;
  }

  /**
   * Validate Vector3D object
   */
  private validateVector3D(vector: Vector3D): boolean {
    return vector &&
           typeof vector.x === 'number' && isFinite(vector.x) &&
           typeof vector.y === 'number' && isFinite(vector.y) &&
           typeof vector.z === 'number' && isFinite(vector.z);
  }

  /**
   * Clamp number to valid range
   */
  private clampNumber(value: number, min: number, max: number): number {
    if (typeof value !== 'number' || !isFinite(value)) {
      return min;
    }
    return Math.max(min, Math.min(max, value));
  }

  /**
   * Validate stored preferences structure
   */
  private validateStoredPreferences(data: any): boolean {
    return data &&
           typeof data === 'object' &&
           data.version &&
           data.preferences &&
           typeof data.preferences === 'object';
  }

  /**
   * Migrate preferences format between versions
   */
  private migratePreferencesFormat(data: any): any | null {
    try {
      // Handle version 1.0 (current version)
      if (data.version === this.PREFERENCES_VERSION) {
        return data;
      }

      // Future version migrations would go here
      console.warn(`Unsupported preferences version: ${data.version}`);
      return null;
    } catch (error) {
      console.warn('Error during preferences migration:', error);
      return null;
    }
  }

  /**
   * Export preferences for backup/sharing
   */
  public exportPreferences(): CameraOperationResult<string> {
    const loadResult = this.loadPreferences();
    if (!loadResult.success) {
      return { success: false, error: loadResult.error };
    }

    try {
      const exportData = {
        type: 'rubiks-cube-view-preferences',
        version: this.PREFERENCES_VERSION,
        exported: Date.now(),
        preferences: loadResult.data
      };

      return { success: true, data: JSON.stringify(exportData, null, 2) };
    } catch (error) {
      return { success: false, error: CameraError.INVALID_CAMERA_STATE };
    }
  }

  /**
   * Import preferences from backup/sharing
   */
  public importPreferences(importData: string): CameraOperationResult<ViewPreferences> {
    try {
      const parsed = JSON.parse(importData);
      
      if (parsed.type !== 'rubiks-cube-view-preferences' || !parsed.preferences) {
        return { success: false, error: CameraError.INVALID_CAMERA_STATE };
      }

      const saveResult = this.savePreferences(parsed.preferences);
      if (!saveResult.success) {
        return { success: false, error: saveResult.error };
      }

      return { success: true, data: parsed.preferences };
    } catch (error) {
      return { success: false, error: CameraError.INVALID_CAMERA_STATE };
    }
  }

  /**
   * Clear all saved preferences
   */
  public clearPreferences(): CameraOperationResult<void> {
    try {
      localStorage.removeItem(this.STORAGE_KEY);
      return { success: true, data: undefined };
    } catch (error) {
      return { success: false, error: CameraError.INVALID_CAMERA_STATE };
    }
  }

  /**
   * Check if local storage is available
   */
  public isStorageAvailable(): boolean {
    try {
      const testKey = '__preferences_storage_test__';
      localStorage.setItem(testKey, 'test');
      localStorage.removeItem(testKey);
      return true;
    } catch {
      return false;
    }
  }
}