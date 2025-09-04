# 🎯 Rubik's Cube 3D - Quick Start Guide

A realistic 3D Rubik's Cube rendered in the browser using Three.js, React, and TypeScript.

## 🚀 Getting Started

### Prerequisites

- **Node.js** 18+ 
- **npm** 8+
- **Modern browser** with WebGL support (Chrome, Firefox, Safari, Edge)

### Installation & Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd rubiks-cube
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Bootstrap packages**
   ```bash
   npm run bootstrap
   ```

4. **Build all packages**
   ```bash
   npm run build
   ```

5. **Start the development server**
   ```bash
   npm run dev
   ```

6. **Open your browser**
   ```
   http://localhost:3000
   ```

## 🎮 What You'll See

- **3D Rubik's Cube** with authentic colors (white, red, blue, orange, green, yellow)
- **Interactive Visual Feedback** - Hover highlights, selection indicators, and rotation previews
- **Smart Move Validation** - Visual blocking of invalid moves during animations
- **Success Confirmation** - Green flash feedback when moves complete successfully
- **Directional Previews** - Arrow indicators showing rotation direction on hover and drag
- **Smooth rotation animation** showcasing the 3D effect
- **Loading progress indicator** during scene initialization
- **Performance metrics** (FPS counter in development mode)
- **Responsive design** that adapts to mobile devices

## 🏗️ Project Structure

```
rubiks-cube/
├── packages/
│   ├── web-app/              # React frontend application
│   │   ├── src/
│   │   │   ├── components/
│   │   │   │   ├── input/    # Interaction components
│   │   │   │   │   ├── MouseControls.tsx   # Mouse interaction handling
│   │   │   │   │   └── TouchControls.tsx   # Touch interaction handling
│   │   │   │   └── three/    # Three.js components
│   │   │   │       ├── ThreeScene.tsx               # Main scene container
│   │   │   │       ├── CubeRenderer.tsx            # 3D cube rendering
│   │   │   │       ├── CubeScene.tsx               # Integration component
│   │   │   │       ├── LoadingIndicator.tsx        # Loading UI
│   │   │   │       ├── ErrorBoundary.tsx           # Error handling
│   │   │   │       ├── RotationPreviewManager.tsx  # Arrow preview system
│   │   │   │       ├── MoveCompletionFeedback.tsx  # Success feedback
│   │   │   │       └── InvalidMovePreventionManager.tsx # Move validation
│   │   │   ├── hooks/        # Custom React hooks
│   │   │   └── utils/        # Utility functions
│   │   │   └── App.tsx
│   │   └── public/
│   ├── shared/               # Shared types and constants
│   ├── cube-engine/          # Cube logic engine
│   ├── three-renderer/       # 3D rendering utilities
│   └── api-server/           # Backend API
└── docs/                     # Documentation
```

## 🎨 Features

### ✅ Currently Implemented
- **3D Scene Rendering** - Three.js with WebGL
- **Realistic Cube** - 27 individual pieces with proper colors
- **Interactive Visual Feedback** - Complete visual feedback system with 7 distinct states
- **Face Selection Indicators** - Light blue highlights for hovered and selected faces
- **Rotation Direction Previews** - Arrow indicators showing move direction on hover/drag
- **Move Completion Feedback** - Green success flash when rotations complete
- **Invalid Move Prevention** - Red tint blocking with automatic conflict detection
- **Hover State Management** - Smooth opacity transitions for interactive elements
- **Visual Success Confirmation** - Brief highlighting effects for completed moves
- **Consistent Visual Language** - Standardized colors, timing, and animation patterns
- **Smooth Animation** - 60fps rotation performance maintained with visual feedback
- **Loading Experience** - Progress indicator with step feedback
- **Error Handling** - Graceful fallbacks for WebGL issues
- **Responsive Design** - Mobile-optimized scaling
- **Performance Monitoring** - Real-time FPS tracking

### 🚧 Future Enhancements
- Advanced solving algorithms and scramble generation
- Move history with undo/redo functionality
- Timer and scoring system for speedcubing
- Tutorial mode with guided interactions
- Multiplayer functionality
- Cube state persistence and sharing

## 🛠️ Development

### Available Scripts

```bash
# Development
npm run dev                # Start web app development server
npm run dev:api           # Start API server (future)

# Building
npm run build             # Build all packages
npm run build:types      # Build TypeScript types only
npm run build:web        # Build web app only

# Testing & Quality
npm test                  # Run all package tests
npm run lint              # Lint all packages
npm run lint:fix         # Auto-fix linting issues
npm run format           # Format code with Prettier

# Maintenance
npm run clean             # Clean all build artifacts
```

### Development Features

- **Hot Module Replacement** - Instant updates during development
- **TypeScript** - Full type safety across the codebase
- **Performance Metrics** - FPS counter and frame time monitoring
- **Error Boundaries** - Comprehensive error handling
- **WebGL Fallbacks** - Graceful degradation for unsupported browsers

## 🎯 Performance

### Benchmarks
- **Desktop**: 60fps at 1080p resolution
- **Mobile**: 30fps minimum on modern devices
- **Load Time**: <2 seconds initial load
- **Memory**: <100MB memory usage

### Optimization Features
- **Code Splitting** - Separate bundles for Three.js, React, and app code
- **Asset Optimization** - Minimized and compressed bundles
- **Device Adaptation** - Automatic quality adjustment for mobile
- **Pixel Ratio Handling** - Sharp rendering on high-DPI displays

## 🔧 Troubleshooting

### Common Issues

**"3D Rendering Error" message**
- Ensure your browser supports WebGL
- Update your graphics drivers
- Try a different browser (Chrome recommended)

**Slow performance**
- Close other browser tabs
- Check if hardware acceleration is enabled
- Mobile devices may run at reduced quality automatically

**Loading stuck at a percentage**
- Check browser console for errors
- Ensure stable internet connection
- Try refreshing the page

### Browser Compatibility

| Browser | Version | Status |
|---------|---------|--------|
| Chrome | 60+ | ✅ Fully Supported |
| Firefox | 60+ | ✅ Fully Supported |
| Safari | 12+ | ✅ Fully Supported |
| Edge | 79+ | ✅ Fully Supported |
| Mobile Safari | iOS 12+ | ✅ Touch Optimized |
| Chrome Mobile | Android 8+ | ✅ Touch Optimized |

## 📱 Mobile Experience

The application automatically adapts for mobile devices:
- **Smaller cube scale** (80% size)
- **Reduced rotation speed** for better visibility
- **Touch-friendly interface** with visual feedback system
- **Optimized performance** for mobile GPUs (30fps target)
- **Mobile-optimized visual feedback** with appropriate scaling and timing

## 🏗️ Architecture

### Technology Stack
- **Frontend**: React 18, TypeScript 5.9, Three.js 0.160, Webpack 5
- **3D Graphics**: Three.js with WebGL rendering
- **Build System**: Lerna monorepo with TypeScript project references
- **Development**: Hot reload, ESLint, Prettier, Jest testing
- **Performance**: Code splitting, lazy loading, optimized bundling

### Key Components
- **ThreeScene**: Main 3D scene management
- **CubeRenderer**: Cube geometry and materials
- **MouseControls**: Interactive mouse gesture handling with visual feedback integration
- **RotationPreviewManager**: Arrow-based rotation direction indicators
- **MoveCompletionFeedback**: Success confirmation system with green flash effects
- **InvalidMovePreventionManager**: Smart move validation with visual blocking
- **LoadingIndicator**: User feedback during initialization
- **ErrorBoundary**: Graceful error handling

## 📚 Learn More

- [Three.js Documentation](https://threejs.org/docs/)
- [React Documentation](https://react.dev/)
- [WebGL Fundamentals](https://webglfundamentals.org/)
- [Rubik's Cube Algorithms](https://www.speedsolving.com/)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

---

**Enjoy exploring the 3D Rubik's Cube! 🎯**