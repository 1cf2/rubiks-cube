// MouseControls with Live Rotation Preview Enhancement
// This version adds visual preview of rotation direction during drag gestures

import React, { useEffect, useRef, useCallback, useState } from 'react';
import * as THREE from 'three';
import { RotationDirection } from '@rubiks-cube/shared/types';

interface RotationPreviewInfo {
  isActive: boolean;
  previewFace: string;
  previewDirection: RotationDirection;
  previewLayers: number;
  willRotate: boolean;
}

export const MouseControlsWithRotationPreview: React.FC = () => {
  // ... existing MouseControls setup ...

  const [currentRotationPreview, setCurrentRotationPreview] = useState<RotationPreviewInfo | null>(null);

  return (
    <div className="mouse-controls-container">
      {/* Existing cube controls and overlays */}

      {/* LIVE ROTATION PREVIEW PANEL */}
      {currentRotationPreview?.isActive && (
        <div
          style={{
            position: 'fixed',
            bottom: '20px',
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'linear-gradient(135deg, rgba(0,0,0,0.9), rgba(0,0,0,0.7))',
            color: 'white',
            padding: '16px 24px',
            borderRadius: '12px',
            fontFamily: 'Arial, sans-serif',
            fontSize: '16px',
            fontWeight: 'bold',
            textAlign: 'center',
            boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
            border: '2px solid rgba(255,255,255,0.1)',
            backdropFilter: 'blur(10px)',
            animation: 'slideUp 0.2s ease-out'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px' }}>
            {/* Animated rotation indicator */}
            <div
              style={{
                fontSize: '24px',
                animation: 'spin 0.5s ease-in-out',
                color: currentRotationPreview.previewDirection === RotationDirection.CLOCKWISE ? '#4CAF50' : '#FF9800'
              }}
            >
              {currentRotationPreview.previewDirection === RotationDirection.CLOCKWISE ? '↻' : '↺'}
            </div>

            {/* Main preview text */}
            <div style={{ lineHeight: '1.4' }}>
              <div style={{ fontSize: '18px', marginBottom: '4px' }}>
                🎯 Ready to Rotate!
              </div>
              <div style={{ fontSize: '14px', color: '#ccc', fontWeight: 'normal' }}>
                <span style={{ marginRight: '8px' }}>
                  Layer: {currentRotationPreview.previewFace.toUpperCase()}
                </span>
                <span style={{ color: '#4CAF50', fontWeight: 'bold' }}>
                  {currentRotationPreview.previewDirection === RotationDirection.CLOCKWISE ? 'CLOCKWISE' : 'COUNTER-CLOCKWISE'}
                </span>
              </div>
              {currentRotationPreview.previewLayers > 1 && (
                <div style={{ fontSize: '12px', color: '#fff', fontWeight: 'bold', marginTop: '4px' }}>
                  {currentRotationPreview.previewLayers} pieces will rotate together
                </div>
              )}
            </div>

            {/* Release indicator */}
            <div style={{
              fontSize: '12px',
              color: '#888',
              marginTop: '8px',
              animation: 'pulse 1s ease-in-out infinite'
            }}>
              ▲ Release mouse to rotate ▲
            </div>
          </div>
        </div>
      )}

      {/* Success notification after rotation */}
      {currentRotationPreview?.willRotate && (
        <div
          style={{
            position: 'fixed',
            top: '20px',
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'rgba(76, 175, 80, 0.9)',
            color: 'white',
            padding: '12px 24px',
            borderRadius: '8px',
            fontSize: '14px',
            fontWeight: 'bold',
            boxShadow: '0 4px 16px rgba(76,175,80,0.3)',
            animation: 'slideDown 0.3s ease-out',
            zIndex: 10000
          }}
        >
          ✅ {currentRotationPreview.previewFace.toUpperCase()} face rotated {currentRotationPreview.previewDirection}!
        </div>
      )}

      <style jsx>{`
        @keyframes slideUp {
          from {
            transform: translateX(-50%) translateY(20px);
            opacity: 0;
          }
          to {
            transform: translateX(-50%) translateY(0);
            opacity: 1;
          }
        }

        @keyframes slideDown {
          from {
            transform: translateX(-50%) translateY(-20px);
            opacity: 0;
          }
          to {
            transform: translateX(-50%) translateY(0);
            opacity: 1;
          }
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          50% { transform: rotate(180deg); color: #88cc00; }
          100% { transform: rotate(360deg); }
        }

        @keyframes pulse {
          0%, 100% {
            opacity: 0.6;
          }
          50% {
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
};

// Helper function to update rotation preview state
export function updateRotationPreviewState(
  face: string,
  direction: RotationDirection,
  layerCount: number,
  dragResult: any
): RotationPreviewInfo {

  return {
    isActive: true,
    previewFace: face,
    previewDirection: direction,
    previewLayers: layerCount,
    willRotate: dragResult?.canRotate || false
  };
}

// Integration example for handleDragUpdate
export function handleDragUpdateWithPreview(
  traditionalDragHandler: () => any,
  setRotationPreview: (preview: RotationPreviewInfo | null) => void,
  isFaceToFaceEnabled: boolean
): any {

  if (!isFaceToFaceEnabled) {
    return traditionalDragHandler();
  }

  // Get traditional drag result
  const traditionalResult = traditionalDragHandler();

  // Enhanced with rotation preview
  if (traditionalResult?.data?.canRotate) {
    const previewInfo = updateRotationPreviewState(
      traditionalResult.data.rotationCommand?.face || 'unknown',
      traditionalResult.data.rotationCommand?.direction || RotationDirection.CLOCKWISE,
      9, // Standard Rubik's cube face has 9 pieces
      traditionalResult.data
    );

    setRotationPreview(previewInfo);

    // Add visual arrows if needed (implementation detail)
    createRotationDirectionArrows(previewInfo, scene);

    return traditionalResult;
  } else {
    setRotationPreview(null); // Clear preview if no valid rotation
    return traditionalResult;
  }
}

// Create visual arrows indicating rotation direction
function createRotationDirectionArrows(previewInfo: RotationPreviewInfo, scene: THREE.Scene): THREE.Group[] {
  const arrowGroups: THREE.Group[] = [];
  const arrowMaterial = new THREE.MeshBasicMaterial({
    color: previewInfo.previewDirection === RotationDirection.CLOCKWISE ? 0x00ff00 : 0xff8800,
    transparent: true,
    opacity: 0.7
  });

  // Create arrows for visual feedback
  for (let i = 0; i < previewInfo.previewLayers; i++) {
    const arrowGeometry = new THREE.ConeGeometry(0.1, 0.3, 8);
    const arrow = new THREE.Mesh(arrowGeometry, arrowMaterial);

    // Position arrow appropriately (this would be customized based on your scene setup)
    arrow.position.set(0, 1, 0);
    arrowGroups.push(arrow);
  }

  return arrowGroups;
}