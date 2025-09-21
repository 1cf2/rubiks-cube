# iPhone Compatibility Extension Test Plan

## 1. Introduction
This test plan covers verification of the Rubik's Cube game's iPhone Safari compatibility extension, ensuring seamless touch gestures, responsive UI, and performance on iOS 14+ (iPhone 12+, SE). Testing aligns with SRS: 95%+ gesture accuracy, <100ms response, <3s load, FPS ≥30, WCAG AA accessibility.

Test Environment:
- Devices: iPhone Simulator (Xcode 15+), real devices (iPhone 12, 14, SE via BrowserStack).
- Browsers: Safari 14+.
- Tools: Jest (unit), Cypress (integration/E2E), Lighthouse (performance), Web Inspector (debug).
- Coverage Target: 80%+ code coverage for new/changed code.

Risks: Safari quirks (touch delay, orientation), performance on low-end devices. Mitigation: Real-device testing, throttling simulation.

## 2. Test Scope
- **In Scope**: Input unification (Pointer/Touch), gesture recognition (swipe, pinch), responsive layout, visual feedback, performance optimizations.
- **Out of Scope**: Backend API, desktop-only features, non-iOS mobile (Android).

## 3. Test Types & Strategy

### 3.1 Unit Tests (Jest)
Focus: Individual components/functions for gesture logic, detection, mapping.
- Coverage: useTouchGestures.ts, TouchInteractionHandler.ts, useMobileDetector.ts.
- Examples:
  - Test swipe detection: Simulate touchstart/move/end, assert RotationCommand generated with 95% accuracy (mock raycast).
  - Test pinch recognition: Simulate two pointers, assert camera zoom event.
  - Test device detection: Mock userAgent, assert isIPhone true for iPhone strings.
  - Test pointer normalization: Mock PointerEvent, assert unified interaction data.
- Run: `npm test -- --coverage` in web-app package.
- Target: 90% coverage, no regressions.

### 3.2 Integration Tests (Cypress)
Focus: End-to-end flows combining inputs, rendering, state updates.
- Scenarios:
  - Mobile detection: Load on simulated iPhone viewport, assert TouchControls rendered.
  - Unified input: Simulate pointerdown/move/up on canvas, assert face rotation triggered.
  - Orientation change: Rotate device, assert UI reorients without crash.
  - Gesture flow: Swipe on face → highlight → preview → rotate → feedback.
- Commands: Use Cypress viewport (375x667 for iPhone 12), touch simulation plugins.
- Run: `npx cypress run --spec "cypress/integration/mobile-input.spec.js"`.
- Target: All critical paths pass, <100ms event handling (measure with cy.clock).

### 3.3 Functional Tests
Focus: Feature validation on real/simulated iPhone.
- Test Cases:
  - TC1: Swipe on front face (left/right/up/down) → Correct 90° rotation (visual + state check).
  - TC2: Pinch in/out → Camera zoom (min/max distance).
  - TC3: Multi-touch rotate → Cube orientation change.
  - TC4: Invalid gesture (diagonal) → No action, visual cue.
  - TC5: Responsive layout: Portrait/landscape, buttons ≥44px.
  - TC6: Accessibility: Touch targets, ARIA labels, high-contrast mode.
  - TC7: Tutorial overlay: First mobile load, dismiss on tap.
- Tools: Manual on simulator, automated with Appium for touch.
- Pass Criteria: 95% gesture success rate (100 trials per type), no crashes.

### 3.4 Performance Tests (Lighthouse + Custom)
Focus: Mobile-specific metrics.
- Metrics:
  - Load time <3s (First Contentful Paint).
  - FPS ≥30 during interactions (Chrome DevTools Performance panel).
  - Memory <100MB (Heap snapshot).
  - CPU <50% during rotations (throttled to 4x slowdown for low-end simulation).
  - Battery impact: Monitor drain during 5min session.
- Tools: Lighthouse CI (mobile emulation), Web Vitals (CLS <0.1, LCP <2.5s).
- Run: `lighthouse . --view --chrome-flags="--emulate-mobile"`.
- Target: Mobile score ≥90, no regressions from baseline.

### 3.5 User Acceptance Testing (UAT)
Focus: Real-user validation.
- Participants: 5 internal (devs), 5 external (puzzle enthusiasts).
- Scenarios:
  - Solve 3-layer cube using touch gestures.
  - Switch orientation mid-session.
  - Use on low battery/low signal.
- Feedback: Survey on usability (SUS score ≥80), bug reports.
- Duration: 1 week, via TestFlight or BrowserStack.
- Pass Criteria: 90% satisfaction, <5 critical bugs.

## 4. Test Cases Summary
| ID | Type | Description | Priority | Status |
|----|------|-------------|----------|--------|
| UT-1 | Unit | Swipe gesture mapping | High | Planned |
| IT-1 | Integration | Unified pointer/touch flow | High | Planned |
| FT-1 | Functional | Swipe rotation accuracy | High | Planned |
| PT-1 | Performance | Load time on iPhone SE | High | Planned |
| UAT-1 | UAT | Full game session | Medium | Planned |

Total: 20 unit, 10 integration, 15 functional, 5 performance, 5 UAT.

## 5. Entry/Exit Criteria
- Entry: Code merged, build passes on iOS simulator.
- Exit: All high-priority tests pass, coverage ≥80%, no P0 bugs, UAT approval.
- Defect Classification: P0 (crash), P1 (functional break), P2 (UX issue), P3 (minor).

## 6. Schedule
- Week 1: Unit/Integration setup and execution.
- Week 2: Functional/Performance on devices, UAT recruitment.
- Report: Test summary with metrics, bugs logged in GitHub Issues.

Version: 1.0 | Date: 2025-09-21