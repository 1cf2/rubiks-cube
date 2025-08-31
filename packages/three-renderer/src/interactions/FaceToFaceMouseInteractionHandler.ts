import * as THREE from 'three';
import {
  MousePosition,
  FacePosition,
  VisualFeedback,
  CubeOperationResult,
  CubeError,
  PerformanceMetrics,
  RotationCommand,
  RotationDirection,
  FaceAdjacencyRelationship,
  AdjacencyState,
} from '@rubiks-cube/shared/types';

// Import new face-to-face interaction components
import { FaceAdjacencyDetector } from './FaceAdjacencyDetector';
import { FaceReferenceTracker } from './FaceReferenceTracker';
import { RotationVectorCalculator } from './RotationVectorCalculator';

/**
 * Extended MouseInteractionHandler that adds face-to-face drag interaction logic
 * Builds upon the existing MouseInteractionHandler functionality
 */
export class FaceToFaceMouseInteractionHandler {
  private adjacencyDetector: FaceAdjacencyDetector;
  private referenceTracker: FaceReferenceTracker;
  private rotationVectorCalculator: RotationVectorCalculator;

  private scene: THREE.Scene;
  private camera: THREE.Camera;
  private renderer: THREE.WebGLRenderer;
  private cubeGroup: THREE.Group;

  // Face-to-face interaction state
  private isFaceToFaceMode = false;
  private lastAdjacencyCheck = 0;
  private adjacencyCheckFrequency = 16; // Check every 16ms (~60fps)

  constructor(scene: THREE.Scene, camera: THREE.Camera, renderer: THREE.WebGLRenderer, cubeGroup: THREE.Group) {
    this.scene = scene;
    this.camera = camera;
    this.renderer = renderer;
    this.cubeGroup = cubeGroup;

    // Initialize face-to-face interaction components
    this.initializeFaceToFaceSystem();
  }

  /**
   * Initialize the face-to-face interaction system
   */
  private initializeFaceToFaceSystem(): void {
    // Configure adjacency detector with performance optimizations
    this.adjacencyDetector = new FaceAdjacencyDetector({
      adjacencyThreshold: 1.1, // Faces within 1.1 units are adjacent
      diagonalThreshold: 1.6,  // Faces within 1.6 units are diagonal
      strictLayerValidation: true,
      faceCenterCache: true
    });

    // Configure reference tracker with reasonable timeouts
    this.referenceTracker = new FaceReferenceTracker({
      validityTimeout: 3000, // 3 second timeout
      maximumDragDistance: 3.0, // Reasonable drag distance limit
      hysteresisThreshold: 0.01, // Small movement threshold
      trackingEnabled: true
    });

    // Configure rotation calculator with right-hand rule enabled
    this.rotationVectorCalculator = new RotationVectorCalculator({
      useRightHandRule: true,
      perpendicularTolerance: 5.0, // 5 degree tolerance
      minimumTorqueAngle: 15.0, // 15 degree minimum
      maximumTorqueAngle: 165.0, // 165 degree maximum
      calculationThreshold: 0.001 // Small threshold for axis calculations
    });
  }

  /**
   * Handle face selection (Face A selection)
   */
  handleFaceSelection(
    face: FacePosition,
    position: readonly [number, number, number],
    normal: readonly [number, number, number],
    timestamp: number = performance.now()
  ): CubeOperationResult<boolean> {
    try {
      const selectionResult = this.referenceTracker.handleFaceSelection({
        face,
        position,
        normal,
        timestamp,
        confidence: 1.0
      });

      if (!selectionResult.success) {
        return {
          success: false,
          error: CubeError.INVALID_MOVE,
          message: 'Failed to initialize face reference tracking'
        };
      }

      // Enable face-to-face mode
      this.isFaceToFaceMode = true;

      return { success: true, data: true };
    } catch (error) {
      return {
        success: false,
        error: CubeError.WEBGL_CONTEXT_LOST,
        message: error instanceof Error ? error.message : 'Face selection failed'
      };
    }
  }

  /**
   * Handle drag updates for face-to-face interaction
   */
  handleDragUpdate(
    currentPosition: readonly [number, number, number]
  ): CubeOperationResult<{
    canRotate: boolean;
    rotationCommand: RotationCommand | null;
    adjacencyState: AdjacencyState;
    validFaces: FacePosition[];
  }> {
    try {
      // Update reference tracker first
      const updateResult = this.referenceTracker.handleDragUpdate(currentPosition);

      if (!updateResult.success) {
        return {
          success: true,
          data: {
            canRotate: false,
            rotationCommand: null,
            adjacencyState: AdjacencyState.NON_ADJACENT,
            validFaces: []
          }
        };
      }

      const trackerState = this.referenceTracker.getState();

      if (!trackerState.isActive || !trackerState.referenceFace || !trackerState.isValidForRotation) {
        return {
          success: true,
          data: {
            canRotate: false,
            rotationCommand: null,
            adjacencyState: AdjacencyState.NON_ADJACENT,
            validFaces: []
          }
        };
      }

      // Throttle adjacency checks for performance
      const now = performance.now();
      if (now - this.lastAdjacencyCheck > this.adjacencyCheckFrequency) {
        this.lastAdjacencyCheck = now;
      } else {
        return {
          success: true,
          data: this.createDefaultDragResult()
        };
      }

      // Check which faces are near the current drag position
      const validAdjacencies = this.findValidAdjacentFaces(trackerState);

      return {
        success: true,
        data: {
          canRotate: validAdjacencies.length > 0,
          rotationCommand: validAdjacencies.length > 0 ? this.createRotationCommand(trackerState, validAdjacencies[0]) : null,
          adjacencyState: validAdjacencies.length > 0 ? AdjacencyState.ADJACENT : AdjacencyState.NON_ADJACENT,
          validFaces: validAdjacencies
        }
      };

    } catch (error) {
      return {
        success: false,
        error: CubeError.RAYCASTING_FAILED,
        message: error instanceof Error ? error.message : 'Drag update failed'
      };
    }
  }

  /**
   * Find valid adjacent faces for the current drag position
   */
  private findValidAdjacentFaces(trackerState: any): FacePosition[] {
    // This is a simplified implementation - in practice, you'd raycast
    // to find which face is under the cursor at currentPosition
    const currentPosition = trackerState.currentDragPoint;
    if (!currentPosition) return [];

    // For now, return a mock adjacent face - this would need proper raycasting
    return [];
  }

  /**
   * Create rotation command for valid face adjacency
   */
  private createRotationCommand(trackerState: any, targetFace: FacePosition): RotationCommand | null {
    const referenceState = {
      selectedFace: trackerState.referenceFace,
      selectionTime: trackerState.selectionTime,
      position: trackerState.initialSelectionPoint || [0, 0, 0],
      normal: trackerState.faceNormal || [0, 0, 1],
      dragDistance: trackerState.dragDistance,
      isValid: trackerState.isValidForRotation
    };

    const relationship = this.adjacencyDetector.detectAdjacency(trackerState.referenceFace, targetFace);
    const rotationResult = this.rotationVectorCalculator.calculateFaceToFaceRotation(
      referenceState,
      relationship
    );

    if (rotationResult.canRotate && rotationResult.rotationCommand) {
      // Mark that we found a valid adjacency
      this.referenceTracker.confirmValidAdjacency();
      return rotationResult.rotationCommand;
    }

    return null;
  }

  /**
   * Create default drag result
   */
  private createDefaultDragResult() {
    return {
      canRotate: false,
      rotationCommand: null,
      adjacencyState: AdjacencyState.NON_ADJACENT,
      validFaces: [] as FacePosition[]
    };
  }

  /**
   * Handle completion of face-to-face gesture
   */
  handleGestureComplete(): CubeOperationResult<boolean> {
    try {
      // Clear tracking state
      this.referenceTracker.clearTracking();
      this.isFaceToFaceMode = false;

      return { success: true, data: true };
    } catch (error) {
      return {
        success: false,
        error: CubeError.INVALID_MOVE,
        message: error instanceof Error ? error.message : 'Gesture completion failed'
      };
    }
  }

  /**
   * Get current face-to-face interaction state
   */
  getFaceToFaceState() {
    return {
      isActive: this.isFaceToFaceMode,
      referenceState: this.referenceTracker.getState(),
      lastAdjacencyCheck: this.lastAdjacencyCheck
    };
  }

  /**
   * Update visual feedback for face-to-face interaction
   */
  updateFaceToFaceVisualFeedback(currentPosition: readonly [number, number, number]): VisualFeedback[] {
    const trackerState = this.referenceTracker.getState();
    const feedback: VisualFeedback[] = [];

    if (trackerState.isActive && trackerState.referenceFace) {
      // Highlight reference face (Face A)
      feedback.push({
        face: trackerState.referenceFace,
        state: 'selected',
        opacity: 0.6,
        color: [1.0, 0.8, 0.2], // Orange for selected
        emissiveIntensity: 0.15
      });

      // Find and highlight valid adjacent faces
      const validFaces = this.findValidAdjacentFaces(trackerState);

      for (const face of validFaces) {
        feedback.push({
          face,
          state: 'preview',
          opacity: 0.3,
          color: [0.3, 0.7, 1.0], // Light blue for adjacent
          emissiveIntensity: 0.1
        });
      }
    }

    return feedback;
  }

  /**
   * Dispose of face-to-face interaction resources
   */
  dispose(): void {
    // Additional cleanup if needed
    this.referenceTracker.reset();
    this.isFaceToFaceMode = false;
  }
}