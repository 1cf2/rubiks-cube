import { useState, useEffect } from 'react';

/**
 * Hook to detect mobile devices, specifically iPhone/iOS, and orientation changes
 * for responsive input handling and UI adaptations.
 */
export const useMobileDetector = () => {
  const [isMobile, setIsMobile] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isIPhone, setIsIPhone] = useState(false);
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('portrait');
  const [devicePixelRatio, setDevicePixelRatio] = useState(1);

  useEffect(() => {
    const checkDevice = () => {
      const userAgent = navigator.userAgent.toLowerCase();
      const isMobileDevice = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent);
      const isIOSDevice = /iphone|ipad|ipod/i.test(userAgent);
      const isIPhoneDevice = /iphone/i.test(userAgent);

      setIsMobile(isMobileDevice);
      setIsIOS(isIOSDevice);
      setIsIPhone(isIPhoneDevice);

      // Set device pixel ratio for high-DPI screens (e.g., Retina)
      setDevicePixelRatio(window.devicePixelRatio || 1);

      console.log('🪲 Mobile Detection:', { isMobile: isMobileDevice, isIOS: isIOSDevice, isIPhone: isIPhoneDevice, userAgent, devicePixelRatio: window.devicePixelRatio || 1 });
    };

    const checkOrientation = () => {
      if (window.innerHeight > window.innerWidth) {
        setOrientation('portrait');
      } else {
        setOrientation('landscape');
      }
    };

    checkDevice();
    checkOrientation();

    // Listen for orientation changes
    window.addEventListener('orientationchange', checkOrientation);
    window.addEventListener('resize', checkOrientation);

    // Initial media query for mobile
    const mediaQuery = window.matchMedia('(max-width: 768px)');
    setIsMobile(mediaQuery.matches);

    const handleMediaChange = (e: MediaQueryListEvent) => {
      setIsMobile(e.matches);
      console.log('🪲 Media query change:', { isMobile: e.matches });
    };
    mediaQuery.addEventListener('change', handleMediaChange);

    console.log('🪲 Initial mobile detection complete:', { isMobile: mediaQuery.matches });

    return () => {
      window.removeEventListener('orientationchange', checkOrientation);
      window.removeEventListener('resize', checkOrientation);
      mediaQuery.removeEventListener('change', handleMediaChange);
    };
  }, []);

  return {
    isMobile,
    isIOS,
    isIPhone,
    orientation,
    devicePixelRatio,
    isTouchPreferred: isMobile && !navigator.maxTouchPoints && navigator.maxTouchPoints > 0,
  };
};