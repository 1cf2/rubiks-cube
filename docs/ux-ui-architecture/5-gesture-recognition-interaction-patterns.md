# 5. Gesture Recognition & Interaction Patterns

## Input Method Hierarchy

**Desktop Mouse Controls**
- **Primary**: Left click + drag for face rotation
- **Secondary**: Right click + drag for cube orientation
- **Tertiary**: Mouse wheel for zoom
- **Modifier**: Shift + actions for advanced modes

**Mobile Touch Controls**
- **Primary**: Single finger drag for face rotation
- **Secondary**: Two finger drag for cube orientation  
- **Tertiary**: Pinch for zoom
- **Long Press**: Context menu access

## Gesture Recognition Algorithm

```javascript
// Pseudo-code for gesture interpretation
class GestureRecognizer {
  detectIntent(startPoint, currentPoint, velocity) {
    const distance = calculateDistance(startPoint, currentPoint);
    const angle = calculateAngle(startPoint, currentPoint);
    
    if (distance < FACE_ROTATION_THRESHOLD) {
      return interpretFaceRotation(angle, velocity);
    } else {
      return interpretCubeRotation(angle, velocity);
    }
  }
  
  interpretFaceRotation(angle, velocity) {
    // Snap to 90-degree increments
    // Provide rotation preview
    // Validate legal move
  }
}
```

## Visual Feedback System

**Hover/Touch States**
- Face highlighting with 20% opacity overlay
- Rotation direction arrows on drag start
- Snap indicators at 90-degree positions

**Animation Timing**
- Face rotation: 200ms ease-out
- Cube orientation: 300ms ease-in-out
- UI transitions: 150ms ease-out
- Loading states: Pulsing animation at 1.5s intervals
