interface MetronomeLogoProps {
  size?: 'small' | 'medium' | 'large';
  showText?: boolean;
  className?: string;
}

export function MetronomeLogo({ size = 'medium', showText = true, className = '' }: MetronomeLogoProps) {
  const sizeStyles = {
    small: {
      icon: { width: '40px', height: '40px', borderRadius: '8px' },
      body: { width: '14px', height: '22px' },
      arm: { top: '4px', width: '1.5px', height: '14px' },
      text: { fontSize: '18px' },
      gap: '10px'
    },
    medium: {
      icon: { width: '60px', height: '60px', borderRadius: '12px' },
      body: { width: '20px', height: '32px' },
      arm: { top: '6px', width: '2px', height: '20px' },
      text: { fontSize: '24px' },
      gap: '15px'
    },
    large: {
      icon: { width: '100px', height: '100px', borderRadius: '25px' },
      body: { width: '35px', height: '55px' },
      arm: { top: '10px', width: '4px', height: '35px' },
      text: { fontSize: '48px' },
      gap: '25px'
    }
  };

  const styles = sizeStyles[size];

  return (
    <>
      <style>{`
        @keyframes tick {
          0% { transform: translateX(-50%) rotate(-18deg); }
          100% { transform: translateX(-50%) rotate(18deg); }
        }
      `}</style>
      <div className={`inline-flex items-center ${className}`} style={{ gap: styles.gap }}>
        <div
          style={{
            ...styles.icon,
            background: 'linear-gradient(135deg, #191970 0%, #1e3a8a 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
            boxShadow: '0 8px 25px rgba(25, 25, 112, 0.3)'
          }}
        >
          <div
            style={{
              ...styles.body,
              background: 'white',
              clipPath: 'polygon(25% 0%, 75% 0%, 100% 100%, 0% 100%)',
              position: 'relative'
            }}
          >
            <div
              style={{
                position: 'absolute',
                ...styles.arm,
                background: '#191970',
                left: '50%',
                transform: 'translateX(-50%)',
                transformOrigin: 'bottom',
                animation: 'tick 1.2s ease-in-out infinite alternate',
                borderRadius: '1px'
              }}
            />
          </div>
        </div>
        {showText && (
          <div
            style={{
              ...styles.text,
              fontWeight: 700,
              color: '#191970',
              letterSpacing: '-1px'
            }}
          >
            MusoBuddy
          </div>
        )}
      </div>
    </>
  );
}
