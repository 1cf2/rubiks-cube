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

3. **Build all packages**
   ```bash
   npx lerna run build
   ```

4. **Start the development server**
   ```bash
   cd packages/web-app
   npm start
   ```

5. **Open your browser**
   ```
   http://localhost:8080
   ```

## 🎮 What You'll See

- **3D Rubik's Cube** with authentic colors (white, red, blue, orange, green, yellow)
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
│   │   │   │   └── three/    # Three.js components
│   │   │   │       ├── ThreeScene.tsx      # Main scene container
│   │   │   │       ├── CubeRenderer.tsx    # 3D cube rendering
│   │   │   │       ├── CubeScene.tsx       # Integration component
│   │   │   │       ├── LoadingIndicator.tsx # Loading UI
│   │   │   │       └── ErrorBoundary.tsx   # Error handling
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
- **Smooth Animation** - 60fps rotation performance
- **Loading Experience** - Progress indicator with step feedback
- **Error Handling** - Graceful fallbacks for WebGL issues
- **Responsive Design** - Mobile-optimized scaling
- **Performance Monitoring** - Real-time FPS tracking

### 🚧 Coming Soon
- Interactive cube manipulation
- Scrambling and solving algorithms
- Move history and undo/redo
- Timer and scoring system
- Tutorial mode

## 🛠️ Development

### Available Scripts

```bash
# Development server
npm start                    # Start web app dev server

# Building
npm run build               # Build web app for production
npx lerna run build        # Build all packages

# Testing
npm test                   # Run tests
npm run test:coverage     # Run tests with coverage

# Linting
npm run lint              # Check code style
npm run lint:fix          # Auto-fix linting issues
```

### Development Features

- **Hot Module Replacement** - Instant updates during development
- **TypeScript** - Full type safety across the codebase
- **Performance Metrics** - FPS counter and frame time monitoring
- **Error Boundaries** - Comprehensive error handling
- **WebGL Fallbacks** - Graceful degradation for unsupported browsers

## 🎯 Performance

### Benchmarks
- **Bundle Size**: ~598KB total (Three.js: 451KB, React: 132KB, App: 13KB)
- **Loading Time**: <2 seconds on modern browsers
- **Frame Rate**: 60fps on desktop, 30fps on mobile
- **Memory Usage**: <100MB desktop, <75MB mobile

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

- ✅ **Chrome** 80+ (Recommended)
- ✅ **Firefox** 75+
- ✅ **Safari** 13+
- ✅ **Edge** 80+
- ❌ Internet Explorer (not supported)

## 📱 Mobile Experience

The application automatically adapts for mobile devices:
- **Smaller cube scale** (80% size)
- **Reduced rotation speed** for better visibility
- **Touch-friendly interface** (coming soon)
- **Optimized performance** for mobile GPUs

## 🏗️ Architecture

### Technology Stack
- **Frontend**: React 18 + TypeScript
- **3D Rendering**: Three.js + WebGL
- **Build Tool**: Webpack 5
- **Package Manager**: Lerna (monorepo)
- **Testing**: Jest + React Testing Library

### Key Components
- **ThreeScene**: Main 3D scene management
- **CubeRenderer**: Cube geometry and materials
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