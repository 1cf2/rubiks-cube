/**
 * Mobile Performance Optimization Hook
 * Manages mobile-specific performance settings and optimizations
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { PerformanceMetrics } from '@rubiks-cube/shared/types';
import { getDevicePixelRatio, getViewportInfo } from '../utils/touchUtils';

export interface MobilePerformanceConfig {
  targetFrameRate: number; // 30fps for mobile vs 60fps for desktop
  inputLatencyTarget: number; // 32ms for mobile vs 16ms for desktop
  memoryBudget: number; // 75MB for mobile vs 100MB for desktop
  enableBatteryOptimization: boolean;
  qualityLevel: 'low' | 'medium' | 'high' | 'auto';
}

export interface DeviceCapabilities {
  isMobile: boolean;
  isHighEnd: boolean;
  supportsTouch: boolean;
  devicePixelRatio: number;
  memoryEstimate: number; // Approximate memory available
  connectionType: string;
  batteryLevel?: number;
}

const DEFAULT_MOBILE_CONFIG: MobilePerformanceConfig = {
  targetFrameRate: 30,
  inputLatencyTarget: 32,
  memoryBudget: 75,
  enableBatteryOptimization: true,
  qualityLevel: 'auto',
};

const DEFAULT_DESKTOP_CONFIG: MobilePerformanceConfig = {
  targetFrameRate: 60,
  inputLatencyTarget: 16,
  memoryBudget: 100,
  enableBatteryOptimization: false,
  qualityLevel: 'high',
};

export function useMobilePerformance() {
  const [deviceCapabilities, setDeviceCapabilities] = useState<DeviceCapabilities | null>(null);
  const [performanceConfig, setPerformanceConfig] = useState<MobilePerformanceConfig>(DEFAULT_MOBILE_CONFIG);
  const [currentMetrics, setCurrentMetrics] = useState<PerformanceMetrics>({
    frameRate: 0,
    memoryUsage: 0,
    inputLatency: 0,
    animationLatency: 0,
  });

  const frameTimeHistory = useRef<number[]>([]);
  const lastFrameTime = useRef<number>(0);

  // Detect device capabilities on mount
  useEffect(() => {
    const detectCapabilities = (): DeviceCapabilities => {
      const isMobile = /Mobi|Android/i.test(navigator.userAgent) || 
                      'ontouchstart' in window || 
                      navigator.maxTouchPoints > 0;
      
      const supportsTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
      
      // Estimate device performance level
      const devicePixelRatio = getDevicePixelRatio();
      const viewport = getViewportInfo();
      
      // Simple heuristic for high-end device detection
      const isHighEnd = !isMobile || (
        devicePixelRatio >= 2 &&
        viewport.width >= 375 &&
        viewport.height >= 667 &&
        window.screen.width >= 1080
      );

      // Memory estimation (very rough)
      const memoryEstimate = (navigator as any).deviceMemory || 
                            (isHighEnd ? 6 : isMobile ? 2 : 8);

      // Connection type
      const connection = (navigator as any).connection;
      const connectionType = connection?.effectiveType || 'unknown';

      // Battery API (if available)
      let batteryLevel: number | undefined;
      (navigator as any).getBattery?.()?.then((battery: any) => {
        batteryLevel = battery.level;
      });

      return {
        isMobile,
        isHighEnd,
        supportsTouch,
        devicePixelRatio,
        memoryEstimate,
        connectionType,
        batteryLevel: batteryLevel || 1.0,
      };
    };

    const capabilities = detectCapabilities();
    setDeviceCapabilities(capabilities);
    
    // Set initial performance config based on device
    const initialConfig = capabilities.isMobile ? DEFAULT_MOBILE_CONFIG : DEFAULT_DESKTOP_CONFIG;
    
    // Auto-adjust quality based on device capabilities
    if (initialConfig.qualityLevel === 'auto') {
      if (capabilities.isHighEnd) {
        initialConfig.qualityLevel = capabilities.isMobile ? 'medium' : 'high';
      } else {
        initialConfig.qualityLevel = 'low';
      }
    }
    
    setPerformanceConfig(initialConfig);
  }, []);

  // Performance monitoring
  const measureFrameRate = useCallback(() => {
    const now = performance.now();
    if (lastFrameTime.current > 0) {
      const frameTime = now - lastFrameTime.current;
      frameTimeHistory.current.push(frameTime);
      
      // Keep only last 60 frames for rolling average
      if (frameTimeHistory.current.length > 60) {
        frameTimeHistory.current.shift();
      }
      
      // Calculate average frame rate
      const avgFrameTime = frameTimeHistory.current.reduce((a, b) => a + b, 0) / frameTimeHistory.current.length;
      const avgFrameRate = avgFrameTime > 0 ? 1000 / avgFrameTime : 0;
      
      setCurrentMetrics(prev => ({
        ...prev,
        frameRate: Math.round(avgFrameRate),
      }));
    }
    lastFrameTime.current = now;
  }, []);

  // Measure input latency
  const measureInputLatency = useCallback((startTime: number) => {
    const endTime = performance.now();
    const latency = endTime - startTime;
    
    setCurrentMetrics(prev => ({
      ...prev,
      responseTime: latency,
    }));
    
    return latency;
  }, []);

  // Update memory usage (approximate)
  const updateMemoryUsage = useCallback(() => {
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      const usedMemory = memory.usedJSHeapSize / (1024 * 1024); // Convert to MB
      
      setCurrentMetrics(prev => ({
        ...prev,
        memoryUsage: Math.round(usedMemory),
      }));
    }
  }, []);

  // Adaptive quality adjustment based on performance
  const adaptQuality = useCallback(() => {
    if (!deviceCapabilities || performanceConfig.qualityLevel !== 'auto') return;

    const { frameRate, memoryUsage } = currentMetrics;
    const { targetFrameRate, memoryBudget } = performanceConfig;
    
    // Start with medium quality for auto mode
    let newQuality: 'low' | 'medium' | 'high' = 'medium';
    
    // Reduce quality if performance is poor
    if (frameRate < targetFrameRate * 0.8 || memoryUsage > memoryBudget * 0.9) {
      newQuality = 'low';
    }
    // Increase quality if performance is good and device can handle it
    else if (frameRate > targetFrameRate * 1.1 && memoryUsage < memoryBudget * 0.7 && deviceCapabilities.isHighEnd) {
      newQuality = 'high';
    }
    
    // Update config with new quality setting (no longer auto)
    setPerformanceConfig(prev => ({
      ...prev,
      qualityLevel: newQuality,
    }));
  }, [deviceCapabilities, performanceConfig, currentMetrics]);

  // Battery optimization
  const optimizeForBattery = useCallback((batteryLevel?: number) => {
    if (!performanceConfig.enableBatteryOptimization) return;
    
    const lowBattery = batteryLevel !== undefined && batteryLevel < 0.2;
    
    if (lowBattery) {
      setPerformanceConfig(prev => ({
        ...prev,
        targetFrameRate: Math.min(prev.targetFrameRate, 20),
        qualityLevel: 'low',
      }));
    }
  }, [performanceConfig.enableBatteryOptimization]);

  // Performance monitoring loop
  useEffect(() => {
    let animationId: number;
    
    const performanceLoop = () => {
      measureFrameRate();
      updateMemoryUsage();
      adaptQuality();
      
      animationId = requestAnimationFrame(performanceLoop);
    };
    
    // Start monitoring after a brief delay
    const timeoutId = setTimeout(() => {
      animationId = requestAnimationFrame(performanceLoop);
    }, 1000);
    
    return () => {
      clearTimeout(timeoutId);
      if (animationId) {
        cancelAnimationFrame(animationId);
      }
    };
  }, [measureFrameRate, updateMemoryUsage, adaptQuality]);

  // Battery monitoring
  useEffect(() => {
    if ('getBattery' in navigator) {
      (navigator as any).getBattery().then((battery: any) => {
        const updateBattery = () => {
          optimizeForBattery(battery.level);
        };
        
        battery.addEventListener('levelchange', updateBattery);
        updateBattery(); // Initial check
        
        return () => {
          battery.removeEventListener('levelchange', updateBattery);
        };
      });
    }
  }, [optimizeForBattery]);

  return {
    deviceCapabilities,
    performanceConfig,
    currentMetrics,
    measureInputLatency,
    setPerformanceConfig,
    isMobile: deviceCapabilities?.isMobile ?? false,
    isHighEnd: deviceCapabilities?.isHighEnd ?? false,
    supportsTouch: deviceCapabilities?.supportsTouch ?? false,
  };
}