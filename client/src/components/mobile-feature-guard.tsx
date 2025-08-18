import { ReactNode } from 'react';
import { useIsMobile } from '@/hooks/use-mobile';
import { Card, CardContent } from '@/components/ui/card';
import { Monitor, Smartphone } from 'lucide-react';

interface MobileFeatureGuardProps {
  children: ReactNode;
  fallbackMessage?: string;
  mobileOnly?: boolean;
  desktopOnly?: boolean;
}

export default function MobileFeatureGuard({ 
  children, 
  fallbackMessage,
  mobileOnly = false,
  desktopOnly = false 
}: MobileFeatureGuardProps) {
  const isMobile = useIsMobile();

  // Show content based on device and configuration
  if (mobileOnly && !isMobile) {
    return (
      <Card className="max-w-md mx-auto mt-20">
        <CardContent className="p-8 text-center">
          <Smartphone className="w-12 h-12 mx-auto mb-4 text-gray-400" />
          <h3 className="font-semibold text-lg mb-2">Mobile Feature</h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            {fallbackMessage || 'This feature is optimized for mobile devices. Please access it from your phone or tablet.'}
          </p>
          <p className="text-sm text-gray-500">
            For the full experience, use the desktop version of MusoBuddy.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (desktopOnly && isMobile) {
    return (
      <Card className="mx-4 mt-8">
        <CardContent className="p-8 text-center">
          <Monitor className="w-12 h-12 mx-auto mb-4 text-gray-400" />
          <h3 className="font-semibold text-lg mb-2">Desktop Feature</h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            {fallbackMessage || 'This feature requires a larger screen and is only available on desktop computers.'}
          </p>
          <p className="text-sm text-gray-500">
            Essential mobile features are available in the main navigation.
          </p>
        </CardContent>
      </Card>
    );
  }

  return <>{children}</>;
}