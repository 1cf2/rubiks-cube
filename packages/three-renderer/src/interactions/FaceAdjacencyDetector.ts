import * as THREE from 'three';
import {
  FacePosition,
  FaceAdjacencyRelationship,
  FaceAdjacencyDetectorOptions,
  AdjacencyState,
  FaceReferenceState,
  AdjacencyDetectionResult,
  RotationDirection,
  FaceEdge
} from '@rubiks-cube/shared/types';

export class FaceAdjacencyDetector {
  private faceCenters: Map<FacePosition, THREE.Vector3>;
  private faceNormals: Map<FacePosition, THREE.Vector3>;
  private faceEdges: Map<FacePosition, FaceEdge[]>;

  constructor(private options: FaceAdjacencyDetectorOptions = {
    adjacencyThreshold: 1.1,
    diagonalThreshold: 1.6,
    strictLayerValidation: true,
    faceCenterCache: true
  }) {
    this.faceCenters = new Map();
    this.faceNormals = new Map();
    this.faceEdges = new Map();

    // Initialize face center coordinates and normals
    if (options.faceCenterCache) {
      this.initializeFaceGeometry();
    }
  }

  /**
   * Initialize face center coordinates, normals, and edge definitions
   */
  private initializeFaceGeometry(): void {
    const faces = [
      FacePosition.FRONT,
      FacePosition.BACK,
      FacePosition.LEFT,
      FacePosition.RIGHT,
      FacePosition.UP,
      FacePosition.DOWN,
    ];

    faces.forEach(face => {
      // Face centers are at cube edge positions
      const center = this.getFaceCenter(face);
      this.faceCenters.set(face, center);

      // Face normals point outward from cube center
      const normal = this.getFaceNormal(face);
      this.faceNormals.set(face, normal);

      // Calculate face edges
      const edges = this.calculateFaceEdges(face, center);
      this.faceEdges.set(face, edges);
    });
  }

  /**
   * Get standardized face center coordinates
   */
  private getFaceCenter(face: FacePosition): THREE.Vector3 {
    const halfSize = 1; // Cube half-size

    switch (face) {
      case FacePosition.FRONT: return new THREE.Vector3(0, 0, halfSize);
      case FacePosition.BACK:  return new THREE.Vector3(0, 0, -halfSize);
      case FacePosition.LEFT:  return new THREE.Vector3(-halfSize, 0, 0);
      case FacePosition.RIGHT: return new THREE.Vector3(halfSize, 0, 0);
      case FacePosition.UP:    return new THREE.Vector3(0, halfSize, 0);
      case FacePosition.DOWN:  return new THREE.Vector3(0, -halfSize, 0);
      default: return new THREE.Vector3(0, 0, 0);
    }
  }

  /**
   * Get standardized face normal vectors
   */
  private getFaceNormal(face: FacePosition): THREE.Vector3 {
    switch (face) {
      case FacePosition.FRONT: return new THREE.Vector3(0, 0, 1);
      case FacePosition.BACK:  return new THREE.Vector3(0, 0, -1);
      case FacePosition.LEFT:  return new THREE.Vector3(-1, 0, 0);
      case FacePosition.RIGHT: return new THREE.Vector3(1, 0, 0);
      case FacePosition.UP:    return new THREE.Vector3(0, 1, 0);
      case FacePosition.DOWN:  return new THREE.Vector3(0, -1, 0);
      default: return new THREE.Vector3(0, 0, 0);
    }
  }

  /**
   * Calculate the four edges of a face
   */
  private calculateFaceEdges(face: FacePosition, center: THREE.Vector3): FaceEdge[] {
    const halfSize = 1;
    const points: THREE.Vector3[] = [];

    // Create the four corners of the face
    switch (face) {
      case FacePosition.FRONT:
        points.push( // Top-left
          center.clone().add(new THREE.Vector3(-halfSize, halfSize, 0)),
          center.clone().add(new THREE.Vector3(-halfSize, -halfSize, 0)),
          center.clone().add(new THREE.Vector3(halfSize, -halfSize, 0)),
          center.clone().add(new THREE.Vector3(halfSize, halfSize, 0))
        );
        break;
      case FacePosition.BACK:
        points.push(
          center.clone().add(new THREE.Vector3(halfSize, halfSize, 0)),
          center.clone().add(new THREE.Vector3(halfSize, -halfSize, 0)),
          center.clone().add(new THREE.Vector3(-halfSize, -halfSize, 0)),
          center.clone().add(new THREE.Vector3(-halfSize, halfSize, 0))
        );
        break;
      // Similar logic for other faces...
    }

    const edges: FaceEdge[] = [];
    // Connect adjacent points to form edges
    for (let i = 0; i < points.length; i++) {
      const start = points[i];
      const end = points[(i + 1) % points.length];

      edges.push({
        face,
        vertices: [start, end],
        direction: end.clone().sub(start).normalize().toArray(),
        center: start.clone().add(end).multiplyScalar(0.5).toArray()
      });
    }

    return edges;
  }

  /**
   * Detect adjacency relationship between two faces
   */
  detectAdjacency(referenceFace: FacePosition, targetFace: FacePosition): FaceAdjacencyRelationship {
    const startTime = performance.now();

    // Prevent self-comparison
    if (referenceFace === targetFace) {
      return {
        referenceFace,
        targetFace,
        adjacencyState: AdjacencyState.IDENTICAL,
        distance: 0,
        layerCompatibility: false,
        validForRotation: false
      };
    }

    const referenceCenter = this.getFaceCenter(referenceFace);
    const targetCenter = this.getFaceCenter(targetFace);
    const distance = referenceCenter.distanceTo(targetCenter);

    let adjacencyState: AdjacencyState;
    let sharedEdge: FaceEdge | undefined;
    let layerCompatibility = this.checkLayerCompatibility(referenceFace, targetFace);
    let validForRotation = false;

    // Determine adjacency type based on distance
    if (distance <= this.options.adjacencyThreshold) {
      adjacencyState = AdjacencyState.ADJACENT;
      sharedEdge = this.findSharedEdge(referenceFace, targetFace);
      validForRotation = layerCompatibility;
    } else if (distance <= this.options.diagonalThreshold) {
      adjacencyState = AdjacencyState.DIAGONAL;
    } else {
      adjacencyState = AdjacencyState.NON_ADJACENT;
    }

    const processingTime = performance.now() - startTime;

    return {
      referenceFace,
      targetFace,
      adjacencyState,
      sharedEdge,
      distance,
      layerCompatibility,
      validForRotation
    };
  }

  /**
   * Check if two faces are on the same layer side (critical for rotation validity)
   */
  private checkLayerCompatibility(referenceFace: FacePosition, targetFace: FacePosition): boolean {
    if (!this.options.strictLayerValidation) {
      return true;
    }

    const referenceNormal = this.getFaceNormal(referenceFace);
    const targetNormal = this.getFaceNormal(targetFace);

    // Faces should have the same axial alignment for rotation compatibility
    // Primary axis alignment check
    const primaryAxes = [
      ['x', FacePosition.LEFT, FacePosition.RIGHT],
      ['y', FacePosition.DOWN, FacePosition.UP],
      ['z', FacePosition.BACK, FacePosition.FRONT]
    ];

    for (const [, face1, face2] of primaryAxes) {
      if ((referenceFace === face1 || referenceFace === face2) &&
          (targetFace === face1 || targetFace === face2)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Find shared edge between two adjacent faces
   */
  private findSharedEdge(face1: FacePosition, face2: FacePosition): FaceEdge | undefined {
    const edges1 = this.faceEdges.get(face1);
    const edges2 = this.faceEdges.get(face2);

    if (!edges1 || !edges2) return undefined;

    // Check for overlapping edges between faces
    for (const edge1 of edges1) {
      for (const edge2 of edges2) {
        if (this.edgesOverlap(edge1, edge2)) {
          return edge1; // Return the shared edge
        }
      }
    }

    return undefined;
  }

  /**
   * Check if two edges overlap (within tolerance)
   */
  private edgesOverlap(edge1: FaceEdge, edge2: FaceEdge): boolean {
    const tolerance = 0.1; // Small tolerance for floating point comparisons

    const [e1v1, e1v2] = edge1.vertices;
    const [e2v1, e2v2] = edge2.vertices;

    // Check if both edge vertices are close to each other
    const distance = (e1v1.distanceTo(e2v1) + e1v1.distanceTo(e2v2) +
                     e1v2.distanceTo(e2v1) + e1v2.distanceTo(e2v2)) / 4;

    return distance < tolerance;
  }

  /**
   * Calculate suggested rotation direction using right-hand rule
   */
  calculateRotationDirection(
    referenceFace: FacePosition,
    targetFace: FacePosition,
    referenceNormal: THREE.Vector3
  ): RotationDirection {
    const targetNormal = this.getFaceNormal(targetFace);

    // Use right-hand rule: cross product direction determines rotation
    const axisOfRotation = referenceNormal.cross(targetNormal);

    if (axisOfRotation.length() < 0.1) {
      // Parallel faces - determine based on face order
      return this.calculatePlanarRotationDirection(referenceFace, targetFace);
    }

    // Positive dot product indicates clockwise, negative indicates counter-clockwise
    const dotProduct = referenceNormal.dot(targetNormal);
    return dotProduct > 0 ? RotationDirection.CLOCKWISE : RotationDirection.COUNTERCLOCKWISE;
  }

  /**
   * Calculate rotation direction for faces on same axis (planar rotation)
   */
  private calculatePlanarRotationDirection(
    referenceFace: FacePosition,
    targetFace: FacePosition
  ): RotationDirection {
    // Simple mapping based on face position on cube
    const faceOrders = [
      ['y', FacePosition.DOWN, FacePosition.UP],
      ['z', FacePosition.BACK, FacePosition.FRONT],
      ['x', FacePosition.LEFT, FacePosition.RIGHT]
    ];

    for (const [, first, second] of faceOrders) {
      if (referenceFace === first && targetFace === second) {
        return RotationDirection.CLOCKWISE;
      }
      if (referenceFace === second && targetFace === first) {
        return RotationDirection.COUNTERCLOCKWISE;
      }
    }

    return RotationDirection.CLOCKWISE; // Default fallback
  }

  /**
   * Perform comprehensive adjacency detection with confidence scoring
   */
  detectAdjacencyWithMetrics(
    referenceState: FaceReferenceState,
    targetFace: FacePosition
  ): AdjacencyDetectionResult {
    const startTime = performance.now();
    const relationship = this.detectAdjacency(referenceState.selectedFace, targetFace);

    let suggestedDirection = RotationDirection.CLOCKWISE;
    let confidence = 0;
    let canInitiateRotation = false;

    if (relationship.validForRotation) {
      suggestedDirection = this.calculateRotationDirection(
        referenceState.selectedFace,
        targetFace,
        new THREE.Vector3(...referenceState.normal)
      );
      confidence = this.calculateConfidence(relationship, referenceState);
      canInitiateRotation = confidence > 0.8; // High confidence threshold
    }

    const processingTimeMs = performance.now() - startTime;

    return {
      relationship,
      referenceState,
      canInitiateRotation,
      suggestedDirection,
      confidence,
      processingTimeMs
    };
  }

  /**
   * Calculate confidence score for detection accuracy
   */
  private calculateConfidence(
    relationship: FaceAdjacencyRelationship,
    referenceState: FaceReferenceState
  ): number {
    let confidence = 0;

    // Adjacency state confidence
    switch (relationship.adjacencyState) {
      case AdjacencyState.ADJACENT:
        confidence += 0.8;
        break;
      case AdjacencyState.DIAGONAL:
        confidence += 0.4; // Possible but less reliable
        break;
      default:
        confidence += 0.0;
    }

    // Layer compatibility confidence
    if (relationship.layerCompatibility) {
      confidence += 0.2;
    }

    // Drag distance confidence (closer is better)
    if (referenceState.dragDistance < 0.5) {
      confidence += 0.1;
    } else if (referenceState.dragDistance < 2.0) {
      confidence += 0.05;
    }

    return Math.min(confidence, 1.0); // Cap at 100% confidence
  }
}