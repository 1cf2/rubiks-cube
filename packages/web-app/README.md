# @rubiks-cube/web-app

React frontend application for the 3D Rubik's Cube game. Provides the user interface, interaction handling, and integration between the 3D renderer and cube engine.

## Overview

This package contains the main web application built with React 18 and TypeScript. It orchestrates the 3D rendering, user interactions, and game state management to create a complete Rubik's cube experience.

## Features

- **React 18** with Suspense for optimal loading experience
- **Lazy Loading** for 3D components to improve initial load time
- **Responsive Design** that works on desktop, tablet, and mobile
- **Error Boundaries** for robust 3D rendering error handling
- **Performance Monitoring** with debug overlays and metrics
- **Hot Reload** development server for fast iteration

## Key Components

### CubeScene

The main 3D scene component that orchestrates all game elements:

```typescript
import { CubeScene } from './components/three/CubeScene';

function App() {
  return (
    <div className="app">
      <Suspense fallback={<LoadingIndicator />}>
        <CubeScene />
      </Suspense>
    </div>
  );
}
```

**Features:**
- Integrates `FaceRotationAnimator` for proper cube physics
- Handles mouse and touch interactions
- Manages visual feedback and debug overlays
- Provides error recovery for WebGL context loss

### CubeRenderer

Responsible for creating and managing the 3D cube mesh:

```typescript
import { CubeRenderer } from './components/three/CubeRenderer';

<CubeRenderer 
  scene={scene}
  isAnimating={true}
  onCubeGroupReady={(cubeGroup) => {
    // Cube is ready for interaction
  }}
/>
```

**Features:**
- Creates 27 individual cube pieces in 3x3x3 formation
- Assigns proper colors to visible faces
- Optimizes material usage for performance
- Handles responsive scaling for different devices

### MouseControls

Advanced mouse/touch interaction system:

```typescript
import { MouseControls } from './components/input/MouseControls';

<MouseControls
  camera={camera}
  scene={scene}
  cubeGroup={cubeGroup}
  enableRotationPreview={true}
  enableDebugOverlay={true}
  onRotationStart={(command) => {
    console.log('Rotation started:', command);
  }}
/>
```

**Features:**
- Intelligent gesture recognition
- Visual feedback for interactions
- Touch-optimized controls for mobile
- Debug overlays for development

### ThreeScene

WebGL context and scene management:

```typescript
import { ThreeScene, useThreeContext } from './components/three/ThreeScene';

function SceneContent() {
  const { scene, camera, renderer } = useThreeContext();
  // Use Three.js objects here
}

<ThreeScene>
  <SceneContent />
</ThreeScene>
```

## Hooks

### useCubeInteraction

Manages cube interaction state and gesture processing:

```typescript
import { useCubeInteraction } from './hooks/useCubeInteraction';

const {
  interactionState,
  currentRotation,
  isAnimating,
  handleMouseHover,
  handleDragStart,
  handleDragUpdate,
  handleDragEnd
} = useCubeInteraction({
  camera,
  scene,
  onRotationStart: (command) => {
    // Handle rotation start
  }
});
```

### useMouseGestures

Low-level mouse/touch gesture recognition:

```typescript
import { useMouseGestures } from './hooks/useMouseGestures';

const { 
  isDragging, 
  currentGesture, 
  cursorState, 
  handlers 
} = useMouseGestures({
  minDragDistance: 5,
  sensitivity: 1.0,
  onDragStart: (gesture) => {
    console.log('Drag started:', gesture);
  }
});
```

### useAutoRotation

Automatic cube rotation for demos and idle states:

```typescript
import { useAutoRotation } from './hooks/useAutoRotation';

const { 
  isAutoRotating, 
  startAutoRotation, 
  stopAutoRotation 
} = useAutoRotation(cubeGroup, {
  speed: 0.01,
  enableX: true,
  enableY: true
});
```

## Architecture

### Component Structure

```
src/
├── components/
│   ├── three/           # Three.js components
│   │   ├── CubeScene.tsx
│   │   ├── CubeRenderer.tsx
│   │   ├── ThreeScene.tsx
│   │   └── ErrorBoundary.tsx
│   ├── input/           # Input handling
│   │   └── MouseControls.tsx
│   ├── debug/           # Debug utilities
│   │   ├── DebugControls.tsx
│   │   └── DebugOverlay.tsx
│   └── ui/              # UI components
├── hooks/               # React hooks
├── utils/               # Utility functions
└── types/               # TypeScript types
```

### State Management

The app uses a hybrid state management approach:

- **React State**: UI state, interaction state, component lifecycle
- **Three.js State**: 3D object positions, animations, rendering state  
- **Cube Engine**: Logical cube state, move validation, solving algorithms

### Error Handling

Comprehensive error boundaries protect against:

- WebGL context loss
- Three.js rendering errors
- Component lifecycle errors
- Memory allocation failures

## Development

### Running Locally

```bash
# Start development server
npm start

# Or from project root
npm run dev
```

The app will be available at http://localhost:8082

### Building

```bash
# Development build
npm run build

# Production build (from root)
npm run build:web
```

### Testing

```bash
# Run tests
npm test

# Run with coverage
npm test -- --coverage
```

### Debugging

Enable debug features:

```typescript
// In development
const debugFeatures = {
  enableDebugOverlay: true,
  enableRotationPreview: true,
  enablePerformanceMonitoring: true,
  enableMouseGestureDebugging: true
};
```

**Debug Overlays Show:**
- Current mouse/touch position
- Active gesture information
- Face hover/selection state
- Performance metrics (FPS, memory)
- Interaction state details

## Performance Optimization

### Bundle Splitting

The app uses strategic code splitting:

- **Three.js Bundle** (~470KB): Loaded separately for better caching
- **React Bundle** (~132KB): Core UI framework
- **App Bundle** (~5KB): Application-specific code

### Lazy Loading

- 3D scene components load only when needed
- Suspense boundaries provide smooth loading experience
- Error boundaries prevent cascade failures

### Memory Management

- Automatic cleanup of Three.js resources
- Proper disposal of event listeners
- Optimized material and geometry reuse

## Browser Support

| Feature | Chrome 60+ | Firefox 60+ | Safari 12+ | Edge 79+ |
|---------|------------|-------------|------------|----------|
| WebGL Rendering | ✅ | ✅ | ✅ | ✅ |
| Touch Controls | ✅ | ✅ | ✅ | ✅ |
| Hot Reload | ✅ | ✅ | ✅ | ✅ |
| Performance Monitoring | ✅ | ✅ | ⚠️ | ✅ |

⚠️ = Limited support or requires specific configuration

## Configuration

### Webpack Configuration

Key webpack features:

- **Hot Module Replacement** for fast development
- **Code Splitting** for optimal loading
- **Asset Optimization** for production builds
- **Source Maps** for debugging

### Environment Variables

```bash
NODE_ENV=development     # Development mode
REACT_APP_DEBUG=true    # Enable debug features
REACT_APP_API_URL=...   # API endpoint (future)
```

## Deployment

### Production Build

```bash
npm run build
```

Outputs optimized files to `dist/`:
- `index.html` - Main application entry
- `*.chunk.js` - Code-split JavaScript bundles
- `*.css` - Optimized stylesheets
- `assets/` - Static assets and manifests

### Static Hosting

The app is designed for static hosting on:

- **Netlify**: Drag-and-drop deployment
- **Vercel**: Git-based deployment
- **GitHub Pages**: Free hosting option
- **AWS S3 + CloudFront**: Scalable hosting

## Integration

### Dependencies

- `@rubiks-cube/three-renderer` - 3D rendering engine
- `@rubiks-cube/cube-engine` - Cube logic and state  
- `@rubiks-cube/shared` - Common types and utilities
- `react` ^18.0.0 - UI framework
- `three` ^0.160.1 - 3D graphics library

### API Integration (Future)

Prepared for backend integration:

```typescript
// Future API integration
import { CubeAPI } from '@rubiks-cube/api-client';

const api = new CubeAPI(process.env.REACT_APP_API_URL);
const stats = await api.getUserStats();
```

## Troubleshooting

**Performance Issues:**
- Check WebGL support in browser settings
- Monitor memory usage in dev tools
- Disable browser extensions that may interfere

**Build Issues:**
- Clear node_modules and reinstall dependencies
- Ensure TypeScript compilation succeeds
- Check for circular dependencies

**Runtime Errors:**
- Check browser console for WebGL errors
- Verify Three.js version compatibility
- Enable debug overlays for detailed information

## License

ISC License - Part of the Rubik's Cube monorepo project.