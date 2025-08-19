import { 
  MoveHistoryManager, 
  HistoryConfiguration
} from '../../src/core/MoveHistoryManager';
import { CubeStateFactory } from '../../src/core/CubeState';
import { Move, CubeState, CubeError } from '../../src/types/CubeTypes';

describe('MoveHistoryManager', () => {
  let historyManager: MoveHistoryManager;
  let initialState: CubeState;

  beforeEach(() => {
    initialState = CubeStateFactory.createSolvedState();
    historyManager = new MoveHistoryManager(initialState);
  });

  describe('Initialization', () => {
    it('should initialize with initial state', () => {
      expect(historyManager.getCurrentState()).toBe(initialState);
      expect(historyManager.canUndo()).toBe(false); // Only initial state in stack
      expect(historyManager.canRedo()).toBe(false);
    });

    it('should accept custom configuration', () => {
      const config: Partial<HistoryConfiguration> = {
        maxHistorySize: 50,
        maxUndoSize: 25,
        autoCleanup: false,
      };

      const customManager = new MoveHistoryManager(initialState, config);
      expect(customManager.getCurrentState()).toBe(initialState);
    });
  });

  describe('executeMove', () => {
    it('should execute move and update history', () => {
      const move: Move = {
        face: 'front',
        direction: 'clockwise',
        timestamp: Date.now(),
        duration: 300,
      };

      const newState = {
        ...initialState,
        moveHistory: [move],
        timestamp: Date.now(),
      };

      const result = historyManager.executeMove(move, newState);

      expect(result.success).toBe(true);
      expect(historyManager.getCurrentState()).toBe(newState);
      expect(historyManager.canUndo()).toBe(true);
      expect(historyManager.canRedo()).toBe(false);
    });

    it('should clear redo stack on new move', () => {
      const move1: Move = {
        face: 'front',
        direction: 'clockwise',
        timestamp: Date.now(),
        duration: 300,
      };

      const state1 = {
        ...initialState,
        moveHistory: [move1],
        timestamp: Date.now(),
      };

      const move2: Move = {
        face: 'up',
        direction: 'counterclockwise',
        timestamp: Date.now() + 400,
        duration: 300,
      };

      const state2 = {
        ...state1,
        moveHistory: [move1, move2],
        timestamp: Date.now() + 400,
      };

      // Execute first move
      historyManager.executeMove(move1, state1);
      
      // Undo to enable redo
      historyManager.undo();
      expect(historyManager.canRedo()).toBe(true);

      // Execute second move - should clear redo stack
      historyManager.executeMove(move2, state2);
      expect(historyManager.canRedo()).toBe(false);
    });
  });

  describe('undo', () => {
    it('should undo last move', () => {
      const move: Move = {
        face: 'front',
        direction: 'clockwise',
        timestamp: Date.now(),
        duration: 300,
      };

      const newState = {
        ...initialState,
        moveHistory: [move],
        timestamp: Date.now(),
      };

      // Execute move
      historyManager.executeMove(move, newState);

      // Undo
      const result = historyManager.undo();

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.newState).toBe(initialState);
        expect(result.undoneMove).toBe(move);
        expect(result.canUndo).toBe(false); // Back to initial state
        expect(result.canRedo).toBe(true);
      }
      expect(historyManager.getCurrentState()).toBe(initialState);
    });

    it('should not undo beyond initial state', () => {
      const result = historyManager.undo();

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe(CubeError.INVALID_MOVE);
      }
      expect(result.canUndo).toBe(false);
    });

    it('should handle multiple undos', () => {
      const moves: Move[] = [
        { face: 'front', direction: 'clockwise', timestamp: 1000, duration: 300 },
        { face: 'up', direction: 'counterclockwise', timestamp: 1400, duration: 300 },
        { face: 'right', direction: 'double', timestamp: 1800, duration: 300 },
      ];

      const states = moves.map((move, index) => ({
        ...initialState,
        moveHistory: moves.slice(0, index + 1),
        timestamp: move.timestamp,
      }));

      // Execute all moves
      moves.forEach((move, index) => {
        const state = states[index];
        if (state) {
          historyManager.executeMove(move, state);
        }
      });

      // Undo all moves
      for (let i = moves.length - 1; i >= 0; i--) {
        const result = historyManager.undo();
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.undoneMove).toBe(moves[i]);
        }
      }

      // Should be back to initial state
      expect(historyManager.getCurrentState()).toBe(initialState);
      expect(historyManager.canUndo()).toBe(false);
    });
  });

  describe('redo', () => {
    it('should redo last undone move', () => {
      const move: Move = {
        face: 'front',
        direction: 'clockwise',
        timestamp: Date.now(),
        duration: 300,
      };

      const newState = {
        ...initialState,
        moveHistory: [move],
        timestamp: Date.now(),
      };

      // Execute and undo
      historyManager.executeMove(move, newState);
      historyManager.undo();

      // Redo
      const result = historyManager.redo();

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.newState).toBe(newState);
        expect(result.canUndo).toBe(true);
        expect(result.canRedo).toBe(false);
      }
    });

    it('should not redo when no moves undone', () => {
      const result = historyManager.redo();

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe(CubeError.INVALID_MOVE);
      }
      expect(result.canRedo).toBe(false);
    });

    it('should handle multiple redos', () => {
      const moves: Move[] = [
        { face: 'front', direction: 'clockwise', timestamp: 1000, duration: 300 },
        { face: 'up', direction: 'counterclockwise', timestamp: 1400, duration: 300 },
      ];

      const states = moves.map((move, index) => ({
        ...initialState,
        moveHistory: moves.slice(0, index + 1),
        timestamp: move.timestamp,
      }));

      // Execute, undo all, then redo all
      moves.forEach((move, index) => {
        const state = states[index];
        if (state) {
          historyManager.executeMove(move, state);
        }
      });

      // Undo all
      moves.forEach(() => historyManager.undo());

      // Redo all
      moves.forEach((_, index) => {
        const result = historyManager.redo();
        expect(result.success).toBe(true);
        const expectedState = states[index];
        if (expectedState) {
          expect(historyManager.getCurrentState()).toBe(expectedState);
        }
      });
    });
  });

  describe('clearHistory', () => {
    it('should clear all history but keep current state', () => {
      const move: Move = {
        face: 'front',
        direction: 'clockwise',
        timestamp: Date.now(),
        duration: 300,
      };

      const newState = {
        ...initialState,
        moveHistory: [move],
        timestamp: Date.now(),
      };

      // Execute move and clear
      historyManager.executeMove(move, newState);
      const currentState = historyManager.getCurrentState();
      
      historyManager.clearHistory();

      expect(historyManager.getCurrentState()).toBe(currentState);
      expect(historyManager.canUndo()).toBe(false);
      expect(historyManager.canRedo()).toBe(false);
    });
  });

  describe('jumpToPosition', () => {
    it('should jump to specific position in history', () => {
      const moves: Move[] = [
        { face: 'front', direction: 'clockwise', timestamp: 1000, duration: 300 },
        { face: 'up', direction: 'counterclockwise', timestamp: 1400, duration: 300 },
        { face: 'right', direction: 'double', timestamp: 1800, duration: 300 },
      ];

      const states = moves.map((move, index) => ({
        ...initialState,
        moveHistory: moves.slice(0, index + 1),
        timestamp: move.timestamp,
      }));

      // Execute all moves
      moves.forEach((move, index) => {
        const state = states[index];
        if (state) {
          historyManager.executeMove(move, state);
        }
      });

      // Jump to position 1 (after first move)
      const result = historyManager.jumpToPosition(1);

      expect(result.success).toBe(true);
      const expectedState = states[0];
      if (expectedState) {
        expect(historyManager.getCurrentState()).toBe(expectedState);
      }
      expect(historyManager.canUndo()).toBe(true);
      expect(historyManager.canRedo()).toBe(false);
    });

    it('should reject invalid position', () => {
      const result = historyManager.jumpToPosition(10);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe(CubeError.INVALID_MOVE);
      }
    });
  });

  describe('getStatistics', () => {
    it('should return correct statistics', () => {
      const moves: Move[] = [
        { face: 'front', direction: 'clockwise', timestamp: 1000, duration: 300 },
        { face: 'up', direction: 'counterclockwise', timestamp: 1400, duration: 300 },
      ];

      moves.forEach((move, index) => {
        const newState = {
          ...initialState,
          moveHistory: moves.slice(0, index + 1),
          timestamp: move.timestamp,
        };
        historyManager.executeMove(move, newState);
      });

      // Undo one move to create redo stack
      historyManager.undo();

      const stats = historyManager.getStatistics();

      expect(stats.totalMoves).toBe(2);
      expect(stats.undoStackSize).toBe(2); // Initial state + 1 executed move
      expect(stats.redoStackSize).toBe(1);
      expect(stats.memoryUsage).toBeGreaterThan(0);
    });
  });

  describe('getMoveSequence', () => {
    it('should return move sequence from history', () => {
      const moves: Move[] = [
        { face: 'front', direction: 'clockwise', timestamp: 1000, duration: 300 },
        { face: 'up', direction: 'counterclockwise', timestamp: 1400, duration: 300 },
        { face: 'right', direction: 'double', timestamp: 1800, duration: 300 },
      ];

      moves.forEach((move, index) => {
        const newState = {
          ...initialState,
          moveHistory: moves.slice(0, index + 1),
          timestamp: move.timestamp,
        };
        historyManager.executeMove(move, newState);
      });

      const sequence = historyManager.getMoveSequence(1, 3);
      expect(sequence).toHaveLength(2);
      expect(sequence[0]).toBe(moves[0]);
      expect(sequence[1]).toBe(moves[1]);
    });

    it('should handle range parameters correctly', () => {
      const moves: Move[] = [
        { face: 'front', direction: 'clockwise', timestamp: 1000, duration: 300 },
        { face: 'up', direction: 'counterclockwise', timestamp: 1400, duration: 300 },
      ];

      moves.forEach((move, index) => {
        const newState = {
          ...initialState,
          moveHistory: moves.slice(0, index + 1),
          timestamp: move.timestamp,
        };
        historyManager.executeMove(move, newState);
      });

      // Get all moves
      const allMoves = historyManager.getMoveSequence();
      expect(allMoves).toHaveLength(2);

      // Get moves from position 1
      const partialMoves = historyManager.getMoveSequence(1);
      expect(partialMoves).toHaveLength(1);
      expect(partialMoves[0]).toBe(moves[1]);
    });
  });

  describe('Memory Management', () => {
    it('should enforce max history size', () => {
      const smallConfig: Partial<HistoryConfiguration> = {
        maxHistorySize: 3,
        autoCleanup: true,
      };

      const smallManager = new MoveHistoryManager(initialState, smallConfig);

      // Execute more moves than max history size
      for (let i = 0; i < 5; i++) {
        const move: Move = {
          face: 'front',
          direction: 'clockwise',
          timestamp: Date.now() + i * 400,
          duration: 300,
        };

        const newState = {
          ...initialState,
          moveHistory: Array(i + 1).fill(move),
          timestamp: Date.now() + i * 400,
        };

        smallManager.executeMove(move, newState);
      }

      const stats = smallManager.getStatistics();
      expect(stats.undoStackSize).toBeLessThanOrEqual(3);
    });

    it('should enforce max undo size for redo stack', () => {
      const config: Partial<HistoryConfiguration> = {
        maxUndoSize: 2,
        autoCleanup: true,
      };

      const manager = new MoveHistoryManager(initialState, config);

      // Execute multiple moves
      const moves: Move[] = [];
      for (let i = 0; i < 4; i++) {
        const move: Move = {
          face: 'front',
          direction: 'clockwise',
          timestamp: Date.now() + i * 400,
          duration: 300,
        };
        moves.push(move);

        const newState = {
          ...initialState,
          moveHistory: moves.slice(),
          timestamp: Date.now() + i * 400,
        };

        manager.executeMove(move, newState);
      }

      // Undo all moves
      while (manager.canUndo()) {
        manager.undo();
      }

      const stats = manager.getStatistics();
      expect(stats.redoStackSize).toBeLessThanOrEqual(2);
    });
  });

  describe('validateHistory', () => {
    it('should validate correct history', () => {
      const move: Move = {
        face: 'front',
        direction: 'clockwise',
        timestamp: Date.now(),
        duration: 300,
      };

      const newState = {
        ...initialState,
        moveHistory: [move],
        timestamp: Date.now(),
      };

      historyManager.executeMove(move, newState);

      const result = historyManager.validateHistory();
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe(true);
      }
    });
  });

  describe('Performance Requirements', () => {
    it('should handle undo/redo operations in under 16ms', () => {
      // Setup multiple moves
      const moves: Move[] = [];
      for (let i = 0; i < 50; i++) {
        const move: Move = {
          face: 'front',
          direction: 'clockwise',
          timestamp: Date.now() + i * 400,
          duration: 300,
        };
        moves.push(move);

        const newState = {
          ...initialState,
          moveHistory: moves.slice(),
          timestamp: Date.now() + i * 400,
        };

        historyManager.executeMove(move, newState);
      }

      // Measure undo performance
      const undoStart = performance.now();
      for (let i = 0; i < 25; i++) {
        historyManager.undo();
      }
      const undoEnd = performance.now();
      const avgUndoTime = (undoEnd - undoStart) / 25;

      // Measure redo performance
      const redoStart = performance.now();
      for (let i = 0; i < 25; i++) {
        historyManager.redo();
      }
      const redoEnd = performance.now();
      const avgRedoTime = (redoEnd - redoStart) / 25;

      expect(avgUndoTime).toBeLessThan(16);
      expect(avgRedoTime).toBeLessThan(16);
    });

    it('should handle rapid move execution efficiently', () => {
      const start = performance.now();

      for (let i = 0; i < 100; i++) {
        const move: Move = {
          face: 'front',
          direction: 'clockwise',
          timestamp: Date.now() + i * 50,
          duration: 300,
        };

        const newState = {
          ...initialState,
          moveHistory: [move],
          timestamp: Date.now() + i * 50,
        };

        historyManager.executeMove(move, newState);
      }

      const end = performance.now();
      const avgTime = (end - start) / 100;

      expect(avgTime).toBeLessThan(16);
    });
  });
});