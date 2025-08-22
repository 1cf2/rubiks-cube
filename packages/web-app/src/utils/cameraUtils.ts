import { 
  Vector3D, 
  CameraState, 
  ViewPreferences, 
  DeviceCameraConfig,
  CameraConstraints
} from '@rubiks-cube/shared';

/**
 * Camera utility functions for common camera operations
 */

/**
 * Get device-specific camera configuration based on screen size and capabilities
 */
export function getDeviceCameraConfig(): DeviceCameraConfig {
  const width = window.innerWidth;
  const isTouchDevice = 'ontouchstart' in window;

  // Mobile configuration
  if (width <= 767) {
    return {
      zoomSensitivity: 0.5,
      orbitSensitivity: 0.8,
      autoRotationSpeed: 0.3,
      frameRate: 30,
      gestureDeadZone: 10,
      precisionControls: false,
      hybridControls: false,
      keyboardShortcuts: false,
      adaptiveGestures: true
    };
  }

  // Tablet configuration
  if (width <= 1023) {
    return {
      zoomSensitivity: 0.7,
      orbitSensitivity: 1.0,
      autoRotationSpeed: 0.4,
      frameRate: isTouchDevice ? 30 : 60,
      gestureDeadZone: 8,
      precisionControls: !isTouchDevice,
      hybridControls: true,
      keyboardShortcuts: !isTouchDevice,
      adaptiveGestures: true
    };
  }

  // Desktop configuration
  return {
    zoomSensitivity: 1.0,
    orbitSensitivity: 1.2,
    autoRotationSpeed: 0.5,
    frameRate: 60,
    gestureDeadZone: 5,
    precisionControls: true,
    hybridControls: false,
    keyboardShortcuts: true,
    adaptiveGestures: false
  };
}

/**
 * Get default camera constraints for zoom and orbit limits
 */
export function getDefaultCameraConstraints(): CameraConstraints {
  return {
    zoomLimits: {
      min: 2.0,  // Minimum distance from cube center
      max: 15.0  // Maximum distance from cube center
    },
    orbitLimits: {
      minPolarAngle: 0,           // Allow full vertical rotation
      maxPolarAngle: Math.PI,     // Allow full vertical rotation
      minAzimuthAngle: -Infinity, // Allow unlimited horizontal rotation
      maxAzimuthAngle: Infinity   // Allow unlimited horizontal rotation
    }
  };
}

/**
 * Get default view preferences
 */
export function getDefaultViewPreferences(): ViewPreferences {
  const deviceConfig = getDeviceCameraConfig();
  
  return {
    defaultCameraPosition: { x: 5, y: 5, z: 5 }, // Isometric-ish view
    autoRotationSpeed: deviceConfig.autoRotationSpeed,
    autoRotationTimeout: 5000, // 5 seconds of inactivity
    zoomSensitivity: deviceConfig.zoomSensitivity,
    orbitSensitivity: deviceConfig.orbitSensitivity,
    persistCameraState: true
  };
}

/**
 * Calculate optimal camera position for cube viewing
 */
export function calculateOptimalCameraPosition(
  cubeSize: number = 2.0,
  viewAngle: { azimuth: number; polar: number } = { azimuth: Math.PI / 4, polar: Math.PI / 4 }
): Vector3D {
  const distance = cubeSize * 3; // Reasonable viewing distance
  
  const x = distance * Math.sin(viewAngle.polar) * Math.cos(viewAngle.azimuth);
  const y = distance * Math.cos(viewAngle.polar);
  const z = distance * Math.sin(viewAngle.polar) * Math.sin(viewAngle.azimuth);
  
  return { x, y, z };
}

/**
 * Serialize camera state for local storage
 */
export function serializeCameraState(state: CameraState): string {
  try {
    const serializable = {
      position: state.position,
      rotation: state.rotation,
      zoom: state.zoom,
      target: state.target,
      autoRotationEnabled: state.autoRotationEnabled,
      timestamp: Date.now()
    };
    
    return JSON.stringify(serializable);
  } catch (error) {
    window.console.log('Failed to serialize camera state:', error);
    return '';
  }
}

/**
 * Deserialize camera state from local storage
 */
export function deserializeCameraState(serialized: string): CameraState | null {
  try {
    const parsed = JSON.parse(serialized);
    
    // Validate the structure
    if (!parsed.position || !parsed.rotation || !parsed.target || 
        typeof parsed.zoom !== 'number') {
      return null;
    }
    
    return {
      position: parsed.position,
      rotation: parsed.rotation,
      zoom: parsed.zoom,
      target: parsed.target,
      isAnimating: false, // Always start as not animating
      autoRotationEnabled: parsed.autoRotationEnabled || false
    };
  } catch (error) {
    window.console.log('Failed to deserialize camera state:', error);
    return null;
  }
}

/**
 * Common easing functions for camera animations
 */
export const CameraEasing = {
  // Linear easing
  linear: (t: number) => t,
  
  // Cubic ease-out for smooth camera movements
  easeOut: (t: number) => 1 - Math.pow(1 - t, 3),
  
  // Cubic ease-in-out for balanced animations
  easeInOut: (t: number) => 
    t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2,
  
  // Elastic ease-out for bouncy effect
  elasticOut: (t: number) => {
    const c4 = (2 * Math.PI) / 3;
    return t === 0 ? 0 : t === 1 ? 1 : 
      Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
  },
  
  // Back ease-out for slight overshoot
  backOut: (t: number) => {
    const c1 = 1.70158;
    const c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  }
};

/**
 * Check if camera state is valid
 */
export function validateCameraState(state: CameraState): boolean {
  try {
    // Check position
    if (!state.position || 
        typeof state.position.x !== 'number' ||
        typeof state.position.y !== 'number' ||
        typeof state.position.z !== 'number') {
      return false;
    }
    
    // Check rotation (quaternion)
    if (!state.rotation ||
        typeof state.rotation.w !== 'number' ||
        typeof state.rotation.x !== 'number' ||
        typeof state.rotation.y !== 'number' ||
        typeof state.rotation.z !== 'number') {
      return false;
    }
    
    // Check target
    if (!state.target ||
        typeof state.target.x !== 'number' ||
        typeof state.target.y !== 'number' ||
        typeof state.target.z !== 'number') {
      return false;
    }
    
    // Check zoom
    if (typeof state.zoom !== 'number' || state.zoom <= 0) {
      return false;
    }
    
    // Check boolean flags
    if (typeof state.isAnimating !== 'boolean' ||
        typeof state.autoRotationEnabled !== 'boolean') {
      return false;
    }
    
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Convert spherical coordinates to Cartesian coordinates
 */
export function sphericalToCartesian(
  radius: number, 
  azimuth: number, 
  polar: number
): Vector3D {
  return {
    x: radius * Math.sin(polar) * Math.cos(azimuth),
    y: radius * Math.cos(polar),
    z: radius * Math.sin(polar) * Math.sin(azimuth)
  };
}

/**
 * Convert Cartesian coordinates to spherical coordinates
 */
export function cartesianToSpherical(position: Vector3D): {
  radius: number;
  azimuth: number;
  polar: number;
} {
  const radius = Math.sqrt(position.x * position.x + position.y * position.y + position.z * position.z);
  const azimuth = Math.atan2(position.z, position.x);
  const polar = Math.acos(position.y / radius);
  
  return { radius, azimuth, polar };
}

/**
 * Calculate distance between two 3D points
 */
export function calculateDistance(point1: Vector3D, point2: Vector3D): number {
  const dx = point1.x - point2.x;
  const dy = point1.y - point2.y;
  const dz = point1.z - point2.z;
  
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

/**
 * Interpolate between two Vector3D points
 */
export function interpolateVector3D(start: Vector3D, end: Vector3D, t: number): Vector3D {
  return {
    x: start.x + (end.x - start.x) * t,
    y: start.y + (end.y - start.y) * t,
    z: start.z + (end.z - start.z) * t
  };
}

/**
 * Get appropriate frame rate target based on device
 */
export function getTargetFrameRate(): number {
  const deviceConfig = getDeviceCameraConfig();
  return deviceConfig.frameRate;
}

/**
 * Check if device supports high performance camera operations
 */
export function supportsHighPerformanceCamera(): boolean {
  // Check for dedicated GPU and high refresh rate
  const canvas = document.createElement('canvas');
  const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
  
  if (!gl) {
    return false;
  }
  
  const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
  if (debugInfo) {
    const renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
    // Check for dedicated GPU indicators
    if (renderer.includes('Intel HD') || renderer.includes('Intel UHD')) {
      return false; // Integrated graphics
    }
  }
  
  // Check for high refresh rate display
  const hasHighRefreshRate = window.screen && (window.screen as any).refreshRate > 60;
  
  return hasHighRefreshRate;
}