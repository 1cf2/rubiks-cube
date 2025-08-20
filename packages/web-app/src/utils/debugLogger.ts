/**
 * Debug logging utility for mouse gesture debugging
 */
import React from 'react';
import { isLoggingEnabled } from './featureFlags';

/* eslint-disable no-unused-vars */
export enum DebugLevel {
  ERROR = 0,
  WARN = 1,
  INFO = 2,
  DEBUG = 3,
  TRACE = 4,
}
/* eslint-enable no-unused-vars */

export class DebugLogger {
  private static level: DebugLevel = DebugLevel.DEBUG;
  private static prefix: string = '🐛';
  private static logHistory: Array<{timestamp: number, level: string, component: string, message: string, data?: any}> = [];

  private static isEnabled(): boolean {
    return isLoggingEnabled();
  }
  
  private static addToHistory(level: string, component: string, message: string, data?: any) {
    this.logHistory.push({
      timestamp: performance.now(),
      level,
      component,
      message,
      data
    });
    
    // Keep only last 100 log entries
    if (this.logHistory.length > 100) {
      this.logHistory.shift();
    }
  }
  
  static getLogHistory() {
    return this.logHistory;
  }
  
  static exportDebugSession() {
    const session = {
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href,
      logs: this.logHistory
    };
    
    const blob = new Blob([JSON.stringify(session, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `rubiks-cube-debug-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  static setLevel(level: DebugLevel) {
    this.level = level;
  }

  static error(component: string, message: string, data?: any) {
    this.addToHistory('ERROR', component, message, data);
    if (this.isEnabled() && this.level >= DebugLevel.ERROR) {
      window.console.error(`${this.prefix} [${component}] ERROR:`, message, data || '');
    }
  }

  static warn(component: string, message: string, data?: any) {
    this.addToHistory('WARN', component, message, data);
    if (this.isEnabled() && this.level >= DebugLevel.WARN) {
      window.console.warn(`${this.prefix} [${component}] WARN:`, message, data || '');
    }
  }

  static info(component: string, message: string, data?: any) {
    this.addToHistory('INFO', component, message, data);
    if (this.isEnabled() && this.level >= DebugLevel.INFO) {
      window.console.info(`${this.prefix} [${component}] INFO:`, message, data || '');
    }
  }

  static debug(component: string, message: string, data?: any) {
    this.addToHistory('DEBUG', component, message, data);
    if (this.isEnabled() && this.level >= DebugLevel.DEBUG) {
      window.console.log(`${this.prefix} [${component}] DEBUG:`, message, data || '');
    }
  }

  static trace(component: string, message: string, data?: any) {
    if (this.isEnabled() && this.level >= DebugLevel.TRACE) {
      window.console.log(`${this.prefix} [${component}] TRACE:`, message, data || '');
    }
  }

  static group(component: string, title: string) {
    if (this.isEnabled() && this.level >= DebugLevel.DEBUG) {
      window.console.group(`${this.prefix} [${component}] ${title}`);
    }
  }

  static groupEnd() {
    if (this.isEnabled() && this.level >= DebugLevel.DEBUG) {
      window.console.groupEnd();
    }
  }

  static time(label: string) {
    if (this.isEnabled() && this.level >= DebugLevel.DEBUG) {
      window.console.time(`${this.prefix} ${label}`);
    }
  }

  static timeEnd(label: string) {
    if (this.isEnabled() && this.level >= DebugLevel.DEBUG) {
      window.console.timeEnd(`${this.prefix} ${label}`);
    }
  }
}

// Mouse gesture specific debug helpers
export class MouseGestureDebugger {
  private static gestureChain: string[] = [];
  private static gestureStartTime: number = 0;
  
  private static isGestureLoggingEnabled(): boolean {
    // Import inside method to avoid circular dependency
    const { isGestureLoggingEnabled } = require('./featureFlags');
    return isGestureLoggingEnabled();
  }

  static logEventDetails(event: React.MouseEvent<Element>, context: string) {
    if (this.isGestureLoggingEnabled()) {
      DebugLogger.trace('MouseGesture', `${context} - Event Details:`, {
        clientX: event.clientX,
        clientY: event.clientY,
        target: event.target,
        currentTarget: event.currentTarget,
        buttons: event.buttons,
        button: event.button,
        type: event.type,
        timeStamp: event.timeStamp,
      });
    }
  }

  static logGestureState(state: any, context: string) {
    if (this.isGestureLoggingEnabled()) {
      DebugLogger.debug('MouseGesture', `${context} - Gesture State:`, {
        isDragging: state.isDragging,
        currentGesture: state.currentGesture,
        cursorState: state.cursorState,
      });
    }
  }

  static logRaycastResult(result: any, context: string) {
    if (this.isGestureLoggingEnabled()) {
      DebugLogger.debug('MouseGesture', `${context} - Raycast:`, {
        success: result.success,
        facePosition: result.data?.facePosition,
        point: result.data?.point,
        error: result.error,
        message: result.message,
      });
    }
  }

  static startGestureChain(initiator: string) {
    this.gestureChain = [initiator];
    this.gestureStartTime = performance.now();
    window.console.group(`🔗 Gesture Chain Started by: ${initiator}`);
  }

  static addToGestureChain(component: string, action: string, data?: any) {
    const timestamp = performance.now() - this.gestureStartTime;
    const entry = `${component}:${action} (+${timestamp.toFixed(1)}ms)`;
    this.gestureChain.push(entry);
    
    window.console.log(`🔗 Chain Step: ${entry}`, data || '');
  }

  static endGestureChain(result: string) {
    const totalTime = performance.now() - this.gestureStartTime;
    window.console.log(`🔗 Gesture Chain Complete: ${result} (Total: ${totalTime.toFixed(1)}ms)`);
    window.console.log(`🔗 Full Chain:`, this.gestureChain);
    window.console.groupEnd();
    this.gestureChain = [];
    this.gestureStartTime = 0;
  }

  static logDragGestureProgression(gesture: any, stage: 'start' | 'update' | 'end') {
    if (this.isGestureLoggingEnabled()) {
      const stageEmojis = {
        start: '🟢',
        update: '🟡', 
        end: '🔴'
      };
      
      window.console.log(`${stageEmojis[stage]} Drag ${stage.toUpperCase()}`, {
        startPos: gesture.startPosition,
        currentPos: gesture.currentPosition,
        delta: gesture.delta,
        duration: gesture.duration,
        distance: Math.sqrt(gesture.delta.deltaX ** 2 + gesture.delta.deltaY ** 2),
        isActive: gesture.isActive
      });
    }
  }
}

// Global window access for easy console debugging
if (typeof window !== 'undefined') {
  (window as any).DebugLogger = DebugLogger;
  (window as any).MouseGestureDebugger = MouseGestureDebugger;
  (window as any).rubiksCubeDebug = {
    exportSession: () => DebugLogger.exportDebugSession(),
    getHistory: () => DebugLogger.getLogHistory(),
    startGestureChain: (name: string) => MouseGestureDebugger.startGestureChain(name),
    endGestureChain: (result: string) => MouseGestureDebugger.endGestureChain(result),
    logger: DebugLogger,
    gestureDebugger: MouseGestureDebugger
  };
}