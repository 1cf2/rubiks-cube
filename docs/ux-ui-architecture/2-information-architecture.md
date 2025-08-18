# 2. Information Architecture

## Primary Views Hierarchy

```
Main Application
├── Game View (Primary)
│   ├── 3D Cube Canvas (Full screen)
│   ├── Minimal UI Overlay
│   │   ├── Timer/Moves Display
│   │   ├── Quick Actions (Reset, Scramble)
│   │   └── Settings Access
│   └── Contextual Help System
├── Tutorial Overlay System
│   ├── Introduction Flow
│   ├── Control Learning
│   ├── Notation Guide
│   └── Solving Methods
├── Settings Panel (Slide-out)
│   ├── Difficulty Settings
│   ├── Visual Preferences
│   ├── Accessibility Options
│   └── Performance Settings
└── Statistics Modal
    ├── Session Stats
    ├── Personal Records
    └── Progress Tracking
```

## Content Priority Matrix

| Priority | Desktop | Tablet | Mobile |
|----------|---------|---------|---------|
| **Critical** | 3D Cube, Basic Controls | 3D Cube, Touch Controls | 3D Cube, Simplified Controls |
| **Important** | Timer/Stats, Tutorial Access | Timer/Stats, Settings | Timer Display |
| **Optional** | Advanced Stats, Hints | Hints System | Quick Reset |
| **Hidden** | Debug Info, Performance | Debug Info | Advanced Settings |
