/* eslint-disable no-unused-vars */
/**
 * Face Adjacency Types for Face-to-Face Drag Interaction Logic
 */

export enum AdjacencyState {
  ADJACENT = 'adjacent',
  DIAGONAL = 'diagonal',
  NON_ADJACENT = 'non-adjacent',
  IDENTICAL = 'identical'
}

export interface FaceAdjacencyRelationship {
  readonly referenceFace: FacePosition;
  readonly targetFace: FacePosition;
  readonly adjacencyState: AdjacencyState;
  readonly sharedEdge?: FaceEdge;
  readonly distance: number; // Normalized distance between face centers (0 = same face, 1 = adjacent, ~1.41 = diagonal, >1.41 = non-adjacent)
  readonly layerCompatibility: boolean; // True if both faces are on the same layer side
  readonly validForRotation: boolean; // True if this adjacency can trigger a rotation
}

export interface FaceEdge {
  readonly face: FacePosition;
  readonly vertices: readonly [THREE.Vector3, THREE.Vector3]; // Edge endpoints in world space
  readonly direction: readonly [number, number, number]; // Vector along edge direction
  readonly center: readonly [number, number, number]; // Midpoint of edge
}

export interface FaceAdjacencyDetectorOptions {
  readonly adjacencyThreshold: number; // Maximum distance for adjacent faces (default: 1.1)
  readonly diagonalThreshold: number; // Maximum distance for diagonal faces (default: 1.6)
  readonly strictLayerValidation: boolean; // Require exact layer matching (default: true)
  readonly faceCenterCache?: boolean; // Cache face center calculations (default: true)
}

// Import THREE here because we need it for FaceEdge
import * as THREE from 'three';
import { FacePosition } from './cube';

export interface FaceReferenceState {
  readonly selectedFace: FacePosition;
  readonly selectionTime: number;
  readonly position: readonly [number, number, number]; // 3D position of face selection
  readonly normal: readonly [number, number, number]; // Face normal vector
  readonly dragDistance: number; // Distance from initial selection point
  readonly isValid: boolean; // True if reference face is still valid for rotation
}

export interface AdjacencyDetectionResult {
  readonly relationship: FaceAdjacencyRelationship;
  readonly referenceState: FaceReferenceState;
  readonly canInitiateRotation: boolean;
  readonly suggestedDirection: RotationDirection;
  readonly confidence: number; // 0-1 confidence in detection accuracy
  readonly processingTimeMs: number; // Performance monitoring
}

export interface FaceReferenceTrackerState {
  readonly isActive: boolean;
  readonly referenceFace: FacePosition | null;
  readonly initialSelectionPoint: readonly [number, number, number] | null;
  readonly faceNormal: readonly [number, number, number] | null;
  readonly selectionTime: number;
  readonly dragDistance: number;
  readonly currentDragPoint: readonly [number, number, number] | null;
  readonly isValidForRotation: boolean;
  readonly hasValidAdjacency: boolean;
}

export interface FaceReferenceTrackerOptions {
  readonly validityTimeout: number; // ms - clear selection after inactivity
  readonly maximumDragDistance: number; // Maximum drag distance before invalidation
  readonly hysteresisThreshold: number; // Minimum distance change required for updates
  readonly trackingEnabled: boolean;
}

export interface FaceSelectionEvent {
  readonly face: FacePosition;
  readonly position: readonly [number, number, number];
  readonly normal: readonly [number, number, number];
  readonly timestamp: number;
  readonly confidence: number;
}

export interface FaceReferenceTrackerResult {
  readonly success: boolean;
  readonly state: FaceReferenceTrackerState;
  readonly canProceed: boolean;
  readonly operation: 'none' | 'select' | 'update' | 'clear';
}