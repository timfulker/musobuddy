import { Moon, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTheme } from '@/hooks/useTheme';

export function ThemeToggle() {
  const { currentTheme, toggleDarkMode } = useTheme();
  const isDark = currentTheme.endsWith('-dark');

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleDarkMode}
      className="w-9 h-9"
      title={`Switch to ${isDark ? 'light' : 'dark'} mode`}
    >
      <Moon className={`h-4 w-4 transition-all ${isDark ? 'rotate-0 scale-100' : '-rotate-90 scale-0'}`} />
      <Sun className={`absolute h-4 w-4 transition-all ${isDark ? 'rotate-90 scale-0' : 'rotate-0 scale-100'}`} />
      <span className="sr-only">Toggle theme</span>
    </Button>
  );
}