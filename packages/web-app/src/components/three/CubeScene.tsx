import React from 'react';
import { ThreeScene, useThreeContext } from './ThreeScene';
import { CubeRenderer } from './CubeRenderer';
import { ThreeJSErrorBoundary } from './ErrorBoundary';

const CubeSceneContent: React.FC = () => {
  const { scene } = useThreeContext();

  if (!scene) {
    return null;
  }

  return (
    <CubeRenderer scene={scene} isAnimating={true} />
  );
};

export const CubeScene: React.FC = () => {
  return (
    <ThreeJSErrorBoundary>
      <ThreeScene>
        <CubeSceneContent />
      </ThreeScene>
    </ThreeJSErrorBoundary>
  );
};