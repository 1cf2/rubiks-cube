import * as THREE from 'three';
import { 
  MousePosition, 
  FaceIntersection, 
  FacePosition, 
  CubeOperationResult, 
  CubeError,
  RaycastOptions 
} from '@rubiks-cube/shared/types';

export class RaycastingUtils {
  private static raycaster = new THREE.Raycaster();
  private static mouse = new THREE.Vector2();

  /**
   * Converts screen coordinates to normalized device coordinates
   */
  private static screenToNDC(
    mousePos: MousePosition, 
    canvas: HTMLCanvasElement
  ): THREE.Vector2 {
    const rect = canvas.getBoundingClientRect();
    const x = ((mousePos.x - rect.left) / rect.width) * 2 - 1;
    const y = -((mousePos.y - rect.top) / rect.height) * 2 + 1;
    return new THREE.Vector2(x, y);
  }

  /**
   * Converts screen coordinates to normalized device coordinates using any element
   */
  private static screenToNDCFromElement(
    mousePos: MousePosition, 
    element: HTMLElement
  ): THREE.Vector2 {
    const rect = element.getBoundingClientRect();
    const x = ((mousePos.x - rect.left) / rect.width) * 2 - 1;
    const y = -((mousePos.y - rect.top) / rect.height) * 2 + 1;
    return new THREE.Vector2(x, y);
  }

  /**
   * Determines which cube face was clicked based on mesh name or position
   */
  private static getFacePosition(mesh: THREE.Mesh): FacePosition | null {
    if (!mesh.name) return null;

    const faceMap: Record<string, FacePosition> = {
      'front-face': FacePosition.FRONT,
      'back-face': FacePosition.BACK,
      'left-face': FacePosition.LEFT,
      'right-face': FacePosition.RIGHT,
      'up-face': FacePosition.UP,
      'down-face': FacePosition.DOWN,
      'front': FacePosition.FRONT,
      'back': FacePosition.BACK,
      'left': FacePosition.LEFT,
      'right': FacePosition.RIGHT,
      'up': FacePosition.UP,
      'down': FacePosition.DOWN,
    };

    return faceMap[mesh.name.toLowerCase()] || null;
  }

  /**
   * Gets the normal vector for a cube face
   */
  private static getFaceNormal(face: FacePosition): readonly [number, number, number] {
    const normals: Record<FacePosition, readonly [number, number, number]> = {
      [FacePosition.FRONT]: [0, 0, 1],
      [FacePosition.BACK]: [0, 0, -1],
      [FacePosition.LEFT]: [-1, 0, 0],
      [FacePosition.RIGHT]: [1, 0, 0],
      [FacePosition.UP]: [0, 1, 0],
      [FacePosition.DOWN]: [0, -1, 0],
    };
    return normals[face];
  }

  /**
   * Performs raycasting to detect cube face intersections
   */
  static raycastCubeFaces(options: RaycastOptions): CubeOperationResult<FaceIntersection | null> {
    try {
      const { camera, scene, mouse: mousePos } = options;
      
      window.console.log('🔍 RaycastingUtils: Starting raycast', {
        hasCamera: !!camera,
        hasScene: !!scene,
        mousePos,
        sceneChildrenCount: scene?.children.length || 0
      });
      
      if (!camera || !scene) {
        window.console.log('❌ RaycastingUtils: Missing camera or scene');
        return {
          success: false,
          error: CubeError.RAYCASTING_FAILED,
          message: 'Camera or scene not provided',
        };
      }

      // Get canvas element or use the three.js container
      const canvas = document.querySelector('canvas');
      const container = document.querySelector('[data-testid="mouse-controls"]') as HTMLElement;
      const target = canvas || container;
      
      if (!target) {
        window.console.log('❌ RaycastingUtils: No canvas or container found');
        return {
          success: false,
          error: CubeError.RAYCASTING_FAILED,
          message: 'Canvas or container element not found',
        };
      }

      // Convert mouse position to normalized device coordinates
      this.mouse = canvas 
        ? RaycastingUtils.screenToNDC(mousePos, canvas as HTMLCanvasElement)
        : RaycastingUtils.screenToNDCFromElement(mousePos, target);
      window.console.log('🔍 RaycastingUtils: NDC coordinates', {
        original: mousePos,
        ndc: { x: this.mouse.x, y: this.mouse.y }
      });
      
      // Set up raycaster
      this.raycaster.setFromCamera(this.mouse, camera);

      // Find intersections with cube meshes
      const intersects = this.raycaster.intersectObjects(scene.children, options.recursive);
      window.console.log('🔍 RaycastingUtils: Raw intersections', {
        totalIntersects: intersects.length,
        intersectNames: intersects.map(i => i.object.name || 'unnamed')
      });

      // Filter for cube face meshes only
      const cubeIntersects = intersects.filter(intersect => {
        const mesh = intersect.object as THREE.Mesh;
        const facePosition = this.getFacePosition(mesh);
        window.console.log('🔍 RaycastingUtils: Checking mesh', {
          name: mesh.name,
          isMesh: mesh.isMesh,
          facePosition
        });
        return mesh.isMesh && facePosition !== null;
      });

      if (cubeIntersects.length === 0) {
        return { success: true, data: null };
      }

      // Get the closest intersection
      const closest = cubeIntersects[0];
      if (!closest) {
        return { success: true, data: null };
      }
      
      const mesh = closest.object as THREE.Mesh;
      const facePosition = this.getFacePosition(mesh);

      if (!facePosition) {
        return { success: true, data: null };
      }

      const intersection: FaceIntersection = {
        facePosition,
        point: [closest.point.x, closest.point.y, closest.point.z] as const,
        normal: this.getFaceNormal(facePosition),
        distance: closest.distance,
      };

      return { success: true, data: intersection };

    } catch (error) {
      return {
        success: false,
        error: CubeError.RAYCASTING_FAILED,
        message: error instanceof Error ? error.message : 'Unknown raycasting error',
      };
    }
  }

  /**
   * Checks if a point is within a specific face's bounds
   */
  static isPointOnFace(
    point: readonly [number, number, number], 
    face: FacePosition,
    cubeSize: number = 1
  ): boolean {
    const [x, y, z] = point;
    const halfSize = cubeSize / 2;

    switch (face) {
      case FacePosition.FRONT:
        return Math.abs(z - halfSize) < 0.1 && 
               Math.abs(x) <= halfSize && 
               Math.abs(y) <= halfSize;
      case FacePosition.BACK:
        return Math.abs(z + halfSize) < 0.1 && 
               Math.abs(x) <= halfSize && 
               Math.abs(y) <= halfSize;
      case FacePosition.LEFT:
        return Math.abs(x + halfSize) < 0.1 && 
               Math.abs(y) <= halfSize && 
               Math.abs(z) <= halfSize;
      case FacePosition.RIGHT:
        return Math.abs(x - halfSize) < 0.1 && 
               Math.abs(y) <= halfSize && 
               Math.abs(z) <= halfSize;
      case FacePosition.UP:
        return Math.abs(y - halfSize) < 0.1 && 
               Math.abs(x) <= halfSize && 
               Math.abs(z) <= halfSize;
      case FacePosition.DOWN:
        return Math.abs(y + halfSize) < 0.1 && 
               Math.abs(x) <= halfSize && 
               Math.abs(z) <= halfSize;
      default:
        return false;
    }
  }

  /**
   * Calculates rotation direction based on mouse movement relative to face normal
   */
  static calculateRotationDirection(
    startPos: MousePosition,
    endPos: MousePosition,
    face: FacePosition,
    camera: THREE.Camera
  ): CubeOperationResult<'clockwise' | 'counterclockwise'> {
    try {
      const deltaX = endPos.x - startPos.x;
      const deltaY = endPos.y - startPos.y;

      // Get camera's forward direction
      const cameraDirection = new THREE.Vector3();
      camera.getWorldDirection(cameraDirection);

      // Determine rotation direction based on face orientation and camera view
      switch (face) {
        case FacePosition.FRONT:
          return { 
            success: true, 
            data: deltaX > 0 ? 'clockwise' : 'counterclockwise' 
          };
        case FacePosition.BACK:
          return { 
            success: true, 
            data: deltaX > 0 ? 'counterclockwise' : 'clockwise' 
          };
        case FacePosition.LEFT:
          return { 
            success: true, 
            data: deltaY > 0 ? 'counterclockwise' : 'clockwise' 
          };
        case FacePosition.RIGHT:
          return { 
            success: true, 
            data: deltaY > 0 ? 'clockwise' : 'counterclockwise' 
          };
        case FacePosition.UP:
          return { 
            success: true, 
            data: deltaX > 0 ? 'clockwise' : 'counterclockwise' 
          };
        case FacePosition.DOWN:
          return { 
            success: true, 
            data: deltaX > 0 ? 'counterclockwise' : 'clockwise' 
          };
        default:
          return {
            success: false,
            error: CubeError.GESTURE_RECOGNITION_FAILED,
            message: 'Invalid face position',
          };
      }
    } catch (error) {
      return {
        success: false,
        error: CubeError.GESTURE_RECOGNITION_FAILED,
        message: error instanceof Error ? error.message : 'Failed to calculate rotation direction',
      };
    }
  }

  /**
   * Disposes of raycaster resources
   */
  static dispose(): void {
    // Three.js raycaster doesn't require explicit disposal
    // but we can clear references
    this.mouse.set(0, 0);
  }
}