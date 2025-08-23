# Local Development Setup Walkthrough

## Complete Development Environment Setup

### Prerequisites Verification

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

#### macOS Setup

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

#### Windows Setup

```bash
# Using Windows Subsystem for Linux (WSL2) - Recommended
wsl --install

# Or using Chocolatey
choco install nodejs --version=18.17.0

# Or download from nodejs.org
```

#### Ubuntu/Debian Setup

```bash
# Update package list
sudo apt update

# Install Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install build tools
sudo apt-get install -y build-essential
```

## Project Setup

### 1. Repository Clone and Initial Setup

```bash
# Clone the repository
git clone <repository-url>
cd rubiks-cube

# Verify project structure
ls -la
# Should see: packages/, docs/, package.json, lerna.json, etc.

# Check current git branch
git branch
# Should show: * main
```

### 2. Dependency Installation

```bash
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

### 3. Build Verification

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

## Development Server Setup

### 1. Web Development Server

```bash
# Start web app development server
npm run dev

# Server should start on port 8082
# Output should show:
# "webpack-dev-server started on http://localhost:8082"
# "Compiled successfully"
```

#### Troubleshooting Web Server Issues

```bash
# If port 8082 is in use
lsof -ti:8082
kill -9 <PID>

# Or specify different port
cd packages/web-app
PORT=3000 npm start

# Check webpack configuration
cd packages/web-app
npx webpack --config webpack.config.js --mode development
```

### 2. API Server (Optional)

```bash
# In a new terminal window
npm run dev:api

# Server should start on port 3001
# Output: "API server listening on port 3001"
```

### 3. Development Environment Verification

Open browser to `http://localhost:8082` and verify:

- ✅ Cube renders in 3D
- ✅ Mouse interaction works (click and drag)
- ✅ Face highlighting appears on hover
- ✅ Console shows no errors
- ✅ Performance monitor shows stable FPS

## IDE Configuration

### Visual Studio Code Setup

#### Recommended Extensions

```json
// .vscode/extensions.json
{
  "recommendations": [
    "ms-typescript.typescript",
    "esbenp.prettier-vscode",
    "ms-vscode.vscode-eslint",
    "bradlc.vscode-tailwindcss",
    "ms-vscode.vscode-json"
  ]
}
```

#### Workspace Settings

```json
// .vscode/settings.json
{
  "typescript.preferences.importModuleSpecifier": "relative",
  "typescript.suggest.autoImports": true,
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "eslint.workingDirectories": [
    "packages/cube-engine",
    "packages/three-renderer", 
    "packages/web-app",
    "packages/shared",
    "packages/api-server"
  ],
  "typescript.preferences.includePackageJsonAutoImports": "on",
  "files.associations": {
    "*.tsx": "typescriptreact",
    "*.ts": "typescript"
  }
}
```

#### Debug Configuration

```json
// .vscode/launch.json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Debug Web App",
      "type": "node",
      "request": "launch",
      "program": "${workspaceFolder}/packages/web-app/node_modules/.bin/webpack-dev-server",
      "args": ["--config", "webpack.config.js"],
      "cwd": "${workspaceFolder}/packages/web-app",
      "console": "integratedTerminal"
    },
    {
      "name": "Debug Tests",
      "type": "node",
      "request": "launch",
      "program": "${workspaceFolder}/node_modules/.bin/jest",
      "args": ["--runInBand"],
      "console": "integratedTerminal",
      "internalConsoleOptions": "neverOpen"
    }
  ]
}
```

### IntelliJ IDEA / WebStorm Setup

```javascript
// Enable TypeScript service
// Settings → Languages & Frameworks → TypeScript
// TypeScript service: Enabled
// Use project TypeScript version

// Configure code style
// Settings → Editor → Code Style → TypeScript
// Import Prettier configuration

// Set up run configurations
// Add configuration → npm
// Command: run
// Scripts: dev
```

## Development Workflow

### 1. Making Code Changes

```bash
# Work on specific package
cd packages/web-app

# Make changes to source files
# TypeScript files: src/**/*.ts, src/**/*.tsx
# Test files: tests/**/*.test.ts

# Watch mode for automatic rebuilding
npm run build:watch  # In package directory
# Or from root:
npx lerna run build:watch --stream
```

### 2. Testing Workflow

```bash
# Run all tests
npm test

# Run tests for specific package
cd packages/cube-engine
npm test

# Run tests in watch mode
npm test -- --watch

# Run tests with coverage
npm test -- --coverage

# View coverage report
open coverage/lcov-report/index.html
```

### 3. Code Quality Checks

```bash
# Run linting
npm run lint

# Fix linting issues automatically
npm run lint:fix

# Check code formatting
npm run format:check

# Format all code
npm run format
```

## Hot Reload and Development Features

### 1. Webpack Hot Module Replacement

The web app supports hot reloading:

```javascript
// webpack.config.js includes:
{
  devServer: {
    hot: true,           // Enable hot reloading
    liveReload: true,    // Fallback to live reload
    watchFiles: ['src/**/*'] // Watch source files
  }
}
```

### 2. TypeScript Incremental Compilation

```json
// tsconfig.json includes:
{
  "compilerOptions": {
    "incremental": true,          // Enable incremental compilation
    "tsBuildInfoFile": ".tsbuildinfo" // Cache build info
  }
}
```

### 3. Package Development Workflow

When working on multiple packages:

```bash
# Terminal 1: Build types continuously
npm run build:types -- --watch

# Terminal 2: Web app development
npm run dev

# Terminal 3: Run tests continuously
npm test -- --watch

# Terminal 4: Available for other commands
```

## Performance Monitoring During Development

### 1. Browser DevTools Setup

Enable performance monitoring:

```javascript
// Add to browser console for detailed metrics
performance.mark('start');
// ... after cube renders
performance.mark('end');
performance.measure('cube-render', 'start', 'end');
console.log(performance.getEntriesByName('cube-render'));
```

### 2. Memory Leak Detection

```javascript
// Monitor Three.js memory usage
console.log('Geometries:', renderer.info.memory.geometries);
console.log('Textures:', renderer.info.memory.textures);
console.log('Programs:', renderer.info.programs.length);
```

### 3. Frame Rate Monitoring

```javascript
// Add FPS counter
const stats = new Stats();
document.body.appendChild(stats.dom);

function animate() {
  stats.begin();
  // Rendering code
  stats.end();
  requestAnimationFrame(animate);
}
```

## Common Development Issues

### 1. TypeScript Module Resolution

```bash
# Issue: Cannot find module '@rubiks-cube/...'
# Solution: Rebuild types and restart TypeScript service
npm run build:types
# In VS Code: Ctrl+Shift+P → "TypeScript: Restart TS Server"
```

### 2. WebGL Context Issues

```javascript
// Issue: WebGL context lost
// Add to renderer setup:
renderer.domElement.addEventListener('webglcontextlost', (event) => {
  event.preventDefault();
  console.log('WebGL context lost - reloading');
  window.location.reload();
});
```

### 3. Memory Leaks During Development

```bash
# Issue: High memory usage after multiple hot reloads
# Solution: Proper cleanup in development
# Check for undisposed geometries, textures, and event listeners
```

### 4. CORS Issues with Local Assets

```javascript
// webpack.dev.js configuration
{
  devServer: {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
      'Access-Control-Allow-Headers': 'X-Requested-With, content-type, Authorization'
    }
  }
}
```

## Environment Variables Setup

### 1. Development Environment

```bash
# Create .env.development in project root
NODE_ENV=development
DEBUG=true
WEBPACK_DEV_SERVER_HOST=localhost
WEBPACK_DEV_SERVER_PORT=8082
API_BASE_URL=http://localhost:3001
WEBGL_DEBUG=true
PERFORMANCE_MONITORING=true
```

### 2. Local Testing Environment

```bash
# Create .env.test.local
NODE_ENV=test
DEBUG=false
API_BASE_URL=http://localhost:3001
HEADLESS_BROWSER=true
```

## Package-Specific Development

### 1. Cube Engine Development

```bash
cd packages/cube-engine

# Run unit tests continuously
npm test -- --watch

# Performance benchmarks
npm run benchmark

# Algorithm testing
npm run test:algorithms
```

### 2. Three.js Renderer Development

```bash
cd packages/three-renderer

# Visual regression testing
npm run test:visual

# Performance testing
npm run test:performance

# WebGL compatibility testing
npm run test:webgl
```

### 3. Web App Development

```bash
cd packages/web-app

# Component testing
npm test -- --watch

# Integration testing
npm run test:integration

# E2E testing with Cypress
npm run cypress:open
```

## Docker Development Environment (Optional)

### 1. Development Container

```dockerfile
# Dockerfile.dev
FROM node:18-alpine

WORKDIR /app
COPY package*.json ./
COPY lerna.json ./
COPY packages/*/package*.json ./packages/*/

RUN npm install
COPY . .

EXPOSE 8082 3001
CMD ["npm", "run", "dev"]
```

### 2. Docker Compose for Development

```yaml
# docker-compose.dev.yml
version: '3.8'
services:
  dev:
    build:
      context: .
      dockerfile: Dockerfile.dev
    ports:
      - "8082:8082"
      - "3001:3001"
    volumes:
      - .:/app
      - /app/node_modules
    environment:
      - NODE_ENV=development
```

```bash
# Start development environment
docker-compose -f docker-compose.dev.yml up

# Attach to container for debugging
docker-compose exec dev sh
```

This comprehensive setup ensures a robust development environment with proper tooling, hot reloading, and debugging capabilities.