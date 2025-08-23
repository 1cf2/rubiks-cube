# Source Tree Structure - Rubik's Cube Project

## Overview

This document provides a comprehensive guide to the project's file organization, explaining the purpose and relationships between directories and key files. The project follows a monorepo architecture using Lerna for package management.

## Root Directory Structure

```
rubiks-cube/
├── 📁 packages/              # Monorepo packages (core architecture)
├── 📁 docs/                  # Comprehensive project documentation
├── 📁 tools/                 # Build tooling and utilities
├── 📁 deploy/                # Deployment configurations
├── 📄 package.json           # Root package configuration
├── 📄 tsconfig.json          # Global TypeScript configuration
├── 📄 lerna.json             # Monorepo management
├── 📄 CLAUDE.md              # AI assistant instructions
├── 📄 coding-standards.md    # Development guidelines
├── 📄 tech-stack.md          # Technology choices documentation
└── 📄 source-tree.md         # This file
```

## Package Architecture (`packages/`)

The monorepo contains 5 specialized packages with clear dependency relationships:

### Dependency Flow
```
                    web-app (main application)
                   /        \
         three-renderer    cube-engine
                |              |
              shared ←---------+
                |
          api-server (future backend)
```

### Package Descriptions

#### `packages/shared/` - Common Foundation
```
shared/
├── src/
│   ├── types/              # Shared TypeScript definitions
│   │   ├── math.ts         # 3D math types (Vector3D, Quaternion)
│   │   ├── cube.ts         # Cube state and move definitions
│   │   ├── camera-controls.ts  # Camera interaction types
│   │   ├── mouse-interactions.ts  # Mouse event handling types
│   │   └── touch-interactions.ts  # Touch gesture types
│   ├── constants/          # Application-wide constants
│   │   ├── colors.ts       # Cube face colors and themes
│   │   └── environment.ts  # Environment-specific values
│   ├── config/             # Configuration utilities
│   │   ├── validation.ts   # Runtime type validation
│   │   └── feature-flags.ts # Feature toggle system
│   ├── monitoring/         # Performance and error tracking
│   │   ├── performance-monitor.ts  # Frame rate and memory tracking
│   │   └── error-tracker.ts       # Error aggregation and reporting
│   └── utils/              # Shared utility functions
├── tests/                  # Shared component tests
└── package.json           # Dependencies: none (pure utilities)
```

**Purpose:** Provides foundation types and utilities used by all other packages. Zero dependencies to ensure it can be imported anywhere without circular dependencies.

#### `packages/cube-engine/` - Pure Logic Core
```
cube-engine/
├── src/
│   ├── core/               # Core cube state management
│   │   ├── CubeState.ts    # Immutable cube state representation
│   │   ├── StateManager.ts # State transitions and validation
│   │   ├── MoveHistoryManager.ts  # Undo/redo functionality
│   │   ├── StateSerializer.ts     # Save/load cube states
│   │   └── PerformanceManager.ts  # Operation timing monitoring
│   ├── validation/         # Move and state validation
│   │   ├── MoveValidator.ts     # Legal move checking
│   │   └── StateValidator.ts    # Cube state integrity checking
│   ├── state/              # Specialized state managers
│   │   ├── AnimationStateManager.ts  # Animation state tracking
│   │   └── CameraStateManager.ts     # Camera position persistence
│   ├── algorithms/         # Cube solving algorithms (future)
│   ├── preferences/        # User preference management
│   │   └── ViewPreferences.ts  # Display settings persistence
│   └── types/              # Engine-specific types
│       ├── CubeTypes.ts    # Core cube operation types
│       └── ErrorTypes.ts   # Error handling types
├── tests/                  # Comprehensive unit tests
│   ├── core/               # Core functionality tests
│   ├── validation/         # Validation logic tests
│   └── state/              # State management tests
└── package.json           # Dependencies: @rubiks-cube/shared only
```

**Purpose:** Contains all cube logic with zero external dependencies (except shared). This ensures the core game logic can be tested in isolation and potentially reused in different contexts (CLI, mobile app, etc.).

#### `packages/three-renderer/` - 3D Visualization Engine
```
three-renderer/
├── src/
│   ├── animations/         # 3D animation systems
│   │   └── FaceRotationAnimator.ts  # Cube face rotation mechanics
│   ├── interactions/       # Input handling for 3D scene
│   │   ├── MouseInteractionHandler.ts    # Mouse-based face selection
│   │   ├── TouchInteractionHandler.ts    # Touch gesture recognition
│   │   ├── FaceHighlighting.ts          # Visual feedback system
│   │   └── MobileFaceHighlighting.ts    # Mobile-optimized highlighting
│   ├── cameras/            # Camera management
│   │   └── OrbitCameraManager.ts  # 3D camera positioning and movement
│   ├── controls/           # Input processing
│   │   └── CameraInputProcessor.ts  # Raw input to camera commands
│   ├── effects/            # Visual effects
│   │   └── RotationPreview.ts  # Preview rotation before execution
│   ├── scene/              # Three.js scene management (future)
│   ├── geometry/           # Custom 3D geometries (future)
│   ├── materials/          # Shader and material definitions (future)
│   └── performance/        # 3D performance optimization (future)
├── tests/                  # 3D component testing
│   ├── interactions/       # Input handling tests
│   ├── cameras/            # Camera system tests
│   └── jest.setup.js       # Three.js mocking setup
└── package.json           # Dependencies: three.js, @types/three, shared
```

**Purpose:** Handles all Three.js integration and 3D rendering concerns. Separated from the web app to enable potential reuse in other 3D contexts or frameworks.

#### `packages/web-app/` - React Frontend Application
```
web-app/
├── src/
│   ├── components/         # React component hierarchy
│   │   ├── three/          # 3D scene integration components
│   │   │   ├── CubeScene.tsx        # Main 3D scene wrapper
│   │   │   ├── ThreeScene.tsx       # Three.js canvas integration
│   │   │   ├── CubeRenderer.tsx     # Cube geometry rendering
│   │   │   ├── LoadingIndicator.tsx # 3D asset loading feedback
│   │   │   ├── ErrorBoundary.tsx    # WebGL error recovery
│   │   │   └── *.tsx                # Specialized 3D components
│   │   ├── input/          # Input handling components
│   │   │   ├── MouseControls.tsx    # Mouse interaction wrapper
│   │   │   ├── TouchControls.tsx    # Touch gesture wrapper
│   │   │   └── TouchTargetManager.tsx  # Touch target optimization
│   │   ├── ui/             # User interface components
│   │   │   └── ViewResetButton.tsx  # Camera reset functionality
│   │   └── debug/          # Development tools
│   │       ├── DebugControls.tsx    # Development controls panel
│   │       └── DebugOverlay.tsx     # Performance metrics display
│   ├── hooks/              # Custom React hooks
│   │   ├── useCubeInteraction.ts    # Main cube interaction logic
│   │   ├── useMouseGestures.ts      # Mouse gesture recognition
│   │   ├── useTouchGestures.ts      # Touch gesture recognition
│   │   ├── useCameraControls.ts     # Camera state management
│   │   ├── useAutoRotation.ts       # Automatic cube rotation
│   │   └── useMobilePerformance.ts  # Mobile optimization hooks
│   ├── utils/              # Frontend utilities
│   │   ├── raycasting.ts        # 3D mouse picking utilities
│   │   ├── cameraUtils.ts       # Camera calculation helpers
│   │   ├── touchUtils.ts        # Touch event processing
│   │   ├── layerDetection.ts    # Cube layer detection logic
│   │   ├── gestureLayerDetection.ts  # Gesture-based layer detection
│   │   ├── feedbackHelpers.ts   # Visual feedback utilities
│   │   ├── debugLogger.ts       # Development logging
│   │   └── featureFlags.ts      # Feature toggle implementation
│   ├── store/              # Redux state management (future)
│   ├── styles/             # CSS and styling (future)
│   ├── App.tsx             # Root application component
│   └── index.tsx           # Application entry point
├── public/                 # Static assets
│   ├── index.html          # HTML shell
│   ├── favicon.ico         # Favicon
│   └── site.webmanifest    # PWA manifest
├── tests/                  # Frontend tests
│   ├── components/         # Component unit tests
│   ├── hooks/              # Custom hook tests
│   ├── utils/              # Utility function tests
│   ├── integration/        # Cross-component integration tests
│   ├── regression/         # Regression test suites
│   └── performance/        # Performance validation tests
├── webpack.config.js       # Webpack build configuration
└── package.json           # Dependencies: React, Three.js, all packages
```

**Purpose:** Main user-facing application that orchestrates all other packages into a cohesive user experience.

#### `packages/api-server/` - Backend Services (Future)
```
api-server/
├── src/
│   ├── controllers/        # API endpoint handlers
│   ├── services/           # Business logic services
│   ├── middleware/         # Express middleware
│   ├── database/           # Database connection and models
│   └── utils/              # Backend utilities
├── tests/                  # Backend tests
└── package.json           # Dependencies: Express, database drivers
```

**Purpose:** Future backend services for user accounts, statistics, and multiplayer features.

## Documentation Structure (`docs/`)

```
docs/
├── 📄 brief.md             # Project brief and overview
├── 📄 prd.md               # Product requirements document
├── 📄 architecture.md      # Main architecture document
├── 📁 architecture/        # Detailed architecture breakdown
│   ├── 1-introduction.md           # Project context and goals
│   ├── 2-high-level-architecture.md  # System overview
│   ├── 3-technology-stack.md       # Technology choices
│   ├── 10-frontend-architecture.md # Frontend deep dive
│   ├── 11-backend-architecture.md  # Backend planning
│   ├── 17-coding-standards.md      # Development standards
│   └── ...                         # Additional architecture docs
├── 📁 prd/                 # Product requirements breakdown
├── 📁 stories/             # User story specifications
├── 📁 qa/                  # Quality assurance gates
└── 📁 ux-ui-architecture/  # UX/UI design system
```

## Build & Development Tools (`tools/`)

```
tools/
├── 📁 webpack/             # Webpack configuration modules
│   ├── webpack.common.js   # Shared webpack configuration
│   ├── webpack.dev.js      # Development-specific config
│   └── webpack.prod.js     # Production optimizations
├── 📁 scripts/             # Build automation scripts
└── 📁 testing/             # Test configuration and utilities
```

## Deployment Configuration (`deploy/`)

```
deploy/
├── 📁 docker/              # Container definitions
│   ├── Dockerfile.frontend    # Frontend container
│   └── Dockerfile.backend     # Backend container
├── 📁 kubernetes/          # K8s deployment manifests
│   ├── frontend.yaml          # Frontend service
│   ├── backend.yaml           # Backend service
│   └── database.yaml          # Database configuration
├── 📁 scripts/             # Deployment automation
│   └── deploy.sh              # Main deployment script
└── 📁 monitoring/          # Monitoring configuration
    └── dashboard-config.json  # Monitoring dashboard setup
```

## Key Configuration Files

### Root Level Configurations

#### `package.json` - Monorepo Root
```json
{
  "name": "rubiks-cube",
  "workspaces": ["packages/*"],
  "scripts": {
    "build": "npm run build:types && npm run build:web",
    "dev": "cd packages/web-app && npm run start",
    "test": "lerna run test",
    "lint": "lerna run lint"
  }
}
```

#### `tsconfig.json` - Global TypeScript Configuration
Key features:
- Strict type checking for 3D mathematics safety
- Project references for incremental builds
- Path mapping for clean cross-package imports
- Performance optimization settings

#### `lerna.json` - Monorepo Management
```json
{
  "version": "1.0.0",
  "npmClient": "npm",
  "command": {
    "publish": {
      "conventionalCommits": true
    }
  }
}
```

## File Naming Conventions

### TypeScript Files
- **Components:** `PascalCase.tsx` (e.g., `CubeRenderer.tsx`)
- **Hooks:** `camelCase.ts` with 'use' prefix (e.g., `useCubeInteraction.ts`)  
- **Utilities:** `camelCase.ts` (e.g., `mathUtils.ts`)
- **Types:** `PascalCase.ts` with 'Types' suffix (e.g., `CubeTypes.ts`)
- **Tests:** `*.test.ts` or `*.test.tsx`

### Directory Naming
- **Lowercase with hyphens:** `three-renderer/`, `cube-engine/`
- **camelCase for subdirectories:** `src/components/`, `src/utils/`

## Import Path Strategy

### Cross-Package Imports
```typescript
// Clean imports using path mapping
import { CubeState } from '@rubiks-cube/cube-engine';
import { Vector3D } from '@rubiks-cube/shared';
import { FaceHighlighting } from '@rubiks-cube/three-renderer';
```

### Internal Package Imports
```typescript
// Relative imports within packages
import { mathUtils } from '../utils/mathUtils';
import { CUBE_COLORS } from '../constants/colors';
```

## Build Output Structure

### Development Mode
```
dist/
├── packages/
│   ├── shared/dist/        # Compiled shared utilities
│   ├── cube-engine/dist/   # Compiled cube logic
│   ├── three-renderer/dist/  # Compiled 3D components
│   └── web-app/dist/       # Webpack development build
```

### Production Mode
```
dist/web-app/
├── index.html              # Main application shell
├── static/
│   ├── js/
│   │   ├── main.[hash].js      # Application code
│   │   ├── three.[hash].js     # Three.js vendor bundle
│   │   └── vendors.[hash].js   # Other vendor libraries
│   └── css/
│       └── main.[hash].css     # Compiled styles
```

## Navigation Guidelines

### For New Developers
1. **Start with:** `docs/brief.md` for project overview
2. **Architecture:** `docs/architecture.md` for system understanding  
3. **Setup:** `CLAUDE.md` for development commands
4. **Coding:** `coding-standards.md` for development guidelines

### For Specific Tasks
- **3D Rendering Issues:** Focus on `packages/three-renderer/`
- **Cube Logic:** Work in `packages/cube-engine/`
- **UI Components:** Develop in `packages/web-app/src/components/`
- **Performance:** Check monitoring code in `packages/shared/monitoring/`

### Testing Strategy
- **Unit Tests:** Each package's `tests/` directory
- **Integration Tests:** `packages/web-app/tests/integration/`
- **Performance Tests:** `packages/web-app/tests/performance/`
- **Regression Tests:** `packages/web-app/tests/regression/`

This structure ensures clean separation of concerns, clear dependencies, and maintainable code organization as the project scales.