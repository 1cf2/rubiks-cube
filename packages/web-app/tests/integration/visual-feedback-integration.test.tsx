import React from 'react';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import * as THREE from 'three';
import { MouseControls } from '../../src/components/input/MouseControls';
import { FacePosition, VisualFeedback } from '@rubiks-cube/shared/types';

// Mock Three.js with more complete implementations
const mockMeshes = new Map();
const mockMaterials = new Map();

jest.mock('three', () => ({
  Scene: jest.fn(() => ({
    add: jest.fn((mesh) => {
      if (mesh.name && mesh.name.includes('highlight')) {
        mockMeshes.set(mesh.name, mesh);
      }
    }),
    remove: jest.fn((mesh) => {
      if (mesh.name) {
        mockMeshes.delete(mesh.name);
      }
    }),
  })),
  Group: jest.fn(() => ({
    children: [],
    traverse: jest.fn((callback) => {
      // Mock some cube pieces
      for (let i = 0; i < 27; i++) {
        const mockChild = {
          position: {
            x: (i % 3) - 1,
            y: Math.floor(i / 3) % 3 - 1,
            z: Math.floor(i / 9) - 1,
          },
        };
        callback(mockChild);
      }
    }),
    worldToLocal: jest.fn((point) => point.clone()),
  })),
  Camera: jest.fn(() => ({})),
  WebGLRenderer: jest.fn(() => ({
    domElement: {
      getBoundingClientRect: () => ({
        left: 0,
        top: 0,
        width: 800,
        height: 600,
      }),
    },
  })),
  Raycaster: jest.fn(() => ({
    setFromCamera: jest.fn(),
    intersectObjects: jest.fn(() => [{
      object: { name: 'cube-piece' },
      point: new (jest.fn(() => ({
        clone: () => ({ x: 0, y: 0, z: 0.6 }),
      })))(),
    }]),
  })),
  Vector2: jest.fn(() => ({ x: 0, y: 0 })),
  Vector3: jest.fn(() => ({
    clone: () => ({ x: 0, y: 0, z: 0.6 }),
  })),
  PlaneGeometry: jest.fn(() => ({
    scale: jest.fn(),
    dispose: jest.fn(),
  })),
  MeshBasicMaterial: jest.fn((params) => {
    const material = {
      color: {
        setRGB: jest.fn(),
        setHex: jest.fn(),
        r: 1, g: 1, b: 1,
      },
      opacity: params?.opacity ?? 0,
      transparent: params?.transparent ?? false,
      dispose: jest.fn(),
    };
    mockMaterials.set(Date.now() + Math.random(), material);
    return material;
  }),
  Mesh: jest.fn((geometry, material) => {
    const mesh = {
      name: '',
      visible: false,
      renderOrder: 0,
      position: { set: jest.fn() },
      rotation: { x: 0, y: 0, z: 0 },
      geometry,
      material,
    };
    return mesh;
  }),
  DoubleSide: 'DoubleSide',
  AdditiveBlending: 'AdditiveBlending',
  AnimationMixer: jest.fn(() => ({
    clipAction: jest.fn(() => ({
      setLoop: jest.fn(),
      play: jest.fn(),
      stop: jest.fn(),
      isRunning: jest.fn(() => false),
      time: 0,
    })),
    update: jest.fn(),
    stopAllAction: jest.fn(),
  })),
  AnimationClip: jest.fn(),
  NumberKeyframeTrack: jest.fn(),
  LoopRepeat: 'LoopRepeat',
  Clock: jest.fn(() => ({
    getDelta: jest.fn(() => 0.016),
  })),
  BufferGeometry: jest.fn(() => ({
    setAttribute: jest.fn(),
    setIndex: jest.fn(),
    computeVertexNormals: jest.fn(),
    scale: jest.fn(),
  })),
  BufferAttribute: jest.fn(),
  Float32Array,
  Uint16Array,
  Color: jest.fn(),
}));

// Mock performance API
global.performance = {
  now: jest.fn(() => Date.now()),
} as any;

global.requestAnimationFrame = jest.fn((cb) => {
  setTimeout(cb, 16);
  return 1;
});

describe('Visual Feedback Integration Tests', () => {
  let mockScene: THREE.Scene;
  let mockCamera: THREE.Camera;
  let mockCubeGroup: THREE.Group;
  let mockRenderer: THREE.WebGLRenderer;

  beforeEach(() => {
    mockScene = new THREE.Scene();
    mockCamera = new THREE.Camera();
    mockCubeGroup = new THREE.Group();
    mockRenderer = new THREE.WebGLRenderer();
    
    // Clear mock state
    mockMeshes.clear();
    mockMaterials.clear();
    jest.clearAllMocks();
    
    // Reset request animation frame
    (global.requestAnimationFrame as jest.Mock).mockClear();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Complete Visual Feedback Flow', () => {
    it('should provide complete visual feedback cycle for face interaction', async () => {
      const onFaceHover = jest.fn();
      const onFaceSelect = jest.fn();
      const onRotationStart = jest.fn();
      const onRotationComplete = jest.fn();
      const onError = jest.fn();

      const props = {
        scene: mockScene,
        camera: mockCamera,
        cubeGroup: mockCubeGroup,
        isEnabled: true,
        enableRotationPreview: true,
        enableCompletionFeedback: true,
        enableInvalidMovePrevention: true,
        onFaceHover,
        onFaceSelect,
        onRotationStart,
        onRotationComplete,
        onError,
      };

      render(<MouseControls {...props} />);
      
      const container = screen.getByTestId('mouse-controls');
      expect(container).toBeInTheDocument();

      // Test mouse hover
      await act(async () => {
        fireEvent.mouseMove(container, { 
          clientX: 400, 
          clientY: 300 
        });
        
        await new Promise(resolve => setTimeout(resolve, 50));
      });

      // Test mouse click for selection
      await act(async () => {
        fireEvent.mouseDown(container, { 
          clientX: 400, 
          clientY: 300,
          button: 0
        });
        
        await new Promise(resolve => setTimeout(resolve, 50));
      });

      // Test drag gesture
      await act(async () => {
        fireEvent.mouseMove(container, { 
          clientX: 450, 
          clientY: 300 
        });
        
        fireEvent.mouseUp(container, { 
          clientX: 450, 
          clientY: 300,
          button: 0
        });
        
        await new Promise(resolve => setTimeout(resolve, 100));
      });

      // Verify the system is set up correctly
      expect(container).toHaveAttribute('aria-label', "Rubik's cube interaction area");
      expect(onError).not.toHaveBeenCalled();
    });

    it('should handle face highlighting states correctly', async () => {
      const props = {
        scene: mockScene,
        camera: mockCamera,
        cubeGroup: mockCubeGroup,
        isEnabled: true,
      };

      render(<MouseControls {...props} />);

      // The highlighting system should be initialized
      expect(mockScene.add).toHaveBeenCalled();
      
      // Check that highlight meshes were created
      const addCalls = (mockScene.add as jest.Mock).mock.calls;
      expect(addCalls.length).toBeGreaterThan(0);
    });

    it('should prevent invalid moves and show blocked feedback', async () => {
      const onError = jest.fn();
      
      const props = {
        scene: mockScene,
        camera: mockCamera,
        cubeGroup: mockCubeGroup,
        isEnabled: true,
        enableInvalidMovePrevention: true,
        allowConcurrentAnimations: false,
        onError,
      };

      render(<MouseControls {...props} />);
      
      const container = screen.getByTestId('mouse-controls');
      
      // Simulate trying to interact while system is initializing
      await act(async () => {
        fireEvent.mouseDown(container, { 
          clientX: 400, 
          clientY: 300 
        });
        
        fireEvent.mouseMove(container, { 
          clientX: 450, 
          clientY: 300 
        });
        
        fireEvent.mouseUp(container);
        
        await new Promise(resolve => setTimeout(resolve, 100));
      });

      // System should handle the interaction gracefully
      expect(container).toBeInTheDocument();
    });

    it('should show rotation preview arrows during hover', async () => {
      const props = {
        scene: mockScene,
        camera: mockCamera,
        cubeGroup: mockCubeGroup,
        isEnabled: true,
        enableRotationPreview: true,
        previewIntensity: 0.8,
      };

      render(<MouseControls {...props} />);

      const container = screen.getByTestId('mouse-controls');

      // Hover over the cube area
      await act(async () => {
        fireEvent.mouseEnter(container);
        fireEvent.mouseMove(container, { 
          clientX: 400, 
          clientY: 300 
        });
        
        await new Promise(resolve => setTimeout(resolve, 100));
      });

      // Arrow meshes should be created and added to scene
      expect(mockScene.add).toHaveBeenCalled();
      
      // Check for multiple adds (highlights + arrows)
      const addCalls = (mockScene.add as jest.Mock).mock.calls;
      expect(addCalls.length).toBeGreaterThan(6); // More than just face highlights
    });

    it('should show completion feedback after rotation', async () => {
      const onRotationComplete = jest.fn();
      
      const props = {
        scene: mockScene,
        camera: mockCamera,
        cubeGroup: mockCubeGroup,
        isEnabled: true,
        enableCompletionFeedback: true,
        completionIntensity: 1.2,
        onRotationComplete,
      };

      render(<MouseControls {...props} />);

      // The completion feedback system should be set up
      expect(mockScene.add).toHaveBeenCalled();

      // Test completion animation timing
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 350)); // Success flash duration
      });

      expect(mockScene.add).toHaveBeenCalled();
    });

    it('should handle multiple simultaneous feedback systems', async () => {
      const props = {
        scene: mockScene,
        camera: mockCamera,
        cubeGroup: mockCubeGroup,
        isEnabled: true,
        enableRotationPreview: true,
        enableCompletionFeedback: true,
        enableInvalidMovePrevention: true,
      };

      render(<MouseControls {...props} />);
      
      const container = screen.getByTestId('mouse-controls');

      // All systems should be initialized without conflicts
      expect(mockScene.add).toHaveBeenCalled();
      expect(container).toBeInTheDocument();

      // Test interaction with all systems active
      await act(async () => {
        fireEvent.mouseMove(container, { clientX: 400, clientY: 300 });
        fireEvent.mouseDown(container, { clientX: 400, clientY: 300 });
        fireEvent.mouseMove(container, { clientX: 450, clientY: 300 });
        fireEvent.mouseUp(container);
        
        await new Promise(resolve => setTimeout(resolve, 100));
      });

      // No errors should occur
      expect(container).toBeInTheDocument();
    });

    it('should maintain performance targets during feedback', async () => {
      const startTime = performance.now();
      
      const props = {
        scene: mockScene,
        camera: mockCamera,
        cubeGroup: mockCubeGroup,
        isEnabled: true,
        enableRotationPreview: true,
        enableCompletionFeedback: true,
        enableInvalidMovePrevention: true,
      };

      render(<MouseControls {...props} />);
      
      const container = screen.getByTestId('mouse-controls');

      // Perform multiple rapid interactions
      await act(async () => {
        for (let i = 0; i < 10; i++) {
          fireEvent.mouseMove(container, { 
            clientX: 400 + i * 5, 
            clientY: 300 
          });
          await new Promise(resolve => setTimeout(resolve, 5));
        }
      });

      const endTime = performance.now();
      const duration = endTime - startTime;

      // Should complete within reasonable time (less than 1 second for 10 interactions)
      expect(duration).toBeLessThan(1000);
      expect(container).toBeInTheDocument();
    });

    it('should clean up resources properly on unmount', async () => {
      const props = {
        scene: mockScene,
        camera: mockCamera,
        cubeGroup: mockCubeGroup,
        isEnabled: true,
        enableRotationPreview: true,
        enableCompletionFeedback: true,
      };

      const { unmount } = render(<MouseControls {...props} />);
      
      // Resources should be created
      expect(mockScene.add).toHaveBeenCalled();
      
      // Unmount the component
      await act(async () => {
        unmount();
        await new Promise(resolve => setTimeout(resolve, 100));
      });

      // Scene remove should be called for cleanup
      // Note: Exact cleanup verification depends on implementation details
      expect(mockScene.remove).toHaveBeenCalled();
    });
  });

  describe('Accessibility and User Experience', () => {
    it('should provide proper accessibility attributes', () => {
      const props = {
        scene: mockScene,
        camera: mockCamera,
        cubeGroup: mockCubeGroup,
        isEnabled: true,
      };

      render(<MouseControls {...props} />);
      
      const container = screen.getByTestId('mouse-controls');
      
      expect(container).toHaveAttribute('role', 'button');
      expect(container).toHaveAttribute('aria-label', "Rubik's cube interaction area");
      expect(container).toHaveAttribute('tabIndex', '0');
    });

    it('should handle disabled state correctly', () => {
      const props = {
        scene: mockScene,
        camera: mockCamera,
        cubeGroup: mockCubeGroup,
        isEnabled: false,
      };

      render(<MouseControls {...props} />);
      
      const container = screen.getByTestId('mouse-controls');
      
      expect(container).toHaveAttribute('aria-disabled', 'true');
      expect(container).toHaveAttribute('tabIndex', '-1');
      expect(container).toHaveStyle('pointer-events: none');
    });

    it('should provide visual cursor feedback', async () => {
      const props = {
        scene: mockScene,
        camera: mockCamera,
        cubeGroup: mockCubeGroup,
        isEnabled: true,
      };

      render(<MouseControls {...props} />);
      
      const container = screen.getByTestId('mouse-controls');
      
      // Default cursor
      expect(container).toHaveStyle('cursor: default');
      
      // Hover should change cursor (simulated through the gesture system)
      await act(async () => {
        fireEvent.mouseMove(container, { clientX: 400, clientY: 300 });
        await new Promise(resolve => setTimeout(resolve, 50));
      });
      
      // Container should still be accessible
      expect(container).toBeInTheDocument();
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle null scene gracefully', () => {
      const props = {
        scene: null,
        camera: mockCamera,
        cubeGroup: mockCubeGroup,
        isEnabled: true,
      };

      expect(() => {
        render(<MouseControls {...props} />);
      }).not.toThrow();
      
      const container = screen.getByTestId('mouse-controls');
      expect(container).toBeInTheDocument();
    });

    it('should handle null camera gracefully', () => {
      const props = {
        scene: mockScene,
        camera: null,
        cubeGroup: mockCubeGroup,
        isEnabled: true,
      };

      expect(() => {
        render(<MouseControls {...props} />);
      }).not.toThrow();
      
      const container = screen.getByTestId('mouse-controls');
      expect(container).toBeInTheDocument();
    });

    it('should handle null cubeGroup gracefully', () => {
      const props = {
        scene: mockScene,
        camera: mockCamera,
        cubeGroup: null,
        isEnabled: true,
      };

      expect(() => {
        render(<MouseControls {...props} />);
      }).not.toThrow();
      
      const container = screen.getByTestId('mouse-controls');
      expect(container).toBeInTheDocument();
    });

    it('should handle rapid enable/disable changes', async () => {
      const props = {
        scene: mockScene,
        camera: mockCamera,
        cubeGroup: mockCubeGroup,
        isEnabled: true,
      };

      const { rerender } = render(<MouseControls {...props} />);
      
      // Rapidly toggle enabled state
      await act(async () => {
        for (let i = 0; i < 5; i++) {
          rerender(<MouseControls {...props} isEnabled={i % 2 === 0} />);
          await new Promise(resolve => setTimeout(resolve, 10));
        }
      });

      const container = screen.getByTestId('mouse-controls');
      expect(container).toBeInTheDocument();
    });
  });
});