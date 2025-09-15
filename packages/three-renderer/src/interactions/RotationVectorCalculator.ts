import * as THREE from 'three';
import {
  FacePosition,
  RotationDirection,
  RotationCommand,
  FaceReferenceState,
  FaceAdjacencyRelationship
} from '@rubiks-cube/shared/types';

export interface RotationVectorCalculationOptions {
  readonly useRightHandRule: boolean;
  readonly perpendicularTolerance: number; // Degrees - how perpendicular axes must be
  readonly minimumTorqueAngle: number; // Degrees - minimum angle for valid rotation
  readonly maximumTorqueAngle: number; // Degrees - maximum angle for valid rotation
  readonly calculationThreshold: number; // Minimum vector magnitude for calculation
}

export interface RotationVectorResult {
  readonly axis: THREE.Vector3;
  readonly angle: number; // In radians
  readonly direction: RotationDirection;
  readonly torque: number; // Magnitude of rotational force
  readonly confidence: number; // 0-1 calculation confidence
  readonly isValid: boolean; // True if calculation is mathematically sound
  readonly processingTimeMs: number;
}

export interface FaceToFaceRotationResult {
  readonly canRotate: boolean;
  readonly rotationCommand: RotationCommand | null;
  readonly rotationVector: RotationVectorResult;
  readonly reason?: string; // Explanation for invalid rotation
  readonly alternativeDirection?: RotationDirection;
  readonly confidenceScore: number;
}

export class RotationVectorCalculator {
  private options: RotationVectorCalculationOptions;

  constructor(options: RotationVectorCalculationOptions = {
    useRightHandRule: true,
    perpendicularTolerance: 5.0, // 5 degrees
    minimumTorqueAngle: 15.0, // 15 degrees minimum
    maximumTorqueAngle: 165.0, // 165 degrees maximum
    calculationThreshold: 0.001
  }) {
    this.options = options;
  }

  /**
   * Calculate rotation vector for face-to-face interaction
   */
  calculateFaceToFaceRotation(
    referenceState: FaceReferenceState,
    relationship: FaceAdjacencyRelationship
  ): FaceToFaceRotationResult {
    const startTime = performance.now();

    // Validate input preconditions
    if (!referenceState.isValid || !relationship.validForRotation) {
      return {
        canRotate: false,
        rotationCommand: null,
        rotationVector: this.createDefaultRotationVector(),
        reason: !referenceState.isValid ? "Reference face is invalid" : "Faces are not rotation-compatible",
        confidenceScore: 0,
      };
    }

    // Calculate rotation axis using geometry
    const rotationAxis = this.calculateRotationAxis(
      referenceState.selectedFace,
      relationship.targetFace
    );

    // If axis calculation fails, cannot rotate
    if (!rotationAxis) {
      return {
        canRotate: false,
        rotationCommand: null,
        rotationVector: this.createDefaultRotationVector(),
        reason: "Cannot determine rotation axis",
        confidenceScore: 0
      };
    }

    // Calculate rotation direction using right-hand rule
    const direction = this.determineRotationDirection(
      referenceState.selectedFace,
      relationship.targetFace,
      rotationAxis
    );

    // Calculate torque angle (how much rotation is implied)
    const torqueAngle = this.calculateTorqueAngle(
      referenceState.position,
      referenceState.normal,
      relationship.targetFace
    );

    // Validate torque angle is within acceptable range
    if (!this.isValidTorqueAngle(torqueAngle)) {
      return {
        canRotate: false,
        rotationCommand: null,
        rotationVector: this.createDefaultRotationVector(),
        reason: `Torque angle ${torqueAngle.toFixed(1)}° is outside valid range`,
        confidenceScore: 0
      };
    }

    // Calculate final rotation vector
    const rotationVector = this.createRotationVector(
      rotationAxis,
      torqueAngle,
      direction,
      startTime
    );

    // Create rotation command if everything is valid
    const rotationCommand = this.createRotationCommand(
      referenceState.selectedFace,
      direction,
      torqueAngle
    );

    return {
      canRotate: true,
      rotationCommand,
      rotationVector,
      confidenceScore: rotationVector.confidence
    };
  }

  /**
   * Calculate the rotation axis using face geometry
   */
  private calculateRotationAxis(referenceFace: FacePosition, targetFace: FacePosition): THREE.Vector3 | null {
    const referenceNormal = this.getFaceNormalVector(referenceFace);
    const targetNormal = this.getFaceNormalVector(targetFace);

    // For adjacent faces on the same layer, axis is perpendicular to both faces
    if (this.areFacesAdjacent(referenceFace, targetFace)) {
      const axis = referenceNormal.cross(targetNormal);

      // Check if axis is significant (not near-zero)
      if (axis.length() > this.options.calculationThreshold) {
        return axis.normalize();
      }
    }

    // Handle edge cases for planar rotation (same axis)
    if (this.areFacesParallel(referenceFace, targetFace)) {
      // For faces on same axis (e.g., Left and Right), rotation axis is perpendicular
      return this.getPerpendicularAxis(referenceFace);
    }

    return null;
  }

  /**
   * Calculate rotation direction using right-hand rule
   */
  private determineRotationDirection(
    referenceFace: FacePosition,
    targetFace: FacePosition,
    rotationAxis: THREE.Vector3
  ): RotationDirection {
    if (!this.options.useRightHandRule) {
      return RotationDirection.CLOCKWISE; // Fallback
    }

    const referenceNormal = this.getFaceNormalVector(referenceFace);
    const targetNormal = this.getFaceNormalVector(targetFace);

    // Right-hand rule: Cross product determines curling direction
    const crossProduct = referenceNormal.clone().cross(targetNormal);

    // Dot product determines if rotation is clockwise or counter-clockwise
    const dotProduct = rotationAxis.dot(crossProduct);

    return dotProduct > 0 ? RotationDirection.CLOCKWISE : RotationDirection.COUNTERCLOCKWISE;
  }

  /**
   * Calculate implied torque angle from drag gesture
   */
  private calculateTorqueAngle(
    referencePosition: readonly [number, number, number],
    referenceNormal: readonly [number, number, number],
    targetFace: FacePosition
  ): number {
    // Calculate angle between reference normal and vector to target face center
    const targetCenter = this.getFaceCenter(targetFace);
    const referencePos = new THREE.Vector3(...referencePosition);
    const referenceNormalVec = new THREE.Vector3(...referenceNormal);

    // Vector from reference to target
    const toTarget = targetCenter.clone().sub(referencePos);
    toTarget.normalize();

    // Angle between reference normal and target direction
    const cosAngle = referenceNormalVec.dot(toTarget);
    const angle = Math.acos(THREE.MathUtils.clamp(cosAngle, -1, 1));

    // Convert to degrees
    return THREE.MathUtils.radToDeg(angle);
  }

  /**
   * Validate that torque angle is within acceptable range
   */
  private isValidTorqueAngle(angle: number): boolean {
    const { minimumTorqueAngle, maximumTorqueAngle } = this.options;

    // Allow angles from 15° to 165° (avoids too small or too large rotations)
    return angle >= minimumTorqueAngle &&
           angle <= maximumTorqueAngle;
  }

  /**
   * Check if two faces are adjacent
   */
  private areFacesAdjacent(face1: FacePosition, face2: FacePosition): boolean {
    // Simple adjacency check for cube faces
    const adjacencyMatrix: Record<FacePosition, FacePosition[]> = {
      [FacePosition.FRONT]: [FacePosition.UP, FacePosition.DOWN, FacePosition.LEFT, FacePosition.RIGHT],
      [FacePosition.BACK]: [FacePosition.UP, FacePosition.DOWN, FacePosition.LEFT, FacePosition.RIGHT],
      [FacePosition.LEFT]: [FacePosition.UP, FacePosition.DOWN, FacePosition.FRONT, FacePosition.BACK],
      [FacePosition.RIGHT]: [FacePosition.UP, FacePosition.DOWN, FacePosition.FRONT, FacePosition.BACK],
      [FacePosition.UP]: [FacePosition.FRONT, FacePosition.BACK, FacePosition.LEFT, FacePosition.RIGHT],
      [FacePosition.DOWN]: [FacePosition.FRONT, FacePosition.BACK, FacePosition.LEFT, FacePosition.RIGHT]
    };

    return adjacencyMatrix[face1]?.includes(face2) || false;
  }

  /**
   * Check if two faces are parallel (share same axis)
   */
  private areFacesParallel(face1: FacePosition, face2: FacePosition): boolean {
    const axisMap: Record<FacePosition, 'x' | 'y' | 'z'> = {
      [FacePosition.FRONT]: 'z',
      [FacePosition.BACK]: 'z',
      [FacePosition.LEFT]: 'x',
      [FacePosition.RIGHT]: 'x',
      [FacePosition.UP]: 'y',
      [FacePosition.DOWN]: 'y'
    };

    return axisMap[face1] === axisMap[face2];
  }

  /**
   * Get perpendicular axis vector for planar rotations
   */
  private getPerpendicularAxis(face: FacePosition): THREE.Vector3 {
    switch (face) {
      case FacePosition.FRONT:
      case FacePosition.BACK:
        return new THREE.Vector3(0, 0, 1);
      case FacePosition.LEFT:
      case FacePosition.RIGHT:
        return new THREE.Vector3(1, 0, 0);
      case FacePosition.UP:
      case FacePosition.DOWN:
        return new THREE.Vector3(0, 1, 0);
      default:
        return new THREE.Vector3(0, 1, 0);
    }
  }

  /**
   * Get normalized face normal vector
   */
  private getFaceNormalVector(face: FacePosition): THREE.Vector3 {
    switch (face) {
      case FacePosition.FRONT: return new THREE.Vector3(0, 0, 1);
      case FacePosition.BACK:  return new THREE.Vector3(0, 0, -1);
      case FacePosition.LEFT:  return new THREE.Vector3(-1, 0, 0);
      case FacePosition.RIGHT: return new THREE.Vector3(1, 0, 0);
      case FacePosition.UP:   return new THREE.Vector3(0, 1, 0);
      case FacePosition.DOWN: return new THREE.Vector3(0, -1, 0);
      default: return new THREE.Vector3(0, 0, 0);
    }
  }

  /**
   * Get face center position
   */
  private getFaceCenter(face: FacePosition): THREE.Vector3 {
    const size = 1; // Cube half-size

    switch (face) {
      case FacePosition.FRONT: return new THREE.Vector3(0, 0, size);
      case FacePosition.BACK:  return new THREE.Vector3(0, 0, -size);
      case FacePosition.LEFT:  return new THREE.Vector3(-size, 0, 0);
      case FacePosition.RIGHT: return new THREE.Vector3(size, 0, 0);
      case FacePosition.UP:   return new THREE.Vector3(0, size, 0);
      case FacePosition.DOWN: return new THREE.Vector3(0, -size, 0);
      default: return new THREE.Vector3(0, 0, 0);
    }
  }

  /**
   * Create rotation vector result object
   */
  private createRotationVector(
    axis: THREE.Vector3,
    angle: number,
    direction: RotationDirection,
    startTime: number
  ): RotationVectorResult {
    const angleRadians = THREE.MathUtils.degToRad(angle);
    const processingTimeMs = performance.now() - startTime;

    // Calculate confidence based on perpendicularity and magnitude
    let confidence = 0.5; // Base confidence

    // Higher confidence if angle is more precise (closer to 90° ideal)
    const idealAngle = 90; // degrees
    const angleDeviation = Math.abs(angle - idealAngle);
    confidence += Math.max(0, (1 - (angleDeviation / 45))); // Scale by 45° deviation range

    // Higher confidence if axis magnitude is significant
    if (axis.length() > this.options.calculationThreshold) {
      confidence += 0.3;
    }

    return {
      axis: axis.clone(),
      angle: angleRadians,
      direction,
      torque: angleRadians * axis.length(), // Combined measure
      confidence: Math.min(confidence, 1.0),
      isValid: true,
      processingTimeMs
    };
  }

  /**
   * Create default rotation vector for invalid cases
   */
  private createDefaultRotationVector(): RotationVectorResult {
    return {
      axis: new THREE.Vector3(0, 1, 0),
      angle: 0,
      direction: RotationDirection.CLOCKWISE,
      torque: 0,
      confidence: 0,
      isValid: false,
      processingTimeMs: 0
    };
  }

  /**
   * Create final rotation command
   */
  private createRotationCommand(
    face: FacePosition,
    direction: RotationDirection,
    angle: number
  ): RotationCommand {
    const angleRadians = THREE.MathUtils.degToRad(angle);
    const targetAngle = Math.PI / 2; // 90 degrees (quarter turn)

    return {
      face,
      direction,
      angle: angleRadians,
      targetAngle,
      isComplete: angleRadians >= targetAngle * 0.9, // 90% of target
      recalculateLayer: false // Face-to-face is per-layer, no recalc needed
    };
  }
}