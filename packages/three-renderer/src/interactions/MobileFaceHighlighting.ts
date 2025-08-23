/**
 * Mobile Face Highlighting System
 * Mobile-optimized visual feedback with touch point indicators and enhanced highlighting
 */

import * as THREE from 'three';
import { FacePosition, Vector2, TouchOperationResult, TouchError } from '@rubiks-cube/shared/types';

export interface TouchPointIndicator {
  readonly id: number;
  readonly position: Vector2;
  readonly worldPosition: THREE.Vector3;
  readonly timestamp: number;
  readonly mesh: THREE.Mesh;
  readonly rippleAnimation?: THREE.AnimationMixer;
}

export interface MobileFeedbackState {
  readonly highlightedFace: FacePosition | null;
  readonly touchPoints: ReadonlyMap<number, TouchPointIndicator>;
  readonly isAnimating: boolean;
  readonly feedbackIntensity: number; // 0-1 for battery optimization
}

export class MobileFaceHighlighting {
  private scene: THREE.Scene;
  private camera: THREE.Camera;
  private highlightMaterials: Map<FacePosition, THREE.Material> = new Map();
  private originalMaterials: Map<FacePosition, THREE.Material> = new Map();
  private touchPointGeometry: THREE.RingGeometry | null = null;
  private touchPointMaterial: THREE.MeshBasicMaterial | null = null;
  private touchIndicators: Map<number, TouchPointIndicator> = new Map();
  private animationMixers: THREE.AnimationMixer[] = [];
  private feedbackState: MobileFeedbackState;
  
  // Performance optimization
  private lastUpdateTime: number = 0;
  private readonly UPDATE_INTERVAL = 16; // 60fps max, but mobile targets 30fps

  constructor(scene: THREE.Scene, camera: THREE.Camera) {
    this.scene = scene;
    this.camera = camera;
    
    this.initializeMaterials();
    
    this.feedbackState = {
      highlightedFace: null,
      touchPoints: new Map(),
      isAnimating: false,
      feedbackIntensity: 1.0, // Full intensity by default
    };
  }
  
  private initializeMaterials(): void {
    this.touchPointGeometry = new THREE.RingGeometry(0.02, 0.05, 8);
    this.touchPointMaterial = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.2
    });
    this.initializeHighlightMaterials();
  }

  /**
   * Initialize highlight materials for mobile with optimized shaders
   */
  private initializeHighlightMaterials(): void {
    // Create optimized materials for mobile performance
    const faces: FacePosition[] = [
      FacePosition.FRONT,
      FacePosition.BACK,
      FacePosition.LEFT,
      FacePosition.RIGHT,
      FacePosition.UP,
      FacePosition.DOWN,
    ];

    faces.forEach(face => {
      // Mobile-optimized highlight material with reduced complexity
      const highlightMaterial = new THREE.MeshLambertMaterial({
        transparent: true,
        opacity: 0.2,
        emissive: new THREE.Color(0xffffff),
        emissiveIntensity: 0.2,
        side: THREE.DoubleSide,
      });

      this.highlightMaterials.set(face, highlightMaterial);
    });
  }


  /**
   * Add touch point indicator at screen position
   */
  addTouchPoint(
    touchId: number,
    screenPosition: Vector2
  ): TouchOperationResult<TouchPointIndicator> {
    try {
      if (!this.touchPointGeometry || !this.touchPointMaterial) {
        return {
          success: false,
          error: TouchError.INVALID_GESTURE,
          message: 'Touch point materials not initialized'
        };
      }
      // Convert screen position to world coordinates
      const worldPosition = this.screenToWorldPosition(screenPosition);
      
      if (!worldPosition.success) {
        return worldPosition as TouchOperationResult<TouchPointIndicator>;
      }

      // Create touch indicator mesh
      const mesh = new THREE.Mesh(this.touchPointGeometry, this.touchPointMaterial.clone());
      mesh.position.copy(worldPosition.data);
      mesh.scale.set(this.feedbackState.feedbackIntensity, this.feedbackState.feedbackIntensity, 1);
      
      // Add to scene
      this.scene.add(mesh);

      // Create ripple animation for mobile feedback
      const rippleAnimation = this.createRippleAnimation(mesh);

      const indicator: TouchPointIndicator = {
        id: touchId,
        position: screenPosition,
        worldPosition: worldPosition.data,
        timestamp: Date.now(),
        mesh,
        rippleAnimation,
      };

      this.touchIndicators.set(touchId, indicator);
      
      // Update feedback state
      this.feedbackState = {
        ...this.feedbackState,
        touchPoints: new Map(this.touchIndicators),
        isAnimating: true,
      };

      return { success: true, data: indicator };

    } catch (error) {
      return {
        success: false,
        error: TouchError.INVALID_GESTURE,
        message: error instanceof Error ? error.message : 'Failed to create touch indicator'
      };
    }
  }

  /**
   * Remove touch point indicator
   */
  removeTouchPoint(touchId: number): void {
    const indicator = this.touchIndicators.get(touchId);
    if (!indicator) return;

    // Fade out animation before removal
    this.fadeOutTouchIndicator(indicator, () => {
      this.scene.remove(indicator.mesh);
      indicator.mesh.geometry.dispose();
      (indicator.mesh.material as THREE.Material).dispose();
      
      if (indicator.rippleAnimation) {
        this.animationMixers = this.animationMixers.filter(mixer => mixer !== indicator.rippleAnimation);
      }
    });

    this.touchIndicators.delete(touchId);
    
    // Update feedback state
    this.feedbackState = {
      ...this.feedbackState,
      touchPoints: new Map(this.touchIndicators),
      isAnimating: this.touchIndicators.size > 0,
    };
  }

  /**
   * Highlight face with mobile-optimized feedback
   */
  highlightFace(face: FacePosition, intensity: number = 1.0): TouchOperationResult<void> {
    try {
      // Clear previous highlights
      this.clearHighlights();

      // Find cube face mesh in scene
      const faceMesh = this.findFaceMesh(face);
      if (!faceMesh) {
        return {
          success: false,
          error: TouchError.INVALID_GESTURE,
          message: `Face mesh not found for ${face}`
        };
      }

      // Store original material if not already stored
      if (!this.originalMaterials.has(face)) {
        this.originalMaterials.set(face, faceMesh.material as THREE.Material);
      }

      // Apply highlight material with mobile optimizations
      const highlightMaterial = this.highlightMaterials.get(face);
      if (highlightMaterial) {
        // Adjust intensity for mobile performance and battery
        const adjustedIntensity = intensity * this.feedbackState.feedbackIntensity;
        (highlightMaterial as THREE.MeshLambertMaterial).emissiveIntensity = adjustedIntensity * 0.2;
        (highlightMaterial as THREE.MeshLambertMaterial).opacity = adjustedIntensity * 0.2;
        
        faceMesh.material = highlightMaterial;
      }

      // Update feedback state
      this.feedbackState = {
        ...this.feedbackState,
        highlightedFace: face,
      };

      return { success: true, data: undefined };

    } catch (error) {
      return {
        success: false,
        error: TouchError.INVALID_GESTURE,
        message: error instanceof Error ? error.message : 'Failed to highlight face'
      };
    }
  }

  /**
   * Clear all highlights and restore original materials
   */
  clearHighlights(): void {
    this.originalMaterials.forEach((originalMaterial, face) => {
      const faceMesh = this.findFaceMesh(face);
      if (faceMesh) {
        faceMesh.material = originalMaterial;
      }
    });

    this.feedbackState = {
      ...this.feedbackState,
      highlightedFace: null,
    };
  }

  /**
   * Update animations and visual feedback (mobile-optimized)
   */
  update(deltaTime: number): void {
    const now = Date.now();
    
    // Throttle updates for mobile performance (target 30fps)
    if (now - this.lastUpdateTime < this.UPDATE_INTERVAL * 2) {
      return;
    }
    
    this.lastUpdateTime = now;

    // Update ripple animations
    this.animationMixers.forEach(mixer => {
      mixer.update(deltaTime);
    });

    // Clean up expired touch indicators
    this.touchIndicators.forEach((indicator, id) => {
      const age = now - indicator.timestamp;
      if (age > 1000) { // Remove after 1 second
        this.removeTouchPoint(id);
      }
    });

    // Update feedback intensity based on performance
    this.adjustFeedbackIntensity();
  }

  /**
   * Adjust feedback intensity for mobile performance and battery optimization
   */
  private adjustFeedbackIntensity(): void {
    // This would integrate with the mobile performance monitoring
    // For now, use a simple heuristic based on device capabilities
    const isMobile = /Mobi|Android/i.test(navigator.userAgent);
    const isLowPower = (navigator as any).getBattery?.().level < 0.2;
    
    let targetIntensity = 1.0;
    
    if (isMobile) {
      targetIntensity = 0.7; // Reduce intensity on mobile
    }
    
    if (isLowPower) {
      targetIntensity = 0.4; // Further reduce for battery saving
    }

    // Smooth transition to target intensity
    const currentIntensity = this.feedbackState.feedbackIntensity;
    const newIntensity = currentIntensity + (targetIntensity - currentIntensity) * 0.1;
    
    if (Math.abs(newIntensity - currentIntensity) > 0.01) {
      this.feedbackState = {
        ...this.feedbackState,
        feedbackIntensity: newIntensity,
      };
    }
  }

  /**
   * Convert screen coordinates to 3D world position
   */
  private screenToWorldPosition(screenPos: Vector2): TouchOperationResult<THREE.Vector3> {
    try {
      const vector = new THREE.Vector3(screenPos.x, screenPos.y, 0.5);
      vector.unproject(this.camera);
      
      const dir = vector.sub(this.camera.position).normalize();
      const distance = -this.camera.position.z / dir.z;
      const pos = this.camera.position.clone().add(dir.multiplyScalar(distance));
      
      return { success: true, data: pos };

    } catch (error) {
      return {
        success: false,
        error: TouchError.INVALID_GESTURE,
        message: 'Failed to convert screen to world coordinates'
      };
    }
  }

  /**
   * Create ripple animation for touch feedback
   */
  private createRippleAnimation(mesh: THREE.Mesh): THREE.AnimationMixer {
    const mixer = new THREE.AnimationMixer(mesh);
    
    // Create scale animation for ripple effect
    const scaleTrack = new THREE.VectorKeyframeTrack(
      '.scale',
      [0, 0.3, 0.6],
      [1, 1, 1, 2, 2, 1, 0, 0, 0]
    );
    
    // Create opacity animation
    const opacityTrack = new THREE.NumberKeyframeTrack(
      '.material.opacity',
      [0, 0.3, 0.6],
      [0.8, 0.4, 0]
    );
    
    const clip = new THREE.AnimationClip('ripple', 0.6, [scaleTrack, opacityTrack]);
    const action = mixer.clipAction(clip);
    
    action.setLoop(THREE.LoopOnce, 1);
    action.clampWhenFinished = true;
    action.play();
    
    this.animationMixers.push(mixer);
    
    return mixer;
  }

  /**
   * Fade out touch indicator with animation
   */
  private fadeOutTouchIndicator(indicator: TouchPointIndicator, onComplete: () => void): void {
    const material = indicator.mesh.material as THREE.MeshBasicMaterial;
    const startOpacity = material.opacity;
    const duration = 200; // ms
    const startTime = Date.now();
    
    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      material.opacity = startOpacity * (1 - progress);
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        onComplete();
      }
    };
    
    animate();
  }

  /**
   * Find face mesh in scene by face position
   */
  private findFaceMesh(face: FacePosition): THREE.Mesh | null {
    const faceNames = [
      `${face}-face`,
      face,
      `cube-${face}`,
    ];

    for (const child of this.scene.children) {
      if (child instanceof THREE.Mesh) {
        const meshName = child.name.toLowerCase();
        if (faceNames.some(name => meshName.includes(name.toLowerCase()))) {
          return child;
        }
      }
    }

    return null;
  }

  /**
   * Get current feedback state
   */
  getFeedbackState(): MobileFeedbackState {
    return this.feedbackState;
  }

  /**
   * Dispose of resources
   */
  dispose(): void {
    // Clean up geometries and materials
    this.touchPointGeometry?.dispose();
    this.touchPointMaterial?.dispose();
    
    this.highlightMaterials.forEach(material => {
      material.dispose();
    });

    // Clean up touch indicators
    this.touchIndicators.forEach(indicator => {
      this.scene.remove(indicator.mesh);
      indicator.mesh.geometry.dispose();
      (indicator.mesh.material as THREE.Material).dispose();
    });

    // Clean up animation mixers
    this.animationMixers.forEach(mixer => {
      mixer.stopAllAction();
    });

    this.touchIndicators.clear();
    this.highlightMaterials.clear();
    this.originalMaterials.clear();
    this.animationMixers.length = 0;
  }
}