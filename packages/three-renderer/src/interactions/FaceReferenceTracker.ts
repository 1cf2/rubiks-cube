import * as THREE from 'three';
import {
  FacePosition,
  FaceReferenceTrackerState,
  FaceReferenceTrackerOptions,
  FaceSelectionEvent,
  FaceReferenceTrackerResult
} from '@rubiks-cube/shared/types';

export class FaceReferenceTracker {
  private state: FaceReferenceTrackerState;
  private options: FaceReferenceTrackerOptions;
  private lastUpdateTime: number;
  private dragStartPosition: THREE.Vector3 | null = null;

  constructor(options: FaceReferenceTrackerOptions = {
    validityTimeout: 3000, // 3 seconds
    maximumDragDistance: 5.0, // Allow generous drag distances
    hysteresisThreshold: 0.01, // Small changes don't trigger updates
    trackingEnabled: true
  }) {
    this.options = options;
    this.lastUpdateTime = performance.now();
    this.state = this.createDefaultState();
  }

  /**
   * Get the current tracking state
   */
  getState(): FaceReferenceTrackerState {
    return { ...this.state };
  }

  /**
   * Handle face selection event (mousedown/onMouseDown)
   */
  handleFaceSelection(event: FaceSelectionEvent): FaceReferenceTrackerResult {
    if (!this.options.trackingEnabled) {
      return {
        success: false,
        state: this.state,
        canProceed: false,
        operation: 'none'
      };
    }

    this.updateTimestamp();

    // Create new reference state
    const newState: FaceReferenceTrackerState = {
      isActive: true,
      referenceFace: event.face,
      initialSelectionPoint: event.position,
      faceNormal: event.normal,
      selectionTime: event.timestamp,
      dragDistance: 0,
      currentDragPoint: event.position,
      isValidForRotation: true,
      hasValidAdjacency: false
    };

    // Store drag start position for distance calculations
    this.dragStartPosition = new THREE.Vector3(...event.position);
    this.state = newState;

    return {
      success: true,
      state: this.state,
      canProceed: true,
      operation: 'select'
    };
  }

  /**
   * Update tracking state during drag motion (mousemove)
   */
  handleDragUpdate(currentPosition: readonly [number, number, number]): FaceReferenceTrackerResult {
    if (!this.state.isActive || !this.options.trackingEnabled) {
      return {
        success: false,
        state: this.state,
        canProceed: false,
        operation: 'none'
      };
    }

    if (!this.dragStartPosition) {
      return this.handleFaceSelection({
        face: this.state.referenceFace!,
        position: currentPosition,
        normal: this.state.faceNormal!,
        timestamp: performance.now(),
        confidence: 1.0
      });
    }

    this.updateTimestamp();

    // Calculate drag distance
    const currentPos = new THREE.Vector3(...currentPosition);
    const dragDistance = this.dragStartPosition.distanceTo(currentPos);

    // Check hysteresis threshold to prevent excessive updates
    const minimalChange = Math.abs(dragDistance - this.state.dragDistance);
    if (minimalChange < this.options.hysteresisThreshold) {
      return {
        success: false,
        state: this.state,
        canProceed: false,
        operation: 'none'
      };
    }

    // Check maximum drag distance validation
    const isValidDistance = dragDistance <= this.options.maximumDragDistance;

    const newState: FaceReferenceTrackerState = {
      ...this.state,
      dragDistance,
      currentDragPoint: currentPosition,
      isValidForRotation: isValidDistance
    };

    this.state = newState;

    return {
      success: true,
      state: this.state,
      canProceed: isValidDistance,
      operation: 'update'
    };
  }

  /**
   * Clear tracking state (mouseup/mouseleave/onMouseUp)
   */
  clearTracking(): FaceReferenceTrackerResult {
    this.updateTimestamp();

    this.state = {
      ...this.state,
      isActive: false,
      currentDragPoint: null,
      dragDistance: 0,
      hasValidAdjacency: false,
      isValidForRotation: false
    };

    // Keep reference face for potential re-use, but mark as inactive
    this.state = {
      ...this.state,
      isActive: false
    };

    return {
      success: true,
      state: this.state,
      canProceed: false,
      operation: 'clear'
    };
  }

  /**
   * Check validity timeout (should be called periodically)
   */
  checkTimeout(): FaceReferenceTrackerResult {
    if (!this.state.isActive) {
      return {
        success: false,
        state: this.state,
        canProceed: false,
        operation: 'none'
      };
    }

    const currentTime = performance.now();
    const timeSinceLastUpdate = currentTime - this.lastUpdateTime;

    if (timeSinceLastUpdate > this.options.validityTimeout) {
      return this.clearTracking();
    }

    return {
      success: true,
      state: this.state,
      canProceed: false,
      operation: 'none'
    };
  }

  /**
   * Update tracking state when a valid adjacency is detected
   */
  confirmValidAdjacency(): FaceReferenceTrackerResult {
    if (!this.state.isActive) {
      return {
        success: false,
        state: this.state,
        canProceed: false,
        operation: 'none'
      };
    }

    this.state = {
      ...this.state,
      hasValidAdjacency: true
    };

    return {
      success: true,
      state: this.state,
      canProceed: true,
      operation: 'update'
    };
  }

  /**
   * Force invalidate the current tracking state
   */
  invalidate(): FaceReferenceTrackerResult {
    if (!this.state.isActive) {
      return {
        success: false,
        state: this.state,
        canProceed: false,
        operation: 'none'
      };
    }

    this.state = {
      ...this.state,
      isValidForRotation: false,
      hasValidAdjacency: false
    };

    return {
      success: true,
      state: this.state,
      canProceed: false,
      operation: 'update'
    };
  }

  /**
   * Reset to completely clean state
   */
  reset(): FaceReferenceTrackerResult {
    this.dragStartPosition = null;
    this.lastUpdateTime = performance.now();
    this.state = this.createDefaultState();

    return {
      success: true,
      state: this.state,
      canProceed: false,
      operation: 'clear'
    };
  }

  /**
   * Create default state object
   */
  private createDefaultState(): FaceReferenceTrackerState {
    return {
      isActive: false,
      referenceFace: null,
      initialSelectionPoint: null,
      faceNormal: null,
      selectionTime: 0,
      dragDistance: 0,
      currentDragPoint: null,
      isValidForRotation: false,
      hasValidAdjacency: false
    };
  }

  /**
   * Update timestamp for timeout tracking
   */
  private updateTimestamp(): void {
    this.lastUpdateTime = performance.now();
  }

  /**
   * Calculate drag distance between points
   */
  private calculateDragDistance(point1: readonly [number, number, number], point2: readonly [number, number, number]): number {
    const v1 = new THREE.Vector3(...point1);
    const v2 = new THREE.Vector3(...point2);
    return v1.distanceTo(v2);
  }
}