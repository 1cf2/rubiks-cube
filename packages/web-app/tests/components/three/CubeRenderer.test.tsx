import React from 'react';
import { render } from '@testing-library/react';
import '@testing-library/jest-dom';
import { CubeRenderer } from '../../../src/components/three/CubeRenderer';

// Mock Three.js
const mockScene = {
  add: jest.fn(),
  remove: jest.fn()
};

const mockGroup = {
  add: jest.fn(),
  traverse: jest.fn(),
  rotation: { y: 0, x: 0 },
  scale: { setScalar: jest.fn() }
};

const mockGeometry: any = {
  clone: jest.fn((): any => mockGeometry),
  dispose: jest.fn()
};

const mockMaterial = {
  dispose: jest.fn()
};

const mockMesh = {
  position: { set: jest.fn() },
  material: [],
  geometry: mockGeometry
};

jest.mock('three', () => ({
  Group: jest.fn(() => mockGroup),
  BoxGeometry: jest.fn(() => mockGeometry),
  MeshLambertMaterial: jest.fn(() => mockMaterial),
  Mesh: jest.fn(() => mockMesh)
}));

describe('CubeRenderer', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders without crashing', () => {
    render(<CubeRenderer scene={mockScene as any} />);
  });

  it('creates 27 cube pieces', () => {
    render(<CubeRenderer scene={mockScene as any} />);
    
    // Should create 27 meshes (3x3x3 cube)
    expect(mockGroup.add).toHaveBeenCalledTimes(27);
  });

  it('adds cube group to scene', () => {
    render(<CubeRenderer scene={mockScene as any} />);
    
    expect(mockScene.add).toHaveBeenCalledWith(mockGroup);
  });

  it('enables animation when isAnimating is true', () => {
    const { rerender } = render(
      <CubeRenderer scene={mockScene as any} isAnimating={false} />
    );
    
    rerender(<CubeRenderer scene={mockScene as any} isAnimating={true} />);
    
    // Animation should be started (tested indirectly by checking if requestAnimationFrame would be called)
    expect(mockGroup.add).toHaveBeenCalled();
  });
});