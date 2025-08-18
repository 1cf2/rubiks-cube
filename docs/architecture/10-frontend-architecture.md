# 10. Frontend Architecture

## React Component Organization

```typescript
// Component hierarchy with performance considerations
src/
├── components/
│   ├── three/                    // Three.js integration components
│   │   ├── ThreeScene.tsx       // Scene container with performance monitoring
│   │   ├── CubeRenderer.tsx     // Optimized cube geometry and materials
│   │   ├── LightingSetup.tsx    // Performance-tuned lighting
│   │   └── CameraController.tsx // Gesture-responsive camera controls
│   ├── ui/                      // React UI components
│   │   ├── Timer.tsx           // High-precision timer display
│   │   ├── MoveCounter.tsx     // Real-time move tracking
│   │   ├── ControlPanel.tsx    // Game controls with accessibility
│   │   └── TutorialOverlay.tsx // Progressive tutorial system
│   ├── input/                   // Input handling components
│   │   ├── GestureHandler.tsx  // Unified gesture recognition
│   │   ├── MouseControls.tsx   // Desktop mouse interactions
│   │   └── TouchControls.tsx   // Mobile touch optimizations
│   └── accessibility/           // WCAG compliance components
│       ├── ScreenReaderSupport.tsx
│       ├── KeyboardNavigation.tsx
│       └── HighContrastMode.tsx
```

## State Management Architecture

```typescript
// Redux store structure for UI state
interface RootState {
  cube: CubeStateSlice;           // Cube logic state
  ui: UIStateSlice;               // Interface visibility and preferences
  performance: PerformanceSlice;   // Frame rate and optimization settings
  tutorial: TutorialSlice;        // Learning progress and hints
  session: SessionSlice;          // Timer, moves, and statistics
}

// Custom hooks for Three.js integration
const useThreeScene = () => {
  // Scene initialization and cleanup
  // Performance monitoring integration
  // Automatic quality adjustment
};

const useCubeAnimations = () => {
  // Animation queue management
  // Performance-optimized transitions
  // Gesture-responsive controls
};

const usePerformanceOptimization = () => {
  // Frame rate monitoring
  // Automatic LOD adjustment
  // Memory usage tracking
};
```

## Responsive Design Strategy

```typescript
// Breakpoint-based component adaptation
interface ResponsiveConfig {
  mobile: {
    maxWidth: 767;
    cubeSize: 0.8;           // Smaller cube for mobile screens
    touchTargetSize: 44;     // Accessibility-compliant touch targets
    simplifiedShaders: true; // Reduced visual complexity
  };
  tablet: {
    minWidth: 768;
    maxWidth: 1023;
    cubeSize: 1.0;
    hybridControls: true;    // Both touch and mouse support
  };
  desktop: {
    minWidth: 1024;
    cubeSize: 1.2;
    fullQuality: true;       // Maximum visual fidelity
    precisionControls: true; // Mouse precision optimizations
  };
}
```

---
