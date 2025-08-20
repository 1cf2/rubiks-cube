import React from 'react';
import { DragGesture, CursorState, FacePosition } from '@rubiks-cube/shared/types';

interface DebugOverlayProps {
  isDragging: boolean;
  currentGesture: DragGesture | null;
  cursorState: CursorState;
  hoveredFace: FacePosition | null;
  selectedFace: FacePosition | null;
  isEnabled?: boolean;
}

export const DebugOverlay: React.FC<DebugOverlayProps> = ({
  isDragging,
  currentGesture,
  cursorState,
  hoveredFace,
  selectedFace,
  isEnabled = false,
}) => {
  if (!isEnabled) return null;

  const overlayStyle: React.CSSProperties = {
    position: 'fixed',
    top: 10,
    left: 10,
    padding: '10px',
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    color: 'white',
    fontFamily: 'monospace',
    fontSize: '12px',
    borderRadius: '4px',
    zIndex: 10000,
    minWidth: '200px',
  };

  const statusStyle: React.CSSProperties = {
    marginBottom: '4px',
    display: 'flex',
    justifyContent: 'space-between',
  };

  const indicatorStyle = (active: boolean): React.CSSProperties => ({
    display: 'inline-block',
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    backgroundColor: active ? '#00ff00' : '#ff0000',
    marginRight: '8px',
  });

  return (
    <div style={overlayStyle}>
      <h4 style={{ margin: '0 0 8px 0', color: '#ffff00' }}>🐛 Mouse Gesture Debug</h4>
      
      <div style={statusStyle}>
        <span>
          <span style={indicatorStyle(isDragging)}></span>
          Dragging:
        </span>
        <span>{isDragging ? 'YES' : 'NO'}</span>
      </div>

      <div style={statusStyle}>
        <span>Cursor State:</span>
        <span>{cursorState}</span>
      </div>

      <div style={statusStyle}>
        <span>Hovered Face:</span>
        <span>{hoveredFace || 'None'}</span>
      </div>

      <div style={statusStyle}>
        <span>Selected Face:</span>
        <span>{selectedFace || 'None'}</span>
      </div>

      {currentGesture && (
        <>
          <hr style={{ margin: '8px 0', border: '1px solid #333' }} />
          <div style={statusStyle}>
            <span>Gesture Active:</span>
            <span>{currentGesture.isActive ? 'YES' : 'NO'}</span>
          </div>
          
          <div style={statusStyle}>
            <span>Duration:</span>
            <span>{Math.round(currentGesture.duration)}ms</span>
          </div>
          
          <div style={statusStyle}>
            <span>Delta X:</span>
            <span>{Math.round(currentGesture.delta.deltaX)}px</span>
          </div>
          
          <div style={statusStyle}>
            <span>Delta Y:</span>
            <span>{Math.round(currentGesture.delta.deltaY)}px</span>
          </div>
          
          <div style={statusStyle}>
            <span>Distance:</span>
            <span>{Math.round(Math.sqrt(
              currentGesture.delta.deltaX ** 2 + currentGesture.delta.deltaY ** 2
            ))}px</span>
          </div>
        </>
      )}
    </div>
  );
};