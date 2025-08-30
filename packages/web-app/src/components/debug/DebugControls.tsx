import React, { useState, useEffect, useCallback } from 'react';
import * as THREE from 'three';
import { featureFlags, FeatureFlags } from '../../utils/featureFlags';

interface DebugControlsProps {
  isVisible?: boolean;
  camera?: THREE.Camera | null;
  scene?: THREE.Scene | null;
}

export const DebugControls: React.FC<DebugControlsProps> = ({
  isVisible = false,
  camera,
  scene
}) => {
  const [flags, setFlags] = useState<FeatureFlags>(featureFlags.getAllFlags());
  const [showControls, setShowControls] = useState(isVisible);

  // Camera control state
  const [cameraPosition, setCameraPosition] = useState({ x: 5, y: 5, z: 5 });
  const [cameraRotation, setCameraRotation] = useState({ x: 0, y: 0, z: 0 });
  const [cameraFov, setCameraFov] = useState(75);

  // Spotlight control state (initialized with current scene values)
  const [spotlights, setSpotlights] = useState<Array<{
    id: number;
    intensity: number;
    angle: number;
    distance: number;
    name: string;
  }>>([]);

  useEffect(() => {
    // Update local state when flags change
    const updateFlags = () => setFlags(featureFlags.getAllFlags());

    // Listen for flag changes (if we want real-time updates)
    const interval = setInterval(updateFlags, 1000);
    return () => clearInterval(interval);
  }, []);

  // Initialize camera and spotlight values from scene
  useEffect(() => {
    if (camera && camera instanceof THREE.PerspectiveCamera) {
      const perspCamera = camera as THREE.PerspectiveCamera;
      setCameraPosition({
        x: Math.round(perspCamera.position.x * 100) / 100,
        y: Math.round(perspCamera.position.y * 100) / 100,
        z: Math.round(perspCamera.position.z * 100) / 100,
      });

      const euler = new THREE.Euler().setFromQuaternion(perspCamera.quaternion);
      setCameraRotation({
        x: Math.round(euler.x * 180 / Math.PI * 100) / 100,
        y: Math.round(euler.y * 180 / Math.PI * 100) / 100,
        z: Math.round(euler.z * 180 / Math.PI * 100) / 100,
      });

      setCameraFov(Math.round(perspCamera.fov * 100) / 100);
    }
  }, [camera]);

  // Initialize spotlight values from scene
  useEffect(() => {
    if (scene) {
      const sceneSpotlights: typeof spotlights = [];
      let spotlightId = 0;

      scene.traverse((child) => {
        if (child instanceof THREE.SpotLight) {
          sceneSpotlights.push({
            id: spotlightId++,
            intensity: Math.round(child.intensity * 100) / 100,
            angle: Math.round(child.angle * 180 / Math.PI * 100) / 100,
            distance: child.distance,
            name: child.name || `Spotlight ${spotlightId}`,
          });
        }
      });

      setSpotlights(sceneSpotlights);
    }
  }, [scene]);

  // Camera update handlers
  const updateCameraPosition = useCallback((axis: 'x' | 'y' | 'z', value: number) => {
    if (camera && camera instanceof THREE.PerspectiveCamera) {
      const perspCamera = camera as THREE.PerspectiveCamera;
      const newPosition = {
        ...cameraPosition,
        [axis]: value,
      };
      perspCamera.position.set(newPosition.x, newPosition.y, newPosition.z);
      setCameraPosition(newPosition);
      window.console.log(`📷 Camera position updated: ${axis.toUpperCase()} ${value}`);
    }
  }, [camera, cameraPosition]);

  const updateCameraRotation = useCallback((axis: 'x' | 'y' | 'z', value: number) => {
    if (camera && camera instanceof THREE.PerspectiveCamera) {
      const perspCamera = camera as THREE.PerspectiveCamera;
      const newRotation = {
        ...cameraRotation,
        [axis]: value,
      };

      const euler = new THREE.Euler();
      euler.x = newRotation.x * Math.PI / 180;
      euler.y = newRotation.y * Math.PI / 180;
      euler.z = newRotation.z * Math.PI / 180;

      perspCamera.setRotationFromEuler(euler);
      setCameraRotation(newRotation);
      window.console.log(`📷 Camera rotation updated: ${axis.toUpperCase()} ${value}°`);
    }
  }, [camera, cameraRotation]);

  const updateCameraFov = useCallback((value: number) => {
    if (camera && camera instanceof THREE.PerspectiveCamera) {
      const perspCamera = camera as THREE.PerspectiveCamera;
      perspCamera.fov = value;
      perspCamera.updateProjectionMatrix();
      setCameraFov(value);
      window.console.log(`📷 Camera FOV updated: ${value}°`);
    }
  }, [camera]);

  // Spotlight update handlers
  const updateSpotlightIntensity = useCallback((spotlightId: number, value: number) => {
    if (scene) {
      let spotIndex = 0;
      scene.traverse((child) => {
        if (child instanceof THREE.SpotLight && spotIndex === spotlightId) {
          child.intensity = value;
          if (child.castShadow) {
            child.shadow.needsUpdate = true;
          }
          window.console.log(`💡 Spotlight ${child.name} intensity: ${value}`);
        }
        if (child instanceof THREE.SpotLight) {
          spotIndex++;
        }
      });

      setSpotlights(prev => prev.map(spot =>
        spot.id === spotlightId ? { ...spot, intensity: value } : spot
      ));
    }
  }, [scene]);

  const updateSpotlightAngle = useCallback((spotlightId: number, value: number) => {
    if (scene) {
      let spotIndex = 0;
      scene.traverse((child) => {
        if (child instanceof THREE.SpotLight && spotIndex === spotlightId) {
          child.angle = value * Math.PI / 180; // Convert degrees to radians
          if (child.castShadow) {
            child.shadow.needsUpdate = true;
          }
          window.console.log(`💡 Spotlight ${child.name} angle: ${value}°`);
        }
        if (child instanceof THREE.SpotLight) {
          spotIndex++;
        }
      });

      setSpotlights(prev => prev.map(spot =>
        spot.id === spotlightId ? { ...spot, angle: value } : spot
      ));
    }
  }, [scene]);

  const toggleFlag = (key: keyof FeatureFlags) => {
    featureFlags.toggleFlag(key);
    setFlags(featureFlags.getAllFlags());
  };

  const resetFlags = () => {
    featureFlags.reset();
    setFlags(featureFlags.getAllFlags());
  };

  const overlayStyle: React.CSSProperties = {
    position: 'fixed',
    top: 10,
    right: 10,
    padding: '12px',
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    color: 'white',
    fontFamily: 'monospace',
    fontSize: '12px',
    borderRadius: '6px',
    zIndex: 10001,
    minWidth: '250px',
    maxHeight: '80vh',
    overflowY: 'auto',
  };

  const buttonStyle: React.CSSProperties = {
    padding: '4px 8px',
    margin: '2px',
    backgroundColor: '#333',
    color: 'white',
    border: '1px solid #555',
    borderRadius: '3px',
    cursor: 'pointer',
    fontSize: '11px',
  };

  const toggleButtonStyle: React.CSSProperties = {
    ...buttonStyle,
    backgroundColor: '#007acc',
    position: 'fixed',
    top: 10,
    right: 10,
    zIndex: 10002,
  };

  const flagRowStyle: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '4px',
    padding: '2px 0',
  };

  const enabledStyle: React.CSSProperties = {
    color: '#00ff00',
    fontWeight: 'bold',
  };

  const disabledStyle: React.CSSProperties = {
    color: '#ff6666',
  };

  const sliderStyle: React.CSSProperties = {
    width: '80px',
    margin: '0 4px',
  };

  const sliderLabelStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    marginBottom: '4px',
    fontSize: '11px',
  };

  const sliderGroupStyle: React.CSSProperties = {
    marginBottom: '8px',
  };

  const controlRowStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '2px',
    fontSize: '11px',
  };

  const sliderValueStyle: React.CSSProperties = {
    fontFamily: 'monospace',
    fontSize: '10px',
    color: '#ffff00',
    minWidth: '35px',
    textAlign: 'right' as const,
  };

  const flagGroups = {
    'Debug Features': [
      'enableMouseGestureDebug',
      'enableMouseGestureOverlay',
      'enableConsoleDebugLogs',
      'enablePerformanceMonitoring',
    ],
    'Mouse Gesture Features': [
      'enableMouseGestureLogging',
      'enableRaycastDebug',
      'enableGestureVisualization',
    ],
    'Development Features': [
      'enableDevelopmentTools',
      'enableExperimentalFeatures',
    ],
  };

  const formatFlagName = (flagKey: string): string => {
    return flagKey
      .replace(/^enable/, '')
      .replace(/([A-Z])/g, ' $1')
      .trim();
  };

  if (!showControls) {
    return (
      <button
        style={toggleButtonStyle}
        onClick={() => setShowControls(true)}
        title="Show Debug Controls"
      >
        🛠️ Debug
      </button>
    );
  }

  return (
    <>
      <button
        style={toggleButtonStyle}
        onClick={() => setShowControls(false)}
        title="Hide Debug Controls"
      >
        ✖️ Hide
      </button>
      
      <div style={overlayStyle}>
        <h4 style={{ margin: '0 0 12px 0', color: '#ffff00' }}>
          🛠️ Debug Controls
        </h4>
        
        <div style={{ marginBottom: '12px' }}>
          <button 
            style={buttonStyle} 
            onClick={resetFlags}
            title="Reset all flags to defaults"
          >
            🔄 Reset All
          </button>
          <button 
            style={buttonStyle} 
            onClick={() => window.console.log(featureFlags.getDebugSummary())}
            title="Log flag status to console"
          >
            📋 Log Status
          </button>
        </div>

        {Object.entries(flagGroups).map(([groupName, flagKeys]) => (
          <div key={groupName} style={{ marginBottom: '16px' }}>
            <h5 style={{
              margin: '0 0 8px 0',
              color: '#cccccc',
              borderBottom: '1px solid #444',
              paddingBottom: '4px',
            }}>
              {groupName}
            </h5>

            {flagKeys.map((flagKey) => (
              <div key={flagKey} style={flagRowStyle}>
                <span style={{ fontSize: '11px' }}>
                  {formatFlagName(flagKey)}
                </span>
                <button
                  style={{
                    ...buttonStyle,
                    ...(flags[flagKey as keyof FeatureFlags] ? enabledStyle : disabledStyle),
                  }}
                  onClick={() => toggleFlag(flagKey as keyof FeatureFlags)}
                  title={`Toggle ${flagKey}`}
                >
                  {flags[flagKey as keyof FeatureFlags] ? '✓ ON' : '✗ OFF'}
                </button>
              </div>
            ))}
          </div>
        ))}

        {/* Camera Controls Section */}
        {camera && (
          <div style={{ marginBottom: '16px' }}>
            <h5 style={{
              margin: '0 0 8px 0',
              color: '#cccccc',
              borderBottom: '1px solid #444',
              paddingBottom: '4px',
            }}>
              ⚙️ Camera Controls
            </h5>

            <div style={sliderGroupStyle}>
              <div style={sliderLabelStyle}>
                📍 Position
              </div>
              <div style={controlRowStyle}>
                <span style={{ width: '20px' }}>X</span>
                <input
                  type="range"
                  min="-10"
                  max="10"
                  step="0.1"
                  value={cameraPosition.x}
                  onChange={(e) => updateCameraPosition('x', parseFloat(e.target.value))}
                  style={sliderStyle}
                  title={`Camera X position: ${cameraPosition.x}`}
                />
                <span style={sliderValueStyle}>{cameraPosition.x}</span>
              </div>
              <div style={controlRowStyle}>
                <span style={{ width: '20px' }}>Y</span>
                <input
                  type="range"
                  min="-10"
                  max="10"
                  step="0.1"
                  value={cameraPosition.y}
                  onChange={(e) => updateCameraPosition('y', parseFloat(e.target.value))}
                  style={sliderStyle}
                  title={`Camera Y position: ${cameraPosition.y}`}
                />
                <span style={sliderValueStyle}>{cameraPosition.y}</span>
              </div>
              <div style={controlRowStyle}>
                <span style={{ width: '20px' }}>Z</span>
                <input
                  type="range"
                  min="-10"
                  max="10"
                  step="0.1"
                  value={cameraPosition.z}
                  onChange={(e) => updateCameraPosition('z', parseFloat(e.target.value))}
                  style={sliderStyle}
                  title={`Camera Z position: ${cameraPosition.z}`}
                />
                <span style={sliderValueStyle}>{cameraPosition.z}</span>
              </div>
            </div>

            <div style={sliderGroupStyle}>
              <div style={sliderLabelStyle}>
                🔁 Rotation (°)
              </div>
              <div style={controlRowStyle}>
                <span style={{ width: '20px' }}>X</span>
                <input
                  type="range"
                  min="-180"
                  max="180"
                  step="1"
                  value={cameraRotation.x}
                  onChange={(e) => updateCameraRotation('x', parseFloat(e.target.value))}
                  style={sliderStyle}
                  title={`Camera X rotation: ${cameraRotation.x}°`}
                />
                <span style={sliderValueStyle}>{cameraRotation.x}°</span>
              </div>
              <div style={controlRowStyle}>
                <span style={{ width: '20px' }}>Y</span>
                <input
                  type="range"
                  min="-180"
                  max="180"
                  step="1"
                  value={cameraRotation.y}
                  onChange={(e) => updateCameraRotation('y', parseFloat(e.target.value))}
                  style={sliderStyle}
                  title={`Camera Y rotation: ${cameraRotation.y}°`}
                />
                <span style={sliderValueStyle}>{cameraRotation.y}°</span>
              </div>
              <div style={controlRowStyle}>
                <span style={{ width: '20px' }}>Z</span>
                <input
                  type="range"
                  min="-180"
                  max="180"
                  step="1"
                  value={cameraRotation.z}
                  onChange={(e) => updateCameraRotation('z', parseFloat(e.target.value))}
                  style={sliderStyle}
                  title={`Camera Z rotation: ${cameraRotation.z}°`}
                />
                <span style={sliderValueStyle}>{cameraRotation.z}°</span>
              </div>
            </div>

            <div style={sliderGroupStyle}>
              <div style={controlRowStyle}>
                <span>📷 FOV</span>
                <input
                  type="range"
                  min="20"
                  max="120"
                  step="1"
                  value={cameraFov}
                  onChange={(e) => updateCameraFov(parseFloat(e.target.value))}
                  style={sliderStyle}
                  title={`Camera field of view: ${cameraFov}°`}
                />
                <span style={sliderValueStyle}>{cameraFov}°</span>
              </div>
            </div>
          </div>
        )}

        {/* Spotlight Controls Section */}
        {scene && spotlights.length > 0 && (
          <div style={{ marginBottom: '16px' }}>
            <h5 style={{
              margin: '0 0 8px 0',
              color: '#cccccc',
              borderBottom: '1px solid #444',
              paddingBottom: '4px',
            }}>
              💡 Spotlight Controls
            </h5>

            {spotlights.map((spotlight) => (
              <div key={spotlight.id} style={sliderGroupStyle}>
                <div style={sliderLabelStyle}>
                  🎯 {spotlight.name}
                </div>

                <div style={controlRowStyle}>
                  <span style={{ width: '50px' }}>Intensity</span>
                  <input
                    type="range"
                    min="0"
                    max="5"
                    step="0.1"
                    value={spotlight.intensity}
                    onChange={(e) => updateSpotlightIntensity(spotlight.id, parseFloat(e.target.value))}
                    style={sliderStyle}
                    title={`Spotlight intensity: ${spotlight.intensity}`}
                  />
                  <span style={sliderValueStyle}>{spotlight.intensity}</span>
                </div>

                <div style={controlRowStyle}>
                  <span style={{ width: '50px' }}>Angle</span>
                  <input
                    type="range"
                    min="1"
                    max="90"
                    step="1"
                    value={spotlight.angle}
                    onChange={(e) => updateSpotlightAngle(spotlight.id, parseFloat(e.target.value))}
                    style={sliderStyle}
                    title={`Spotlight cone angle: ${spotlight.angle}°`}
                  />
                  <span style={sliderValueStyle}>{spotlight.angle}°</span>
                </div>
              </div>
            ))}

            <div style={{ ...controlRowStyle, marginTop: '8px' }}>
              <button
                style={buttonStyle}
                onClick={() => {
                  spotlights.forEach(spot => {
                    updateSpotlightIntensity(spot.id, spotlights.find(s => s.id === spot.id)?.intensity || 1.0);
                    updateSpotlightAngle(spot.id, spotlights.find(s => s.id === spot.id)?.angle || 30);
                  });
                  window.console.log('🔄 Spotlight shadows refreshed');
                }}
              >
                🔄 Refresh Shadows
              </button>
            </div>
          </div>
        )}

        <div style={{ 
          marginTop: '16px', 
          paddingTop: '8px',
          borderTop: '1px solid #444',
          fontSize: '10px',
          color: '#999',
        }}>
          💡 Tip: Use URL params like ?debug&overlay&logs for quick access
        </div>
      </div>
    </>
  );
};