# 8. Visual Design System

## Color Palette

**Cube Colors (Standard Rubik's)**
- White: #FFFFFF
- Red: #FF3B30
- Blue: #007AFF  
- Orange: #FF9500
- Green: #34C759
- Yellow: #FFCC00

**UI Colors**
- Background: #1A1A1A (Dark theme primary)
- Surface: #2D2D2D
- Text Primary: #FFFFFF
- Text Secondary: #ADADAD
- Accent: #0A84FF
- Success: #32D74B
- Warning: #FF9F0A
- Error: #FF453A

## Typography Scale

```css
:root {
  /* Major Third Scale (1.25) */
  --font-size-xs: 0.64rem;   /* 10px */
  --font-size-sm: 0.8rem;    /* 13px */
  --font-size-base: 1rem;    /* 16px */
  --font-size-lg: 1.25rem;   /* 20px */
  --font-size-xl: 1.563rem;  /* 25px */
  --font-size-2xl: 1.953rem; /* 31px */
  --font-size-3xl: 2.441rem; /* 39px */
}

.font-system {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 
               Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
}
```

## Component Design Tokens

**Spacing System (8px base)**
```css
:root {
  --space-1: 0.25rem; /* 4px */
  --space-2: 0.5rem;  /* 8px */
  --space-3: 0.75rem; /* 12px */
  --space-4: 1rem;    /* 16px */
  --space-5: 1.25rem; /* 20px */
  --space-6: 1.5rem;  /* 24px */
  --space-8: 2rem;    /* 32px */
  --space-10: 2.5rem; /* 40px */
  --space-12: 3rem;   /* 48px */
}
```

**Border Radius**
```css
:root {
  --radius-sm: 4px;  /* Buttons, inputs */
  --radius-md: 8px;  /* Cards, panels */
  --radius-lg: 12px; /* Modals, overlays */
  --radius-xl: 16px; /* Major containers */
}
```

## Animation & Micro-interactions

**Performance-Conscious Animation Strategy**
- Use `transform` and `opacity` only for 60fps performance
- Prefer CSS animations over JavaScript for simple transitions
- Implement `will-change` strategically for 3D transforms

**Core Animation Library**
```css
/* Cube face highlight */
@keyframes faceHighlight {
  0% { opacity: 0; }
  100% { opacity: 0.2; }
}

/* Success celebration */
@keyframes solveSuccess {
  0% { transform: scale(1); }
  50% { transform: scale(1.05); }
  100% { transform: scale(1); }
}

/* Loading pulse */
@keyframes loadingPulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}
```
