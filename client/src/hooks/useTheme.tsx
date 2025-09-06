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
    description: 'Original professional purple theme with subtle gradient',
    colors: {
      primary: '#8b5cf6',
      secondary: '#a855f7',
      accent: '#6366f1',
      background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
      surface: 'linear-gradient(135deg, #ffffff 0%, #f1f5f9 100%)',
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
    description: 'Calming blue tones with flowing gradient waves',
    colors: {
      primary: '#0ea5e9',
      secondary: '#0284c7',
      accent: '#38bdf8',
      background: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)',
      surface: 'linear-gradient(135deg, #ffffff 0%, #f0f9ff 100%)',
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
    description: 'Natural green with organic gradient textures',
    colors: {
      primary: '#34d399',
      secondary: '#10b981',
      accent: '#22c55e',
      background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)',
      surface: 'linear-gradient(135deg, #ffffff 0%, #f0fdf4 100%)',
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
    description: 'Professional audio theme with smooth gradients',
    colors: {
      primary: '#f87171',
      secondary: '#9ca3af',
      accent: '#ffeb3b',
      background: 'linear-gradient(135deg, #e5e5e5 0%, #d4d4d8 100%)',
      surface: 'linear-gradient(135deg, #fdfdfd 0%, #f4f4f5 100%)',
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
    description: 'Elegant midnight blue with silky gradients',
    colors: {
      primary: '#191970',
      secondary: '#1e1e3f',
      accent: '#4169e1',
      background: 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)',
      surface: 'linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)',
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
    description: 'Personalized theme with smooth gradient backgrounds',
    colors: {
      primary: '#8b5cf6', // Default purple, will be overridden by user selection
      secondary: '#a855f7',
      accent: '#6366f1',
      background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
      surface: 'linear-gradient(135deg, #ffffff 0%, #f1f5f9 100%)',
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
  // Default to midnight-blue for unauthenticated/public pages
  const [currentTheme, setCurrentTheme] = useState<ThemeName>('midnight-blue');
  const [customColor, setCustomColor] = useState<string | null>(null);

  useEffect(() => {
    // Check if we're on a public page that should always use midnight-blue
    const publicPaths = ['/', '/login', '/signup', '/start-trial', '/trial-success', '/sign-contract', '/view-contract'];
    const currentPath = window.location.pathname;
    const isPublicPage = publicPaths.some(path => currentPath === path || currentPath.startsWith(path + '/'));
    
    if (isPublicPage) {
      // Force midnight-blue theme for public pages
      setCurrentTheme('midnight-blue');
      // Clear any saved theme to prevent it from loading
      localStorage.removeItem('musobuddy-theme');
      localStorage.removeItem('musobuddy-custom-color');
      return;
    }
    
    // Load theme from localStorage only for authenticated pages
    const savedTheme = localStorage.getItem('musobuddy-theme') as ThemeName;
    const savedCustomColor = localStorage.getItem('musobuddy-custom-color');
    
    if (savedTheme && themes[savedTheme]) {
      setCurrentTheme(savedTheme);
    }
    if (savedCustomColor) {
      setCustomColor(savedCustomColor);
    }
  }, []);

  // Monitor path changes to enforce theme on navigation
  useEffect(() => {
    const checkPathForTheme = () => {
      const publicPaths = ['/', '/login', '/signup', '/start-trial', '/trial-success', '/sign-contract', '/view-contract'];
      const currentPath = window.location.pathname;
      const isPublicPage = publicPaths.some(path => currentPath === path || currentPath.startsWith(path + '/'));
      
      if (isPublicPage && currentTheme !== 'midnight-blue') {
        console.log('🎨 Enforcing midnight-blue theme for public page:', currentPath);
        setCurrentTheme('midnight-blue');
      }
    };

    // Check on mount and when pathname changes
    checkPathForTheme();
    
    // Listen for navigation changes
    window.addEventListener('popstate', checkPathForTheme);
    return () => window.removeEventListener('popstate', checkPathForTheme);
  }, [currentTheme]);

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
    
    // Handle gradients vs solid colors properly
    root.style.setProperty('--theme-background', theme.colors.background);
    root.style.setProperty('--theme-surface', theme.colors.surface);
    
    root.style.setProperty('--theme-text', theme.colors.text);
    root.style.setProperty('--theme-text-secondary', theme.colors.textSecondary);
    root.style.setProperty('--theme-font-heading', theme.fonts.heading);
    root.style.setProperty('--theme-font-body', theme.fonts.body);
    
    // DYNAMIC TEXT COLOR CALCULATION: Calculate appropriate text color based on luminance
    const primaryTextColor = getContrastTextColor(theme.colors.primary);
    root.style.setProperty('--theme-primary-text', primaryTextColor);
    
    console.log(`🎨 Dynamic text color: ${primaryTextColor} (for ${theme.colors.primary})`);
    
    // Force apply gradients via CSS custom properties
    console.log(`🎨 Theme colors applied via CSS variables - gradients should now be visible`);
    
    // Apply text color and font to body
    document.body.style.color = theme.colors.text;
    document.body.style.fontFamily = theme.fonts.body;
    
    // The CSS now handles gradient application via --theme-background and --theme-surface variables
    // This prevents conflicts and ensures proper theme application

    // IMPROVED: Clean theme class application
    // Remove existing theme classes first
    Object.keys(themes).forEach(themeKey => {
      root.classList.remove(`theme-${themeKey}`);
      document.body.classList.remove(`theme-${themeKey}`);
    });
    
    // Clean up any old dark/light classes
    root.classList.remove('light', 'dark');
    document.body.classList.remove('light', 'dark');
    
    // Add current theme class to both html and body for maximum coverage
    root.classList.add(`theme-${currentTheme}`);
    document.body.classList.add(`theme-${currentTheme}`);
    
    // No mode classes needed - themes are self-contained

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

    // Only save to localStorage for authenticated pages
    const publicPaths = ['/', '/login', '/signup', '/start-trial', '/trial-success', '/sign-contract', '/view-contract'];
    const currentPath = window.location.pathname;
    const isPublicPage = publicPaths.some(path => currentPath === path || currentPath.startsWith(path + '/')) || 
                         (currentPath.includes('/booking/') && currentPath.includes('/collaborate')); // Include collaboration pages
    
    if (!isPublicPage) {
      localStorage.setItem('musobuddy-theme', currentTheme);
      // No longer using mode - themes are self-contained
    }
    
    // Save theme and mode to database for PDF generation (only for authenticated pages)
    const saveThemeToDatabase = async () => {
      if (isPublicPage) {
        console.log('🎨 Skipping theme save for public page');
        return;
      }
      
      // Additional check: Ensure we have Firebase auth before attempting to save
      const { auth } = await import('@/lib/firebase');
      const currentUser = auth.currentUser;
      
      if (!currentUser) {
        // Silently skip theme save when no user authenticated (expected on collaboration pages)
        return;
      }
      
      try {
        const colorToSave = currentTheme === 'custom' && customColor ? customColor : theme.colors.primary;
        console.log('🎨 Attempting to save theme color to database:', colorToSave);
        
        // Use the same auth method as other API calls in the app
        const { apiRequest } = await import('../lib/queryClient');
        const response = await apiRequest('/api/settings', {
          method: 'PATCH',
          body: { 
            themeAccentColor: colorToSave 
          }
        });
        
        if (response.ok) {
          console.log('✅ Theme color saved to database successfully:', colorToSave);
        } else {
          const errorText = await response.text();
          console.error('❌ Failed to save theme color to database:', response.status, errorText);
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
      setCustomColor,
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