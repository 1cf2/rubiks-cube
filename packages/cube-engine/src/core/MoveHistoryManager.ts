import { CubeState, Move, CubeOperationResult, CubeError } from '../types/CubeTypes';

export interface HistoryConfiguration {
  readonly maxHistorySize: number; // Maximum number of states to keep
  readonly maxUndoSize: number; // Maximum number of undo operations
  readonly compressionThreshold: number; // Compress history after this many moves
  readonly autoCleanup: boolean; // Automatically clean up old history
}

export interface HistoryState {
  readonly state: CubeState;
  readonly move?: Move; // The move that led to this state
  readonly timestamp: number;
  readonly compressed: boolean;
}

export interface UndoRedoResult {
  readonly success: boolean;
  readonly newState?: CubeState;
  readonly undoneMove?: Move;
  readonly error?: CubeError;
  readonly canUndo: boolean;
  readonly canRedo: boolean;
}

export interface HistoryStatistics {
  readonly totalMoves: number;
  readonly undoStackSize: number;
  readonly redoStackSize: number;
  readonly memoryUsage: number; // Estimated in bytes
  readonly oldestTimestamp?: number;
  readonly newestTimestamp?: number;
}

export class MoveHistoryManager {
  private readonly config: HistoryConfiguration;
  private undoStack: HistoryState[] = [];
  private redoStack: HistoryState[] = [];
  private currentState: CubeState;

  constructor(initialState: CubeState, config: Partial<HistoryConfiguration> = {}) {
    this.config = {
      maxHistorySize: 1000,
      maxUndoSize: 100,
      compressionThreshold: 50,
      autoCleanup: true,
      ...config,
    };

    this.currentState = initialState;
    this.pushToUndoStack({
      state: initialState,
      timestamp: Date.now(),
      compressed: false,
    });
  }

  // Execute a move and update history
  executeMove(move: Move, newState: CubeState): CubeOperationResult<CubeState> {
    try {
      // Clear redo stack when new move is made
      this.redoStack = [];

      // Add current state to undo stack before applying move
      this.pushToUndoStack({
        state: this.currentState,
        move,
        timestamp: move.timestamp,
        compressed: false,
      });

      // Update current state
      this.currentState = newState;

      // Cleanup if necessary
      if (this.config.autoCleanup) {
        this.cleanupHistory();
      }

      return { success: true, data: newState };
    } catch (error) {
      return {
        success: false,
        error: CubeError.STATE_CORRUPTION,
      };
    }
  }

  // Undo the last move
  undo(): UndoRedoResult {
    if (this.undoStack.length <= 1) { // Keep at least the initial state
      return {
        success: false,
        error: CubeError.INVALID_MOVE,
        canUndo: false,
        canRedo: this.redoStack.length > 0,
      };
    }

    try {
      // Move current state to redo stack
      this.redoStack.push({
        state: this.currentState,
        timestamp: Date.now(),
        compressed: false,
      });

      // Pop from undo stack
      const undoState = this.undoStack.pop()!;
      this.currentState = undoState.state;

      // Cleanup redo stack if it gets too large
      if (this.redoStack.length > this.config.maxUndoSize) {
        this.redoStack.shift();
      }

      return {
        success: true,
        newState: this.currentState,
        ...(undoState.move && { undoneMove: undoState.move }),
        canUndo: this.undoStack.length > 1,
        canRedo: true,
      };
    } catch (error) {
      return {
        success: false,
        error: CubeError.STATE_CORRUPTION,
        canUndo: this.undoStack.length > 1,
        canRedo: this.redoStack.length > 0,
      };
    }
  }

  // Redo the last undone move
  redo(): UndoRedoResult {
    if (this.redoStack.length === 0) {
      return {
        success: false,
        error: CubeError.INVALID_MOVE,
        canUndo: this.undoStack.length > 1,
        canRedo: false,
      };
    }

    try {
      // Move current state to undo stack
      this.pushToUndoStack({
        state: this.currentState,
        timestamp: Date.now(),
        compressed: false,
      });

      // Pop from redo stack
      const redoState = this.redoStack.pop()!;
      this.currentState = redoState.state;

      return {
        success: true,
        newState: this.currentState,
        canUndo: true,
        canRedo: this.redoStack.length > 0,
      };
    } catch (error) {
      return {
        success: false,
        error: CubeError.STATE_CORRUPTION,
        canUndo: this.undoStack.length > 1,
        canRedo: this.redoStack.length > 0,
      };
    }
  }

  // Get current state
  getCurrentState(): CubeState {
    return this.currentState;
  }

  // Check if undo is possible
  canUndo(): boolean {
    return this.undoStack.length > 1;
  }

  // Check if redo is possible
  canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  // Get move history
  getMoveHistory(): readonly Move[] {
    return this.currentState.moveHistory;
  }

  // Get the last N moves
  getRecentMoves(count: number): readonly Move[] {
    const moves = this.getMoveHistory();
    return moves.slice(-count);
  }

  // Get history statistics
  getStatistics(): HistoryStatistics {
    const moveHistory = this.getMoveHistory();
    const undoTimestamps = this.undoStack.map(h => h.timestamp);
    
    // Estimate memory usage (simplified calculation)
    const estimatedMemoryPerState = 1000; // bytes (rough estimate)
    const memoryUsage = (this.undoStack.length + this.redoStack.length) * estimatedMemoryPerState;

    const oldestTimestamp = undoTimestamps.length > 0 ? Math.min(...undoTimestamps) : undefined;
    const newestTimestamp = undoTimestamps.length > 0 ? Math.max(...undoTimestamps) : undefined;

    return {
      totalMoves: moveHistory.length,
      undoStackSize: this.undoStack.length,
      redoStackSize: this.redoStack.length,
      memoryUsage,
      ...(oldestTimestamp !== undefined && { oldestTimestamp }),
      ...(newestTimestamp !== undefined && { newestTimestamp }),
    };
  }

  // Clear all history but keep current state
  clearHistory(): void {
    this.undoStack = [{
      state: this.currentState,
      timestamp: Date.now(),
      compressed: false,
    }];
    this.redoStack = [];
  }

  // Reset to a specific state and clear history
  resetToState(state: CubeState): void {
    this.currentState = state;
    this.undoStack = [{
      state,
      timestamp: Date.now(),
      compressed: false,
    }];
    this.redoStack = [];
  }

  // Get state at specific position in history
  getStateAtPosition(position: number): CubeState | undefined {
    if (position < 0 || position >= this.undoStack.length) {
      return undefined;
    }
    const historyState = this.undoStack[position];
    return historyState?.state;
  }

  // Jump to specific position in history
  jumpToPosition(position: number): CubeOperationResult<CubeState> {
    if (position < 0 || position >= this.undoStack.length) {
      return {
        success: false,
        error: CubeError.INVALID_MOVE,
      };
    }

    try {
      const targetState = this.undoStack[position];
      
      if (!targetState) {
        return {
          success: false,
          error: CubeError.INVALID_MOVE,
        };
      }
      
      // Clear redo stack
      this.redoStack = [];
      
      // Trim undo stack to target position
      this.undoStack = this.undoStack.slice(0, position + 1);
      
      // Set current state
      this.currentState = targetState.state;

      return { success: true, data: this.currentState };
    } catch (error) {
      return {
        success: false,
        error: CubeError.STATE_CORRUPTION,
      };
    }
  }

  // Compress old history entries to save memory
  compressHistory(): void {
    if (this.undoStack.length <= this.config.compressionThreshold) {
      return;
    }

    const cutoffIndex = this.undoStack.length - this.config.compressionThreshold;
    
    // Keep only recent states, mark older ones as compressed
    for (let i = 0; i < cutoffIndex; i++) {
      const historyState = this.undoStack[i];
      if (historyState && !historyState.compressed) {
        // In a real implementation, we might compress the state data here
        // For now, just mark as compressed
        this.undoStack[i] = {
          ...historyState,
          compressed: true,
        };
      }
    }
  }

  // Get move sequence from history
  getMoveSequence(startPosition: number = 0, endPosition?: number): readonly Move[] {
    const end = endPosition ?? this.undoStack.length;
    const moves: Move[] = [];

    for (let i = startPosition; i < end && i < this.undoStack.length; i++) {
      const historyState = this.undoStack[i];
      if (historyState?.move) {
        moves.push(historyState.move);
      }
    }

    return moves;
  }


  private pushToUndoStack(historyState: HistoryState): void {
    this.undoStack.push(historyState);

    // Enforce max history size
    if (this.undoStack.length > this.config.maxHistorySize) {
      this.undoStack.shift();
    }
  }

  private cleanupHistory(): void {
    // Remove old entries if over limit
    if (this.undoStack.length > this.config.maxHistorySize) {
      const removeCount = this.undoStack.length - this.config.maxHistorySize;
      this.undoStack.splice(0, removeCount);
    }

    // Cleanup redo stack
    if (this.redoStack.length > this.config.maxUndoSize) {
      const removeCount = this.redoStack.length - this.config.maxUndoSize;
      this.redoStack.splice(0, removeCount);
    }

    // Compress old entries
    this.compressHistory();
  }

  // Export history for debugging or analysis
  exportHistory(): {
    undoStack: HistoryState[];
    redoStack: HistoryState[];
    currentState: CubeState;
    config: HistoryConfiguration;
  } {
    return {
      undoStack: [...this.undoStack],
      redoStack: [...this.redoStack],
      currentState: this.currentState,
      config: this.config,
    };
  }

  // Validate history integrity
  validateHistory(): CubeOperationResult<boolean> {
    try {
      // Check undo stack integrity
      for (let i = 0; i < this.undoStack.length; i++) {
        const historyState = this.undoStack[i];
        if (!historyState || !historyState.state || !historyState.timestamp) {
          return {
            success: false,
            error: CubeError.STATE_CORRUPTION,
          };
        }
      }

      // Check redo stack integrity
      for (let i = 0; i < this.redoStack.length; i++) {
        const historyState = this.redoStack[i];
        if (!historyState || !historyState.state || !historyState.timestamp) {
          return {
            success: false,
            error: CubeError.STATE_CORRUPTION,
          };
        }
      }

      return { success: true, data: true };
    } catch (error) {
      return {
        success: false,
        error: CubeError.STATE_CORRUPTION,
      };
    }
  }
}