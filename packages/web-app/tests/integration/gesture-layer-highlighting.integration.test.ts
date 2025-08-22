/**
 * Integration tests for gesture-based layer highlighting
 * Tests the complete flow from mouse gestures to layer visualization
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import * as THREE from 'three';
import { MouseControls } from '../../src/components/input/MouseControls';
import { FacePosition, RotationDirection, DragGesture } from '@rubiks-cube/shared/types';
import { GestureLayerDetection } from '../../src/utils/gestureLayerDetection';

// Mock Three.js to avoid WebGL context issues in tests
jest.mock('three', () => {
  const originalThree = jest.requireActual('three');
  return {
    ...originalThree,
    WebGLRenderer: jest.fn().mockImplementation(() => ({
      setSize: jest.fn(),
      render: jest.fn(),
      dispose: jest.fn(),
      domElement: document.createElement('canvas')
    }))
  };
});

// Mock the GestureLayerDetection module
jest.mock('../../src/utils/gestureLayerDetection');

// Mock useCubeInteraction hook
const mockUseCubeInteraction = {
  interactionState: {
    isInteracting: false,
    hoveredFace: null,
    selectedFace: null,
    dragGesture: null,
    cursorState: 'DEFAULT',
    lastInteraction: 0
  },
  currentRotation: null,
  isAnimating: false,
  handleMouseHover: jest.fn(),
  handleDragStart: jest.fn(),
  handleDragUpdate: jest.fn(),
  handleDragEnd: jest.fn(),
  handleMouseLeave: jest.fn(),
  resetInteraction: jest.fn()
};

jest.mock('../../src/hooks/useCubeInteraction', () => ({
  useCubeInteraction: () => mockUseCubeInteraction
}));

// Mock other required hooks
jest.mock('../../src/hooks/useMouseGestures', () => ({
  useMouseGestures: () => ({
    cursorState: 'DEFAULT',
    handlers: {
      onMouseDown: jest.fn(),
      onMouseMove: jest.fn(),
      onMouseUp: jest.fn(),
      onMouseLeave: jest.fn(),
      onMouseEnter: jest.fn()
    },
    isDragging: false,
    currentGesture: null
  })
}));

jest.mock('../../src/hooks/useCameraControls', () => ({
  useCameraControls: () => null
}));

describe('Gesture Layer Highlighting Integration', () => {
  let mockCamera: THREE.Camera;
  let mockScene: THREE.Scene;
  let mockCubeGroup: THREE.Group;
  let mockOnRotationUpdate: jest.Mock;
  let mockOnFaceSelect: jest.Mock;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Create mock Three.js objects
    mockCamera = new THREE.PerspectiveCamera();
    mockScene = new THREE.Scene();
    mockCubeGroup = new THREE.Group();
    
    // Add mock cube meshes to scene
    for (let x = -1; x <= 1; x++) {
      for (let y = -1; y <= 1; y++) {
        for (let z = -1; z <= 1; z++) {
          const mesh = new THREE.Mesh();
          mesh.name = `cube-piece-${x}-${y}-${z}`;
          mesh.position.set(x, y, z);
          mockScene.add(mesh);
        }
      }
    }
    
    mockScene.add(mockCubeGroup);
    
    // Create mock callback functions
    mockOnRotationUpdate = jest.fn();
    mockOnFaceSelect = jest.fn();
    
    // Mock GestureLayerDetection methods
    (GestureLayerDetection.detectLayerFromGesture as jest.Mock).mockReturnValue({
      axis: 'y',
      layerIndex: 1,
      pieces: [
        [-1, 1, -1], [-1, 1, 0], [-1, 1, 1],
        [0, 1, -1], [0, 1, 0], [0, 1, 1],
        [1, 1, -1], [1, 1, 0], [1, 1, 1]
      ]
    });
    
    (GestureLayerDetection.findLayerMeshes as jest.Mock).mockReturnValue([
      new THREE.Mesh()
    ]);
    
    (GestureLayerDetection.createLayerHighlights as jest.Mock).mockReturnValue([
      new THREE.Mesh()
    ]);
    
    (GestureLayerDetection.cleanupHighlights as jest.Mock).mockImplementation(() => {});
  });

  describe('Complete gesture flow', () => {
    it('should execute complete gesture layer highlighting flow', () => {
      // Render MouseControls component
      render(
        <MouseControls
          camera={mockCamera}
          scene={mockScene}
          cubeGroup={mockCubeGroup}
          onRotationUpdate={mockOnRotationUpdate}
          onFaceSelect={mockOnFaceSelect}
          isEnabled={true}
        />
      );

      // Get the interaction area
      const interactionArea = screen.getByTestId('mouse-controls');

      // Simulate face selection (piece 0: [-1, 1, 0])
      const mockMesh = new THREE.Mesh();
      mockMesh.position.set(-1, 1, 0);
      mockMesh.name = 'cube-piece-0';

      // Trigger face selection
      mockUseCubeInteraction.interactionState.selectedFace = FacePosition.FRONT;
      mockOnFaceSelect(FacePosition.FRONT, [-1, 1, 0], mockMesh);

      // Simulate drag update with gesture to piece 1 [0, 1, 0]
      const currentMesh = new THREE.Mesh();
      currentMesh.position.set(0, 1, 0);
      currentMesh.name = 'cube-piece-1';

      const dragInfo = {
        currentMesh,
        startPiece: [-1, 1, 0] as const,
        currentPiece: [0, 1, 0] as const
      };

      const rotationCommand = {
        face: FacePosition.FRONT,
        direction: RotationDirection.CLOCKWISE,
        angle: 0.5,
        targetAngle: Math.PI / 2,
        isComplete: false,
        recalculateLayer: false
      };

      // Trigger onRotationUpdate
      mockOnRotationUpdate(rotationCommand, dragInfo);

      // Verify gesture layer detection was called
      expect(GestureLayerDetection.detectLayerFromGesture).toHaveBeenCalledWith(
        [-1, 1, 0],
        [0, 1, 0]
      );

      // Verify layer highlights were created
      expect(GestureLayerDetection.createLayerHighlights).toHaveBeenCalledWith(
        mockScene,
        mockCubeGroup,
        {
          axis: 'y',
          layerIndex: 1,
          pieces: expect.any(Array)
        }
      );
    });

    it('should handle the red layer scenario (pieces 0-1-2-3)', () => {
      render(
        <MouseControls
          camera={mockCamera}
          scene={mockScene}
          cubeGroup={mockCubeGroup}
          onRotationUpdate={mockOnRotationUpdate}
          onFaceSelect={mockOnFaceSelect}
        />
      );

      // Test each gesture pair in the red layer sequence
      const redLayerGestures = [
        { start: [-1, 1, 0], end: [0, 1, 0] },   // 0 → 1
        { start: [0, 1, 0], end: [1, 1, 0] },    // 1 → 2  
        { start: [1, 1, 0], end: [1, 1, 1] }     // 2 → 3
      ];

      redLayerGestures.forEach((gesture, index) => {
        // Clear previous mocks
        jest.clearAllMocks();

        // Mock detection to return red layer (Y-axis, layer 1)
        (GestureLayerDetection.detectLayerFromGesture as jest.Mock).mockReturnValue({
          axis: 'y',
          layerIndex: 1,
          pieces: [
            [-1, 1, -1], [-1, 1, 0], [-1, 1, 1],
            [0, 1, -1], [0, 1, 0], [0, 1, 1],
            [1, 1, -1], [1, 1, 0], [1, 1, 1]
          ]
        });

        // Simulate gesture
        const dragInfo = {
          currentMesh: { position: { x: gesture.end[0], y: gesture.end[1], z: gesture.end[2] } },
          startPiece: gesture.start,
          currentPiece: gesture.end
        };

        mockOnRotationUpdate({
          face: FacePosition.UP,
          direction: RotationDirection.CLOCKWISE,
          angle: 0.5,
          targetAngle: Math.PI / 2,
          isComplete: false
        }, dragInfo);

        // Verify correct layer detection
        expect(GestureLayerDetection.detectLayerFromGesture).toHaveBeenCalledWith(
          gesture.start,
          gesture.end
        );

        expect(GestureLayerDetection.createLayerHighlights).toHaveBeenCalledWith(
          mockScene,
          mockCubeGroup,
          expect.objectContaining({
            axis: 'y',
            layerIndex: 1
          })
        );
      });
    });

    it('should handle the blue layer scenario (pieces 1-5)', () => {
      render(
        <MouseControls
          camera={mockCamera}
          scene={mockScene}
          cubeGroup={mockCubeGroup}
          onRotationUpdate={mockOnRotationUpdate}
          onFaceSelect={mockOnFaceSelect}
        />
      );

      // Mock detection to return blue layer (X-axis, layer 0)
      (GestureLayerDetection.detectLayerFromGesture as jest.Mock).mockReturnValue({
        axis: 'x',
        layerIndex: 0,
        pieces: [
          [0, -1, -1], [0, -1, 0], [0, -1, 1],
          [0, 0, -1], [0, 0, 0], [0, 0, 1],
          [0, 1, -1], [0, 1, 0], [0, 1, 1]
        ]
      });

      // Simulate gesture between pieces 1 and 5
      const dragInfo = {
        currentMesh: { position: { x: 0, y: 0, z: -1 } }, // piece 5
        startPiece: [0, 1, 0] as const,  // piece 1
        currentPiece: [0, 0, -1] as const // piece 5
      };

      mockOnRotationUpdate({
        face: FacePosition.FRONT,
        direction: RotationDirection.CLOCKWISE,
        angle: 0.5,
        targetAngle: Math.PI / 2,
        isComplete: false
      }, dragInfo);

      // Verify blue layer detection
      expect(GestureLayerDetection.detectLayerFromGesture).toHaveBeenCalledWith(
        [0, 1, 0],   // piece 1
        [0, 0, -1]   // piece 5
      );

      expect(GestureLayerDetection.createLayerHighlights).toHaveBeenCalledWith(
        mockScene,
        mockCubeGroup,
        expect.objectContaining({
          axis: 'x',
          layerIndex: 0
        })
      );
    });

    it('should handle the specific layer scenario (pieces 2-4)', () => {
      render(
        <MouseControls
          camera={mockCamera}
          scene={mockScene}
          cubeGroup={mockCubeGroup}
          onRotationUpdate={mockOnRotationUpdate}
          onFaceSelect={mockOnFaceSelect}
        />
      );

      // Mock detection to return top layer containing pieces 2 and 4
      (GestureLayerDetection.detectLayerFromGesture as jest.Mock).mockReturnValue({
        axis: 'y',
        layerIndex: 1,
        pieces: [
          [-1, 1, -1], [-1, 1, 0], [-1, 1, 1],
          [0, 1, -1], [0, 1, 0], [0, 1, 1],
          [1, 1, -1], [1, 1, 0], [1, 1, 1]
        ]
      });

      // Simulate gesture between pieces 2 and 4
      const dragInfo = {
        currentMesh: { position: { x: 0, y: 1, z: 1 } }, // piece 4
        startPiece: [1, 1, 0] as const,   // piece 2
        currentPiece: [0, 1, 1] as const  // piece 4
      };

      mockOnRotationUpdate({
        face: FacePosition.UP,
        direction: RotationDirection.CLOCKWISE,
        angle: 0.5,
        targetAngle: Math.PI / 2,
        isComplete: false
      }, dragInfo);

      // Verify specific layer detection
      expect(GestureLayerDetection.detectLayerFromGesture).toHaveBeenCalledWith(
        [1, 1, 0],   // piece 2
        [0, 1, 1]    // piece 4
      );

      expect(GestureLayerDetection.createLayerHighlights).toHaveBeenCalledWith(
        mockScene,
        mockCubeGroup,
        expect.objectContaining({
          axis: 'y',
          layerIndex: 1
        })
      );
    });
  });

  describe('Error handling and edge cases', () => {
    it('should handle missing dragInfo gracefully', () => {
      render(
        <MouseControls
          camera={mockCamera}
          scene={mockScene}
          cubeGroup={mockCubeGroup}
          onRotationUpdate={mockOnRotationUpdate}
          onFaceSelect={mockOnFaceSelect}
        />
      );

      // Call onRotationUpdate without dragInfo
      mockOnRotationUpdate({
        face: FacePosition.FRONT,
        direction: RotationDirection.CLOCKWISE,
        angle: 0.5,
        targetAngle: Math.PI / 2,
        isComplete: false
      });

      // Should not call gesture detection
      expect(GestureLayerDetection.detectLayerFromGesture).not.toHaveBeenCalled();
      expect(GestureLayerDetection.createLayerHighlights).not.toHaveBeenCalled();
    });

    it('should handle null gesture detection result', () => {
      render(
        <MouseControls
          camera={mockCamera}
          scene={mockScene}
          cubeGroup={mockCubeGroup}
          onRotationUpdate={mockOnRotationUpdate}
          onFaceSelect={mockOnFaceSelect}
        />
      );

      // Mock detection to return null
      (GestureLayerDetection.detectLayerFromGesture as jest.Mock).mockReturnValue(null);

      const dragInfo = {
        currentMesh: { position: { x: 0, y: 0, z: 0 } },
        startPiece: [0, 0, 0] as const,
        currentPiece: [0, 0, 0] as const
      };

      mockOnRotationUpdate({
        face: FacePosition.FRONT,
        direction: RotationDirection.CLOCKWISE,
        angle: 0.5,
        targetAngle: Math.PI / 2,
        isComplete: false
      }, dragInfo);

      // Should call detection but not create highlights
      expect(GestureLayerDetection.detectLayerFromGesture).toHaveBeenCalled();
      expect(GestureLayerDetection.createLayerHighlights).not.toHaveBeenCalled();
    });

    it('should handle missing start piece position', () => {
      render(
        <MouseControls
          camera={mockCamera}
          scene={mockScene}
          cubeGroup={mockCubeGroup}
          onRotationUpdate={mockOnRotationUpdate}
          onFaceSelect={mockOnFaceSelect}
        />
      );

      const dragInfo = {
        currentMesh: { position: { x: 1, y: 1, z: 1 } },
        startPiece: undefined,
        currentPiece: [1, 1, 1] as const
      };

      mockOnRotationUpdate({
        face: FacePosition.FRONT,
        direction: RotationDirection.CLOCKWISE,
        angle: 0.5,
        targetAngle: Math.PI / 2,
        isComplete: false
      }, dragInfo);

      // Should not call gesture detection without start piece
      expect(GestureLayerDetection.detectLayerFromGesture).not.toHaveBeenCalled();
    });
  });

  describe('Highlight cleanup', () => {
    it('should cleanup highlights on rotation complete', () => {
      const mockOnRotationComplete = jest.fn();
      
      render(
        <MouseControls
          camera={mockCamera}
          scene={mockScene}
          cubeGroup={mockCubeGroup}
          onRotationComplete={mockOnRotationComplete}
        />
      );

      // First create some highlights
      mockOnRotationUpdate({
        face: FacePosition.FRONT,
        direction: RotationDirection.CLOCKWISE,
        angle: Math.PI / 2,
        targetAngle: Math.PI / 2,
        isComplete: true
      }, {
        currentMesh: { position: { x: 0, y: 1, z: 0 } },
        startPiece: [-1, 1, 0] as const,
        currentPiece: [0, 1, 0] as const
      });

      // Then simulate rotation complete
      const rotationCommand = {
        face: FacePosition.FRONT,
        direction: RotationDirection.CLOCKWISE,
        angle: Math.PI / 2,
        targetAngle: Math.PI / 2,
        isComplete: true
      };

      // This would be called by the useCubeInteraction hook
      // We need to test that highlights are cleaned up
      expect(GestureLayerDetection.cleanupHighlights).toHaveBeenCalled();
    });

    it('should cleanup highlights on mouse leave', () => {
      render(
        <MouseControls
          camera={mockCamera}
          scene={mockScene}
          cubeGroup={mockCubeGroup}
          onRotationUpdate={mockOnRotationUpdate}
        />
      );

      const interactionArea = screen.getByTestId('mouse-controls');

      // First create some highlights
      mockOnRotationUpdate({
        face: FacePosition.FRONT,
        direction: RotationDirection.CLOCKWISE,
        angle: 0.5,
        targetAngle: Math.PI / 2,
        isComplete: false
      }, {
        currentMesh: { position: { x: 0, y: 1, z: 0 } },
        startPiece: [-1, 1, 0] as const,
        currentPiece: [0, 1, 0] as const
      });

      // Then simulate mouse leave
      fireEvent.mouseLeave(interactionArea);

      // Should cleanup highlights
      expect(GestureLayerDetection.cleanupHighlights).toHaveBeenCalled();
    });
  });

  describe('Performance considerations', () => {
    it('should not create excessive highlights for rapid gestures', () => {
      render(
        <MouseControls
          camera={mockCamera}
          scene={mockScene}
          cubeGroup={mockCubeGroup}
          onRotationUpdate={mockOnRotationUpdate}
        />
      );

      // Simulate rapid gesture updates
      for (let i = 0; i < 10; i++) {
        mockOnRotationUpdate({
          face: FacePosition.FRONT,
          direction: RotationDirection.CLOCKWISE,
          angle: 0.1 * i,
          targetAngle: Math.PI / 2,
          isComplete: false
        }, {
          currentMesh: { position: { x: i * 0.1, y: 1, z: 0 } },
          startPiece: [-1, 1, 0] as const,
          currentPiece: [i * 0.1, 1, 0] as const
        });
      }

      // Should have called cleanup before each new highlight creation
      expect(GestureLayerDetection.cleanupHighlights).toHaveBeenCalledTimes(10);
      expect(GestureLayerDetection.createLayerHighlights).toHaveBeenCalledTimes(10);
    });
  });
});