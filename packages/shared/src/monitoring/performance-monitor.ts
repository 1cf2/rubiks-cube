import { getPerformanceThresholds, isFeatureEnabled } from '../config/environment';

export interface PerformanceMetrics {
  frameRate: number;
  memoryUsage: number;
  loadTime: number;
  renderTime: number;
  cubeOperationTime: number;
  timestamp: number;
}

export interface PerformanceAlert {
  type: 'warning' | 'critical';
  metric: keyof PerformanceMetrics;
  value: number;
  threshold: number;
  message: string;
  timestamp: number;
}

export class PerformanceMonitor {
  private metrics: PerformanceMetrics[] = [];
  private alerts: PerformanceAlert[] = [];
  private frameCount = 0;
  private lastFrameTime = 0;
  private frameRateCalculationInterval = 1000; // 1 second
  private isMonitoring = false;
  private monitoringInterval: number | undefined;

  constructor() {
    if (isFeatureEnabled('performanceMonitoring')) {
      this.startMonitoring();
    }
  }

  /**
   * Start performance monitoring
   */
  startMonitoring(): void {
    if (this.isMonitoring) return;

    this.isMonitoring = true;
    this.lastFrameTime = performance.now();

    // Monitor frame rate
    this.monitorFrameRate();

    // Monitor memory usage
    this.monitoringInterval = window.setInterval(() => {
      this.collectMemoryMetrics();
    }, 5000); // Every 5 seconds

    window.console.log('Performance monitoring started');
  }

  /**
   * Stop performance monitoring
   */
  stopMonitoring(): void {
    this.isMonitoring = false;
    
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = undefined;
    }

    window.console.log('Performance monitoring stopped');
  }

  /**
   * Record frame rendering
   */
  recordFrame(): void {
    if (!this.isMonitoring) return;

    const currentTime = performance.now();
    this.frameCount++;

    // Calculate frame rate every second
    if (currentTime - this.lastFrameTime >= this.frameRateCalculationInterval) {
      const frameRate = (this.frameCount * 1000) / (currentTime - this.lastFrameTime);
      this.recordMetric({ frameRate });
      
      this.frameCount = 0;
      this.lastFrameTime = currentTime;
    }
  }

  /**
   * Record cube operation timing
   */
  recordCubeOperation(operationTime: number): void {
    if (!this.isMonitoring) return;

    this.recordMetric({ cubeOperationTime: operationTime });
  }

  /**
   * Record page load time
   */
  recordLoadTime(): void {
    if (!this.isMonitoring) return;

    const loadTime = performance.timing.loadEventEnd - performance.timing.navigationStart;
    this.recordMetric({ loadTime });
  }

  /**
   * Record render time for Three.js scenes
   */
  recordRenderTime(renderTime: number): void {
    if (!this.isMonitoring) return;

    this.recordMetric({ renderTime });
  }

  /**
   * Monitor frame rate using requestAnimationFrame
   */
  private monitorFrameRate(): void {
    if (!this.isMonitoring) return;

    this.recordFrame();
    requestAnimationFrame(() => this.monitorFrameRate());
  }

  /**
   * Collect memory usage metrics
   */
  private collectMemoryMetrics(): void {
    if (!this.isMonitoring) return;

    // Use memory API if available
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      const memoryUsage = memory.usedJSHeapSize / (1024 * 1024); // Convert to MB
      this.recordMetric({ memoryUsage });
    }
  }

  /**
   * Record a performance metric
   */
  private recordMetric(metric: Partial<PerformanceMetrics>): void {
    const timestamp = Date.now();
    const fullMetric: PerformanceMetrics = {
      frameRate: 0,
      memoryUsage: 0,
      loadTime: 0,
      renderTime: 0,
      cubeOperationTime: 0,
      timestamp,
      ...metric,
    };

    this.metrics.push(fullMetric);

    // Keep only last 100 metrics to prevent memory leaks
    if (this.metrics.length > 100) {
      this.metrics = this.metrics.slice(-100);
    }

    // Check for alerts
    this.checkThresholds(fullMetric);

    // Send to external monitoring service if configured
    this.sendToMonitoringService(fullMetric);
  }

  /**
   * Check performance thresholds and create alerts
   */
  private checkThresholds(metric: PerformanceMetrics): void {
    const thresholds = getPerformanceThresholds();

    // Check frame rate
    if (metric.frameRate > 0 && metric.frameRate < thresholds.frameRate) {
      this.createAlert('critical', 'frameRate', metric.frameRate, thresholds.frameRate,
        `Frame rate dropped to ${metric.frameRate.toFixed(1)} fps (threshold: ${thresholds.frameRate} fps)`);
    }

    // Check memory usage
    if (metric.memoryUsage > thresholds.memoryUsage) {
      this.createAlert('warning', 'memoryUsage', metric.memoryUsage, thresholds.memoryUsage,
        `Memory usage is ${metric.memoryUsage.toFixed(1)} MB (threshold: ${thresholds.memoryUsage} MB)`);
    }

    // Check load time
    if (metric.loadTime > thresholds.loadTime) {
      this.createAlert('warning', 'loadTime', metric.loadTime, thresholds.loadTime,
        `Load time is ${metric.loadTime} ms (threshold: ${thresholds.loadTime} ms)`);
    }
  }

  /**
   * Create a performance alert
   */
  private createAlert(
    type: 'warning' | 'critical',
    metric: keyof PerformanceMetrics,
    value: number,
    threshold: number,
    message: string
  ): void {
    const alert: PerformanceAlert = {
      type,
      metric,
      value,
      threshold,
      message,
      timestamp: Date.now(),
    };

    this.alerts.push(alert);

    // Keep only last 50 alerts
    if (this.alerts.length > 50) {
      this.alerts = this.alerts.slice(-50);
    }

    // Log alert
    if (type === 'critical') {
      window.console.error('Performance Alert:', message);
    } else {
      window.console.warn('Performance Alert:', message);
    }

    // Send alert to monitoring service
    this.sendAlertToMonitoringService(alert);
  }

  /**
   * Send metrics to external monitoring service
   */
  private sendToMonitoringService(metric: PerformanceMetrics): void {
    // In a real implementation, this would send to services like DataDog, New Relic, etc.
    if (process.env['NODE_ENV'] === 'development') {
      // Only log in development to avoid spam
      if (metric.frameRate > 0) {
        window.console.log(`Performance: FPS: ${metric.frameRate.toFixed(1)}, Memory: ${metric.memoryUsage.toFixed(1)}MB`);
      }
    }

    // Example: Send to custom analytics endpoint
    if (isFeatureEnabled('performanceMonitoring') && typeof fetch !== 'undefined') {
      fetch('/api/performance/metrics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(metric),
      }).catch(error => {
        window.console.warn('Failed to send performance metric:', error);
      });
    }
  }

  /**
   * Send alert to monitoring service
   */
  private sendAlertToMonitoringService(alert: PerformanceAlert): void {
    // Example: Send to Slack webhook or alerting service
    if (isFeatureEnabled('performanceMonitoring') && typeof fetch !== 'undefined') {
      fetch('/api/performance/alerts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(alert),
      }).catch(error => {
        window.console.warn('Failed to send performance alert:', error);
      });
    }
  }

  /**
   * Get current performance metrics
   */
  getMetrics(): PerformanceMetrics[] {
    return [...this.metrics];
  }

  /**
   * Get performance alerts
   */
  getAlerts(): PerformanceAlert[] {
    return [...this.alerts];
  }

  /**
   * Get performance summary
   */
  getSummary(): {
    averageFrameRate: number;
    averageMemoryUsage: number;
    alertCount: number;
    criticalAlertCount: number;
  } {
    const recentMetrics = this.metrics.slice(-20); // Last 20 metrics

    const averageFrameRate = recentMetrics.length > 0
      ? recentMetrics.reduce((sum, m) => sum + m.frameRate, 0) / recentMetrics.length
      : 0;

    const averageMemoryUsage = recentMetrics.length > 0
      ? recentMetrics.reduce((sum, m) => sum + m.memoryUsage, 0) / recentMetrics.length
      : 0;

    const criticalAlertCount = this.alerts.filter(a => a.type === 'critical').length;

    return {
      averageFrameRate,
      averageMemoryUsage,
      alertCount: this.alerts.length,
      criticalAlertCount,
    };
  }

  /**
   * Clear all metrics and alerts
   */
  clear(): void {
    this.metrics = [];
    this.alerts = [];
  }
}

// Global performance monitor instance
export const performanceMonitor = new PerformanceMonitor();