import { EnvironmentConfig } from './environment';

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Validate environment configuration
 */
export function validateEnvironmentConfig(config: EnvironmentConfig): ValidationResult {
  const result: ValidationResult = {
    isValid: true,
    errors: [],
    warnings: [],
  };

  // Validate API URL
  if (!config.apiUrl) {
    result.errors.push('API URL is required');
    result.isValid = false;
  } else if (!isValidUrl(config.apiUrl)) {
    result.errors.push('API URL is not a valid URL');
    result.isValid = false;
  }

  // Validate database URL for non-development environments
  if (config.nodeEnv !== 'development' && config.nodeEnv !== 'test') {
    if (!config.databaseUrl) {
      result.errors.push('Database URL is required for production environments');
      result.isValid = false;
    } else if (!config.databaseUrl.startsWith('postgresql://')) {
      result.errors.push('Database URL must be a PostgreSQL connection string');
      result.isValid = false;
    }
  }

  // Validate Redis URL for non-development environments
  if (config.nodeEnv !== 'development' && config.nodeEnv !== 'test') {
    if (!config.redisUrl) {
      result.errors.push('Redis URL is required for production environments');
      result.isValid = false;
    } else if (!config.redisUrl.startsWith('redis://')) {
      result.errors.push('Redis URL must be a Redis connection string');
      result.isValid = false;
    }
  }

  // Validate performance thresholds
  if (config.thresholds.frameRate < 15) {
    result.warnings.push('Frame rate threshold is very low (< 15 fps)');
  }
  if (config.thresholds.frameRate > 60) {
    result.warnings.push('Frame rate threshold is very high (> 60 fps)');
  }

  if (config.thresholds.memoryUsage < 50) {
    result.warnings.push('Memory usage threshold is very low (< 50 MB)');
  }
  if (config.thresholds.memoryUsage > 200) {
    result.warnings.push('Memory usage threshold is very high (> 200 MB)');
  }

  if (config.thresholds.loadTime < 500) {
    result.warnings.push('Load time threshold is very low (< 500ms)');
  }
  if (config.thresholds.loadTime > 10000) {
    result.warnings.push('Load time threshold is very high (> 10s)');
  }

  // Production-specific validations
  if (config.nodeEnv === 'production') {
    if (config.enableDevTools) {
      result.warnings.push('Dev tools should be disabled in production');
    }
    
    if (config.performanceMode !== 'production') {
      result.warnings.push('Performance mode should be "production" in production environment');
    }
    
    if (!config.features.errorTracking) {
      result.warnings.push('Error tracking should be enabled in production');
    }
    
    if (!config.features.performanceMonitoring) {
      result.warnings.push('Performance monitoring should be enabled in production');
    }
  }

  // Development-specific validations
  if (config.nodeEnv === 'development') {
    if (!config.enableDevTools) {
      result.warnings.push('Dev tools should be enabled in development');
    }
    
    if (config.features.analytics) {
      result.warnings.push('Analytics should be disabled in development');
    }
  }

  return result;
}

/**
 * Validate required environment variables
 */
export function validateRequiredEnvironmentVariables(): ValidationResult {
  const result: ValidationResult = {
    isValid: true,
    errors: [],
    warnings: [],
  };

  const nodeEnv = process.env['NODE_ENV'] || 'development';
  
  // Check NODE_ENV
  const validEnvs = ['development', 'staging', 'production', 'test'];
  if (!validEnvs.includes(nodeEnv)) {
    result.errors.push(`Invalid NODE_ENV: ${nodeEnv}. Must be one of: ${validEnvs.join(', ')}`);
    result.isValid = false;
  }

  // Production/staging specific checks
  if (nodeEnv === 'production' || nodeEnv === 'staging') {
    const requiredVars = [
      'DATABASE_URL',
      'REDIS_URL',
      'JWT_SECRET',
    ];

    for (const varName of requiredVars) {
      if (!process.env[varName]) {
        result.errors.push(`Missing required environment variable: ${varName}`);
        result.isValid = false;
      }
    }

    // Check JWT_SECRET strength
    const jwtSecret = process.env['JWT_SECRET'];
    if (jwtSecret && jwtSecret.length < 32) {
      result.warnings.push('JWT_SECRET should be at least 32 characters long');
    }
  }

  return result;
}

/**
 * Helper function to validate URLs
 */
function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Validate configuration and throw if invalid
 */
export function assertValidConfiguration(config: EnvironmentConfig): void {
  const envVarResult = validateRequiredEnvironmentVariables();
  const configResult = validateEnvironmentConfig(config);

  const allErrors = [...envVarResult.errors, ...configResult.errors];
  
  if (allErrors.length > 0) {
    throw new Error(`Configuration validation failed:\n${allErrors.join('\n')}`);
  }

  // Log warnings
  const allWarnings = [...envVarResult.warnings, ...configResult.warnings];
  if (allWarnings.length > 0) {
    window.console.warn('Configuration warnings:\n', allWarnings.join('\n'));
  }
}