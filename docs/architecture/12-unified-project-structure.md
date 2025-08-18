# 12. Unified Project Structure

## Monorepo Organization

```
rubiks-cube/
├── packages/
│   ├── cube-engine/              # Shared cube logic
│   │   ├── src/
│   │   │   ├── core/            # Core cube state management
│   │   │   ├── algorithms/      # Solving and scrambling algorithms
│   │   │   ├── validation/      # Move and state validation
│   │   │   └── types/           # TypeScript type definitions
│   │   ├── tests/               # Comprehensive cube logic tests
│   │   └── package.json
│   │
│   ├── three-renderer/          # 3D rendering engine
│   │   ├── src/
│   │   │   ├── scene/           # Scene setup and management
│   │   │   ├── geometry/        # Cube geometry optimization
│   │   │   ├── materials/       # Performance-tuned materials
│   │   │   ├── animations/      # Smooth transition system
│   │   │   └── performance/     # Frame rate optimization
│   │   ├── tests/               # 3D rendering tests
│   │   └── package.json
│   │
│   ├── web-app/                 # React frontend application
│   │   ├── src/
│   │   │   ├── components/      # React component library
│   │   │   ├── hooks/           # Custom hooks for 3D integration
│   │   │   ├── store/           # Redux state management
│   │   │   ├── styles/          # Responsive CSS and themes
│   │   │   └── utils/           # Frontend utilities
│   │   ├── public/              # Static assets and PWA manifest
│   │   ├── tests/               # Component and integration tests
│   │   └── package.json
│   │
│   ├── api-server/              # Node.js backend services
│   │   ├── src/
│   │   │   ├── controllers/     # REST API endpoints
│   │   │   ├── services/        # Business logic services
│   │   │   ├── middleware/      # Express middleware
│   │   │   ├── database/        # PostgreSQL and Redis integration
│   │   │   └── utils/           # Backend utilities
│   │   ├── tests/               # API and service tests
│   │   └── package.json
│   │
│   └── shared/                  # Common utilities and types
│       ├── src/
│       │   ├── types/           # Shared TypeScript interfaces
│       │   ├── constants/       # Application constants
│       │   ├── utils/           # Cross-platform utilities
│       │   └── validation/      # Shared validation schemas
│       ├── tests/               # Shared utility tests
│       └── package.json
│
├── tools/                       # Development and build tools
│   ├── webpack/                 # Webpack configurations
│   ├── scripts/                 # Build and deployment scripts
│   └── testing/                 # Testing utilities and setup
│
├── docs/                        # Documentation and architecture
│   ├── architecture.md          # This document
│   ├── api-documentation.md     # API specifications
│   ├── performance-guide.md     # Performance optimization guide
│   └── deployment-guide.md      # Deployment instructions
│
├── deploy/                      # Deployment configurations
│   ├── docker/                  # Docker container definitions
│   ├── kubernetes/              # K8s deployment manifests
│   └── scripts/                 # Deployment automation
│
├── .github/                     # GitHub Actions workflows
│   └── workflows/               # CI/CD pipeline definitions
│
├── package.json                 # Root package configuration
├── lerna.json                   # Monorepo management
├── tsconfig.json               # TypeScript configuration
└── README.md                   # Project overview
```

---
