import { useState, useEffect } from 'react';

export function useResponsive() {
  const [isDesktop, setIsDesktop] = useState(() => {
    // Initialize with proper window width check
    if (typeof window !== 'undefined') {
      return window.innerWidth >= 768;
    }
    return false;
  });

  useEffect(() => {
    const handleResize = () => {
      setIsDesktop(window.innerWidth >= 768);
    };

    // Add event listener
    window.addEventListener('resize', handleResize);
    
    // Call handler immediately in case window was resized before effect ran
    handleResize();

    // Cleanup
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return { isDesktop, isMobile: !isDesktop };
}