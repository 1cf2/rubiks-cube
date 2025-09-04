# 3D Rubik's Cube - Interactive Web Game

A high-performance, browser-based 3D Rubik's Cube game built with modern web technologies. Features realistic 3D rendering, intuitive mouse/touch controls, and smooth animations that deliver an authentic cube-solving experience.

![Rubik's Cube Demo](docs/demo-screenshot.png)

## 🎮 Features

- **Realistic 3D Rendering** - Powered by Three.js for smooth 60fps performance
- **Intuitive Controls** - Natural mouse drag and touch gestures for face rotations
- **Smart Interaction** - Intelligent face detection and rotation preview
- **Cross-Platform** - Works seamlessly on desktop, tablet, and mobile devices
- **Performance Optimized** - Maintains 60fps on modern browsers with WebGL support
- **Proper Cube Physics** - Authentic Rubik's cube rotation mechanics

## 🚀 Quick Start

### Prerequisites

Before starting, ensure your system meets the requirements:

```bash
# Check Node.js version (requires 18+)
node --version  # Should show v18.x.x or higher

# Check npm version
npm --version   # Should show 8.x.x or higher

# Check git installation
git --version

# Verify WebGL support in browser
# Open browser console and run:
# !!window.WebGLRenderingContext
```

### System-Specific Setup

#### macOS
```bash
# Install Xcode Command Line Tools (if not already installed)
xcode-select --install

# Install Homebrew (if not already installed)
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Install Node.js via Homebrew
brew install node@18

# Verify installation
which node
node --version
```

#### Windows
```bash
# Using Windows Subsystem for Linux (WSL2) - Recommended
wsl --install

# Or using Chocolatey
choco install nodejs --version=18.17.0

# Or download from nodejs.org
```

#### Ubuntu/Debian
```bash
# Update package list
sudo apt update

# Install Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install build tools
sudo apt-get install -y build-essential
```

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd rubiks-cube

# Install root dependencies and bootstrap packages
npm install

# Verify Lerna installation
npx lerna --version

# Bootstrap all packages (links local dependencies)
npm run bootstrap

# Verify package linking
ls -la node_modules/@rubiks-cube/
# Should show: cube-engine, three-renderer, shared, web-app, api-server
```

### Build Verification

```bash
# Build TypeScript types first (required for other builds)
npm run build:types

# Verify type compilation
ls -la packages/*/dist/
# Each package should have dist/ directory with .d.ts files

# Build all packages
npm run build

# Check build output
ls -la packages/web-app/dist/
# Should contain: index.html, bundle files, assets/
```

### Development Server

```bash
# Start web app development server
npm run dev

# Server should start on port 8082
# Output should show:
# "webpack-dev-server started on http://localhost:8082"
# "Compiled successfully"
```

Open http://localhost:8082 in your browser to start playing!

### Production Build

```bash
# Build all packages
npm run build

# The built web app will be in packages/web-app/dist/
```

## 🏗️ Architecture

This is a TypeScript monorepo managed with Lerna, consisting of 5 specialized packages:

### Package Structure

```
packages/
├── web-app/          # React frontend application
├── three-renderer/   # 3D rendering engine (Three.js)
├── cube-engine/      # Core cube logic and state management
├── shared/           # Shared TypeScript types and utilities
└── api-server/       # Node.js backend (future API endpoints)
```

### Technology Stack

- **Frontend**: React 18, TypeScript 5.9, Three.js 0.160, Webpack 5
- **3D Graphics**: Three.js with WebGL rendering
- **Build System**: Lerna monorepo with TypeScript project references
- **Development**: Hot reload, ESLint, Prettier, Jest testing
- **Performance**: Code splitting, lazy loading, optimized bundling

## 🎯 How to Play

1. **Rotate the Cube**: Click and drag on empty space to rotate the entire cube
2. **Select a Face**: Click on any face to highlight it
3. **Rotate a Face**: Drag horizontally or vertically on a selected face to rotate it
4. **Visual Feedback**: 
   - Blue highlight = face hover
   - Orange highlight = face selected
   - Red highlight = face rotating

### Controls

- **Mouse**: Click and drag for all interactions
- **Touch**: Tap and drag (mobile/tablet optimized)
- **Face Rotation**: Drag direction determines rotation direction
- **Cube Rotation**: Drag on non-face areas to rotate entire cube

## 🔧 Development

### Available Commands

```bash
# Development
npm run dev                    # Start web app development server
npm run dev:api               # Start API server (future)

# Building
npm run build                 # Build all packages
npm run build:types          # Build TypeScript types only
npm run build:web            # Build web app only

# Testing & Quality
npm test                      # Run all package tests
npm run lint                  # Lint all packages
npm run lint:fix             # Auto-fix linting issues
npm run format               # Format code with Prettier

# Maintenance
npm run clean                 # Clean all build artifacts
```

### Package-Specific Development

```bash
# Work on individual packages
cd packages/web-app && npm start     # React dev server
cd packages/three-renderer && npm test   # Run renderer tests
cd packages/cube-engine && npm run build # Build engine only
```

### Development Workflow

1. **Making Changes**: Work in individual package directories for focused development
2. **Cross-Package Changes**: Use root-level commands to build/test all packages
3. **TypeScript Updates**: Run `npm run build:types` after type changes
4. **Testing**: Each package has comprehensive test suites

## 📱 Performance & Compatibility

### Performance Targets

- **Desktop**: 60fps at 1080p resolution
- **Mobile**: 30fps minimum on modern devices
- **Load Time**: <2 seconds initial load
- **Memory**: <100MB memory usage

### Browser Support

| Browser | Version | Status |
|---------|---------|--------|
| Chrome | 60+ | ✅ Fully Supported |
| Firefox | 60+ | ✅ Fully Supported |
| Safari | 12+ | ✅ Fully Supported |
| Edge | 79+ | ✅ Fully Supported |
| Mobile Safari | iOS 12+ | ✅ Touch Optimized |
| Chrome Mobile | Android 8+ | ✅ Touch Optimized |

## 🧩 Key Components

### Core Systems

- **FaceRotationAnimator** - Handles authentic face rotation mechanics
- **MouseInteractionHandler** - Processes mouse gestures and face selection
- **TouchInteractionHandler** - Optimized touch controls for mobile
- **StateManager** - Manages cube state and move validation
- **OrbitCameraManager** - Controls 3D camera positioning

### Recent Improvements

- ✅ Fixed cube rotation mechanics - faces now rotate as cohesive groups
- ✅ Improved face detection and piece mapping after rotations
- ✅ Enhanced position snapping for precise cube alignment
- ✅ Optimized performance for smooth 60fps rendering

## 🤝 Contributing

### Development Setup

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes in the appropriate package
4. Ensure tests pass: `npm test`
5. Commit with descriptive messages
6. Push to your fork and submit a Pull Request

### Code Standards

- **TypeScript**: Strict type checking enabled
- **ESLint**: Enforced coding standards
- **Prettier**: Consistent code formatting
- **Testing**: Comprehensive test coverage required
- **Performance**: Maintain 60fps target

### Package Guidelines

- **cube-engine**: Pure TypeScript logic, no external dependencies
- **three-renderer**: Three.js components, WebGL optimizations
- **web-app**: React components, UI interactions
- **shared**: Common types and utilities
- **api-server**: Future backend functionality

## 📚 Documentation

### Project Documentation

- [Project Brief](docs/brief.md) - Complete project overview and goals
- [Technical Architecture](docs/architecture.md) - Detailed system design
- [UX/UI Architecture](docs/ux-ui-architecture.md) - Design patterns and user experience
- [Development Guide](CLAUDE.md) - Developer instructions and patterns

### API Documentation

- Package-specific documentation in each `packages/*/README.md`
- TypeScript interfaces document all public APIs
- Inline code documentation follows JSDoc standards

## 🐛 Troubleshooting

### Common Issues

**Performance Issues**
- Ensure WebGL is enabled in browser settings
- Check for browser extensions blocking WebGL
- Try incognito/private browsing mode

**Control Problems**
- Clear browser cache and reload
- Ensure JavaScript is enabled
- Check console for error messages

**Build Issues**
- Run `npm run clean` and rebuild
- Ensure Node.js 16+ is installed
- Delete `node_modules` and run `npm install`

### Getting Help

1. Check existing [GitHub Issues](link-to-issues)
2. Review [documentation](docs/)
3. Create a new issue with:
   - Browser version and OS
   - Console error messages
   - Steps to reproduce

## 📄 License

This project is licensed under the ISC License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Three.js** - 3D graphics library
- **React** - UI framework
- **TypeScript** - Type safety and developer experience
- **Lerna** - Monorepo management
- **WebGL** - Hardware-accelerated 3D rendering

---

**Built with ❤️ for puzzle enthusiasts and 3D web technology**

For more information, visit our [documentation](docs/) or check out the [live demo](link-to-demo).