import { createContext, useContext, useEffect, useState } from "react";

type Theme = "purple" | "basecamp";
type ThemeProviderProps = {
  children: React.ReactNode;
  defaultTheme?: Theme;
  storageKey?: string;
};

type ThemeProviderState = {
  theme: Theme;
  setTheme: (theme: Theme) => void;
};

const initialState: ThemeProviderState = {
  theme: "purple",
  setTheme: () => null,
};

const ThemeProviderContext = createContext<ThemeProviderState>(initialState);

export function ThemeProvider({
  children,
  defaultTheme = "purple",
  storageKey = "musobuddy-theme",
  ...props
}: ThemeProviderProps) {
  const [theme, setTheme] = useState<Theme>(
    () => (localStorage.getItem(storageKey) as Theme) || defaultTheme
  );

  useEffect(() => {
    const root = window.document.documentElement;
    
    // Remove all theme classes first
    root.classList.remove("purple-theme", "basecamp-theme");
    
    // Apply the selected theme
    if (theme === "basecamp") {
      root.classList.add("basecamp-theme");
    } else {
      root.classList.add("purple-theme");
    }
  }, [theme]);

  // Set initial theme on mount
  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.add("purple-theme");
  }, []);

  const value = {
    theme,
    setTheme: (theme: Theme) => {
      localStorage.setItem(storageKey, theme);
      setTheme(theme);
    },
  };

  return (
    <ThemeProviderContext.Provider {...props} value={value}>
      {children}
    </ThemeProviderContext.Provider>
  );
}

export const useTheme = () => {
  const context = useContext(ThemeProviderContext);

  if (context === undefined)
    throw new Error("useTheme must be used within a ThemeProvider");

  return context;
};