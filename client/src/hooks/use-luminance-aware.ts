import { useEffect, useRef } from 'react';
import { getOptimalTextColor, getMutedTextColor, isLightBackground } from '@/lib/luminance';

/**
 * Hook to automatically apply luminance-aware styling to elements
 */
export function useLuminanceAware(backgroundColor?: string) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    // Get the background color from the element or use provided one
    const bgColor = backgroundColor || getComputedStyle(element).backgroundColor;
    
    // Convert RGB to hex if needed
    let hexColor = bgColor;
    if (bgColor.startsWith('rgb')) {
      const matches = bgColor.match(/\d+/g);
      if (matches && matches.length >= 3) {
        const r = parseInt(matches[0]);
        const g = parseInt(matches[1]);
        const b = parseInt(matches[2]);
        hexColor = `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
      }
    }

    if (hexColor.startsWith('#')) {
      const optimalTextColor = getOptimalTextColor(hexColor);
      const mutedTextColor = getMutedTextColor(hexColor);

      // Set CSS custom properties on the element
      element.style.setProperty('--optimal-text-color', optimalTextColor);
      element.style.setProperty('--optimal-muted-color', mutedTextColor);
      
      // Apply the luminance-aware class
      element.classList.add('luminance-aware');
    }
  }, [backgroundColor]);

  return ref;
}

/**
 * Hook for dialog components to ensure proper text contrast
 */
export function useDialogLuminanceAware() {
  useEffect(() => {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            const element = node as Element;
            const dialogContent = element.querySelector('[data-radix-dialog-content]') || 
                                 (element.matches && element.matches('[data-radix-dialog-content]') ? element : null);
            
            if (dialogContent) {
              const htmlElement = dialogContent as HTMLElement;
              
              // Apply luminance-aware styling
              const bgColor = getComputedStyle(htmlElement).backgroundColor;
              let hexColor = '#ffffff'; // Default to white
              
              if (bgColor.startsWith('rgb')) {
                const matches = bgColor.match(/\d+/g);
                if (matches && matches.length >= 3) {
                  const r = parseInt(matches[0]);
                  const g = parseInt(matches[1]);
                  const b = parseInt(matches[2]);
                  hexColor = `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
                }
              }
              
              const optimalTextColor = getOptimalTextColor(hexColor);
              const mutedTextColor = getMutedTextColor(hexColor);
              
              // Set CSS custom properties
              htmlElement.style.setProperty('--optimal-text-color', optimalTextColor);
              htmlElement.style.setProperty('--optimal-muted-color', mutedTextColor);
              
              console.log(`Applied luminance-aware styling: bg=${hexColor}, text=${optimalTextColor}, muted=${mutedTextColor}`);
            }
          }
        });
      });
    });

    observer.observe(document.body, { childList: true, subtree: true });

    return () => observer.disconnect();
  }, []);
}

/**
 * Hook to apply theme-aware styling based on current theme color
 */
export function useThemeAware(themeColor: string) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element || !themeColor) return;

    const optimalTextColor = getOptimalTextColor(themeColor);
    const mutedTextColor = getMutedTextColor(themeColor);
    const isLight = isLightBackground(themeColor);

    // Set CSS custom properties
    element.style.setProperty('--theme-optimal-text', optimalTextColor);
    element.style.setProperty('--theme-optimal-muted', mutedTextColor);
    element.style.setProperty('--theme-is-light', isLight ? '1' : '0');
    
    // Apply data attribute for CSS targeting
    element.setAttribute('data-theme-luminance', isLight ? 'light' : 'dark');
    
  }, [themeColor]);

  return ref;
}