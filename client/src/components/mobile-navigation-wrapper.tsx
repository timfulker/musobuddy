import { useIsMobile } from '@/hooks/use-mobile';
import { Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Smartphone, Monitor, ArrowLeft } from 'lucide-react';

interface MobileNavigationWrapperProps {
  originalPath: string;
  mobilePath?: string;
  title: string;
  description?: string;
}

export default function MobileNavigationWrapper({ 
  originalPath, 
  mobilePath, 
  title, 
  description 
}: MobileNavigationWrapperProps) {
  const isMobile = useIsMobile();

  // If on mobile and mobile path exists, redirect
  if (isMobile && mobilePath && window.location.pathname === originalPath) {
    window.location.href = mobilePath;
    return null;
  }

  // If on desktop and on mobile path, redirect back
  if (!isMobile && mobilePath && window.location.pathname === mobilePath) {
    window.location.href = originalPath;
    return null;
  }

  return null; // This component only handles redirects
}

// Component for showing mobile-optimized page recommendations
export function MobilePageRedirect({ 
  desktopPath, 
  mobilePath, 
  title, 
  description 
}: {
  desktopPath: string;
  mobilePath: string; 
  title: string;
  description: string;
}) {
  const isMobile = useIsMobile();

  if (!isMobile) return null;

  return (
    <Card className="mx-4 mt-8">
      <CardContent className="p-6 text-center">
        <Smartphone className="w-12 h-12 mx-auto mb-4 text-blue-500" />
        <h3 className="font-semibold text-lg mb-2">{title}</h3>
        <p className="text-gray-600 dark:text-gray-400 mb-4">
          {description}
        </p>
        <div className="space-y-2">
          <Link href={mobilePath}>
            <Button className="w-full">
              <Smartphone className="w-4 h-4 mr-2" />
              Go to Mobile Version
            </Button>
          </Link>
          <Link href={desktopPath}>
            <Button variant="outline" className="w-full">
              <Monitor className="w-4 h-4 mr-2" />
              Continue with Desktop View
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}

// Component for desktop-only features on mobile
export function DesktopOnlyMessage({ 
  featureName, 
  description, 
  backPath = '/' 
}: {
  featureName: string;
  description: string;
  backPath?: string;
}) {
  const isMobile = useIsMobile();

  if (!isMobile) return null;

  return (
    <Card className="mx-4 mt-8">
      <CardContent className="p-8 text-center">
        <Monitor className="w-16 h-16 mx-auto mb-4 text-gray-400" />
        <h3 className="font-semibold text-xl mb-3">{featureName}</h3>
        <p className="text-gray-600 dark:text-gray-400 mb-6 leading-relaxed">
          {description}
        </p>
        <p className="text-sm text-gray-500 mb-6">
          This feature requires a larger screen and keyboard for optimal use. 
          Access it from a desktop or laptop computer.
        </p>
        <Link href={backPath}>
          <Button className="w-full">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}