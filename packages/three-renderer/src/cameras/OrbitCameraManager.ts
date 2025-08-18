import * as THREE from 'three';
import { 
  CameraState, 
  CameraOperationResult, 
  CameraError, 
  CameraConstraints,
  Vector3D,
  Quaternion,
  CameraPerformanceMetrics
} from '@rubiks-cube/shared';

/**
 * OrbitCameraManager - Manages Three.js camera for cube orientation controls
 * Maintains focus on cube center while allowing 360-degree viewing
 */
export class OrbitCameraManager {
  private camera: THREE.PerspectiveCamera;
  private target: THREE.Vector3;
  private constraints: CameraConstraints;
  private isAnimating: boolean = false;
  private lastFrameTime: number = 0;
  
  // Performance monitoring
  private frameRateTracker: number[] = [];
  private readonly FRAME_SAMPLE_SIZE = 60;

  constructor(
    camera: THREE.PerspectiveCamera,
    _scene: THREE.Scene,
    constraints: CameraConstraints
  ) {
    this.camera = camera;
    this.target = new THREE.Vector3(0, 0, 0); // Always cube center
    this.constraints = constraints;
    
    // Initialize camera to look at cube center
    this.camera.lookAt(this.target);
  }

  /**
   * Set camera position while maintaining focus on cube center
   */
  public setPosition(position: Vector3D): CameraOperationResult<void> {
    if (this.isAnimating) {
      return { success: false, error: CameraError.ANIMATION_IN_PROGRESS };
    }

    try {
      this.camera.position.set(position.x, position.y, position.z);
      this.camera.lookAt(this.target);
      this.camera.updateProjectionMatrix();
      
      return { success: true, data: undefined };
    } catch (error) {
      return { success: false, error: CameraError.INVALID_CAMERA_STATE };
    }
  }

  /**
   * Orbit camera around cube center
   */
  public orbit(deltaX: number, deltaY: number, sensitivity: number = 1.0): CameraOperationResult<void> {
    if (this.isAnimating) {
      return { success: false, error: CameraError.ANIMATION_IN_PROGRESS };
    }

    try {
      // Get current spherical coordinates relative to target
      const offset = new THREE.Vector3().subVectors(this.camera.position, this.target);
      const spherical = new THREE.Spherical().setFromVector3(offset);
      
      // Apply rotation with sensitivity
      spherical.theta -= deltaX * sensitivity * 0.01; // Horizontal rotation
      spherical.phi += deltaY * sensitivity * 0.01;   // Vertical rotation
      
      // Apply orbit constraints if defined
      if (this.constraints.orbitLimits) {
        const { minPolarAngle, maxPolarAngle, minAzimuthAngle, maxAzimuthAngle } = this.constraints.orbitLimits;
        
        if (minPolarAngle !== undefined) {
          spherical.phi = Math.max(minPolarAngle, spherical.phi);
        }
        if (maxPolarAngle !== undefined) {
          spherical.phi = Math.min(maxPolarAngle, spherical.phi);
        }
        if (minAzimuthAngle !== undefined) {
          spherical.theta = Math.max(minAzimuthAngle, spherical.theta);
        }
        if (maxAzimuthAngle !== undefined) {
          spherical.theta = Math.min(maxAzimuthAngle, spherical.theta);
        }
      }
      
      // Convert back to Cartesian coordinates
      offset.setFromSpherical(spherical);
      this.camera.position.copy(this.target).add(offset);
      this.camera.lookAt(this.target);
      
      return { success: true, data: undefined };
    } catch (error) {
      return { success: false, error: CameraError.ORBIT_CONSTRAINT_VIOLATION };
    }
  }

  /**
   * Zoom camera with constraints
   */
  public zoom(delta: number): CameraOperationResult<void> {
    if (this.isAnimating) {
      return { success: false, error: CameraError.ANIMATION_IN_PROGRESS };
    }

    try {
      // Calculate new distance from target
      const currentDistance = this.camera.position.distanceTo(this.target);
      const newDistance = currentDistance * (1 + delta);
      
      // Apply zoom constraints
      if (newDistance < this.constraints.zoomLimits.min || 
          newDistance > this.constraints.zoomLimits.max) {
        return { success: false, error: CameraError.ZOOM_LIMIT_EXCEEDED };
      }
      
      // Apply zoom by moving camera along its current direction
      const direction = new THREE.Vector3()
        .subVectors(this.camera.position, this.target)
        .normalize();
      
      this.camera.position.copy(this.target).add(direction.multiplyScalar(newDistance));
      
      return { success: true, data: undefined };
    } catch (error) {
      return { success: false, error: CameraError.INVALID_CAMERA_STATE };
    }
  }

  /**
   * Reset camera to default position
   */
  public resetPosition(defaultPosition: Vector3D, duration: number = 300): CameraOperationResult<Promise<void>> {
    if (this.isAnimating) {
      return { success: false, error: CameraError.ANIMATION_IN_PROGRESS };
    }

    return { 
      success: true, 
      data: this.animateToPosition(defaultPosition, duration) 
    };
  }

  /**
   * Animate camera to target position with smooth easing
   */
  private async animateToPosition(targetPosition: Vector3D, duration: number): Promise<void> {
    return new Promise((resolve) => {
      this.isAnimating = true;
      const startPosition = this.camera.position.clone();
      const startTime = performance.now();
      
      const animate = () => {
        const elapsed = performance.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        // Eased interpolation using cubic ease-out
        const easedProgress = 1 - Math.pow(1 - progress, 3);
        
        // Interpolate position
        this.camera.position.lerpVectors(
          startPosition,
          new THREE.Vector3(targetPosition.x, targetPosition.y, targetPosition.z),
          easedProgress
        );
        
        this.camera.lookAt(this.target);
        
        if (progress < 1) {
          requestAnimationFrame(animate);
        } else {
          this.isAnimating = false;
          resolve();
        }
      };
      
      animate();
    });
  }

  /**
   * Get current camera state
   */
  public getCameraState(): CameraState {
    const position: Vector3D = {
      x: this.camera.position.x,
      y: this.camera.position.y,
      z: this.camera.position.z
    };
    
    const rotation: Quaternion = {
      w: this.camera.quaternion.w,
      x: this.camera.quaternion.x,
      y: this.camera.quaternion.y,
      z: this.camera.quaternion.z
    };
    
    const target: Vector3D = {
      x: this.target.x,
      y: this.target.y,
      z: this.target.z
    };
    
    const zoom = this.camera.position.distanceTo(this.target);

    return {
      position,
      rotation,
      zoom,
      target,
      isAnimating: this.isAnimating,
      autoRotationEnabled: false // Will be managed by AutoRotationManager
    };
  }

  /**
   * Update performance metrics tracking
   */
  public updatePerformanceMetrics(): CameraPerformanceMetrics {
    const currentTime = performance.now();
    const frameTime = currentTime - this.lastFrameTime;
    
    if (this.lastFrameTime > 0) {
      this.frameRateTracker.push(1000 / frameTime);
      if (this.frameRateTracker.length > this.FRAME_SAMPLE_SIZE) {
        this.frameRateTracker.shift();
      }
    }
    
    this.lastFrameTime = currentTime;
    
    const frameRate = this.frameRateTracker.length > 0 
      ? this.frameRateTracker.reduce((a, b) => a + b) / this.frameRateTracker.length 
      : 0;
    
    return {
      frameRate,
      inputLatency: 0, // Will be measured by input processor
      animationDuration: this.isAnimating ? frameTime : 0,
      memoryUsage: this.estimateMemoryUsage()
    };
  }

  /**
   * Estimate memory usage for camera operations
   */
  private estimateMemoryUsage(): number {
    // Rough estimation in MB
    const baseUsage = 0.1; // Base camera object
    const animationUsage = this.isAnimating ? 0.5 : 0;
    const trackingUsage = this.frameRateTracker.length * 0.001;
    
    return baseUsage + animationUsage + trackingUsage;
  }

  /**
   * Check if camera is currently animating
   */
  public getIsAnimating(): boolean {
    return this.isAnimating;
  }

  /**
   * Get Three.js camera instance
   */
  public getCamera(): THREE.PerspectiveCamera {
    return this.camera;
  }

  /**
   * Get target point (cube center)
   */
  public getTarget(): THREE.Vector3 {
    return this.target.clone();
  }

  /**
   * Dispose resources and cleanup
   */
  public dispose(): void {
    this.frameRateTracker.length = 0;
    this.isAnimating = false;
  }
}