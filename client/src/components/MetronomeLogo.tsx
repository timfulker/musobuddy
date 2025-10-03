interface MetronomeLogoProps {
  size?: 'small' | 'medium' | 'large';
  showText?: boolean;
  className?: string;
}

export function MetronomeLogo({ size = 'medium', showText = true, className = '' }: MetronomeLogoProps) {
  const sizeClasses = {
    small: {
      container: 'gap-2',
      icon: 'w-10 h-10 rounded-lg',
      body: 'w-3.5 h-5.5',
      arm: 'top-1 w-0.5 h-3.5',
      text: 'text-lg'
    },
    medium: {
      container: 'gap-4',
      icon: 'w-16 h-16 rounded-xl',
      body: 'w-5 h-8',
      arm: 'top-1.5 w-0.5 h-5',
      text: 'text-2xl'
    },
    large: {
      container: 'gap-5',
      icon: 'w-20 h-20 rounded-2xl',
      body: 'w-7 h-11',
      arm: 'top-2 w-1 h-7',
      text: 'text-4xl'
    }
  };

  const sizes = sizeClasses[size];

  return (
    <>
      <style>{`
        @keyframes metronome-tick {
          0% { transform: translateX(-50%) rotate(-18deg); }
          100% { transform: translateX(-50%) rotate(18deg); }
        }
      `}</style>
      <div className={`inline-flex items-center ${sizes.container} ${className}`}>
        <div className={`${sizes.icon} bg-gradient-to-br from-[#191970] to-[#1e3a8a] flex items-center justify-center relative shadow-lg`}>
          <div
            className={`${sizes.body} bg-white relative`}
            style={{ clipPath: 'polygon(25% 0%, 75% 0%, 100% 100%, 0% 100%)' }}
          >
            <div
              className={`absolute ${sizes.arm} bg-white left-1/2 -translate-x-1/2 rounded-sm origin-bottom`}
              style={{
                animation: 'metronome-tick 1.2s ease-in-out infinite alternate'
              }}
            />
          </div>
        </div>
        {showText && (
          <div className={`${sizes.text} font-bold text-[#191970] tracking-tight`}>
            MusoBuddy
          </div>
        )}
      </div>
    </>
  );
}
