import '@testing-library/jest-dom';

// Three.js testing utilities
export const createMockRenderer = () => {
  return {
    setSize: jest.fn(),
    render: jest.fn(),
    dispose: jest.fn(),
    domElement: document.createElement('canvas'),
    getContext: jest.fn(),
    setPixelRatio: jest.fn(),
    setClearColor: jest.fn(),
    clear: jest.fn(),
  };
};

export const createMockScene = () => {
  return {
    add: jest.fn(),
    remove: jest.fn(),
    children: [],
    traverse: jest.fn(),
  };
};

export const createMockCamera = () => {
  return {
    position: { x: 0, y: 0, z: 5 },
    lookAt: jest.fn(),
    updateProjectionMatrix: jest.fn(),
    aspect: 1,
    fov: 75,
    near: 0.1,
    far: 1000,
  };
};

// Performance testing utilities
export const measurePerformance = async (fn: () => void | Promise<void>): Promise<number> => {
  const start = performance.now();
  await fn();
  const end = performance.now();
  return end - start;
};

export const expectPerformanceUnder = (actualTime: number, maxTime: number) => {
  expect(actualTime).toBeLessThan(maxTime);
};