import * as THREE from 'three';
import { 
  FacePosition, 
  RotationDirection, 
  CubeOperationResult,
  CubeError 
} from '@rubiks-cube/shared/types';

export interface RotationPreviewOptions {
  scene: THREE.Scene;
  cubeGroup: THREE.Group;
  arrowSize?: number;
  arrowColor?: THREE.Color;
  opacity?: number;
  animationDuration?: number;
}

export interface ArrowPreview {
  face: FacePosition;
  direction: RotationDirection;
  opacity?: number;
  pulse?: boolean;
}

export class RotationPreview {
  private scene: THREE.Scene;
  private arrowSize: number;
  private arrowColor: THREE.Color;
  private defaultOpacity: number;
  private animationDuration: number;
  
  private arrowMeshes = new Map<string, THREE.Mesh>(); // key: face-direction
  private arrowMaterials = new Map<string, THREE.MeshBasicMaterial>();
  private activeAnimations = new Map<string, () => void>(); // cleanup functions
  
  constructor(options: RotationPreviewOptions) {
    this.scene = options.scene;
    // Note: cubeGroup stored for potential future use in positioning calculations
    // this.cubeGroup = options.cubeGroup;
    this.arrowSize = options.arrowSize ?? 0.3;
    this.arrowColor = options.arrowColor ?? new THREE.Color(0xffffff);
    this.defaultOpacity = options.opacity ?? 0.9;
    this.animationDuration = options.animationDuration ?? 200;
    
    this.initializeArrowMeshes();
  }

  /**
   * Initialize arrow meshes for all face-direction combinations
   */
  private initializeArrowMeshes(): void {
    const faces = Object.values(FacePosition);
    const directions = [RotationDirection.CLOCKWISE, RotationDirection.COUNTERCLOCKWISE];

    faces.forEach(face => {
      directions.forEach(direction => {
        const key = `${face}-${direction}`;
        const arrowMesh = this.createArrowMesh(face, direction);
        this.scene.add(arrowMesh);
        this.arrowMeshes.set(key, arrowMesh);
      });
    });

  }


  /**
   * Create an arrow mesh for a specific face and direction
   */
  private createArrowMesh(face: FacePosition, direction: RotationDirection): THREE.Mesh {
    // Create arrow geometry using a combination of shapes
    const arrowGeometry = new THREE.BufferGeometry();
    
    // Arrow shaft and head vertices
    const vertices = new Float32Array([
      // Arrow body (rectangle)
      -0.05, -0.15, 0,  // bottom left
       0.05, -0.15, 0,  // bottom right
       0.05,  0.05, 0,  // top right
      -0.05,  0.05, 0,  // top left
      
      // Arrow head (triangle)
      -0.12,  0.05, 0,  // left tip
       0.12,  0.05, 0,  // right tip
       0.00,  0.20, 0,  // point
    ]);
    
    const indices = new Uint16Array([
      // Arrow body
      0, 1, 2,  2, 3, 0,
      // Arrow head
      4, 5, 6,
    ]);
    
    arrowGeometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
    arrowGeometry.setIndex(new THREE.BufferAttribute(indices, 1));
    arrowGeometry.computeVertexNormals();
    
    // Scale arrow based on face size
    arrowGeometry.scale(this.arrowSize, this.arrowSize, this.arrowSize);
    
    // Create material with transparency
    const material = new THREE.MeshBasicMaterial({
      color: this.arrowColor,
      transparent: true,
      opacity: 0,
      side: THREE.DoubleSide,
      depthTest: false,
      depthWrite: false,
    });
    
    const arrowMesh = new THREE.Mesh(arrowGeometry, material);
    arrowMesh.name = `arrow-${face}-${direction}`;
    arrowMesh.visible = false;
    arrowMesh.renderOrder = 999; // Render on top
    
    // Position and orient the arrow
    this.positionArrow(arrowMesh, face, direction);
    
    const key = `${face}-${direction}`;
    this.arrowMaterials.set(key, material);
    
    return arrowMesh;
  }


  /**
   * Position and orient arrow for specific face and direction
   */
  private positionArrow(mesh: THREE.Mesh, face: FacePosition, direction: RotationDirection): void {
    const distance = 0.52; // Slightly outside cube face
    const offset = direction === RotationDirection.CLOCKWISE ? 0.25 : -0.25; // Side offset for direction
    
    // Reset rotation before applying new one
    mesh.rotation.set(0, 0, 0);
    
    switch (face) {
      case FacePosition.FRONT:
        mesh.position.set(offset, 0.25, distance);
        if (direction === RotationDirection.COUNTERCLOCKWISE) {
          mesh.rotation.z = Math.PI;
        }
        break;
        
      case FacePosition.BACK:
        mesh.position.set(-offset, 0.25, -distance);
        mesh.rotation.y = Math.PI;
        if (direction === RotationDirection.CLOCKWISE) {
          mesh.rotation.z = Math.PI;
        }
        break;
        
      case FacePosition.LEFT:
        mesh.position.set(-distance, 0.25, -offset);
        mesh.rotation.y = -Math.PI / 2;
        if (direction === RotationDirection.COUNTERCLOCKWISE) {
          mesh.rotation.z = Math.PI;
        }
        break;
        
      case FacePosition.RIGHT:
        mesh.position.set(distance, 0.25, offset);
        mesh.rotation.y = Math.PI / 2;
        if (direction === RotationDirection.COUNTERCLOCKWISE) {
          mesh.rotation.z = Math.PI;
        }
        break;
        
      case FacePosition.UP:
        mesh.position.set(offset, distance, 0.25);
        mesh.rotation.x = -Math.PI / 2;
        if (direction === RotationDirection.COUNTERCLOCKWISE) {
          mesh.rotation.z = Math.PI;
        }
        break;
        
      case FacePosition.DOWN:
        mesh.position.set(offset, -distance, -0.25);
        mesh.rotation.x = Math.PI / 2;
        if (direction === RotationDirection.COUNTERCLOCKWISE) {
          mesh.rotation.z = Math.PI;
        }
        break;
    }
  }


  /**
   * Show rotation preview for a face and direction
   */
  showPreview(preview: ArrowPreview): CubeOperationResult<void> {
    try {
      const key = `${preview.face}-${preview.direction}`;
      const mesh = this.arrowMeshes.get(key);
      const material = this.arrowMaterials.get(key);
      
      if (!mesh || !material) {
        return {
          success: false,
          error: CubeError.INVALID_MOVE,
          message: `Arrow mesh not found for ${preview.face}-${preview.direction}`,
        };
      }

      // Stop any existing animation
      this.stopAnimation(key);
      
      mesh.visible = true;
      const targetOpacity = preview.opacity ?? this.defaultOpacity;
      
      // Animate arrow appearance
      this.animateArrowOpacity(key, material, 0, targetOpacity);
      
      // Add pulse animation if requested
      if (preview.pulse) {
        this.startPulseAnimation(key, material, targetOpacity);
      }
      
      return { success: true, data: undefined };
      
    } catch (error) {
      return {
        success: false,
        error: CubeError.WEBGL_CONTEXT_LOST,
        message: error instanceof Error ? error.message : 'Failed to show rotation preview',
      };
    }
  }

  /**
   * Hide rotation preview for a face and direction
   */
  hidePreview(face: FacePosition, direction: RotationDirection): CubeOperationResult<void> {
    try {
      const key = `${face}-${direction}`;
      const mesh = this.arrowMeshes.get(key);
      const material = this.arrowMaterials.get(key);
      
      if (!mesh || !material) {
        return {
          success: false,
          error: CubeError.INVALID_MOVE,
          message: `Arrow mesh not found for ${face}-${direction}`,
        };
      }

      // Stop any existing animation
      this.stopAnimation(key);
      
      // Animate arrow disappearance
      this.animateArrowOpacity(key, material, material.opacity, 0, () => {
        mesh.visible = false;
      });
      
      return { success: true, data: undefined };
      
    } catch (error) {
      return {
        success: false,
        error: CubeError.WEBGL_CONTEXT_LOST,
        message: error instanceof Error ? error.message : 'Failed to hide rotation preview',
      };
    }
  }

  /**
   * Hide all previews
   */
  hideAllPreviews(): void {
    this.arrowMeshes.forEach((mesh, key) => {
      const material = this.arrowMaterials.get(key);
      if (material) {
        this.stopAnimation(key);
        material.opacity = 0;
        mesh.visible = false;
      }
    });
  }

  /**
   * Animate arrow opacity
   */
  private animateArrowOpacity(
    key: string,
    material: THREE.MeshBasicMaterial,
    startOpacity: number,
    targetOpacity: number,
    onComplete?: () => void
  ): void {
    const startTime = performance.now();
    
    const animate = () => {
      const elapsed = performance.now() - startTime;
      const progress = Math.min(elapsed / this.animationDuration, 1);
      
      // Use ease-out easing
      const easedProgress = 1 - Math.pow(1 - progress, 3);
      
      material.opacity = startOpacity + (targetOpacity - startOpacity) * easedProgress;
      
      if (progress < 1) {
        const animationId = requestAnimationFrame(animate);
        this.activeAnimations.set(key, () => cancelAnimationFrame(animationId));
      } else {
        this.activeAnimations.delete(key);
        onComplete?.();
      }
    };
    
    const animationId = requestAnimationFrame(animate);
    this.activeAnimations.set(key, () => cancelAnimationFrame(animationId));
  }

  /**
   * Start pulse animation for an arrow
   */
  private startPulseAnimation(
    key: string,
    material: THREE.MeshBasicMaterial,
    baseOpacity: number,
    period: number = 400
  ): void {
    const startTime = performance.now();
    
    const animate = () => {
      const elapsed = performance.now() - startTime;
      const normalizedTime = (elapsed % period) / period;
      const opacity = baseOpacity + Math.sin(normalizedTime * Math.PI * 2) * baseOpacity * 0.3;
      
      material.opacity = Math.max(0, Math.min(1, opacity));
      
      const animationId = requestAnimationFrame(animate);
      this.activeAnimations.set(key, () => cancelAnimationFrame(animationId));
    };
    
    const animationId = requestAnimationFrame(animate);
    this.activeAnimations.set(key, () => cancelAnimationFrame(animationId));
  }

  /**
   * Stop animation for a specific arrow
   */
  private stopAnimation(key: string): void {
    const cleanup = this.activeAnimations.get(key);
    if (cleanup) {
      cleanup();
      this.activeAnimations.delete(key);
    }
  }

  /**
   * Get rotation direction from drag vector
   */
  static getRotationDirectionFromDrag(
    face: FacePosition,
    dragVector: { x: number; y: number }
  ): RotationDirection | null {
    const threshold = 5; // Minimum drag distance
    
    if (Math.abs(dragVector.x) < threshold && Math.abs(dragVector.y) < threshold) {
      return null; // Not enough movement
    }
    
    // Determine direction based on face orientation and drag direction
    switch (face) {
      case FacePosition.FRONT:
      case FacePosition.BACK:
        return dragVector.x > 0 ? RotationDirection.CLOCKWISE : RotationDirection.COUNTERCLOCKWISE;
        
      case FacePosition.LEFT:
      case FacePosition.RIGHT:
        return dragVector.y > 0 ? RotationDirection.CLOCKWISE : RotationDirection.COUNTERCLOCKWISE;
        
      case FacePosition.UP:
      case FacePosition.DOWN:
        return dragVector.x > 0 ? RotationDirection.CLOCKWISE : RotationDirection.COUNTERCLOCKWISE;
        
      default:
        return null;
    }
  }

  /**
   * Dispose of all resources
   */
  dispose(): void {
    // Stop all animations
    this.activeAnimations.forEach(cleanup => cleanup());
    this.activeAnimations.clear();

    // Dispose of arrow meshes and materials
    this.arrowMeshes.forEach(mesh => {
      if (mesh.geometry) mesh.geometry.dispose();
      if (mesh.material) {
        if (Array.isArray(mesh.material)) {
          mesh.material.forEach(mat => mat.dispose());
        } else {
          mesh.material.dispose();
        }
      }
      this.scene.remove(mesh);
    });

    this.arrowMeshes.clear();
    this.arrowMaterials.clear();

  }
}