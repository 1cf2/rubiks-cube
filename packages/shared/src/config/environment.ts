export interface EnvironmentConfig {
  nodeEnv: 'development' | 'staging' | 'production' | 'test';
  apiUrl: string;
  databaseUrl: string;
  redisUrl: string;
  enableDevTools: boolean;
  performanceMode: 'debug' | 'optimized' | 'production';
  features: {
    analytics: boolean;
    errorTracking: boolean;
    performanceMonitoring: boolean;
    advancedCubeModes: boolean;
  };
  thresholds: {
    frameRate: number;
    memoryUsage: number;
    loadTime: number;
  };
}

const configurations: Record<string, EnvironmentConfig> = {
  development: {
    nodeEnv: 'development',
    apiUrl: 'http://localhost:3001',
    databaseUrl: 'postgresql://localhost:5432/rubiks_dev',
    redisUrl: 'redis://localhost:6379',
    enableDevTools: true,
    performanceMode: 'debug',
    features: {
      analytics: false,
      errorTracking: false,
      performanceMonitoring: true,
      advancedCubeModes: true,
    },
    thresholds: {
      frameRate: 30, // Lower threshold for development
      memoryUsage: 150, // Higher threshold for development
      loadTime: 5000,
    },
  },
  
  staging: {
    nodeEnv: 'staging',
    apiUrl: 'https://api-staging.rubikscube.app',
    databaseUrl: process.env['DATABASE_URL'] || '',
    redisUrl: process.env['REDIS_URL'] || '',
    enableDevTools: false,
    performanceMode: 'optimized',
    features: {
      analytics: true,
      errorTracking: true,
      performanceMonitoring: true,
      advancedCubeModes: true,
    },
    thresholds: {
      frameRate: 45,
      memoryUsage: 90,
      loadTime: 2000,
    },
  },
  
  production: {
    nodeEnv: 'production',
    apiUrl: 'https://api.rubikscube.app',
    databaseUrl: process.env['DATABASE_URL'] || '',
    redisUrl: process.env['REDIS_URL'] || '',
    enableDevTools: false,
    performanceMode: 'production',
    features: {
      analytics: true,
      errorTracking: true,
      performanceMonitoring: true,
      advancedCubeModes: false, // Disabled for initial release
    },
    thresholds: {
      frameRate: 45,
      memoryUsage: 90,
      loadTime: 2000,
    },
  },
  
  test: {
    nodeEnv: 'test',
    apiUrl: 'http://localhost:3001',
    databaseUrl: 'postgresql://localhost:5432/rubiks_test',
    redisUrl: 'redis://localhost:6379',
    enableDevTools: false,
    performanceMode: 'debug',
    features: {
      analytics: false,
      errorTracking: false,
      performanceMonitoring: false,
      advancedCubeModes: true,
    },
    thresholds: {
      frameRate: 30,
      memoryUsage: 200,
      loadTime: 10000,
    },
  },
};

/**
 * Get the current environment configuration
 */
export function getEnvironmentConfig(): EnvironmentConfig {
  const env = process.env['NODE_ENV'] || 'development';
  const config = configurations[env];
  
  if (!config) {
    throw new Error(`Unknown environment: ${env}`);
  }
  
  // Validate required environment variables in production
  if (env === 'production' || env === 'staging') {
    validateEnvironmentVariables(config);
  }
  
  return config;
}

/**
 * Validate that required environment variables are set
 */
function validateEnvironmentVariables(config: EnvironmentConfig): void {
  const requiredVars = [
    { key: 'DATABASE_URL', value: config.databaseUrl },
    { key: 'REDIS_URL', value: config.redisUrl },
  ];
  
  const missing = requiredVars.filter(({ value }) => !value);
  
  if (missing.length > 0) {
    const missingKeys = missing.map(({ key }) => key).join(', ');
    throw new Error(`Missing required environment variables: ${missingKeys}`);
  }
}

/**
 * Check if a feature is enabled in the current environment
 */
export function isFeatureEnabled(feature: keyof EnvironmentConfig['features']): boolean {
  return getEnvironmentConfig().features[feature];
}

/**
 * Get performance thresholds for the current environment
 */
export function getPerformanceThresholds(): EnvironmentConfig['thresholds'] {
  return getEnvironmentConfig().thresholds;
}