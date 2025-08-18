# 6. Core Components

## Frontend Components Architecture

```typescript
// Top-level Application Component
<App>
  <ThreeScene>                    // Three.js rendering container
    <CubeRenderer />              // 3D cube visualization
    <InteractionHandler />        // Mouse/touch input processing
    <AnimationController />       // Move animations and transitions
  </ThreeScene>
  
  <GameUI>                        // React UI overlay
    <Timer />                     // Real-time timer display
    <MoveCounter />               // Move tracking
    <ControlPanel />              // Game controls and settings
    <TutorialOverlay />           // Interactive tutorial system
    <HintSystem />                // Adaptive hint display
  </GameUI>
  
  <StateManagement>
    <CubeStateProvider />         // Cube logic state context
    <UIStateProvider />           // Interface state management
    <PerformanceMonitor />        // Frame rate and metrics tracking
  </StateManagement>
</App>
```

## Backend Service Components

```typescript
// API Server Structure
CubeGameAPI/
├── controllers/
│   ├── SessionController        // Session CRUD operations
│   ├── StatisticsController     // Performance tracking
│   ├── CubeController          // Cube generation and validation
│   └── PreferencesController   // User settings management
├── services/
│   ├── CubeEngine              // Core cube logic (shared with frontend)
│   ├── ScrambleGenerator       // Algorithm-based scrambling
│   ├── StatisticsCalculator    // Performance analytics
│   └── SessionManager         // Session lifecycle management
├── middleware/
│   ├── ValidationMiddleware    // Input validation and sanitization
│   ├── RateLimitMiddleware     // API rate limiting
│   └── ErrorHandler           // Centralized error handling
└── database/
    ├── models/                 // PostgreSQL ORM models
    └── migrations/             // Database schema versions
```

---
