import * as THREE from 'three';

export interface GestureLayerInfo {
  axis: 'x' | 'y' | 'z';
  layerIndex: number; // -1, 0, or 1 for the three layers along each axis
  pieces: Array<readonly [number, number, number]>; // All 9 pieces in this layer
  direction: 'clockwise' | 'counterclockwise'; // Rotation direction based on gesture
}

export class GestureLayerDetection {
  /**
   * Determines which layer to highlight based on a gesture between two pieces
   * @param startPiece - The first piece position [x, y, z] 
   * @param endPiece - The second piece position [x, y, z]
   * @returns Layer information or null if no valid layer detected
   */
  static detectLayerFromGesture(
    startPiece: readonly [number, number, number],
    endPiece: readonly [number, number, number]
  ): GestureLayerInfo | null {
    
    // Normalize piece positions to cube grid coordinates (-1, 0, 1)
    const start = [
      Math.round(startPiece[0]),
      Math.round(startPiece[1]), 
      Math.round(startPiece[2])
    ] as const;
    
    const end = [
      Math.round(endPiece[0]),
      Math.round(endPiece[1]),
      Math.round(endPiece[2])
    ] as const;


    // Calculate the gesture vector between pieces
    const gestureVector = [
      end[0] - start[0],
      end[1] - start[1], 
      end[2] - start[2]
    ] as const;


    // Analyze spatial relationship to determine rotational layer and direction
    const result = this.analyzeGestureVector(start, end, gestureVector);
    if (result) {
      window.console.log(`${start} → ${end} = ${result.direction}`);
    }
    return result;
  }

  /**
   * Analyzes the gesture vector to determine which rotational layer is intended
   */
  private static analyzeGestureVector(
    start: readonly [number, number, number],
    end: readonly [number, number, number],
    gestureVector: readonly [number, number, number]
  ): GestureLayerInfo | null {
    
    // Find the dominant axis of movement
    const absVector = [
      Math.abs(gestureVector[0]),
      Math.abs(gestureVector[1]),
      Math.abs(gestureVector[2])
    ];

    const maxAxis = absVector.indexOf(Math.max(...absVector));
    const maxMovement = Math.max(...absVector);
    

    // If no significant movement, check for shared layers
    if (maxMovement === 0) {
      return this.findSharedLayer(start, end);
    }

    // Determine rotation axis based on gesture direction
    switch (maxAxis) {
      case 0: // X-axis movement
        return this.getLayerFromXMovement(start, end);
      case 1: // Y-axis movement  
        return this.getLayerFromYMovement(start, end);
      case 2: // Z-axis movement
        return this.getLayerFromZMovement(start, end);
      default:
        return null;
    }
  }

  /**
   * Find layer when pieces share a common coordinate plane
   */
  private static findSharedLayer(
    start: readonly [number, number, number],
    end: readonly [number, number, number]
  ): GestureLayerInfo | null {
    // Check if pieces share the same layer on any axis
    if (start[0] === end[0]) {
      // Same X layer - can rotate around X axis
      const direction = this.calculateRotationDirection(start, end, 'x');
      return {
        axis: 'x',
        layerIndex: start[0],
        pieces: this.getLayerPieces('x', start[0]),
        direction
      };
    }
    
    if (start[1] === end[1]) {
      // Same Y layer - can rotate around Y axis  
      const direction = this.calculateRotationDirection(start, end, 'y');
      return {
        axis: 'y',
        layerIndex: start[1],
        pieces: this.getLayerPieces('y', start[1]),
        direction
      };
    }
    
    if (start[2] === end[2]) {
      // Same Z layer - can rotate around Z axis
      const direction = this.calculateRotationDirection(start, end, 'z');
      return {
        axis: 'z', 
        layerIndex: start[2],
        pieces: this.getLayerPieces('z', start[2]),
        direction
      };
    }

    return null;
  }

  /**
   * Determine layer from horizontal (X-axis) movement
   */
  private static getLayerFromXMovement(
    start: readonly [number, number, number],
    end: readonly [number, number, number]
  ): GestureLayerInfo | null {
    // Horizontal movement suggests rotation around Y or Z axis
    // Choose the axis where both pieces share the same coordinate
    if (start[1] === end[1]) {
      // Same Y coordinate - rotate around Y axis
      const direction = this.calculateRotationDirection(start, end, 'y');
      return {
        axis: 'y',
        layerIndex: start[1], 
        pieces: this.getLayerPieces('y', start[1]),
        direction
      };
    }
    
    if (start[2] === end[2]) {
      // Same Z coordinate - rotate around Z axis
      const direction = this.calculateRotationDirection(start, end, 'z');
      return {
        axis: 'z',
        layerIndex: start[2],
        pieces: this.getLayerPieces('z', start[2]),
        direction
      };
    }

    // If no shared coordinate, use the midpoint
    const midY = Math.round((start[1] + end[1]) / 2);
    const direction = this.calculateRotationDirection(start, end, 'y');
    return {
      axis: 'y',
      layerIndex: midY,
      pieces: this.getLayerPieces('y', midY),
      direction
    };
  }

  /**
   * Determine layer from vertical (Y-axis) movement
   */
  private static getLayerFromYMovement(
    start: readonly [number, number, number],
    end: readonly [number, number, number]
  ): GestureLayerInfo | null {
    // Vertical movement suggests rotation around X or Z axis
    if (start[0] === end[0]) {
      // Same X coordinate - rotate around X axis
      const direction = this.calculateRotationDirection(start, end, 'x');
      return {
        axis: 'x',
        layerIndex: start[0],
        pieces: this.getLayerPieces('x', start[0]),
        direction
      };
    }
    
    if (start[2] === end[2]) {
      // Same Z coordinate - rotate around Z axis  
      const direction = this.calculateRotationDirection(start, end, 'z');
      return {
        axis: 'z',
        layerIndex: start[2],
        pieces: this.getLayerPieces('z', start[2]),
        direction
      };
    }

    // Use midpoint if no shared coordinate
    const midX = Math.round((start[0] + end[0]) / 2);
    const direction = this.calculateRotationDirection(start, end, 'x');
    return {
      axis: 'x',
      layerIndex: midX,
      pieces: this.getLayerPieces('x', midX),
      direction
    };
  }

  /**
   * Determine layer from depth (Z-axis) movement
   */
  private static getLayerFromZMovement(
    start: readonly [number, number, number], 
    end: readonly [number, number, number]
  ): GestureLayerInfo | null {
    // Depth movement suggests rotation around X or Y axis
    if (start[0] === end[0]) {
      // Same X coordinate - rotate around X axis
      const direction = this.calculateRotationDirection(start, end, 'x');
      return {
        axis: 'x',
        layerIndex: start[0],
        pieces: this.getLayerPieces('x', start[0]),
        direction
      };
    }
    
    if (start[1] === end[1]) {
      // Same Y coordinate - rotate around Y axis
      const direction = this.calculateRotationDirection(start, end, 'y');
      return {
        axis: 'y', 
        layerIndex: start[1],
        pieces: this.getLayerPieces('y', start[1]),
        direction
      };
    }

    // Use midpoint if no shared coordinate
    const midX = Math.round((start[0] + end[0]) / 2);
    const direction = this.calculateRotationDirection(start, end, 'x');
    return {
      axis: 'x',
      layerIndex: midX, 
      pieces: this.getLayerPieces('x', midX),
      direction
    };
  }

  /**
   * Calculate rotation direction based on gesture movement
   */
  private static calculateRotationDirection(
    start: readonly [number, number, number],
    end: readonly [number, number, number],
    axis: 'x' | 'y' | 'z'
  ): 'clockwise' | 'counterclockwise' {
    const deltaX = end[0] - start[0];
    const deltaY = end[1] - start[1];
    
    // Proper 3D cube rotation direction logic
    switch (axis) {
      case 'x':
        // X-axis rotation: positive Y movement = clockwise
        return deltaY > 0 ? 'clockwise' : 'counterclockwise';
      case 'y':
        // Y-axis rotation: negative X movement = clockwise  
        return deltaX < 0 ? 'clockwise' : 'counterclockwise';
      case 'z':
        // Z-axis rotation: positive X movement = clockwise
        return deltaX > 0 ? 'clockwise' : 'counterclockwise';
      default:
        return 'clockwise';
    }
  }

  /**
   * Get all 9 pieces in a layer along the specified axis
   */
  private static getLayerPieces(
    axis: 'x' | 'y' | 'z',
    layerIndex: number
  ): Array<readonly [number, number, number]> {
    const pieces: Array<readonly [number, number, number]> = [];
    
    // Generate all positions in the 3x3x3 cube
    for (let x = -1; x <= 1; x++) {
      for (let y = -1; y <= 1; y++) {
        for (let z = -1; z <= 1; z++) {
          // Include piece if it belongs to the specified layer
          let includeInLayer = false;
          
          switch (axis) {
            case 'x':
              includeInLayer = x === layerIndex;
              break;
            case 'y':
              includeInLayer = y === layerIndex;
              break;
            case 'z':
              includeInLayer = z === layerIndex;
              break;
          }
          
          if (includeInLayer) {
            pieces.push([x, y, z] as const);
          }
        }
      }
    }
    
    return pieces;
  }

  /**
   * Find all mesh objects in the scene that correspond to the layer pieces
   */
  static findLayerMeshes(
    scene: THREE.Scene,
    layerInfo: GestureLayerInfo
  ): THREE.Mesh[] {
    window.console.log('🔍 findLayerMeshes called:', { layerInfo });
    const layerMeshes: THREE.Mesh[] = [];
    const allMeshes: Array<{ name: string; position: readonly [number, number, number] }> = [];
    
    scene.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        const position = object.position;
        const roundedPos = [
          Math.round(position.x),
          Math.round(position.y),
          Math.round(position.z)
        ] as const;
        
        allMeshes.push({ name: object.name, position: roundedPos });
        
        // Match cube meshes by face name pattern (e.g., 'front-face', 'back-face') or cube coordinates
        if (object.name.includes('-face') || object.name.startsWith('cube-')) {
          // Check if this mesh belongs to our target layer
          const belongsToLayer = layerInfo.pieces.some(piecePos =>
            piecePos[0] === roundedPos[0] &&
            piecePos[1] === roundedPos[1] &&
            piecePos[2] === roundedPos[2]
          );
          
          // window.console.log('🔍 Checking mesh:', {
          //   name: object.name,
          //   position: roundedPos,
          //   belongsToLayer,
          //   targetPieces: layerInfo.pieces
          // });
          
          if (belongsToLayer) {
            layerMeshes.push(object);
          }
        }
      }
    });
    
    window.console.log('🔍 Scene mesh analysis:', {
      totalMeshes: allMeshes.length,
      cubePieceMeshes: allMeshes.filter(m => m.name.includes('-face') || m.name.startsWith('cube-')).length,
      layerMeshesFound: layerMeshes.length,
      allMeshes: allMeshes.slice(0, 10) // Show first 10 for debugging
    });
    
    return layerMeshes;
  }

  /**
   * Create highlight meshes for the detected layer
   */
  static createLayerHighlights(
    scene: THREE.Scene,
    cubeGroup: THREE.Group,
    layerInfo: GestureLayerInfo
  ): THREE.Mesh[] {
    window.console.log('🔍 createLayerHighlights called:', { layerInfo, hasScene: !!scene, hasCubeGroup: !!cubeGroup });
    
    const highlightMeshes: THREE.Mesh[] = [];
    const layerMeshes = this.findLayerMeshes(scene, layerInfo);
    
    window.console.log('🔍 Found layer meshes for highlighting:', layerMeshes.length);
    
    if (layerMeshes.length === 0) {
      window.console.warn('🔍 No layer meshes found - cannot create highlights');
      return highlightMeshes;
    }
    
    layerMeshes.forEach((cubeMesh, index) => {
      // window.console.log('🔍 Creating highlight for mesh:', {
      //   index,
      //   meshName: cubeMesh.name,
      //   position: [cubeMesh.position.x, cubeMesh.position.y, cubeMesh.position.z]
      // });
      
      const pos = cubeMesh.position;
      const roundedPos = [Math.round(pos.x), Math.round(pos.y), Math.round(pos.z)];
      
      // Determine which external faces to highlight based on piece position
      const facesToHighlight = [];
      
      // Check each face to see if it's on the outer edge of the cube
      if (roundedPos[0] === -1) facesToHighlight.push({ face: 'left', normal: [-1, 0, 0] });   // Left face
      if (roundedPos[0] === 1) facesToHighlight.push({ face: 'right', normal: [1, 0, 0] });    // Right face
      if (roundedPos[1] === -1) facesToHighlight.push({ face: 'down', normal: [0, -1, 0] });   // Down face
      if (roundedPos[1] === 1) facesToHighlight.push({ face: 'up', normal: [0, 1, 0] });       // Up face
      if (roundedPos[2] === -1) facesToHighlight.push({ face: 'back', normal: [0, 0, -1] });   // Back face
      if (roundedPos[2] === 1) facesToHighlight.push({ face: 'front', normal: [0, 0, 1] });    // Front face
      
      // Create highlight for each visible external face
      facesToHighlight.forEach((faceInfo) => {
        const highlightGeometry = new THREE.PlaneGeometry(0.9, 0.9); // Slightly smaller than piece
        const highlightMaterial = new THREE.MeshBasicMaterial({
          color: 0xffffff, // White highlight
          transparent: true,
          opacity: 0.2,
          side: THREE.FrontSide,
          depthTest: true,
          depthWrite: false,
        });
        
        const highlightMesh = new THREE.Mesh(highlightGeometry, highlightMaterial);
        highlightMesh.name = `gesture-layer-highlight-${index}-${faceInfo.face}`;
        highlightMesh.renderOrder = 1002;
        
        // Position highlight on the external face surface
        const offset = 0.51; // Position just outside the cube piece (cube pieces are 1x1x1)
        const [normalX, normalY, normalZ] = faceInfo.normal as [number, number, number];
        
        highlightMesh.position.set(
          pos.x + normalX * offset,
          pos.y + normalY * offset,
          pos.z + normalZ * offset
        );
        
        // Orient highlight to face outward
        if (faceInfo.face === 'front') {
          highlightMesh.rotation.set(0, 0, 0);
        } else if (faceInfo.face === 'back') {
          highlightMesh.rotation.set(0, Math.PI, 0);
        } else if (faceInfo.face === 'left') {
          highlightMesh.rotation.set(0, -Math.PI / 2, 0);
        } else if (faceInfo.face === 'right') {
          highlightMesh.rotation.set(0, Math.PI / 2, 0);
        } else if (faceInfo.face === 'up') {
          highlightMesh.rotation.set(-Math.PI / 2, 0, 0);
        } else if (faceInfo.face === 'down') {
          highlightMesh.rotation.set(Math.PI / 2, 0, 0);
        }
        
        // window.console.log('🔍 External face highlight created:', {
        //   name: highlightMesh.name,
        //   face: faceInfo.face,
        //   position: [highlightMesh.position.x, highlightMesh.position.y, highlightMesh.position.z],
        //   rotation: [highlightMesh.rotation.x, highlightMesh.rotation.y, highlightMesh.rotation.z]
        // });
        
        // Add to cube group so it rotates with cube
        cubeGroup.add(highlightMesh);
        highlightMeshes.push(highlightMesh);
      });
    });
    
    window.console.log('🔍 Created', highlightMeshes.length, 'highlight meshes and added to cubeGroup');
    return highlightMeshes;
  }

  /**
   * Remove and dispose of highlight meshes
   */
  static cleanupHighlights(highlightMeshes: THREE.Mesh[]): void {
    highlightMeshes.forEach(mesh => {
      if (mesh.parent) {
        mesh.parent.remove(mesh);
      }
      if (mesh.geometry) mesh.geometry.dispose();
      if (mesh.material) {
        if (Array.isArray(mesh.material)) {
          mesh.material.forEach(mat => mat.dispose());
        } else {
          mesh.material.dispose();
        }
      }
    });
  }
}