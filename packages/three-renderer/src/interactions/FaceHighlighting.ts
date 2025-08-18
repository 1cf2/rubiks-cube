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
  // Note: cubeGroup and highlightIntensity stored but not currently used in highlighting logic
  private transitionDuration: number;
  private pulseAnimation: boolean;

  private highlightMeshes = new Map<FacePosition, THREE.Mesh>();
  private originalMaterials = new Map<THREE.Mesh, THREE.Material | THREE.Material[]>();
  private highlightMaterials = new Map<FacePosition, THREE.MeshBasicMaterial>();
  
  private animationMixer: THREE.AnimationMixer | undefined;
  private activeAnimations = new Map<FacePosition, THREE.AnimationAction>();
  private clock = new THREE.Clock();

  constructor(options: FaceHighlightingOptions) {
    this.scene = options.scene;
    // Store options for potential future use
    // this.cubeGroup = options.cubeGroup;
    // this.highlightIntensity = options.highlightIntensity ?? 0.3;
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
      this.scene.add(highlightMesh);
      this.highlightMeshes.set(face, highlightMesh);
    });
  }

  /**
   * Create a highlight mesh for a specific face
   */
  private createHighlightMesh(face: FacePosition): THREE.Mesh {
    // Create geometry slightly larger than the face
    const geometry = new THREE.PlaneGeometry(1.02, 1.02);
    
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
   * Set normal state (no highlight)
   */
  private setNormalState(mesh: THREE.Mesh, material: THREE.MeshBasicMaterial): void {
    mesh.visible = false;
    material.opacity = 0;
    material.color.setHex(0xffffff);
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
   * Set selected state (orange glow)
   */
  private setSelectedState(
    mesh: THREE.Mesh, 
    material: THREE.MeshBasicMaterial, 
    feedback: VisualFeedback
  ): void {
    mesh.visible = true;
    
    const targetOpacity = feedback.opacity ?? 0.4;
    const color = feedback.color ?? [1.0, 0.6, 0.1];
    
    material.color.setRGB(...color);
    
    // Animate to target opacity with slight pulse if enabled
    this.animateOpacity(mesh, material, targetOpacity, this.transitionDuration);
    
    if (this.pulseAnimation) {
      this.startPulseAnimation(feedback.face, material, targetOpacity);
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
      this.scene.remove(mesh);
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