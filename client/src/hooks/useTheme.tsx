import React, { createContext, useContext, useEffect, useState } from 'react';

export type ThemeName = 'purple' | 'retro-vinyl' | 'ocean-blue' | 'forest-green';

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
      primary: '#673ab7',
      secondary: '#9c27b0',
      accent: '#3f51b5',
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
  'retro-vinyl': {
    id: 'retro-vinyl',
    name: 'Retro Vinyl',
    description: 'Warm vintage aesthetic with cream and orange tones',
    colors: {
      primary: '#d17b0f',
      secondary: '#578d8c',
      accent: '#c9e3d4',
      background: '#f5e9dc',
      surface: '#ffffff',
      text: '#40342a',
      textSecondary: '#6b5b4e'
    },
    fonts: {
      heading: '"DM Serif Display", serif',
      body: '"Work Sans", sans-serif'
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
      primary: '#16a34a',
      secondary: '#15803d',
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
  }
};

interface ThemeContextType {
  currentTheme: ThemeName;
  setTheme: (theme: ThemeName) => void;
  theme: Theme;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [currentTheme, setCurrentTheme] = useState<ThemeName>('purple');

  useEffect(() => {
    // Load theme from localStorage
    const savedTheme = localStorage.getItem('musobuddy-theme') as ThemeName;
    if (savedTheme && themes[savedTheme]) {
      setCurrentTheme(savedTheme);
    }
  }, []);

  useEffect(() => {
    // Apply theme CSS variables
    const theme = themes[currentTheme];
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

    // Add theme class for conditional styling to both html and body
    // Remove existing theme classes first
    Object.keys(themes).forEach(themeKey => {
      root.classList.remove(`theme-${themeKey}`);
      document.body.classList.remove(`theme-${themeKey}`);
    });
    
    // Add current theme class
    root.classList.add(`theme-${currentTheme}`);
    document.body.classList.add(`theme-${currentTheme}`);

    // Save to localStorage
    localStorage.setItem('musobuddy-theme', currentTheme);
  }, [currentTheme]);

  const setTheme = (theme: ThemeName) => {
    console.log(`🎨 Theme switching from ${currentTheme} to ${theme}`);
    setCurrentTheme(theme);
  };

  return (
    <ThemeContext.Provider value={{ 
      currentTheme, 
      setTheme, 
      theme: themes[currentTheme] 
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