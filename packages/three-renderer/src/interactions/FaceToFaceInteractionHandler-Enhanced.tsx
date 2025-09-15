// Enhanced Face-to-Face Interaction Handler with Live Rotation Preview
// extends the existing face-to-face functionality with real-time rotation preview during drag

import * as THREE from 'three';
import { FacePosition, RotationDirection } from '@rubiks-cube/shared/types';

export interface RotationPreviewInfo {
  readonly isActive: boolean;
  readonly previewFace: FacePosition;
  readonly previewDirection: RotationDirection;
  readonly previewLayers: FacePosition[];
  readonly previewArrows: THREE.Group[];
  readonly previewGhost: THREE.Group | null;
}

export interface EnhancedFaceToFaceResult {
  readonly canRotate: boolean;
  readonly rotationCommand: any | null;
  readonly adjacencyState: any;
  readonly validFaces: FacePosition[];
  readonly rotationPreview: RotationPreviewInfo;
}

export class EnhancedFaceToFaceMouseInteractionHandler {
  // ... existing properties

  // Scene references
  private scene: THREE.Scene;

  // Enhanced properties for rotation preview
  private rotationPreview: RotationPreviewInfo | null = null;
  private previewArrowMaterial: THREE.MeshBasicMaterial;
  private previewArrowGeometries: THREE.ConeGeometry[];

  constructor(scene: THREE.Scene) {
    // Assign scene references
    this.scene = scene;

    // Initialize enhanced properties
    this.previewArrowMaterial = new THREE.MeshBasicMaterial({
      color: 0x00ff00,
      transparent: true,
      opacity: 0.7
    });
    this.previewArrowGeometries = [];

    // ... existing constructor

    // Initialize rotation preview system
    this.initializeRotationPreview();
  }

  private initializeRotationPreview(): void {
    // Create materials for preview visual elements
    this.previewArrowMaterial = new THREE.MeshBasicMaterial({
      color: 0x00ff00, // Bright green
      transparent: true,
      opacity: 0.7
    });

    this.previewArrowGeometries = [];

    // Create different sized arrow geometries for different layer depths
    for (let i = 0; i < 4; i++) {  // Support up to 4 layer depths
      const size = 0.3 + (i * 0.1);
      const arrowGeometry = new THREE.ConeGeometry(size * 0.3, size, 8);
      this.previewArrowGeometries.push(arrowGeometry);
    }
  }

  /**
   * Update visual feedback with live rotation preview
   */
  private updateRotationPreview(): void {
    // Clear previous preview
    this.clearRotationPreview();

    if (!this.rotationPreview || !this.rotationPreview.isActive) {
      return;
    }

    // Create rotation direction arrows
    const arrows = this.createRotationDirectionArrows(this.rotationPreview);
    this.rotationPreview = {
      ...this.rotationPreview,
      previewArrows: arrows
    };

    // Add arrows to scene
    arrows.forEach(arrowGroup => {
      this.scene.add(arrowGroup);
    });

    // Create ghost rotation preview
    if (this.rotationPreview.previewGhost) {
      this.scene.add(this.rotationPreview.previewGhost);
    }
  }

  /**
   * Create visual arrows showing rotation direction
   */
  private createRotationDirectionArrows(preview: RotationPreviewInfo): THREE.Group[] {
    const arrowGroups: THREE.Group[] = [];

    if (!preview.previewLayers.length) return arrowGroups;

    preview.previewLayers.forEach((face, layerIndex) => {
      const arrowGroup = new THREE.Group();

      // Calculate arrow position (above the face center)
      const facePos = this.calculateFaceCenterPosition(face);
      const arrowOffset = this.calculateArrowOffset(face);

      const arrowPos = facePos.clone().add(arrowOffset);
      arrowGroup.position.copy(arrowPos);

      // Orient arrow based on rotation direction
      const rotation = this.calculateArrowRotation(face, preview.previewDirection);
      arrowGroup.setRotationFromEuler(rotation);

      // Create arrow mesh
      const geometry = this.previewArrowGeometries[Math.min(layerIndex, this.previewArrowGeometries.length - 1)];
      const arrowMesh = new THREE.Mesh(geometry, this.previewArrowMaterial);

      // Adjust arrow to point inward/outward based on rotation direction
      arrowMesh.rotateX(preview.previewDirection === RotationDirection.CLOCKWISE ? Math.PI : 0);

      arrowGroup.add(arrowMesh);

      // Add subtle pulsing animation
      this.addArrowPulsingAnimation(arrowGroup);

      arrowGroups.push(arrowGroup);
    });

    return arrowGroups;
  }


  /**
   * Calculate arrow position offset from face center
   */
  private calculateArrowOffset(face: FacePosition): THREE.Vector3 {
    const facePos = this.calculateFaceCenterPosition(face);
    const offsetDistance = 1.2; // Distance from face center

    // Direction vector based on face
    const directionVector = facePos.normalize();
    return directionVector.multiplyScalar(offsetDistance);
  }

  /**
   * Calculate arrow rotation to point toward rotation direction
   */
  private calculateArrowRotation(face: FacePosition, direction: RotationDirection): THREE.Euler {
    const rotation = new THREE.Euler();

    // Base rotation based on face
    switch (face) {
      case FacePosition.FRONT:
        rotation.x = direction === RotationDirection.CLOCKWISE ? Math.PI / 2 : -Math.PI / 2;
        break;
      case FacePosition.BACK:
        rotation.x = direction === RotationDirection.CLOCKWISE ? -Math.PI / 2 : Math.PI / 2;
        rotation.y = Math.PI;
        break;
      case FacePosition.LEFT:
        rotation.z = direction === RotationDirection.CLOCKWISE ? Math.PI / 2 : -Math.PI / 2;
        rotation.y = -Math.PI / 2;
        break;
      case FacePosition.RIGHT:
        rotation.z = direction === RotationDirection.CLOCKWISE ? -Math.PI / 2 : Math.PI / 2;
        rotation.y = Math.PI / 2;
        break;
      case FacePosition.UP:
        rotation.x = direction === RotationDirection.CLOCKWISE ? Math.PI : 0;
        break;
      case FacePosition.DOWN:
        rotation.x = direction === RotationDirection.CLOCKWISE ? 0 : Math.PI;
        rotation.y = Math.PI;
        rotation.z = Math.PI;
        break;
    }

    return rotation;
  }

  /**
   * Add subtle pulsing animation to arrows
   */
  private addArrowPulsingAnimation(arrowGroup: THREE.Group): void {
    let time = 0;
    const animate = () => {
      time += 0.02;
      const scale = 1.0 + Math.sin(time) * 0.1; // Subtle pulse
      arrowGroup.scale.setScalar(scale);
      requestAnimationFrame(animate);
    };
    animate();
  }

  /**
   * Calculate face center position
   */
  private calculateFaceCenterPosition(face: FacePosition): THREE.Vector3 {
    const size = 1.0; // Cube half-size
    switch (face) {
      case FacePosition.FRONT: return new THREE.Vector3(0, 0, size);
      case FacePosition.BACK: return new THREE.Vector3(0, 0, -size);
      case FacePosition.LEFT: return new THREE.Vector3(-size, 0, 0);
      case FacePosition.RIGHT: return new THREE.Vector3(size, 0, 0);
      case FacePosition.UP: return new THREE.Vector3(0, size, 0);
      case FacePosition.DOWN: return new THREE.Vector3(0, -size, 0);
      default: return new THREE.Vector3(0, 0, 0);
    }
  }




  /**
   * Clear all rotation preview visual elements
   */
  private clearRotationPreview(): void {
    if (this.rotationPreview?.previewArrows) {
      this.rotationPreview.previewArrows.forEach(arrow => {
        this.scene.remove(arrow);
        arrow.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            child.geometry.dispose();
          }
        });
      });
    }

    if (this.rotationPreview?.previewGhost) {
      this.scene.remove(this.rotationPreview.previewGhost);
      this.rotationPreview.previewGhost.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.geometry.dispose();
          if (child.material) child.material.dispose();
        }
      });
    }

    this.rotationPreview = null;
  }

  /**
   * Dispose of preview system resources
   */
  dispose(): void {
    this.clearRotationPreview();

    // Dispose of preview materials and geometries
    this.previewArrowMaterial.dispose();
    this.previewArrowGeometries.forEach(geometry => geometry.dispose());
  }

  /**
   * Handle standard drag update (placeholder - should be implemented based on base class)
   */
  private handleDragUpdate(): any {
    // Placeholder implementation - should delegate to base class or implement drag logic
    return {
      canRotate: false,
      rotationCommand: null,
      adjacencyState: null,
      validFaces: []
    };
  }

  // Integration method for enhanced face-drag interaction
  updateDragWithPreview(
    onPreviewUpdate?: () => void
  ): EnhancedFaceToFaceResult {

    // Get standard drag result
    const standardResult = this.handleDragUpdate();

    // Create/enhance rotation preview
    if (standardResult.canRotate && standardResult.rotationCommand) {
      const command = standardResult.rotationCommand;

      this.rotationPreview = {
        isActive: true,
        previewFace: command.face,
        previewDirection: command.direction,
        previewLayers: [command.face], // Could be extended to show all affected faces
        previewArrows: [],
        previewGhost: null // Can be added if ghost preview is desired
      };

      // Create visual preview elements
      this.updateRotationPreview();

      // Notify subscribers
      onPreviewUpdate?.();
    } else {
      // Clear preview when no valid rotation
      this.clearRotationPreview();
    }

    return {
      ...standardResult,
      rotationPreview: this.rotationPreview || {
        isActive: false,
        previewFace: FacePosition.FRONT,
        previewDirection: RotationDirection.CLOCKWISE,
        previewLayers: [],
        previewArrows: [],
        previewGhost: null
      }
    };
  }

  // ... rest of the existing implementation ...
}