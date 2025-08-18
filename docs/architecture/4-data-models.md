# 4. Data Models

## Core Business Entities

```typescript
// Cube State Representation
interface CubeState {
  faces: FaceState[6];
  moveHistory: Move[];
  isScrambled: boolean;
  isSolved: boolean;
  timestamp: number;
}

interface FaceState {
  face: CubeFace; // 'front' | 'back' | 'left' | 'right' | 'up' | 'down'
  colors: CubeColor[9]; // 3x3 grid of colors
  rotation: number; // Current rotation in radians
}

interface Move {
  face: CubeFace;
  direction: RotationDirection; // 'clockwise' | 'counterclockwise' | 'double'
  timestamp: number;
  duration: number;
}

// User Session and Progress
interface UserSession {
  id: string;
  currentCube: CubeState;
  timer: SessionTimer;
  statistics: SessionStats;
  preferences: UserPreferences;
}

interface SessionStats {
  moveCount: number;
  currentTime: number;
  personalBests: PersonalBest[];
  averageTime: number;
  solvesCount: number;
}

interface PersonalBest {
  time: number;
  moves: number;
  difficulty: DifficultyLevel;
  date: Date;
  scrambleSeed: string;
}

// 3D Rendering State
interface RenderState {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  cubeGroup: THREE.Group;
  animationState: AnimationState;
  performanceMetrics: PerformanceMetrics;
}

interface AnimationState {
  isAnimating: boolean;
  currentAnimation: CubeAnimation | null;
  queue: CubeAnimation[];
  frameRate: number;
}
```

---
