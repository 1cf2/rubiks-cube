# @rubiks-cube/three-renderer

3D rendering engine for the Rubik's Cube game, built with Three.js and optimized for WebGL performance.

## Overview

This package provides the core 3D rendering functionality for the Rubik's Cube game, including:

- **Face Rotation Animation** - Realistic cube face rotations that behave like a physical Rubik's cube
- **Face-to-Face Drag Interactions** - Intuitive reference face selection and drag to adjacent faces for layer rotations, with geometric adjacency detection and vector-based direction calculation
- **Mouse/Touch Interaction** - Advanced gesture recognition integrating face tracking, adjacency validation, and enhanced rotation previews
- **Visual Feedback** - Dynamic highlighting (reference/adjacent), live direction arrows, pulsing animations, and ghost previews during drags
- **Camera Management** - Smooth orbit controls for 3D cube viewing
- **Performance Optimization** - 60fps rendering with face caching, throttled adjacency checks (16ms), hysteresis, and confidence-based initiation

## Key Components

### FaceRotationAnimator

The core animation system that handles authentic face rotations:

```typescript
import { FaceRotationAnimator } from '@rubiks-cube/three-renderer';

const animator = new FaceRotationAnimator({
  cubeGroup: threejsGroup,
  onAnimationStart: (animation) => console.log('Rotation started'),
  onAnimationComplete: (animation) => console.log('Rotation completed'),
  onError: (error, message) => console.error('Animation error:', error)
});

// Start a face rotation
const result = animator.startRotation({
  face: FacePosition.FRONT,
  direction: RotationDirection.CLOCKWISE,
  angle: Math.PI / 2,
  duration: 300,
  easing: 'ease-out',
  move: 'F'
});
```

**Key Features:**
- Rotates all 9 pieces of a face as a cohesive group around the face center
- Automatically updates face-to-piece mappings after rotation completion
- Precise position snapping for perfect grid alignment
- Support for clockwise, counterclockwise, and double rotations

### MouseInteractionHandler

Handles mouse-based cube interactions:

```typescript
import { MouseInteractionHandler } from '@rubiks-cube/three-renderer';

const handler = new MouseInteractionHandler({
  camera,
  scene,
  onFaceHover: (face) => console.log('Hovering face:', face),
  onFaceSelect: (face) => console.log('Selected face:', face),
  onRotationStart: (command) => console.log('Starting rotation:', command)
});
```

### TouchInteractionHandler

Optimized touch controls for mobile devices:

```typescript
import { TouchInteractionHandler } from '@rubiks-cube/three-renderer';

const touchHandler = new TouchInteractionHandler({
  camera,
  scene,
  sensitivity: 2.0, // Higher sensitivity for touch
  onGestureRecognized: (gesture) => console.log('Touch gesture:', gesture)
});
```

### Visual Effects

**FaceHighlighting** - Dynamic face highlighting system:
- Blue: Face hover state
- Orange: Face selected state  
- Red: Face rotating state

**RotationPreview** - Shows rotation direction before committing:
- Visual arrows indicating rotation direction
- Preview opacity and timing controls

**OrbitCameraManager** - Smooth camera controls:
- Mouse drag for orbit rotation
- Zoom controls with limits
- Smooth camera transitions

## Recent Improvements

### Fixed: Face Rotation Mechanics

**Problem**: Individual cube pieces were rotating around their own centers instead of as a cohesive face.

**Solution**: Completely redesigned the rotation system in `FaceRotationAnimator`:

1. **Group Rotation**: All 9 pieces on a face now rotate together around the face center
2. **Face Remapping**: After each rotation, the system updates which pieces belong to which faces
3. **Precise Snapping**: Enhanced position snapping ensures perfect grid alignment
4. **Exact Positioning**: Uses exact coordinate matching instead of threshold-based detection

**Result**: The cube now behaves exactly like a physical Rubik's cube, with faces rotating as solid units.

### Enhanced: Face-to-Face Drag Interactions

**New Feature**: Added intuitive face-to-face rotation system for natural, gesture-based cube solving without traditional click-and-drag limitations.

**Implementation**:

1. **Adjacency Detection** (`FaceAdjacencyDetector`): Geometric analysis of face centers, normals, edges; classifies states (adjacent/diagonal/non-adjacent) with normalized distances (thresholds: 1.1 adjacent, 1.6 diagonal), layer compatibility, shared edges, and confidence scoring (0-1 based on state/layers/drag)
2. **Reference Tracking** (`FaceReferenceTracker`): Manages selection state with timeouts (3s), max drag (5 units), hysteresis (0.01) to prevent jitter; operations for select/update/clear/invalidate
3. **Vector Calculation** (`RotationVectorCalculator`): Computes axis (cross product), direction (right-hand rule via dot/cross), torque angle (15°-165° range); generates RotationCommand with 90° target
4. **Interaction Handling** (`FaceToFaceMouseInteractionHandler` & `EnhancedFaceToFaceMouseInteractionHandler`): Orchestrates drags with throttled checks; visual feedback (orange reference, blue adjacents); live previews (green arrows, pulsing, face-specific orientations)

**Benefits**: Enables precise, physics-inspired rotations; high confidence (>0.8) initiation; performance via caching/throttling; seamless integration with existing animator/lighting.

## Performance Features

- **60fps Target**: Optimized rendering loop maintains smooth animation
- **Memory Management**: Proper disposal of Three.js resources
- **Lazy Loading**: Components load only when needed
- **Efficient Updates**: Minimal re-rendering during animations
- **WebGL Optimization**: Hardware-accelerated 3D rendering

## Browser Compatibility

- **Chrome 60+**: Full support with hardware acceleration
- **Firefox 60+**: Full support with WebGL enabled
- **Safari 12+**: Full support on macOS and iOS
- **Edge 79+**: Full support with Chromium engine

## API Reference

### FaceRotationAnimator Methods

- `startRotation(config)` - Begin a face rotation animation
- `stopAnimation(id)` - Stop a specific animation by ID
- `stopAllAnimations()` - Stop all active animations
- `hasActiveAnimations()` - Check if any animations are running
- `getActiveAnimationForFace(face)` - Get animation for specific face
- `dispose()` - Clean up all resources

### Animation Configuration

```typescript
interface RotationAnimationConfig {
  face: FacePosition;           // Which face to rotate
  direction: RotationDirection; // CLOCKWISE, COUNTERCLOCKWISE, DOUBLE
  angle: number;               // Target angle in radians
  duration: number;            // Animation duration in milliseconds
  easing: 'linear' | 'ease-in-out' | 'ease-out' | 'ease-in';
  move: Move;                  // Rubik's cube notation (F, R, U, etc.)
}
```

### Face Detection

The system automatically detects which pieces belong to each face based on their position:

- **Front**: z = 1
- **Back**: z = -1  
- **Right**: x = 1
- **Left**: x = -1
- **Up**: y = 1
- **Down**: y = -1

## Development

### Building

```bash
npm run build    # Build TypeScript to JavaScript
npm run test     # Run unit tests
npm run lint     # Check code style
```

### Testing

The package includes comprehensive tests for:

- Face rotation mechanics
- Mouse/touch interaction handling
- Visual feedback systems
- Performance benchmarks
- Cross-browser compatibility

### Integration

This package is designed to work with:

- `@rubiks-cube/shared` - Common types and interfaces
- `@rubiks-cube/cube-engine` - Cube state management
- `@rubiks-cube/web-app` - React UI components

## Troubleshooting

**Performance Issues**:
- Ensure WebGL is enabled in browser
- Check for hardware acceleration support
- Monitor memory usage during long sessions

**Rotation Problems**:
- Verify cube group structure matches expected 3x3x3 layout
- Check that piece positions are properly snapped to grid
- Ensure face mappings are updated after rotations

**Visual Glitches**:
- Clear browser cache and reload
- Check Three.js version compatibility
- Verify shader compilation in browser console

## Dependencies

- **three**: ^0.160.1 - 3D graphics library
- **@rubiks-cube/shared**: 1.0.0 - Shared types and utilities

## License

ISC License - Part of the Rubik's Cube monorepo project.