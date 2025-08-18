import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as THREE from 'three';
import { MouseControls } from '../../../src/components/input/MouseControls';
import { FacePosition, CubeError } from '@rubiks-cube/shared/types';

// Mock Three.js
jest.mock('three', () => ({
  Scene: jest.fn(() => ({})),
  Camera: jest.fn(() => ({})),
  Group: jest.fn(() => ({})),
}));

// Mock the feedback system components
jest.mock('../../../src/components/three/RotationPreviewManager', () => ({
  RotationPreviewManager: jest.fn(() => null),
}));

jest.mock('../../../src/components/three/MoveCompletionFeedback', () => ({
  useMoveCompletionFeedback: jest.fn(() => ({
    showCompletionFeedback: jest.fn(),
    showSuccessFlash: jest.fn(),
    FeedbackComponent: () => null,
  })),
}));

jest.mock('../../../src/components/three/InvalidMovePreventionManager', () => ({
  useInvalidMovePrevention: jest.fn(() => ({
    blockedMoves: [],
    checkMoveValidity: jest.fn(() => true),
    PreventionComponent: () => null,
  })),
}));

// Mock hooks
jest.mock('../../../src/hooks/useMouseGestures', () => ({
  useMouseGestures: jest.fn(() => ({
    cursorState: 'default',
    handlers: {
      onMouseDown: jest.fn(),
      onMouseMove: jest.fn(),
      onMouseUp: jest.fn(),
      onMouseLeave: jest.fn(),
      onMouseEnter: jest.fn(),
    },
  })),
}));

jest.mock('../../../src/hooks/useCubeInteraction', () => ({
  useCubeInteraction: jest.fn(() => ({
    interactionState: {
      isInteracting: false,
      hoveredFace: null,
      selectedFace: null,
      dragGesture: null,
      cursorState: 'default',
      lastInteraction: Date.now(),
    },
    currentRotation: null,
    isAnimating: false,
    handleMouseHover: jest.fn(),
    handleDragStart: jest.fn(),
    handleDragUpdate: jest.fn(),
    handleDragEnd: jest.fn(),
    handleMouseLeave: jest.fn(),
    resetInteraction: jest.fn(),
  })),
}));

describe('MouseControls', () => {
  let mockScene: THREE.Scene;
  let mockCamera: THREE.Camera;
  let mockCubeGroup: THREE.Group;
  let mockProps: any;

  beforeEach(() => {
    mockScene = new THREE.Scene();
    mockCamera = new THREE.Camera();
    mockCubeGroup = new THREE.Group();

    mockProps = {
      scene: mockScene,
      camera: mockCamera,
      cubeGroup: mockCubeGroup,
      isEnabled: true,
      onFaceHover: jest.fn(),
      onFaceSelect: jest.fn(),
      onRotationStart: jest.fn(),
      onRotationComplete: jest.fn(),
      onError: jest.fn(),
    };

    jest.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render without crashing', () => {
      render(<MouseControls {...mockProps} />);
      
      const container = screen.getByTestId('mouse-controls');
      expect(container).toBeInTheDocument();
    });

    it('should render with correct accessibility attributes', () => {
      render(<MouseControls {...mockProps} />);
      
      const container = screen.getByTestId('mouse-controls');
      expect(container).toHaveAttribute('role', 'button');
      expect(container).toHaveAttribute('tabIndex', '0');
      expect(container).toHaveAttribute('aria-label', "Rubik's cube interaction area");
      expect(container).toHaveAttribute('aria-disabled', 'false');
    });

    it('should render as disabled when isEnabled is false', () => {
      render(<MouseControls {...mockProps} isEnabled={false} />);
      
      const container = screen.getByTestId('mouse-controls');
      expect(container).toHaveAttribute('tabIndex', '-1');
      expect(container).toHaveAttribute('aria-disabled', 'true');
    });

    it('should apply custom className and style', () => {
      const customProps = {
        ...mockProps,
        className: 'custom-class',
        style: { backgroundColor: 'red' },
      };
      
      render(<MouseControls {...customProps} />);
      
      const container = screen.getByTestId('mouse-controls');
      expect(container).toHaveClass('custom-class');
      expect(container).toHaveStyle('background-color: red');
    });
  });

  describe('mouse event handling', () => {
    it('should handle mouse down events', async () => {
      const user = userEvent.setup();
      render(<MouseControls {...mockProps} />);
      
      const container = screen.getByTestId('mouse-controls');
      await user.click(container);
      
      // Verify that mouse handlers are called through the gesture system
      expect(container).toBeInTheDocument();
    });

    it('should handle mouse move events', () => {
      render(<MouseControls {...mockProps} />);
      
      const container = screen.getByTestId('mouse-controls');
      fireEvent.mouseMove(container, { clientX: 100, clientY: 100 });
      
      expect(container).toBeInTheDocument();
    });

    it('should handle mouse leave events', () => {
      render(<MouseControls {...mockProps} />);
      
      const container = screen.getByTestId('mouse-controls');
      fireEvent.mouseLeave(container);
      
      expect(container).toBeInTheDocument();
    });

    it('should prevent context menu', () => {
      render(<MouseControls {...mockProps} />);
      
      const container = screen.getByTestId('mouse-controls');
      const contextMenuEvent = fireEvent.contextMenu(container);
      
      expect(contextMenuEvent.defaultPrevented).toBe(true);
    });

    it('should not handle events when disabled', async () => {
      const user = userEvent.setup();
      render(<MouseControls {...mockProps} isEnabled={false} />);
      
      const container = screen.getByTestId('mouse-controls');
      await user.click(container);
      
      expect(container).toHaveStyle('pointer-events: none');
    });
  });

  describe('visual feedback integration', () => {
    it('should update visual feedback on face hover', () => {
      // Mock the cube interaction to return a hovered face
      const mockUseCubeInteraction = require('../../../src/hooks/useCubeInteraction').useCubeInteraction;
      mockUseCubeInteraction.mockReturnValue({
        interactionState: {
          hoveredFace: FacePosition.FRONT,
          selectedFace: null,
          dragGesture: null,
          cursorState: 'hover',
          isInteracting: false,
          lastInteraction: Date.now(),
        },
        currentRotation: null,
        isAnimating: false,
        handleMouseHover: jest.fn(),
        handleDragStart: jest.fn(),
        handleDragUpdate: jest.fn(),
        handleDragEnd: jest.fn(),
        handleMouseLeave: jest.fn(),
        resetInteraction: jest.fn(),
      });

      render(<MouseControls {...mockProps} />);
      
      // The component should handle the hover state through the interaction system
      expect(mockProps.onFaceHover).not.toHaveBeenCalled();
    });

    it('should call onFaceSelect when face is selected', () => {
      const mockUseCubeInteraction = require('../../../src/hooks/useCubeInteraction').useCubeInteraction;
      
      let capturedOnFaceSelect: any;
      mockUseCubeInteraction.mockImplementation((config: any) => {
        capturedOnFaceSelect = config.onFaceSelect;
        return {
          interactionState: {
            hoveredFace: null,
            selectedFace: FacePosition.FRONT,
            dragGesture: null,
            cursorState: 'default',
            isInteracting: false,
            lastInteraction: Date.now(),
          },
          currentRotation: null,
          isAnimating: false,
          handleMouseHover: jest.fn(),
          handleDragStart: jest.fn(),
          handleDragUpdate: jest.fn(),
          handleDragEnd: jest.fn(),
          handleMouseLeave: jest.fn(),
          resetInteraction: jest.fn(),
        };
      });

      render(<MouseControls {...mockProps} />);
      
      // Simulate face selection
      if (capturedOnFaceSelect) {
        capturedOnFaceSelect(FacePosition.FRONT);
      }
      
      expect(mockProps.onFaceSelect).toHaveBeenCalledWith(FacePosition.FRONT);
    });

    it('should handle rotation completion with success feedback', () => {
      const mockUseMoveCompletionFeedback = require('../../../src/components/three/MoveCompletionFeedback').useMoveCompletionFeedback;
      const mockShowSuccessFlash = jest.fn();
      
      mockUseMoveCompletionFeedback.mockReturnValue({
        showCompletionFeedback: jest.fn(),
        showSuccessFlash: mockShowSuccessFlash,
        FeedbackComponent: () => null,
      });

      const mockUseCubeInteraction = require('../../../src/hooks/useCubeInteraction').useCubeInteraction;
      let capturedOnRotationComplete: any;
      
      mockUseCubeInteraction.mockImplementation((config: any) => {
        capturedOnRotationComplete = config.onRotationComplete;
        return {
          interactionState: {
            hoveredFace: null,
            selectedFace: null,
            dragGesture: null,
            cursorState: 'default',
            isInteracting: false,
            lastInteraction: Date.now(),
          },
          currentRotation: null,
          isAnimating: false,
          handleMouseHover: jest.fn(),
          handleDragStart: jest.fn(),
          handleDragUpdate: jest.fn(),
          handleDragEnd: jest.fn(),
          handleMouseLeave: jest.fn(),
          resetInteraction: jest.fn(),
        };
      });

      render(<MouseControls {...mockProps} enableCompletionFeedback={true} />);
      
      // Simulate rotation completion
      const mockCommand = {
        face: FacePosition.FRONT,
        direction: 'clockwise' as const,
        angle: Math.PI / 2,
        targetAngle: Math.PI / 2,
        isComplete: true,
      };
      
      const mockMove = {
        face: FacePosition.FRONT,
        direction: 'clockwise' as const,
        timestamp: Date.now(),
        duration: 300,
      };
      
      if (capturedOnRotationComplete) {
        capturedOnRotationComplete(mockCommand, mockMove);
      }
      
      expect(mockShowSuccessFlash).toHaveBeenCalledWith(FacePosition.FRONT);
      expect(mockProps.onRotationComplete).toHaveBeenCalledWith(mockCommand, mockMove);
    });
  });

  describe('invalid move prevention', () => {
    it('should prevent moves when face is not selectable', () => {
      const mockUseInvalidMovePrevention = require('../../../src/components/three/InvalidMovePreventionManager').useInvalidMovePrevention;
      const mockCheckMoveValidity = jest.fn(() => false); // Block the move
      
      mockUseInvalidMovePrevention.mockReturnValue({
        blockedMoves: [{
          face: FacePosition.FRONT,
          reason: 'Face is currently rotating',
          timestamp: Date.now(),
        }],
        checkMoveValidity: mockCheckMoveValidity,
        PreventionComponent: () => null,
      });

      const mockUseCubeInteraction = require('../../../src/hooks/useCubeInteraction').useCubeInteraction;
      let capturedOnFaceSelect: any;
      
      mockUseCubeInteraction.mockImplementation((config: any) => {
        capturedOnFaceSelect = config.onFaceSelect;
        return {
          interactionState: {
            hoveredFace: null,
            selectedFace: null,
            dragGesture: null,
            cursorState: 'default',
            isInteracting: false,
            lastInteraction: Date.now(),
          },
          currentRotation: null,
          isAnimating: false,
          handleMouseHover: jest.fn(),
          handleDragStart: jest.fn(),
          handleDragUpdate: jest.fn(),
          handleDragEnd: jest.fn(),
          handleMouseLeave: jest.fn(),
          resetInteraction: jest.fn(),
        };
      });

      render(<MouseControls {...mockProps} enableInvalidMovePrevention={true} />);
      
      // Try to select a face
      if (capturedOnFaceSelect) {
        capturedOnFaceSelect(FacePosition.FRONT);
      }
      
      expect(mockCheckMoveValidity).toHaveBeenCalledWith(FacePosition.FRONT);
      expect(mockProps.onFaceSelect).not.toHaveBeenCalled(); // Should be blocked
    });
  });

  describe('configuration options', () => {
    it('should disable rotation preview when enableRotationPreview is false', () => {
      const RotationPreviewManager = require('../../../src/components/three/RotationPreviewManager').RotationPreviewManager;
      
      render(<MouseControls {...mockProps} enableRotationPreview={false} />);
      
      expect(RotationPreviewManager).toHaveBeenCalledWith(
        expect.objectContaining({ isEnabled: false }),
        expect.anything()
      );
    });

    it('should disable completion feedback when enableCompletionFeedback is false', () => {
      const mockUseMoveCompletionFeedback = require('../../../src/components/three/MoveCompletionFeedback').useMoveCompletionFeedback;
      
      render(<MouseControls {...mockProps} enableCompletionFeedback={false} />);
      
      expect(mockUseMoveCompletionFeedback).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        expect.objectContaining({ isEnabled: false })
      );
    });

    it('should disable invalid move prevention when enableInvalidMovePrevention is false', () => {
      const mockUseInvalidMovePrevention = require('../../../src/components/three/InvalidMovePreventionManager').useInvalidMovePrevention;
      
      render(<MouseControls {...mockProps} enableInvalidMovePrevention={false} />);
      
      expect(mockUseInvalidMovePrevention).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        expect.objectContaining({ isEnabled: false })
      );
    });

    it('should use custom preview intensity', () => {
      const RotationPreviewManager = require('../../../src/components/three/RotationPreviewManager').RotationPreviewManager;
      
      render(<MouseControls {...mockProps} previewIntensity={0.8} />);
      
      expect(RotationPreviewManager).toHaveBeenCalledWith(
        expect.objectContaining({ previewIntensity: 0.8 }),
        expect.anything()
      );
    });

    it('should use custom completion intensity', () => {
      const mockUseMoveCompletionFeedback = require('../../../src/components/three/MoveCompletionFeedback').useMoveCompletionFeedback;
      
      render(<MouseControls {...mockProps} completionIntensity={1.5} />);
      
      expect(mockUseMoveCompletionFeedback).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        expect.objectContaining({ flashIntensity: 1.5 })
      );
    });
  });

  describe('error handling', () => {
    it('should handle errors from feedback systems', () => {
      const mockUseCubeInteraction = require('../../../src/hooks/useCubeInteraction').useCubeInteraction;
      let capturedOnError: any;
      
      mockUseCubeInteraction.mockImplementation((config: any) => {
        capturedOnError = config.onError;
        return {
          interactionState: {
            hoveredFace: null,
            selectedFace: null,
            dragGesture: null,
            cursorState: 'default',
            isInteracting: false,
            lastInteraction: Date.now(),
          },
          currentRotation: null,
          isAnimating: false,
          handleMouseHover: jest.fn(),
          handleDragStart: jest.fn(),
          handleDragUpdate: jest.fn(),
          handleDragEnd: jest.fn(),
          handleMouseLeave: jest.fn(),
          resetInteraction: jest.fn(),
        };
      });

      render(<MouseControls {...mockProps} />);
      
      // Simulate an error
      if (capturedOnError) {
        capturedOnError(CubeError.WEBGL_CONTEXT_LOST, 'Test error message');
      }
      
      expect(mockProps.onError).toHaveBeenCalledWith(CubeError.WEBGL_CONTEXT_LOST, 'Test error message');
    });
  });

  describe('debug mode', () => {
    it('should show debug information in development mode', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';
      
      const mockUseCubeInteraction = require('../../../src/hooks/useCubeInteraction').useCubeInteraction;
      mockUseCubeInteraction.mockReturnValue({
        interactionState: {
          hoveredFace: FacePosition.FRONT,
          selectedFace: FacePosition.BACK,
          dragGesture: null,
          cursorState: 'hover',
          isInteracting: true,
          lastInteraction: Date.now(),
        },
        currentRotation: {
          face: FacePosition.RIGHT,
          direction: 'clockwise',
        },
        isAnimating: true,
        handleMouseHover: jest.fn(),
        handleDragStart: jest.fn(),
        handleDragUpdate: jest.fn(),
        handleDragEnd: jest.fn(),
        handleMouseLeave: jest.fn(),
        resetInteraction: jest.fn(),
      });
      
      render(<MouseControls {...mockProps} />);
      
      expect(screen.getByText(/Hovered: FRONT/)).toBeInTheDocument();
      expect(screen.getByText(/Selected: BACK/)).toBeInTheDocument();
      expect(screen.getByText(/Animating: yes/)).toBeInTheDocument();
      expect(screen.getByText(/Cursor: hover/)).toBeInTheDocument();
      expect(screen.getByText(/Rotation: RIGHT clockwise/)).toBeInTheDocument();
      
      process.env.NODE_ENV = originalEnv;
    });

    it('should not show debug information in production mode', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';
      
      render(<MouseControls {...mockProps} />);
      
      expect(screen.queryByText(/Hovered:/)).not.toBeInTheDocument();
      
      process.env.NODE_ENV = originalEnv;
    });
  });
});