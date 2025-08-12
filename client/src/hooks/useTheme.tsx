import React, { createContext, useContext, useEffect, useState } from 'react';
import { getContrastTextColor } from '@/lib/colorUtils';

export type ThemeName = 'purple' | 'ocean-blue' | 'forest-green' | 'clean-pro-audio' | 'midnight-blue' | 'custom';

export interface Theme {
  id: ThemeName;
  name: string;
  description: string;
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    surface: string;
    text: string;
    textSecondary: string;
  };
  fonts: {
    heading: string;
    body: string;
  };
}

export const themes: Record<ThemeName, Theme> = {
  'purple': {
    id: 'purple',
    name: 'Classic Purple',
    description: 'Original professional purple theme',
    colors: {
      primary: '#8b5cf6',
      secondary: '#a855f7',
      accent: '#6366f1',
      background: '#f8fafc',
      surface: '#ffffff',
      text: '#1e293b',
      textSecondary: '#64748b'
    },
    fonts: {
      heading: 'system-ui, sans-serif',
      body: 'system-ui, sans-serif'
    }
  },

  'ocean-blue': {
    id: 'ocean-blue',
    name: 'Ocean Blue',
    description: 'Calming blue tones inspired by the sea',
    colors: {
      primary: '#0ea5e9',
      secondary: '#0284c7',
      accent: '#38bdf8',
      background: '#f0f9ff',
      surface: '#ffffff',
      text: '#0c4a6e',
      textSecondary: '#075985'
    },
    fonts: {
      heading: 'system-ui, sans-serif',
      body: 'system-ui, sans-serif'
    }
  },
  'forest-green': {
    id: 'forest-green',
    name: 'Forest Green',
    description: 'Natural green theme for outdoor musicians',
    colors: {
      primary: '#34d399',
      secondary: '#10b981',
      accent: '#22c55e',
      background: '#f0fdf4',
      surface: '#ffffff',
      text: '#14532d',
      textSecondary: '#166534'
    },
    fonts: {
      heading: 'system-ui, sans-serif',
      body: 'system-ui, sans-serif'
    }
  },
  'clean-pro-audio': {
    id: 'clean-pro-audio',
    name: 'Clean Pro Audio',
    description: 'Clean industrial theme with professional audio aesthetics',
    colors: {
      primary: '#f87171',
      secondary: '#9ca3af',
      accent: '#ffeb3b',
      background: '#e5e5e5',
      surface: '#fdfdfd',
      text: '#2c2c2c',
      textSecondary: '#555555'
    },
    fonts: {
      heading: 'IBM Plex Sans, sans-serif',
      body: 'IBM Plex Sans, sans-serif'
    }
  },
  'midnight-blue': {
    id: 'midnight-blue',
    name: 'Midnight Blue',
    description: 'Deep midnight blue theme for sophisticated elegance',
    colors: {
      primary: '#191970',
      secondary: '#1e1e3f',
      accent: '#4169e1',
      background: '#f8f9fa',
      surface: '#ffffff',
      text: '#1a1a1a',
      textSecondary: '#4a5568'
    },
    fonts: {
      heading: 'system-ui, sans-serif',
      body: 'system-ui, sans-serif'
    }
  },
  'custom': {
    id: 'custom',
    name: 'Custom Color',
    description: 'Choose your own custom accent color',
    colors: {
      primary: '#8b5cf6', // Default purple, will be overridden by user selection
      secondary: '#a855f7',
      accent: '#6366f1',
      background: '#f8fafc',
      surface: '#ffffff',
      text: '#1e293b',
      textSecondary: '#64748b'
    },
    fonts: {
      heading: 'system-ui, sans-serif',
      body: 'system-ui, sans-serif'
    }
  }
};

interface ThemeContextType {
  currentTheme: ThemeName;
  setTheme: (theme: ThemeName) => void;
  theme: Theme;
  customColor: string | null;
  setCustomColor: (color: string) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [currentTheme, setCurrentTheme] = useState<ThemeName>('purple');
  const [customColor, setCustomColor] = useState<string | null>(null);

  useEffect(() => {
    // Load theme from localStorage
    const savedTheme = localStorage.getItem('musobuddy-theme') as ThemeName;
    const savedCustomColor = localStorage.getItem('musobuddy-custom-color');
    
    if (savedTheme && themes[savedTheme]) {
      setCurrentTheme(savedTheme);
    }
    if (savedCustomColor) {
      setCustomColor(savedCustomColor);
    }
  }, []);

  useEffect(() => {
    // Apply theme CSS variables
    const theme = { ...themes[currentTheme] };
    
    // If it's a custom theme and we have a custom color, override the primary color
    if (currentTheme === 'custom' && customColor) {
      theme.colors.primary = customColor;
      // Also adjust secondary color to be a slightly darker version
      theme.colors.secondary = customColor + '88'; // Add transparency
    }
    
    const root = document.documentElement;
    
    // Set CSS custom properties
    console.log(`🎨 Applying theme: ${currentTheme}`, theme.colors);
    root.style.setProperty('--theme-primary', theme.colors.primary);
    root.style.setProperty('--theme-secondary', theme.colors.secondary);
    root.style.setProperty('--theme-accent', theme.colors.accent);
    root.style.setProperty('--theme-background', theme.colors.background);
    root.style.setProperty('--theme-surface', theme.colors.surface);
    root.style.setProperty('--theme-text', theme.colors.text);
    root.style.setProperty('--theme-text-secondary', theme.colors.textSecondary);
    root.style.setProperty('--theme-font-heading', theme.fonts.heading);
    root.style.setProperty('--theme-font-body', theme.fonts.body);
    
    // DYNAMIC TEXT COLOR CALCULATION: Calculate appropriate text color based on luminance
    const primaryTextColor = getContrastTextColor(theme.colors.primary);
    root.style.setProperty('--theme-primary-text', primaryTextColor);
    
    console.log(`🎨 Dynamic text color: ${primaryTextColor} (for ${theme.colors.primary})`);;
    
    // Force apply background color immediately to body
    document.body.style.backgroundColor = theme.colors.background;
    document.body.style.color = theme.colors.text;
    document.body.style.fontFamily = theme.fonts.body;
    
    // Force apply to main app container
    const appContainer = document.querySelector('.min-h-screen');
    if (appContainer) {
      (appContainer as HTMLElement).style.backgroundColor = theme.colors.background;
      (appContainer as HTMLElement).style.color = theme.colors.text;
    }

    // IMPROVED: Clean theme class application
    // Remove existing theme classes first
    Object.keys(themes).forEach(themeKey => {
      root.classList.remove(`theme-${themeKey}`);
      document.body.classList.remove(`theme-${themeKey}`);
    });
    
    // Add current theme class to both html and body for maximum coverage
    root.classList.add(`theme-${currentTheme}`);
    document.body.classList.add(`theme-${currentTheme}`);

    // CRITICAL: Force refresh sidebar navigation colors after theme change
    setTimeout(() => {
      const sidebarItems = document.querySelectorAll('[data-sidebar="menu-button"], .sidebar nav a, .sidebar nav button');
      sidebarItems.forEach((item) => {
        const element = item as HTMLElement;
        // Force recomputation of styles
        element.style.display = 'none';
        element.offsetHeight; // Trigger reflow
        element.style.display = '';
      });
    }, 10);

    // Save to localStorage
    localStorage.setItem('musobuddy-theme', currentTheme);
    
    // CRITICAL FIX: Also save theme color to database for PDF generation
    const saveThemeToDatabase = async () => {
      try {
        const colorToSave = currentTheme === 'custom' && customColor ? customColor : theme.colors.primary;
        
        // Use JWT token from localStorage for API authentication
        const token = localStorage.getItem('authToken');
        const response = await fetch('/api/settings', {
          method: 'PATCH',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ 
            themeAccentColor: colorToSave 
          })
        });
        
        if (response.ok) {
          console.log('✅ Theme color saved to database:', colorToSave);
        } else {
          console.error('❌ Failed to save theme color to database');
        }
      } catch (error) {
        console.error('❌ Error saving theme color to database:', error);
      }
    };
    
    // Save theme color to database (with small delay to avoid rapid API calls)
    const saveTimer = setTimeout(saveThemeToDatabase, 1000);
    return () => clearTimeout(saveTimer);
  }, [currentTheme, customColor]);

  // Save custom color to localStorage when it changes
  useEffect(() => {
    if (customColor) {
      localStorage.setItem('musobuddy-custom-color', customColor);
    }
  }, [customColor]);

  const setTheme = (theme: ThemeName) => {
    console.log(`🎨 Theme switching from ${currentTheme} to ${theme}`);
    setCurrentTheme(theme);
  };

  return (
    <ThemeContext.Provider value={{ 
      currentTheme, 
      setTheme, 
      theme: currentTheme === 'custom' && customColor ? 
        { ...themes[currentTheme], colors: { ...themes[currentTheme].colors, primary: customColor } } : 
        themes[currentTheme],
      customColor,
      setCustomColor
    }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}