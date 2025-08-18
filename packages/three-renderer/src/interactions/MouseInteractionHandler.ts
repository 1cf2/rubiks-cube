import * as THREE from 'three';
import { 
  MousePosition,
  FacePosition,
  VisualFeedback,
  CubeOperationResult,
  CubeError,
  PerformanceMetrics,
} from '@rubiks-cube/shared/types';

export interface MouseInteractionHandlerOptions {
  scene: THREE.Scene;
  camera: THREE.Camera;
  renderer: THREE.WebGLRenderer;
  cubeGroup: THREE.Group;
  onPerformanceUpdate?: (metrics: PerformanceMetrics) => void;
}

export class MouseInteractionHandler {
  private scene: THREE.Scene;
  private camera: THREE.Camera;
  private renderer: THREE.WebGLRenderer;
  private cubeGroup: THREE.Group;
  
  private raycaster = new THREE.Raycaster();
  private mouse = new THREE.Vector2();
  
  private faceHighlights = new Map<FacePosition, THREE.Mesh>();
  private originalMaterials = new Map<THREE.Mesh, THREE.Material>();
  
  private performanceMonitor = {
    frameCount: 0,
    lastTime: 0,
    frameRate: 60,
    inputLatency: 0,
    memoryUsage: 0,
  };

  private onPerformanceUpdate: ((metrics: PerformanceMetrics) => void) | undefined;

  constructor(options: MouseInteractionHandlerOptions) {
    this.scene = options.scene;
    this.camera = options.camera;
    this.renderer = options.renderer;
    this.cubeGroup = options.cubeGroup;
    this.onPerformanceUpdate = options.onPerformanceUpdate;

    this.initializeFaceHighlights();
    this.startPerformanceMonitoring();
  }

  /**
   * Initialize highlight materials and meshes for each cube face
   */
  private initializeFaceHighlights(): void {
    const faces = [
      FacePosition.FRONT,
      FacePosition.BACK,
      FacePosition.LEFT,
      FacePosition.RIGHT,
      FacePosition.UP,
      FacePosition.DOWN,
    ];

    faces.forEach(face => {
      // Create highlight geometry (slightly larger than face)
      const geometry = new THREE.PlaneGeometry(1.1, 1.1);
      
      // Create highlight material with transparency and emissive properties
      const material = new THREE.MeshPhongMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0,
        side: THREE.DoubleSide,
        depthTest: false,
        depthWrite: false,
        emissive: 0x000000,
      });

      const highlightMesh = new THREE.Mesh(geometry, material);
      highlightMesh.name = `${face}-highlight`;
      highlightMesh.visible = false;

      // Position highlight based on face
      this.positionHighlight(highlightMesh, face);
      
      this.scene.add(highlightMesh);
      this.faceHighlights.set(face, highlightMesh);
    });
  }

  /**
   * Position highlight mesh for specific face
   */
  private positionHighlight(mesh: THREE.Mesh, face: FacePosition): void {
    const distance = 0.51; // Slightly outside cube surface

    switch (face) {
      case FacePosition.FRONT:
        mesh.position.set(0, 0, distance);
        break;
      case FacePosition.BACK:
        mesh.position.set(0, 0, -distance);
        mesh.rotation.y = Math.PI;
        break;
      case FacePosition.LEFT:
        mesh.position.set(-distance, 0, 0);
        mesh.rotation.y = -Math.PI / 2;
        break;
      case FacePosition.RIGHT:
        mesh.position.set(distance, 0, 0);
        mesh.rotation.y = Math.PI / 2;
        break;
      case FacePosition.UP:
        mesh.position.set(0, distance, 0);
        mesh.rotation.x = -Math.PI / 2;
        break;
      case FacePosition.DOWN:
        mesh.position.set(0, -distance, 0);
        mesh.rotation.x = Math.PI / 2;
        break;
    }
  }

  /**
   * Update visual feedback for a specific face
   */
  updateFaceHighlight(feedback: VisualFeedback): CubeOperationResult<void> {
    try {
      const highlight = this.faceHighlights.get(feedback.face);
      if (!highlight) {
        return {
          success: false,
          error: CubeError.INVALID_MOVE,
          message: `Highlight mesh not found for face: ${feedback.face}`,
        };
      }

      const material = highlight.material as THREE.MeshPhongMaterial;

      // Update material properties based on feedback state
      switch (feedback.state) {
        case 'normal':
          highlight.visible = false;
          material.opacity = 0;
          break;
          
        case 'hover':
          highlight.visible = true;
          material.opacity = 0.2;
          material.color.setRGB(0.5, 0.8, 1.0); // Light blue
          material.emissive.setRGB(0, 0, 0);
          break;
          
        case 'selected':
          highlight.visible = true;
          material.opacity = 0.4;
          material.color.setRGB(1.0, 0.8, 0.2); // Orange
          material.emissive.setRGB(0.1, 0.05, 0);
          break;
          
        case 'rotating':
          highlight.visible = true;
          material.opacity = 0.6;
          material.color.setRGB(1.0, 0.2, 0.2); // Red
          material.emissive.setRGB(0.1, 0, 0);
          break;
      }

      // Apply custom opacity and color if provided
      if (feedback.opacity !== undefined) {
        material.opacity = feedback.opacity;
      }

      if (feedback.color) {
        material.color.setRGB(...feedback.color);
      }

      if (feedback.emissiveIntensity !== undefined) {
        const intensity = feedback.emissiveIntensity;
        material.emissive.multiplyScalar(intensity);
      }

      return { success: true, data: undefined };

    } catch (error) {
      return {
        success: false,
        error: CubeError.WEBGL_CONTEXT_LOST,
        message: error instanceof Error ? error.message : 'Failed to update face highlight',
      };
    }
  }

  /**
   * Clear all face highlights
   */
  clearAllHighlights(): void {
    this.faceHighlights.forEach(highlight => {
      highlight.visible = false;
      (highlight.material as THREE.MeshBasicMaterial).opacity = 0;
    });
  }

  /**
   * Get face intersection from mouse position
   */
  getFaceIntersection(mousePos: MousePosition): CubeOperationResult<FacePosition | null> {
    try {
      const canvas = this.renderer.domElement;
      const rect = canvas.getBoundingClientRect();

      // Convert to normalized device coordinates
      this.mouse.x = ((mousePos.x - rect.left) / rect.width) * 2 - 1;
      this.mouse.y = -((mousePos.y - rect.top) / rect.height) * 2 + 1;

      this.raycaster.setFromCamera(this.mouse, this.camera);

      // Intersect with cube meshes only
      const cubeChildren = this.cubeGroup.children.filter(child => 
        child instanceof THREE.Mesh && !child.name.includes('highlight')
      );
      
      const intersects = this.raycaster.intersectObjects(cubeChildren, true);

      if (intersects.length === 0) {
        return { success: true, data: null };
      }

      // Determine face from intersection
      const firstIntersect = intersects[0];
      if (!firstIntersect) {
        return { success: true, data: null };
      }
      
      const intersectedMesh = firstIntersect.object as THREE.Mesh;
      const face = this.determineFaceFromMesh(intersectedMesh, firstIntersect.point);

      return { success: true, data: face };

    } catch (error) {
      return {
        success: false,
        error: CubeError.RAYCASTING_FAILED,
        message: error instanceof Error ? error.message : 'Raycasting failed',
      };
    }
  }

  /**
   * Determine which face was intersected based on mesh and intersection point
   */
  private determineFaceFromMesh(_mesh: THREE.Mesh, point: THREE.Vector3): FacePosition | null {
    // Convert intersection point to local cube coordinates
    const localPoint = this.cubeGroup.worldToLocal(point.clone());
    
    // Distance threshold for face boundary detection: 0.4

    // Determine face based on which coordinate is closest to the edge
    const absX = Math.abs(localPoint.x);
    const absY = Math.abs(localPoint.y);
    const absZ = Math.abs(localPoint.z);

    if (absX > absY && absX > absZ) {
      return localPoint.x > 0 ? FacePosition.RIGHT : FacePosition.LEFT;
    } else if (absY > absX && absY > absZ) {
      return localPoint.y > 0 ? FacePosition.UP : FacePosition.DOWN;
    } else if (absZ > absX && absZ > absY) {
      return localPoint.z > 0 ? FacePosition.FRONT : FacePosition.BACK;
    }

    return null;
  }

  /**
   * Start performance monitoring
   */
  private startPerformanceMonitoring(): void {
    const monitor = () => {
      const now = performance.now();
      this.performanceMonitor.frameCount++;

      if (now - this.performanceMonitor.lastTime >= 1000) {
        this.performanceMonitor.frameRate = 
          this.performanceMonitor.frameCount * 1000 / (now - this.performanceMonitor.lastTime);
        
        this.performanceMonitor.frameCount = 0;
        this.performanceMonitor.lastTime = now;

        // Estimate memory usage (approximate)
        if ((performance as any).memory) {
          this.performanceMonitor.memoryUsage = 
            (performance as any).memory.usedJSHeapSize / 1048576; // MB
        }

        const metrics: PerformanceMetrics = {
          frameRate: this.performanceMonitor.frameRate,
          inputLatency: this.performanceMonitor.inputLatency,
          animationLatency: 0, // To be updated by animation system
          memoryUsage: this.performanceMonitor.memoryUsage,
        };

        this.onPerformanceUpdate?.(metrics);
      }

      requestAnimationFrame(monitor);
    };

    requestAnimationFrame(monitor);
  }

  /**
   * Update input latency measurement
   */
  updateInputLatency(latency: number): void {
    this.performanceMonitor.inputLatency = latency;
  }

  /**
   * Dispose of resources
   */
  dispose(): void {
    // Dispose of highlight meshes and materials
    this.faceHighlights.forEach(highlight => {
      if (highlight.geometry) highlight.geometry.dispose();
      if (highlight.material) {
        if (Array.isArray(highlight.material)) {
          highlight.material.forEach(mat => mat.dispose());
        } else {
          highlight.material.dispose();
        }
      }
      this.scene.remove(highlight);
    });

    this.faceHighlights.clear();
    this.originalMaterials.clear();
  }
}