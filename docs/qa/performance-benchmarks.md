# Performance Benchmarks - Rubik's Cube Project

## Overview

This document defines comprehensive performance benchmarking procedures, targets, and monitoring strategies for the Rubik's Cube 3D application. Our performance-first approach ensures optimal user experience across all devices and browsers.

## Performance Targets

### 1. Core Performance Metrics

| Metric | Desktop Target | Mobile Target | Measurement Method |
|--------|---------------|---------------|-------------------|
| **Frame Rate** | 60fps sustained | 30fps minimum | `performance.now()` + `requestAnimationFrame` |
| **Initial Load** | <2 seconds | <3 seconds | Lighthouse, WebPageTest |
| **Memory Usage** | <100MB | <75MB | Chrome DevTools, `performance.memory` |
| **Interaction Latency** | <100ms | <150ms | Custom timing hooks |
| **Animation Smoothness** | 0 dropped frames | <5% dropped frames | Frame timing API |

### 2. 3D Rendering Performance

```typescript
// 3D performance benchmarking interface
interface ThreeDPerformanceMetrics {
  renderTime: {
    averageFrameTime: number; // milliseconds
    worstCaseFrameTime: number;
    frameTimeVariability: number;
    target: 16.67; // 60fps = 16.67ms per frame
  };
  
  geometryComplexity: {
    triangleCount: number;
    drawCalls: number;
    textureMemory: number; // bytes
    bufferMemory: number; // bytes
  };
  
  interactionResponsiveness: {
    mouseToHighlight: number; // ms
    touchToRotation: number; // ms
    gestureRecognition: number; // ms
    cameraMovement: number; // ms
  };
}
```

### 3. Component-Specific Targets

#### Cube Engine Performance
```typescript
const cubeEngineTargets = {
  stateTransition: {
    target: '<1ms',
    measurement: 'StateManager.rotateFace() execution time',
    criticalPath: true
  },
  
  moveValidation: {
    target: '<0.5ms', 
    measurement: 'MoveValidator.isValidMove() execution time',
    criticalPath: true
  },
  
  stateRecovery: {
    target: '<5ms',
    measurement: 'StateManager.recoverCorruptedState() execution time',
    criticalPath: false
  }
};
```

#### Three.js Renderer Performance
```typescript
const rendererTargets = {
  faceRotation: {
    target: '300ms animation duration',
    measurement: 'FaceRotationAnimator.rotateFacePieces() completion',
    smoothness: 'No frame drops during animation'
  },
  
  faceHighlighting: {
    target: '<50ms response time',
    measurement: 'Mouse hover to visual feedback',
    consistency: 'No flickering or lag'
  },
  
  sceneComplexity: {
    target: '<1000 draw calls per frame',
    measurement: 'WebGL draw call count',
    optimization: 'Geometry instancing where possible'
  }
};
```

## Benchmarking Infrastructure

### 1. Automated Performance Testing

```typescript
// Performance testing framework
class PerformanceBenchmarkSuite {
  private metrics: PerformanceMetrics[] = [];
  private scenarios: BenchmarkScenario[] = [];
  
  async runBenchmarkSuite(): Promise<BenchmarkReport> {
    const report: BenchmarkReport = {
      timestamp: new Date().toISOString(),
      environment: this.captureEnvironment(),
      results: []
    };
    
    for (const scenario of this.scenarios) {
      const result = await this.executeBenchmark(scenario);
      report.results.push(result);
      
      if (!this.meetsPerformanceThreshold(result)) {
        report.failures.push({
          scenario: scenario.name,
          expected: scenario.target,
          actual: result.value,
          deviation: this.calculateDeviation(scenario.target, result.value)
        });
      }
    }
    
    return report;
  }
  
  private async executeBenchmark(scenario: BenchmarkScenario): Promise<BenchmarkResult> {
    // Warm up phase
    await this.warmUp(scenario);
    
    // Measurement phase
    const measurements: number[] = [];
    for (let i = 0; i < scenario.iterations; i++) {
      const startTime = performance.now();
      await scenario.execute();
      const endTime = performance.now();
      measurements.push(endTime - startTime);
    }
    
    return {
      scenario: scenario.name,
      measurements,
      average: this.calculateAverage(measurements),
      median: this.calculateMedian(measurements),
      p95: this.calculatePercentile(measurements, 95),
      p99: this.calculatePercentile(measurements, 99)
    };
  }
}
```

### 2. Real-World Performance Scenarios

```typescript
// Benchmark scenario definitions
const performanceScenarios: BenchmarkScenario[] = [
  {
    name: 'rapid-face-rotations',
    description: 'Simulate rapid consecutive face rotations',
    target: '60fps maintained during 10 consecutive rotations',
    iterations: 50,
    execute: async () => {
      for (let i = 0; i < 10; i++) {
        await cubeRenderer.rotateFace(getRandomFace(), getRandomDirection());
      }
    }
  },
  
  {
    name: 'mobile-touch-gestures',
    description: 'Complex touch gesture sequence on mobile viewport',
    target: '30fps maintained during gesture recognition',
    iterations: 30,
    execute: async () => {
      await simulateTouchSequence([
        { type: 'touchstart', x: 150, y: 200 },
        { type: 'touchmove', x: 200, y: 180 },
        { type: 'touchend', x: 250, y: 160 }
      ]);
    }
  },
  
  {
    name: 'memory-stress-test',
    description: 'Extended session with cube state tracking',
    target: 'Memory usage stable under 100MB after 1000 moves',
    iterations: 5,
    execute: async () => {
      for (let i = 0; i < 1000; i++) {
        await performRandomMove();
        if (i % 100 === 0) {
          forceGarbageCollection();
          measureMemoryUsage();
        }
      }
    }
  },
  
  {
    name: 'camera-orbit-performance',
    description: 'Smooth camera orbiting during cube rotation',
    target: 'No frame drops during simultaneous camera and cube movement',
    iterations: 25,
    execute: async () => {
      const cameraAnimation = orbitCamera(360, 2000); // 360 degrees in 2 seconds
      const cubeAnimation = rotateFace('front', 'clockwise');
      await Promise.all([cameraAnimation, cubeAnimation]);
    }
  }
];
```

### 3. Performance Monitoring Hooks

```typescript
// Custom React hooks for performance monitoring
const usePerformanceMonitoring = () => {
  const [metrics, setMetrics] = useState<PerformanceMetrics>();
  
  useEffect(() => {
    const monitor = new PerformanceMonitor({
      sampleRate: 1000, // Sample every 1000ms
      thresholds: {
        frameTime: 16.67, // 60fps
        memoryUsage: 100 * 1024 * 1024, // 100MB
        interactionLatency: 100 // 100ms
      }
    });
    
    monitor.onThresholdExceeded = (metric, value, threshold) => {
      console.warn(`Performance threshold exceeded: ${metric} = ${value} (threshold: ${threshold})`);
      // Trigger quality adaptation if needed
      triggerQualityAdaptation(metric, value);
    };
    
    monitor.start();
    return () => monitor.stop();
  }, []);
  
  return metrics;
};

// Frame rate monitoring
const useFrameRateMonitor = () => {
  const [frameRate, setFrameRate] = useState(60);
  const frameCount = useRef(0);
  const lastTime = useRef(performance.now());
  
  useEffect(() => {
    const measureFrameRate = () => {
      frameCount.current++;
      const now = performance.now();
      
      if (now - lastTime.current >= 1000) {
        const fps = (frameCount.current * 1000) / (now - lastTime.current);
        setFrameRate(fps);
        frameCount.current = 0;
        lastTime.current = now;
      }
      
      requestAnimationFrame(measureFrameRate);
    };
    
    requestAnimationFrame(measureFrameRate);
  }, []);
  
  return frameRate;
};
```

## Performance Testing Automation

### 1. CI/CD Performance Pipeline

```yaml
# GitHub Actions performance testing
name: Performance Benchmarks
on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]
  schedule:
    - cron: '0 2 * * *' # Daily at 2 AM

jobs:
  performance-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Build application
        run: npm run build
      
      - name: Install Playwright browsers
        run: npx playwright install --with-deps
      
      - name: Run Lighthouse performance tests
        uses: treosh/lighthouse-ci-action@v10
        with:
          configPath: '.lighthouserc.json'
          temporaryPublicStorage: true
          uploadArtifacts: true
      
      - name: Run custom performance benchmarks
        run: npm run test:performance
      
      - name: Generate performance report
        run: npm run performance:report
      
      - name: Upload performance artifacts
        uses: actions/upload-artifact@v3
        with:
          name: performance-results
          path: |
            lighthouse-results/
            performance-reports/
            benchmark-results/
```

### 2. Lighthouse Configuration

```json
// .lighthouserc.json
{
  "ci": {
    "collect": {
      "url": ["http://localhost:3000"],
      "numberOfRuns": 5,
      "settings": {
        "preset": "desktop",
        "chromeFlags": "--no-sandbox --disable-dev-shm-usage"
      }
    },
    "assert": {
      "assertions": {
        "categories:performance": ["error", {"minScore": 0.9}],
        "categories:accessibility": ["error", {"minScore": 0.9}],
        "categories:best-practices": ["error", {"minScore": 0.9}],
        "categories:seo": ["error", {"minScore": 0.9}],
        "first-contentful-paint": ["error", {"maxNumericValue": 2000}],
        "interactive": ["error", {"maxNumericValue": 3000}],
        "speed-index": ["error", {"maxNumericValue": 2500}]
      }
    },
    "upload": {
      "target": "temporary-public-storage"
    }
  }
}
```

### 3. Load Testing with Artillery

```yaml
# artillery-load-test.yml
config:
  target: 'http://localhost:3000'
  phases:
    - duration: 60
      arrivalRate: 10
      name: "Warm up phase"
    - duration: 300
      arrivalRate: 50
      name: "Sustained load"
    - duration: 120
      arrivalRate: 100
      name: "Peak load"
  processor: "./load-test-processor.js"

scenarios:
  - name: "Cube interaction simulation"
    weight: 80
    flow:
      - get:
          url: "/"
      - think: 2
      - post:
          url: "/api/moves"
          json:
            face: "{{ $randomString() }}"
            direction: "clockwise"
      - think: 1
      
  - name: "Mobile touch simulation"
    weight: 20
    flow:
      - get:
          url: "/"
          headers:
            User-Agent: "Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)"
      - think: 3
      - post:
          url: "/api/gestures"
          json:
            type: "swipe"
            coordinates: [100, 200, 150, 180]
```

## Performance Regression Detection

### 1. Automated Regression Detection

```typescript
// Performance regression detection system
class PerformanceRegressionDetector {
  private baseline: PerformanceBenchmark;
  private threshold: RegressionThreshold = {
    frameRate: 0.05, // 5% degradation threshold
    loadTime: 0.10,  // 10% degradation threshold
    memoryUsage: 0.15 // 15% increase threshold
  };
  
  detectRegressions(current: PerformanceBenchmark): RegressionReport {
    const regressions: PerformanceRegression[] = [];
    
    // Frame rate regression check
    if (this.isRegression(this.baseline.frameRate, current.frameRate, this.threshold.frameRate)) {
      regressions.push({
        metric: 'frameRate',
        baseline: this.baseline.frameRate,
        current: current.frameRate,
        degradation: this.calculateDegradation(this.baseline.frameRate, current.frameRate),
        severity: this.calculateSeverity('frameRate', current.frameRate)
      });
    }
    
    return {
      hasRegressions: regressions.length > 0,
      regressions,
      recommendation: this.generateRecommendations(regressions)
    };
  }
  
  private calculateSeverity(metric: string, value: number): 'critical' | 'high' | 'medium' | 'low' {
    const severityThresholds = {
      frameRate: { critical: 30, high: 45, medium: 55 },
      loadTime: { critical: 5000, high: 4000, medium: 3000 },
      memoryUsage: { critical: 150, high: 125, medium: 110 } // MB
    };
    
    const thresholds = severityThresholds[metric];
    if (value <= thresholds.critical) return 'critical';
    if (value <= thresholds.high) return 'high';
    if (value <= thresholds.medium) return 'medium';
    return 'low';
  }
}
```

### 2. Performance Budget Enforcement

```typescript
// Performance budget configuration
const performanceBudget = {
  javascript: '800KB', // Total JS bundle size
  css: '50KB',         // Total CSS size
  images: '200KB',     // Total image assets
  fonts: '100KB',      // Total font assets
  
  metrics: {
    firstContentfulPaint: 1500,     // ms
    largestContentfulPaint: 2500,   // ms
    firstInputDelay: 100,           // ms
    cumulativeLayoutShift: 0.1,     // score
    timeToInteractive: 3000         // ms
  },
  
  threeJS: {
    triangles: 50000,               // Max triangles per frame
    drawCalls: 100,                 // Max draw calls per frame
    textureMemory: '50MB',          // Max texture memory
    geometryMemory: '25MB'          // Max geometry memory
  }
};

// Budget validation in CI
const validatePerformanceBudget = (metrics: PerformanceMetrics): BudgetValidationResult => {
  const violations: BudgetViolation[] = [];
  
  Object.entries(performanceBudget.metrics).forEach(([metric, budget]) => {
    if (metrics[metric] > budget) {
      violations.push({
        metric,
        budget,
        actual: metrics[metric],
        severity: calculateBudgetViolationSeverity(metric, metrics[metric], budget)
      });
    }
  });
  
  return {
    passed: violations.length === 0,
    violations,
    recommendation: generateBudgetRecommendations(violations)
  };
};
```

## Device-Specific Performance Testing

### 1. Mobile Performance Validation

```typescript
// Mobile performance testing configuration
const mobilePerformanceTests = {
  devices: [
    {
      name: 'iPhone 12',
      viewport: { width: 390, height: 844 },
      pixelRatio: 3,
      userAgent: 'iPhone 12 Safari',
      expectedPerformance: {
        frameRate: 30,
        loadTime: 3000,
        memoryLimit: 75 * 1024 * 1024 // 75MB
      }
    },
    {
      name: 'Samsung Galaxy S21',
      viewport: { width: 384, height: 854 },
      pixelRatio: 2.75,
      userAgent: 'Galaxy S21 Chrome',
      expectedPerformance: {
        frameRate: 45,
        loadTime: 2500,
        memoryLimit: 100 * 1024 * 1024 // 100MB
      }
    },
    {
      name: 'iPad Air',
      viewport: { width: 820, height: 1180 },
      pixelRatio: 2,
      userAgent: 'iPad Safari',
      expectedPerformance: {
        frameRate: 60,
        loadTime: 2000,
        memoryLimit: 150 * 1024 * 1024 // 150MB
      }
    }
  ],
  
  testScenarios: [
    'Complex cube rotations under touch input',
    'Extended session with memory monitoring',
    'Background app switching simulation',
    'Low battery mode performance impact',
    'Thermal throttling simulation'
  ]
};
```

### 2. Browser Performance Matrix

```typescript
// Cross-browser performance testing
const browserPerformanceMatrix = {
  browsers: [
    { name: 'Chrome', versions: ['90+', '100+', '110+'], engine: 'Blink' },
    { name: 'Firefox', versions: ['88+', '95+', '105+'], engine: 'Gecko' },
    { name: 'Safari', versions: ['14+', '15+', '16+'], engine: 'WebKit' },
    { name: 'Edge', versions: ['90+', '100+', '110+'], engine: 'Blink' }
  ],
  
  performanceVariations: {
    webGL: 'Safari: -10% performance, Firefox: -5% performance',
    touchEvents: 'Safari iOS: +20% accuracy, Android Chrome: standard',
    memoryManagement: 'Firefox: more aggressive GC, Chrome: predictable patterns',
    animationSmootness: 'Safari: CSS transforms preferred, Chrome: JavaScript animations optimal'
  }
};
```

## Performance Optimization Tracking

### 1. Optimization Impact Measurement

```typescript
// Performance optimization tracking system
interface OptimizationImpact {
  optimization: string;
  description: string;
  beforeMetrics: PerformanceMetrics;
  afterMetrics: PerformanceMetrics;
  improvement: {
    frameRate: number; // percentage improvement
    loadTime: number;
    memoryUsage: number;
    interactionLatency: number;
  };
  tradeoffs: string[];
  rollbackConditions: string[];
}

const optimizationHistory: OptimizationImpact[] = [
  {
    optimization: 'three-js-geometry-instancing',
    description: 'Implemented geometry instancing for cube pieces to reduce draw calls',
    beforeMetrics: { frameRate: 45, drawCalls: 150, memoryUsage: 85 },
    afterMetrics: { frameRate: 58, drawCalls: 50, memoryUsage: 78 },
    improvement: {
      frameRate: 28.9, // (58-45)/45 * 100
      loadTime: 0,
      memoryUsage: 8.2,
      interactionLatency: 15.3
    },
    tradeoffs: ['Increased initial setup complexity', 'Less flexibility for individual piece materials'],
    rollbackConditions: ['Memory usage exceeds 100MB', 'Compatibility issues with Safari < 14']
  }
];
```

This comprehensive performance benchmarking framework ensures the Rubik's Cube application maintains optimal performance across all target devices and usage scenarios while providing clear feedback for optimization efforts.