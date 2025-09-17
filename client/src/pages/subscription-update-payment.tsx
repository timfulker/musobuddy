import { useEffect, useState } from 'react';
import { useAuthContext } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, CreditCard, Gift } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';

export default function SubscriptionUpdatePayment() {
  const { user, isAuthenticated } = useAuthContext();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  // Authentication is handled by App.tsx routing - no need for redirect here

  const handleStartSubscription = async () => {
    if (!user?.userId || !user?.email) {
      toast({
        title: "Error",
        description: "User information not available. Please log in again.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    
    try {
      console.log('🔄 Creating Stripe checkout session for user:', user.email);
      
      const response = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userEmail: user.email,
          userId: user.userId,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create checkout session');
      }

      const data = await response.json();
      console.log('✅ Stripe checkout session created:', data.sessionId);

      if (data.url) {
        // Redirect to Stripe Checkout
        window.location.href = data.url;
      } else {
        throw new Error('No checkout URL received');
      }
    } catch (error: any) {
      console.error('❌ Stripe checkout failed:', error);
      toast({
        title: "Payment Setup Failed",
        description: error.message || "Unable to start subscription. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const isBetaTester = user?.isBetaTester || false;

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-12 h-12 bg-orange-100 dark:bg-orange-900 rounded-full flex items-center justify-center">
            <CreditCard className="w-6 h-6 text-orange-600 dark:text-orange-400" />
          </div>
          <CardTitle className="text-2xl">Complete Your Setup</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Please complete your subscription setup to access MusoBuddy features.
            </AlertDescription>
          </Alert>

          {isBetaTester && (
            <Alert className="border-green-200 bg-green-50 dark:bg-green-900/20">
              <Gift className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800 dark:text-green-200">
                As a beta tester, you'll receive 90 days free trial instead of 30 days!
              </AlertDescription>
            </Alert>
          )}

          <div className="space-y-3 text-sm text-muted-foreground">
            <p>Your subscription includes:</p>
            <ul className="space-y-1 ml-4">
              <li>• Unlimited bookings and contracts</li>
              <li>• Professional invoice generation</li>
              <li>• Client portal access</li>
              <li>• Email integration</li>
              <li>• Calendar sync</li>
            </ul>
            {isBetaTester && (
              <p className="text-green-600 dark:text-green-400 font-medium mt-3">
                Your 90-day trial starts after payment setup!
              </p>
            )}
          </div>

          <Button 
            onClick={handleStartSubscription}
            disabled={isLoading}
            className="w-full"
            size="lg"
          >
            {isLoading ? 'Setting up...' : 'Complete Setup'}
          </Button>

          <p className="text-xs text-center text-muted-foreground">
            You'll be redirected to our secure payment processor to add your payment details.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}