# Technical Assumptions

## Repository Structure: Monorepo
Single repository containing frontend, backend, and shared utilities for simplified dependency management and coordinated releases. Separate packages for cube logic, 3D rendering, and API services with shared TypeScript definitions and common utilities.

## Service Architecture
**Monolith with microservice-ready design:** Initial monolithic Node.js/Express backend with modular architecture that can evolve to microservices. Frontend is SPA (Single Page Application) with Three.js for 3D rendering, React for UI components, and WebSocket integration for future real-time features. Database layer abstracted for easy scaling from local development to cloud deployment.

## Testing Requirements
**Unit + Integration testing pyramid:** Jest for unit tests covering cube logic and utility functions, React Testing Library for component testing, Cypress for end-to-end user interaction flows. Performance testing for 3D rendering across device spectrum, cross-browser compatibility testing for WebGL support, and load testing for concurrent user scenarios.

## Additional Technical Assumptions and Requests

**Frontend Technology Stack:**
- **Three.js/WebGL** for 3D cube rendering and animation with performance optimization
- **React 18** with hooks for UI component management and state handling  
- **TypeScript** for type safety across cube logic, 3D mathematics, and API interfaces
- **Webpack** for bundling with optimization for 3D assets and code splitting
- **CSS Modules/Styled Components** for responsive styling without framework dependencies

**Backend and Infrastructure:**
- **Node.js with Express** for REST API, session management, and future WebSocket support
- **PostgreSQL** for user statistics and progress tracking with Redis for session caching
- **Docker containers** for consistent development and deployment environments
- **CDN integration** for optimized delivery of 3D assets and static resources
- **Auto-scaling cloud infrastructure** (AWS/Vercel) with graceful degradation for high traffic

**Development and Deployment:**
- **Git workflow** with feature branches, automated testing, and deployment pipelines
- **Environment configuration** for development, staging, and production with different performance targets
- **Analytics integration** (Google Analytics) for user behavior tracking and performance monitoring
- **Error tracking and logging** system for 3D rendering issues and cross-browser compatibility problems

**Security and Compliance:**
- **HTTPS enforcement** across all environments with secure session management
- **COPPA compliance** for educational users with appropriate data handling and privacy controls  
- **Content Security Policy** optimized for WebGL and Three.js requirements
- **Input validation and sanitization** for user preferences and cube state data
