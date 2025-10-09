import React from 'react';

interface PromoMetronomeProps {
  size?: number; // Size in pixels (default: 300)
  speed?: number; // Animation speed in seconds (default: 1.2)
  backgroundColor?: string; // Background color (default: transparent)
  showBackground?: boolean; // Whether to show the circular background
  showText?: boolean; // Whether to show "MusoBuddy" text (default: true)
  className?: string;
}

export function PromoMetronome({
  size = 300,
  speed = 1.2,
  backgroundColor = 'transparent',
  showBackground = true,
  showText = true,
  className = ''
}: PromoMetronomeProps) {

  // Colors - consistent with MusoBuddy branding
  const colors = {
    primary: '#191970', // Midnight blue
    secondary: '#1e3a8a', // Darker blue
    white: '#ffffff'
  };

  // Calculate proportional sizes based on the main size
  const iconRadius = size * 0.25; // 25% of size for border radius
  const metronomeBody = {
    width: size * 0.35, // 35% of size
    height: size * 0.56  // 56% of size
  };
  const metronomeArm = {
    width: size * 0.03, // 3% of size
    height: size * 0.35, // 35% of size
    top: size * 0.10 // 10% from top
  };

  // Animation keyframes with customizable speed
  const tickAnimation = `
    @keyframes promoTick {
      0% {
        transform: translateX(-50%) rotate(-25deg);
      }
      100% {
        transform: translateX(-50%) rotate(25deg);
      }
    }
  `;

  return (
    <div
      className={className}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        width: size,
        height: showText ? size + (size * 0.2) : size, // Extra height for text if shown
        backgroundColor: backgroundColor,
        gap: showText ? size * 0.05 : 0 // Gap between metronome and text if shown
      }}
    >
      {/* Metronome Container */}
      <div
        style={{
          width: size * 0.8, // 80% of total size
          height: size * 0.8,
          background: showBackground ? colors.primary : 'transparent',
          borderRadius: showBackground ? iconRadius : 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          boxShadow: showBackground ? `0 ${size * 0.08}px ${size * 0.24}px ${colors.primary}40` : 'none',
          flexShrink: 0
        }}
      >
        {/* Metronome Body */}
        <div
          style={{
            width: metronomeBody.width,
            height: metronomeBody.height,
            background: colors.white,
            clipPath: 'polygon(25% 0%, 75% 0%, 100% 100%, 0% 100%)',
            position: 'relative',
            boxShadow: `0 ${size * 0.02}px ${size * 0.06}px rgba(0,0,0,0.2)`
          }}
        >
          {/* Metronome Arm */}
          <div
            style={{
              position: 'absolute',
              top: metronomeArm.top,
              left: '50%',
              transform: 'translateX(-50%)',
              width: metronomeArm.width,
              height: metronomeArm.height,
              background: colors.primary,
              transformOrigin: 'bottom center',
              animation: `promoTick ${speed}s ease-in-out infinite alternate`,
              borderRadius: size * 0.01, // Small border radius for the arm
              boxShadow: `0 ${size * 0.01}px ${size * 0.03}px rgba(0,0,0,0.3)`
            }}
          >
            {/* Weight/Bob at the top of the arm */}
            <div
              style={{
                position: 'absolute',
                top: -size * 0.02,
                left: '50%',
                transform: 'translateX(-50%)',
                width: size * 0.08,
                height: size * 0.08,
                background: colors.secondary,
                borderRadius: '50%',
                boxShadow: `0 ${size * 0.01}px ${size * 0.02}px rgba(0,0,0,0.4)`
              }}
            />
          </div>

          {/* Center pivot point */}
          <div
            style={{
              position: 'absolute',
              top: metronomeArm.top + metronomeArm.height - size * 0.02,
              left: '50%',
              transform: 'translateX(-50%)',
              width: size * 0.04,
              height: size * 0.04,
              background: colors.secondary,
              borderRadius: '50%',
              zIndex: 10,
              boxShadow: `0 ${size * 0.005}px ${size * 0.015}px rgba(0,0,0,0.5)`
            }}
          />

          {/* Speed markings on the metronome body */}
          <div
            style={{
              position: 'absolute',
              top: '20%',
              left: '50%',
              transform: 'translateX(-50%)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: size * 0.02
            }}
          >
            {[40, 60, 80, 120, 160].map((bpm, index) => (
              <div
                key={bpm}
                style={{
                  fontSize: size * 0.025,
                  color: colors.primary,
                  fontWeight: 'bold',
                  opacity: 0.8
                }}
              >
                {bpm}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* MusoBuddy Text */}
      {showText && (
        <div
          style={{
            fontSize: size * 0.12, // 12% of metronome size
            fontWeight: 700,
            color: colors.primary,
            letterSpacing: -1,
            textAlign: 'center',
            fontFamily: 'system-ui, -apple-system, sans-serif'
          }}
        >
          MusoBuddy
        </div>
      )}

      {/* Inject the animation styles */}
      <style dangerouslySetInnerHTML={{ __html: tickAnimation }} />
    </div>
  );
}

// Export a preset for promo video use
export function PromoVideoMetronome() {
  return (
    <PromoMetronome
      size={400}
      speed={1.0}
      showBackground={true}
      showText={true}
      className="promo-metronome"
    />
  );
}