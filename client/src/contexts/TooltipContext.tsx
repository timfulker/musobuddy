import React, { createContext, useContext, useState, useEffect } from 'react';

interface HelpTooltipContextType {
  tooltipsEnabled: boolean;
  toggleTooltips: () => void;
  setTooltipsEnabled: (enabled: boolean) => void;
}

const HelpTooltipContext = createContext<HelpTooltipContextType | undefined>(undefined);

export function HelpTooltipProvider({ children }: { children: React.ReactNode }) {
  // Load tooltip preference from localStorage, default to true for new users
  const [tooltipsEnabled, setTooltipsEnabled] = useState<boolean>(() => {
    const saved = localStorage.getItem('musobuddy-tooltips-enabled');
    return saved === null ? true : saved === 'true';
  });

  // Save to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('musobuddy-tooltips-enabled', String(tooltipsEnabled));
  }, [tooltipsEnabled]);

  const toggleTooltips = () => {
    setTooltipsEnabled(prev => !prev);
  };

  return (
    <HelpTooltipContext.Provider value={{ tooltipsEnabled, toggleTooltips, setTooltipsEnabled }}>
      {children}
    </HelpTooltipContext.Provider>
  );
}

export function useHelpTooltips() {
  const context = useContext(HelpTooltipContext);
  if (context === undefined) {
    throw new Error('useHelpTooltips must be used within a HelpTooltipProvider');
  }
  return context;
}
