// hooks/useResponsive.ts
import { useState, useEffect } from 'react';

const DESKTOP_BREAKPOINT = 768;

export const useResponsive = () => {
  // Initialize with actual window width if available, fallback to mobile-first
  const [isDesktop, setIsDesktop] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth >= DESKTOP_BREAKPOINT;
    }
    return false; // Default to mobile-first for SSR
  });

  useEffect(() => {
    const checkScreenSize = () => {
      const newIsDesktop = window.innerWidth >= DESKTOP_BREAKPOINT;
      setIsDesktop(newIsDesktop);
    };

    // Check immediately on mount
    checkScreenSize();

    // Add resize listener
    window.addEventListener('resize', checkScreenSize);
    
    // Cleanup
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  return { isDesktop, isMobile: !isDesktop };
};