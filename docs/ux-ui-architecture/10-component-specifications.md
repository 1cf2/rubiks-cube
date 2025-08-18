# 10. Component Specifications

## Core UI Components

**Timer Display Component**
```
Design: Monospace font, large size, high contrast
Behavior: Updates every 100ms, pauses on solve
States: Running (blue), Paused (orange), Completed (green)
Responsive: Full size on desktop, compact on mobile
Accessibility: Screen reader announces time milestones
```

**Cube Stats Panel**
```
Layout: Horizontal on desktop, stacked on mobile
Content: Current time, move count, best time, session average
Animation: Count-up animation for number changes
Performance: Update only on state change, not every frame
```

**Settings Panel**
```
Design: Slide-out drawer from right edge
Sections: Difficulty, Visual, Audio, Accessibility
Responsive: Full overlay on mobile, sidebar on desktop
Persistence: Save all settings to localStorage
```

## 3D Specific Components

**Face Selection Indicator**
```css
.face-selected {
  /* Highlight with border overlay */
  box-shadow: inset 0 0 0 3px rgba(255,255,255,0.8);
  animation: faceHighlight 0.2s ease-out;
}
```

**Rotation Direction Preview**
```css
.rotation-preview {
  /* Arrow indicators on face edges */
  border: 2px solid #0A84FF;
  border-radius: 50%;
  width: 24px;
  height: 24px;
  animation: rotatePreview 0.5s ease-in-out infinite;
}
```
