import { isFeatureEnabled } from '../config/environment';

export interface ErrorInfo {
  id: string;
  message: string;
  stack?: string;
  type: 'error' | 'warning' | 'info';
  context: {
    component?: string;
    action?: string;
    userId?: string;
    sessionId?: string;
    cubeState?: any;
    performance?: {
      frameRate: number;
      memoryUsage: number;
    };
  };
  metadata: {
    userAgent: string;
    url: string;
    timestamp: number;
    environment: string;
  };
}

export interface ErrorFilter {
  type?: 'error' | 'warning' | 'info';
  component?: string;
  timeRange?: {
    start: number;
    end: number;
  };
}

export class ErrorTracker {
  private errors: ErrorInfo[] = [];
  private maxErrors = 100;
  private isInitialized = false;

  constructor() {
    if (isFeatureEnabled('errorTracking')) {
      this.initialize();
    }
  }

  /**
   * Initialize error tracking
   */
  initialize(): void {
    if (this.isInitialized) return;

    // Global error handler
    window.addEventListener('error', (event) => {
      this.captureError(event.error || new Error(event.message), {
        component: 'global',
        action: 'unhandled_error',
      });
    });

    // Promise rejection handler
    window.addEventListener('unhandledrejection', (event) => {
      this.captureError(new Error(`Unhandled promise rejection: ${event.reason}`), {
        component: 'global',
        action: 'unhandled_promise_rejection',
      });
    });

    // Three.js specific error handling
    this.setupThreeJSErrorHandling();

    // Console error override for capturing console.error calls
    this.setupConsoleErrorCapture();

    this.isInitialized = true;
    window.console.log('Error tracking initialized');
  }

  /**
   * Capture an error manually
   */
  captureError(error: Error, context: Partial<ErrorInfo['context']> = {}): string {
    const errorId = this.generateErrorId();
    
    const errorInfo: ErrorInfo = {
      id: errorId,
      message: error.message,
      stack: error.stack || '',
      type: 'error',
      context: {
        sessionId: this.getSessionId(),
        ...context,
      },
      metadata: {
        userAgent: navigator.userAgent,
        url: window.location.href,
        timestamp: Date.now(),
        environment: process.env['NODE_ENV'] || 'development',
      },
    };

    this.addError(errorInfo);
    return errorId;
  }

  /**
   * Capture a warning
   */
  captureWarning(message: string, context: Partial<ErrorInfo['context']> = {}): string {
    const errorInfo: ErrorInfo = {
      id: this.generateErrorId(),
      message,
      type: 'warning',
      context: {
        sessionId: this.getSessionId(),
        ...context,
      },
      metadata: {
        userAgent: navigator.userAgent,
        url: window.location.href,
        timestamp: Date.now(),
        environment: process.env['NODE_ENV'] || 'development',
      },
    };

    this.addError(errorInfo);
    return errorInfo.id;
  }

  /**
   * Capture performance-related errors
   */
  capturePerformanceError(message: string, performanceData: any, context: Partial<ErrorInfo['context']> = {}): string {
    return this.captureError(new Error(message), {
      ...context,
      performance: performanceData,
      component: context.component || 'performance',
    });
  }

  /**
   * Capture Three.js specific errors
   */
  captureThreeJSError(error: Error, sceneContext: any, context: Partial<ErrorInfo['context']> = {}): string {
    return this.captureError(error, {
      ...context,
      component: 'three-js',
      cubeState: sceneContext,
    });
  }

  /**
   * Set user context for error tracking
   */
  setUserContext(userId: string, metadata?: Record<string, any>): void {
    // Store user context for future errors
    if (typeof window !== 'undefined') {
      (window as any).__errorTrackerUserContext = {
        userId,
        metadata,
      };
    }
  }

  /**
   * Add breadcrumb for debugging
   */
  addBreadcrumb(message: string, category: string, data?: any): void {
    if (!isFeatureEnabled('errorTracking')) return;

    const breadcrumb = {
      message,
      category,
      data,
      timestamp: Date.now(),
    };

    // Store breadcrumbs in session storage
    try {
      const breadcrumbs = JSON.parse(sessionStorage.getItem('error-breadcrumbs') || '[]');
      breadcrumbs.push(breadcrumb);
      
      // Keep only last 50 breadcrumbs
      if (breadcrumbs.length > 50) {
        breadcrumbs.splice(0, breadcrumbs.length - 50);
      }
      
      sessionStorage.setItem('error-breadcrumbs', JSON.stringify(breadcrumbs));
    } catch (e) {
      window.console.warn('Failed to store breadcrumb:', e);
    }
  }

  /**
   * Get all captured errors
   */
  getErrors(filter?: ErrorFilter): ErrorInfo[] {
    let filteredErrors = [...this.errors];

    if (filter) {
      if (filter.type) {
        filteredErrors = filteredErrors.filter(e => e.type === filter.type);
      }
      
      if (filter.component) {
        filteredErrors = filteredErrors.filter(e => e.context.component === filter.component);
      }
      
      if (filter.timeRange) {
        filteredErrors = filteredErrors.filter(e => 
          e.metadata.timestamp >= filter.timeRange!.start && 
          e.metadata.timestamp <= filter.timeRange!.end
        );
      }
    }

    return filteredErrors;
  }

  /**
   * Get error statistics
   */
  getErrorStats(): {
    totalErrors: number;
    errorsByType: Record<string, number>;
    errorsByComponent: Record<string, number>;
    recentErrors: number;
  } {
    const now = Date.now();
    const oneHourAgo = now - (60 * 60 * 1000);

    const errorsByType: Record<string, number> = {};
    const errorsByComponent: Record<string, number> = {};
    let recentErrors = 0;

    this.errors.forEach(error => {
      // Count by type
      errorsByType[error.type] = (errorsByType[error.type] || 0) + 1;
      
      // Count by component
      const component = error.context.component || 'unknown';
      errorsByComponent[component] = (errorsByComponent[component] || 0) + 1;
      
      // Count recent errors
      if (error.metadata.timestamp > oneHourAgo) {
        recentErrors++;
      }
    });

    return {
      totalErrors: this.errors.length,
      errorsByType,
      errorsByComponent,
      recentErrors,
    };
  }

  /**
   * Clear all errors
   */
  clearErrors(): void {
    this.errors = [];
  }

  /**
   * Setup Three.js specific error handling
   */
  private setupThreeJSErrorHandling(): void {
    // This would be called from Three.js components to set up specific error handling
    window.console.log('Three.js error handling setup');
  }

  /**
   * Setup console error capture
   */
  private setupConsoleErrorCapture(): void {
    // eslint-disable-next-line no-console
    const originalConsoleError = console.error;
    
    // eslint-disable-next-line no-console
    console.error = (...args: any[]) => {
      // Call original console.error
      originalConsoleError.apply(console, args);
      
      // Capture as error
      const message = args.map(arg => 
        typeof arg === 'string' ? arg : JSON.stringify(arg)
      ).join(' ');
      
      this.captureError(new Error(message), {
        component: 'console',
        action: 'console_error',
      });
    };
  }

  /**
   * Add error to collection
   */
  private addError(errorInfo: ErrorInfo): void {
    this.errors.push(errorInfo);

    // Keep only last N errors to prevent memory leaks
    if (this.errors.length > this.maxErrors) {
      this.errors = this.errors.slice(-this.maxErrors);
    }

    // Send to external error tracking service
    this.sendToErrorTrackingService(errorInfo);
  }

  /**
   * Send error to external tracking service (Sentry, etc.)
   */
  private sendToErrorTrackingService(errorInfo: ErrorInfo): void {
    // In development, just log
    if (process.env['NODE_ENV'] === 'development') {
      window.console.error('Captured error:', errorInfo);
      return;
    }

    // Send to error tracking service
    if (typeof fetch !== 'undefined') {
      fetch('/api/errors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(errorInfo),
      }).catch(err => {
        window.console.warn('Failed to send error to tracking service:', err);
      });
    }

    // Integration with Sentry (if configured)
    if (typeof window !== 'undefined' && (window as any).Sentry) {
      (window as any).Sentry.captureException(new Error(errorInfo.message), {
        tags: {
          component: errorInfo.context.component,
          action: errorInfo.context.action,
        },
        extra: errorInfo.context,
      });
    }
  }

  /**
   * Generate unique error ID
   */
  private generateErrorId(): string {
    return `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get or create session ID
   */
  private getSessionId(): string {
    if (typeof window === 'undefined') return 'server';
    
    let sessionId = sessionStorage.getItem('error-tracker-session-id');
    if (!sessionId) {
      sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      sessionStorage.setItem('error-tracker-session-id', sessionId);
    }
    return sessionId;
  }
}

// Global error tracker instance
export const errorTracker = new ErrorTracker();