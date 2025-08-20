import React, { useState, useEffect } from 'react';
import { featureFlags, FeatureFlags } from '../../utils/featureFlags';

interface DebugControlsProps {
  isVisible?: boolean;
}

export const DebugControls: React.FC<DebugControlsProps> = ({ isVisible = false }) => {
  const [flags, setFlags] = useState<FeatureFlags>(featureFlags.getAllFlags());
  const [showControls, setShowControls] = useState(isVisible);

  useEffect(() => {
    // Update local state when flags change
    const updateFlags = () => setFlags(featureFlags.getAllFlags());
    
    // Listen for flag changes (if we want real-time updates)
    const interval = setInterval(updateFlags, 1000);
    return () => clearInterval(interval);
  }, []);

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