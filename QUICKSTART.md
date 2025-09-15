# 🚀 Quick Start Guide: 3D Rubik's Cube Game

Get up and running with the HTML 3D Rubik's Cube game in under 5 minutes!

## ⚡ Prerequisites (30 seconds)

- **Node.js ≥18**: Required for npm workspaces and Lerna
- **Modern Web Browser**: Chrome 60+, Firefox 60+, Safari 12+, or Edge 79+ (any with WebGL support)
- **Git**: For repository management

```bash
node --version  # Should show v18.x.x or higher
```

## 📦 Installation & Setup (2 minutes)

### 1. Clone & Install Dependencies

```bash
git clone <repository-url>
cd rubiks-cube
npm install
```

### 2. Install Dependencies & Link Packages

The `npm install` command automatically links all packages together using npm workspaces (no
bootstrap needed).

## 🎮 Run the Game (1 minute)

### Start Development Server

```bash
npm run dev
```

### 🎯 Verify Everything Works

1. Open browser to `http://localhost:8082`
2. ✅ You should see: **3D Rubik's cube rendering**
3. ✅ **Mouse interaction** works (click and drag to rotate)
4. ✅ **Face highlighting** appears when hovering over cube faces
5. ✅ **No console errors** in browser DevTools

## 🛠️ Development Workflow

### Core Commands

```bash
# Full build (types + web bundle)
npm run build

# Just build TypeScript types
npm run build:types

# Run all tests
npm test

# Lint and format code
npm run lint
npm run format
```

### Package Structure

```
📁 packages/
├── cube-engine/    # Core cube logic & state (pure TypeScript)
├── three-renderer/ # 3D Three.js rendering & interactions
├── web-app/        # React frontend with HMR at localhost:8082
├── shared/         # Common types & utilities
└── api-server/     # Node.js backend (Express)
```

### Making Changes

```bash
# Edit files in any package - hot reloads automatically
# Cross-package imports: @rubiks-cube/package-name
# Build types after TypeScript changes
npm run build:types
```

## 🔧 Troubleshooting

| Issue               | Solution                                                      |
| ------------------- | ------------------------------------------------------------- |
| Port 8082 in use    | `npm run dev` will show available ports                       |
| Types not resolving | Run `npm run build:types`                                     |
| Performance issues  | Check browser WebGL support: `!!window.WebGLRenderingContext` |
| Build fails         | Run `npm run clean` then `npm install && npm run build`       |

## 📚 Key Features

- 🎯 **60fps 3D rendering** with Three.js/WebGL
- 🖱️ **Intuitive mouse controls** for cube manipulation
- 🖌️ **Real-time face highlighting** and visual feedback
- 📱 **Cross-platform compatibility** (desktop + mobile)
- 🔧 **Interactive tutorial system** for new players
- 📊 **Move tracking & timer** with local storage

## 🎯 Performance Targets

- **Desktop**: 60fps at 1080p resolution
- **Mobile**: 30fps minimum on modern devices
- **Load Time**: <2 seconds initial load
- **Memory**: <100MB memory usage

## 🔗 Links

- **📖 Full Setup Guide**: [#/docs/LOCAL_DEVELOPMENT.md](docs/LOCAL_DEVELOPMENT.md)
- **📋 Project Overview**: [#/docs/brief.md](docs/brief.md)
- **🏗️ Technical Architecture**: [#/docs/architecture.md](docs/architecture.md)
- **⚡ Performance Guide**: [#/docs/PERFORMANCE_OPTIMIZATION.md](docs/PERFORMANCE_OPTIMIZATION.md)

## 🚀 Ready to Dive Deeper?

- **Getting started with development?** → Check `docs/LOCAL_DEVELOPMENT.md` for comprehensive setup
- **Understanding the codebase?** → Read `docs/architecture.md` for technical details
- **Performance optimization tips?** → See `docs/PERFORMANCE_OPTIMIZATION.md`

---

**Happy cubing! 🧩** Need help? Check the docs folder or ask in chat. </content> </xai:function_call
kwietavanaugh
