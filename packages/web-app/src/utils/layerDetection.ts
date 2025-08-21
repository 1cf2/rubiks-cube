import * as THREE from 'three';
import { FacePosition, RotationDirection } from '@rubiks-cube/shared/types';

export interface LayerInfo {
  /** The pieces that will be affected by this rotation */
  affectedPieces: readonly [number, number, number][];
  /** The axis around which the rotation occurs */
  rotationAxis: 'x' | 'y' | 'z';
  /** The layer index (0, 1, 2 for near, middle, far) */
  layerIndex: number;
  /** The face being rotated */
  face: FacePosition;
  /** The direction of rotation */
  direction: RotationDirection;
}

/**
 * Determines which layer will be rotated based on the clicked piece and rotation direction
 */
export class LayerDetection {
  
  /**
   * Get all pieces that belong to a specific layer for a given face rotation
   */
  static getLayerPieces(
    clickedPiecePosition: readonly [number, number, number],
    face: FacePosition,
    direction: RotationDirection
  ): LayerInfo {
    const [x, y, z] = clickedPiecePosition;
    
    let affectedPieces: readonly [number, number, number][] = [];
    let rotationAxis: 'x' | 'y' | 'z' = 'x';
    let layerIndex: number = 0;
    
    switch (face) {
      case FacePosition.FRONT:
      case FacePosition.BACK:
        // Z-axis rotation
        rotationAxis = 'z';
        layerIndex = face === FacePosition.FRONT ? 2 : 0; // Front = z=1, Back = z=-1, but we use 0-2 indexing
        
        // All pieces with the same Z coordinate
        const targetZ = Math.round(z);
        affectedPieces = [
          [-1, -1, targetZ], [-1, 0, targetZ], [-1, 1, targetZ],
          [0, -1, targetZ],  [0, 0, targetZ],  [0, 1, targetZ],
          [1, -1, targetZ],  [1, 0, targetZ],  [1, 1, targetZ],
        ];
        break;
        
      case FacePosition.LEFT:
      case FacePosition.RIGHT:
        // X-axis rotation
        rotationAxis = 'x';
        layerIndex = face === FacePosition.RIGHT ? 2 : 0; // Right = x=1, Left = x=-1
        
        // All pieces with the same X coordinate
        const targetX = Math.round(x);
        affectedPieces = [
          [targetX, -1, -1], [targetX, -1, 0], [targetX, -1, 1],
          [targetX, 0, -1],  [targetX, 0, 0],  [targetX, 0, 1],
          [targetX, 1, -1],  [targetX, 1, 0],  [targetX, 1, 1],
        ];
        break;
        
      case FacePosition.UP:
      case FacePosition.DOWN:
        // Y-axis rotation
        rotationAxis = 'y';
        layerIndex = face === FacePosition.UP ? 2 : 0; // Up = y=1, Down = y=-1
        
        // All pieces with the same Y coordinate
        const targetY = Math.round(y);
        affectedPieces = [
          [-1, targetY, -1], [-1, targetY, 0], [-1, targetY, 1],
          [0, targetY, -1],  [0, targetY, 0],  [0, targetY, 1],
          [1, targetY, -1],  [1, targetY, 0],  [1, targetY, 1],
        ];
        break;
    }
    
    return {
      affectedPieces,
      rotationAxis,
      layerIndex,
      face,
      direction,
    };
  }
  
  /**
   * Find all cube meshes in the scene that belong to the specified layer
   */
  static findLayerMeshes(
    scene: THREE.Scene,
    layerInfo: LayerInfo
  ): THREE.Mesh[] {
    const layerMeshes: THREE.Mesh[] = [];
    
    scene.traverse((object) => {
      if (object instanceof THREE.Mesh && object.geometry && object.position) {
        const meshPos = object.position;
        const roundedPos: readonly [number, number, number] = [
          Math.round(meshPos.x),
          Math.round(meshPos.y), 
          Math.round(meshPos.z)
        ];
        
        // Check if this mesh position matches any of the affected pieces
        const isInLayer = layerInfo.affectedPieces.some(piecePos => 
          piecePos[0] === roundedPos[0] && 
          piecePos[1] === roundedPos[1] && 
          piecePos[2] === roundedPos[2]
        );
        
        if (isInLayer) {
          layerMeshes.push(object);
        }
      }
    });
    
    return layerMeshes;
  }
  
  /**
   * Determine which faces of pieces in the layer should be highlighted
   */
  static getLayerFaceHighlights(
    layerInfo: LayerInfo,
    scene: THREE.Scene
  ): Map<THREE.Mesh, FacePosition[]> {
    const highlights = new Map<THREE.Mesh, FacePosition[]>();
    const layerMeshes = this.findLayerMeshes(scene, layerInfo);
    
    layerMeshes.forEach(mesh => {
      const visibleFaces = this.getVisibleFacesForPiece(mesh.position, layerInfo.face);
      highlights.set(mesh, visibleFaces);
    });
    
    return highlights;
  }
  
  /**
   * Determine which faces of a piece should be highlighted during layer rotation
   */
  static getVisibleFacesForPiece(
    piecePosition: THREE.Vector3,
    rotatingFace: FacePosition
  ): FacePosition[] {
    const faces: FacePosition[] = [];
    const pos = piecePosition;
    
    // Round positions to handle floating point precision
    const x = Math.round(pos.x);
    const y = Math.round(pos.y);
    const z = Math.round(pos.z);
    
    // Add faces that are visible on this piece
    if (x === 1) faces.push(FacePosition.RIGHT);
    if (x === -1) faces.push(FacePosition.LEFT);
    if (y === 1) faces.push(FacePosition.UP);
    if (y === -1) faces.push(FacePosition.DOWN);
    if (z === 1) faces.push(FacePosition.FRONT);
    if (z === -1) faces.push(FacePosition.BACK);
    
    // For layer highlighting, we want to emphasize the rotating face if it's visible
    if (faces.includes(rotatingFace)) {
      // Put the rotating face first for emphasis
      const index = faces.indexOf(rotatingFace);
      faces.splice(index, 1);
      faces.unshift(rotatingFace);
    }
    
    return faces;
  }
}