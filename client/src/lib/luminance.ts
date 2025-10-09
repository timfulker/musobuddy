/**
 * Luminance-aware text contrast utilities
 * Automatically calculates optimal text colors based on background luminance
 */

/**
 * Convert hex color to RGB values
 */
function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null;
}

/**
 * Calculate relative luminance of a color
 * Using WCAG 2.1 formula
 */
function getLuminance(r: number, g: number, b: number): number {
  const rsRGB = r / 255;
  const gsRGB = g / 255;
  const bsRGB = b / 255;

  const rLinear = rsRGB <= 0.03928 ? rsRGB / 12.92 : Math.pow((rsRGB + 0.055) / 1.055, 2.4);
  const gLinear = gsRGB <= 0.03928 ? gsRGB / 12.92 : Math.pow((gsRGB + 0.055) / 1.055, 2.4);
  const bLinear = bsRGB <= 0.03928 ? bsRGB / 12.92 : Math.pow((bsRGB + 0.055) / 1.055, 2.4);

  return 0.2126 * rLinear + 0.7152 * gLinear + 0.0722 * bLinear;
}

/**
 * Calculate contrast ratio between two colors
 */
function getContrastRatio(luminance1: number, luminance2: number): number {
  const lighter = Math.max(luminance1, luminance2);
  const darker = Math.min(luminance1, luminance2);
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Get optimal text color (black or white) for a given background color
 */
export function getOptimalTextColor(backgroundColor: string): string {
  const rgb = hexToRgb(backgroundColor);
  if (!rgb) return '#000000'; // Default to black for invalid colors

  const backgroundLuminance = getLuminance(rgb.r, rgb.g, rgb.b);
  
  // Use threshold of 0.179 based on W3C recommendations
  // This is approximately the luminance of #808080 (50% gray)
  // Colors darker than this should have white text, lighter should have black
  return backgroundLuminance <= 0.179 ? '#ffffff' : '#000000';
}

/**
 * Get muted text color (gray variant) that maintains good contrast
 */
export function getMutedTextColor(backgroundColor: string): string {
  const optimalColor = getOptimalTextColor(backgroundColor);
  
  if (optimalColor === '#ffffff') {
    // Light text on dark background - use light gray
    return '#a1a1aa'; // zinc-400
  } else {
    // Dark text on light background - use dark gray
    return '#71717a'; // zinc-500
  }
}

/**
 * Check if a background color is considered "light"
 */
export function isLightBackground(backgroundColor: string): boolean {
  const rgb = hexToRgb(backgroundColor);
  if (!rgb) return true; // Default to light for invalid colors
  
  const luminance = getLuminance(rgb.r, rgb.g, rgb.b);
  return luminance > 0.5;
}

/**
 * Apply luminance-aware styling to an element
 */
export function applyLuminanceAwareStyles(element: HTMLElement, backgroundColor: string): void {
  const textColor = getOptimalTextColor(backgroundColor);
  const mutedColor = getMutedTextColor(backgroundColor);
  
  // Apply primary text color
  element.style.setProperty('color', textColor, 'important');
  
  // Apply to muted text elements
  const mutedElements = element.querySelectorAll('.text-muted-foreground, .text-gray-500, .text-gray-600, .text-gray-700');
  mutedElements.forEach((el) => {
    (el as HTMLElement).style.setProperty('color', mutedColor, 'important');
  });
}

/**
 * Global luminance-aware utility for dialogs and modals
 */
export function makeLuminanceAware(selector: string, backgroundColor?: string): void {
  const elements = document.querySelectorAll(selector);
  
  elements.forEach((element) => {
    const htmlElement = element as HTMLElement;
    
    // Get background color from element or use provided one
    const bgColor = backgroundColor || getComputedStyle(htmlElement).backgroundColor;
    
    // Convert to hex if it's rgb/rgba
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
    
    applyLuminanceAwareStyles(htmlElement, hexColor);
  });
}