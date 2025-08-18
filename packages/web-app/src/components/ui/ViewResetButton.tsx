import React, { useState } from 'react';

interface ViewResetButtonProps {
  onReset: () => void;
  disabled?: boolean;
  className?: string;
  children?: React.ReactNode;
}

/**
 * ViewResetButton - Button component for resetting camera view to default position
 * Provides accessibility compliance and visual feedback
 */
export const ViewResetButton: React.FC<ViewResetButtonProps> = ({
  onReset,
  disabled = false,
  className = '',
  children
}) => {
  const [isPressed, setIsPressed] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);

  const handleClick = () => {
    if (disabled) return;
    
    setIsPressed(true);
    setShowFeedback(true);
    
    onReset();
    
    // Reset button state after animation
    setTimeout(() => {
      setIsPressed(false);
    }, 150);
    
    // Hide feedback after longer delay
    setTimeout(() => {
      setShowFeedback(false);
    }, 1000);
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if ((event.key === ' ' || event.key === 'Enter') && !disabled) {
      event.preventDefault();
      handleClick();
    }
  };

  const baseStyles: React.CSSProperties = {
    padding: '8px 16px',
    backgroundColor: disabled ? '#cccccc' : (isPressed ? '#0056b3' : '#007bff'),
    color: disabled ? '#666666' : '#ffffff',
    border: 'none',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: '500',
    cursor: disabled ? 'not-allowed' : 'pointer',
    transition: 'all 0.15s ease',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px',
    minWidth: '44px', // Accessibility compliance - minimum touch target
    minHeight: '44px',
    position: 'relative',
    outline: 'none',
    boxShadow: isPressed ? 'inset 0 2px 4px rgba(0,0,0,0.2)' : '0 2px 4px rgba(0,0,0,0.1)',
    transform: isPressed ? 'translateY(1px)' : 'translateY(0)',
  };

  const focusStyles: React.CSSProperties = {
    ...baseStyles,
    boxShadow: '0 0 0 3px rgba(0, 123, 255, 0.25)',
  };

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <button
        type="button"
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        className={className}
        style={baseStyles}
        onFocus={(e) => {
          Object.assign(e.target.style, focusStyles);
        }}
        onBlur={(e) => {
          Object.assign(e.target.style, baseStyles);
        }}
        onMouseEnter={(e) => {
          if (!disabled) {
            e.currentTarget.style.backgroundColor = '#0056b3';
          }
        }}
        onMouseLeave={(e) => {
          if (!disabled && !isPressed) {
            e.currentTarget.style.backgroundColor = '#007bff';
          }
        }}
        aria-label="Reset camera view to default position"
        title="Reset View (Spacebar or R)"
      >
        {children || (
          <>
            <svg 
              width="16" 
              height="16" 
              viewBox="0 0 16 16" 
              fill="currentColor"
              style={{ flexShrink: 0 }}
            >
              <path d="M8 3a5 5 0 1 0 4.546 2.914.5.5 0 0 1 .908-.417A6 6 0 1 1 8 2v1z"/>
              <path d="M8 4.466V.534a.25.25 0 0 1 .41-.192l2.36 1.966c.12.1.12.284 0 .384L8.41 4.658A.25.25 0 0 1 8 4.466z"/>
            </svg>
            Reset View
          </>
        )}
      </button>
      
      {/* Visual feedback for reset action completion */}
      {showFeedback && (
        <div
          style={{
            position: 'absolute',
            top: '-30px',
            left: '50%',
            transform: 'translateX(-50%)',
            backgroundColor: '#28a745',
            color: 'white',
            padding: '4px 8px',
            borderRadius: '4px',
            fontSize: '12px',
            whiteSpace: 'nowrap',
            pointerEvents: 'none',
            opacity: showFeedback ? 1 : 0,
            transition: 'opacity 0.3s ease',
            zIndex: 1000,
          }}
        >
          ✓ View Reset
        </div>
      )}
    </div>
  );
};

export default ViewResetButton;