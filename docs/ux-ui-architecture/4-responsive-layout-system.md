# 4. Responsive Layout System

## Breakpoint Strategy

**Mobile First Approach with Performance Scaling**

```css
/* Mobile: 320-767px */
.cube-container {
  viewport: 100vh - 60px; /* Account for browser UI */
  controls: touch-optimized;
  ui-density: minimal;
  performance: reduced-quality;
}

/* Tablet: 768-1023px */
.cube-container {
  viewport: 80vh;
  controls: touch + gesture;
  ui-density: standard;
  performance: medium-quality;
}

/* Desktop: 1024px+ */
.cube-container {
  viewport: 70vh;
  controls: mouse + keyboard;
  ui-density: full;
  performance: high-quality;
}
```

## Layout Grid System

**Desktop Layout (1024px+)**
```
┌─────────────────────────────────────┐
│ [Settings] [Timer: 00:45] [Moves: 23] │ 60px header
├─────────────────────────────────────┤
│                                     │
│            3D CUBE CANVAS           │ Main area
│              (720x720)              │ Square aspect
│                                     │
├─────────────────────────────────────┤
│ [Reset] [Scramble] [Hint] [Help]    │ 60px footer
└─────────────────────────────────────┘
```

**Mobile Layout (320-767px)**
```
┌─────────────────┐
│ ⚙️  00:45  23   │ 50px compact header
├─────────────────┤
│                 │
│   3D CUBE       │ Square, fills width
│   (300x300)     │ Touch optimized
│                 │
├─────────────────┤
│ 🔄 🎲 💡       │ 44px icon bar
└─────────────────┘
```
