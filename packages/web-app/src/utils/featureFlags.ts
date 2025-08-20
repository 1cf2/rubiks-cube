/**
 * Feature flags system for controlling debug and experimental features
 */

export interface FeatureFlags {
  // Debug features
  enableMouseGestureDebug: boolean;
  enableMouseGestureOverlay: boolean;
  enableConsoleDebugLogs: boolean;
  enablePerformanceMonitoring: boolean;
  
  // Mouse gesture features
  enableMouseGestureLogging: boolean;
  enableRaycastDebug: boolean;
  enableGestureVisualization: boolean;
  
  // Development features
  enableDevelopmentTools: boolean;
  enableExperimentalFeatures: boolean;
}

// Default feature flags
const DEFAULT_FLAGS: FeatureFlags = {
  // Debug features - disabled by default in production
  enableMouseGestureDebug: false,
  enableMouseGestureOverlay: false,
  enableConsoleDebugLogs: false,
  enablePerformanceMonitoring: false,
  
  // Mouse gesture features
  enableMouseGestureLogging: false,
  enableRaycastDebug: false,
  enableGestureVisualization: false,
  
  // Development features
  enableDevelopmentTools: false,
  enableExperimentalFeatures: false,
};

// Development overrides (when NODE_ENV === 'development')
const DEVELOPMENT_FLAGS: Partial<FeatureFlags> = {
  enableMouseGestureDebug: true,
  enableMouseGestureOverlay: true,
  enableConsoleDebugLogs: true,
  enableMouseGestureLogging: true,
  enableDevelopmentTools: true,
  enableRaycastDebug: true,
  enablePerformanceMonitoring: true,
  enableGestureVisualization: true,
};

// URL parameter overrides (for quick testing)
const URL_PARAM_OVERRIDES: Record<string, keyof FeatureFlags> = {
  'debug': 'enableMouseGestureDebug',
  'overlay': 'enableMouseGestureOverlay',
  'logs': 'enableConsoleDebugLogs',
  'raycast': 'enableRaycastDebug',
  'gestures': 'enableGestureVisualization',
  'perf': 'enablePerformanceMonitoring',
  'dev': 'enableDevelopmentTools',
  'experimental': 'enableExperimentalFeatures',
};

class FeatureFlagManager {
  private flags: FeatureFlags;
  private isDevelopment: boolean;

  constructor() {
    this.isDevelopment = process.env['NODE_ENV'] === 'development';
    this.flags = this.initializeFlags();
  }

  private initializeFlags(): FeatureFlags {
    // Start with default flags
    let flags = { ...DEFAULT_FLAGS };

    // Apply development overrides if in development mode
    if (this.isDevelopment) {
      flags = { ...flags, ...DEVELOPMENT_FLAGS };
    }

    // Apply localStorage overrides
    const storedFlags = this.getStoredFlags();
    if (storedFlags) {
      flags = { ...flags, ...storedFlags };
    }

    // Apply URL parameter overrides
    const urlFlags = this.getUrlParameterFlags();
    flags = { ...flags, ...urlFlags };

    return flags;
  }

  private getStoredFlags(): Partial<FeatureFlags> | null {
    try {
      const stored = localStorage.getItem('rubiks-cube-feature-flags');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  }

  private getUrlParameterFlags(): Partial<FeatureFlags> {
    const urlParams = new URLSearchParams(window.location.search);
    const flags: Partial<FeatureFlags> = {};

    for (const [param, flagKey] of Object.entries(URL_PARAM_OVERRIDES)) {
      const value = urlParams.get(param);
      if (value !== null) {
        // Support both boolean values and presence checks
        const boolValue = value === '' || value === 'true' || value === '1';
        flags[flagKey] = boolValue;
      }
    }

    return flags;
  }

  // Get a specific flag value
  getFlag(key: keyof FeatureFlags): boolean {
    return this.flags[key];
  }

  // Get all flags
  getAllFlags(): FeatureFlags {
    return { ...this.flags };
  }

  // Set a flag (useful for runtime toggling)
  setFlag(key: keyof FeatureFlags, value: boolean): void {
    this.flags[key] = value;
    this.saveToLocalStorage();
  }

  // Toggle a flag
  toggleFlag(key: keyof FeatureFlags): boolean {
    const newValue = !this.flags[key];
    this.setFlag(key, newValue);
    return newValue;
  }

  // Save current flags to localStorage
  private saveToLocalStorage(): void {
    try {
      localStorage.setItem('rubiks-cube-feature-flags', JSON.stringify(this.flags));
    } catch {
      // Ignore localStorage errors
    }
  }

  // Reset flags to defaults
  reset(): void {
    this.flags = this.initializeFlags();
    try {
      localStorage.removeItem('rubiks-cube-feature-flags');
    } catch {
      // Ignore localStorage errors
    }
  }

  // Get flags summary for debugging
  getDebugSummary(): string {
    const activeFlags = Object.entries(this.flags)
      .filter(([, value]) => value)
      .map(([key]) => key);
    
    return `Feature Flags Active: ${activeFlags.length > 0 ? activeFlags.join(', ') : 'none'}`;
  }
}

// Singleton instance
export const featureFlags = new FeatureFlagManager();

// Convenience functions
export const isDebugEnabled = () => featureFlags.getFlag('enableMouseGestureDebug');
export const isOverlayEnabled = () => featureFlags.getFlag('enableMouseGestureOverlay');
export const isLoggingEnabled = () => featureFlags.getFlag('enableConsoleDebugLogs');
export const isGestureLoggingEnabled = () => featureFlags.getFlag('enableMouseGestureLogging');

// Global window access for easy console debugging
if (typeof window !== 'undefined') {
  (window as any).featureFlags = featureFlags;
  (window as any).debugFlags = {
    enable: () => featureFlags.setFlag('enableMouseGestureDebug', true),
    disable: () => featureFlags.setFlag('enableMouseGestureDebug', false),
    toggle: () => featureFlags.toggleFlag('enableMouseGestureDebug'),
    overlay: () => featureFlags.toggleFlag('enableMouseGestureOverlay'),
    logs: () => featureFlags.toggleFlag('enableConsoleDebugLogs'),
    reset: () => featureFlags.reset(),
    status: () => window.console.log(featureFlags.getDebugSummary()),
  };
}