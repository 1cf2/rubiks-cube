# Performance Optimization Guide

## Overview

This guide covers comprehensive performance optimization strategies for the Rubik's cube application, targeting 60fps desktop and 30fps mobile performance with minimal memory footprint.

## Performance Targets

### Desktop Performance Goals
- **Frame Rate**: 60fps sustained
- **Memory Usage**: < 100MB total
- **Load Time**: < 2 seconds initial
- **Interaction Latency**: < 16ms response time

### Mobile Performance Goals
- **Frame Rate**: 30fps minimum
- **Memory Usage**: < 50MB total
- **Load Time**: < 3 seconds on 3G
- **Battery Impact**: Minimal drain

## Rendering Optimizations

### 1. Three.js Performance Optimizations

#### Geometry Optimization

```typescript
class OptimizedGeometryManager {
  private geometryPool: Map<string, THREE.BufferGeometry[]> = new Map();
  private instancedGeometries: Map<string, THREE.InstancedBufferGeometry> = new Map();
  
  /**
   * Use instanced rendering for cube pieces
   * Reduces draw calls from 27 to 1
   */
  createInstancedCubeGeometry(count: number = 27): THREE.InstancedBufferGeometry {
    const baseGeometry = new THREE.BoxGeometry(0.95, 0.95, 0.95);
    const instancedGeometry = new THREE.InstancedBufferGeometry();
    
    // Copy base geometry attributes
    instancedGeometry.setIndex(baseGeometry.getIndex());
    instancedGeometry.attributes = baseGeometry.attributes;
    
    // Create instance matrices
    const matrices = new Float32Array(count * 16);
    const colors = new Float32Array(count * 3);
    
    // Position instances in 3x3x3 grid
    let index = 0;
    for (let x = -1; x <= 1; x++) {
      for (let y = -1; y <= 1; y++) {
        for (let z = -1; z <= 1; z++) {
          const matrix = new THREE.Matrix4();
          matrix.setPosition(x, y, z);
          matrix.toArray(matrices, index * 16);
          
          // Set piece color
          const color = this.getPieceColor(x, y, z);
          colors[index * 3] = color.r;
          colors[index * 3 + 1] = color.g;
          colors[index * 3 + 2] = color.b;
          
          index++;
        }
      }
    }
    
    instancedGeometry.setAttribute('instanceMatrix', 
      new THREE.InstancedBufferAttribute(matrices, 16));
    instancedGeometry.setAttribute('instanceColor', 
      new THREE.InstancedBufferAttribute(colors, 3));
    
    return instancedGeometry;
  }
  
  /**
   * Geometry pooling to reduce GC pressure
   */
  acquireGeometry(type: string): THREE.BufferGeometry {
    const pool = this.geometryPool.get(type) || [];
    if (pool.length > 0) {
      return pool.pop()!;
    }
    return this.createGeometry(type);
  }
  
  releaseGeometry(type: string, geometry: THREE.BufferGeometry): void {
    const pool = this.geometryPool.get(type) || [];
    if (pool.length < 10) { // Maximum pool size
      pool.push(geometry);
      this.geometryPool.set(type, pool);
    } else {
      geometry.dispose();
    }
  }
}
```

#### Material Optimization

```typescript
class OptimizedMaterialManager {
  private materials: Map<string, THREE.Material> = new Map();
  private sharedUniforms: { [key: string]: THREE.IUniform } = {};
  
  constructor() {
    this.initializeSharedUniforms();
  }
  
  private initializeSharedUniforms(): void {
    this.sharedUniforms = {
      time: { value: 0 },
      lightPosition: { value: new THREE.Vector3(5, 5, 5) },
      ambientStrength: { value: 0.3 },
      specularStrength: { value: 0.8 }
    };
  }
  
  /**
   * Create optimized cube material with custom shaders
   * Reduces overdraw and improves performance
   */
  createCubeMaterial(color: THREE.Color): THREE.ShaderMaterial {
    const cacheKey = `cube_${color.getHexString()}`;
    
    if (this.materials.has(cacheKey)) {
      return this.materials.get(cacheKey) as THREE.ShaderMaterial;
    }
    
    const material = new THREE.ShaderMaterial({
      uniforms: {
        ...this.sharedUniforms,
        diffuseColor: { value: color },
        opacity: { value: 1.0 }
      },
      vertexShader: `
        attribute vec3 instanceColor;
        attribute mat4 instanceMatrix;
        
        varying vec3 vColor;
        varying vec3 vNormal;
        varying vec3 vPosition;
        
        void main() {
          vColor = instanceColor;
          vNormal = normalize(normalMatrix * normal);
          
          vec4 instancePosition = instanceMatrix * vec4(position, 1.0);
          vPosition = instancePosition.xyz;
          
          gl_Position = projectionMatrix * modelViewMatrix * instancePosition;
        }
      `,
      fragmentShader: `
        uniform vec3 lightPosition;
        uniform float ambientStrength;
        uniform float specularStrength;
        
        varying vec3 vColor;
        varying vec3 vNormal;
        varying vec3 vPosition;
        
        void main() {
          // Optimized Phong lighting
          vec3 lightDir = normalize(lightPosition - vPosition);
          float diff = max(dot(vNormal, lightDir), 0.0);
          
          vec3 ambient = ambientStrength * vColor;
          vec3 diffuse = diff * vColor;
          
          // Simplified specular (performance optimization)
          vec3 viewDir = normalize(-vPosition);
          vec3 reflectDir = reflect(-lightDir, vNormal);
          float spec = pow(max(dot(viewDir, reflectDir), 0.0), 32.0);
          vec3 specular = specularStrength * spec * vec3(1.0);
          
          gl_FragColor = vec4(ambient + diffuse + specular, 1.0);
        }
      `
    });
    
    this.materials.set(cacheKey, material);
    return material;
  }
  
  /**
   * Update shared uniforms once per frame
   */
  updateUniforms(deltaTime: number): void {
    this.sharedUniforms.time.value += deltaTime;
  }
}
```

### 2. Culling and LOD System

```typescript
class CullingManager {
  private frustum = new THREE.Frustum();
  private cameraMatrix = new THREE.Matrix4();
  
  /**
   * Frustum culling for cube pieces
   * Only render visible pieces
   */
  cullObjects(camera: THREE.Camera, objects: THREE.Object3D[]): THREE.Object3D[] {
    this.cameraMatrix.multiplyMatrices(
      camera.projectionMatrix,
      camera.matrixWorldInverse
    );
    this.frustum.setFromProjectionMatrix(this.cameraMatrix);
    
    return objects.filter(obj => {
      obj.updateMatrixWorld();
      return this.frustum.intersectsObject(obj);
    });
  }
  
  /**
   * Distance-based LOD for mobile devices
   */
  updateLOD(camera: THREE.Camera, cubeCenter: THREE.Vector3, distance: number): number {
    const cameraDistance = camera.position.distanceTo(cubeCenter);
    
    if (cameraDistance < distance * 0.5) {
      return 2; // High detail
    } else if (cameraDistance < distance) {
      return 1; // Medium detail
    } else {
      return 0; // Low detail
    }
  }
}
```

## Memory Management

### 1. Texture Management

```typescript
class TextureManager {
  private textureCache: Map<string, THREE.Texture> = new Map();
  private textureAtlas: THREE.Texture | null = null;
  private maxTextureSize = 1024;
  
  constructor() {
    this.createTextureAtlas();
  }
  
  /**
   * Create texture atlas to reduce texture switches
   * Combines all face colors into single texture
   */
  private createTextureAtlas(): void {
    const canvas = document.createElement('canvas');
    const size = this.maxTextureSize;
    canvas.width = canvas.height = size;
    const ctx = canvas.getContext('2d')!;
    
    const colors = ['#ffffff', '#ffff00', '#ff0000', '#ffa500', '#00ff00', '#0000ff'];
    const cellSize = size / 3; // 3x2 grid
    
    colors.forEach((color, index) => {
      const x = (index % 3) * cellSize;
      const y = Math.floor(index / 3) * cellSize;
      
      ctx.fillStyle = color;
      ctx.fillRect(x, y, cellSize, cellSize);
      
      // Add border for visual separation
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 2;
      ctx.strokeRect(x, y, cellSize, cellSize);
    });
    
    this.textureAtlas = new THREE.CanvasTexture(canvas);
    this.textureAtlas.generateMipmaps = false;
    this.textureAtlas.minFilter = THREE.LinearFilter;
  }
  
  /**
   * Get UV coordinates for specific face color
   */
  getUVMapping(faceIndex: number): THREE.Vector4 {
    const cellSize = 1 / 3;
    const x = (faceIndex % 3) * cellSize;
    const y = Math.floor(faceIndex / 3) * cellSize;
    
    return new THREE.Vector4(x, y, cellSize, cellSize);
  }
  
  /**
   * Dispose unused textures to free memory
   */
  cleanup(): void {
    this.textureCache.forEach(texture => {
      if (texture.userData.lastUsed < Date.now() - 60000) { // 1 minute
        texture.dispose();
        this.textureCache.delete(texture.userData.key);
      }
    });
  }
}
```

### 2. Object Pooling System

```typescript
class ObjectPool<T> {
  private pool: T[] = [];
  private createFn: () => T;
  private resetFn: (obj: T) => void;
  private maxSize: number;
  
  constructor(createFn: () => T, resetFn: (obj: T) => void, maxSize: number = 100) {
    this.createFn = createFn;
    this.resetFn = resetFn;
    this.maxSize = maxSize;
  }
  
  acquire(): T {
    if (this.pool.length > 0) {
      const obj = this.pool.pop()!;
      this.resetFn(obj);
      return obj;
    }
    return this.createFn();
  }
  
  release(obj: T): void {
    if (this.pool.length < this.maxSize) {
      this.pool.push(obj);
    }
  }
  
  preWarm(count: number): void {
    for (let i = 0; i < count; i++) {
      this.pool.push(this.createFn());
    }
  }
}

// Usage for animation objects
class AnimationObjectPool {
  private vector3Pool = new ObjectPool(
    () => new THREE.Vector3(),
    (v) => v.set(0, 0, 0),
    50
  );
  
  private quaternionPool = new ObjectPool(
    () => new THREE.Quaternion(),
    (q) => q.set(0, 0, 0, 1),
    20
  );
  
  acquireVector3(): THREE.Vector3 {
    return this.vector3Pool.acquire();
  }
  
  releaseVector3(vector: THREE.Vector3): void {
    this.vector3Pool.release(vector);
  }
}
```

## Animation Optimization

### 1. Efficient Animation System

```typescript
class OptimizedAnimationManager {
  private activeAnimations: Set<Animation> = new Set();
  private animationRequestId: number | null = null;
  private lastFrameTime = 0;
  private targetFPS = 60;
  private frameTime = 1000 / this.targetFPS;
  
  /**
   * Frame-rate adaptive animation system
   * Maintains consistent animation speed across different frame rates
   */
  private animate = (currentTime: number): void => {
    const deltaTime = currentTime - this.lastFrameTime;
    
    if (deltaTime >= this.frameTime) {
      this.lastFrameTime = currentTime - (deltaTime % this.frameTime);
      
      // Update animations with normalized delta time
      const normalizedDelta = deltaTime / 16.67; // Normalize to 60fps
      this.updateAnimations(normalizedDelta);
    }
    
    if (this.activeAnimations.size > 0) {
      this.animationRequestId = requestAnimationFrame(this.animate);
    } else {
      this.animationRequestId = null;
    }
  };
  
  /**
   * Batch animation updates to reduce computation
   */
  private updateAnimations(deltaTime: number): void {
    const completedAnimations: Animation[] = [];
    
    this.activeAnimations.forEach(animation => {
      if (animation.update(deltaTime)) {
        completedAnimations.push(animation);
      }
    });
    
    // Remove completed animations
    completedAnimations.forEach(animation => {
      this.activeAnimations.delete(animation);
      animation.onComplete();
    });
  }
  
  /**
   * Optimized face rotation with quaternion interpolation
   */
  async rotateFace(pieces: THREE.Mesh[], axis: THREE.Vector3, angle: number, duration: number): Promise<void> {
    return new Promise(resolve => {
      const startQuaternions = pieces.map(piece => piece.quaternion.clone());
      const targetQuaternions = startQuaternions.map(q => {
        const rotationQuaternion = new THREE.Quaternion().setFromAxisAngle(axis, angle);
        return q.multiplyQuaternions(rotationQuaternion, q);
      });
      
      const animation = new FaceRotationAnimation(
        pieces,
        startQuaternions,
        targetQuaternions,
        duration,
        resolve
      );
      
      this.startAnimation(animation);
    });
  }
}

class FaceRotationAnimation implements Animation {
  private progress = 0;
  private pieces: THREE.Mesh[];
  private startQuaternions: THREE.Quaternion[];
  private targetQuaternions: THREE.Quaternion[];
  private duration: number;
  private onCompleteCallback: () => void;
  
  constructor(
    pieces: THREE.Mesh[],
    startQuaternions: THREE.Quaternion[],
    targetQuaternions: THREE.Quaternion[],
    duration: number,
    onComplete: () => void
  ) {
    this.pieces = pieces;
    this.startQuaternions = startQuaternions;
    this.targetQuaternions = targetQuaternions;
    this.duration = duration;
    this.onCompleteCallback = onComplete;
  }
  
  update(deltaTime: number): boolean {
    this.progress += (deltaTime / this.duration);
    
    if (this.progress >= 1) {
      this.progress = 1;
    }
    
    // Use easing function for smooth animation
    const easedProgress = this.easeOutCubic(this.progress);
    
    // Update piece rotations
    this.pieces.forEach((piece, index) => {
      piece.quaternion.slerpQuaternions(
        this.startQuaternions[index],
        this.targetQuaternions[index],
        easedProgress
      );
    });
    
    return this.progress >= 1;
  }
  
  private easeOutCubic(t: number): number {
    return 1 - Math.pow(1 - t, 3);
  }
  
  onComplete(): void {
    this.onCompleteCallback();
  }
}
```

## CPU Performance Optimization

### 1. Algorithm Optimization

```typescript
class OptimizedStateManager {
  private stateCache: LRUCache<string, CubeState> = new LRUCache(100);
  private moveValidationCache: Map<string, boolean> = new Map();
  
  /**
   * Fast state hashing for caching
   */
  private hashState(state: CubeState): string {
    // Use faster hashing algorithm
    let hash = 0;
    const str = JSON.stringify(state);
    
    if (str.length === 0) return hash.toString();
    
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    
    return hash.toString();
  }
  
  /**
   * Optimized move application with memoization
   */
  applyMove(state: CubeState, move: Move): CubeOperationResult<CubeState> {
    const stateHash = this.hashState(state);
    const moveKey = `${stateHash}_${move.face}_${move.rotation}`;
    
    // Check cache first
    const cached = this.stateCache.get(moveKey);
    if (cached) {
      return { success: true, data: cached, performance: { executionTime: 0.1 } };
    }
    
    const startTime = performance.now();
    
    // Apply move
    const newState = this.performMove(state, move);
    const executionTime = performance.now() - startTime;
    
    // Cache result if execution was fast (good state)
    if (executionTime < 10) {
      this.stateCache.set(moveKey, newState);
    }
    
    return {
      success: true,
      data: newState,
      performance: { executionTime }
    };
  }
  
  /**
   * Batch move validation
   */
  validateMoveSequence(moves: Move[]): ValidationResult[] {
    return moves.map(move => {
      const moveKey = `${move.face}_${move.rotation}`;
      
      if (this.moveValidationCache.has(moveKey)) {
        return { isValid: this.moveValidationCache.get(moveKey)!, errors: [] };
      }
      
      const result = this.validateSingleMove(move);
      this.moveValidationCache.set(moveKey, result.isValid);
      
      return result;
    });
  }
}
```

### 2. Web Worker Integration

```typescript
// main-thread.ts
class WorkerManager {
  private cubeWorker: Worker;
  private pendingOperations: Map<string, (result: any) => void> = new Map();
  
  constructor() {
    this.cubeWorker = new Worker('/workers/cube-worker.js');
    this.cubeWorker.onmessage = this.handleWorkerMessage.bind(this);
  }
  
  /**
   * Offload heavy computations to web worker
   */
  async solveScramble(scrambledState: CubeState): Promise<Move[]> {
    return new Promise(resolve => {
      const operationId = this.generateOperationId();
      this.pendingOperations.set(operationId, resolve);
      
      this.cubeWorker.postMessage({
        type: 'SOLVE_CUBE',
        operationId,
        state: scrambledState
      });
    });
  }
  
  private handleWorkerMessage(event: MessageEvent): void {
    const { operationId, result } = event.data;
    const callback = this.pendingOperations.get(operationId);
    
    if (callback) {
      callback(result);
      this.pendingOperations.delete(operationId);
    }
  }
}

// cube-worker.ts
class CubeWorker {
  private solver = new CFOPSolver();
  
  constructor() {
    self.onmessage = this.handleMessage.bind(this);
  }
  
  private handleMessage(event: MessageEvent): void {
    const { type, operationId, state } = event.data;
    
    switch (type) {
      case 'SOLVE_CUBE':
        const solution = this.solver.solve(state);
        self.postMessage({ operationId, result: solution });
        break;
    }
  }
}
```

## Mobile Performance Optimization

### 1. Device-Specific Optimizations

```typescript
class MobileOptimizer {
  private deviceInfo: DeviceInfo;
  private qualitySettings: QualitySettings;
  
  constructor() {
    this.deviceInfo = this.detectDevice();
    this.qualitySettings = this.getOptimalQuality();
  }
  
  private detectDevice(): DeviceInfo {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl');
    
    return {
      isMobile: /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent),
      gpu: gl?.getParameter(gl.RENDERER) || 'Unknown',
      maxTextureSize: gl?.getParameter(gl.MAX_TEXTURE_SIZE) || 1024,
      cores: navigator.hardwareConcurrency || 4,
      memory: (navigator as any).deviceMemory || 4
    };
  }
  
  private getOptimalQuality(): QualitySettings {
    const { memory, cores, isMobile } = this.deviceInfo;
    
    if (isMobile && memory < 4) {
      return {
        pixelRatio: Math.min(window.devicePixelRatio * 0.75, 1.5),
        shadows: false,
        antialiasing: false,
        maxCubeResolution: 512,
        animationQuality: 'low'
      };
    } else if (isMobile) {
      return {
        pixelRatio: Math.min(window.devicePixelRatio * 0.85, 2),
        shadows: false,
        antialiasing: true,
        maxCubeResolution: 1024,
        animationQuality: 'medium'
      };
    } else {
      return {
        pixelRatio: window.devicePixelRatio,
        shadows: true,
        antialiasing: true,
        maxCubeResolution: 2048,
        animationQuality: 'high'
      };
    }
  }
  
  /**
   * Dynamic quality adjustment based on performance
   */
  adjustQualityBasedOnPerformance(fps: number): void {
    if (fps < 25) {
      // Reduce quality
      this.qualitySettings.pixelRatio *= 0.9;
      this.qualitySettings.shadows = false;
      this.qualitySettings.antialiasing = false;
    } else if (fps > 55 && fps < 60) {
      // Can increase quality slightly
      this.qualitySettings.pixelRatio = Math.min(
        this.qualitySettings.pixelRatio * 1.05,
        window.devicePixelRatio
      );
    }
  }
}
```

### 2. Battery Optimization

```typescript
class BatteryOptimizer {
  private isLowPowerMode = false;
  private lastInteractionTime = Date.now();
  private idleTimeoutId: number | null = null;
  
  constructor() {
    this.detectBatteryStatus();
    this.setupIdleDetection();
  }
  
  private async detectBatteryStatus(): Promise<void> {
    try {
      const battery = await (navigator as any).getBattery();
      
      battery.addEventListener('levelchange', () => {
        this.isLowPowerMode = battery.level < 0.2;
        this.adjustPerformanceForBattery();
      });
      
      battery.addEventListener('chargingchange', () => {
        if (!battery.charging && battery.level < 0.3) {
          this.isLowPowerMode = true;
          this.adjustPerformanceForBattery();
        }
      });
    } catch (error) {
      // Battery API not supported
      console.log('Battery API not available');
    }
  }
  
  private adjustPerformanceForBattery(): void {
    if (this.isLowPowerMode) {
      // Reduce frame rate and quality
      this.setTargetFPS(30);
      this.enablePowerSaveMode();
    } else {
      this.setTargetFPS(60);
      this.disablePowerSaveMode();
    }
  }
  
  private setupIdleDetection(): void {
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
    
    events.forEach(event => {
      document.addEventListener(event, () => {
        this.lastInteractionTime = Date.now();
        this.resetIdleTimer();
      }, true);
    });
    
    this.resetIdleTimer();
  }
  
  private resetIdleTimer(): void {
    if (this.idleTimeoutId) {
      clearTimeout(this.idleTimeoutId);
    }
    
    this.idleTimeoutId = window.setTimeout(() => {
      this.enterIdleMode();
    }, 30000); // 30 seconds of inactivity
  }
  
  private enterIdleMode(): void {
    // Reduce animation frequency when idle
    this.setTargetFPS(15);
    // Pause non-essential animations
    this.pauseIdleAnimations();
  }
}
```

## Monitoring and Profiling

### 1. Performance Monitor

```typescript
class PerformanceMonitor {
  private metrics: PerformanceMetrics = {
    fps: 0,
    renderTime: 0,
    memoryUsage: 0,
    drawCalls: 0,
    triangles: 0
  };
  
  private frameCount = 0;
  private lastTime = performance.now();
  private samples: number[] = [];
  
  update(renderer: THREE.WebGLRenderer): PerformanceMetrics {
    this.frameCount++;
    const currentTime = performance.now();
    const deltaTime = currentTime - this.lastTime;
    
    // Update FPS (averaged over 60 frames)
    this.samples.push(1000 / deltaTime);
    if (this.samples.length > 60) {
      this.samples.shift();
    }
    
    this.metrics.fps = this.samples.reduce((a, b) => a + b, 0) / this.samples.length;
    this.metrics.renderTime = deltaTime;
    this.metrics.memoryUsage = this.getMemoryUsage();
    this.metrics.drawCalls = renderer.info.render.calls;
    this.metrics.triangles = renderer.info.render.triangles;
    
    this.lastTime = currentTime;
    
    return { ...this.metrics };
  }
  
  private getMemoryUsage(): number {
    if ('memory' in performance) {
      return (performance as any).memory.usedJSHeapSize / 1048576; // MB
    }
    return 0;
  }
  
  getReport(): string {
    return `
Performance Report:
- FPS: ${this.metrics.fps.toFixed(1)}
- Render Time: ${this.metrics.renderTime.toFixed(2)}ms
- Memory: ${this.metrics.memoryUsage.toFixed(1)}MB
- Draw Calls: ${this.metrics.drawCalls}
- Triangles: ${this.metrics.triangles}
    `.trim();
  }
}
```

This comprehensive performance optimization guide ensures smooth operation across all target devices and platforms.