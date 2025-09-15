// Three.js renderer package exports
export { FaceHighlighting } from './interactions/FaceHighlighting';
export { RotationPreview } from './effects/RotationPreview';
export { FaceRotationAnimator } from './animations/FaceRotationAnimator';
export { MouseInteractionHandler } from './interactions/MouseInteractionHandler';
export { TouchInteractionHandler } from './interactions/TouchInteractionHandler';
export { MobileFaceHighlighting } from './interactions/MobileFaceHighlighting';
export { OrbitCameraManager } from './cameras/OrbitCameraManager';
export { CameraInputProcessor } from './controls/CameraInputProcessor';
export { FaceToFaceMouseInteractionHandler } from './interactions/FaceToFaceMouseInteractionHandler';

// Re-export types that might be useful
export type { FaceHighlightingOptions } from './interactions/FaceHighlighting';
export type { RotationPreviewOptions, ArrowPreview } from './effects/RotationPreview';
export type { FaceRotationAnimatorOptions, RotationAnimationConfig } from './animations/FaceRotationAnimator';