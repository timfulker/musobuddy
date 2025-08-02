import { Button } from "@/components/ui/button";
import { useTheme } from "@/hooks/useTheme";
import { Palette, Zap } from "lucide-react";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => setTheme(theme === "purple" ? "basecamp" : "purple")}
      className="h-9 w-9 px-0"
    >
      {theme === "purple" ? (
        <Zap className="h-4 w-4 text-yellow-600" />
      ) : (
        <Palette className="h-4 w-4 text-purple-600" />
      )}
      <span className="sr-only">Toggle theme</span>
    </Button>
  );
}