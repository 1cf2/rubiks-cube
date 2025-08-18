import React from 'react';
import { render, screen } from '@testing-library/react';
import * as THREE from 'three';
import { CameraController } from '../../../src/components/three/CameraController';

// Mock the useCameraControls hook
jest.mock('../../../src/hooks/useCameraControls', () => ({
  useCameraControls: jest.fn()
}));

// Mock THREE.js objects
const mockScene = new THREE.Scene();
const mockCamera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000);
const mockCanvas = document.createElement('canvas');

describe('CameraController', () => {
  const mockUseCameraControls = require('../../../src/hooks/useCameraControls').useCameraControls;
  
  const defaultMockReturn = {
    cameraState: {
      position: { x: 5, y: 5, z: 5 },
      rotation: { w: 1, x: 0, y: 0, z: 0 },
      zoom: 8.66,
      target: { x: 0, y: 0, z: 0 },
      isAnimating: false,
      autoRotationEnabled: false
    },
    isInitialized: true,
    performanceMetrics: {
      frameRate: 60,
      inputLatency: 15,
      animationDuration: 0,
      memoryUsage: 2.5
    },
    resetCamera: jest.fn(),
    orbitCamera: jest.fn(),
    zoomCamera: jest.fn()
  };

  beforeEach(() => {
    mockUseCameraControls.mockReturnValue(defaultMockReturn);
    
    // Mock environment for testing
    const originalEnv = process.env['NODE_ENV'];
    process.env['NODE_ENV'] = 'test';
    
    return () => {
      process.env['NODE_ENV'] = originalEnv;
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('should render when initialized with valid camera state', () => {
    const { container } = render(
      <CameraController
        scene={mockScene}
        camera={mockCamera}
        canvas={mockCanvas}
      />
    );

    expect(container.firstChild).toBeNull(); // Component doesn't render visible UI in test mode
    expect(mockUseCameraControls).toHaveBeenCalledWith(mockScene, mockCamera, mockCanvas);
  });

  test('should not render when not initialized', () => {
    mockUseCameraControls.mockReturnValue({
      ...defaultMockReturn,
      isInitialized: false,
      cameraState: null
    });

    const { container } = render(
      <CameraController
        scene={mockScene}
        camera={mockCamera}
        canvas={mockCanvas}
      />
    );

    expect(container.firstChild).toBeNull();
  });

  test('should call onCameraStateChange when camera state changes', () => {
    const onCameraStateChange = jest.fn();

    render(
      <CameraController
        scene={mockScene}
        camera={mockCamera}
        canvas={mockCanvas}
        onCameraStateChange={onCameraStateChange}
      />
    );

    expect(onCameraStateChange).toHaveBeenCalledWith(false); // isAnimating = false
  });

  test('should call onCameraStateChange with animating state', () => {
    const onCameraStateChange = jest.fn();
    
    mockUseCameraControls.mockReturnValue({
      ...defaultMockReturn,
      cameraState: {
        ...defaultMockReturn.cameraState,
        isAnimating: true
      }
    });

    render(
      <CameraController
        scene={mockScene}
        camera={mockCamera}
        canvas={mockCanvas}
        onCameraStateChange={onCameraStateChange}
      />
    );

    expect(onCameraStateChange).toHaveBeenCalledWith(true);
  });

  test('should call onPerformanceChange with performance metrics', () => {
    const onPerformanceChange = jest.fn();

    render(
      <CameraController
        scene={mockScene}
        camera={mockCamera}
        canvas={mockCanvas}
        onPerformanceChange={onPerformanceChange}
      />
    );

    expect(onPerformanceChange).toHaveBeenCalledWith(defaultMockReturn.performanceMetrics);
  });

  test('should handle null scene gracefully', () => {
    const { container } = render(
      <CameraController
        scene={null}
        camera={mockCamera}
        canvas={mockCanvas}
      />
    );

    expect(mockUseCameraControls).toHaveBeenCalledWith(null, mockCamera, mockCanvas);
    expect(container.firstChild).toBeNull();
  });

  test('should handle null camera gracefully', () => {
    const { container } = render(
      <CameraController
        scene={mockScene}
        camera={null}
        canvas={mockCanvas}
      />
    );

    expect(mockUseCameraControls).toHaveBeenCalledWith(mockScene, null, mockCanvas);
    expect(container.firstChild).toBeNull();
  });

  test('should handle null canvas gracefully', () => {
    const { container } = render(
      <CameraController
        scene={mockScene}
        camera={mockCamera}
        canvas={null}
      />
    );

    expect(mockUseCameraControls).toHaveBeenCalledWith(mockScene, mockCamera, null);
    expect(container.firstChild).toBeNull();
  });

  test('should render children when provided', () => {
    render(
      <CameraController
        scene={mockScene}
        camera={mockCamera}
        canvas={mockCanvas}
      >
        <div data-testid="camera-child">Camera Child Component</div>
      </CameraController>
    );

    expect(screen.getByTestId('camera-child')).toBeInTheDocument();
    expect(screen.getByText('Camera Child Component')).toBeInTheDocument();
  });

  test('should show debug info in development mode', () => {
    // Mock development environment
    const originalEnv = process.env['NODE_ENV'];
    process.env['NODE_ENV'] = 'development';

    const { container } = render(
      <CameraController
        scene={mockScene}
        camera={mockCamera}
        canvas={mockCanvas}
      />
    );

    // Look for debug info container
    const debugInfo = container.querySelector('[style*="position: fixed"]');
    expect(debugInfo).toBeInTheDocument();

    // Check for debug info content
    expect(debugInfo).toHaveTextContent('Camera Position: 5.00, 5.00, 5.00');
    expect(debugInfo).toHaveTextContent('Zoom: 8.66');
    expect(debugInfo).toHaveTextContent('Animating: No');
    expect(debugInfo).toHaveTextContent('FPS: 60.0');
    expect(debugInfo).toHaveTextContent('Input Latency: 15.0ms');

    // Restore environment
    process.env['NODE_ENV'] = originalEnv;
  });

  test('should not show debug info in production mode', () => {
    // Mock production environment
    const originalEnv = process.env['NODE_ENV'];
    process.env['NODE_ENV'] = 'production';

    const { container } = render(
      <CameraController
        scene={mockScene}
        camera={mockCamera}
        canvas={mockCanvas}
      />
    );

    // Look for debug info container
    const debugInfo = container.querySelector('[style*="position: fixed"]');
    expect(debugInfo).not.toBeInTheDocument();

    // Restore environment
    process.env['NODE_ENV'] = originalEnv;
  });

  test('should update camera state when props change', () => {
    const { rerender } = render(
      <CameraController
        scene={mockScene}
        camera={mockCamera}
        canvas={mockCanvas}
      />
    );

    // Change camera state
    mockUseCameraControls.mockReturnValue({
      ...defaultMockReturn,
      cameraState: {
        ...defaultMockReturn.cameraState,
        position: { x: 10, y: 10, z: 10 },
        zoom: 12.0
      }
    });

    const newCamera = new THREE.PerspectiveCamera(60, 1, 0.1, 1000);
    
    rerender(
      <CameraController
        scene={mockScene}
        camera={newCamera}
        canvas={mockCanvas}
      />
    );

    expect(mockUseCameraControls).toHaveBeenLastCalledWith(mockScene, newCamera, mockCanvas);
  });

  test('should handle performance metrics updates', () => {
    const onPerformanceChange = jest.fn();
    
    const { rerender } = render(
      <CameraController
        scene={mockScene}
        camera={mockCamera}
        canvas={mockCanvas}
        onPerformanceChange={onPerformanceChange}
      />
    );

    // Update performance metrics
    const updatedMetrics = {
      frameRate: 30,
      inputLatency: 25,
      animationDuration: 300,
      memoryUsage: 3.2
    };

    mockUseCameraControls.mockReturnValue({
      ...defaultMockReturn,
      performanceMetrics: updatedMetrics
    });

    rerender(
      <CameraController
        scene={mockScene}
        camera={mockCamera}
        canvas={mockCanvas}
        onPerformanceChange={onPerformanceChange}
      />
    );

    expect(onPerformanceChange).toHaveBeenCalledWith(updatedMetrics);
  });
});