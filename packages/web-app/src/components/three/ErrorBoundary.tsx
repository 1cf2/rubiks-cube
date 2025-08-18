import React, { Component, ReactNode } from 'react';

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: string | null;
}

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

export class ThreeJSErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error
    };
  }

  override componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.setState({
      error,
      errorInfo: errorInfo.componentStack || null
    });

    // Log error for monitoring
    console.error('Three.js Component Error:', error);
    console.error('Error Info:', errorInfo);
  }

  handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    });
  };

  override render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh',
          backgroundColor: '#f8f8f8',
          color: '#333',
          fontFamily: 'Arial, sans-serif',
          padding: '20px',
          textAlign: 'center'
        }}>
          <div style={{
            maxWidth: '500px',
            backgroundColor: 'white',
            padding: '30px',
            borderRadius: '8px',
            boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
          }}>
            <h2 style={{ 
              color: '#d32f2f', 
              marginBottom: '16px',
              fontSize: '24px'
            }}>
              ⚠️ 3D Rendering Error
            </h2>
            
            <p style={{ 
              marginBottom: '16px',
              lineHeight: '1.5',
              color: '#666'
            }}>
              There was an error rendering the 3D scene. This could be due to:
            </p>
            
            <ul style={{
              textAlign: 'left',
              color: '#666',
              marginBottom: '24px',
              lineHeight: '1.5'
            }}>
              <li>WebGL compatibility issues</li>
              <li>Graphics driver problems</li>
              <li>Insufficient system resources</li>
              <li>Browser limitations</li>
            </ul>

            <div style={{ marginBottom: '24px' }}>
              <button
                onClick={this.handleRetry}
                style={{
                  backgroundColor: '#4CAF50',
                  color: 'white',
                  border: 'none',
                  padding: '12px 24px',
                  borderRadius: '4px',
                  fontSize: '16px',
                  cursor: 'pointer',
                  marginRight: '12px'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.backgroundColor = '#45a049';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.backgroundColor = '#4CAF50';
                }}
              >
                🔄 Try Again
              </button>
              
              <button
                onClick={() => window.location.reload()}
                style={{
                  backgroundColor: '#2196F3',
                  color: 'white',
                  border: 'none',
                  padding: '12px 24px',
                  borderRadius: '4px',
                  fontSize: '16px',
                  cursor: 'pointer'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.backgroundColor = '#1976D2';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.backgroundColor = '#2196F3';
                }}
              >
                🔄 Reload Page
              </button>
            </div>

            {process.env['NODE_ENV'] === 'development' && this.state.error && (
              <details style={{
                marginTop: '20px',
                textAlign: 'left',
                backgroundColor: '#f5f5f5',
                padding: '12px',
                borderRadius: '4px',
                fontSize: '12px',
                color: '#666'
              }}>
                <summary style={{ cursor: 'pointer', fontWeight: 'bold' }}>
                  Error Details (Development)
                </summary>
                <pre style={{
                  marginTop: '8px',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word'
                }}>
                  {this.state.error.toString()}
                  {this.state.errorInfo}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}