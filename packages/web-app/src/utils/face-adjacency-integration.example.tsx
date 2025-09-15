/**
 * Face-to-Face Drag Interaction Integration Example
 *
 * This example demonstrates how to integrate the new face-to-face drag interaction
 * system with the existing MouseControls component and application architecture.
 */

// @ts-nocheck
import React, { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';
import {
  FacePosition,
  RotationCommand,
  RotationDirection,
  VisualFeedback
} from '@rubiks-cube/shared/types';

// Import the new face-to-face interaction system
import { FaceToFaceMouseInteractionHandler } from '../../../three-renderer/src/interactions/FaceToFaceMouseInteractionHandler';

// Your existing MouseControls interface
interface MouseControlsProps {
  camera: THREE.Camera | null;
  scene: THREE.Scene | null;
  cubeGroup: THREE.Group | null;
  onFaceSelect?: (face: FacePosition) => void;
  onRotationStart?: (command: RotationCommand) => void;
  onRotationComplete?: (command: RotationCommand) => void;
}

/**
 * Enhanced MouseControls with Face-to-Face Integration
 *
 * This component extends the existing MouseControls to support the new
 * face-to-face drag interaction pattern while maintaining backward compatibility.
 */
export const EnhancedMouseControls: React.FC<MouseControlsProps> = ({
  camera,
  scene,
  cubeGroup,
  onFaceSelect,
  onRotationStart,
  onRotationComplete,
}) => {
  const [cubeStateVersion, setCubeStateVersion] = useState(0);
  const [isFaceToFaceEnabled, setIsFaceToFaceEnabled] = useState(true);

  // Reference to the Three.js renderer for integration
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);

  // Face-to-face interaction handler
  const faceToFaceHandlerRef = useRef<FaceToFaceMouseInteractionHandler | null>(null);

  // Initialize face-to-face system when all dependencies are ready
  useEffect(() => {
    if (!scene || !camera || !cubeGroup || !rendererRef.current) return;

    if (isFaceToFaceEnabled && !faceToFaceHandlerRef.current) {
      // Create the face-to-face interaction handler
      faceToFaceHandlerRef.current = new FaceToFaceMouseInteractionHandler();

      console.log('🎯 Face-to-face drag interaction enabled');
    }
  }, [scene, camera, cubeGroup, isFaceToFaceEnabled]);

  /**
   * Mouse down handler - initiate face selection for face-to-face interaction
   */
  const handleMouseDown = (event: MouseEvent) => {
    if (!faceToFaceHandlerRef.current || !isFaceToFaceEnabled) return;

    // Convert screen coordinates to normalized device coordinates
    const canvas = rendererRef.current?.domElement;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const mouseX = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    const mouseY = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    // Perform raycasting to determine which face was clicked
    const hits = performRaycasting(mouseX, mouseY);
    if (!hits || hits.length === 0) return;

    const firstHit = hits[0];
    if (!firstHit) return;

    const face = determineFaceFromHit(firstHit);
    if (!face) return;

    // Extract position and normal from the hit
    const position: readonly [number, number, number] = [
      firstHit.point.x,
      firstHit.point.y,
      firstHit.point.z
    ];

    const normal: readonly [number, number, number] = [
      firstHit.face!.normal!.x,
      firstHit.face!.normal!.y,
      firstHit.face!.normal!.z
    ];

    // Initialize face-to-face interaction
    const result = faceToFaceHandlerRef.current.handleFaceSelection(
      face,
      position,
      normal,
      event.timeStamp
    );

    if (result.success) {
      console.log('🎯 Face A selected:', face);
      onFaceSelect?.(face);
    }
  };

  /**
   * Mouse move handler - update face-to-face interaction during drag
   */
  const handleMouseMove = (event: MouseEvent) => {
    if (!faceToFaceHandlerRef.current || !isFaceToFaceEnabled) return;

    const currentPos = getWorldPositionFromScreen(event);

    if (currentPos) {
      const dragResult = faceToFaceHandlerRef.current.handleDragUpdate([
        currentPos.x,
        currentPos.y,
        currentPos.z
      ]);

      if (dragResult.success) {
        // Update visual feedback based on drag result
        const feedback = faceToFaceHandlerRef.current.updateFaceToFaceVisualFeedback();

        applyVisualFeedback(feedback);

        // Check if rotation can be initiated
        if (dragResult.data.canRotate && dragResult.data.rotationCommand) {
          console.log('🎯 Valid rotation gesture detected');

          // Create rotation command with full gesture context
          const fullCommand: RotationCommand = {
            ...dragResult.data.rotationCommand,
            face: dragResult.data.rotationCommand.face,
            direction: determineCorrectDirection(dragResult.data.rotationCommand, dragResult.data.validFaces),
          };

          onRotationStart?.(fullCommand);
        }
      }
    }
  };

  /**
   * Mouse up handler - complete face-to-face gesture
   */
  const handleMouseUp = (event: MouseEvent) => {
    if (!faceToFaceHandlerRef.current || !isFaceToFaceEnabled) return;

    // Get final drag position
    const finalPos = getWorldPositionFromScreen(event);

    if (finalPos) {
      const dragResult = faceToFaceHandlerRef.current.handleDragUpdate([
        finalPos.x,
        finalPos.y,
        finalPos.z
      ]);

      // Complete the gesture
      const completeResult = faceToFaceHandlerRef.current.handleGestureComplete();

      if (completeResult.success && dragResult.success && dragResult.data.rotationCommand) {
        console.log('🎯 Face-to-face gesture completed');

        // Update cube state version to trigger re-render
        setCubeStateVersion(prev => prev + 1);

        // Notify completion
        onRotationComplete?.(dragResult.data.rotationCommand);
      }
    }
  };

  // Helper functions (simplified implementations)
  const performRaycasting = (mouseX: number, mouseY: number): THREE.Intersection[] | undefined => {
    // Implement raycasting logic here
    return [];
  };

  const determineFaceFromHit = (hit: THREE.Intersection): FacePosition | null => {
    // Implement face detection from intersection
    return FacePosition.FRONT; // Simplified
  };

  const getWorldPositionFromScreen = (event: MouseEvent): THREE.Vector3 | null => {
    // Convert screen coordinates to world position
    return new THREE.Vector3(0, 0, 0); // Simplified
  };

  const applyVisualFeedback = (feedback: VisualFeedback[]) => {
    // Apply visual feedback to the scene
    feedback.forEach(f => {
      console.log('Applying visual feedback for face:', f.face, 'state:', f.state);
    });
  };

  const determineCorrectDirection = (command: RotationCommand, validFaces: FacePosition[]): RotationDirection => {
    // Use face-to-face logic to determine correct rotation direction
    // This would use the adjacency relationship to determine proper direction
    return command.direction;
  };

  useEffect(() => {
    const domElement = rendererRef.current?.domElement;
    if (!domElement) return;

    // Add mouse event listeners when component mounts
    domElement.addEventListener('mousedown', handleMouseDown);
    domElement.addEventListener('mousemove', handleMouseMove);
    domElement.addEventListener('mouseup', handleMouseUp);

    return () => {
      // Cleanup event listeners
      domElement.removeEventListener('mousedown', handleMouseDown);
      domElement.removeEventListener('mousemove', handleMouseMove);
      domElement.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isFaceToFaceEnabled]);

  // Return the component JSX
  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'auto',
        backgroundColor: isFaceToFaceEnabled ? 'rgba(0, 255, 0, 0.1)' : 'transparent'
      }}
    >
      {isFaceToFaceEnabled && (
        <div style={{
          position: 'absolute',
          top: '10px',
          right: '10px',
          background: 'rgba(0, 0, 0, 0.8)',
          color: 'white',
          padding: '8px',
          borderRadius: '4px',
          fontSize: '12px'
        }}>
          🎯 Face-to-Face Mode Active
        </div>
      )}

      <div style={{ position: 'absolute', bottom: '10px', left: '10px' }}>
        <button
          onClick={() => setIsFaceToFaceEnabled(!isFaceToFaceEnabled)}
          style={{
            background: isFaceToFaceEnabled ? '#4CAF50' : '#f44336',
            color: 'white',
            border: 'none',
            padding: '8px 16px',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          {isFaceToFaceEnabled ? 'Disable' : 'Enable'} Face-to-Face Mode
        </button>
      </div>
    </div>
  );
};

/**
 * Integration Example: How to use with existing application
 */
/* eslint-disable no-unused-vars */
export const AppIntegrationExample = () => {
  const [scene] = useState(new THREE.Scene());
  const [camera] = useState(new THREE.PerspectiveCamera(75, 1, 0.1, 1000));
  const [renderer] = useState(new THREE.WebGLRenderer());
  const [cubeGroup] = useState(new THREE.Group());

  return (
    <div className="app">
      {/* Your existing Three.js renderer */}
      <div ref={(el) => el?.appendChild(renderer.domElement)} />

      {/* Enhanced MouseControls with face-to-face support */}
      <EnhancedMouseControls
        scene={scene}
        camera={camera}
        cubeGroup={cubeGroup}
        onFaceSelect={(face) => console.log('Face selected:', face)}
        onRotationStart={(command) => console.log('Rotation starting:', command)}
        onRotationComplete={(command) => console.log('Rotation completed:', command)}
      />
    </div>
  );
};

/**
 * Usage Steps:
 *
 * 1. Import the FaceToFaceMouseInteractionHandler
 * 2. Initialize it with your scene, camera, renderer, and cube group
 * 3. Handle mouse events and convert screen coordinates to world positions
 * 4. Call handleFaceSelection() on mouse down over a cube face
 * 5. Call handleDragUpdate() during mouse move to detect adjacency
 * 6. Apply visual feedback using updateFaceToFaceVisualFeedback()
 * 7. Execute rotation when valid gesture is detected
 * 8. Call handleGestureComplete() on mouse up
 *
 * The system automatically:
 * - Tracks Face A (reference face) selection
 * - Detects adjacent Face B during drag
 * - Validates layer compatibility
 * - Calculates rotation direction using right-hand rule
 * - Provides real-time visual feedback
 * - Handles invalid gestures gracefully
 */