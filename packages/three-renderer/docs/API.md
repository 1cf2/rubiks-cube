# Three.js Renderer API Documentation

## Overview

The Three.js Renderer package provides 3D rendering capabilities for the Rubik's cube. Built on Three.js 0.160+, it handles WebGL rendering, animations, and user interactions with performance optimization.

## Core Components

### FaceRotationAnimator

Handles authentic face rotation mechanics where all 9 pieces rotate together around the face center. Includes automatic spotlight lighting refresh after rotation completion.

```typescript
import { FaceRotationAnimator } from '@rubiks-cube/three-renderer';

const animator = new FaceRotationAnimator(scene, cubeGroup);
```

#### Methods

**`rotateFacePieces(face: Face, rotation: number, duration: number): Promise<void>`**
- Rotates all pieces of a face around the face center
- Uses proper rotation matrix calculations with quaternion-based transformations
- Returns promise that resolves when animation completes
- Automatically updates spotlight lighting and shadow maps on completion
- Performance: Maintains 60fps target with sub-millisecond lighting refresh

**`initializeFaceMeshes(): void`** (called automatically after rotations)
- Re-maps face piece associations after cube rotations
- Ensures spotlight targeting remains accurate
- Critical for maintaining lighting consistency after state changes

**`getFaceCenter(face: Face): THREE.Vector3`**
- Calculates the center point of a face
- Used as rotation pivot point for precise rotations
- Thread-safe and cached for optimal performance

**`snapToGrid(position: THREE.Vector3): THREE.Vector3`**
- Snaps piece positions to exact grid coordinates
- Ensures precision after rotations
- Prevents floating-point drift

## Advanced Lighting System

The renderer implements a sophisticated camera-relative spotlight system that provides cinematic lighting effects and maintains visual consistency during camera movement.

### Spotlight System Architecture

```typescript
interface SpotlightConfig {
  name: string;
  relativePosition: THREE.Vector3;
  targetOffset: THREE.Vector3;
  intensity: number;
  distance: number;
  angle: number;
  color: number;
  shadowMapSize: { width: number; height: number };
}

class CameraRelativeLighting {
  private spotlights: THREE.SpotLight[];
  private scene: THREE.Scene;
  private camera: THREE.Camera;

  updateSpotlightsRelativeToCamera(): void {
    // Position and target all spotlights relative to current camera position
    // Maintains consistent lighting angles regardless of camera orientation
    // Updates shadow maps for optimal rendering
  }
}
```

### Lighting Methods

**`updateSpotlightsRelativeToCamera(camera: THREE.Camera): void`**
- Repositions all spotlights relative to current camera placement
- Maintains consistent illumination angles throughout camera movement
- Updates shadow maps for real-time lighting accuracy
- Performance: Sub-millisecond execution maintaining 60fps

**`refreshSpotlightShadows(): void`**
- Forces shadow map updates for all active spotlights
- Called automatically after cube rotations
- Ensures lighting consistency during state changes
- Memory efficient with optimized shadow resolution settings

### Camera Orbit Lighting Integration

The lighting system integrates seamlessly with camera controls:

```typescript
// When camera moves (orbit, zoom), lighting system automatically:
// 1. Repositions spotlights relative to new camera position
// 2. Updates spotlight target positions
// 3. Refreshes shadow maps
// 4. Maintains consistent lighting angles from any camera perspective

cameraControls.orbitCamera(deltaX, deltaY).then(() => {
  lightingSystem.updateSpotlightsRelativeToCamera(camera);
});
```

### MouseInteractionHandler

Processes mouse gestures for cube and face interactions with integrated lighting coordination.

```typescript
import { MouseInteractionHandler } from '@rubiks-cube/three-renderer';

const mouseHandler = new MouseInteractionHandler(renderer, camera, scene);
```

#### Methods

**`initialize(): void`**
- Sets up mouse event listeners
- Configures raycasting for face detection
- Initializes gesture recognition

**`onMouseDown(event: MouseEvent): void`**
- Handles mouse press events
- Determines if clicking on face or empty space
- Initiates drag tracking

**`onMouseMove(event: MouseEvent): void`**
- Processes mouse movement
- Updates face highlighting
- Calculates rotation gestures

**`onMouseUp(event: MouseEvent): void`**
- Completes interaction
- Applies face rotation if valid gesture
- Resets interaction state

#### Events

**`faceHover`** - Emitted when hovering over a face
**`faceSelect`** - Emitted when selecting a face
**`faceRotate`** - Emitted when rotating a face
**`cubeRotate`** - Emitted when rotating entire cube

### TouchInteractionHandler

Optimized touch controls for mobile devices.

```typescript
import { TouchInteractionHandler } from '@rubiks-cube/three-renderer';

const touchHandler = new TouchInteractionHandler(renderer, camera, scene);
```

#### Methods

**`handleTouchStart(event: TouchEvent): void`**
- Processes touch start events
- Handles multi-touch gestures
- Prevents default browser behaviors

**`handleTouchMove(event: TouchEvent): void`**
- Tracks touch movement
- Calculates gesture velocity
- Updates visual feedback

**`handleTouchEnd(event: TouchEvent): void`**
- Completes touch interaction
- Applies momentum-based animations
- Handles gesture recognition

### FaceHighlighting

Provides visual feedback for face interactions.

```typescript
import { FaceHighlighting } from '@rubiks-cube/three-renderer';

const highlighting = new FaceHighlighting(scene);
```

#### Methods

**`highlightFace(face: Face, type: HighlightType): void`**
- Highlights specified face
- Different highlight types for different states
- Smooth transition animations

**`clearHighlight(): void`**
- Removes all face highlighting
- Animated fade-out effect
- Restores original materials

#### Highlight Types

```typescript
enum HighlightType {
  HOVER = 'hover',      // Blue highlight
  SELECTED = 'selected', // Orange highlight
  ROTATING = 'rotating'  // Red highlight
}
```

### OrbitCameraManager

Controls 3D camera positioning and movement.

```typescript
import { OrbitCameraManager } from '@rubiks-cube/three-renderer';

const cameraManager = new OrbitCameraManager(camera, renderer.domElement);
```

#### Methods

**`setPosition(position: THREE.Vector3): void`**
- Sets camera position
- Smooth transition animation
- Maintains cube in view

**`setTarget(target: THREE.Vector3): void`**
- Sets camera look-at target
- Usually cube center
- Updates orbit controls

**`resetView(): void`**
- Resets to default camera position
- Animated transition
- Optimal cube viewing angle

#### Properties

- **minDistance**: Minimum zoom distance
- **maxDistance**: Maximum zoom distance  
- **enableDamping**: Smooth camera movement
- **dampingFactor**: Movement smoothness

### RotationPreview

Shows preview of face rotation before applying.

```typescript
import { RotationPreview } from '@rubiks-cube/three-renderer';

const preview = new RotationPreview(scene);
```

#### Methods

**`showPreview(face: Face, rotation: number): void`**
- Shows rotation preview
- Semi-transparent overlay
- Direction indicator

**`updatePreview(angle: number): void`**
- Updates preview rotation angle
- Real-time visual feedback
- Snaps to valid rotation increments

**`hidePreview(): void`**
- Hides rotation preview
- Fade-out animation
- Cleans up temporary objects

## Material System

### CubeMaterial

Custom materials for cube pieces with performance optimization.

```typescript
interface CubeMaterialOptions {
  color: string;
  metalness: number;
  roughness: number;
  envMap?: THREE.Texture;
}
```

### MaterialManager

```typescript
import { MaterialManager } from '@rubiks-cube/three-renderer';

const materials = new MaterialManager();
```

#### Methods

**`getFaceMaterial(face: Face): THREE.Material`**
- Returns material for specific face
- Cached for performance
- Supports color customization

**`getHighlightMaterial(type: HighlightType): THREE.Material`**
- Returns highlight material
- Different materials for different states
- Optimized for real-time rendering

## Performance Monitoring

### PerformanceMonitor

```typescript
import { PerformanceMonitor } from '@rubiks-cube/three-renderer';

const monitor = new PerformanceMonitor(renderer);
```

#### Methods

**`startMonitoring(): void`**
- Begins performance tracking
- Monitors frame rate, memory usage
- Automatic quality adjustment

**`getMetrics(): RenderingMetrics`**
- Returns current performance metrics
- Frame rate, render time, memory
- Used for optimization decisions

```typescript
interface RenderingMetrics {
  fps: number;
  renderTime: number;
  memoryUsage: number;
  triangleCount: number;
  drawCalls: number;
}
```

## Integration Patterns

### With React Components

```typescript
import { useEffect, useRef } from 'react';
import { FaceRotationAnimator } from '@rubiks-cube/three-renderer';

function CubeScene() {
  const mountRef = useRef<HTMLDivElement>(null);
  const animatorRef = useRef<FaceRotationAnimator>();

  useEffect(() => {
    // Initialize Three.js scene
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    
    // Initialize animator
    animatorRef.current = new FaceRotationAnimator(scene, cubeGroup);
    
    // Setup render loop
    const animate = () => {
      requestAnimationFrame(animate);
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      // Cleanup
      renderer.dispose();
    };
  }, []);

  return <div ref={mountRef} />;
}
```

### With Cube Engine

```typescript
import { StateManager } from '@rubiks-cube/cube-engine';
import { FaceRotationAnimator } from '@rubiks-cube/three-renderer';

// Synchronize engine state with renderer
stateManager.on('moveApplied', (move) => {
  animator.rotateFacePieces(move.face, move.rotation, 300);
});

// Apply moves from renderer to engine
mouseHandler.on('faceRotate', (face, rotation) => {
  const move = { face, rotation, timestamp: Date.now() };
  stateManager.applyMove(move);
});
```

## WebGL Context Management

### Context Loss Recovery

```typescript
renderer.domElement.addEventListener('webglcontextlost', (event) => {
  event.preventDefault();
  console.warn('WebGL context lost');
  // Pause rendering
});

renderer.domElement.addEventListener('webglcontextrestored', () => {
  console.log('WebGL context restored');
  // Reinitialize resources
  materialManager.reloadMaterials();
  geometryManager.reloadGeometry();
});
```

### Quality Adjustment

```typescript
const monitor = new PerformanceMonitor(renderer);

monitor.on('performanceDrop', (metrics) => {
  if (metrics.fps < 30) {
    // Reduce quality
    renderer.setPixelRatio(Math.min(window.devicePixelRatio * 0.8, 1));
    scene.children.forEach(child => {
      if (child.material) {
        child.material.side = THREE.FrontSide; // Reduce overdraw
      }
    });
  }
});
```

## Error Handling

```typescript
enum RenderError {
  WEBGL_NOT_SUPPORTED = 'WEBGL_NOT_SUPPORTED',
  CONTEXT_LOST = 'CONTEXT_LOST',
  OUT_OF_MEMORY = 'OUT_OF_MEMORY',
  SHADER_COMPILATION_FAILED = 'SHADER_COMPILATION_FAILED'
}
```

## Testing

```bash
cd packages/three-renderer
npm test                    # Run unit tests
npm run test:visual        # Run visual regression tests  
npm run test:performance   # Run performance benchmarks
npm run test:webgl         # Test WebGL compatibility
```

## Browser Compatibility

- Chrome 60+: Full support
- Firefox 60+: Full support  
- Safari 12+: Full support
- Edge 79+: Full support
- Mobile: iOS 12+, Android 8+