// Math types
export type {
  Vector2,
  Vector3D,
  Quaternion,
  Matrix4,
  PerformanceCritical,
  CubeOperationResult,
} from './math';

export { CubeError } from './math';

// Cube types
export type {
  StickerState,
  FaceState,
  CubeState,
  Move,
  MoveSequence,
  AnimationState,
} from './cube';

export { CubeColor, FacePosition } from './cube';

// Mouse interaction types
export type {
  MousePosition,
  MouseDelta,
  FaceIntersection,
  DragGesture,
  RotationCommand,
  CubeAnimation,
  AnimationQueue,
  VisualFeedback,
  MouseInteractionState,
  PerformanceMetrics,
  RaycastOptions,
  GestureRecognitionOptions,
  AnimationOptions,
} from './mouse-interactions';

export { 
  RotationDirection,
  CursorState,
} from './mouse-interactions';

// Touch interaction types
export type {
  TouchInteraction,
  TouchGesture,
  MobileInputState,
  TouchOperationResult,
  TouchPerformanceCritical,
  AccessibleTouchTarget,
  TouchParameters,
  TouchGestureType,
  AccessibilityResult,
  GestureDirection,
} from './touch-interactions';

export { TouchError } from './touch-interactions';

// Camera control types
export type {
  CameraState,
  CameraAnimation,
  CameraAnimationType,
  EasingFunction,
  ViewPreferences,
  CameraOperationResult,
  AutoRotationConfig,
  CameraGestureType,
  CameraGestureParameters,
  DeviceCameraConfig,
  CameraConstraints,
  CameraPerformanceMetrics,
  CameraInputEvent,
} from './camera-controls';

export { CameraError } from './camera-controls';

// Face adjacency types
export {
  AdjacencyState,
} from './face-adjacency';

export type {
  FaceAdjacencyRelationship,
  FaceEdge,
  FaceAdjacencyDetectorOptions,
  FaceReferenceState,
  AdjacencyDetectionResult,
  FaceReferenceTrackerState,
  FaceReferenceTrackerOptions,
  FaceSelectionEvent,
  FaceReferenceTrackerResult,
} from './face-adjacency';
