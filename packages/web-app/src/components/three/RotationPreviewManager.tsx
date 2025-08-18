import React, { useEffect, useRef, useCallback } from 'react';
import * as THREE from 'three';
import { 
  FacePosition, 
  RotationDirection, 
  DragGesture,
  CubeError 
} from '@rubiks-cube/shared/types';
import { RotationPreview, ArrowPreview } from '@rubiks-cube/three-renderer';

export interface RotationPreviewManagerProps {
  scene: THREE.Scene | null;
  cubeGroup: THREE.Group | null;
  hoveredFace: FacePosition | null;
  currentDrag: DragGesture | null;
  isEnabled?: boolean;
  previewIntensity?: number;
  onError?: (error: CubeError, message?: string) => void;
}

export const RotationPreviewManager: React.FC<RotationPreviewManagerProps> = ({
  scene,
  cubeGroup,
  hoveredFace,
  currentDrag,
  isEnabled = true,
  previewIntensity = 0.6,
  onError,
}) => {
  const rotationPreviewRef = useRef<RotationPreview | null>(null);
  const currentPreviewsRef = useRef<Set<string>>(new Set());

  // Initialize rotation preview system
  useEffect(() => {
    if (!scene || !cubeGroup || !isEnabled) {
      if (rotationPreviewRef.current) {
        rotationPreviewRef.current.dispose();
        rotationPreviewRef.current = null;
      }
      return;
    }

    try {
      rotationPreviewRef.current = new RotationPreview({
        scene,
        cubeGroup,
        arrowSize: 0.25,
        arrowColor: new THREE.Color(0xffffff),
        opacity: previewIntensity,
        animationDuration: 150,
      });
    } catch (error) {
      onError?.(CubeError.WEBGL_CONTEXT_LOST, 'Failed to initialize rotation preview');
      console.error('Failed to initialize rotation preview:', error);
    }

    return () => {
      if (rotationPreviewRef.current) {
        rotationPreviewRef.current.dispose();
        rotationPreviewRef.current = null;
      }
    };
  }, [scene, cubeGroup, isEnabled, previewIntensity, onError]);

  // Clear all active previews
  const clearAllPreviews = useCallback(() => {
    if (!rotationPreviewRef.current) return;
    
    rotationPreviewRef.current.hideAllPreviews();
    currentPreviewsRef.current.clear();
  }, []);

  // Show preview for a specific face and direction
  const showPreview = useCallback((
    face: FacePosition, 
    direction: RotationDirection,
    options: { pulse?: boolean; opacity?: number } = {}
  ) => {
    if (!rotationPreviewRef.current || !isEnabled) return;
    
    const key = `${face}-${direction}`;
    
    // Don't show if already showing
    if (currentPreviewsRef.current.has(key)) return;
    
    const preview: ArrowPreview = {
      face,
      direction,
      opacity: options.opacity ?? previewIntensity,
      pulse: options.pulse ?? false,
    };
    
    const result = rotationPreviewRef.current.showPreview(preview);
    
    if (result.success) {
      currentPreviewsRef.current.add(key);
    } else {
      onError?.(result.error, result.message);
    }
  }, [isEnabled, previewIntensity, onError]);


  // Handle hover state - show subtle preview arrows
  useEffect(() => {
    if (!hoveredFace || !isEnabled) {
      clearAllPreviews();
      return;
    }

    // Clear previous previews
    clearAllPreviews();
    
    // Show subtle previews for both rotation directions
    showPreview(hoveredFace, RotationDirection.CLOCKWISE, { 
      opacity: previewIntensity * 0.3,
      pulse: false 
    });
    showPreview(hoveredFace, RotationDirection.COUNTERCLOCKWISE, { 
      opacity: previewIntensity * 0.3,
      pulse: false 
    });
  }, [hoveredFace, isEnabled, previewIntensity, showPreview, clearAllPreviews]);

  // Handle drag gesture - show directional preview
  useEffect(() => {
    if (!currentDrag || !isEnabled || !currentDrag.isActive) {
      // If drag ended, show hover previews if still hovering
      if (hoveredFace && isEnabled) {
        clearAllPreviews();
        showPreview(hoveredFace, RotationDirection.CLOCKWISE, { 
          opacity: previewIntensity * 0.3,
          pulse: false 
        });
        showPreview(hoveredFace, RotationDirection.COUNTERCLOCKWISE, { 
          opacity: previewIntensity * 0.3,
          pulse: false 
        });
      }
      return;
    }

    // Determine rotation direction from drag
    if (!hoveredFace) return;
    
    const dragVector = {
      x: currentDrag.delta.deltaX,
      y: currentDrag.delta.deltaY,
    };
    
    const direction = RotationPreview.getRotationDirectionFromDrag(hoveredFace, dragVector);
    
    if (direction) {
      // Clear all previews and show strong directional preview
      clearAllPreviews();
      showPreview(hoveredFace, direction, { 
        opacity: previewIntensity * 0.8,
        pulse: true 
      });
    }
  }, [currentDrag, hoveredFace, isEnabled, previewIntensity, showPreview, clearAllPreviews]);

  // Cleanup on disabled or unmount
  useEffect(() => {
    if (!isEnabled) {
      clearAllPreviews();
    }
  }, [isEnabled, clearAllPreviews]);

  return null; // This component doesn't render anything visible
};

export default RotationPreviewManager;