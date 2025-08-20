import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { useCameraControls } from '../../hooks/useCameraControls';

interface CameraControllerProps {
  scene: THREE.Scene | null;
  camera: THREE.PerspectiveCamera | null;
  canvas: HTMLCanvasElement | null;
  onCameraStateChange?: (isAnimating: boolean) => void;
  onPerformanceChange?: (metrics: any) => void;
  children?: React.ReactNode;
}

/**
 * CameraController - React component for managing camera controls
 * Integrates with Three.js scene to provide orbit, zoom, and reset functionality
 */
export const CameraController: React.FC<CameraControllerProps> = ({
  scene,
  camera,
  canvas,
  onCameraStateChange,
  onPerformanceChange,
  children
}) => {
  const {
    cameraState,
    isInitialized,
    performanceMetrics,
    resetCamera,
    orbitCamera,
    zoomCamera
  } = useCameraControls(scene, camera, canvas);

  // Ref for exposing camera control methods
  const controllerRef = useRef({
    resetCamera,
    orbitCamera,
    zoomCamera,
    getCameraState: () => cameraState,
    getPerformanceMetrics: () => performanceMetrics
  });

  // Update ref when methods change
  useEffect(() => {
    controllerRef.current = {
      resetCamera,
      orbitCamera,
      zoomCamera,
      getCameraState: () => cameraState,
      getPerformanceMetrics: () => performanceMetrics
    };
  }, [resetCamera, orbitCamera, zoomCamera, cameraState, performanceMetrics]);

  // Notify parent of camera state changes
  useEffect(() => {
    if (cameraState && onCameraStateChange) {
      onCameraStateChange(cameraState.isAnimating);
    }
  }, [cameraState, onCameraStateChange]);

  // Notify parent of performance changes
  useEffect(() => {
    if (onPerformanceChange) {
      onPerformanceChange(performanceMetrics);
    }
  }, [performanceMetrics, onPerformanceChange]);

  // Log initialization status
  useEffect(() => {
    if (isInitialized) {
      window.console.log('CameraController initialized successfully');
    }
  }, [isInitialized]);

  // Don't render anything if not initialized
  if (!isInitialized || !cameraState) {
    return null;
  }

  return (
    <>
      {children}
      {/* Debug info in development */}
      {process.env['NODE_ENV'] === 'development' && (
        <div 
          style={{
            position: 'fixed',
            top: '10px',
            right: '10px',
            background: 'rgba(0,0,0,0.7)',
            color: 'white',
            padding: '8px',
            fontSize: '12px',
            fontFamily: 'monospace',
            borderRadius: '4px',
            zIndex: 1000,
            pointerEvents: 'none'
          }}
        >
          <div>Camera Position: {cameraState.position.x.toFixed(2)}, {cameraState.position.y.toFixed(2)}, {cameraState.position.z.toFixed(2)}</div>
          <div>Zoom: {cameraState.zoom.toFixed(2)}</div>
          <div>Animating: {cameraState.isAnimating ? 'Yes' : 'No'}</div>
          <div>FPS: {performanceMetrics.frameRate.toFixed(1)}</div>
          <div>Input Latency: {performanceMetrics.inputLatency.toFixed(1)}ms</div>
        </div>
      )}
    </>
  );
};

export default CameraController;