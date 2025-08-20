import React, { useEffect, useRef, useState } from 'react';
import { 
  Scene,
  PerspectiveCamera,
  WebGLRenderer,
  Color,
  AmbientLight,
  DirectionalLight
} from 'three';
import { LoadingIndicator } from './LoadingIndicator';

interface ThreeSceneProps {
  children?: React.ReactNode;
}

interface PerformanceMetrics {
  frameRate: number;
  averageFrameTime: number;
  lastFrameTime: number;
}

export const ThreeScene: React.FC<ThreeSceneProps> = ({ children }) => {
  return (
    <ThreeSceneProvider>
      {children}
    </ThreeSceneProvider>
  );
};

// Context for child components to access Three.js objects
export const ThreeContext = React.createContext<{
  scene: Scene | null;
  camera: PerspectiveCamera | null;
  renderer: WebGLRenderer | null;
}>({
  scene: null,
  camera: null,
  renderer: null
});

export const useThreeContext = () => {
  const context = React.useContext(ThreeContext);
  if (!context) {
    throw new Error('useThreeContext must be used within a ThreeScene');
  }
  return context;
};

// Provider component to make Three.js objects available to children
export const ThreeSceneProvider: React.FC<ThreeSceneProps> = ({ children }) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<Scene | null>(null);
  const rendererRef = useRef<WebGLRenderer | null>(null);
  const cameraRef = useRef<PerspectiveCamera | null>(null);
  const frameId = useRef<number | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [loadingMessage, setLoadingMessage] = useState('Initializing 3D Engine...');
  const [performanceMetrics, setPerformanceMetrics] = useState<PerformanceMetrics>({
    frameRate: 0,
    averageFrameTime: 0,
    lastFrameTime: 0
  });

  // Performance monitoring
  const frameTimeHistory = useRef<number[]>([]);
  const lastTime = useRef<number>(0);

  useEffect(() => {
    if (!mountRef.current) return;

    try {
      // Loading step 1: WebGL check
      setLoadingProgress(10);
      setLoadingMessage('Checking WebGL compatibility...');
      
      // Check WebGL availability
      if (!WebGLRenderer) {
        throw new Error('WebGL is not available in this browser');
      }

      // Loading step 2: Scene initialization
      setLoadingProgress(25);
      setLoadingMessage('Creating 3D scene...');
      
      // Scene initialization with performance monitoring
      const scene = new Scene();
      scene.background = new Color(0xf0f0f0);
      sceneRef.current = scene;

      // Loading step 3: Camera setup
      setLoadingProgress(40);
      setLoadingMessage('Setting up camera...');
      
      // Camera configuration for optimal cube viewing
      const camera = new PerspectiveCamera(
        75, // Field of view
        window.innerWidth / window.innerHeight, // Aspect ratio
        0.1, // Near plane
        1000 // Far plane
      );
      camera.position.set(5, 5, 5);
      camera.lookAt(0, 0, 0);
      cameraRef.current = camera;

      // Loading step 4: Renderer initialization
      setLoadingProgress(60);
      setLoadingMessage('Initializing WebGL renderer...');
      
      // Renderer with performance optimizations
      const renderer = new WebGLRenderer({
        antialias: true,
        alpha: true,
        powerPreference: "high-performance"
      });
      renderer.setSize(window.innerWidth, window.innerHeight);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.shadowMap.enabled = false; // Optimize for initial story
      rendererRef.current = renderer;

      // Loading step 5: Lighting setup
      setLoadingProgress(75);
      setLoadingMessage('Setting up lighting...');
      
      // Ambient light for overall illumination
      const ambientLight = new AmbientLight(0x404040, 0.6);
      scene.add(ambientLight);

      // Directional light for face definition
      const directionalLight = new DirectionalLight(0xffffff, 0.8);
      directionalLight.position.set(10, 10, 5);
      scene.add(directionalLight);

      // Loading step 6: DOM integration
      setLoadingProgress(90);
      setLoadingMessage('Preparing canvas...');
      
      // Append renderer to DOM
      window.console.log('🎨 ThreeScene: Setting up canvas with pointerEvents:', renderer.domElement.style.pointerEvents);
      // Canvas should not capture pointer events - MouseControls overlay will handle all interaction
      renderer.domElement.style.pointerEvents = 'none';
      window.console.log('🎨 ThreeScene: Canvas pointerEvents after setting:', renderer.domElement.style.pointerEvents);
      mountRef.current.appendChild(renderer.domElement);

      // Enhanced responsive resize handler
      const handleResize = () => {
        if (!camera || !renderer) return;
        
        const width = window.innerWidth;
        const height = window.innerHeight;
        
        // Update camera aspect ratio
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
        
        // Update renderer size with device pixel ratio handling
        renderer.setSize(width, height);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        
        // Trigger custom event for responsive updates that child components can listen to
        window.dispatchEvent(new CustomEvent('threeSceneResize', {
          detail: { width, height, isMobile: width < 768 }
        }));
      };

      window.addEventListener('resize', handleResize);
      
      // Final loading step
      setLoadingProgress(100);
      setLoadingMessage('Scene ready!');
      
      // Short delay to show completion, then mark as initialized
      setTimeout(() => {
        setIsInitialized(true);
      }, 200);

      // WebGL context loss handling
      const handleContextLost = (event: Event) => {
        event.preventDefault();
        setError('WebGL context lost. Please refresh the page.');
      };

      const handleContextRestored = () => {
        setError(null);
        // Reinitialize scene
      };

      renderer.domElement.addEventListener('webglcontextlost', handleContextLost);
      renderer.domElement.addEventListener('webglcontextrestored', handleContextRestored);

      // Cleanup
      return () => {
        window.removeEventListener('resize', handleResize);
        renderer.domElement.removeEventListener('webglcontextlost', handleContextLost);
        renderer.domElement.removeEventListener('webglcontextrestored', handleContextRestored);
        
        if (frameId.current) {
          cancelAnimationFrame(frameId.current);
        }
        
        if (mountRef.current && renderer.domElement) {
          mountRef.current.removeChild(renderer.domElement);
        }
        
        renderer.dispose();
      };
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to initialize Three.js scene');
      return;
    }
  }, []);

  // Animation loop with performance monitoring
  useEffect(() => {
    if (!isInitialized || !sceneRef.current || !cameraRef.current || !rendererRef.current) return;

    const animate = (currentTime: number) => {
      // Performance tracking
      if (lastTime.current > 0) {
        const frameTime = currentTime - lastTime.current;
        frameTimeHistory.current.push(frameTime);
        
        // Keep only last 60 frames for rolling average
        if (frameTimeHistory.current.length > 60) {
          frameTimeHistory.current.shift();
        }
        
        const averageFrameTime = frameTimeHistory.current.reduce((a, b) => a + b, 0) / frameTimeHistory.current.length;
        const frameRate = 1000 / averageFrameTime;
        
        setPerformanceMetrics({
          frameRate: Math.round(frameRate),
          averageFrameTime: Math.round(averageFrameTime * 100) / 100,
          lastFrameTime: Math.round(frameTime * 100) / 100
        });
      }
      lastTime.current = currentTime;

      // Render the scene
      rendererRef.current!.render(sceneRef.current!, cameraRef.current!);
      frameId.current = requestAnimationFrame(animate);
    };

    frameId.current = requestAnimationFrame(animate);

    return () => {
      if (frameId.current) {
        cancelAnimationFrame(frameId.current);
      }
    };
  }, [isInitialized]);

  if (error) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        backgroundColor: '#f0f0f0',
        color: '#d32f2f',
        fontSize: '18px',
        textAlign: 'center',
        padding: '20px'
      }}>
        <div>
          <h3>3D Rendering Error</h3>
          <p>{error}</p>
          <p>Please ensure your browser supports WebGL and try refreshing the page.</p>
        </div>
      </div>
    );
  }

  return (
    <ThreeContext.Provider value={{
      scene: sceneRef.current,
      camera: cameraRef.current,
      renderer: rendererRef.current
    }}>
      {!isInitialized && (
        <LoadingIndicator 
          progress={loadingProgress} 
          message={loadingMessage} 
        />
      )}
      <div ref={mountRef} style={{ width: '100%', height: '100vh', position: 'relative' }}>
        {/* Performance display for development */}
        {process.env['NODE_ENV'] === 'development' && isInitialized && (
          <div style={{
            position: 'absolute',
            top: '10px',
            left: '10px',
            backgroundColor: 'rgba(0,0,0,0.7)',
            color: 'white',
            padding: '8px',
            borderRadius: '4px',
            fontSize: '12px',
            fontFamily: 'monospace',
            zIndex: 1000
          }}>
            <div>FPS: {performanceMetrics.frameRate}</div>
            <div>Frame Time: {performanceMetrics.lastFrameTime}ms</div>
            <div>Avg Frame Time: {performanceMetrics.averageFrameTime}ms</div>
          </div>
        )}
        {isInitialized && children}
      </div>
    </ThreeContext.Provider>
  );
};