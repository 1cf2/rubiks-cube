# 6. Progressive Tutorial System Design

## Learning Path Architecture

**Level 1: First Contact (2-3 minutes)**
```
Step 1: "Welcome! This is your 3D Rubik's Cube"
       - Show static solved cube
       - Gentle auto-rotation for 3D effect

Step 2: "Try touching a face to select it"
       - Highlight any face on hover/touch
       - Celebration micro-animation on first selection

Step 3: "Now drag to rotate that face"
       - Guide user through first face rotation
       - Show directional arrows
```

**Level 2: Control Mastery (3-5 minutes)**
```
Step 4: "Try rotating the whole cube"
       - Demonstrate cube orientation vs face rotation
       - Practice both gesture types

Step 5: "Let's scramble your cube!"
       - Introduce scramble button
       - Show scrambling animation
```

**Level 3: Solving Concepts (5-10 minutes)**
```
Step 6: "Understanding cube notation"
       - Show face letters (F, B, L, R, U, D)
       - Interactive notation practice

Step 7: "Your first solving attempt"
       - Activate hint system
       - Guide through cross formation
```

## Tutorial UI Components

**Overlay System**
```css
.tutorial-overlay {
  position: fixed;
  background: rgba(0,0,0,0.8);
  backdrop-filter: blur(4px);
  z-index: 1000;
}

.tutorial-spotlight {
  /* Highlight target areas */
  box-shadow: 0 0 0 9999px rgba(0,0,0,0.8);
  border-radius: 8px;
}

.tutorial-tooltip {
  position: absolute;
  background: white;
  border-radius: 12px;
  padding: 16px;
  max-width: 280px;
  animation: slideInFromBottom 0.3s ease-out;
}
```
