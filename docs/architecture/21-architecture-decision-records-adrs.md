# 21. Architecture Decision Records (ADRs)

## ADR-001: Three.js Over Custom WebGL
**Decision**: Use Three.js instead of custom WebGL implementation
**Rationale**: 
- Faster development velocity for complex 3D operations
- Mature ecosystem with performance optimizations
- Better cross-browser compatibility handling
- Extensive documentation and community support

**Trade-offs**: Slightly larger bundle size vs. development speed and reliability

## ADR-002: Monorepo Structure with Lerna
**Decision**: Use Lerna-managed monorepo instead of separate repositories
**Rationale**:
- Shared TypeScript types between frontend and backend
- Coordinated releases and dependency management
- Code reuse for cube logic across packages
- Simplified development workflow

**Trade-offs**: Initial setup complexity vs. long-term maintainability

## ADR-003: Redux Toolkit for UI State, Custom Engine for Cube State
**Decision**: Separate state management systems for different concerns
**Rationale**:
- UI state benefits from time-travel debugging and DevTools
- Cube state requires mathematical precision and performance
- Different update patterns and requirements
- Easier testing and reasoning about state changes

**Trade-offs**: Multiple state systems vs. specialized optimization

## ADR-004: Progressive Web App (PWA) Architecture
**Decision**: Build as PWA with offline capabilities
**Rationale**:
- Educational environments may have unreliable network
- Improved mobile experience with app-like behavior
- Local storage for user progress and preferences
- Service worker for asset caching and performance

**Trade-offs**: Additional complexity vs. user experience benefits

---
