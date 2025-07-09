import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Palette, Check } from 'lucide-react';

interface Theme {
  id: string;
  name: string;
  description: string;
  inspiration: string;
  preview: string;
  colors: {
    primary: string;
    background: string;
    accent: string;
  };
}

const themes: Theme[] = [
  {
    id: 'default',
    name: 'MusoBuddy Classic',
    description: 'Current purple theme with warm, musician-friendly vibes',
    inspiration: 'Original',
    preview: 'Modern purple with warm undertones',
    colors: {
      primary: '#8B5CF6',
      background: '#FFFFFF',
      accent: '#F3F4F6'
    }
  },
  {
    id: 'superhuman',
    name: 'Superhuman Pro',
    description: 'Clean, high-performance interface with premium feel',
    inspiration: 'Superhuman',
    preview: 'Crisp blacks and whites with blue accents',
    colors: {
      primary: '#2563EB',
      background: '#FFFFFF',
      accent: '#F8FAFC'
    }
  },
  {
    id: 'framer',
    name: 'Framer Studio',
    description: 'Bold, modern design with strong contrasts',
    inspiration: 'Framer',
    preview: 'Deep blacks with vibrant purple highlights',
    colors: {
      primary: '#6366F1',
      background: '#FFFFFF',
      accent: '#F1F5F9'
    }
  },
  {
    id: 'linear',
    name: 'Linear Focus',
    description: 'Minimal, productivity-focused interface',
    inspiration: 'Linear',
    preview: 'Subtle grays with focused blue actions',
    colors: {
      primary: '#3B82F6',
      background: '#FAFAFA',
      accent: '#F4F4F5'
    }
  },
  {
    id: 'soundtrap',
    name: 'Music Studio',
    description: 'Creative, music-industry inspired colors',
    inspiration: 'Soundtrap',
    preview: 'Warm oranges and deep teals',
    colors: {
      primary: '#F59E0B',
      background: '#FFFFFF',
      accent: '#FEF3C7'
    }
  },
  {
    id: 'bandzoogle',
    name: 'Band Manager',
    description: 'Rock-solid, professional musician branding',
    inspiration: 'Bandzoogle',
    preview: 'Strong reds with professional grays',
    colors: {
      primary: '#DC2626',
      background: '#FFFFFF',
      accent: '#FEF2F2'
    }
  }
];

export function ThemeSelector() {
  const [selectedTheme, setSelectedTheme] = useState('default');
  const [open, setOpen] = useState(false);

  const applyTheme = (theme: Theme) => {
    const root = document.documentElement;
    console.log('Applying theme:', theme.name, 'ID:', theme.id);
    
    switch (theme.id) {
      case 'superhuman':
        // Clean, high-performance blue theme
        root.style.setProperty('--primary', '214 87% 56%');
        root.style.setProperty('--primary-foreground', '0 0% 98%');
        root.style.setProperty('--background', '0 0% 100%');
        root.style.setProperty('--foreground', '220 9% 12%');
        root.style.setProperty('--muted', '220 14% 96%');
        root.style.setProperty('--muted-foreground', '220 8% 46%');
        root.style.setProperty('--accent', '220 14% 96%');
        root.style.setProperty('--accent-foreground', '220 9% 12%');
        root.style.setProperty('--border', '220 13% 91%');
        root.style.setProperty('--input', '220 13% 91%');
        root.style.setProperty('--card', '0 0% 100%');
        root.style.setProperty('--card-foreground', '220 9% 12%');
        root.style.setProperty('--sidebar-background', '220 14% 98%');
        root.style.setProperty('--sidebar-primary', '214 87% 56%');
        root.style.setProperty('--sidebar-foreground', '220 9% 12%');
        root.style.setProperty('--sidebar-accent', '220 14% 96%');
        root.style.setProperty('--sidebar-accent-foreground', '220 9% 12%');
        root.style.setProperty('--sidebar-border', '220 13% 91%');
        root.style.setProperty('--sidebar-ring', '214 87% 56%');
        root.style.setProperty('--ring', '214 87% 56%');
        root.style.setProperty('--secondary', '220 14% 96%');
        root.style.setProperty('--secondary-foreground', '220 9% 12%');
        break;
        
      case 'framer':
        // Bold, modern design with strong contrasts
        root.style.setProperty('--primary', '262 83% 58%');
        root.style.setProperty('--primary-foreground', '0 0% 98%');
        root.style.setProperty('--background', '0 0% 100%');
        root.style.setProperty('--foreground', '0 0% 5%');
        root.style.setProperty('--muted', '240 5% 96%');
        root.style.setProperty('--muted-foreground', '240 4% 46%');
        root.style.setProperty('--accent', '240 5% 96%');
        root.style.setProperty('--accent-foreground', '0 0% 5%');
        root.style.setProperty('--border', '240 6% 90%');
        root.style.setProperty('--input', '240 6% 90%');
        root.style.setProperty('--card', '0 0% 100%');
        root.style.setProperty('--card-foreground', '0 0% 5%');
        root.style.setProperty('--sidebar-background', '240 5% 98%');
        root.style.setProperty('--sidebar-primary', '262 83% 58%');
        root.style.setProperty('--sidebar-foreground', '0 0% 5%');
        root.style.setProperty('--sidebar-accent', '240 5% 96%');
        root.style.setProperty('--sidebar-accent-foreground', '0 0% 5%');
        root.style.setProperty('--sidebar-border', '240 6% 90%');
        root.style.setProperty('--sidebar-ring', '262 83% 58%');
        root.style.setProperty('--ring', '262 83% 58%');
        root.style.setProperty('--secondary', '240 5% 96%');
        root.style.setProperty('--secondary-foreground', '0 0% 5%');
        break;
        
      case 'linear':
        // Minimal, productivity-focused interface
        root.style.setProperty('--primary', '214 95% 64%');
        root.style.setProperty('--primary-foreground', '0 0% 98%');
        root.style.setProperty('--background', '0 0% 98%');
        root.style.setProperty('--foreground', '240 6% 22%');
        root.style.setProperty('--muted', '240 5% 96%');
        root.style.setProperty('--muted-foreground', '240 4% 46%');
        root.style.setProperty('--accent', '240 5% 96%');
        root.style.setProperty('--accent-foreground', '240 6% 22%');
        root.style.setProperty('--border', '240 6% 90%');
        root.style.setProperty('--input', '240 6% 90%');
        root.style.setProperty('--card', '0 0% 100%');
        root.style.setProperty('--card-foreground', '240 6% 22%');
        root.style.setProperty('--sidebar-background', '240 5% 99%');
        root.style.setProperty('--sidebar-primary', '214 95% 64%');
        root.style.setProperty('--sidebar-foreground', '240 6% 22%');
        root.style.setProperty('--sidebar-accent', '240 5% 96%');
        root.style.setProperty('--sidebar-accent-foreground', '240 6% 22%');
        root.style.setProperty('--sidebar-border', '240 6% 90%');
        root.style.setProperty('--sidebar-ring', '214 95% 64%');
        root.style.setProperty('--ring', '214 95% 64%');
        root.style.setProperty('--secondary', '240 5% 96%');
        root.style.setProperty('--secondary-foreground', '240 6% 22%');
        break;
        
      case 'soundtrap':
        // Creative, music-industry inspired colors
        root.style.setProperty('--primary', '43 96% 56%');
        root.style.setProperty('--primary-foreground', '0 0% 98%');
        root.style.setProperty('--background', '0 0% 100%');
        root.style.setProperty('--foreground', '20 14% 4%');
        root.style.setProperty('--muted', '43 100% 96%');
        root.style.setProperty('--muted-foreground', '43 8% 46%');
        root.style.setProperty('--accent', '43 100% 96%');
        root.style.setProperty('--accent-foreground', '20 14% 4%');
        root.style.setProperty('--border', '43 20% 90%');
        root.style.setProperty('--input', '43 20% 90%');
        root.style.setProperty('--card', '0 0% 100%');
        root.style.setProperty('--card-foreground', '20 14% 4%');
        root.style.setProperty('--sidebar-background', '43 100% 98%');
        root.style.setProperty('--sidebar-primary', '43 96% 56%');
        root.style.setProperty('--sidebar-foreground', '20 14% 4%');
        root.style.setProperty('--sidebar-accent', '43 100% 96%');
        root.style.setProperty('--sidebar-accent-foreground', '20 14% 4%');
        root.style.setProperty('--sidebar-border', '43 20% 90%');
        root.style.setProperty('--sidebar-ring', '43 96% 56%');
        root.style.setProperty('--ring', '43 96% 56%');
        root.style.setProperty('--secondary', '43 100% 96%');
        root.style.setProperty('--secondary-foreground', '20 14% 4%');
        break;
        
      case 'bandzoogle':
        // Rock-solid, professional musician branding
        root.style.setProperty('--primary', '0 84% 60%');
        root.style.setProperty('--primary-foreground', '0 0% 98%');
        root.style.setProperty('--background', '0 0% 100%');
        root.style.setProperty('--foreground', '0 0% 15%');
        root.style.setProperty('--muted', '0 100% 96%');
        root.style.setProperty('--muted-foreground', '0 8% 46%');
        root.style.setProperty('--accent', '0 100% 96%');
        root.style.setProperty('--accent-foreground', '0 0% 15%');
        root.style.setProperty('--border', '0 20% 90%');
        root.style.setProperty('--input', '0 20% 90%');
        root.style.setProperty('--card', '0 0% 100%');
        root.style.setProperty('--card-foreground', '0 0% 15%');
        root.style.setProperty('--sidebar-background', '0 100% 98%');
        root.style.setProperty('--sidebar-primary', '0 84% 60%');
        root.style.setProperty('--sidebar-foreground', '0 0% 15%');
        root.style.setProperty('--sidebar-accent', '0 100% 96%');
        root.style.setProperty('--sidebar-accent-foreground', '0 0% 15%');
        root.style.setProperty('--sidebar-border', '0 20% 90%');
        root.style.setProperty('--sidebar-ring', '0 84% 60%');
        root.style.setProperty('--ring', '0 84% 60%');
        root.style.setProperty('--secondary', '0 100% 96%');
        root.style.setProperty('--secondary-foreground', '0 0% 15%');
        break;
        
      default: // MusoBuddy Classic
        root.style.setProperty('--primary', '271 81% 56%');
        root.style.setProperty('--primary-foreground', '0 0% 98%');
        root.style.setProperty('--background', '0 0% 100%');
        root.style.setProperty('--foreground', '20 14% 4%');
        root.style.setProperty('--muted', '60 5% 96%');
        root.style.setProperty('--muted-foreground', '25 5% 45%');
        root.style.setProperty('--accent', '60 5% 96%');
        root.style.setProperty('--accent-foreground', '24 10% 10%');
        root.style.setProperty('--border', '20 6% 90%');
        root.style.setProperty('--input', '20 6% 90%');
        root.style.setProperty('--card', '0 0% 100%');
        root.style.setProperty('--card-foreground', '20 14% 4%');
        root.style.setProperty('--sidebar-background', '0 0% 98%');
        root.style.setProperty('--sidebar-primary', '271 81% 56%');
        root.style.setProperty('--sidebar-foreground', '240 5% 26%');
        root.style.setProperty('--sidebar-accent', '60 5% 96%');
        root.style.setProperty('--sidebar-accent-foreground', '240 6% 10%');
        root.style.setProperty('--sidebar-border', '220 13% 91%');
        root.style.setProperty('--sidebar-ring', '271 81% 56%');
        root.style.setProperty('--ring', '271 81% 56%');
        root.style.setProperty('--secondary', '60 5% 96%');
        root.style.setProperty('--secondary-foreground', '24 10% 10%');
        break;
    }
    
    setSelectedTheme(theme.id);
    
    // Save to localStorage
    localStorage.setItem('musobuddy-theme', theme.id);
    
    // Log what was set
    console.log('CSS Variables set:', {
      primary: root.style.getPropertyValue('--primary'),
      background: root.style.getPropertyValue('--background'),
      foreground: root.style.getPropertyValue('--foreground')
    });
    
    // Force a slight delay to ensure CSS variables are applied
    setTimeout(() => {
      // Trigger a re-render by updating a data attribute
      document.documentElement.setAttribute('data-theme', theme.id);
      // Force a repaint by temporarily changing a harmless style
      document.body.style.transform = 'translateZ(0)';
      setTimeout(() => {
        document.body.style.transform = '';
      }, 10);
    }, 50);
  };

  // Load saved theme on mount
  React.useEffect(() => {
    const savedTheme = localStorage.getItem('musobuddy-theme');
    if (savedTheme) {
      const theme = themes.find(t => t.id === savedTheme);
      if (theme) {
        applyTheme(theme);
      }
    }
  }, []);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Palette className="h-4 w-4" />
          Theme
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto bg-background border shadow-lg">
        <DialogHeader className="pb-4">
          <DialogTitle className="text-2xl font-bold">Choose Your Theme</DialogTitle>
        </DialogHeader>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
          {themes.map((theme) => (
            <Card 
              key={theme.id} 
              className={`cursor-pointer transition-all hover:shadow-lg ${
                selectedTheme === theme.id ? 'ring-2 ring-primary' : ''
              }`}
              onClick={() => {
                applyTheme(theme);
                // Don't close immediately to let user see the change
                setTimeout(() => setOpen(false), 200);
              }}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{theme.name}</CardTitle>
                  {selectedTheme === theme.id && (
                    <Check className="h-5 w-5 text-primary" />
                  )}
                </div>
                <CardDescription>{theme.description}</CardDescription>
                <Badge variant="outline" className="w-fit text-xs">
                  Inspired by {theme.inspiration}
                </Badge>
              </CardHeader>
              
              <CardContent className="space-y-4">
                <div className="text-sm text-muted-foreground">
                  {theme.preview}
                </div>
                
                {/* Color Preview */}
                <div className="flex gap-2">
                  <div 
                    className="w-6 h-6 rounded-full border border-border"
                    style={{ backgroundColor: theme.colors.primary }}
                    title="Primary"
                  />
                  <div 
                    className="w-6 h-6 rounded-full border border-border"
                    style={{ backgroundColor: theme.colors.background }}
                    title="Background"
                  />
                  <div 
                    className="w-6 h-6 rounded-full border border-border"
                    style={{ backgroundColor: theme.colors.accent }}
                    title="Accent"
                  />
                </div>
                
                {/* Mini Preview */}
                <div className="border rounded-lg p-3 bg-card">
                  <div className="flex items-center gap-2 mb-2">
                    <div 
                      className="w-3 h-3 rounded"
                      style={{ backgroundColor: theme.colors.primary }}
                    />
                    <div className="text-xs font-medium">MusoBuddy</div>
                  </div>
                  <div className="space-y-1">
                    <div className="h-2 bg-muted rounded w-full" />
                    <div className="h-2 bg-muted rounded w-3/4" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        
        <div className="mt-6 flex justify-end">
          <Button onClick={() => setOpen(false)}>Done</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}