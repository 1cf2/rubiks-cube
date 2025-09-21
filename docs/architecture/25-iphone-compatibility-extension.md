
# iPhone Compatibility Extension Design Document

## 1. Executive Summary
This document outlines the design for extending the Rubik's Cube game to support iPhone Safari (iOS 14+), focusing on touch gesture recognition, responsive UI, and performance optimizations. The goal is seamless cross-platform experience (desktop + mobile) with 95%+ gesture accuracy, <100ms response time, and <3s load time on iPhone 12+.

Current state: Desktop mouse support is mature; basic touch infrastructure exists but lacks iPhone-specific mappings, unification, and optimizations.

Estimated timeline: 1 week (design/approval), 4-6 weeks (development), 1-2 weeks (testing). Total: 6-9 weeks.
Cost estimate: $15,000-$25,000 (based on 300-450 dev hours at $50/hr; includes testing on real devices).
Dependencies: Three.js v0.150+, iOS Simulator/Xcode, Safari Developer Tools; no new external libs (use native APIs).

## 2. Software Requirements Specification (SRS)

### 2.1 Functional Requirements
- **FR1: Input Unification** - Support hybrid mouse/touch via Pointer Events API. Map desktop drags to mobile swipes; enable Face-to-Face mode on touch (two-finger drag between faces).
- **FR2: Gesture Recognition** - Recognize single-touch swipes (90° rotations), two-finger pinches (camera zoom), multi-touch rotations (cube orientation). Accuracy ≥95%; support iOS gestures (prevent zoom/scroll conflicts).
- **FR3: Responsive UI** - Auto-detect iPhone (user-agent + screen size); adapt layout for 320-414px widths, portrait/landscape. Include touch-friendly buttons (≥44px), loading indicators.
- **FR4: Visual Feedback** - Mirror desktop highlights/previews on touch; add haptic feedback via Vibration API (if permitted).
- **FR5: Core Gameplay Preservation** - No changes to cube logic (cube-engine); rotations via existing API.
- **FR6: Accessibility** - WCAG 2.1 AA: 44px touch targets, screen reader labels, high-contrast modes.

### 2.2 Non-Functional Requirements
- **NFR1: Performance** - FPS ≥30 on iPhone SE (2020); memory <100MB; load <3s. Optimize raycasting (throttle to 60Hz), use requestIdleCallback for non-critical tasks.
- **NFR2: Compatibility** - iOS 14+ Safari; test on iPhone 12/13/14/SE. Fallback to basic controls on older iOS.
- **NFR3: Security** - Prevent touch event injection; no user data collection beyond analytics.
- **NFR4: Usability** - Consistent UX: Swipe on face = rotate; pinch = zoom. Tutorial overlay for mobile users.
- **NFR5: Maintainability** - Modular changes: Extend existing handlers (Mouse/TouchInteractionHandler); use feature flags for mobile mode.

### 2.3 Use Cases
- UC1: User swipes on front face → 90° clockwise rotation.
- UC2: Two-finger pinch → Camera zoom in/out.
- UC3: Landscape rotation → UI reorients without restart.
- UC4: Invalid gesture (e.g., diagonal swipe) → Visual cue, no action.

## 3. Architecture Design

### 3.1 High-Level Overview
The extension builds on existing monorepo structure:
- **Input Layer** (web-app/src/components/input/): Unified InputManager.tsx wraps MouseControls and TouchControls; detects device via `navigator.userAgent` and `window.matchMedia`.
- **Gesture Processor** (three-renderer/src/interactions/): Extend TouchInteractionHandler with PointerEvent support; integrate Hammer.js alternatives (native) for advanced gestures.
- **Rendering Layer** (three-renderer/): Add mobile-specific OrbitControls (touch-enabled); optimize Canvas with `devicePixelRatio`.
- **UI Layer** (web-app/src/): CSS Grid/Flexbox for responsive; media queries (@media (max-width: 414px)).
- **State Management** (cube-engine/): No changes; input events trigger existing StateManager.

### 3.2 Component Diagram (Mermaid)
```mermaid
graph TD
    A[User Input<br/>(Mouse/Touch/Pointer)] --> B[Unified InputManager<br/>(Detect Device)]
    B --> C[Gesture Mapper<br/>(Swipe/Pinch/Rotate)]
    C --> D[Raycaster<br/>(Face Detection)]
    D --> E[Visual Feedback<br/>(Highlights/Preview)]
    C --> F[Rotation Command<br/>(to CubeEngine)]
    F --> G[State Update<br/>(Animation)]
    H[Responsive UI<br/>(Media Queries)] --> B
    I[Performance Monitor<br/>(Throttle Raycasts)] --> D
    J[iOS Optimizations<br/>(Touch-Action CSS)] --> A
```

### 3.3 Data Flow
1. PointerEvent → Normalize to shared TouchGesture type.
2. Raycast → FacePosition + direction.
3. Validate → Execute rotation via CubeState.
4. Animate → Update scene + feedback.

### 3.4 Changes to Existing Components
- MouseControls-Enhanced.tsx: Add `pointerdown/move/up` listeners; fallback to touch on mobile.
- TouchControls.tsx: Enhance for multi-touch; integrate with FaceToFace.
- useTouchGestures.ts: Add pinch/rotate recognition; iOS velocity adjustments.
- New: MobileDetector hook; ResponsiveWrapper component.

## 4. Technical Selection Report

### 4.1 Input Handling
- **Primary: Native Pointer Events API** - Unified mouse/touch/pen; polyfill not needed (Safari 14+ support). Pros: No deps, performant. Cons: Manual gesture parsing.
- **Alternative: Hammer.js** - If native insufficient for complex gestures (e.g., rotate). But prefer native to avoid bundle size (+20KB).
- **iOS Specific: Touch Events** - Fallback for Pointer; use `touch-action: none` CSS to prevent scrolling/zoom.

### 4.2 UI Framework
- **CSS Media Queries + Flexbox** - For responsive layout. Breakpoints: 320px (iPhone SE), 375px (iPhone 12), 414px (iPhone 14 Pro Max).
- **Viewport Meta**: `<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">` to prevent zoom.
- **Orientation Handling**: `window.addEventListener('orientationchange')` for lock/reorient.

### 4.3 Performance Tools
- **Three.js Extras**: Use `DeviceOrientationControls` for gyro (optional future).
- **Optimization**: `renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))`; LOD for distant pieces.
- **Testing**: Safari Web Inspector; Lighthouse for mobile audits.

### 4.4 Risks & Mitigations
- Risk: Touch latency (300ms click delay) → Mitigation: FastClick polyfill or Pointer Events.
- Risk: Gesture conflicts (e.g., browser back swipe) → Mitigation: `preventDefault()` on capture.
- Risk: Battery drain → Mitigation: Pause animations on visibilitychange.

## 5. Prototype Mockups

### 5.1 UI Layout (Portrait iPhone)
```
+-------------------+
|     [Reset]       |  <- 44px touch button
|                   |
|     [Cube Canvas] |  <- Full width/height, touch-action: none
|     (Responsive)  |
|                   |
| [Tutorial Overlay]|  <- Swipe to dismiss
| "Swipe to rotate" |
+-------------------+
```
- Canvas