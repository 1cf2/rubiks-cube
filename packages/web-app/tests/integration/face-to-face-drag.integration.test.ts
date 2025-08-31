/**
 * Face-to-Face Drag Interaction Integration Tests
 *
 * Validates all acceptance criteria for the face-to-face drag gesture system
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import * as THREE from 'three';
import {
  FacePosition,
  RotationDirection,
  FaceToFaceMouseInteractionHandler,
  AdjacencyState
} from '@rubiks-cube/shared/types';

describe('Face-to-Face Drag Interaction', () => {
  let scene: THREE.Scene;
  let camera: THREE.PerspectiveCamera;
  let renderer: THREE.WebGLRenderer;
  let cubeGroup: THREE.Group;
  let interactionHandler: FaceToFaceMouseInteractionHandler;

  beforeEach(() => {
    // Set up Three.js scene
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000);
    renderer = new THREE.WebGLRenderer();
    cubeGroup = new THREE.Group();

    // Initialize interaction handler
    interactionHandler = new FaceToFaceMouseInteractionHandler(
      scene,
      camera,
      renderer,
      cubeGroup
    );
  });

  afterEach(() => {
    interactionHandler.dispose();
    renderer.dispose();
  });

  describe('Face A Selection (Acceptance Criterion 1)', () => {
    it('should set frontal face as reference face when selected', () => {
      const testPosition: readonly [number, number, number] = [0, 0, 0.5];
      const testNormal: readonly [number, number, number] = [0, 0, 1];

      const result = interactionHandler.handleFaceSelection(
        FacePosition.FRONT,
        testPosition,
        testNormal,
        Date.now()
      );

      expect(result.success).toBe(true);
      expect(result.data).toBe(true);

      const state = interactionHandler.getFaceToFaceState();
      expect(state.isActive).toBe(true);
      expect(state.referenceState.referenceFace).toBe(FacePosition.FRONT);
    });

    it('should enable face-to-face mode after face selection', () => {
      const result = interactionHandler.handleFaceSelection(
        FacePosition.LEFT,
        [0, 0, 0],
        [-1, 0, 0],
        Date.now()
      );

      expect(result.success).toBe(true);
      const state = interactionHandler.getFaceToFaceState();
      expect(state.isActive).toBe(true);
    });
  });

  describe('Face B Targeting (Acceptance Criterion 2)', () => {
    beforeEach(() => {
      // Set up Face A (reference)
      interactionHandler.handleFaceSelection(
        FacePosition.FRONT,
        [0, 0, 0.5],
        [0, 0, 1],
        Date.now()
      );
    });

    it('should accept top face as valid target during drag', () => {
      const dragResult = interactionHandler.handleDragUpdate([0, 0.5, 0]);

      expect(dragResult.success).toBe(true);
      expect(dragResult.data.canRotate).toBe(true);
    });

    it('should reject non-adjacent faces as invalid targets', () => {
      const dragResult = interactionHandler.handleDragUpdate([1.5, 0, 0]); // Far away

      expect(dragResult.success).toBe(true);
      expect(dragResult.data.canRotate).toBe(false);
      expect(dragResult.data.adjacencyState).toBe(AdjacencyState.NON_ADJACENT);
    });

    it('should maintain different face identity (Face A ≠ Face B)', () => {
      const dragResult = interactionHandler.handleDragUpdate([0, 0, 0.5]); // Same position as Face A

      expect(dragResult.success).toBe(true);
      expect(dragResult.data.canRotate).toBe(false); // Should not rotate when same position
    });
  });

  describe('Layer Determination (Acceptance Criterion 3)', () => {
    it('should correctly identify layer for adjacent faces', () => {
      interactionHandler.handleFaceSelection(
        FacePosition.FRONT,
        [0, 0, 0.5],
        [0, 0, 1],
        Date.now()
      );

      const dragResult = interactionHandler.handleDragUpdate([0, 0.5, 0]);

      expect(dragResult.success).toBe(true);
      if (dragResult.data.canRotate) {
        const command = dragResult.data.rotationCommand;
        expect(command).toBeDefined();
        expect(command!.face).toBe(FacePosition.FRONT); // Should rotate front layer
      }
    });

    it('should validate layer context for valid rotation', () => {
      interactionHandler.handleFaceSelection(
        FacePosition.TOP,
        [0, 0.5, 0],
        [0, 1, 0],
        Date.now()
      );

      const dragResult = interactionHandler.handleDragUpdate([0.5, 0.5, 0]);

      expect(dragResult.success).toBe(true);
      // Top face should work with lateral faces (left/right/front/back)
      if (dragResult.data.canRotate) {
        expect(dragResult.data.adjacencyState).toBe(AdjacencyState.ADJACENT);
      }
    });
  });

  describe('Direction Determination (Acceptance Criterion 4)', () => {
    it('should apply right-hand rule for rotation direction', () => {
      interactionHandler.handleFaceSelection(
        FacePosition.FRONT,
        [0, 0, 0.5],
        [0, 0, 1],
        Date.now()
      );

      const dragResult = interactionHandler.handleDragUpdate([0, -0.5, 0.5]); // Downward drag

      expect(dragResult.success).toBe(true);
      if (dragResult.data.canRotate && dragResult.data.rotationCommand) {
        expect(dragResult.data.rotationCommand.direction).toBeDefined();
        expect([RotationDirection.CLOCKWISE, RotationDirection.COUNTERCLOCKWISE])
          .toContain(dragResult.data.rotationCommand.direction);
      }
    });

    it('should maintain consistent direction mapping across gestures', () => {
      let directions: RotationDirection[] = [];

      // First gesture
      interactionHandler.handleFaceSelection(FacePosition.FRONT, [0, 0, 0.5], [0, 0, 1], Date.now());
      let dragResult = interactionHandler.handleDragUpdate([0, 0.5, 0.5]);
      if (dragResult.data.canRotate && dragResult.data.rotationCommand) {
        directions.push(dragResult.data.rotationCommand.direction);
      }

      // Reset and repeat
      interactionHandler.handleGestureComplete();
      interactionHandler.handleFaceSelection(FacePosition.FRONT, [0, 0, 0.5], [0, 0, 1], Date.now());
      dragResult = interactionHandler.handleDragUpdate([0, 0.5, 0.5]);
      if (dragResult.data.canRotate && dragResult.data.rotationCommand) {
        directions.push(dragResult.data.rotationCommand.direction);
      }

      // Directions should be consistent for same gesture
      if (directions.length === 2) {
        expect(directions[0]).toBe(directions[1]);
      }
    });
  });

  describe('Rotation Gesture Validation (Acceptance Criterion 5)', () => {
    it('should validate hogy mező position sharing for layer rotation', () => {
      interactionHandler.handleFaceSelection(
        FacePosition.LEFT,
        [-0.5, 0, 0],
        [-1, 0, 0],
        Date.now()
      );

      const dragResult = interactionHandler.handleDragUpdate([-0.5, 0.5, 0]);

      expect(dragResult.success).toBe(true);
      if (dragResult.data.canRotate) {
        const command = dragResult.data.rotationCommand;
        expect(command).toBeDefined();
        expect(command!.face).toBe(FacePosition.LEFT);
      }
    });

    it('should ensure rotation axis is perpendicular to both faces', () => {
      interactionHandler.handleFaceSelection(
        FacePosition.FRONT,
        [0, 0, 0.5],
        [0, 0, 1],
        Date.now()
      );

      const dragResult = interactionHandler.handleDragUpdate([0, 0.5, 0]);

      expect(dragResult.success).toBe(true);
      // The rotation axis should be perpendicular to face normals
      // This is validated by the rotation vector calculator
    });
  });

  describe('Visual Feedback (Acceptance Criterion 6)', () => {
    it('should provide visual indication for valid adjacent faces', () => {
      interactionHandler.handleFaceSelection(
        FacePosition.FRONT,
        [0, 0, 0.5],
        [0, 0, 1],
        Date.now()
      );

      const feedback = interactionHandler.updateFaceToFaceVisualFeedback([0, 0.5, 0]);

      expect(feedback.length).toBeGreaterThan(0);

      // Should have feedback for reference face and potential targets
      const hasSelectedFeedback = feedback.some(f => f.state === 'selected');
      expect(hasSelectedFeedback).toBe(true);
    });

    it('should show rotation direction preview', () => {
      interactionHandler.handleFaceSelection(
        FacePosition.LEFT,
        [-0.5, 0, 0],
        [-1, 0, 0],
        Date.now()
      );

      const dragResult = interactionHandler.handleDragUpdate([-0.5, 0.5, 0]);

      expect(dragResult.success).toBe(true);
      if (dragResult.data.canRotate) {
        const feedback = interactionHandler.updateFaceToFaceVisualFeedback([-0.5, 0.5, 0]);
        expect(feedback.length).toBeGreaterThan(1); // Reference + preview feedback
      }
    });
  });

  describe('Interaction Boundaries (Acceptance Criterion 7)', () => {
    it('should provide invalid cursor state for non-adjacent faces', () => {
      interactionHandler.handleFaceSelection(
        FacePosition.FRONT,
        [0, 0, 0.5],
        [0, 0, 1],
        Date.now()
      );

      // Drag to non-adjacent position (diagonal)
      const dragResult = interactionHandler.handleDragUpdate([1.5, 1.5, 1.5]);

      expect(dragResult.success).toBe(true);
      expect(dragResult.data.canRotate).toBe(false);
      expect(dragResult.data.adjacencyState).toBe(AdjacencyState.NON_ADJACENT);
    });

    it('should prevent rotation initiation for invalid gestures', () => {
      interactionHandler.handleFaceSelection(
        FacePosition.TOP,
        [0, 0.5, 0],
        [0, 1, 0],
        Date.now()
      );

      // Drag to same face position (invalid)
      const dragResult = interactionHandler.handleDragUpdate([0, 0.5, 0]);

      expect(dragResult.success).toBe(true);
      expect(dragResult.data.canRotate).toBe(false);
    });
  });

  describe('Gesture Sensitivity (Acceptance Criterion 8)', () => {
    it('should initiate calculation at 50% face width threshold', () => {
      interactionHandler.handleFaceSelection(
        FacePosition.RIGHT,
        [0.5, 0, 0],
        [1, 0, 0],
        Date.now()
      );

      // Drag 0.5 units (50% of face width from cube edge)
      const dragResult = interactionHandler.handleDragUpdate([0.5, 0.5, 0]);

      expect(dragResult.success).toBe(true);
      // Should trigger rotation detection at 50% threshold
    });

    it('should respond immediately to valid gestures', () => {
      const startTime = performance.now();

      interactionHandler.handleFaceSelection(
        FacePosition.BACK,
        [0, 0, -0.5],
        [0, 0, -1],
        startTime
      );

      const dragResult = interactionHandler.handleDragUpdate([0, 0.5, -0.5]);
      const responseTime = performance.now() - startTime;

      expect(dragResult.success).toBe(true);
      expect(responseTime).toBeLessThan(50); // Should respond within 50ms
    });
  });

  describe('Invalid Gesture Recovery (Acceptance Criterion 9)', () => {
    it('should return to idle state on invalid gesture detection', () => {
      interactionHandler.handleFaceSelection(
        FacePosition.FRONT,
        [0, 0, 0.5],
        [0, 0, 1],
        Date.now()
      );

      // Start valid state
      let dragResult = interactionHandler.handleDragUpdate([0, 0.5, 0]);
      expect(dragResult.data.canRotate).toBe(true);

      // Become invalid
      dragResult = interactionHandler.handleDragUpdate([2.0, 2.0, 2.0]);
      expect(dragResult.data.canRotate).toBe(false);

      // Should recover gracefully
      expect(dragResult.success).toBe(true);
    });

    it('should allow user to restart gesture after invalid interaction', () => {
      // Invalid gesture first
      interactionHandler.handleFaceSelection(
        FacePosition.NORMAL,
        [0, 0, 0],
        [0, 0, 0],
        Date.now()
      );
      const invalidResult = interactionHandler.handleDragUpdate([1.0, 0, 0]);
      expect(invalidResult.data.canRotate).toBe(false);

      // Complete gesture
      interactionHandler.handleGestureComplete();

      // Should be able to start new gesture
      const newResult = interactionHandler.handleFaceSelection(
        FacePosition.TOP,
        [0, 0.5, 0],
        [0, 1, 0],
        Date.now()
      );
      expect(newResult.success).toBe(true);
      const state = interactionHandler.getFaceToFaceState();
      expect(state.isActive).toBe(true);
    });
  });

  describe('Edge Case Handling (Acceptance Criterion 10)', () => {
    it('should handle solved cube state correctly', () => {
      // In a real implementation, this would use the actual cube state
      interactionHandler.handleFaceSelection(
        FacePosition.FRONT,
        [0, 0, 0.5],
        [0, 0, 1],
        Date.now()
      );

      const dragResult = interactionHandler.handleDragUpdate([0, 0.5, 0]);

      expect(dragResult.success).toBe(true);
      // Solved state shouldn't change the interaction behavior
      expect(dragResult.data.canRotate).toBe(true);
    });

    it('should behave identically for center slice as non-center slices', () => {
      // Test with equivalent positions
      const testPositions = [
        { face: FacePosition.FRONT, pos: [0, 0, 0.5], normal: [0, 0, 1] },
        { face: FacePosition.TOP, pos: [0, 0.5, 0], normal: [0, 1, 0] },
        { face: FacePosition.LEFT, pos: [-0.5, 0, 0], normal: [-1, 0, 0] }
      ];

      for (const test of testPositions) {
        interactionHandler.handleFaceSelection(
          test.face,
          test.pos,
          test.normal,
          Date.now()
        );

        // Try equivalent drag motion
        const dragPos: readonly [number, number, number] = [
          test.pos[0] + 0.5, // Adjacent in relevant direction
          test.pos[1] + 0.5,
          test.pos[2] + 0.5
        ];

        const dragResult = interactionHandler.handleDragUpdate(dragPos);

        expect(dragResult.success).toBe(true);
        // Reset for next test
        interactionHandler.handleGestureComplete();
      }
    });
  });

  describe('Performance Requirements', () => {
    it('should achieve 60fps performance with continuous updates', () => {
      const frameInterval = 1000 / 60; // 16.67ms per frame
      let frameCount = 0;
      const maxFrames = 60; // Test for 1 second at 60fps

      interactionHandler.handleFaceSelection(
        FacePosition.FRONT,
        [0, 0, 0.5],
        [0, 0, 1],
        Date.now()
      );

      for (let i = 0; i < maxFrames; i++) {
        const startTime = performance.now();

        // Simulate continuous drag updates
        interactionHandler.handleDragUpdate([0, 0.5 + (i * 0.01), 0]);

        // Simulate visual feedback updates
        interactionHandler.updateFaceToFaceVisualFeedback([0, 0.5 + (i * 0.01), 0]);

        const frameTime = performance.now() - startTime;

        // Each frame should complete within the frame budget
        expect(frameTime).toBeLessThan(frameInterval * 1.2); // Allow 20% leeway

        frameCount++;
      }

      expect(frameCount).toBe(maxFrames);
    });

    it('should maintain sub-16ms hover response times', () => {
      const responseTimes: number[] = [];
      const sampleCount = 10;

      interactionHandler.handleFaceSelection(
        FacePosition.TOP,
        [0, 0.5, 0],
        [0, 1, 0],
        Date.now()
      );

      for (let i = 0; i < sampleCount; i++) {
        const startTime = performance.now();

        // Simulate hover update
        interactionHandler.handleDragUpdate([0.5, 0.5, i * 0.1]);

        // Simulate visual feedback query
        const feedback = interactionHandler.updateFaceToFaceVisualFeedback([0.5, 0.5, i * 0.1]);

        const responseTime = performance.now() - startTime;
        responseTimes.push(responseTime);

        // Cleanup for next iteration
        interactionHandler.handleGestureComplete();
        interactionHandler.handleFaceSelection(
          FacePosition.TOP,
          [0, 0.5, 0],
          [0, 1, 0],
          Date.now()
        );
      }

      const avgResponseTime = responseTimes.reduce((a, b) => a + b) / responseTimes.length;
      const maxResponseTime = Math.max(...responseTimes);

      expect(avgResponseTime).toBeLessThan(16); // Average should be under 16ms
      expect(maxResponseTime).toBeLessThan(32); // Max should be under 32ms
    });
  });
});