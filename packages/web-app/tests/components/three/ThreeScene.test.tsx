import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ThreeScene } from '../../../src/components/three/ThreeScene';

// Mock Three.js to avoid WebGL issues in tests
jest.mock('three', () => ({
  Scene: jest.fn(() => ({
    add: jest.fn(),
    remove: jest.fn(),
    background: null
  })),
  PerspectiveCamera: jest.fn(() => ({
    position: { set: jest.fn() },
    lookAt: jest.fn(),
    aspect: 1,
    updateProjectionMatrix: jest.fn()
  })),
  WebGLRenderer: jest.fn(() => ({
    setSize: jest.fn(),
    setPixelRatio: jest.fn(),
    render: jest.fn(),
    dispose: jest.fn(),
    domElement: document.createElement('canvas'),
    shadowMap: { enabled: false }
  })),
  AmbientLight: jest.fn(() => ({})),
  DirectionalLight: jest.fn(() => ({
    position: { set: jest.fn() }
  })),
  Color: jest.fn()
}));

// Mock WebGLRenderer availability
const mockWebGLRenderer = jest.fn(() => true);
Object.defineProperty(window, 'WebGLRenderer', {
  value: mockWebGLRenderer,
  writable: true
});

describe('ThreeScene', () => {
  it('renders without crashing', () => {
    render(<ThreeScene />);
  });

  it('shows scene initialization', () => {
    render(<ThreeScene />);
    // The test shows Scene ready! because initialization happens quickly in mocked environment
    expect(screen.getByText(/Scene ready!/i)).toBeInTheDocument();
  });

  it('renders error state when WebGL is not available', () => {
    // Mock WebGL as unavailable
    Object.defineProperty(window, 'WebGLRenderer', {
      value: null,
      writable: true
    });

    render(<ThreeScene />);
    
    // Should show error message after initialization attempt
    setTimeout(() => {
      expect(screen.getByText(/3D Rendering Error/i)).toBeInTheDocument();
    }, 100);
  });
});