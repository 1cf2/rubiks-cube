import * as THREE from 'three';
import { 
  FacePosition, 
  VisualFeedback,
  CubeOperationResult,
  CubeError 
} from '@rubiks-cube/shared/types';

export interface FaceHighlightingOptions {
  scene: THREE.Scene;
  cubeGroup: THREE.Group;
  highlightIntensity?: number;
  transitionDuration?: number;
  pulseAnimation?: boolean;
}

export class FaceHighlighting {
  private scene: THREE.Scene;
  private cubeGroup: THREE.Group;
  private transitionDuration: number;
  private pulseAnimation: boolean;

  private highlightMeshes = new Map<FacePosition, THREE.Mesh>();
  private originalMaterials = new Map<THREE.Mesh, THREE.Material | THREE.Material[]>();
  private highlightMaterials = new Map<FacePosition, THREE.MeshBasicMaterial>();
  
  private animationMixer: THREE.AnimationMixer | undefined;
  private activeAnimations = new Map<FacePosition, THREE.AnimationAction>();
  private clock = new THREE.Clock();
  
  // Track the specific cube piece being highlighted
  private trackedPiece: THREE.Object3D | null = null;
  private trackedPieceOriginalPosition: readonly [number, number, number] | null = null;

  constructor(options: FaceHighlightingOptions) {
    this.scene = options.scene;
    this.cubeGroup = options.cubeGroup;
    this.transitionDuration = options.transitionDuration ?? 200;
    this.pulseAnimation = options.pulseAnimation ?? true;

    this.initializeHighlights();
    
    if (this.pulseAnimation) {
      this.animationMixer = new THREE.AnimationMixer(this.scene);
    }
  }

  /**
   * Initialize highlight overlays for each cube face
   */
  private initializeHighlights(): void {
    const faces = Object.values(FacePosition);
    
    faces.forEach(face => {
      const highlightMesh = this.createHighlightMesh(face);
      this.cubeGroup.add(highlightMesh); // Add to cube group instead of scene
      this.highlightMeshes.set(face, highlightMesh);
    });
  }

  /**
   * Create a highlight mesh for a specific face
   */
  private createHighlightMesh(face: FacePosition): THREE.Mesh {
    // Create geometry to match individual cube piece size exactly
    const geometry = new THREE.PlaneGeometry(0.95, 0.95);
    
    // Create material with transparency and glow effect
    const material = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthTest: false,
      depthWrite: false,
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = `highlight-${face}`;
    mesh.visible = false;
    mesh.renderOrder = 1000; // Render on top

    // Position and orient the highlight mesh
    this.positionHighlightMesh(mesh, face);
    
    this.highlightMaterials.set(face, material);
    
    return mesh;
  }

  /**
   * Position highlight mesh for a specific face
   */
  private positionHighlightMesh(mesh: THREE.Mesh, face: FacePosition): void {
    const offset = 0.501; // Slightly outside the cube face

    switch (face) {
      case FacePosition.FRONT:
        mesh.position.set(0, 0, offset);
        break;
      case FacePosition.BACK:
        mesh.position.set(0, 0, -offset);
        mesh.rotation.y = Math.PI;
        break;
      case FacePosition.LEFT:
        mesh.position.set(-offset, 0, 0);
        mesh.rotation.y = -Math.PI / 2;
        break;
      case FacePosition.RIGHT:
        mesh.position.set(offset, 0, 0);
        mesh.rotation.y = Math.PI / 2;
        break;
      case FacePosition.UP:
        mesh.position.set(0, offset, 0);
        mesh.rotation.x = -Math.PI / 2;
        break;
      case FacePosition.DOWN:
        mesh.position.set(0, -offset, 0);
        mesh.rotation.x = Math.PI / 2;
        break;
    }
  }

  /**
   * Position highlight mesh at the specific intersection point
   */
  private positionHighlightAtIntersection(
    mesh: THREE.Mesh, 
    face: FacePosition, 
    intersectionPoint: readonly [number, number, number]
  ): void {
    const [x, y, z] = intersectionPoint;
    const offset = 0.002; // Small offset to appear on top of the surface
    
    window.console.log('🎯 Positioning highlight:', { 
      face, 
      intersectionPoint: [x, y, z],
      originalCoords: { x, y, z }
    });
    
    // Snap to nearest cube piece grid (3x3 grid spanning from -1 to +1)
    const snapToGrid = (coord: number): number => {
      // Grid positions are at -1, 0, +1 (spacing of 1 unit)
      const gridPositions = [-1, 0, 1];
      let closest = gridPositions[0]!;
      let minDistance = Math.abs(coord - closest);
      
      for (const pos of gridPositions) {
        const distance = Math.abs(coord - pos);
        if (distance < minDistance) {
          minDistance = distance;
          closest = pos;
        }
      }
      
      return closest;
    };
    
    // Position at snapped grid position with slight offset based on face normal
    const snappedX = snapToGrid(x);
    const snappedY = snapToGrid(y);
    const snappedZ = snapToGrid(z);
    
    window.console.log('🎯 Snapped to grid:', { snappedX, snappedY, snappedZ });
    
    switch (face) {
      case FacePosition.FRONT:
        mesh.position.set(snappedX, snappedY, z + offset);
        mesh.rotation.set(0, 0, 0); // Parallel to Z plane
        window.console.log('🎯 FRONT highlight positioned at:', mesh.position);
        break;
      case FacePosition.BACK:
        mesh.position.set(snappedX, snappedY, z - offset);
        mesh.rotation.set(0, 0, 0); // Parallel to Z plane
        window.console.log('🎯 BACK highlight positioned at:', mesh.position);
        break;
      case FacePosition.LEFT:
        mesh.position.set(x - offset, snappedY, snappedZ);
        mesh.rotation.set(0, Math.PI / 2, 0); // Parallel to YZ plane
        window.console.log('🎯 LEFT highlight positioned at:', mesh.position);
        break;
      case FacePosition.RIGHT:
        mesh.position.set(x + offset, snappedY, snappedZ);
        mesh.rotation.set(0, -Math.PI / 2, 0); // Parallel to YZ plane
        window.console.log('🎯 RIGHT highlight positioned at:', mesh.position);
        break;
      case FacePosition.UP:
        mesh.position.set(snappedX, y + offset, snappedZ);
        mesh.rotation.set(Math.PI / 2, 0, 0); // Parallel to XZ plane
        window.console.log('🎯 UP highlight positioned at:', mesh.position);
        break;
      case FacePosition.DOWN:
        mesh.position.set(snappedX, y - offset, snappedZ);
        mesh.rotation.set(-Math.PI / 2, 0, 0); // Parallel to XZ plane
        window.console.log('🎯 DOWN highlight positioned at:', mesh.position);
        break;
    }
  }

  /**
   * Apply visual feedback to a face
   */
  applyFeedback(feedback: VisualFeedback): CubeOperationResult<void> {
    try {
      const highlightMesh = this.highlightMeshes.get(feedback.face);
      const material = this.highlightMaterials.get(feedback.face);

      if (!highlightMesh || !material) {
        return {
          success: false,
          error: CubeError.INVALID_MOVE,
          message: `Highlight resources not found for face: ${feedback.face}`,
        };
      }

      // Stop any existing animation for this face
      this.stopAnimation(feedback.face);

      // Use target mesh directly if provided (most accurate)
      if (feedback.targetMesh) {
        this.trackedPiece = feedback.targetMesh;
        this.trackedPieceOriginalPosition = [
          feedback.targetMesh.position.x,
          feedback.targetMesh.position.y,
          feedback.targetMesh.position.z
        ] as const;
        
        const piecePosition: readonly [number, number, number] = [
          feedback.targetMesh.position.x,
          feedback.targetMesh.position.y,
          feedback.targetMesh.position.z
        ];
        
        window.console.log('🎯 Using target mesh directly:', {
          meshUuid: feedback.targetMesh.uuid,
          position: piecePosition,
          face: feedback.face,
          intersectionPoint: feedback.intersectionPoint
        });
        
        // Keep it simple - just use the face that was detected by raycasting
        // The raycasting system already determined which face was clicked
        window.console.log('🎯 Using simple face-based approach');
        this.positionHighlightAtPiecePosition(highlightMesh, feedback.face, piecePosition);
      }
      // Track the specific piece if intersection point is provided (fallback)
      else if (feedback.intersectionPoint) {
        this.trackPieceAtIntersection(feedback.intersectionPoint);
        
        // Use the tracked piece's exact position instead of the intersection point
        if (this.trackedPiece) {
          const piecePosition: readonly [number, number, number] = [
            this.trackedPiece.position.x,
            this.trackedPiece.position.y,
            this.trackedPiece.position.z
          ];
          this.positionHighlightAtPiecePosition(highlightMesh, feedback.face, piecePosition);
        } else {
          // Fallback to intersection point if piece tracking failed
          this.positionHighlightAtIntersection(highlightMesh, feedback.face, feedback.intersectionPoint);
        }
      } else if (feedback.piecePosition) {
        // Use tracked piece position if available
        this.positionHighlightAtPiecePosition(highlightMesh, feedback.face, feedback.piecePosition);
      } else {
        // Fall back to default face center positioning
        this.positionHighlightMesh(highlightMesh, feedback.face);
      }

      switch (feedback.state) {
        case 'normal':
          this.setNormalState(highlightMesh, material);
          break;
        case 'hover':
          this.setHoverState(highlightMesh, material, feedback);
          break;
        case 'selected':
          this.setSelectedState(highlightMesh, material, feedback);
          break;
        case 'rotating':
          this.setRotatingState(highlightMesh, material, feedback);
          break;
        case 'blocked':
          this.setBlockedState(highlightMesh, material, feedback);
          break;
        case 'preview':
          this.setPreviewState(highlightMesh, material, feedback);
          break;
        case 'success':
          this.setSuccessState(highlightMesh, material, feedback);
          break;
      }

      return { success: true, data: undefined };

    } catch (error) {
      return {
        success: false,
        error: CubeError.WEBGL_CONTEXT_LOST,
        message: error instanceof Error ? error.message : 'Failed to apply visual feedback',
      };
    }
  }

  /**
   * Track the cube piece at the intersection point
   */
  private trackPieceAtIntersection(intersectionPoint: readonly [number, number, number]): void {
    const [x, y, z] = intersectionPoint;
    
    // Find the cube piece closest to the intersection point
    let closestPiece: THREE.Mesh | null = null;
    let minDistance = Infinity;
    
    this.cubeGroup.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        const distance = child.position.distanceTo(new THREE.Vector3(x, y, z));
        if (distance < minDistance) {
          minDistance = distance;
          closestPiece = child;
        }
      }
    });
    
    if (closestPiece !== null) {
      const piece = closestPiece as THREE.Mesh;
      this.trackedPiece = piece;
      this.trackedPieceOriginalPosition = [
        piece.position.x,
        piece.position.y,
        piece.position.z
      ] as const;
      
      window.console.log('🎯 Tracking piece:', {
        piece: piece.uuid,
        position: this.trackedPieceOriginalPosition
      });
    }
  }


  /**
   * Position highlight at the current tracked piece position on the correct face surface
   */
  private positionHighlightAtPiecePosition(
    mesh: THREE.Mesh,
    face: FacePosition,
    piecePosition: readonly [number, number, number]
  ): void {
    const [x, y, z] = piecePosition;
    const offset = 0.502; // Half cube size (0.95/2) + small buffer to appear on surface
    
    window.console.log('🎯 Positioning highlight at tracked piece surface:', { face, piecePosition: [x, y, z] });
    
    // Position highlight on the specific face surface of the piece
    switch (face) {
      case FacePosition.FRONT:
        mesh.position.set(x, y, z + offset);
        mesh.rotation.set(0, 0, 0);
        window.console.log('🎯 FRONT surface highlight at:', { x, y, z: z + offset });
        break;
      case FacePosition.BACK:
        mesh.position.set(x, y, z - offset);
        mesh.rotation.set(0, Math.PI, 0);
        window.console.log('🎯 BACK surface highlight at:', { x, y, z: z - offset });
        break;
      case FacePosition.LEFT:
        mesh.position.set(x - offset, y, z);
        mesh.rotation.set(0, -Math.PI / 2, 0);
        window.console.log('🎯 LEFT surface highlight at:', { x: x - offset, y, z });
        break;
      case FacePosition.RIGHT:
        mesh.position.set(x + offset, y, z);
        mesh.rotation.set(0, Math.PI / 2, 0);
        window.console.log('🎯 RIGHT surface highlight at:', { x: x + offset, y, z });
        break;
      case FacePosition.UP:
        mesh.position.set(x, y + offset, z);
        mesh.rotation.set(-Math.PI / 2, 0, 0);
        window.console.log('🎯 UP surface highlight at:', { x, y: y + offset, z });
        break;
      case FacePosition.DOWN:
        mesh.position.set(x, y - offset, z);
        mesh.rotation.set(Math.PI / 2, 0, 0);
        window.console.log('🎯 DOWN surface highlight at:', { x, y: y - offset, z });
        break;
    }
  }

  /**
   * Get the current position of the tracked piece
   */
  getCurrentTrackedPiecePosition(): readonly [number, number, number] | null {
    if (!this.trackedPiece) {
      return null;
    }
    
    return [
      this.trackedPiece.position.x,
      this.trackedPiece.position.y,
      this.trackedPiece.position.z
    ] as const;
  }

  /**
   * Clear piece tracking
   */
  clearTrackedPiece(): void {
    this.trackedPiece = null;
    this.trackedPieceOriginalPosition = null;
  }

  /**
   * Set normal state (no highlight)
   */
  private setNormalState(mesh: THREE.Mesh, material: THREE.MeshBasicMaterial): void {
    mesh.visible = false;
    material.opacity = 0;
    material.color.setHex(0xffffff);
    // Clear piece tracking when highlight is removed
    this.clearTrackedPiece();
  }

  /**
   * Set hover state (light blue glow)
   */
  private setHoverState(
    mesh: THREE.Mesh, 
    material: THREE.MeshBasicMaterial, 
    feedback: VisualFeedback
  ): void {
    mesh.visible = true;
    
    const targetOpacity = feedback.opacity ?? 0.2;
    const color = feedback.color ?? [0.3, 0.7, 1.0];
    
    material.color.setRGB(...color);
    
    // Animate to target opacity
    this.animateOpacity(mesh, material, targetOpacity, this.transitionDuration);
  }

  /**
   * Set selected state (orange glow with immediate feedback)
   */
  private setSelectedState(
    mesh: THREE.Mesh, 
    material: THREE.MeshBasicMaterial, 
    feedback: VisualFeedback
  ): void {
    mesh.visible = true;
    
    const targetOpacity = feedback.opacity ?? 0.8; // High opacity for clear mouse down feedback
    const color = feedback.color ?? [1.0, 0.5, 0.0]; // Pure orange for gesture start
    
    material.color.setRGB(...color);
    
    // Immediate feedback - set opacity instantly, then animate to maintain responsiveness
    material.opacity = targetOpacity * 0.8; // Start at 80% of target
    this.animateOpacity(mesh, material, targetOpacity, this.transitionDuration / 2); // Faster animation
    
    if (this.pulseAnimation || feedback.pulse) {
      this.startPulseAnimation(feedback.face, material, targetOpacity, 200); // Slightly faster pulse
    }
  }

  /**
   * Set rotating state (red glow with pulse)
   */
  private setRotatingState(
    mesh: THREE.Mesh, 
    material: THREE.MeshBasicMaterial, 
    feedback: VisualFeedback
  ): void {
    mesh.visible = true;
    
    const targetOpacity = feedback.opacity ?? 0.6;
    const color = feedback.color ?? [1.0, 0.2, 0.2];
    
    material.color.setRGB(...color);
    
    // Animate to target opacity
    this.animateOpacity(mesh, material, targetOpacity, this.transitionDuration / 2);
    
    if (this.pulseAnimation || feedback.pulse) {
      this.startPulseAnimation(feedback.face, material, targetOpacity, 150); // Faster pulse
    }
  }

  /**
   * Set blocked state (red tint with low opacity)
   */
  private setBlockedState(
    mesh: THREE.Mesh, 
    material: THREE.MeshBasicMaterial, 
    feedback: VisualFeedback
  ): void {
    mesh.visible = true;
    
    const targetOpacity = feedback.opacity ?? 0.15;
    const color = feedback.color ?? [1.0, 0.3, 0.3];
    
    material.color.setRGB(...color);
    
    // Quick fade to show blocked state
    this.animateOpacity(mesh, material, targetOpacity, this.transitionDuration / 3);
  }

  /**
   * Set preview state (subtle highlight for direction preview)
   */
  private setPreviewState(
    mesh: THREE.Mesh, 
    material: THREE.MeshBasicMaterial, 
    feedback: VisualFeedback
  ): void {
    mesh.visible = true;
    
    const targetOpacity = feedback.opacity ?? 0.1;
    const color = feedback.color ?? [0.8, 0.8, 1.0];
    
    material.color.setRGB(...color);
    
    // Very subtle animation
    this.animateOpacity(mesh, material, targetOpacity, this.transitionDuration / 2);
  }

  /**
   * Set success state (green flash for completed moves)
   */
  private setSuccessState(
    mesh: THREE.Mesh, 
    material: THREE.MeshBasicMaterial, 
    feedback: VisualFeedback
  ): void {
    mesh.visible = true;
    
    const targetOpacity = feedback.opacity ?? 0.4;
    const color = feedback.color ?? [0.2, 1.0, 0.3];
    
    material.color.setRGB(...color);
    
    // Brief success animation
    this.animateOpacity(mesh, material, targetOpacity, this.transitionDuration / 2);
    
    // Auto-fade after brief display
    setTimeout(() => {
      this.animateOpacity(mesh, material, 0, this.transitionDuration);
      setTimeout(() => { mesh.visible = false; }, this.transitionDuration);
    }, 300);
  }

  /**
   * Animate opacity transition
   */
  private animateOpacity(
    _mesh: THREE.Mesh,
    material: THREE.MeshBasicMaterial,
    targetOpacity: number,
    duration: number
  ): void {
    const startOpacity = material.opacity;
    const startTime = performance.now();

    const animate = () => {
      const elapsed = performance.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Use ease-out easing
      const easedProgress = 1 - Math.pow(1 - progress, 3);
      
      material.opacity = startOpacity + (targetOpacity - startOpacity) * easedProgress;
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
  }

  /**
   * Start pulse animation for a face
   */
  private startPulseAnimation(
    face: FacePosition, 
    material: THREE.MeshBasicMaterial, 
    baseOpacity: number,
    period: number = 300
  ): void {
    if (!this.animationMixer) return;

    const pulseTrack = new THREE.NumberKeyframeTrack(
      `${face}.opacity`,
      [0, period / 2, period],
      [baseOpacity, baseOpacity * 1.5, baseOpacity]
    );

    const clip = new THREE.AnimationClip(`pulse-${face}`, period, [pulseTrack]);
    const action = this.animationMixer.clipAction(clip);
    
    action.setLoop(THREE.LoopRepeat, Infinity);
    action.play();

    this.activeAnimations.set(face, action);

    // Manually update opacity since Three.js doesn't automatically bind to material properties
    const updateOpacity = () => {
      if (this.animationMixer && action.isRunning()) {
        this.animationMixer.update(this.clock.getDelta());
        
        // Extract opacity value from the action and apply to material
        const time = action.time;
        const normalizedTime = (time % period) / period;
        const opacity = baseOpacity + Math.sin(normalizedTime * Math.PI * 2) * baseOpacity * 0.5;
        material.opacity = Math.max(0, Math.min(1, opacity));
        
        requestAnimationFrame(updateOpacity);
      }
    };

    requestAnimationFrame(updateOpacity);
  }

  /**
   * Stop animation for a specific face
   */
  private stopAnimation(face: FacePosition): void {
    const action = this.activeAnimations.get(face);
    if (action) {
      action.stop();
      this.activeAnimations.delete(face);
    }
  }

  /**
   * Clear all highlights
   */
  clearAll(): void {
    this.highlightMeshes.forEach((mesh, face) => {
      const material = this.highlightMaterials.get(face);
      if (material) {
        this.setNormalState(mesh, material);
      }
      this.stopAnimation(face);
    });
  }

  /**
   * Update animation system
   */
  update(): void {
    if (this.animationMixer) {
      this.animationMixer.update(this.clock.getDelta());
    }
  }

  /**
   * Get current highlight state for a face
   */
  getHighlightState(face: FacePosition): VisualFeedback['state'] {
    const mesh = this.highlightMeshes.get(face);
    const material = this.highlightMaterials.get(face);
    
    if (!mesh || !material || !mesh.visible || material.opacity === 0) {
      return 'normal';
    }

    // Determine state based on color and opacity
    const color = material.color;
    const opacity = material.opacity;
    
    if (color.r > 0.8 && color.g < 0.4 && color.b < 0.4 && opacity > 0.5) {
      return 'rotating';
    } else if (color.r > 0.8 && color.g < 0.4 && color.b < 0.4 && opacity < 0.3) {
      return 'blocked';
    } else if (color.r > 0.8 && color.g > 0.5 && color.b < 0.3) {
      return 'selected';
    } else if (color.r < 0.5 && color.g > 0.8 && color.b < 0.5) {
      return 'success';
    } else if (color.b > 0.8 && opacity > 0.15) {
      return 'hover';
    } else if (color.b > 0.8 && opacity < 0.15) {
      return 'preview';
    }
    
    return 'normal';
  }

  /**
   * Dispose of highlighting resources
   */
  dispose(): void {
    // Stop all animations
    this.activeAnimations.forEach(action => action.stop());
    this.activeAnimations.clear();

    // Dispose of meshes and materials
    this.highlightMeshes.forEach(mesh => {
      if (mesh.geometry) mesh.geometry.dispose();
      if (mesh.material) {
        if (Array.isArray(mesh.material)) {
          mesh.material.forEach(mat => mat.dispose());
        } else {
          mesh.material.dispose();
        }
      }
      this.cubeGroup.remove(mesh); // Remove from cube group instead of scene
    });

    this.highlightMeshes.clear();
    this.highlightMaterials.clear();
    this.originalMaterials.clear();

    if (this.animationMixer) {
      this.animationMixer.stopAllAction();
      this.animationMixer = undefined;
    }
  }
}