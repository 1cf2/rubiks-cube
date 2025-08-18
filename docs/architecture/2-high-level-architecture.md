# 2. High Level Architecture

## Platform Architecture
**Single Page Application (SPA)** with Three.js 3D rendering core, React UI layer, and Node.js backend for statistics and session management.

## Repository Structure: Monorepo
```
rubiks-cube/
├── packages/
│   ├── cube-engine/          # Core cube logic and state management
│   ├── three-renderer/       # Three.js rendering and 3D operations
│   ├── web-app/             # React frontend application
│   ├── api-server/          # Node.js/Express backend
│   └── shared/              # Shared TypeScript types and utilities
├── tools/                   # Build tools and scripts
├── docs/                    # Architecture and API documentation
└── deploy/                  # Docker and deployment configurations
```

## Architectural Patterns
- **Component-Based Architecture**: React components for UI, Three.js objects for 3D elements
- **State Management**: Redux Toolkit for UI state, custom engine for cube state
- **Observer Pattern**: Event-driven cube state changes and rendering updates
- **Strategy Pattern**: Multiple input handlers (mouse, touch, keyboard)
- **Factory Pattern**: Scene and geometry creation based on device capabilities

---
