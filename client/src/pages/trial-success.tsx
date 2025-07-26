import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Music, CheckCircle, Calendar, Mail, FileText, CreditCard, ArrowRight } from "lucide-react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function TrialSuccessPage() {
  const [, setLocation] = useLocation();
  const [step, setStep] = useState<'welcome' | 'onboarding' | 'email-setup' | 'complete'>('welcome');
  const { toast } = useToast();

  // Get URL parameters
  const urlParams = new URLSearchParams(window.location.search);
  const sessionId = urlParams.get('session_id');

  // Verify trial setup with session restoration
  const { data: user, isLoading, refetch } = useQuery({
    queryKey: ['/api/auth/user'],
    enabled: !!sessionId,
    retry: false, // Don't auto-retry on 401
  });

  // Session restoration mutation - simplified approach using session ID only
  const restoreSessionMutation = useMutation({
    mutationFn: async () => {
      // Use the session ID to restore authentication by finding the user who just completed checkout
      return apiRequest('/api/auth/restore-session-by-stripe', {
        method: 'POST',
        body: JSON.stringify({ 
          sessionId 
        }),
        headers: {
          'Content-Type': 'application/json',
        },
      });
    },
    onSuccess: () => {
      toast({
        title: "Session restored!",
        description: "Welcome back to MusoBuddy.",
      });
      refetch(); // Refresh user data
    },
    onError: (error: any) => {
      console.error('Session restoration failed:', error);
      toast({
        title: "Session restoration failed",
        description: "Please try logging in manually.",
        variant: "destructive",
      });
    },
  });

  // Attempt session restoration if user query fails with 401
  // Automatic session restoration effect
  useEffect(() => {
    if (sessionId && !user && !isLoading && !restoreSessionMutation.isPending) {
      console.log('Attempting session restoration...');
      restoreSessionMutation.mutate();
    }
  }, [sessionId, user, isLoading]);

  // Redirect to dashboard if user is already authenticated and subscribed
  useEffect(() => {
    if (user && (user as any).isSubscribed) {
      console.log('User is authenticated and subscribed, redirecting to dashboard...');
      setLocation('/dashboard');
    }
  }, [user, setLocation]);

  const completeOnboardingMutation = useMutation({
    mutationFn: async () => {
      return apiRequest('/api/auth/complete-onboarding', {
        method: 'POST',
      });
    },
    onSuccess: () => {
      toast({
        title: "Onboarding complete!",
        description: "Welcome to MusoBuddy. Let's set up your email address.",
      });
      setStep('email-setup');
    },
  });

  // Removed auto-progression - users now manually continue

  const handleGetStarted = () => {
    completeOnboardingMutation.mutate();
  };

  const handleSkipToApp = () => {
    setLocation('/dashboard');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-green-50 to-white dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
        <div className="text-center">
          <Music className="h-12 w-12 text-purple-600 mx-auto mb-4 animate-spin" />
          <p className="text-gray-600 dark:text-gray-300">Setting up your trial...</p>
        </div>
      </div>
    );
  }

  if (step === 'welcome') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-green-50 to-white dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
        <div className="w-full max-w-2xl text-center">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-center space-x-2 mb-6">
              <Music className="h-8 w-8 text-purple-600" />
              <span className="text-2xl font-bold text-gray-900 dark:text-white">MusoBuddy</span>
            </div>
            <div className="mb-6">
              <CheckCircle className="h-20 w-20 text-green-500 mx-auto mb-4" />
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-4">
              Welcome to MusoBuddy!
            </h1>
            <p className="text-xl text-gray-600 dark:text-gray-300 mb-6">
              Your 14-day free trial has started successfully. You now have full access to all features.
            </p>
            <Badge className="bg-green-100 text-green-800 border-green-200 px-4 py-2 text-lg">
              <Calendar className="h-4 w-4 mr-2" />
              Trial Active Until {new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toLocaleDateString()}
            </Badge>
          </div>

          {/* Success Card */}
          <Card className="border-2 border-green-200 shadow-xl">
            <CardHeader>
              <CardTitle className="text-2xl text-green-700">Trial Activated!</CardTitle>
              <CardDescription className="text-lg">
                Your payment method has been securely saved. You won't be charged until your trial ends.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Alert className="mb-6 bg-green-50 border-green-200">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-700">
                  <strong>What happens next:</strong> Explore all features for 14 days. 
                  We'll send you a reminder 5 days before your trial ends. Cancel anytime with no charges.
                </AlertDescription>
              </Alert>

              <div className="grid md:grid-cols-2 gap-4 mb-8">
                <div className="text-left p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <CreditCard className="h-8 w-8 text-purple-600 mb-2" />
                  <h3 className="font-semibold mb-1">Payment Secured</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    Your card is saved securely. £9.99/month after trial.
                  </p>
                </div>
                <div className="text-left p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <FileText className="h-8 w-8 text-purple-600 mb-2" />
                  <h3 className="font-semibold mb-1">Full Access</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    All features unlocked for 14 days. No limitations.
                  </p>
                </div>
              </div>

              <Button
                onClick={() => setStep('onboarding')}
                size="lg"
                className="bg-purple-600 hover:bg-purple-700 text-lg px-8 py-4 mr-4"
              >
                Get Started
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>

              <Button
                onClick={handleSkipToApp}
                variant="outline"
                size="lg"
                className="text-lg px-8 py-4"
              >
                Skip to Dashboard
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (step === 'onboarding') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
        <div className="w-full max-w-4xl">
          <div className="text-center mb-12">
            <div className="flex items-center justify-center space-x-2 mb-6">
              <Music className="h-8 w-8 text-purple-600" />
              <span className="text-2xl font-bold text-gray-900 dark:text-white">MusoBuddy</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
              Let's Set Up Your Music Business
            </h1>
            <p className="text-xl text-gray-600 dark:text-gray-300">
              Quick setup to get you started with professional booking management
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 mb-12">
            {/* Step 1 */}
            <Card className="border-2 border-purple-200 bg-purple-50 dark:bg-purple-900/20">
              <CardHeader className="text-center">
                <div className="bg-purple-600 text-white rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-4 text-xl font-bold">
                  1
                </div>
                <CardTitle className="flex items-center justify-center space-x-2">
                  <Mail className="h-5 w-5 text-purple-600" />
                  <span>Email Setup</span>
                </CardTitle>
                <CardDescription>
                  Get your personalized booking email address like tim-leads@mg.musobuddy.com
                </CardDescription>
              </CardHeader>
            </Card>

            {/* Step 2 */}
            <Card className="border-2 border-gray-200">
              <CardHeader className="text-center">
                <div className="bg-gray-300 text-gray-600 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-4 text-xl font-bold">
                  2
                </div>
                <CardTitle className="flex items-center justify-center space-x-2">
                  <FileText className="h-5 w-5 text-gray-600" />
                  <span>Business Details</span>
                </CardTitle>
                <CardDescription>
                  Add your business information for professional contracts and invoices
                </CardDescription>
              </CardHeader>
            </Card>

            {/* Step 3 */}
            <Card className="border-2 border-gray-200">
              <CardHeader className="text-center">
                <div className="bg-gray-300 text-gray-600 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-4 text-xl font-bold">
                  3
                </div>
                <CardTitle className="flex items-center justify-center space-x-2">
                  <Calendar className="h-5 w-5 text-gray-600" />
                  <span>First Booking</span>
                </CardTitle>
                <CardDescription>
                  Create your first booking or import existing calendar data
                </CardDescription>
              </CardHeader>
            </Card>
          </div>

          <div className="text-center">
            <Button
              onClick={handleGetStarted}
              size="lg"
              className="bg-purple-600 hover:bg-purple-700 text-lg px-12 py-4"
              disabled={completeOnboardingMutation.isPending}
            >
              {completeOnboardingMutation.isPending ? "Setting up..." : "Start Email Setup"}
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            
            <p className="mt-4 text-sm text-gray-500">
              Takes less than 5 minutes to complete
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (step === 'email-setup') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
        <div className="w-full max-w-lg">
          <div className="text-center mb-8">
            <div className="flex items-center justify-center space-x-2 mb-6">
              <Music className="h-8 w-8 text-purple-600" />
              <span className="text-2xl font-bold text-gray-900 dark:text-white">MusoBuddy</span>
            </div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              Almost Ready!
            </h1>
            <p className="text-gray-600 dark:text-gray-300">
              Let's set up your personalized booking email address
            </p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Mail className="h-5 w-5 text-purple-600" />
                <span>Email Setup Required</span>
              </CardTitle>
              <CardDescription>
                Choose your unique email prefix to receive booking enquiries automatically
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Alert className="mb-6">
                <Mail className="h-4 w-4" />
                <AlertDescription>
                  This will be your main booking email address. Clients will send enquiries here and they'll automatically become bookings in your system.
                </AlertDescription>
              </Alert>

              <div className="space-y-4">
                <Link href="/email-setup">
                  <Button className="w-full bg-purple-600 hover:bg-purple-700 text-lg py-3">
                    Set Up Email Address
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </Link>

                <Button
                  onClick={handleSkipToApp}
                  variant="ghost"
                  className="w-full"
                >
                  Skip for now (set up later in settings)
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return null;
}