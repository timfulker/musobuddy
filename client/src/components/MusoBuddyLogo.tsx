import { useTheme } from '@/hooks/useTheme';

interface MusoBuddyLogoProps {
  size?: 'small' | 'medium' | 'large';
  showTagline?: boolean;
  iconOnly?: boolean;
  className?: string;
}

export function MusoBuddyLogo({ 
  size = 'medium', 
  showTagline = true, 
  iconOnly = false,
  className = '' 
}: MusoBuddyLogoProps) {
  const { currentTheme } = useTheme();

  // Theme-specific colors
  const getThemeColors = () => {
    switch (currentTheme) {
      case 'purple':
        return {
          primary: '#8b5cf6',
          secondary: '#a855f7',
          text: '#8b5cf6'
        };
      case 'midnight-blue':
        return {
          primary: '#191970',
          secondary: '#1e3a8a',
          text: '#191970'
        };
      case 'ocean-blue':
        return {
          primary: '#0ea5e9',
          secondary: '#0284c7',
          text: '#0ea5e9'
        };
      case 'forest-green':
        return {
          primary: '#10b981',
          secondary: '#059669',
          text: '#10b981'
        };
      case 'clean-pro-audio':
        return {
          primary: '#6b7280',
          secondary: '#ef4444',
          text: '#374151'
        };
      default:
        return {
          primary: '#8b5cf6',
          secondary: '#a855f7',
          text: '#8b5cf6'
        };
    }
  };

  const colors = getThemeColors();

  // Size configurations
  const sizeConfig = {
    small: {
      container: 'gap-2',
      icon: 'w-10 h-10',
      iconRadius: 'rounded-lg',
      bodySize: 'w-3.5 h-5.5',
      armSize: 'w-0.5 h-3.5',
      armTop: 'top-1',
      textSize: 'text-lg',
      taglineSize: 'text-[10px]',
      taglineMargin: 'mt-0.5'
    },
    medium: {
      container: 'gap-3',
      icon: 'w-16 h-16',
      iconRadius: 'rounded-xl',
      bodySize: 'w-5 h-8',
      armSize: 'w-0.5 h-5',
      armTop: 'top-1.5',
      textSize: 'text-2xl',
      taglineSize: 'text-xs',
      taglineMargin: 'mt-1'
    },
    large: {
      container: 'gap-5',
      icon: 'w-20 h-20',
      iconRadius: 'rounded-2xl',
      bodySize: 'w-7 h-11',
      armSize: 'w-1 h-7',
      armTop: 'top-2',
      textSize: 'text-4xl',
      taglineSize: 'text-sm',
      taglineMargin: 'mt-1'
    }
  };

  const config = sizeConfig[size];

  if (iconOnly) {
    return (
      <div className={className}>
        <div 
          className={`${config.icon} ${config.iconRadius} flex items-center justify-center relative shadow-lg`}
          style={{ 
            background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.secondary} 100%)` 
          }}
        >
          <div 
            className={`${config.bodySize} bg-white relative`}
            style={{ clipPath: 'polygon(25% 0%, 75% 0%, 100% 100%, 0% 100%)' }}
          >
            <div 
              className={`absolute ${config.armTop} left-1/2 transform -translate-x-1/2 ${config.armSize} rounded-sm`}
              style={{ 
                background: colors.primary,
                transformOrigin: 'bottom',
                animation: 'metronome-tick 1.2s ease-in-out infinite alternate'
              }}
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`inline-flex items-center ${config.container} ${className}`}>
      <div 
        className={`${config.icon} ${config.iconRadius} flex items-center justify-center relative shadow-lg`}
        style={{ 
          background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.secondary} 100%)` 
        }}
      >
        <div 
          className={`${config.bodySize} bg-white relative`}
          style={{ clipPath: 'polygon(25% 0%, 75% 0%, 100% 100%, 0% 100%)' }}
        >
          <div 
            className={`absolute ${config.armTop} left-1/2 transform -translate-x-1/2 ${config.armSize} rounded-sm`}
            style={{ 
              background: colors.primary,
              transformOrigin: 'bottom',
              animation: 'metronome-tick 1.2s ease-in-out infinite alternate'
            }}
          />
        </div>
      </div>
      <div className="text-left">
        <div 
          className={`${config.textSize} font-bold leading-none`}
          style={{ color: colors.text }}
        >
          MusoBuddy
        </div>
        {showTagline && (
          <div className={`${config.taglineSize} text-gray-500 font-medium italic ${config.taglineMargin}`}>
            Less admin, more music
          </div>
        )}
      </div>

    </div>
  );
}