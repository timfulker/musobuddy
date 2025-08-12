/**
 * Calculate the relative luminance of a color
 * Based on WCAG 2.0 guidelines for color contrast
 */
export function getLuminance(color: string): number {
  // Convert hex to RGB
  let r: number, g: number, b: number;
  
  // Remove # if present
  const hex = color.replace('#', '');
  
  // Convert 3-digit hex to 6-digit
  const fullHex = hex.length === 3 
    ? hex.split('').map(c => c + c).join('') 
    : hex;
  
  // Parse RGB values
  r = parseInt(fullHex.substring(0, 2), 16) / 255;
  g = parseInt(fullHex.substring(2, 4), 16) / 255;
  b = parseInt(fullHex.substring(4, 6), 16) / 255;
  
  // Apply gamma correction
  const gammaCorrect = (channel: number) => {
    return channel <= 0.03928
      ? channel / 12.92
      : Math.pow((channel + 0.055) / 1.055, 2.4);
  };
  
  r = gammaCorrect(r);
  g = gammaCorrect(g);
  b = gammaCorrect(b);
  
  // Calculate luminance using WCAG formula
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/**
 * Determine if text should be white or black based on background color
 * @param backgroundColor - Hex color of the background
 * @returns 'white' or 'black' for optimal contrast
 */
export function getContrastTextColor(backgroundColor: string): 'white' | 'black' {
  const luminance = getLuminance(backgroundColor);
  
  // Using a threshold of 0.5 for practical contrast
  // Most saturated/vibrant colors (even if technically "light") work better with white text
  // Only truly light/pastel colors should have black text
  // This provides better readability for UI elements
  return luminance > 0.5 ? 'black' : 'white';
}

/**
 * Get the hex color value for a theme
 */
export function getThemeColor(theme: string): string {
  const themeColors: Record<string, string> = {
    'purple': '#8b5cf6',
    'ocean-blue': '#0ea5e9',
    'forest-green': '#16a34a',
    'clean-pro-audio': '#e53935',
    'midnight-blue': '#191970',
    'custom-dark': '#161537'  // Added for testing
  };
  
  return themeColors[theme] || '#8b5cf6'; // Default to purple
}

/**
 * Get the appropriate text color for a given theme's primary color
 */
export function getThemeTextColor(theme: string): 'white' | 'black' {
  const themeColor = getThemeColor(theme);
  return getContrastTextColor(themeColor);
}

/**
 * Get the computed CSS variable value for the current theme
 * This gets the actual color being used, which might differ from hardcoded values
 */
export function getComputedThemeColor(): string {
  const computed = getComputedStyle(document.documentElement);
  const color = computed.getPropertyValue('--theme-primary').trim();
  return color || '#8b5cf6'; // fallback to purple if not found
}

/**
 * Get the appropriate text color based on the actual computed theme color
 * This reads the pre-calculated --theme-primary-text CSS variable
 */
export function getComputedThemeTextColor(): 'white' | 'black' {
  const computed = getComputedStyle(document.documentElement);
  const textColor = computed.getPropertyValue('--theme-primary-text').trim();
  
  // Return the computed value if it exists and is valid
  if (textColor === 'white' || textColor === 'black') {
    return textColor as 'white' | 'black';
  }
  
  // Fallback: calculate from the theme color
  const themeColor = getComputedThemeColor();
  return getContrastTextColor(themeColor);
}

/**
 * Update the CSS variables for theme colors and automatically calculate text color
 * This function should be called whenever a custom color is selected
 */
export function updateThemeColors(primaryColor: string) {
  const root = document.documentElement;
  
  // Update the primary color
  root.style.setProperty('--theme-primary', primaryColor);
  
  // Calculate and set the appropriate text color based on luminance
  const textColor = getContrastTextColor(primaryColor);
  root.style.setProperty('--theme-primary-text', textColor);
  
  console.log('Theme colors updated:', {
    primaryColor,
    textColor,
    luminance: getLuminance(primaryColor).toFixed(4)
  });
}