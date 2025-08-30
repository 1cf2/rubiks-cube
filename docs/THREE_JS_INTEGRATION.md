# Three.js Integration Patterns

## Overview

This guide covers advanced integration patterns between Three.js rendering system and the Rubik's cube application. These patterns ensure optimal performance, proper resource management, and seamless user experience.

## Architecture Patterns

### Component-Based Architecture

```typescript
// Base Three.js component interface
interface ThreeComponent {
  readonly object3D: THREE.Object3D;
  readonly isInitialized: boolean;

  initialize(scene: THREE.Scene): void;
  update(deltaTime: number): void;
  dispose(): void;
}
```

### Advanced Lighting System

The application implements a sophisticated camera-relative spotlight system that follows camera movement for consistent lighting angles throughout the user experience.

#### Camera-Relative Spotlight Configuration

```typescript
interface SpotlightConfig {
  name: string;
  relativePosition: THREE.Vector3;    // Position relative to camera
  targetOffset: THREE.Vector3;       // Target offset relative to camera direction
  intensity: number;
  distance: number;
  angle: number;                    // Spotlight cone angle
  color: number;                   // Hex color value (0xffffff for white)
  shadowMapSize: { width: number; height: number };
}

// Configuration maintains consistent lighting angles:
const spotlightConfig = [
  {
    name: 'keyLight',
    relativePosition: new THREE.Vector3(6, 8, 6),    // Front-top-right illumination
    targetOffset: new THREE.Vector3(2, 2, 2),         // Dramatic angled target
    intensity: 9.0,                                   // Very bright key light
    distance: 18,
    angle: Math.PI / 4,                               // Wide cone for coverage
    color: 0xffffff,                                 // Pure white illumination
    shadowMapSize: { width: 4096, height: 4096 }      // High-res shadows
  },
  // Fill, rim, and bounce lights configured for balanced lighting...
];
```

#### Real-Time Lighting Updates

```typescript
const updateSpotlightsRelativeToCamera = (camera: THREE.Camera, spotlights: THREE.SpotLight[]) => {
  spotlights.forEach((spotlight) => {
    // Calculate relative position based on current camera orientation
    const relativePos = spotlight.userData.relativePosition.clone();
    const rotatedPos = relativePos.clone().applyQuaternion(camera.quaternion);

    spotlight.position.copy(camera.position.clone().add(rotatedPos));

    // Update targeting for consistent illumination angles
    const targetPos = camera.position.clone()
      .add(cameraDirection.clone().multiplyScalar(8)) // Distance ahead
      .add(rotatedTarget);

    spotlight.target.position.copy(targetPos);
    spotlight.target.updateMatrixWorld();

    // Maintain shadow quality
    spotlight.shadow.needsUpdate = true;
  });
};
```

### Debug Controls Integration

The application includes comprehensive debug controls accessible through feature flags and overlay toggle:

```typescript
// Debug controls for lighting and camera adjustments
const debugControls = {
  camera: {
    position: { x: -10…10, y: -10…10, z: -10…10 },     // Real-time camera positioning
    rotation: { x: -180…180°, y: -180…180°, z: -180…180° }, // Degree-based rotation
    fov: { min: 20°, max: 120° }                         // Field of view adjustment
  },
  spotlights: {
    key: { intensity: 0…10, angle: 1…90° },
    fill: { intensity: 0…10, angle: 1…90° },
    rim: { intensity: 0…10, angle: 1…90° },
    bounce: { intensity: 0…10, angle: 1…90° }
  }
};
```

// Example implementation
class CubePiece implements ThreeComponent {
  public readonly object3D: THREE.Mesh;
  public isInitialized = false;
  
  constructor(geometry: THREE.BoxGeometry, material: THREE.Material) {
    this.object3D = new THREE.Mesh(geometry, material);
  }
  
  initialize(scene: THREE.Scene): void {
    scene.add(this.object3D);
    this.isInitialized = true;
  }
  
  update(deltaTime: number): void {
    // Update logic here
  }
  
  dispose(): void {
    this.object3D.geometry.dispose();
    if (Array.isArray(this.object3D.material)) {
      this.object3D.material.forEach(mat => mat.dispose());
    } else {
      this.object3D.material.dispose();
    }
  }
}
```

### Scene Management Pattern

```typescript
class SceneManager {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private components: Map<string, ThreeComponent> = new Map();
  
  constructor(container: HTMLElement) {
    this.initializeScene();
    this.initializeRenderer(container);
    this.setupEventListeners();
  }
  
  addComponent(id: string, component: ThreeComponent): void {
    component.initialize(this.scene);
    this.components.set(id, component);
  }
  
  removeComponent(id: string): void {
    const component = this.components.get(id);
    if (component) {
      this.scene.remove(component.object3D);
      component.dispose();
      this.components.delete(id);
    }
  }
  
  update(): void {
    const deltaTime = this.clock.getDelta();
    this.components.forEach(component => {
      component.update(deltaTime);
    });
    
    this.renderer.render(this.scene, this.camera);
  }
}
```

## State Synchronization Patterns

### Observer Pattern for State Updates

```typescript
import { EventEmitter } from 'events';
import { StateManager } from '@rubiks-cube/cube-engine';

class CubeRenderer extends EventEmitter {
  private stateManager: StateManager;
  private faceAnimator: FaceRotationAnimator;
  
  constructor(stateManager: StateManager, scene: THREE.Scene) {
    super();
    this.stateManager = stateManager;
    this.faceAnimator = new FaceRotationAnimator(scene);
    
    // Subscribe to state changes
    this.stateManager.on('stateChanged', this.handleStateChange.bind(this));
    this.stateManager.on('moveApplied', this.handleMoveApplied.bind(this));
  }
  
  private handleStateChange(newState: CubeState): void {
    // Update visual representation to match state
    this.updateCubeVisuals(newState);
  }
  
  private async handleMoveApplied(move: Move): Promise<void> {
    // Animate the move
    await this.faceAnimator.rotateFacePieces(
      move.face, 
      move.rotation, 
      this.getAnimationDuration(move)
    );
    
    // Emit completion event
    this.emit('animationComplete', move);
  }
}
```

### Bidirectional Data Flow

```typescript
class CubeInteractionManager {
  private cubeRenderer: CubeRenderer;
  private stateManager: StateManager;
  private interactionHandlers: InteractionHandler[];
  
  constructor() {
    this.setupBidirectionalSync();
  }
  
  private setupBidirectionalSync(): void {
    // Engine -> Renderer
    this.stateManager.on('moveApplied', (move) => {
      this.cubeRenderer.animateMove(move);
    });
    
    // Renderer -> Engine
    this.cubeRenderer.on('userMove', (move) => {
      const result = this.stateManager.applyMove(move);
      if (!result.success) {
        // Revert visual change
        this.cubeRenderer.revertLastAnimation();
        this.showError(result.error);
      }
    });
    
    // User Input -> Renderer
    this.interactionHandlers.forEach(handler => {
      handler.on('gestureDetected', (gesture) => {
        const move = this.translateGestureToMove(gesture);
        this.cubeRenderer.emit('userMove', move);
      });
    });
  }
}
```

## Performance Optimization Patterns

### Object Pooling for Temporary Objects

```typescript
class Vector3Pool {
  private pool: THREE.Vector3[] = [];
  private readonly maxSize: number = 100;
  
  acquire(): THREE.Vector3 {
    if (this.pool.length > 0) {
      return this.pool.pop()!.set(0, 0, 0);
    }
    return new THREE.Vector3();
  }
  
  release(vector: THREE.Vector3): void {
    if (this.pool.length < this.maxSize) {
      this.pool.push(vector);
    }
  }
}

// Usage in performance-critical code
class FaceRotationAnimator {
  private vectorPool = new Vector3Pool();
  
  private calculateRotationCenter(pieces: THREE.Mesh[]): THREE.Vector3 {
    const center = this.vectorPool.acquire();
    const temp = this.vectorPool.acquire();
    
    pieces.forEach(piece => {
      temp.copy(piece.position);
      center.add(temp);
    });
    
    center.divideScalar(pieces.length);
    
    // Return temp vector to pool
    this.vectorPool.release(temp);
    
    return center; // Caller responsible for returning to pool
  }
}
```

### Level of Detail (LOD) System

```typescript
class CubeLODManager {
  private lodLevels: Map<string, THREE.LOD> = new Map();
  private camera: THREE.Camera;
  
  createLOD(id: string, distances: number[]): THREE.LOD {
    const lod = new THREE.LOD();
    
    // High detail (close)
    const highDetailGeometry = new THREE.BoxGeometry(1, 1, 1, 8, 8, 8);
    const highDetailMesh = new THREE.Mesh(highDetailGeometry, this.materials.detailed);
    lod.addLevel(highDetailMesh, distances[0]);
    
    // Medium detail (medium distance)
    const medDetailGeometry = new THREE.BoxGeometry(1, 1, 1, 4, 4, 4);
    const medDetailMesh = new THREE.Mesh(medDetailGeometry, this.materials.medium);
    lod.addLevel(medDetailMesh, distances[1]);
    
    // Low detail (far)
    const lowDetailGeometry = new THREE.BoxGeometry(1, 1, 1, 1, 1, 1);
    const lowDetailMesh = new THREE.Mesh(lowDetailGeometry, this.materials.simple);
    lod.addLevel(lowDetailMesh, distances[2]);
    
    this.lodLevels.set(id, lod);
    return lod;
  }
  
  update(): void {
    this.lodLevels.forEach(lod => {
      lod.update(this.camera);
    });
  }
}
```

## Animation Patterns

### Promise-Based Animation System

```typescript
class AnimationManager {
  private activeAnimations: Set<Animation> = new Set();
  
  animate(target: THREE.Object3D, properties: any, duration: number): Promise<void> {
    return new Promise((resolve, reject) => {
      const animation = new Animation(target, properties, duration);
      
      animation.onComplete(() => {
        this.activeAnimations.delete(animation);
        resolve();
      });
      
      animation.onError((error) => {
        this.activeAnimations.delete(animation);
        reject(error);
      });
      
      this.activeAnimations.add(animation);
      animation.start();
    });
  }
  
  async animateSequence(animations: AnimationConfig[]): Promise<void> {
    for (const config of animations) {
      await this.animate(config.target, config.properties, config.duration);
    }
  }
  
  stopAll(): void {
    this.activeAnimations.forEach(animation => animation.stop());
    this.activeAnimations.clear();
  }
}
```

### Easing and Timing Functions

```typescript
class EasingFunctions {
  static easeOutCubic(t: number): number {
    return 1 - Math.pow(1 - t, 3);
  }
  
  static easeInOutQuart(t: number): number {
    return t < 0.5 ? 8 * t * t * t * t : 1 - 8 * (--t) * t * t * t;
  }
  
  static bounce(t: number): number {
    if (t < 1 / 2.75) {
      return 7.5625 * t * t;
    } else if (t < 2 / 2.75) {
      return 7.5625 * (t -= 1.5 / 2.75) * t + 0.75;
    } else if (t < 2.5 / 2.75) {
      return 7.5625 * (t -= 2.25 / 2.75) * t + 0.9375;
    } else {
      return 7.5625 * (t -= 2.625 / 2.75) * t + 0.984375;
    }
  }
}

// Usage in face rotation
class FaceRotationAnimator {
  async rotateFacePieces(face: Face, rotation: number, duration: number): Promise<void> {
    const startTime = performance.now();
    
    return new Promise(resolve => {
      const animate = () => {
        const elapsed = performance.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const easedProgress = EasingFunctions.easeOutCubic(progress);
        
        const currentRotation = rotation * easedProgress;
        this.updateFacePiecesRotation(face, currentRotation);
        
        if (progress < 1) {
          requestAnimationFrame(animate);
        } else {
          this.snapToFinalPosition(face);
          resolve();
        }
      };
      
      animate();
    });
  }
}
```

## Resource Management Patterns

### Texture Atlas Management

```typescript
class TextureAtlasManager {
  private atlas: THREE.Texture;
  private uvMappings: Map<string, THREE.Vector4> = new Map();
  
  constructor() {
    this.createAtlas();
  }
  
  private createAtlas(): void {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 1024;
    const ctx = canvas.getContext('2d')!;
    
    // Draw face colors into atlas
    const faceColors = ['red', 'orange', 'yellow', 'green', 'blue', 'white'];
    const cellSize = 1024 / 3; // 3x2 grid
    
    faceColors.forEach((color, index) => {
      const x = (index % 3) * cellSize;
      const y = Math.floor(index / 3) * cellSize;
      
      ctx.fillStyle = color;
      ctx.fillRect(x, y, cellSize, cellSize);
      
      // Store UV mapping
      this.uvMappings.set(color, new THREE.Vector4(
        x / 1024, y / 1024,
        cellSize / 1024, cellSize / 1024
      ));
    });
    
    this.atlas = new THREE.CanvasTexture(canvas);
  }
  
  getMaterial(face: Face): THREE.Material {
    const color = this.getFaceColor(face);
    const uvMapping = this.uvMappings.get(color)!;
    
    const material = new THREE.MeshLambertMaterial({
      map: this.atlas
    });
    
    // Apply UV transformation
    this.applyUVTransform(material, uvMapping);
    
    return material;
  }
}
```

### Memory Management Pattern

```typescript
class ResourceManager {
  private disposables: Set<{ dispose(): void }> = new Set();
  private memoryMonitor: MemoryMonitor;
  
  track<T extends { dispose(): void }>(resource: T): T {
    this.disposables.add(resource);
    return resource;
  }
  
  dispose(): void {
    this.disposables.forEach(resource => {
      try {
        resource.dispose();
      } catch (error) {
        console.warn('Error disposing resource:', error);
      }
    });
    this.disposables.clear();
  }
  
  getMemoryUsage(): MemoryInfo {
    return {
      geometries: this.renderer.info.memory.geometries,
      textures: this.renderer.info.memory.textures,
      totalMB: this.memoryMonitor.getTotalUsage()
    };
  }
}

// Usage
const resourceManager = new ResourceManager();

const geometry = resourceManager.track(new THREE.BoxGeometry(1, 1, 1));
const material = resourceManager.track(new THREE.MeshLambertMaterial({ color: 0xff0000 }));
const mesh = new THREE.Mesh(geometry, material);

// Later cleanup
resourceManager.dispose();
```

## Error Handling Patterns

### Graceful Degradation

```typescript
class RenderingFallback {
  private fallbackLevels = [
    { shadows: true, antialiasing: true, pixelRatio: window.devicePixelRatio },
    { shadows: true, antialiasing: false, pixelRatio: 1 },
    { shadows: false, antialiasing: false, pixelRatio: 1 },
    { wireframe: true, shadows: false, antialiasing: false, pixelRatio: 1 }
  ];
  
  private currentLevel = 0;
  
  async initializeRenderer(container: HTMLElement): Promise<THREE.WebGLRenderer> {
    for (let i = this.currentLevel; i < this.fallbackLevels.length; i++) {
      try {
        const config = this.fallbackLevels[i];
        const renderer = await this.createRenderer(container, config);
        this.currentLevel = i;
        return renderer;
      } catch (error) {
        console.warn(`Renderer config ${i} failed:`, error);
        continue;
      }
    }
    
    throw new Error('No compatible renderer configuration found');
  }
  
  private async createRenderer(container: HTMLElement, config: any): Promise<THREE.WebGLRenderer> {
    return new Promise((resolve, reject) => {
      try {
        const renderer = new THREE.WebGLRenderer({
          antialias: config.antialiasing,
          alpha: true
        });
        
        renderer.setPixelRatio(config.pixelRatio);
        renderer.shadowMap.enabled = config.shadows;
        
        if (config.wireframe) {
          // Override all materials to wireframe
          this.enableWireframeMode();
        }
        
        // Test render
        setTimeout(() => {
          if (renderer.getContext().isContextLost()) {
            reject(new Error('WebGL context lost'));
          } else {
            resolve(renderer);
          }
        }, 100);
        
      } catch (error) {
        reject(error);
      }
    });
  }
}
```

## Testing Patterns

### Visual Regression Testing

```typescript
class VisualTestRunner {
  private renderer: THREE.WebGLRenderer;
  private referenceImages: Map<string, ImageData> = new Map();
  
  async captureReference(testName: string, scene: THREE.Scene, camera: THREE.Camera): Promise<void> {
    this.renderer.render(scene, camera);
    const imageData = this.getRendererImageData();
    this.referenceImages.set(testName, imageData);
  }
  
  async runVisualTest(testName: string, scene: THREE.Scene, camera: THREE.Camera): Promise<TestResult> {
    this.renderer.render(scene, camera);
    const currentImage = this.getRendererImageData();
    const referenceImage = this.referenceImages.get(testName);
    
    if (!referenceImage) {
      throw new Error(`No reference image found for test: ${testName}`);
    }
    
    const difference = this.compareImages(currentImage, referenceImage);
    
    return {
      testName,
      passed: difference < 0.01, // 1% difference threshold
      difference,
      currentImage,
      referenceImage
    };
  }
}
```

This integration guide provides the foundation for building robust, performant Three.js applications with proper separation of concerns and error handling.