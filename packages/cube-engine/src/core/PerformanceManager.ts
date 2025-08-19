import { CubeState, FaceState, PerformanceCritical } from '../types/CubeTypes';

export interface PerformanceMetrics {
  readonly operationName: string;
  readonly executionTime: number; // milliseconds
  readonly memoryUsage: number; // bytes
  readonly timestamp: number;
  readonly inputSize: number; // relative size indicator
  readonly success: boolean;
}

export interface PerformanceReport {
  readonly totalOperations: number;
  readonly averageExecutionTime: number;
  readonly maxExecutionTime: number;
  readonly minExecutionTime: number;
  readonly operationsPerSecond: number;
  readonly memoryPeakUsage: number;
  readonly slowOperations: PerformanceMetrics[];
  readonly errorRate: number;
}

export interface MemoryProfile {
  readonly allocated: number;
  readonly peak: number;
  readonly released: number;
  readonly pools: Map<string, number>;
}

export interface OptimizationSettings {
  readonly enableMemoization: boolean;
  readonly memoizationCacheSize: number;
  readonly enableObjectPooling: boolean;
  readonly poolSizes: Record<string, number>;
  readonly enableLazyLoading: boolean;
  readonly performanceThreshold: number; // milliseconds
}

export class PerformanceManager implements PerformanceCritical {
  readonly executionTime: '16ms' = '16ms';
  readonly memoryAllocation: 'minimal' = 'minimal';

  private metrics: PerformanceMetrics[] = [];
  private memoCache = new Map<string, any>();
  private objectPools = new Map<string, any[]>();
  private memoryProfile: MemoryProfile;
  private settings: OptimizationSettings;

  private static readonly PERFORMANCE_THRESHOLD = 16; // 16ms for 60fps
  private static readonly MAX_METRICS_HISTORY = 1000;
  private static readonly MEMORY_THRESHOLD = 50 * 1024 * 1024; // 50MB

  constructor(settings: Partial<OptimizationSettings> = {}) {
    this.settings = {
      enableMemoization: true,
      memoizationCacheSize: 500,
      enableObjectPooling: true,
      poolSizes: {
        'FaceState': 100,
        'Move': 200,
        'CubeState': 50,
      },
      enableLazyLoading: true,
      performanceThreshold: PerformanceManager.PERFORMANCE_THRESHOLD,
      ...settings,
    };

    this.memoryProfile = {
      allocated: 0,
      peak: 0,
      released: 0,
      pools: new Map(),
    };

    this.initializeObjectPools();
  }

  // Performance measurement decorator
  measurePerformance<T>(
    operationName: string,
    operation: () => T,
    inputSize: number = 1
  ): T {
    const startTime = performance.now();
    const startMemory = this.estimateMemoryUsage();
    let success = true;
    let result: T;

    try {
      result = operation();
      return result;
    } catch (error) {
      success = false;
      throw error;
    } finally {
      const endTime = performance.now();
      const endMemory = this.estimateMemoryUsage();
      const executionTime = endTime - startTime;
      const memoryUsage = endMemory - startMemory;

      const metric: PerformanceMetrics = {
        operationName,
        executionTime,
        memoryUsage: Math.max(0, memoryUsage),
        timestamp: Date.now(),
        inputSize,
        success,
      };

      this.recordMetric(metric);

      // Alert if over threshold
      if (executionTime > this.settings.performanceThreshold) {
        console.warn(`Performance threshold exceeded: ${operationName} took ${executionTime.toFixed(2)}ms`);
      }
    }
  }

  // Async performance measurement
  async measureAsyncPerformance<T>(
    operationName: string,
    operation: () => Promise<T>,
    inputSize: number = 1
  ): Promise<T> {
    const startTime = performance.now();
    const startMemory = this.estimateMemoryUsage();
    let success = true;

    try {
      const result = await operation();
      return result;
    } catch (error) {
      success = false;
      throw error;
    } finally {
      const endTime = performance.now();
      const endMemory = this.estimateMemoryUsage();
      const executionTime = endTime - startTime;
      const memoryUsage = endMemory - startMemory;

      const metric: PerformanceMetrics = {
        operationName,
        executionTime,
        memoryUsage: Math.max(0, memoryUsage),
        timestamp: Date.now(),
        inputSize,
        success,
      };

      this.recordMetric(metric);
    }
  }

  // Memoization for expensive operations
  memoize<T>(key: string, operation: () => T): T {
    if (!this.settings.enableMemoization) {
      return operation();
    }

    if (this.memoCache.has(key)) {
      return this.memoCache.get(key);
    }

    const result = operation();
    
    // Manage cache size
    if (this.memoCache.size >= this.settings.memoizationCacheSize) {
      const firstKey = this.memoCache.keys().next().value;
      if (firstKey !== undefined) {
        this.memoCache.delete(firstKey);
      }
    }

    this.memoCache.set(key, result);
    return result;
  }

  // Object pooling for frequent allocations
  borrowFromPool<T>(poolName: string, factory: () => T): T {
    if (!this.settings.enableObjectPooling) {
      return factory();
    }

    const pool = this.objectPools.get(poolName);
    if (pool && pool.length > 0) {
      return pool.pop() as T;
    }

    return factory();
  }

  returnToPool<T>(poolName: string, object: T): void {
    if (!this.settings.enableObjectPooling) {
      return;
    }

    const pool = this.objectPools.get(poolName);
    const maxSize = this.settings.poolSizes[poolName] || 50;
    
    if (pool && pool.length < maxSize) {
      pool.push(object);
    }
  }

  // Memory-efficient state operations
  createOptimizedFaceState(face: any, colors: readonly any[], rotation: number): FaceState {
    return this.measurePerformance('createOptimizedFaceState', () => {
      return this.borrowFromPool('FaceState', () => ({
        face,
        colors: this.settings.enableLazyLoading ? Object.freeze([...colors]) : colors,
        rotation,
      }));
    }, colors.length);
  }

  cloneStateEfficiently(state: CubeState): CubeState {
    return this.measurePerformance('cloneStateEfficiently', () => {
      const cacheKey = `clone_${this.generateStateHash(state)}`;
      
      return this.memoize(cacheKey, () => {
        // Use object pooling for face states
        const newFaces = state.faces.map(face => 
          this.createOptimizedFaceState(face.face, face.colors, face.rotation)
        );
        
        if (newFaces.length !== 6) {
          throw new Error('Invalid face count during optimization');
        }
        
        const faces = newFaces as unknown as readonly [FaceState, FaceState, FaceState, FaceState, FaceState, FaceState];

        return {
          faces,
          moveHistory: this.settings.enableLazyLoading ? 
            Object.freeze([...state.moveHistory]) : 
            [...state.moveHistory],
          isScrambled: state.isScrambled,
          isSolved: state.isSolved,
          timestamp: Date.now(),
        };
      });
    }, state.faces.length);
  }

  // Batch operations for better performance
  batchStateOperations<T>(operations: Array<() => T>): T[] {
    return this.measurePerformance('batchStateOperations', () => {
      const results: T[] = [];
      
      // Process in chunks to avoid blocking
      const chunkSize = 10;
      for (let i = 0; i < operations.length; i += chunkSize) {
        const chunk = operations.slice(i, i + chunkSize);
        results.push(...chunk.map(op => op()));
        
        // Yield control if processing large batches
        if (i > 0 && i % 50 === 0) {
          // In a real implementation, you might use setTimeout(0) or requestIdleCallback
        }
      }
      
      return results;
    }, operations.length);
  }

  // Performance monitoring and reporting
  getPerformanceReport(timeWindow?: number): PerformanceReport {
    const cutoffTime = timeWindow ? Date.now() - timeWindow : 0;
    const relevantMetrics = this.metrics.filter(m => m.timestamp >= cutoffTime);

    if (relevantMetrics.length === 0) {
      return {
        totalOperations: 0,
        averageExecutionTime: 0,
        maxExecutionTime: 0,
        minExecutionTime: 0,
        operationsPerSecond: 0,
        memoryPeakUsage: this.memoryProfile.peak,
        slowOperations: [],
        errorRate: 0,
      };
    }

    const executionTimes = relevantMetrics.map(m => m.executionTime);
    const failedOps = relevantMetrics.filter(m => !m.success).length;
    const slowOps = relevantMetrics.filter(m => 
      m.executionTime > this.settings.performanceThreshold
    );

    const timeSpan = relevantMetrics.length > 0 ? 
      (relevantMetrics[relevantMetrics.length - 1]!.timestamp - relevantMetrics[0]!.timestamp) / 1000 : 1;

    return {
      totalOperations: relevantMetrics.length,
      averageExecutionTime: executionTimes.reduce((a, b) => a + b, 0) / executionTimes.length,
      maxExecutionTime: Math.max(...executionTimes),
      minExecutionTime: Math.min(...executionTimes),
      operationsPerSecond: relevantMetrics.length / timeSpan,
      memoryPeakUsage: this.memoryProfile.peak,
      slowOperations: slowOps,
      errorRate: failedOps / relevantMetrics.length,
    };
  }

  // Clear performance data
  clearMetrics(): void {
    this.metrics = [];
    this.memoCache.clear();
    this.memoryProfile = {
      allocated: 0,
      peak: 0,
      released: 0,
      pools: new Map(),
    };
  }

  // Optimization suggestions
  getOptimizationSuggestions(): string[] {
    const report = this.getPerformanceReport();
    const suggestions: string[] = [];

    if (report.averageExecutionTime > this.settings.performanceThreshold * 0.8) {
      suggestions.push('Consider enabling more aggressive memoization');
    }

    if (report.memoryPeakUsage > PerformanceManager.MEMORY_THRESHOLD) {
      suggestions.push('Memory usage is high, consider increasing object pooling');
    }

    if (report.errorRate > 0.05) {
      suggestions.push('High error rate detected, review input validation');
    }

    if (report.slowOperations.length > report.totalOperations * 0.1) {
      suggestions.push('Many slow operations detected, review algorithms');
    }

    if (this.memoCache.size >= this.settings.memoizationCacheSize * 0.9) {
      suggestions.push('Memoization cache is nearly full, consider increasing size');
    }

    return suggestions;
  }

  // Adaptive performance tuning
  adaptSettings(): void {
    const report = this.getPerformanceReport(60000); // Last minute

    // Adaptive memoization
    if (report.averageExecutionTime > this.settings.performanceThreshold) {
      this.settings = {
        ...this.settings,
        memoizationCacheSize: Math.min(this.settings.memoizationCacheSize * 1.2, 1000),
      };
    }

    // Adaptive pooling
    if (report.memoryPeakUsage > PerformanceManager.MEMORY_THRESHOLD * 0.8) {
      Object.keys(this.settings.poolSizes).forEach(poolName => {
        const poolSize = this.settings.poolSizes[poolName];
        if (poolSize) {
          this.settings.poolSizes[poolName] = Math.max(
            poolSize * 0.8,
            10
          );
        }
      });
    }
  }

  private recordMetric(metric: PerformanceMetrics): void {
    this.metrics.push(metric);

    // Update memory profile
    this.memoryProfile = {
      ...this.memoryProfile,
      allocated: this.memoryProfile.allocated + metric.memoryUsage,
      peak: Math.max(this.memoryProfile.peak, this.memoryProfile.allocated + metric.memoryUsage),
    };

    // Cleanup old metrics
    if (this.metrics.length > PerformanceManager.MAX_METRICS_HISTORY) {
      this.metrics.shift();
    }
  }

  private initializeObjectPools(): void {
    Object.keys(this.settings.poolSizes).forEach(poolName => {
      this.objectPools.set(poolName, []);
    });
  }

  private estimateMemoryUsage(): number {
    // Simplified memory estimation
    // In a real implementation, you might use performance.measureUserAgentSpecificMemory()
    // or track allocations more precisely
    return this.memoryProfile.allocated;
  }

  private generateStateHash(state: CubeState): string {
    // Simple hash for memoization keys
    const colorString = state.faces.map(f => f.colors.join('')).join('');
    let hash = 0;
    for (let i = 0; i < colorString.length; i++) {
      const char = colorString.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return hash.toString(16);
  }

  // Garbage collection assistance
  cleanup(): void {
    // Clear memoization cache
    this.memoCache.clear();
    
    // Return all pooled objects
    this.objectPools.forEach(pool => pool.length = 0);
    
    // Update memory profile
    this.memoryProfile = {
      ...this.memoryProfile,
      released: this.memoryProfile.allocated,
      allocated: 0,
    };
  }

  // Monitor frame rate performance
  trackFrameRate(targetFPS: number = 60): {
    currentFPS: number;
    averageFPS: number;
    droppedFrames: number;
  } {
    const targetFrameTime = 1000 / targetFPS;
    const recentMetrics = this.metrics.slice(-60); // Last 60 operations
    
    const frameTimes = recentMetrics.map(m => m.executionTime);
    const droppedFrames = frameTimes.filter(t => t > targetFrameTime).length;
    
    const averageFrameTime = frameTimes.length > 0 ? 
      frameTimes.reduce((a, b) => a + b, 0) / frameTimes.length : 
      targetFrameTime;
    
    return {
      currentFPS: 1000 / (recentMetrics[recentMetrics.length - 1]?.executionTime || targetFrameTime),
      averageFPS: 1000 / averageFrameTime,
      droppedFrames,
    };
  }
}