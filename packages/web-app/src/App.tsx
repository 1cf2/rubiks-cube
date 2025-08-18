import React, { Suspense } from 'react';
import { LoadingIndicator } from './components/three/LoadingIndicator';

// Lazy load the CubeScene component to defer Three.js loading
const CubeScene = React.lazy(() => import('./components/three/CubeScene').then(module => ({
  default: module.CubeScene
})));

const App: React.FC = () => {
  return (
    <Suspense fallback={<LoadingIndicator message="Loading 3D Scene..." />}>
      <CubeScene />
    </Suspense>
  );
};

export default App;