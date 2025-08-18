/**
 * Environment configuration constants
 */
export const Environment = {
  DEVELOPMENT: 'development',
  STAGING: 'staging',
  PRODUCTION: 'production',
  TEST: 'test',
} as const;

export type EnvironmentType = typeof Environment[keyof typeof Environment];

/**
 * Feature flags interface
 */
export interface FeatureFlags {
  readonly enableMultiplayer: boolean;
  readonly enableLeaderboard: boolean;
  readonly enableAnalytics: boolean;
  readonly enableScrambleGenerator: boolean;
}

/**
 * Performance configuration interface
 */
export interface PerformanceConfig {
  readonly cubeRenderQuality: 'low' | 'medium' | 'high';
  readonly maxCubeHistory: number;
  readonly animationFpsTarget: number;
  readonly animationDuration: number;
}

/**
 * API configuration interface
 */
export interface ApiConfig {
  readonly baseUrl: string;
  readonly timeout: number;
  readonly retryAttempts: number;
}

/**
 * Application configuration interface
 */
export interface AppConfig {
  readonly environment: EnvironmentType;
  readonly debug: boolean;
  readonly api: ApiConfig;
  readonly features: FeatureFlags;
  readonly performance: PerformanceConfig;
}