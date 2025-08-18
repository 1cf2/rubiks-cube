import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';

const container = document.getElementById('root');

if (!container) {
  throw new Error('Root container not found');
}

const root = createRoot(container);

// Remove loading screen
const loadingScreen = document.getElementById('loading-screen');
if (loadingScreen) {
  loadingScreen.remove();
}

root.render(<App />);