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
   * Determines which specific face was clicked based on the face normal from raycaster
   */
  private static getClickedFace(
    mesh: THREE.Mesh, 
    intersectionPoint: THREE.Vector3,
    faceNormal?: THREE.Vector3
  ): FacePosition | null {
    // If we have a face normal from raycaster, use it (most accurate)
    if (faceNormal) {
      // Transform face normal from local space to world space to account for rotations
      const worldNormal = faceNormal.clone();
      worldNormal.transformDirection(mesh.matrixWorld);
      worldNormal.normalize();
      
      const absX = Math.abs(worldNormal.x);
      const absY = Math.abs(worldNormal.y);
      const absZ = Math.abs(worldNormal.z);
      
      window.console.log('🎯 Face normal analysis:', {
        originalNormal: { x: faceNormal.x, y: faceNormal.y, z: faceNormal.z },
        worldNormal: { x: worldNormal.x, y: worldNormal.y, z: worldNormal.z },
        meshPosition: { x: mesh.position.x, y: mesh.position.y, z: mesh.position.z },
        meshRotation: { 
          x: mesh.rotation.x, 
          y: mesh.rotation.y, 
          z: mesh.rotation.z 
        }
      });
      
      // Find the dominant axis and its direction in world space
      if (absX > absY && absX > absZ) {
        return worldNormal.x > 0 ? FacePosition.RIGHT : FacePosition.LEFT;
      } else if (absY > absX && absY > absZ) {
        return worldNormal.y > 0 ? FacePosition.UP : FacePosition.DOWN;
      } else if (absZ > absX && absZ > absY) {
        return worldNormal.z > 0 ? FacePosition.FRONT : FacePosition.BACK;
      }
    }
    
    // Fallback: use intersection point relative to piece center
    const piecePos = mesh.position;
    const relativeX = intersectionPoint.x - piecePos.x;
    const relativeY = intersectionPoint.y - piecePos.y;
    const relativeZ = intersectionPoint.z - piecePos.z;
    
    // Cube pieces are 0.95 units, so surface is at ±0.475 from center
    const surfaceThreshold = 0.4; // Slightly less than 0.475 to account for precision
    
    
    // Check which face surface the intersection is closest to
    if (relativeX > surfaceThreshold) return FacePosition.RIGHT;
    if (relativeX < -surfaceThreshold) return FacePosition.LEFT;
    if (relativeY > surfaceThreshold) return FacePosition.UP;
    if (relativeY < -surfaceThreshold) return FacePosition.DOWN;
    if (relativeZ > surfaceThreshold) return FacePosition.FRONT;
    if (relativeZ < -surfaceThreshold) return FacePosition.BACK;
    
    // Final fallback to primary face if intersection is too close to center
    return this.getPrimaryFaceFromPosition(mesh);
  }

  /**
   * Determines the primary visible face of a cube piece based on its position (fallback method)
   */
  private static getPrimaryFaceFromPosition(mesh: THREE.Mesh): FacePosition | null {
    const position = mesh.position;
    
    // Round to handle floating point precision
    const x = Math.round(position.x);
    const y = Math.round(position.y);
    const z = Math.round(position.z);
    
    // Determine which face this piece primarily belongs to
    // Priority: front > back > right > left > up > down (to match naming logic)
    if (z === 1) return FacePosition.FRONT;
    if (z === -1) return FacePosition.BACK;
    if (x === 1) return FacePosition.RIGHT;
    if (x === -1) return FacePosition.LEFT;
    if (y === 1) return FacePosition.UP;
    if (y === -1) return FacePosition.DOWN;
    
    return null;
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
      
      if (!camera || !scene) {
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
      
      // Set up raycaster
      this.raycaster.setFromCamera(this.mouse, camera);

      // Find intersections with cube meshes
      const intersects = this.raycaster.intersectObjects(scene.children, options.recursive);

      // Filter for cube meshes and get their face positions
      const cubeIntersects = intersects.filter(intersect => {
        const mesh = intersect.object as THREE.Mesh;
        return mesh.isMesh && mesh.geometry && mesh.position;
      }).map(intersect => {
        const mesh = intersect.object as THREE.Mesh;
        
        let facePosition = this.getFacePosition(mesh);
        
        // ALWAYS use face normal detection for better accuracy when available
        if (intersect.face?.normal) {
          const normalBasedFace = this.getClickedFace(mesh, intersect.point, intersect.face.normal);
          if (normalBasedFace) {
            facePosition = normalBasedFace;
          }
        }
        
        // If still no face position, use intersection point analysis
        if (!facePosition) {
          facePosition = this.getClickedFace(mesh, intersect.point);
        }
        
        // Final fallback to position-based lookup
        if (!facePosition) {
          facePosition = this.getPrimaryFaceFromPosition(mesh);
        }
        
        return {
          ...intersect,
          facePosition,
          mesh
        };
      }).filter(item => item.facePosition !== null);

      if (cubeIntersects.length === 0) {
        return { success: true, data: null };
      }

      // Get the closest intersection
      const closest = cubeIntersects[0];
      if (!closest || !closest.facePosition) {
        return { success: true, data: null };
      }
      
      const mesh = closest.mesh;
      const facePosition = closest.facePosition;

      // Debug logging for raycast results
      window.console.log('🎯 Raycasting result:', {
        meshName: mesh.name,
        meshPosition: { x: mesh.position.x, y: mesh.position.y, z: mesh.position.z },
        intersectionPoint: [closest.point.x, closest.point.y, closest.point.z],
        detectedFace: facePosition,
        userData: mesh.userData,
        faceIndex: closest.face?.materialIndex,
        faceNormal: closest.face ? [closest.face.normal.x, closest.face.normal.y, closest.face.normal.z] : null,
        distance: closest.distance
      });

      const intersection: FaceIntersection = {
        facePosition,
        point: [closest.point.x, closest.point.y, closest.point.z] as const,
        normal: this.getFaceNormal(facePosition),
        distance: closest.distance,
        mesh: mesh, // Include the actual mesh that was clicked
        ...(closest.face && { hitNormal: [closest.face.normal.x, closest.face.normal.y, closest.face.normal.z] as const }),
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