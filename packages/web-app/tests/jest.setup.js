// Mock canvas and WebGL for React components using Three.js
// Mock HTMLCanvasElement methods
Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
  value: () => ({
    fillRect: () => {},
    clearRect: () => {},
    getImageData: () => ({ data: new Array(4) }),
    putImageData: () => {},
    createImageData: () => [],
    setTransform: () => {},
    drawImage: () => {},
    save: () => {},
    fillText: () => {},
    restore: () => {},
    beginPath: () => {},
    moveTo: () => {},
    lineTo: () => {},
    closePath: () => {},
    stroke: () => {},
    translate: () => {},
    scale: () => {},
    rotate: () => {},
    arc: () => {},
    fill: () => {},
    measureText: () => ({ width: 0 }),
    transform: () => {},
    rect: () => {},
    clip: () => {}
  })
});

// Mock WebGL
global.WebGLRenderingContext = jest.fn();
global.WebGL2RenderingContext = jest.fn();

// Mock CSS modules
const mockCSSModules = new Proxy({}, {
  get: () => 'mock-css-class'
});

// Handle CSS imports
require.extensions['.css'] = () => mockCSSModules;
require.extensions['.scss'] = () => mockCSSModules;
require.extensions['.sass'] = () => mockCSSModules;
require.extensions['.less'] = () => mockCSSModules;