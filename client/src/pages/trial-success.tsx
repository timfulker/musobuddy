import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { Link, useLocation } from "wouter";
import { CheckCircle, ArrowRight, Mail, LayoutDashboard, FileText, Receipt, Users, Calendar, Sparkles, Crown } from "lucide-react";

export default function TrialSuccessPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { user, isLoading, refreshUserData } = useAuth();
  const [isRestoringSession, setIsRestoringSession] = useState(false);
  
  // Debug logging
  useEffect(() => {
    console.log('🎉 TRIAL SUCCESS PAGE LOADED');
    console.log('🔍 URL:', window.location.href);
    console.log('🔍 Search params:', window.location.search);
    console.log('🔍 User authenticated:', !!user);
    console.log('🔍 Loading state:', isLoading);
  }, []);

  // Session restoration effect - authenticate new Stripe users
  useEffect(() => {
    const restoreSession = async () => {
      // Extract session ID from URL
      const urlParams = new URLSearchParams(window.location.search);
      const sessionId = urlParams.get('session_id');
      
      // Check if we've already processed this session to prevent loops
      const processedKey = `stripe_session_processed_${sessionId}`;
      const alreadyProcessed = sessionStorage.getItem(processedKey);
      
      // CRITICAL: If we have a Stripe session ID that hasn't been processed yet
      if (sessionId && !isLoading && !alreadyProcessed) {
        setIsRestoringSession(true);
        
        // Mark this session as being processed to prevent loops
        sessionStorage.setItem(processedKey, 'true');
        
        try {
          console.log('🔐 Authenticating with Stripe session:', sessionId);
          
          // CRITICAL: Clear any existing theme to prevent theme leak from previous user
          
          // Also clear theme settings to prevent theme leak from previous user
          localStorage.removeItem('musobuddy-theme');
          localStorage.removeItem('musobuddy-custom-color');
          
          console.log('🔓 Cleared existing auth tokens and theme for new Stripe user');
            
            // Authenticate using Stripe session ID
            console.log('🔍 Calling verify-session with sessionId:', sessionId);
            const response = await fetch('/api/stripe/verify-session', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ sessionId }),
            });

            console.log('🔍 Verify-session response status:', response.status);

            if (response.ok) {
              const result = await response.json();
              
              console.log('✅ Stripe session verified for user:', result.user?.email);
              console.log('✅ Full verification result:', result);
              console.log('💰 Payment status in verify result:', result.user?.hasPaid);
              
              // Now we need to log the user into Firebase
              const { auth } = await import('@/lib/firebase');
              const { signInWithCustomToken } = await import('firebase/auth');
              
              // Get Firebase custom token for this user
              const tokenResponse = await fetch('/api/auth/firebase-token', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: result.user.userId })
              });
              
              if (tokenResponse.ok) {
                const tokenData = await tokenResponse.json();
                await signInWithCustomToken(auth, tokenData.customToken);
                console.log('✅ User signed into Firebase after payment');
                
                // Force refresh of user data to get updated payment status from database
                await refreshUserData();
                console.log('🔄 User data refreshed after payment');
                
                // Set flag for dashboard to know we came from payment
                sessionStorage.setItem('payment_completed', 'true');
                
                // Show success message
                toast({
                  title: "Welcome to MusoBuddy!",
                  description: "Your account has been created successfully.",
                });

                // Remove session ID from URL but DON'T redirect yet
                // Let the hasPaid watcher effect handle the redirect
                window.history.replaceState({}, document.title, '/trial-success');
              } else {
                toast({
                  title: "Welcome to MusoBuddy!",
                  description: "Your account has been created successfully.",
                });

                // Remove session ID from URL and redirect to dashboard
                window.history.replaceState({}, document.title, '/trial-success');
                setLocation('/dashboard');
              }
            } else {
              console.error('❌ Stripe authentication failed:', response.status);
              const error = await response.json();
              console.error('❌ Stripe authentication error details:', error);
              
              // If user not found, might need to wait for webhook
              if (response.status === 404) {
                console.log('⏳ User not found (404) - waiting for webhook processing...');
                setTimeout(() => {
                  window.location.reload();
                }, 3000);
                
                toast({
                  title: "Setting up your account...",
                  description: "Please wait a moment while we complete your setup.",
                });
              } else {
                toast({
                  title: "Authentication failed",
                  description: error.error || "Please try logging in again.",
                  variant: "destructive",
                });
                
                setLocation('/');
              }
            }
        } catch (error) {
          console.error('❌ Session restoration error:', error);
          
          toast({
            title: "Connection error",
            description: "Please check your connection and try again.",
            variant: "destructive",
          });
          
          setLocation('/');
        } finally {
          setIsRestoringSession(false);
        }
      } else if (!user && !isLoading) {
        // No session ID and no user - shouldn't be on this page
        console.error('❌ No session ID found and no user authenticated');
        
        toast({
          title: "Session not found",
          description: "Please complete the signup process.",
          variant: "destructive",
        });
        
        setLocation('/');
      }
    };

    // Always run to check for Stripe session
    restoreSession();
  }, [isLoading, toast, setLocation]);

  // Watch for when user has paid and redirect to root for onboarding check
  useEffect(() => {
    if (user && user.hasPaid && !isRestoringSession && !window.location.search.includes('session_id')) {
      console.log('✅ User has paid, redirecting to app (onboarding wrapper will handle routing)');
      setLocation('/');
    }
  }, [user, isRestoringSession, setLocation]);


  const handleSetupEmail = () => {
    
    
    toast({
      title: "Let's set up your email",
      description: "We'll help you create your booking email address.",
    });
    
    setLocation('/email-setup');
  };

  // Show loading while restoring session
  if (isLoading || isRestoringSession) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-green-50 to-white dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <Card className="border-0 shadow-lg">
            <CardContent className="p-8 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                {isRestoringSession ? 'Restoring your session...' : 'Loading...'}
              </h2>
              <p className="text-gray-600 dark:text-gray-300">
                Please wait while we set everything up.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Redirect if not authenticated
  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-red-50 to-white dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <Card className="border-0 shadow-lg">
            <CardContent className="p-8 text-center">
              <div className="text-red-600 mb-4">
                <CheckCircle className="h-12 w-12 mx-auto" />
              </div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                Authentication Required
              </h2>
              <p className="text-gray-600 dark:text-gray-300 mb-6">
                Please log in to continue setting up your account.
              </p>
              <Link href="/">
                <Button className="w-full">
                  Go to Login
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-white dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center space-x-2 mb-6">
            <CheckCircle className="h-8 w-8 text-green-600" />
            <span className="text-2xl font-bold text-gray-900 dark:text-white">MusoBuddy</span>
          </Link>
        </div>

        {/* Success Card */}
        <Card className="border-0 shadow-lg">
          <CardHeader className="text-center pb-4">
            <div className="mx-auto w-16 h-16 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center mb-4">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            <CardTitle className="text-2xl text-gray-900 dark:text-white">
              Account Verified!
            </CardTitle>
          </CardHeader>
          
          <CardContent className="space-y-6">
            <div className="text-center">
              <p className="text-gray-600 dark:text-gray-300 mb-2">
                Welcome to MusoBuddy, <span className="font-semibold">{user.displayName || user.email}</span>!
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Your account setup is complete and your free trial has started!
              </p>
            </div>

            {/* Success message and continue to dashboard */}
            <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg border border-green-200 dark:border-green-800 mb-4">
              <div className="flex items-center text-green-700 dark:text-green-300">
                <CheckCircle className="h-5 w-5 mr-2" />
                <p className="font-medium">Your 30-day free trial is now active!</p>
              </div>
              <p className="text-sm text-green-600 dark:text-green-400 mt-1">
                You have full access to all MusoBuddy features.
              </p>
            </div>

            {/* Action: Go to Dashboard */}
            <Button
              onClick={() => setLocation('/dashboard')}
              className="w-full h-12 bg-primary hover:bg-primary/90 text-white"
              size="lg"
            >
              <LayoutDashboard className="h-5 w-5 mr-2" />
              Enter Your Dashboard
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>

            {/* Info text */}
            <div className="text-center pt-4 border-t border-gray-200 dark:border-gray-700">
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Your trial expires in 30 days. You can cancel anytime from Settings.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center mt-6">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Questions? Check our{" "}
            <Link href="/help" className="text-primary hover:text-primary/90 dark:text-yellow-400">
              help center
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}