import React from 'react';

interface LoadingIndicatorProps {
  progress?: number;
  message?: string;
}

export const LoadingIndicator: React.FC<LoadingIndicatorProps> = ({ 
  progress = 0, 
  message = 'Loading 3D Scene...' 
}) => {
  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      backgroundColor: '#f0f0f0',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
    }}>
      <div style={{
        textAlign: 'center',
        color: '#333',
        fontFamily: 'Arial, sans-serif',
      }}>
        <h2 style={{ 
          marginBottom: '20px',
          fontSize: '24px',
          fontWeight: '300'
        }}>
          🎯 Rubik's Cube 3D
        </h2>
        
        <div style={{
          marginBottom: '20px',
          fontSize: '16px',
          color: '#666'
        }}>
          {message}
        </div>

        {/* Loading bar */}
        <div style={{
          width: '200px',
          height: '4px',
          backgroundColor: '#ddd',
          borderRadius: '2px',
          overflow: 'hidden',
          marginBottom: '10px'
        }}>
          <div style={{
            width: `${progress}%`,
            height: '100%',
            backgroundColor: '#4CAF50',
            borderRadius: '2px',
            transition: 'width 0.3s ease',
          }} />
        </div>

        <div style={{
          fontSize: '12px',
          color: '#999'
        }}>
          {Math.round(progress)}% Complete
        </div>

        {/* Spinning cube animation */}
        <div style={{
          marginTop: '30px',
          width: '40px',
          height: '40px',
          border: '4px solid #ddd',
          borderTop: '4px solid #4CAF50',
          borderRadius: '4px',
          animation: 'spin 1s linear infinite',
          margin: '30px auto 0',
        }} />

        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    </div>
  );
};