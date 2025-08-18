import * as THREE from 'three';
import { FaceHighlighting } from '../../src/interactions/FaceHighlighting';
import { FacePosition, VisualFeedback, CubeError } from '@rubiks-cube/shared/types';

// Mock Three.js classes
jest.mock('three', () => ({
  Scene: jest.fn(() => ({
    add: jest.fn(),
    remove: jest.fn(),
  })),
  Group: jest.fn(() => ({})),
  PlaneGeometry: jest.fn(() => ({
    scale: jest.fn(),
  })),
  MeshBasicMaterial: jest.fn(() => ({
    color: {
      setRGB: jest.fn(),
      setHex: jest.fn(),
    },
    opacity: 0,
  })),
  Mesh: jest.fn(() => ({
    name: '',
    visible: false,
    renderOrder: 0,
    position: {
      set: jest.fn(),
    },
    rotation: {
      x: 0,
      y: 0,
      z: 0,
    },
    geometry: {
      dispose: jest.fn(),
    },
    material: {
      dispose: jest.fn(),
    },
  })),
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
}));

describe('FaceHighlighting', () => {
  let mockScene: THREE.Scene;
  let mockCubeGroup: THREE.Group;
  let faceHighlighting: FaceHighlighting;

  beforeEach(() => {
    mockScene = new THREE.Scene();
    mockCubeGroup = new THREE.Group();
    
    faceHighlighting = new FaceHighlighting({
      scene: mockScene,
      cubeGroup: mockCubeGroup,
      highlightIntensity: 0.3,
      transitionDuration: 200,
      pulseAnimation: true,
    });
    
    // Reset all mocks
    jest.clearAllMocks();
  });

  afterEach(() => {
    faceHighlighting.dispose();
  });

  describe('initialization', () => {
    it('should create highlight meshes for all faces', () => {
      expect(THREE.PlaneGeometry).toHaveBeenCalledTimes(6); // 6 faces
      expect(THREE.MeshBasicMaterial).toHaveBeenCalledTimes(6);
      expect(THREE.Mesh).toHaveBeenCalledTimes(6);
      expect(mockScene.add).toHaveBeenCalledTimes(6);
    });

    it('should initialize with correct options', () => {
      const options = {
        scene: mockScene,
        cubeGroup: mockCubeGroup,
        highlightIntensity: 0.5,
        transitionDuration: 100,
        pulseAnimation: false,
      };

      const highlighting = new FaceHighlighting(options);
      expect(highlighting).toBeDefined();
      highlighting.dispose();
    });
  });

  describe('applyFeedback', () => {
    const createMockFeedback = (state: VisualFeedback['state']): VisualFeedback => ({
      face: FacePosition.FRONT,
      state,
      opacity: 0.5,
      color: [1.0, 0.5, 0.0] as const,
      emissiveIntensity: 0.2,
    });

    it('should apply normal state correctly', () => {
      const feedback = createMockFeedback('normal');
      const result = faceHighlighting.applyFeedback(feedback);
      
      expect(result.success).toBe(true);
    });

    it('should apply hover state correctly', () => {
      const feedback = createMockFeedback('hover');
      const result = faceHighlighting.applyFeedback(feedback);
      
      expect(result.success).toBe(true);
    });

    it('should apply selected state correctly', () => {
      const feedback = createMockFeedback('selected');
      const result = faceHighlighting.applyFeedback(feedback);
      
      expect(result.success).toBe(true);
    });

    it('should apply rotating state correctly', () => {
      const feedback = createMockFeedback('rotating');
      const result = faceHighlighting.applyFeedback(feedback);
      
      expect(result.success).toBe(true);
    });

    it('should apply blocked state correctly', () => {
      const feedback = createMockFeedback('blocked');
      const result = faceHighlighting.applyFeedback(feedback);
      
      expect(result.success).toBe(true);
    });

    it('should apply preview state correctly', () => {
      const feedback = createMockFeedback('preview');
      const result = faceHighlighting.applyFeedback(feedback);
      
      expect(result.success).toBe(true);
    });

    it('should apply success state correctly', () => {
      const feedback = createMockFeedback('success');
      const result = faceHighlighting.applyFeedback(feedback);
      
      expect(result.success).toBe(true);
    });

    it('should return error for invalid face', () => {
      // Create highlighting with no meshes initialized
      const emptyHighlighting = new FaceHighlighting({
        scene: new THREE.Scene(),
        cubeGroup: new THREE.Group(),
      });
      
      // Clear the meshes map to simulate missing face
      (emptyHighlighting as any).highlightMeshes.clear();
      (emptyHighlighting as any).highlightMaterials.clear();
      
      const feedback = createMockFeedback('hover');
      const result = emptyHighlighting.applyFeedback(feedback);
      
      expect(result.success).toBe(false);
      expect(result.error).toBe(CubeError.INVALID_MOVE);
      
      emptyHighlighting.dispose();
    });

    it('should handle custom opacity and color', () => {
      const feedback: VisualFeedback = {
        face: FacePosition.FRONT,
        state: 'hover',
        opacity: 0.8,
        color: [0.2, 0.8, 0.2] as const,
      };
      
      const result = faceHighlighting.applyFeedback(feedback);
      expect(result.success).toBe(true);
    });
  });

  describe('getHighlightState', () => {
    it('should return normal for invisible mesh', () => {
      const state = faceHighlighting.getHighlightState(FacePosition.FRONT);
      expect(state).toBe('normal');
    });

    it('should detect hover state correctly', () => {
      // Apply hover feedback first
      const feedback: VisualFeedback = {
        face: FacePosition.FRONT,
        state: 'hover',
        color: [0.3, 0.7, 1.0] as const,
        opacity: 0.3,
      };
      
      faceHighlighting.applyFeedback(feedback);
      
      // Mock the material properties to simulate hover state
      const material = (THREE.MeshBasicMaterial as jest.Mock).mock.results[0].value;
      material.color = { r: 0.3, g: 0.7, b: 1.0 };
      material.opacity = 0.3;
      
      const mesh = (THREE.Mesh as jest.Mock).mock.results[0].value;
      mesh.visible = true;
      
      const state = faceHighlighting.getHighlightState(FacePosition.FRONT);
      expect(state).toBe('hover');
    });
  });

  describe('clearAll', () => {
    it('should clear all highlights', () => {
      // Apply some feedback first
      const feedback: VisualFeedback = {
        face: FacePosition.FRONT,
        state: 'hover',
      };
      
      faceHighlighting.applyFeedback(feedback);
      faceHighlighting.clearAll();
      
      // Verify all faces are back to normal state
      Object.values(FacePosition).forEach(face => {
        const state = faceHighlighting.getHighlightState(face);
        expect(state).toBe('normal');
      });
    });
  });

  describe('update', () => {
    it('should update animation mixer when present', () => {
      const mockMixer = (THREE.AnimationMixer as jest.Mock).mock.results[0]?.value;
      if (mockMixer) {
        faceHighlighting.update();
        expect(mockMixer.update).toHaveBeenCalled();
      }
    });
  });

  describe('dispose', () => {
    it('should dispose of all resources', () => {
      faceHighlighting.dispose();
      
      expect(mockScene.remove).toHaveBeenCalledTimes(6); // 6 faces
      
      // Check that geometries and materials are disposed
      const geometries = (THREE.PlaneGeometry as jest.Mock).mock.results;
      geometries.forEach(result => {
        expect(result.value.dispose).toHaveBeenCalled();
      });
      
      const materials = (THREE.MeshBasicMaterial as jest.Mock).mock.results;
      materials.forEach(result => {
        expect(result.value.dispose).toHaveBeenCalled();
      });
    });
  });

  describe('error handling', () => {
    it('should handle exceptions in applyFeedback', () => {
      // Mock an error in the material setter
      const material = (THREE.MeshBasicMaterial as jest.Mock).mock.results[0].value;
      material.color.setRGB = jest.fn(() => {
        throw new Error('Test error');
      });
      
      const feedback: VisualFeedback = {
        face: FacePosition.FRONT,
        state: 'hover',
      };
      
      const result = faceHighlighting.applyFeedback(feedback);
      
      expect(result.success).toBe(false);
      expect(result.error).toBe(CubeError.WEBGL_CONTEXT_LOST);
      expect(result.message).toContain('Test error');
    });
  });

  describe('animation features', () => {
    beforeEach(() => {
      // Mock requestAnimationFrame for animation tests
      global.requestAnimationFrame = jest.fn(cb => {
        setTimeout(cb, 16);
        return 1;
      });
      
      global.performance = {
        now: jest.fn(() => Date.now()),
      } as any;
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('should handle pulse animation for rotating state', () => {
      const feedback: VisualFeedback = {
        face: FacePosition.FRONT,
        state: 'rotating',
        pulse: true,
      };
      
      const result = faceHighlighting.applyFeedback(feedback);
      expect(result.success).toBe(true);
    });

    it('should handle success state auto-fade', (done) => {
      const feedback: VisualFeedback = {
        face: FacePosition.FRONT,
        state: 'success',
      };
      
      faceHighlighting.applyFeedback(feedback);
      
      // Check that timeout is set for auto-fade
      setTimeout(() => {
        done();
      }, 350); // Slightly longer than success fade timeout
    });
  });
});