import { Button, ButtonProps } from '@/components/ui/button';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';

interface ResponsiveButtonProps extends ButtonProps {
  mobileSize?: 'sm' | 'default' | 'lg';
  desktopSize?: 'sm' | 'default' | 'lg';
  mobilePadding?: string;
  desktopPadding?: string;
  mobileText?: string;
  desktopText?: string;
  children: React.ReactNode;
}

export default function ResponsiveButton({
  mobileSize = 'default',
  desktopSize = 'default',
  mobilePadding,
  desktopPadding,
  mobileText,
  desktopText,
  className,
  children,
  ...props
}: ResponsiveButtonProps) {
  const isMobile = useIsMobile();

  const size = isMobile ? mobileSize : desktopSize;
  const text = isMobile ? mobileText : desktopText;
  const padding = isMobile ? mobilePadding : desktopPadding;

  return (
    <Button
      size={size}
      className={cn(
        // Touch-friendly sizing on mobile
        isMobile && "min-h-[44px] min-w-[44px] text-base",
        padding,
        className
      )}
      {...props}
    >
      {text || children}
    </Button>
  );
}

// Predefined responsive button variants for common use cases
export function TouchFriendlyButton({ children, className, ...props }: ButtonProps) {
  return (
    <ResponsiveButton
      mobileSize="lg"
      desktopSize="default"
      className={cn("touch-manipulation", className)}
      {...props}
    >
      {children}
    </ResponsiveButton>
  );
}

export function MobileOptimizedButton({ children, className, ...props }: ButtonProps) {
  const isMobile = useIsMobile();
  
  return (
    <Button
      size={isMobile ? "lg" : "default"}
      className={cn(
        isMobile && "h-12 px-6 text-base font-medium shadow-sm",
        "touch-manipulation",
        className
      )}
      {...props}
    >
      {children}
    </Button>
  );
}