import { useTheme } from '@/hooks/useTheme';

interface MusoBuddyLogoProps {
  size?: 'small' | 'medium' | 'large';
  showTagline?: boolean;
  iconOnly?: boolean;
  className?: string;
  showBetaBadge?: boolean;
}

export function MusoBuddyLogo({
  size = 'medium',
  showTagline = true,
  iconOnly = false,
  className = '',
  showBetaBadge = true
}: MusoBuddyLogoProps) {
  const { currentTheme } = useTheme();

  // Use consistent midnight blue for MusoBuddy logo (brand consistency)
  const colors = {
    primary: '#191970', // Midnight blue - consistent branding
    secondary: '#1e3a8a' // Darker blue
  };

  // Size configurations
  const sizeConfig = {
    small: {
      icon: 40,
      iconRadius: 8,
      metronomeBody: { width: 14, height: 22 },
      metronomeArm: { width: 1.5, height: 14, top: 4 },
      text: 18,
      tagline: 10,
      gap: 10
    },
    medium: {
      icon: 60,
      iconRadius: 12,
      metronomeBody: { width: 20, height: 32 },
      metronomeArm: { width: 2, height: 20, top: 6 },
      text: 24,
      tagline: 12,
      gap: 15
    },
    large: {
      icon: 80,
      iconRadius: 20,
      metronomeBody: { width: 28, height: 45 },
      metronomeArm: { width: 3, height: 28, top: 8 },
      text: 36,
      tagline: 14,
      gap: 20
    }
  };

  const config = sizeConfig[size];

  // Animation keyframes
  const tickAnimation = `
    @keyframes tick {
      0% { transform: translateX(-50%) rotate(-18deg); }
      100% { transform: translateX(-50%) rotate(18deg); }
    }
  `;

  const MetronomeIcon = () => (
    <div
      style={{
        width: config.icon,
        height: config.icon,
        background: colors.primary,
        borderRadius: config.iconRadius,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        boxShadow: `0 ${config.icon * 0.1}px ${config.icon * 0.3}px ${colors.primary}40`,
        flexShrink: 0
      }}
    >
      {/* Metronome Body */}
      <div
        style={{
          width: config.metronomeBody.width,
          height: config.metronomeBody.height,
          background: 'white',
          clipPath: 'polygon(25% 0%, 75% 0%, 100% 100%, 0% 100%)',
          position: 'relative'
        }}
      >
        {/* Metronome Arm */}
        <div
          style={{
            position: 'absolute',
            top: config.metronomeArm.top,
            left: '50%',
            transform: 'translateX(-50%)',
            width: config.metronomeArm.width,
            height: config.metronomeArm.height,
            background: colors.primary,
            transformOrigin: 'bottom',
            animation: 'tick 1.2s ease-in-out infinite alternate',
            borderRadius: 1
          }}
        />
      </div>
      <style dangerouslySetInnerHTML={{ __html: tickAnimation }} />
    </div>
  );

  if (iconOnly) {
    return (
      <div className={className}>
        <MetronomeIcon />
      </div>
    );
  }

  return (
    <div
      className={className}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: config.gap,
        position: 'relative'
      }}
    >
      <MetronomeIcon />

      <div style={{ textAlign: 'left' }}>
        <div
          style={{
            fontSize: config.text,
            fontWeight: 700,
            color: colors.primary,
            letterSpacing: -1,
            lineHeight: 1,
            marginBottom: showTagline ? 4 : 0,
            display: 'flex',
            alignItems: 'center',
            gap: 8
          }}
        >
          MusoBuddy
          {showBetaBadge && (
            <span
              style={{
                fontSize: config.tagline,
                fontWeight: 600,
                color: '#ffffff',
                backgroundColor: '#f59e0b',
                padding: '2px 6px',
                borderRadius: 4,
                letterSpacing: 0.5,
                textTransform: 'uppercase',
                boxShadow: '0 2px 4px rgba(245, 158, 11, 0.3)'
              }}
            >
              BETA
            </span>
          )}
        </div>

        {showTagline && (
          <div
            style={{
              fontSize: config.tagline,
              color: '#64748b',
              fontWeight: 500,
              fontStyle: 'italic'
            }}
          >
            Less admin, more music
          </div>
        )}
      </div>
    </div>
  );
}