/**
 * Debug logging utility for mouse gesture debugging
 */
import { isLoggingEnabled } from './featureFlags';

export enum DebugLevel {
  ERROR = 0,
  WARN = 1,
  INFO = 2,
  DEBUG = 3,
  TRACE = 4,
}

export class DebugLogger {
  private static level: DebugLevel = DebugLevel.DEBUG;
  private static prefix: string = '🐛';

  private static isEnabled(): boolean {
    return isLoggingEnabled();
  }

  static setLevel(level: DebugLevel) {
    this.level = level;
  }

  static error(component: string, message: string, data?: any) {
    if (this.isEnabled() && this.level >= DebugLevel.ERROR) {
      window.console.error(`${this.prefix} [${component}] ERROR:`, message, data || '');
    }
  }

  static warn(component: string, message: string, data?: any) {
    if (this.isEnabled() && this.level >= DebugLevel.WARN) {
      window.console.warn(`${this.prefix} [${component}] WARN:`, message, data || '');
    }
  }

  static info(component: string, message: string, data?: any) {
    if (this.isEnabled() && this.level >= DebugLevel.INFO) {
      window.console.info(`${this.prefix} [${component}] INFO:`, message, data || '');
    }
  }

  static debug(component: string, message: string, data?: any) {
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
  private static isGestureLoggingEnabled(): boolean {
    // Import inside method to avoid circular dependency
    const { isGestureLoggingEnabled } = require('./featureFlags');
    return isGestureLoggingEnabled();
  }

  static logEventDetails(event: React.MouseEvent, context: string) {
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
}