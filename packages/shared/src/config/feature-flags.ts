import { getEnvironmentConfig } from './environment';

export interface FeatureFlags {
  // Core features
  cubeRotation: boolean;
  scrambleAlgorithm: boolean;
  timerMode: boolean;
  tutorialMode: boolean;
  
  // Advanced features
  advancedSolving: boolean;
  multiplayer: boolean;
  leaderboards: boolean;
  customCubeColors: boolean;
  statisticsTracking: boolean;
  
  // Performance features
  webWorkerSolving: boolean;
  webGLOptimizations: boolean;
  frameRateOptimization: boolean;
  memoryOptimization: boolean;
  
  // External integrations
  googleAnalytics: boolean;
  sentryErrorTracking: boolean;
  performanceMonitoring: boolean;
  
  // Experimental features
  voiceCommands: boolean;
  handGestures: boolean;
  arMode: boolean;
  vrMode: boolean;
}

/**
 * Default feature flags configuration
 */
const defaultFlags: FeatureFlags = {
  // Core features - always enabled
  cubeRotation: true,
  scrambleAlgorithm: true,
  timerMode: true,
  tutorialMode: true,
  
  // Advanced features - environment dependent
  advancedSolving: false,
  multiplayer: false,
  leaderboards: false,
  customCubeColors: true,
  statisticsTracking: true,
  
  // Performance features - enabled by default
  webWorkerSolving: true,
  webGLOptimizations: true,
  frameRateOptimization: true,
  memoryOptimization: true,
  
  // External integrations - environment dependent
  googleAnalytics: false,
  sentryErrorTracking: false,
  performanceMonitoring: true,
  
  // Experimental features - disabled by default
  voiceCommands: false,
  handGestures: false,
  arMode: false,
  vrMode: false,
};

/**
 * Environment-specific feature flag overrides
 */
const environmentOverrides: Record<string, Partial<FeatureFlags>> = {
  development: {
    // Enable all features for development
    advancedSolving: true,
    multiplayer: true,
    leaderboards: true,
    voiceCommands: true,
    handGestures: true,
    // Keep analytics disabled in dev
    googleAnalytics: false,
    sentryErrorTracking: false,
  },
  
  staging: {
    // Enable most features for testing
    advancedSolving: true,
    multiplayer: false, // Not ready for staging yet
    leaderboards: true,
    googleAnalytics: true,
    sentryErrorTracking: true,
    performanceMonitoring: true,
    // Test experimental features
    voiceCommands: true,
    handGestures: false,
  },
  
  production: {
    // Conservative feature set for production
    advancedSolving: false, // Will be enabled in future release
    multiplayer: false,
    leaderboards: true,
    googleAnalytics: true,
    sentryErrorTracking: true,
    performanceMonitoring: true,
    // No experimental features in production
    voiceCommands: false,
    handGestures: false,
    arMode: false,
    vrMode: false,
  },
  
  test: {
    // Minimal features for testing
    googleAnalytics: false,
    sentryErrorTracking: false,
    performanceMonitoring: false,
  },
};

/**
 * Remote feature flags (can be overridden by API)
 * These would typically come from a feature flag service
 */
let remoteFlags: Partial<FeatureFlags> = {};

/**
 * Get the current feature flags configuration
 */
export function getFeatureFlags(): FeatureFlags {
  const env = getEnvironmentConfig().nodeEnv;
  const envOverrides = environmentOverrides[env] || {};
  
  return {
    ...defaultFlags,
    ...envOverrides,
    ...remoteFlags,
  };
}

/**
 * Check if a specific feature is enabled
 */
export function isFeatureEnabled(feature: keyof FeatureFlags): boolean {
  return getFeatureFlags()[feature];
}

/**
 * Update remote feature flags (for A/B testing, gradual rollouts)
 */
export function updateRemoteFlags(flags: Partial<FeatureFlags>): void {
  remoteFlags = { ...remoteFlags, ...flags };
}

/**
 * Reset remote flags to defaults
 */
export function resetRemoteFlags(): void {
  remoteFlags = {};
}

/**
 * Get feature flags for analytics reporting
 */
export function getEnabledFeatures(): string[] {
  const flags = getFeatureFlags();
  return Object.entries(flags)
    .filter(([, enabled]) => enabled)
    .map(([feature]) => feature);
}

/**
 * Feature flag middleware for gradual rollouts
 */
export function withFeatureFlag<T>(
  feature: keyof FeatureFlags,
  enabledComponent: T,
  disabledComponent?: T
): T | undefined {
  return isFeatureEnabled(feature) ? enabledComponent : disabledComponent;
}